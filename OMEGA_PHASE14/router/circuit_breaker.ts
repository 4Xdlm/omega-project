/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Circuit Breaker
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Per-provider circuit breaker for failure isolation.
 * INV-RTR-06: N consecutive failures = provider isolated.
 * 
 * @module router/circuit_breaker
 * @version 3.14.0
 */

import type { ProviderId, CircuitState, CircuitBreakerConfig } from './types.js';
import { DEFAULT_CIRCUIT_CONFIG } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT STATE
// ═══════════════════════════════════════════════════════════════════════════════

interface ProviderCircuit {
  state: CircuitState;
  failures: number;
  successes: number;
  last_failure_ms: number;
  last_state_change_ms: number;
  open_until_ms: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER CLASS - INV-RTR-06
// ═══════════════════════════════════════════════════════════════════════════════

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private circuits = new Map<ProviderId, ProviderCircuit>();
  
  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = Object.freeze({ ...DEFAULT_CIRCUIT_CONFIG, ...config });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get current configuration
   */
  getConfig(): CircuitBreakerConfig {
    return this.config;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CIRCUIT STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get or create circuit for provider
   */
  private getOrCreateCircuit(provider_id: ProviderId): ProviderCircuit {
    let circuit = this.circuits.get(provider_id);
    if (!circuit) {
      circuit = {
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        last_failure_ms: 0,
        last_state_change_ms: 0,
        open_until_ms: 0,
      };
      this.circuits.set(provider_id, circuit);
    }
    return circuit;
  }
  
  /**
   * Get circuit state for a provider
   */
  getState(provider_id: ProviderId, now_ms: number): CircuitState {
    const circuit = this.getOrCreateCircuit(provider_id);
    
    // Check if open circuit should transition to half-open
    if (circuit.state === 'OPEN' && now_ms >= circuit.open_until_ms) {
      this.transitionTo(provider_id, 'HALF_OPEN', now_ms);
      return 'HALF_OPEN';
    }
    
    return circuit.state;
  }
  
  /**
   * Transition circuit to new state
   */
  private transitionTo(provider_id: ProviderId, state: CircuitState, now_ms: number): void {
    const circuit = this.getOrCreateCircuit(provider_id);
    circuit.state = state;
    circuit.last_state_change_ms = now_ms;
    
    if (state === 'OPEN') {
      circuit.open_until_ms = now_ms + this.config.reset_timeout_ms;
    }
    
    if (state === 'CLOSED') {
      circuit.failures = 0;
      circuit.successes = 0;
    }
    
    if (state === 'HALF_OPEN') {
      circuit.successes = 0;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REQUEST TRACKING - INV-RTR-06
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Check if request is allowed for provider
   */
  isRequestAllowed(provider_id: ProviderId, now_ms: number): boolean {
    const state = this.getState(provider_id, now_ms);
    return state !== 'OPEN';
  }
  
  /**
   * Check if provider is in cooldown (recently failed)
   */
  isInCooldown(provider_id: ProviderId, now_ms: number): boolean {
    const circuit = this.getOrCreateCircuit(provider_id);
    if (circuit.last_failure_ms === 0) return false;
    
    const elapsed = now_ms - circuit.last_failure_ms;
    return elapsed < this.config.cooldown_ms;
  }
  
  /**
   * Record successful request
   */
  recordSuccess(provider_id: ProviderId, now_ms: number): void {
    const circuit = this.getOrCreateCircuit(provider_id);
    
    if (circuit.state === 'HALF_OPEN') {
      circuit.successes++;
      
      if (circuit.successes >= this.config.success_threshold) {
        this.transitionTo(provider_id, 'CLOSED', now_ms);
      }
    } else if (circuit.state === 'CLOSED') {
      // Reset failure count on success
      circuit.failures = 0;
    }
  }
  
  /**
   * Record failed request
   */
  recordFailure(provider_id: ProviderId, now_ms: number): void {
    const circuit = this.getOrCreateCircuit(provider_id);
    circuit.last_failure_ms = now_ms;
    
    if (circuit.state === 'HALF_OPEN') {
      // Any failure in half-open goes back to open
      this.transitionTo(provider_id, 'OPEN', now_ms);
    } else if (circuit.state === 'CLOSED') {
      circuit.failures++;
      
      if (circuit.failures >= this.config.failure_threshold) {
        this.transitionTo(provider_id, 'OPEN', now_ms);
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MANUAL CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Force open circuit (manual isolation)
   */
  forceOpen(provider_id: ProviderId, now_ms: number): void {
    this.transitionTo(provider_id, 'OPEN', now_ms);
  }
  
  /**
   * Force close circuit (manual recovery)
   */
  forceClose(provider_id: ProviderId, now_ms: number): void {
    this.transitionTo(provider_id, 'CLOSED', now_ms);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATS & RESET
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get circuit info for a provider
   */
  getCircuitInfo(provider_id: ProviderId, now_ms: number): {
    state: CircuitState;
    failures: number;
    successes: number;
    in_cooldown: boolean;
    time_to_half_open_ms: number;
  } {
    const circuit = this.getOrCreateCircuit(provider_id);
    const state = this.getState(provider_id, now_ms);
    
    let time_to_half_open_ms = 0;
    if (state === 'OPEN') {
      time_to_half_open_ms = Math.max(0, circuit.open_until_ms - now_ms);
    }
    
    return {
      state,
      failures: circuit.failures,
      successes: circuit.successes,
      in_cooldown: this.isInCooldown(provider_id, now_ms),
      time_to_half_open_ms,
    };
  }
  
  /**
   * Get all open circuits
   */
  getOpenCircuits(now_ms: number): ProviderId[] {
    const open: ProviderId[] = [];
    for (const provider_id of this.circuits.keys()) {
      if (this.getState(provider_id, now_ms) === 'OPEN') {
        open.push(provider_id);
      }
    }
    return open.sort();
  }
  
  /**
   * Reset circuit for a provider
   */
  resetCircuit(provider_id: ProviderId): void {
    this.circuits.delete(provider_id);
  }
  
  /**
   * Reset all circuits
   */
  reset(): void {
    this.circuits.clear();
  }
}
