/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Protocol Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Test coverage for INV-IPC-03 (JSON-RPC 2.0 strict validation)
 * 
 * Total: 10 tests
 * 
 * @module protocol.test
 * @version 3.14.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateId,
  validateRequest,
  validateResponse,
  validateErrorObj,
  encodeRequest,
  decodeResponseLine,
  parseHandshake,
  validateProtocolVersion,
  createRequest,
  generateCorrelationId,
  resetCorrelationCounter,
  ProtocolError,
  isSuccess,
  isError
} from '../protocol.js';
import { PROTOCOL_VERSION } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: ID Validation (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('ID Validation - INV-IPC-03', () => {
  it('accepts valid integer IDs >= 1', () => {
    expect(() => validateId(1)).not.toThrow();
    expect(() => validateId(100)).not.toThrow();
    expect(() => validateId(999999)).not.toThrow();
  });
  
  it('rejects invalid IDs', () => {
    expect(() => validateId(0)).toThrow();
    expect(() => validateId(-1)).toThrow();
    expect(() => validateId(1.5)).toThrow();
    expect(() => validateId('1')).toThrow();
    expect(() => validateId(null)).toThrow();
    expect(() => validateId(undefined)).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Request Validation (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Request Validation - INV-IPC-03', () => {
  it('accepts valid request', () => {
    const req = { jsonrpc: '2.0', id: 1, method: 'test' };
    expect(() => validateRequest(req)).not.toThrow();
    
    const reqWithParams = { jsonrpc: '2.0', id: 2, method: 'test', params: { a: 1 } };
    expect(() => validateRequest(reqWithParams)).not.toThrow();
  });
  
  it('rejects invalid requests', () => {
    expect(() => validateRequest(null)).toThrow();
    expect(() => validateRequest({ jsonrpc: '1.0', id: 1, method: 'x' })).toThrow();
    expect(() => validateRequest({ jsonrpc: '2.0', id: 1, method: '' })).toThrow();
    expect(() => validateRequest({ jsonrpc: '2.0', id: 1 })).toThrow(); // no method
    expect(() => validateRequest({ jsonrpc: '2.0', method: 'x' })).toThrow(); // no id
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Response Validation (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Response Validation - INV-IPC-03', () => {
  it('accepts valid success and error responses', () => {
    const success = { jsonrpc: '2.0', id: 1, result: { data: 'ok' } };
    expect(() => validateResponse(success)).not.toThrow();
    expect(isSuccess(success)).toBe(true);
    
    const error = { jsonrpc: '2.0', id: 2, error: { code: -32600, message: 'Error' } };
    expect(() => validateResponse(error)).not.toThrow();
    expect(isError(error)).toBe(true);
  });
  
  it('rejects invalid responses', () => {
    // Both result and error
    expect(() => validateResponse({ 
      jsonrpc: '2.0', id: 1, result: {}, error: { code: 1, message: 'x' } 
    })).toThrow();
    
    // Neither result nor error
    expect(() => validateResponse({ jsonrpc: '2.0', id: 1 })).toThrow();
    
    // Invalid error object
    expect(() => validateResponse({ 
      jsonrpc: '2.0', id: 1, error: { code: 'x', message: 'y' } 
    })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Encoding/Decoding (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Encoding/Decoding - INV-IPC-03', () => {
  it('encodeRequest produces valid NDJSON', () => {
    const req = { jsonrpc: '2.0' as const, id: 1, method: 'test' };
    const encoded = encodeRequest(req);
    
    expect(encoded).toMatch(/^\{.*\}\n$/);
    expect(encoded.endsWith('\n')).toBe(true);
    
    const parsed = JSON.parse(encoded.trim());
    expect(parsed.jsonrpc).toBe('2.0');
    expect(parsed.id).toBe(1);
    expect(parsed.method).toBe('test');
  });
  
  it('decodeResponseLine parses valid response', () => {
    const line = '{"jsonrpc":"2.0","id":1,"result":{"ok":true}}';
    const response = decodeResponseLine(line);
    
    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(1);
    expect('result' in response).toBe(true);
    
    // Invalid JSON throws
    expect(() => decodeResponseLine('not json')).toThrow(ProtocolError);
    expect(() => decodeResponseLine('')).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Handshake - INV-IPC-08 (1 test)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Handshake - INV-IPC-08', () => {
  it('parseHandshake handles all formats', () => {
    // Legacy plain READY
    const legacy = parseHandshake('READY');
    expect(legacy?.type).toBe('READY');
    expect(legacy?.protocol_version).toBe(PROTOCOL_VERSION);
    
    // JSON handshake
    const json = parseHandshake('{"type":"READY","protocol_version":"1.0.0","worker_id":"abc"}');
    expect(json?.type).toBe('READY');
    expect(json?.protocol_version).toBe('1.0.0');
    expect(json?.worker_id).toBe('abc');
    
    // Not a handshake
    expect(parseHandshake('{"jsonrpc":"2.0","id":1,"result":{}}')).toBeNull();
    
    // Version validation
    expect(() => validateProtocolVersion('1.0.0', '1.0.0')).not.toThrow();
    expect(() => validateProtocolVersion('1.1.0', '1.0.0')).not.toThrow(); // same major
    expect(() => validateProtocolVersion('2.0.0', '1.0.0')).toThrow(); // different major
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Helpers (1 test)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Helpers', () => {
  beforeEach(() => {
    resetCorrelationCounter();
  });
  
  it('createRequest and generateCorrelationId work correctly', () => {
    const req = createRequest(1, 'test', { a: 1 });
    expect(req.jsonrpc).toBe('2.0');
    expect(req.id).toBe(1);
    expect(req.method).toBe('test');
    expect(req.params).toEqual({ a: 1 });
    expect(req._timestamp_ms).toBeDefined();
    
    const corr1 = generateCorrelationId();
    const corr2 = generateCorrelationId();
    expect(corr1).not.toBe(corr2);
    expect(corr1.length).toBeGreaterThan(10);
  });
});
