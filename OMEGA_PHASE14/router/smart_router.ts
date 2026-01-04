/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Smart Router
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NASA-grade LLM provider routing with full observability.
 * 
 * Invariants:
 * - INV-RTR-01: Deterministic (same input + state = same output)
 * - INV-RTR-02: Fallback auto (provider down → next best)
 * - INV-RTR-03: Constraints strict (impossible = explicit error)
 * - INV-RTR-04: Audit complete (every decision logged)
 * - INV-RTR-05: Anti-flap (stable routing)
 * - INV-RTR-06: Circuit breaker (failure isolation)
 * 
 * @module router/smart_router
 * @version 3.14.0
 */

import type {
  ProviderId,
  RouteContext,
  RouteConstraints,
  RoutingDecision,
  RouterAudit,
  ScoredProvider,
} from './types.js';
import { DEFAULT_CONSTRAINTS } from './types.js';
import { ProviderRegistry } from './provider_registry.js';
import { scoreProviders, pickBest, getViableProviders, NoViableProviderError } from './scoring_engine.js';
import { AntiFlipController } from './anti_flap.js';
import { CircuitBreaker } from './circuit_breaker.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface SmartRouterConfig {
  /** Enable anti-flap logic */
  readonly enable_anti_flap: boolean;
  /** Enable circuit breaker */
  readonly enable_circuit_breaker: boolean;
  /** Enable audit logging */
  readonly enable_audit: boolean;
}

