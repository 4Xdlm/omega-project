/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Health Monitor
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Heartbeat monitoring and circuit breaker pattern.
 * INV-IPC-05: Worker proves it's alive periodically.
 * 
 * @module health_monitor
 * @version 3.14.0
 */

import { EventEmitter } from 'node:events';
import type { CircuitState, BridgeConfig } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH MONITOR CLASS - INV-IPC-05
// ═══════════════════════════════════════════════════════════════════════════════

export class HealthMonitor extends EventEmitter {
  private config: BridgeConfig;
  private circuitState: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private lastHeartbeat = 0;
  private lastSuccess = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private circuitResetTimer: NodeJS.Timeout | null = null;
  private heartbeatPending = false;
  
  // Callbacks
  private sendHeartbeat: (() => Promise<boolean>) | null = null;
  
  constructor(config: BridgeConfig) {
    super();
    this.config = config;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CIRCUIT BREAKER
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get circuit state
   */
  getCircuitState(): CircuitState {
    return this.circuitState;
  }
  
  /**
   * Check if requests are allowed
   */
  isRequestAllowed(): boolean {
    return this.circuitState !== 'OPEN';
  }
  
  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.lastSuccess = Date.now();
    
    if (this.circuitState === 'HALF_OPEN') {
      this.closeCircuit();
    }
  }
  
  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.consecutiveFailures++;
    
    if (this.circuitState === 'HALF_OPEN') {
      // Failure in half-open = back to open
      this.openCircuit();
    } else if (this.consecutiveFailures >= this.config.circuit_failure_threshold) {
      this.openCircuit();
    }
  }
  
  /**
   * Open the circuit (stop requests)
   */
  private openCircuit(): void {
    if (this.circuitState === 'OPEN') return;
    
    this.circuitState = 'OPEN';
    this.emit('circuit_open', { failures: this.consecutiveFailures });
    
    // Schedule reset attempt
    this.clearCircuitResetTimer();
    this.circuitResetTimer = setTimeout(() => {
      this.halfOpenCircuit();
    }, this.config.circuit_reset_timeout_ms);
  }
  
  /**
   * Half-open the circuit (allow one test request)
   */
  private halfOpenCircuit(): void {
    this.circuitState = 'HALF_OPEN';
    this.emit('circuit_half_open', {});
  }
  
  /**
   * Close the circuit (normal operation)
   */
  private closeCircuit(): void {
    this.circuitState = 'CLOSED';
    this.consecutiveFailures = 0;
    this.clearCircuitResetTimer();
    this.emit('circuit_close', { reason: 'success' });
  }
  
  /**
   * Force close circuit (manual reset)
   */
  forceClose(): void {
    this.closeCircuit();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HEARTBEAT - INV-IPC-05
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Start heartbeat monitoring
   */
  startHeartbeat(sendHeartbeat: () => Promise<boolean>): void {
    this.sendHeartbeat = sendHeartbeat;
    this.lastHeartbeat = Date.now();
    this.scheduleHeartbeat();
  }
  
  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat(): void {
    this.clearHeartbeatTimer();
    this.sendHeartbeat = null;
    this.heartbeatPending = false;
  }
  
  /**
   * Record heartbeat response
   */
  recordHeartbeat(latency_ms: number): void {
    this.lastHeartbeat = Date.now();
    this.heartbeatPending = false;
    this.emit('heartbeat', { latency_ms });
    
    // Heartbeat success counts as success for circuit
    this.recordSuccess();
  }
  
  /**
   * Record heartbeat failure
   */
  recordHeartbeatFailure(): void {
    this.heartbeatPending = false;
    this.recordFailure();
    this.emit('heartbeat_failure', {});
  }
  
  /**
   * Get time since last heartbeat
   */
  getTimeSinceHeartbeat(): number {
    if (this.lastHeartbeat === 0) return 0;
    return Date.now() - this.lastHeartbeat;
  }
  
  /**
   * Check if worker is considered alive - INV-IPC-05
   */
  isAlive(): boolean {
    if (this.lastHeartbeat === 0) return true; // Not started yet
    
    const elapsed = this.getTimeSinceHeartbeat();
    // Consider dead if no heartbeat for 2x interval + timeout
    const deadThreshold = (this.config.heartbeat_interval_ms * 2) + this.config.heartbeat_timeout_ms;
    
    return elapsed < deadThreshold;
  }
  
  /**
   * Schedule next heartbeat
   */
  private scheduleHeartbeat(): void {
    this.clearHeartbeatTimer();
    
    this.heartbeatTimer = setTimeout(async () => {
      await this.performHeartbeat();
      this.scheduleHeartbeat();
    }, this.config.heartbeat_interval_ms);
  }
  
  /**
   * Perform heartbeat check
   */
  private async performHeartbeat(): Promise<void> {
    if (!this.sendHeartbeat || this.heartbeatPending) return;
    
    // Don't heartbeat if circuit is open
    if (this.circuitState === 'OPEN') return;
    
    this.heartbeatPending = true;
    const start = Date.now();
    
    try {
      const success = await this.sendHeartbeat();
      const latency = Date.now() - start;
      
      if (success) {
        this.recordHeartbeat(latency);
      } else {
        this.recordHeartbeatFailure();
      }
    } catch {
      this.recordHeartbeatFailure();
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Clear heartbeat timer
   */
  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  /**
   * Clear circuit reset timer
   */
  private clearCircuitResetTimer(): void {
    if (this.circuitResetTimer) {
      clearTimeout(this.circuitResetTimer);
      this.circuitResetTimer = null;
    }
  }
  
  /**
   * Stop all timers
   */
  stop(): void {
    this.stopHeartbeat();
    this.clearCircuitResetTimer();
  }
  
  /**
   * Reset monitor (for testing)
   */
  reset(): void {
    this.stop();
    this.circuitState = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastHeartbeat = 0;
    this.lastSuccess = 0;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get health stats
   */
  getStats(): {
    circuit_state: CircuitState;
    consecutive_failures: number;
    last_heartbeat_ms: number;
    last_success_ms: number;
    is_alive: boolean;
  } {
    return {
      circuit_state: this.circuitState,
      consecutive_failures: this.consecutiveFailures,
      last_heartbeat_ms: this.lastHeartbeat,
      last_success_ms: this.lastSuccess,
      is_alive: this.isAlive(),
    };
  }
}
