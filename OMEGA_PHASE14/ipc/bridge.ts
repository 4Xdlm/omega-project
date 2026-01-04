/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Python Bridge
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NASA-grade Python IPC Bridge with full observability.
 * 
 * Invariants:
 * - INV-IPC-01: Request/Response matching by ID
 * - INV-IPC-02: Timeout deterministic, no hang
 * - INV-IPC-03: JSON-RPC 2.0 strict validation
 * - INV-IPC-04: Clear lifecycle states
 * - INV-IPC-05: Heartbeat alive check
 * - INV-IPC-06: Observability integration
 * - INV-IPC-07: Backpressure protection
 * - INV-IPC-08: Protocol version handshake
 * 
 * @module bridge
 * @version 3.14.0
 */

import { EventEmitter } from 'node:events';
import type {
  BridgeConfig,
  JsonRpcRequest,
  JsonRpcResponse,
  HealthStatus,
  BridgeEvent,
  BridgeEventData,
  WorkerState
} from './types.js';
import { DEFAULT_BRIDGE_CONFIG, JSON_RPC_ERRORS } from './types.js';
import {
  encodeRequest,
  decodeResponseLine,
  parseHandshake,
  validateProtocolVersion,
  createRequest,
  generateCorrelationId,
  ProtocolError
} from './protocol.js';
import { WorkerManager } from './worker_manager.js';
import { RequestTracker, RequestError } from './request_tracker.js';
import { HealthMonitor } from './health_monitor.js';

// ═══════════════════════════════════════════════════════════════════════════════
// BRIDGE ERROR
// ═══════════════════════════════════════════════════════════════════════════════

