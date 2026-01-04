/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Circuit Breaker Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Test coverage for INV-RTR-06 (failure isolation).
 * 
 * Total: 5 tests
 * 
 * @module router/tests/circuit_breaker.test
 * @version 3.14.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker } from '../circuit_breaker.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Circuit Breaker - INV-RTR-06', () => {
  let breaker: CircuitBreaker;
  
  beforeEach(() => {
    breaker = new CircuitBreaker({
      failure_threshold: 3,
      success_threshold: 2,
      reset_timeout_ms: 30000,
      cooldown_ms: 10000,
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: State Transitions (3 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('State Transitions', () => {
    it('starts CLOSED and opens after failure threshold', () => {
      expect(breaker.getState('provider-A', 1000)).toBe('CLOSED');
      expect(breaker.isRequestAllowed('provider-A', 1000)).toBe(true);
      
      // Record failures
      breaker.recordFailure('provider-A', 1000);
      expect(breaker.getState('provider-A', 1000)).toBe('CLOSED');
      
      breaker.recordFailure('provider-A', 2000);
      expect(breaker.getState('provider-A', 2000)).toBe('CLOSED');
      
      breaker.recordFailure('provider-A', 3000); // Threshold reached
      expect(breaker.getState('provider-A', 3000)).toBe('OPEN');
      expect(breaker.isRequestAllowed('provider-A', 3000)).toBe(false);
    });
    
    it('transitions to HALF_OPEN after reset timeout', () => {
      // Open the circuit
      breaker.recordFailure('provider-A', 1000);
      breaker.recordFailure('provider-A', 2000);
      breaker.recordFailure('provider-A', 3000);
      expect(breaker.getState('provider-A', 3000)).toBe('OPEN');
      
      // Still OPEN before timeout
      expect(breaker.getState('provider-A', 20000)).toBe('OPEN');
      
      // HALF_OPEN after timeout (3000 + 30000 = 33000)
      expect(breaker.getState('provider-A', 34000)).toBe('HALF_OPEN');
      expect(breaker.isRequestAllowed('provider-A', 34000)).toBe(true);
    });
    
    it('closes circuit after success threshold in HALF_OPEN', () => {
      // Open the circuit
      breaker.forceOpen('provider-A', 1000);
      
      // Transition to HALF_OPEN
      const halfOpenTime = 1000 + 30001;
      expect(breaker.getState('provider-A', halfOpenTime)).toBe('HALF_OPEN');
      
      // Record successes
      breaker.recordSuccess('provider-A', halfOpenTime);
      expect(breaker.getState('provider-A', halfOpenTime)).toBe('HALF_OPEN');
      
      breaker.recordSuccess('provider-A', halfOpenTime + 1000);
      expect(breaker.getState('provider-A', halfOpenTime + 1000)).toBe('CLOSED');
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: Cooldown & Stats (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Cooldown & Stats', () => {
    it('isInCooldown returns true after recent failure', () => {
      breaker.recordFailure('provider-A', 1000);
      
      // In cooldown
      expect(breaker.isInCooldown('provider-A', 5000)).toBe(true);
      
      // Out of cooldown (1000 + 10000 = 11000)
      expect(breaker.isInCooldown('provider-A', 12000)).toBe(false);
    });
    
    it('getOpenCircuits returns list of open circuits', () => {
      // Open some circuits
      breaker.forceOpen('provider-A', 1000);
      breaker.forceOpen('provider-C', 1000);
      
      const open = breaker.getOpenCircuits(2000);
      expect(open).toEqual(['provider-A', 'provider-C']);
      
      // Close one
      breaker.forceClose('provider-A', 3000);
      expect(breaker.getOpenCircuits(3000)).toEqual(['provider-C']);
    });
  });
});
