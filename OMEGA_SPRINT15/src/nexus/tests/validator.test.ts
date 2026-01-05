/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — VALIDATOR TESTS
 * Test suite for multi-layer validation (L1-L3)
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  validate,
  validateL1,
  validateL2,
  validateL3,
  formatValidationErrors,
  getPrimaryErrorCode,
} from '../validator';
import {
  NexusRequest,
  NexusErrorCode,
  MAX_PAYLOAD_SIZE,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';  // Fixed to be UUID v4

const VALID_ORACLE_REQUEST: NexusRequest = {
  request_id: VALID_UUID,
  session_id: VALID_UUID_2,
  caller_id: 'UI',
  module: 'ORACLE',
  action: 'analyze',
  payload: { text: 'Hello world' },
  timeout_ms: 15000,
};

const VALID_MUSE_REQUEST: NexusRequest = {
  request_id: VALID_UUID,
  session_id: VALID_UUID_2,
  caller_id: 'UI',
  module: 'MUSE',
  action: 'suggest',
  payload: { context: { text: 'Hello', snapshot: {} } },
  seed: 42,
  timeout_ms: 15000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: L1 - JSON invalide → reject
// ═══════════════════════════════════════════════════════════════════════════════

describe('L1 Validation - JSON Syntax', () => {
  it('should reject invalid JSON string', () => {
    const result = validateL1('{ invalid json }');
    expect(result.valid).toBe(false);
    expect(result.error?.layer).toBe('L1');
    expect(result.error?.code).toBe(NexusErrorCode.INVALID_JSON);
  });

  it('should accept valid JSON string', () => {
    const result = validateL1('{"key": "value"}');
    expect(result.valid).toBe(true);
    expect(result.parsed).toEqual({ key: 'value' });
  });

  it('should accept object directly', () => {
    const result = validateL1({ key: 'value' });
    expect(result.valid).toBe(true);
    expect(result.parsed).toEqual({ key: 'value' });
  });

  it('should reject primitive types', () => {
    expect(validateL1(123).valid).toBe(false);
    expect(validateL1(null).valid).toBe(false);
    expect(validateL1(undefined).valid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: L2 - Schema mismatch → reject
// ═══════════════════════════════════════════════════════════════════════════════

describe('L2 Validation - Schema', () => {
  it('should reject when request_id is missing', () => {
    const { request_id, ...noId } = VALID_ORACLE_REQUEST;
    const result = validateL2(noId);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('request_id'))).toBe(true);
  });

  it('should reject invalid module', () => {
    const result = validateL2({ ...VALID_ORACLE_REQUEST, module: 'INVALID' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path === 'module')).toBe(true);
  });

  it('should accept valid ORACLE request', () => {
    const result = validateL2(VALID_ORACLE_REQUEST);
    expect(result.valid).toBe(true);
    expect(result.request).toBeDefined();
  });

  it('should accept valid MUSE request', () => {
    const result = validateL2(VALID_MUSE_REQUEST);
    expect(result.valid).toBe(true);
    expect(result.request).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: L3 - Semantic validation - seed
// ═══════════════════════════════════════════════════════════════════════════════

describe('L3 Validation - Semantic (seed)', () => {
  it('should reject MUSE without seed', () => {
    const { seed, ...noSeed } = VALID_MUSE_REQUEST;
    const result = validateL3(noSeed as NexusRequest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path === 'seed')).toBe(true);
    expect(result.errors.some(e => e.code === NexusErrorCode.MISSING_REQUIRED)).toBe(true);
  });

  it('should accept MUSE with seed', () => {
    const result = validateL3(VALID_MUSE_REQUEST);
    // May have other errors but not seed
    const seedErrors = result.errors.filter(e => e.path === 'seed');
    expect(seedErrors.length).toBe(0);
  });

  it('should accept ORACLE without seed', () => {
    const result = validateL3(VALID_ORACLE_REQUEST);
    const seedErrors = result.errors.filter(e => e.path === 'seed');
    expect(seedErrors.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: L3 - Payload too large → reject
// ═══════════════════════════════════════════════════════════════════════════════

describe('L3 Validation - Payload size', () => {
  it('should reject payload > 2MB', () => {
    const largePayload = { text: 'x'.repeat(MAX_PAYLOAD_SIZE + 1000) };
    const request: NexusRequest = {
      ...VALID_ORACLE_REQUEST,
      payload: largePayload,
    };
    const result = validateL3(request);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === NexusErrorCode.PAYLOAD_TOO_LARGE)).toBe(true);
  });

  it('should accept payload < 2MB', () => {
    const smallPayload = { text: 'Hello world' };
    const request: NexusRequest = {
      ...VALID_ORACLE_REQUEST,
      payload: smallPayload,
    };
    const result = validateL3(request);
    const sizeErrors = result.errors.filter(e => e.code === NexusErrorCode.PAYLOAD_TOO_LARGE);
    expect(sizeErrors.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: L3 - Invalid action for module → reject
// ═══════════════════════════════════════════════════════════════════════════════

describe('L3 Validation - Action validity', () => {
  it('should reject invalid action for ORACLE', () => {
    const request: NexusRequest = {
      ...VALID_ORACLE_REQUEST,
      action: 'suggest',  // Invalid for ORACLE
    };
    const result = validateL3(request);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path === 'action')).toBe(true);
  });

  it('should reject invalid action for MUSE', () => {
    const request: NexusRequest = {
      ...VALID_MUSE_REQUEST,
      action: 'analyze',  // Invalid for MUSE
    };
    const result = validateL3(request);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path === 'action')).toBe(true);
  });

  it('should accept valid ORACLE action', () => {
    const result = validateL3(VALID_ORACLE_REQUEST);
    const actionErrors = result.errors.filter(e => e.path === 'action');
    expect(actionErrors.length).toBe(0);
  });

  it('should accept all valid MUSE actions', () => {
    for (const action of ['suggest', 'assess', 'project']) {
      const request: NexusRequest = { ...VALID_MUSE_REQUEST, action };
      const result = validateL3(request);
      const actionErrors = result.errors.filter(e => e.path === 'action');
      expect(actionErrors.length).toBe(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 6: L3 - ORACLE requires text in payload
// ═══════════════════════════════════════════════════════════════════════════════

describe('L3 Validation - ORACLE payload', () => {
  it('should reject ORACLE without text in payload', () => {
    const request: NexusRequest = {
      ...VALID_ORACLE_REQUEST,
      payload: { notText: 'hello' },
    };
    const result = validateL3(request);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === NexusErrorCode.INVALID_PAYLOAD)).toBe(true);
  });

  it('should accept ORACLE with text in payload', () => {
    const result = validateL3(VALID_ORACLE_REQUEST);
    const payloadErrors = result.errors.filter(e => e.code === NexusErrorCode.INVALID_PAYLOAD);
    expect(payloadErrors.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 7: L3 - MUSE requires context in payload
// ═══════════════════════════════════════════════════════════════════════════════

describe('L3 Validation - MUSE payload', () => {
  it('should reject MUSE without context in payload', () => {
    const request: NexusRequest = {
      ...VALID_MUSE_REQUEST,
      payload: { notContext: 'hello' },
    };
    const result = validateL3(request);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === NexusErrorCode.INVALID_PAYLOAD)).toBe(true);
  });

  it('should accept MUSE with context in payload', () => {
    const result = validateL3(VALID_MUSE_REQUEST);
    const payloadErrors = result.errors.filter(e => 
      e.code === NexusErrorCode.INVALID_PAYLOAD && e.message.includes('context')
    );
    expect(payloadErrors.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 8: Full validation success
// ═══════════════════════════════════════════════════════════════════════════════

describe('Full validation', () => {
  it('should pass complete validation for valid ORACLE request', () => {
    const result = validate(VALID_ORACLE_REQUEST);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.request).toBeDefined();
  });

  it('should pass complete validation for valid MUSE request', () => {
    const result = validate(VALID_MUSE_REQUEST);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.request).toBeDefined();
  });

  it('should fail early at L1 for invalid JSON', () => {
    const result = validate('not json');
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.layer).toBe('L1');
  });

  it('should fail at L2 for schema mismatch', () => {
    const result = validate({ invalid: 'structure' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.layer).toBe('L2');
  });

  it('should fail at L3 for semantic errors', () => {
    const { seed, ...noSeed } = VALID_MUSE_REQUEST;
    const result = validate(noSeed);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.layer === 'L3')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 9: Error formatting
// ═══════════════════════════════════════════════════════════════════════════════

describe('Error formatting', () => {
  it('should format validation errors clearly', () => {
    const errors = [
      { layer: 'L1' as const, path: '', message: 'Invalid JSON', code: NexusErrorCode.INVALID_JSON },
      { layer: 'L2' as const, path: 'module', message: 'Invalid module', code: NexusErrorCode.INVALID_SCHEMA },
    ];
    
    const formatted = formatValidationErrors(errors);
    expect(formatted).toContain('[L1]');
    expect(formatted).toContain('[L2]');
    expect(formatted).toContain('module:');
    expect(formatted).toContain('Invalid JSON');
  });

  it('should get primary error code', () => {
    const errors = [
      { layer: 'L2' as const, path: 'seed', message: 'Missing', code: NexusErrorCode.MISSING_REQUIRED },
      { layer: 'L3' as const, path: 'action', message: 'Invalid', code: NexusErrorCode.INVALID_SCHEMA },
    ];
    
    expect(getPrimaryErrorCode(errors)).toBe(NexusErrorCode.MISSING_REQUIRED);
  });

  it('should return default code for empty errors', () => {
    expect(getPrimaryErrorCode([])).toBe(NexusErrorCode.INVALID_SCHEMA);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 10: Edge cases
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge cases', () => {
  it('should handle empty payload', () => {
    const request: NexusRequest = {
      ...VALID_ORACLE_REQUEST,
      payload: {},
    };
    const result = validateL3(request);
    // Should fail because no text field
    expect(result.errors.some(e => e.code === NexusErrorCode.INVALID_PAYLOAD)).toBe(true);
  });

  it('should handle null payload', () => {
    const request: NexusRequest = {
      ...VALID_ORACLE_REQUEST,
      payload: null,
    };
    const result = validateL3(request);
    expect(result.errors.some(e => e.code === NexusErrorCode.INVALID_PAYLOAD)).toBe(true);
  });

  it('should handle PIPELINE module', () => {
    const request: NexusRequest = {
      request_id: VALID_UUID,
      session_id: VALID_UUID_2,
      caller_id: 'API',
      module: 'PIPELINE',
      action: 'run',
      payload: { file: 'test.txt' },
    };
    const result = validate(request);
    // PIPELINE doesn't have L3 payload requirements yet
    expect(result.valid).toBe(true);
  });
});
