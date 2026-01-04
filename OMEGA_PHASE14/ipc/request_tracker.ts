/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Request Tracker
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Request/Response matching with timeout management.
 * INV-IPC-01: Each request ID matches exactly one response.
 * INV-IPC-02: Timeout always fires, no infinite hang.
 * 
 * @module request_tracker
 * @version 3.14.0
 */

import { EventEmitter } from 'node:events';
import type { JsonRpcId, PendingRequest, JsonRpcResponse } from './types.js';
import { JSON_RPC_ERRORS } from './types.js';
import { isSuccess, isError } from './protocol.js';

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST TRACKER ERROR
// ═══════════════════════════════════════════════════════════════════════════════

export class RequestError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly request_id: JsonRpcId,
    public readonly method: string
  ) {
    super(message);
    this.name = 'RequestError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS
// ═══════════════════════════════════════════════════════════════════════════════

export interface TrackerMetrics {
  total_requests: number;
  total_successes: number;
  total_failures: number;
  total_timeouts: number;
  pending_count: number;
  avg_latency_ms: number;
  max_latency_ms: number;
  min_latency_ms: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST TRACKER CLASS - INV-IPC-01, INV-IPC-02
// ═══════════════════════════════════════════════════════════════════════════════

export class RequestTracker extends EventEmitter {
  private pending = new Map<JsonRpcId, PendingRequest>();
  private nextId: JsonRpcId = 1;
  
  // Metrics
  private totalRequests = 0;
  private totalSuccesses = 0;
  private totalFailures = 0;
  private totalTimeouts = 0;
  private latencies: number[] = [];
  private maxLatencySamples = 1000;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REQUEST CREATION - INV-IPC-01
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Generate next request ID (monotonic)
   */
  generateId(): JsonRpcId {
    return this.nextId++;
  }
  
  /**
   * Get pending count
   */
  getPendingCount(): number {
    return this.pending.size;
  }
  
  /**
   * Check if request is pending
   */
  hasPending(id: JsonRpcId): boolean {
    return this.pending.has(id);
  }
  
  /**
   * Track a new request - INV-IPC-01
   */
  track(
    id: JsonRpcId,
    method: string,
    correlation_id: string,
    timeout_ms: number,
    resolve: (value: unknown) => void,
    reject: (error: Error) => void
  ): void {
    if (this.pending.has(id)) {
      throw new Error(`Duplicate request ID: ${id}`);
    }
    
    this.totalRequests++;
    
    // Setup timeout - INV-IPC-02
    const timer = setTimeout(() => {
      this.handleTimeout(id);
    }, timeout_ms);
    
    const pending: PendingRequest = {
      id,
      method,
      correlation_id,
      created_at: Date.now(),
      timeout_ms,
      resolve,
      reject,
      timer,
      retry_count: 0,
    };
    
    this.pending.set(id, pending);
    this.emit('track', { id, method, correlation_id });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RESPONSE HANDLING - INV-IPC-01
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Resolve a pending request with response - INV-IPC-01
   */
  resolve(response: JsonRpcResponse): boolean {
    const id = response.id;
    const pending = this.pending.get(id);
    
    if (!pending) {
      this.emit('orphan_response', { id, response });
      return false;
    }
    
    // Clear timeout
    clearTimeout(pending.timer);
    this.pending.delete(id);
    
    // Calculate latency
    const latency = Date.now() - pending.created_at;
    this.recordLatency(latency);
    
    if (isSuccess(response)) {
      this.totalSuccesses++;
      this.emit('success', {
        id,
        method: pending.method,
        correlation_id: pending.correlation_id,
        latency_ms: latency,
        result: response.result,
      });
      pending.resolve(response.result);
    } else if (isError(response)) {
      this.totalFailures++;
      const error = new RequestError(
        response.error.message,
        response.error.code,
        id,
        pending.method
      );
      this.emit('error', {
        id,
        method: pending.method,
        correlation_id: pending.correlation_id,
        latency_ms: latency,
        error,
      });
      pending.reject(error);
    }
    
    return true;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TIMEOUT HANDLING - INV-IPC-02
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Handle request timeout - INV-IPC-02
   */
  private handleTimeout(id: JsonRpcId): void {
    const pending = this.pending.get(id);
    if (!pending) return;
    
    this.pending.delete(id);
    this.totalTimeouts++;
    
    const error = new RequestError(
      `Timeout after ${pending.timeout_ms}ms`,
      JSON_RPC_ERRORS.TIMEOUT,
      id,
      pending.method
    );
    
    this.emit('timeout', {
      id,
      method: pending.method,
      correlation_id: pending.correlation_id,
      timeout_ms: pending.timeout_ms,
    });
    
    pending.reject(error);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BULK OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Reject all pending requests (on bridge stop)
   */
  rejectAll(reason: string): void {
    for (const [id, pending] of this.pending.entries()) {
      clearTimeout(pending.timer);
      
      const error = new RequestError(
        reason,
        JSON_RPC_ERRORS.BRIDGE_STOPPED,
        id,
        pending.method
      );
      
      this.totalFailures++;
      pending.reject(error);
    }
    
    this.pending.clear();
  }
  
  /**
   * Get all pending request IDs
   */
  getPendingIds(): JsonRpcId[] {
    return Array.from(this.pending.keys());
  }
  
  /**
   * Get pending request info
   */
  getPendingInfo(id: JsonRpcId): Omit<PendingRequest, 'resolve' | 'reject' | 'timer'> | undefined {
    const pending = this.pending.get(id);
    if (!pending) return undefined;
    
    return {
      id: pending.id,
      method: pending.method,
      correlation_id: pending.correlation_id,
      created_at: pending.created_at,
      timeout_ms: pending.timeout_ms,
      retry_count: pending.retry_count,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RETRY SUPPORT
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Increment retry count for a request
   */
  incrementRetry(id: JsonRpcId): number {
    const pending = this.pending.get(id);
    if (!pending) return -1;
    
    pending.retry_count++;
    return pending.retry_count;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // METRICS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Record latency sample
   */
  private recordLatency(latency: number): void {
    this.latencies.push(latency);
    if (this.latencies.length > this.maxLatencySamples) {
      this.latencies.shift();
    }
  }
  
  /**
   * Get tracker metrics
   */
  getMetrics(): TrackerMetrics {
    const latencies = this.latencies;
    
    let avg = 0;
    let max = 0;
    let min = Infinity;
    
    if (latencies.length > 0) {
      const sum = latencies.reduce((a, b) => a + b, 0);
      avg = sum / latencies.length;
      max = Math.max(...latencies);
      min = Math.min(...latencies);
    }
    
    return {
      total_requests: this.totalRequests,
      total_successes: this.totalSuccesses,
      total_failures: this.totalFailures,
      total_timeouts: this.totalTimeouts,
      pending_count: this.pending.size,
      avg_latency_ms: Math.round(avg),
      max_latency_ms: max,
      min_latency_ms: min === Infinity ? 0 : min,
    };
  }
  
  /**
   * Reset metrics (for testing)
   */
  resetMetrics(): void {
    this.totalRequests = 0;
    this.totalSuccesses = 0;
    this.totalFailures = 0;
    this.totalTimeouts = 0;
    this.latencies = [];
  }
  
  /**
   * Reset tracker (for testing)
   */
  reset(): void {
    this.rejectAll('Tracker reset');
    this.resetMetrics();
    this.nextId = 1;
  }
}