const DEFAULT_ROUTER_CONFIG: SmartRouterConfig = {
  enable_anti_flap: true,
  enable_circuit_breaker: true,
  enable_audit: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SMART ROUTER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class SmartRouter {
  private config: SmartRouterConfig;
  private antiFlap: AntiFlipController;
  private circuitBreaker: CircuitBreaker;
  
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly audit: RouterAudit,
    config?: Partial<SmartRouterConfig>
  ) {
    this.config = Object.freeze({ ...DEFAULT_ROUTER_CONFIG, ...config });
    this.antiFlap = new AntiFlipController();
    this.circuitBreaker = new CircuitBreaker();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN ROUTING - INV-RTR-01, INV-RTR-03, INV-RTR-04
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Route a request to the best provider
   * @throws NoViableProviderError if no provider satisfies constraints
   */
  route(params: {
    ctx: RouteContext;
    constraints?: Partial<RouteConstraints>;
    now_ms: number;
  }): RoutingDecision {
    const { ctx, now_ms } = params;
    const constraints: RouteConstraints = {
      ...DEFAULT_CONSTRAINTS,
      ...params.constraints,
    };
    
    // Check for forced provider
    if (constraints.force_provider) {
      return this.routeToForced(constraints.force_provider, ctx, constraints, now_ms);
    }
    
    // Get available providers (filter by circuit breaker)
    let providers = this.registry.list();
    
    if (this.config.enable_circuit_breaker) {
      providers = providers.filter(p =>
        this.circuitBreaker.isRequestAllowed(p.static.id, now_ms)
      );
    }
    
    // Score all providers
    const scored = scoreProviders({ providers, ctx, constraints });
    
    // Pick best
    const best = pickBest(scored);
    const viable = getViableProviders(scored);
    
    // Check anti-flap (sticky routing)
    let sticky_applied = false;
    if (this.config.enable_anti_flap && ctx.category) {
      const sticky_id = this.antiFlap.getStickyProvider(ctx.category, now_ms);
      
      if (sticky_id && sticky_id !== best.provider.static.id) {
        // Check if sticky provider is still viable
        const sticky_scored = scored.find(s => s.provider.static.id === sticky_id);
        
        if (sticky_scored && sticky_scored.constraint_ok) {
          // Check if switch is allowed
          const allow_switch = this.antiFlap.shouldAllowSwitch({
            current_provider: sticky_id,
            new_provider: best.provider.static.id,
            current_score: sticky_scored.score,
            new_score: best.score,
            now_ms,
          });
          
          if (!allow_switch) {
            // Keep sticky provider
            return this.buildDecision(sticky_scored, ctx, viable.length, true, false, now_ms);
          }
          
          // Record switch
          this.antiFlap.recordSwitch(sticky_id, best.provider.static.id, now_ms);
        }
      }
      
      // Set new sticky
      this.antiFlap.setStickyProvider(ctx.category, best.provider.static.id, now_ms);
    }
    
    return this.buildDecision(best, ctx, viable.length, sticky_applied, false, now_ms);
  }
  
  /**
   * Route to a forced provider (bypass scoring)
   */
  private routeToForced(
    provider_id: ProviderId,
    ctx: RouteContext,
    constraints: RouteConstraints,
    now_ms: number
  ): RoutingDecision {
    const provider = this.registry.get(provider_id);
    
    // Still score to get estimates
    const scored = scoreProviders({
      providers: [provider],
      ctx,
      constraints: { ...constraints, force_provider: undefined },
    });
    
    if (scored.length === 0 || !scored[0].constraint_ok) {
      throw new NoViableProviderError(
        `Forced provider ${provider_id} does not satisfy constraints`,
        [scored[0]?.constraint_reason ?? 'unknown']
      );
    }
    
    return this.buildDecision(scored[0], ctx, 1, false, false, now_ms);
  }
  
  /**
   * Build routing decision and audit - INV-RTR-04
   */
  private buildDecision(
    scored: ScoredProvider,
    ctx: RouteContext,
    alternatives_count: number,
    sticky_applied: boolean,
    fallback_used: boolean,
    now_ms: number
  ): RoutingDecision {
    const decision: RoutingDecision = Object.freeze({
      provider_id: scored.provider.static.id,
      reason: this.determineReason(sticky_applied, fallback_used),
      score: scored.score,
      score_breakdown: scored.breakdown,
      estimated_latency_ms: scored.estimated_latency_ms,
      estimated_cost: scored.estimated_cost,
      fallback_used,
      sticky_applied,
      alternatives_count,
    });
    
    // Audit - INV-RTR-04
    if (this.config.enable_audit) {
      this.audit.append({
        type: 'ROUTING',
        action: fallback_used ? 'ROUTE_FALLBACK' : 'ROUTE_DECISION',
        timestamp_ms: now_ms,
        data: {
          request_id: ctx.request_id,
          provider_id: decision.provider_id,
          reason: decision.reason,
          score: decision.score,
          score_breakdown: decision.score_breakdown,
          estimated_latency_ms: decision.estimated_latency_ms,
          estimated_cost: decision.estimated_cost,
          alternatives_count,
          sticky_applied,
          context: {
            text_chars: ctx.text_chars,
            priority: ctx.priority,
            sensitive: ctx.sensitive,
            category: ctx.category,
          },
        },
      });
    }
    
    return decision;
  }
  
  /**
   * Determine reason string
   */
  private determineReason(sticky_applied: boolean, fallback_used: boolean): string {
    if (fallback_used) return 'fallback_after_failure';
    if (sticky_applied) return 'sticky_provider';
    return 'best_score';
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FALLBACK - INV-RTR-02
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Reroute after provider failure - INV-RTR-02
   */
  rerouteOnFailure(params: {
    failing_provider_id: ProviderId;
    ctx: RouteContext;
    constraints?: Partial<RouteConstraints>;
    now_ms: number;
  }): RoutingDecision {
    const { failing_provider_id, ctx, now_ms } = params;
    
    // Mark provider down in registry
    this.registry.markDown(failing_provider_id, now_ms);
    
    // Record failure in circuit breaker - INV-RTR-06
    if (this.config.enable_circuit_breaker) {
      this.circuitBreaker.recordFailure(failing_provider_id, now_ms);
      
      // Audit if circuit opened
      const circuit_state = this.circuitBreaker.getState(failing_provider_id, now_ms);
      if (circuit_state === 'OPEN' && this.config.enable_audit) {
        this.audit.append({
          type: 'ROUTING',
          action: 'CIRCUIT_OPEN',
          timestamp_ms: now_ms,
          data: {
            provider_id: failing_provider_id,
            request_id: ctx.request_id,
          },
        });
      }
    }
    
    // Clear sticky for failed provider - INV-RTR-05
    if (this.config.enable_anti_flap) {
      this.antiFlap.clearStickyForProvider(failing_provider_id);
    }
    
    // Audit provider down - INV-RTR-04
    if (this.config.enable_audit) {
      this.audit.append({
        type: 'ROUTING',
        action: 'PROVIDER_DOWN',
        timestamp_ms: now_ms,
        data: {
          provider_id: failing_provider_id,
          request_id: ctx.request_id,
        },
      });
    }
    
    // Get new route
    const constraints: RouteConstraints = {
      ...DEFAULT_CONSTRAINTS,
      ...params.constraints,
    };
    
    // Filter out failed provider explicitly
    let providers = this.registry.list().filter(p =>
      p.static.id !== failing_provider_id && p.health.up
    );
    
    if (this.config.enable_circuit_breaker) {
      providers = providers.filter(p =>
        this.circuitBreaker.isRequestAllowed(p.static.id, now_ms)
      );
    }
    
    const scored = scoreProviders({ providers, ctx, constraints });
    const best = pickBest(scored);
    const viable = getViableProviders(scored);
    
    return this.buildDecision(best, ctx, viable.length, false, true, now_ms);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SUCCESS RECORDING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Record successful request (update health metrics)
   */
  recordSuccess(provider_id: ProviderId, latency_ms: number, now_ms: number): void {
    this.registry.recordSuccess(provider_id, latency_ms, now_ms);
    
    if (this.config.enable_circuit_breaker) {
      this.circuitBreaker.recordSuccess(provider_id, now_ms);
    }
  }
  
  /**
   * Mark provider up (manual recovery)
   */
  markProviderUp(provider_id: ProviderId, now_ms: number): void {
    this.registry.markUp(provider_id, now_ms);
    
    if (this.config.enable_circuit_breaker) {
      this.circuitBreaker.forceClose(provider_id, now_ms);
    }
    
    if (this.config.enable_audit) {
      this.audit.append({
        type: 'ROUTING',
        action: 'PROVIDER_UP',
        timestamp_ms: now_ms,
        data: { provider_id },
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get router statistics
   */
  getStats(now_ms: number): {
    provider_count: number;
    available_count: number;
    open_circuits: ProviderId[];
    anti_flap: ReturnType<AntiFlipController['getStats']>;
  } {
    return {
      provider_count: this.registry.size(),
      available_count: this.registry.listAvailable().length,
      open_circuits: this.circuitBreaker.getOpenCircuits(now_ms),
      anti_flap: this.antiFlap.getStats(),
    };
  }
  
  /**
   * Reset router state (for testing)
   */
  reset(): void {
    this.antiFlap.reset();
    this.circuitBreaker.reset();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a configured SmartRouter instance
 */
export function createSmartRouter(
  registry: ProviderRegistry,
  audit: RouterAudit,
  config?: Partial<SmartRouterConfig>
): SmartRouter {
  return new SmartRouter(registry, audit, config);
}
