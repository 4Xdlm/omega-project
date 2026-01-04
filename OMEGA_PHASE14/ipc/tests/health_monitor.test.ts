/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Health Monitor Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Test coverage for:
 * - INV-IPC-05: Heartbeat alive check
 * - Circuit breaker pattern
 * 
 * Total: 6 tests
 * 
 * @module health_monitor.test
 * @version 3.14.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HealthMonitor } from '../health_monitor.js';
import { DEFAULT_BRIDGE_CONFIG } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════════

describe('Health Monitor', () => {
  let monitor: HealthMonitor;
  
  beforeEach(() => {
    monitor = new HealthMonitor({
      ...DEFAULT_BRIDGE_CONFIG,
      circuit_failure_threshold: 3,
      circuit_reset_timeout_ms: 1000,
      heartbeat_interval_ms: 500,
      heartbeat_timeout_ms: 200,
    });
  });
  
  afterEach(() => {
    monitor.stop();
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: Circuit Breaker (4 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Circuit Breaker', () => {
    it('starts with CLOSED circuit', () => {
      expect(monitor.getCircuitState()).toBe('CLOSED');
      expect(monitor.isRequestAllowed()).toBe(true);
    });
    
    it('opens circuit after failure threshold', () => {
      let opened = false;
      monitor.on('circuit_open', () => { opened = true; });
      
      // Record failures up to threshold
      monitor.recordFailure();
      expect(monitor.getCircuitState()).toBe('CLOSED');
      
      monitor.recordFailure();
      expect(monitor.getCircuitState()).toBe('CLOSED');
      
      monitor.recordFailure(); // Threshold = 3
      expect(monitor.getCircuitState()).toBe('OPEN');
      expect(monitor.isRequestAllowed()).toBe(false);
      expect(opened).toBe(true);
    });
    
    it('success resets failure count', () => {
      monitor.recordFailure();
      monitor.recordFailure();
      
      // Success resets
      monitor.recordSuccess();
      
      // Need 3 more failures to open
      monitor.recordFailure();
      monitor.recordFailure();
      expect(monitor.getCircuitState()).toBe('CLOSED');
      
      monitor.recordFailure();
      expect(monitor.getCircuitState()).toBe('OPEN');
    });
    
    it('forceClose closes circuit immediately', () => {
      // Open the circuit
      monitor.recordFailure();
      monitor.recordFailure();
      monitor.recordFailure();
      expect(monitor.getCircuitState()).toBe('OPEN');
      
      monitor.forceClose();
      expect(monitor.getCircuitState()).toBe('CLOSED');
      expect(monitor.isRequestAllowed()).toBe(true);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: Heartbeat - INV-IPC-05 (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Heartbeat - INV-IPC-05', () => {
    it('recordHeartbeat updates last heartbeat time', () => {
      const initialTime = monitor.getTimeSinceHeartbeat();
      expect(initialTime).toBe(0); // Not started
      
      monitor.recordHeartbeat(10);
      
      const stats = monitor.getStats();
      expect(stats.last_heartbeat_ms).toBeGreaterThan(0);
    });
    
    it('isAlive returns true initially and after heartbeat', () => {
      // Initially true (not started)
      expect(monitor.isAlive()).toBe(true);
      
      monitor.recordHeartbeat(5);
      expect(monitor.isAlive()).toBe(true);
    });
  });
});