export class BridgeError extends Error {
  constructor(message: string, public readonly code: number = JSON_RPC_ERRORS.INTERNAL_ERROR) {
    super(message);
    this.name = 'BridgeError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PYTHON BRIDGE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class PythonBridge extends EventEmitter {
  private config: BridgeConfig;
  private worker: WorkerManager;
  private tracker: RequestTracker;
  private health: HealthMonitor;
  
  private ready = false;
  private workerId: string = '';
  private workerProtocolVersion: string = '';
  private startTime = 0;
  
  // Request queue for backpressure - INV-IPC-07
  private queue: Array<{
    method: string;
    params?: unknown;
    timeout_ms?: number;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = [];
  
  constructor(config: Partial<BridgeConfig> & { scriptPath: string }) {
    super();
    this.config = Object.freeze({ ...DEFAULT_BRIDGE_CONFIG, ...config });
    
    if (this.config.max_inflight < 1) {
      throw new BridgeError('max_inflight must be >= 1');
    }
    if (this.config.max_queue_size < 0) {
      throw new BridgeError('max_queue_size must be >= 0');
    }
    
    this.worker = new WorkerManager();
    this.tracker = new RequestTracker();
    this.health = new HealthMonitor(this.config);
    
    this.setupTrackerEvents();
    this.setupHealthEvents();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT WIRING
  // ═══════════════════════════════════════════════════════════════════════════
  
  private setupTrackerEvents(): void {
    this.tracker.on('success', (data) => {
      this.health.recordSuccess();
      this.emitTyped('request_success', {
        id: data.id,
        method: data.method,
        latency_ms: data.latency_ms,
      });
      this.processQueue();
    });
    
    this.tracker.on('error', (data) => {
      this.health.recordFailure();
      this.emitTyped('request_error', {
        id: data.id,
        method: data.method,
        error: data.error,
      });
      this.processQueue();
    });
    
    this.tracker.on('timeout', (data) => {
      this.health.recordFailure();
      this.emitTyped('request_timeout', {
        id: data.id,
        method: data.method,
        timeout_ms: data.timeout_ms,
      });
      this.processQueue();
    });
  }
  
  private setupHealthEvents(): void {
    this.health.on('circuit_open', (data) => {
      this.emitTyped('circuit_open', data);
    });
    
    this.health.on('circuit_close', (data) => {
      this.emitTyped('circuit_close', data);
    });
    
    this.health.on('heartbeat', (data) => {
      this.emitTyped('heartbeat', data);
    });
  }
  
  private emitTyped<E extends BridgeEvent>(event: E, data: BridgeEventData[E]): void {
    this.emit(event, data);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Check if bridge is ready to accept requests
   */
  isReady(): boolean {
    return this.ready && this.worker.canAcceptRequests();
  }
  
  /**
   * Get worker state
   */
  getWorkerState(): WorkerState {
    return this.worker.getState();
  }
  
  /**
   * Get worker ID (from handshake)
   */
  getWorkerId(): string {
    return this.workerId;
  }
  
  /**
   * Start the bridge
   */
  async start(): Promise<void> {
    if (this.ready) {
      throw new BridgeError('Bridge already started');
    }
    
    this.startTime = Date.now();
    
    // Start worker process
    await this.worker.start(
      this.config,
      (line) => this.onStdoutLine(line),
      (line) => this.onStderrLine(line)
    );
    
    // Wait for handshake - INV-IPC-08
    await this.waitForHandshake();
    
    // Start heartbeat - INV-IPC-05
    this.health.startHeartbeat(async () => {
      try {
        await this.call('__heartbeat__', undefined, this.config.heartbeat_timeout_ms);
        return true;
      } catch {
        return false;
      }
    });
    
    this.worker.markRunning();
  }
  
  /**
   * Wait for handshake with timeout - INV-IPC-08
   */
  private async waitForHandshake(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new BridgeError(
          'Spawn timeout: worker did not send READY',
          JSON_RPC_ERRORS.TIMEOUT
        ));
      }, this.config.spawn_timeout_ms);
      
      const onReady = () => {
        clearTimeout(timeout);
        this.off('ready', onReady);
        resolve();
      };
      
      this.on('ready', onReady);
    });
  }
  
  /**
   * Stop the bridge
   */
  async stop(): Promise<void> {
    // Stop heartbeat
    this.health.stop();
    
    // Reject all pending requests
    this.tracker.rejectAll('Bridge stopped');
    
    // Clear queue
    for (const item of this.queue) {
      item.reject(new BridgeError('Bridge stopped', JSON_RPC_ERRORS.BRIDGE_STOPPED));
    }
    this.queue = [];
    
    // Stop worker
    await this.worker.stop();
    
    this.ready = false;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // I/O HANDLING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Handle stdout line (NDJSON protocol)
   */
  private onStdoutLine(line: string): void {
    // Check for handshake first
    if (!this.ready) {
      const handshake = parseHandshake(line);
      if (handshake) {
        try {
          validateProtocolVersion(handshake.protocol_version, this.config.protocol_version);
          this.workerId = handshake.worker_id;
          this.workerProtocolVersion = handshake.protocol_version;
          this.ready = true;
          this.worker.markReady();
          this.emitTyped('ready', {
            worker_id: this.workerId,
            protocol_version: this.workerProtocolVersion,
          });
        } catch (err) {
          this.emitTyped('error', { error: err as Error, context: 'handshake' });
        }
        return;
      }
    }
    
    // Parse JSON-RPC response
    let response: JsonRpcResponse;
    try {
      response = decodeResponseLine(line);
    } catch (err) {
      this.emitTyped('error', { error: err as Error, context: 'decode' });
      return;
    }
    
    // Route to tracker - INV-IPC-01
    const matched = this.tracker.resolve(response);
    if (!matched) {
      this.emitTyped('error', {
        error: new Error(`Orphan response id=${response.id}`),
        context: 'orphan',
      });
    }
  }
  
  /**
   * Handle stderr line (logs)
   */
  private onStderrLine(line: string): void {
    // Could integrate with ForensicLogger here
    // For now, emit as event
    this.emit('worker_log', { line });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RPC CALLS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Call a method on the Python worker
   * INV-IPC-01, INV-IPC-02, INV-IPC-07
   */
  async call<T = unknown>(
    method: string,
    params?: unknown,
    timeout_ms?: number
  ): Promise<T> {
    // Check ready
    if (!this.ready) {
      throw new BridgeError('Bridge not ready', JSON_RPC_ERRORS.INTERNAL_ERROR);
    }
    
    // Check circuit breaker
    if (!this.health.isRequestAllowed()) {
      throw new BridgeError('Circuit breaker open', JSON_RPC_ERRORS.CIRCUIT_OPEN);
    }
    
    // Check backpressure - INV-IPC-07
    if (this.tracker.getPendingCount() >= this.config.max_inflight) {
      // Queue the request
      if (this.queue.length >= this.config.max_queue_size) {
        throw new BridgeError('Queue full', JSON_RPC_ERRORS.QUEUE_FULL);
      }
      
      return new Promise<T>((resolve, reject) => {
        this.queue.push({ method, params, timeout_ms, resolve: resolve as (v: unknown) => void, reject });
      });
    }
    
    return this.executeCall<T>(method, params, timeout_ms);
  }
  
  /**
   * Execute RPC call immediately
   */
  private async executeCall<T>(
    method: string,
    params?: unknown,
    timeout_ms?: number
  ): Promise<T> {
    const id = this.tracker.generateId();
    const correlation_id = generateCorrelationId();
    const to = timeout_ms ?? this.config.default_timeout_ms;
    
    // Create request - INV-IPC-03
    const req = createRequest(id, method, params, correlation_id);
    
    // Encode
    const encoded = encodeRequest(req);
    
    // Track - INV-IPC-01
    return new Promise<T>((resolve, reject) => {
      this.tracker.track(
        id,
        method,
        correlation_id,
        to,
        resolve as (v: unknown) => void,
        reject
      );
      
      this.emitTyped('request_start', { id, method, correlation_id });
      
      // Send to worker
      if (!this.worker.writeStdin(encoded)) {
        this.tracker.rejectAll('Worker stdin not writable');
        reject(new BridgeError('Worker not writable'));
      }
    });
  }
  
  /**
   * Process queued requests - INV-IPC-07
   */
  private processQueue(): void {
    while (
      this.queue.length > 0 &&
      this.tracker.getPendingCount() < this.config.max_inflight
    ) {
      const item = this.queue.shift()!;
      
      this.executeCall(item.method, item.params, item.timeout_ms)
        .then(item.resolve)
        .catch(item.reject);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH & STATS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get health status
   */
  getHealth(): HealthStatus {
    const metrics = this.tracker.getMetrics();
    const healthStats = this.health.getStats();
    
    return {
      worker_state: this.worker.getState(),
      circuit_state: healthStats.circuit_state,
      pending_count: metrics.pending_count,
      queue_size: this.queue.length,
      total_requests: metrics.total_requests,
      total_successes: metrics.total_successes,
      total_failures: metrics.total_failures,
      total_timeouts: metrics.total_timeouts,
      avg_latency_ms: metrics.avg_latency_ms,
      last_heartbeat_ms: healthStats.last_heartbeat_ms,
      uptime_ms: this.startTime > 0 ? Date.now() - this.startTime : 0,
    };
  }
  
  /**
   * Get configuration
   */
  getConfig(): BridgeConfig {
    return this.config;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a configured PythonBridge instance
 */
export function createBridge(
  scriptPath: string,
  options?: Partial<Omit<BridgeConfig, 'scriptPath'>>
): PythonBridge {
  return new PythonBridge({ scriptPath, ...options });
}
