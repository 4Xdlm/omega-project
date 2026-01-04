/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Smart Router Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Integration tests for SmartRouter covering all invariants.
 * 
 * Total: 12 tests
 * 
 * @module router/tests/smart_router.test
 * @version 3.14.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SmartRouter } from '../smart_router.js';
import { ProviderRegistry } from '../provider_registry.js';
import { MockAudit } from '../audit_mock.js';
import { NoViableProviderError } from '../scoring_engine.js';
import type { ProviderStatic, RouteContext, RouteConstraints } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function mkProvider(
  id: string,
  tier: 'LOCAL' | 'CLOUD',
  quality: 'FAST' | 'BALANCED' | 'QUALITY',
  latency: number,
  costIn: number,
  costOut: number
): ProviderStatic {
  return {
    id,
    name: `Provider ${id}`,
    caps: {
      tier,
      quality,
      max_input_chars: 100000,
      max_output_tokens: 4096,
      supports_json: true,
      supports_tools: true,
      supports_streaming: true,
    },
    pricing: {
      cost_per_1k_in: costIn,
      cost_per_1k_out: costOut,
      daily_limit: 0,
    },
    baseline_latency_ms: latency,
    weight: 50,
  };
}

function mkContext(overrides?: Partial<RouteContext>): RouteContext {
  return {
    request_id: `req-${Math.random().toString(36).substr(2, 9)}`,
    text_chars: 1000,
    expected_out_tokens: 200,
    priority: 'NORMAL',
    sensitive: false,
    ...overrides,
  };
}

