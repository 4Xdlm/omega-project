/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — IPC Types
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NASA-grade type definitions for Python IPC Bridge.
 * JSON-RPC 2.0 compliant with extensions for observability.
 * 
 * @module types
 * @version 3.14.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL VERSION
// ═══════════════════════════════════════════════════════════════════════════════

/** Protocol version for handshake - INV-IPC-08 */
export const PROTOCOL_VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════════════════════════
// JSON-RPC 2.0 TYPES (STRICT)
// ═══════════════════════════════════════════════════════════════════════════════

/** Request ID - monotonic integer for determinism */
export type JsonRpcId = number;

/** JSON-RPC 2.0 Request */
export interface JsonRpcRequest {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly method: string;
  readonly params?: unknown;
  /** Extension: correlation ID for distributed tracing */
  readonly _correlation_id?: string;
  /** Extension: timestamp for latency measurement */
  readonly _timestamp_ms?: number;
}

/** JSON-RPC 2.0 Success Response */
export interface JsonRpcSuccess {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly result: unknown;
  /** Extension: processing time in worker */
  readonly _duration_ms?: number;
}

/** JSON-RPC 2.0 Error Object */
export interface JsonRpcErrorObj {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

/** JSON-RPC 2.0 Error Response */
export interface JsonRpcError {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly error: JsonRpcErrorObj;
}

/** JSON-RPC 2.0 Response (union) */
export type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARD ERROR CODES (JSON-RPC 2.0)
// ═══════════════════════════════════════════════════════════════════════════════

export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Custom codes (-32000 to -32099)
  TIMEOUT: -32000,
  WORKER_CRASHED: -32001,
  BRIDGE_STOPPED: -32002,
  QUEUE_FULL: -32003,
  CIRCUIT_OPEN: -32004,
  VERSION_MISMATCH: -32005,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER STATES - INV-IPC-04
// ═══════════════════════════════════════════════════════════════════════════════

export type WorkerState = 
  | 'STOPPED'    // Initial state, process not started
  | 'STARTING'   // Process spawned, waiting for READY
  | 'READY'      // READY received, can accept calls
  | 'RUNNING'    // Actively processing requests
  | 'STOPPING'   // Graceful shutdown in progress
  | 'CRASHED';   // Process died unexpectedly

/** State transition matrix (valid transitions only) */
export const VALID_TRANSITIONS: Record<WorkerState, WorkerState[]> = {
  STOPPED: ['STARTING'],
  STARTING: ['READY', 'CRASHED', 'STOPPING'],
  READY: ['RUNNING', 'STOPPING', 'CRASHED'],
  RUNNING: ['READY', 'STOPPING', 'CRASHED'],
  STOPPING: ['STOPPED'],
  CRASHED: ['STOPPED', 'STARTING'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER STATES
// ═══════════════════════════════════════════════════════════════════════════════

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// ═══════════════════════════════════════════════════════════════════════════════
// BRIDGE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface BridgeConfig {
  // Process
  readonly pythonPath: string;
  readonly scriptPath: string;
  readonly cwd?: string;
  readonly env?: Record<string, string>;
  
  // Timeouts - INV-IPC-02
  readonly default_timeout_ms: number;
  readonly spawn_timeout_ms: number;
  
  // Backpressure - INV-IPC-07
  readonly max_inflight: number;
  readonly max_queue_size: number;
  
  // Health - INV-IPC-05
  readonly heartbeat_interval_ms: number;
  readonly heartbeat_timeout_ms: number;
  
  // Circuit breaker
  readonly circuit_failure_threshold: number;
  readonly circuit_reset_timeout_ms: number;
  
  // Retry
  readonly max_retries: number;
  readonly retry_delay_ms: number;
  
  // Protocol - INV-IPC-08
  readonly protocol_version: string;
}

/** Default configuration */
export const DEFAULT_BRIDGE_CONFIG: BridgeConfig = {
  pythonPath: 'python',
  scriptPath: '',
  default_timeout_ms: 30000,
  spawn_timeout_ms: 5000,
  max_inflight: 16,
  max_queue_size: 64,
  heartbeat_interval_ms: 10000,
  heartbeat_timeout_ms: 5000,
  circuit_failure_threshold: 5,
  circuit_reset_timeout_ms: 30000,
  max_retries: 2,
  retry_delay_ms: 1000,
  protocol_version: PROTOCOL_VERSION,
};

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface PendingRequest {
  readonly id: JsonRpcId;
  readonly method: string;
  readonly correlation_id: string;
  readonly created_at: number;
  readonly timeout_ms: number;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
  retry_count: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDSHAKE
// ═══════════════════════════════════════════════════════════════════════════════

export interface HandshakeMessage {
  readonly type: 'READY';
  readonly protocol_version: string;
  readonly worker_id: string;
  readonly capabilities?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH METRICS
// ═══════════════════════════════════════════════════════════════════════════════

export interface HealthStatus {
  readonly worker_state: WorkerState;
  readonly circuit_state: CircuitState;
  readonly pending_count: number;
  readonly queue_size: number;
  readonly total_requests: number;
  readonly total_successes: number;
  readonly total_failures: number;
  readonly total_timeouts: number;
  readonly avg_latency_ms: number;
  readonly last_heartbeat_ms: number;
  readonly uptime_ms: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

export type BridgeEvent = 
  | 'ready'
  | 'error'
  | 'exit'
  | 'heartbeat'
  | 'circuit_open'
  | 'circuit_close'
  | 'request_start'
  | 'request_success'
  | 'request_error'
  | 'request_timeout';

export interface BridgeEventData {
  ready: { worker_id: string; protocol_version: string };
  error: { error: Error; context?: string };
  exit: { code: number | null; signal: string | null };
  heartbeat: { latency_ms: number };
  circuit_open: { failures: number };
  circuit_close: { reason: string };
  request_start: { id: JsonRpcId; method: string; correlation_id: string };
  request_success: { id: JsonRpcId; method: string; latency_ms: number };
  request_error: { id: JsonRpcId; method: string; error: Error };
  request_timeout: { id: JsonRpcId; method: string; timeout_ms: number };
}
