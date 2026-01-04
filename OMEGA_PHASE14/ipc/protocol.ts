/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — IPC Protocol
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NDJSON framing + strict JSON-RPC 2.0 validation.
 * INV-IPC-03: Every message validated before processing.
 * 
 * @module protocol
 * @version 3.14.0
 */

import type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccess,
  JsonRpcError,
  JsonRpcErrorObj,
  JsonRpcId,
  HandshakeMessage
} from './types.js';
import { PROTOCOL_VERSION, JSON_RPC_ERRORS } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ASSERTION HELPER
// ═══════════════════════════════════════════════════════════════════════════════

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new ProtocolError(message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL ERROR
// ═══════════════════════════════════════════════════════════════════════════════

export class ProtocolError extends Error {
  constructor(message: string, public readonly code: number = JSON_RPC_ERRORS.INVALID_REQUEST) {
    super(message);
    this.name = 'ProtocolError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION - INV-IPC-03
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate JSON-RPC ID - INV-IPC-03
 * Must be positive integer (deterministic, monotonic)
 */
export function validateId(id: unknown): asserts id is JsonRpcId {
  assert(
    typeof id === 'number' && Number.isInteger(id) && id >= 1,
    `Invalid id: must be integer >= 1, got ${typeof id === 'number' ? id : typeof id}`
  );
}

/**
 * Validate JSON-RPC Request - INV-IPC-03
 */
export function validateRequest(obj: unknown): asserts obj is JsonRpcRequest {
  assert(obj !== null && typeof obj === 'object', 'Request must be object');
  
  const req = obj as Record<string, unknown>;
  
  assert(req.jsonrpc === '2.0', `Request jsonrpc must be "2.0", got "${req.jsonrpc}"`);
  validateId(req.id);
  assert(
    typeof req.method === 'string' && req.method.length > 0,
    'Request method must be non-empty string'
  );
  
  // params is optional, but if present must be object or array
  if (req.params !== undefined) {
    assert(
      typeof req.params === 'object',
      'Request params must be object or array if present'
    );
  }
}

/**
 * Validate JSON-RPC Error Object - INV-IPC-03
 */
export function validateErrorObj(obj: unknown): asserts obj is JsonRpcErrorObj {
  assert(obj !== null && typeof obj === 'object', 'Error must be object');
  
  const err = obj as Record<string, unknown>;
  
  assert(
    typeof err.code === 'number' && Number.isInteger(err.code),
    'Error code must be integer'
  );
  assert(
    typeof err.message === 'string' && err.message.length > 0,
    'Error message must be non-empty string'
  );
  // data is optional
}

/**
 * Validate JSON-RPC Response - INV-IPC-03
 */
export function validateResponse(obj: unknown): asserts obj is JsonRpcResponse {
  assert(obj !== null && typeof obj === 'object', 'Response must be object');
  
  const res = obj as Record<string, unknown>;
  
  assert(res.jsonrpc === '2.0', `Response jsonrpc must be "2.0", got "${res.jsonrpc}"`);
  validateId(res.id);
  
  const hasResult = Object.prototype.hasOwnProperty.call(res, 'result');
  const hasError = Object.prototype.hasOwnProperty.call(res, 'error');
  
  assert(
    hasResult !== hasError,
    'Response must have exactly one of "result" or "error"'
  );
  
  if (hasError) {
    validateErrorObj(res.error);
  }
}

/**
 * Check if response is success
 */
export function isSuccess(res: JsonRpcResponse): res is JsonRpcSuccess {
  return 'result' in res;
}

/**
 * Check if response is error
 */
export function isError(res: JsonRpcResponse): res is JsonRpcError {
  return 'error' in res;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENCODING - NDJSON (Newline Delimited JSON)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Encode request to NDJSON line - INV-IPC-03
 */
export function encodeRequest(req: JsonRpcRequest): string {
  validateRequest(req);
  return JSON.stringify(req) + '\n';
}

/**
 * Encode response to NDJSON line - INV-IPC-03
 */
export function encodeResponse(res: JsonRpcResponse): string {
  validateResponse(res);
  return JSON.stringify(res) + '\n';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECODING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Decode NDJSON line to response - INV-IPC-03
 */
export function decodeResponseLine(line: string): JsonRpcResponse {
  const trimmed = line.trim();
  assert(trimmed.length > 0, 'Empty line');
  
  let obj: unknown;
  try {
    obj = JSON.parse(trimmed);
  } catch (e) {
    throw new ProtocolError(`Invalid JSON: ${(e as Error).message}`, JSON_RPC_ERRORS.PARSE_ERROR);
  }
  
  validateResponse(obj);
  return obj;
}

/**
 * Decode NDJSON line to request - INV-IPC-03
 */
export function decodeRequestLine(line: string): JsonRpcRequest {
  const trimmed = line.trim();
  assert(trimmed.length > 0, 'Empty line');
  
  let obj: unknown;
  try {
    obj = JSON.parse(trimmed);
  } catch (e) {
    throw new ProtocolError(`Invalid JSON: ${(e as Error).message}`, JSON_RPC_ERRORS.PARSE_ERROR);
  }
  
  validateRequest(obj);
  return obj;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDSHAKE - INV-IPC-08
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse handshake message - INV-IPC-08
 * Format: JSON object with type, protocol_version, worker_id
 */
export function parseHandshake(line: string): HandshakeMessage | null {
  const trimmed = line.trim();
  
  // Legacy support: plain "READY" string
  if (trimmed === 'READY') {
    return {
      type: 'READY',
      protocol_version: PROTOCOL_VERSION,
      worker_id: 'unknown',
    };
  }
  
  // New format: JSON handshake
  try {
    const obj = JSON.parse(trimmed);
    if (obj && typeof obj === 'object' && obj.type === 'READY') {
      return {
        type: 'READY',
        protocol_version: obj.protocol_version || PROTOCOL_VERSION,
        worker_id: obj.worker_id || 'unknown',
        capabilities: obj.capabilities,
      };
    }
  } catch {
    // Not a handshake
  }
  
  return null;
}

/**
 * Validate protocol version match - INV-IPC-08
 */
export function validateProtocolVersion(version: string, expected: string): void {
  const [major1] = version.split('.');
  const [major2] = expected.split('.');
  
  if (major1 !== major2) {
    throw new ProtocolError(
      `Protocol version mismatch: worker=${version}, bridge=${expected}`,
      JSON_RPC_ERRORS.VERSION_MISMATCH
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a valid JSON-RPC request
 */
export function createRequest(
  id: JsonRpcId,
  method: string,
  params?: unknown,
  correlation_id?: string
): JsonRpcRequest {
  const req: JsonRpcRequest = {
    jsonrpc: '2.0',
    id,
    method,
    ...(params !== undefined ? { params } : {}),
    ...(correlation_id ? { _correlation_id: correlation_id } : {}),
    _timestamp_ms: Date.now(),
  };
  
  validateRequest(req);
  return req;
}

/**
 * Create a success response
 */
export function createSuccessResponse(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown
): JsonRpcError {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data !== undefined ? { data } : {}),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORRELATION ID GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

let correlationCounter = 0;

/**
 * Generate unique correlation ID for distributed tracing
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const counter = (++correlationCounter).toString(36).padStart(4, '0');
  const random = Math.random().toString(36).substring(2, 6);
  return `${timestamp}-${counter}-${random}`;
}

/**
 * Reset correlation counter (for testing)
 */
export function resetCorrelationCounter(): void {
  correlationCounter = 0;
}