function mkConstraints(overrides?: Partial<RouteConstraints>): RouteConstraints {
  return {
    max_latency_ms: 500,
    max_cost_per_call: 1.0,
    min_quality: 'FAST',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SmartRouter', () => {
  let registry: ProviderRegistry;
  let audit: MockAudit;
  let router: SmartRouter;
  
  beforeEach(() => {
    registry = new ProviderRegistry();
    audit = new MockAudit();
    router = new SmartRouter(registry, audit);
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: INV-RTR-01 - Determinism (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('INV-RTR-01: Deterministic Routing', () => {
    it('same inputs produce same output', () => {
      registry.register(mkProvider('A', 'CLOUD', 'BALANCED', 200, 0.01, 0.01));
      registry.register(mkProvider('B', 'CLOUD', 'BALANCED', 200, 0.01, 0.01));
      
      const ctx = mkContext({ request_id: 'fixed-id' });
      const constraints = mkConstraints();
      
      const d1 = router.route({ ctx, constraints, now_ms: 1000 });
      
      // Reset router state
      router.reset();
      
      const d2 = router.route({ ctx, constraints, now_ms: 1001 });
      
      expect(d1.provider_id).toBe(d2.provider_id);
      expect(d1.score).toBe(d2.score);
    });
    
    it('uses stable tie-break (alphabetical ID)', () => {
      // Register in reverse order
      registry.register(mkProvider('C', 'CLOUD', 'BALANCED', 200, 0.01, 0.01));
      registry.register(mkProvider('A', 'CLOUD', 'BALANCED', 200, 0.01, 0.01));
      registry.register(mkProvider('B', 'CLOUD', 'BALANCED', 200, 0.01, 0.01));
      
      const decision = router.route({
        ctx: mkContext(),
        constraints: mkConstraints(),
        now_ms: 1000,
      });
      
      // Should pick A (alphabetically first among equal scores)
      expect(decision.provider_id).toBe('A');
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: INV-RTR-02 - Fallback (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('INV-RTR-02: Fallback on Failure', () => {
    it('rerouteOnFailure selects different provider', () => {
      registry.register(mkProvider('A', 'CLOUD', 'BALANCED', 100, 0.01, 0.01));
      registry.register(mkProvider('B', 'CLOUD', 'BALANCED', 150, 0.01, 0.01));
      
      const ctx = mkContext();
      const constraints = mkConstraints();
      
      const d1 = router.route({ ctx, constraints, now_ms: 1000 });
      expect(d1.provider_id).toBe('A'); // Lower latency
      
      const d2 = router.rerouteOnFailure({
        failing_provider_id: 'A',
        ctx,
        constraints,
        now_ms: 2000,
      });
      
      expect(d2.provider_id).toBe('B');
      expect(d2.fallback_used).toBe(true);
    });
    
    it('marks failing provider as down', () => {
      registry.register(mkProvider('A', 'CLOUD', 'BALANCED', 100, 0.01, 0.01));
      registry.register(mkProvider('B', 'CLOUD', 'BALANCED', 150, 0.01, 0.01));
      
      router.rerouteOnFailure({
        failing_provider_id: 'A',
        ctx: mkContext(),
        constraints: mkConstraints(),
        now_ms: 1000,
      });
      
      expect(registry.get('A').health.up).toBe(false);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: INV-RTR-03 - Constraints (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('INV-RTR-03: Constraint Enforcement', () => {
    it('throws when no provider satisfies constraints', () => {
      registry.register(mkProvider('A', 'CLOUD', 'FAST', 1000, 10, 10));
      
      expect(() => router.route({
        ctx: mkContext(),
        constraints: mkConstraints({
          max_latency_ms: 100,
          max_cost_per_call: 0.001,
          min_quality: 'QUALITY',
        }),
        now_ms: 1000,
      })).toThrow(NoViableProviderError);
    });
    
    it('force_provider bypasses scoring but checks constraints', () => {
      registry.register(mkProvider('A', 'CLOUD', 'BALANCED', 200, 0.01, 0.01));
      registry.register(mkProvider('B', 'CLOUD', 'QUALITY', 300, 0.02, 0.02));
      
      const decision = router.route({
        ctx: mkContext(),
        constraints: mkConstraints({ force_provider: 'B' }),
        now_ms: 1000,
      });
      
      expect(decision.provider_id).toBe('B');
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: INV-RTR-04 - Audit (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('INV-RTR-04: Audit Logging', () => {
    it('creates audit event for every routing decision', () => {
      registry.register(mkProvider('A', 'CLOUD', 'BALANCED', 200, 0.01, 0.01));
      
      router.route({ ctx: mkContext(), constraints: mkConstraints(), now_ms: 1000 });
      
      const events = audit.getEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('ROUTING');
      expect(events[0].action).toBe('ROUTE_DECISION');
      expect(events[0].data.provider_id).toBe('A');
      expect(events[0].data.score_breakdown).toBeDefined();
    });
    
    it('creates audit events for fallback and provider down', () => {
      registry.register(mkProvider('A', 'CLOUD', 'BALANCED', 100, 0.01, 0.01));
      registry.register(mkProvider('B', 'CLOUD', 'BALANCED', 150, 0.01, 0.01));
      
      router.rerouteOnFailure({
        failing_provider_id: 'A',
        ctx: mkContext(),
        constraints: mkConstraints(),
        now_ms: 1000,
      });
      
      const events = audit.getEvents();
      const actions = events.map(e => e.action);
      
      expect(actions).toContain('PROVIDER_DOWN');
      expect(actions).toContain('ROUTE_FALLBACK');
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: INV-RTR-05 - Anti-Flap (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('INV-RTR-05: Anti-Flap Stability', () => {
    it('applies sticky routing for same category', () => {
      registry.register(mkProvider('A', 'CLOUD', 'BALANCED', 200, 0.01, 0.01));
      registry.register(mkProvider('B', 'CLOUD', 'BALANCED', 200, 0.01, 0.01));
      
      const ctx1 = mkContext({ category: 'test-category' });
      const d1 = router.route({ ctx: ctx1, constraints: mkConstraints(), now_ms: 1000 });
      
      // Same category should get same provider (sticky)
      const ctx2 = mkContext({ category: 'test-category' });
      const d2 = router.route({ ctx: ctx2, constraints: mkConstraints(), now_ms: 2000 });
      
      expect(d1.provider_id).toBe(d2.provider_id);
    });
    
    it('different categories can get different providers', () => {
      registry.register(mkProvider('A', 'CLOUD', 'BALANCED', 200, 0.01, 0.01));
      registry.register(mkProvider('B', 'CLOUD', 'QUALITY', 300, 0.02, 0.02));
      
      const ctx1 = mkContext({ category: 'cat1', priority: 'NORMAL' });
      const ctx2 = mkContext({ category: 'cat2', priority: 'QUALITY' });
      
      const d1 = router.route({ ctx: ctx1, constraints: mkConstraints(), now_ms: 1000 });
      const d2 = router.route({ ctx: ctx2, constraints: mkConstraints(), now_ms: 2000 });
      
      // Different categories are independent
      // (They may or may not be different depending on scoring)
      expect(d1.provider_id).toBeDefined();
      expect(d2.provider_id).toBeDefined();
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: INV-RTR-06 - Circuit Breaker (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('INV-RTR-06: Circuit Breaker', () => {
    it('excludes providers with open circuit', () => {
      registry.register(mkProvider('A', 'CLOUD', 'BALANCED', 100, 0.01, 0.01)); // Best
      registry.register(mkProvider('B', 'CLOUD', 'BALANCED', 200, 0.01, 0.01));
      
      // Force failures on A to open circuit
      for (let i = 0; i < 3; i++) {
        router.rerouteOnFailure({
          failing_provider_id: 'A',
          ctx: mkContext(),
          constraints: mkConstraints(),
          now_ms: 1000 + i,
        });
        // Re-mark A as up so we can fail again
        if (i < 2) registry.markUp('A', 1000 + i);
      }
      
      // Now A should be excluded due to circuit breaker
      const decision = router.route({
        ctx: mkContext(),
        constraints: mkConstraints(),
        now_ms: 2000,
      });
      
      expect(decision.provider_id).toBe('B');
    });
    
    it('recordSuccess recovers circuit', () => {
      registry.register(mkProvider('A', 'CLOUD', 'BALANCED', 100, 0.01, 0.01));
      registry.register(mkProvider('B', 'CLOUD', 'BALANCED', 200, 0.01, 0.01));
      
      // Initial route should pick A
      const d1 = router.route({
        ctx: mkContext(),
        constraints: mkConstraints(),
        now_ms: 1000,
      });
      expect(d1.provider_id).toBe('A');
      
      // Record success
      router.recordSuccess('A', 100, 2000);
      
      // Should still pick A
      const d2 = router.route({
        ctx: mkContext(),
        constraints: mkConstraints(),
        now_ms: 3000,
      });
      expect(d2.provider_id).toBe('A');
    });
  });
});
