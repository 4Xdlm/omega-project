/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — IPC Module
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NASA-grade Python IPC Bridge with full observability.
 * 
 * @module ipc
 * @version 3.14.0
 */

// Types
export type {
  JsonRpcId,
  JsonRpcRequest,
  JsonRpcSuccess,
  JsonRpcError,
  JsonRpcErrorObj,
  JsonRpcResponse,
  WorkerState,
  CircuitState,
  BridgeConfig,
  PendingRequest,
  HandshakeMessage,
  HealthStatus,
  BridgeEvent,
  BridgeEventData
} from './types.js';

// Constants
export {
  PROTOCOL_VERSION,
  JSON_RPC_ERRORS,
  VALID_TRANSITIONS,
  DEFAULT_BRIDGE_CONFIG
} from './types.js';

// Protocol
export {
  ProtocolError,
  validateId,
  validateRequest,
  validateResponse,
  validateErrorObj,
  encodeRequest,
  encodeResponse,
  decodeResponseLine,
  decodeRequestLine,
  parseHandshake,
  validateProtocolVersion,
  createRequest,
  createSuccessResponse,
  createErrorResponse,
  generateCorrelationId,
  resetCorrelationCounter,
  isSuccess,
  isError
} from './protocol.js';

// Worker Manager
export { WorkerManager } from './worker_manager.js';

// Request Tracker
export { RequestTracker, RequestError } from './request_tracker.js';
export type { TrackerMetrics } from './request_tracker.js';

// Health Monitor
export { HealthMonitor } from './health_monitor.js';

// Bridge
export { PythonBridge, BridgeError, createBridge } from './bridge.js';
