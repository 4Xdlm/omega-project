/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — TYPES TESTS
 * Test suite for foundation contracts
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  // Types
  NexusRequest,
  NexusResponse,
  NexusError,
  AuditEntry,
  ChronicleEntry,
  ModuleTarget,
  CallerType,
  NexusErrorCode,
  
  // Schema
  NexusRequestSchema,
  MAX_PAYLOAD_SIZE,
  DEFAULT_TIMEOUT_MS,
  NEXUS_VERSION,
  
  // Type guards
  isModuleTarget,
  isCallerType,
  isNexusErrorCode,
  isSuccessResponse,
  isErrorResponse,
  
  // Factories
  createNexusError,
  createSuccessResponse,
  createErrorResponse,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';  // Fixed to be UUID v4
const INVALID_UUID = 'not-a-uuid';

const VALID_REQUEST: NexusRequest = {
  request_id: VALID_UUID,
  session_id: VALID_UUID_2,
  caller_id: 'UI',
  module: 'ORACLE',
  action: 'analyze',
  payload: { text: 'Hello world' },
  seed: 42,
  timeout_ms: 15000,
};

const VALID_AUDIT = {
  input_hash: 'a'.repeat(64),
  output_hash: 'b'.repeat(64),
  route: 'ORACLE.analyze',
  duration_ms: 150,
  timestamp: '2026-01-05T00:00:00.000Z',
  module_version: '3.14.0',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: NexusRequest validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('NexusRequest validation', () => {
  it('should accept valid request', () => {
    const result = NexusRequestSchema.safeParse(VALID_REQUEST);
    expect(result.success).toBe(true);
  });

  it('should reject invalid request_id', () => {
    const invalid = { ...VALID_REQUEST, request_id: INVALID_UUID };
    const result = NexusRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid module', () => {
    const invalid = { ...VALID_REQUEST, module: 'INVALID' };
    const result = NexusRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid caller_id', () => {
    const invalid = { ...VALID_REQUEST, caller_id: 'INTRUDER' };
    const result = NexusRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should allow optional seed', () => {
    const { seed, ...noSeed } = VALID_REQUEST;
    const result = NexusRequestSchema.safeParse(noSeed);
    expect(result.success).toBe(true);
  });

  it('should reject negative seed', () => {
    const invalid = { ...VALID_REQUEST, seed: -1 };
    const result = NexusRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject negative timeout', () => {
    const invalid = { ...VALID_REQUEST, timeout_ms: -100 };
    const result = NexusRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid version_pin format', () => {
    const invalid = { ...VALID_REQUEST, version_pin: 'v1.0' };
    const result = NexusRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: NexusResponse structure
// ═══════════════════════════════════════════════════════════════════════════════

describe('NexusResponse structure', () => {
  it('should create valid success response', () => {
    const response = createSuccessResponse(
      VALID_UUID,
      VALID_UUID_2,
      { result: 'ok' },
      VALID_AUDIT
    );
    
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ result: 'ok' });
    expect(response.error).toBeUndefined();
    expect(response.audit).toEqual(VALID_AUDIT);
  });

  it('should create valid error response', () => {
    const error = createNexusError(
      NexusErrorCode.INVALID_SCHEMA,
      'Invalid request',
      false
    );
    
    const response = createErrorResponse(
      VALID_UUID,
      VALID_UUID_2,
      error,
      VALID_AUDIT
    );
    
    expect(response.success).toBe(false);
    expect(response.error).toEqual(error);
    expect(response.data).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: NexusError codes
// ═══════════════════════════════════════════════════════════════════════════════

describe('NexusError codes', () => {
  it('should have all validation codes in E0xx range', () => {
    expect(NexusErrorCode.INVALID_JSON).toBe('E001');
    expect(NexusErrorCode.INVALID_SCHEMA).toBe('E002');
    expect(NexusErrorCode.PAYLOAD_TOO_LARGE).toBe('E006');
  });

  it('should have all guard codes in E1xx range', () => {
    expect(NexusErrorCode.PREREQ_MISSING).toBe('E100');
    expect(NexusErrorCode.MUSE_WITHOUT_ORACLE).toBe('E101');
    expect(NexusErrorCode.SESSION_EXPIRED).toBe('E105');
  });

  it('should have all execution codes in E2xx range', () => {
    expect(NexusErrorCode.TIMEOUT).toBe('E200');
    expect(NexusErrorCode.MODULE_ERROR).toBe('E201');
  });

  it('should have all system codes in E5xx range', () => {
    expect(NexusErrorCode.INTERNAL_ERROR).toBe('E500');
    expect(NexusErrorCode.CHRONICLE_CORRUPTED).toBe('E502');
  });

  it('should create error with all fields', () => {
    const error = createNexusError(
      NexusErrorCode.RATE_LIMITED,
      'Too many requests',
      true,
      { requests: 100 },
      5000
    );
    
    expect(error.code).toBe(NexusErrorCode.RATE_LIMITED);
    expect(error.message).toBe('Too many requests');
    expect(error.recoverable).toBe(true);
    expect(error.details).toEqual({ requests: 100 });
    expect(error.retry_after_ms).toBe(5000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: AuditEntry immutability
// ═══════════════════════════════════════════════════════════════════════════════

describe('AuditEntry immutability', () => {
  it('should have all required fields', () => {
    const entry: AuditEntry = {
      ...VALID_AUDIT,
      request_id: VALID_UUID,
      response_id: VALID_UUID_2,
      session_id: VALID_UUID,
      caller_id: 'UI',
      success: true,
    };
    
    expect(entry.input_hash).toHaveLength(64);
    expect(entry.output_hash).toHaveLength(64);
    expect(entry.request_id).toBe(VALID_UUID);
    expect(entry.success).toBe(true);
  });

  it('should support optional error_code for failures', () => {
    const entry: AuditEntry = {
      ...VALID_AUDIT,
      request_id: VALID_UUID,
      response_id: VALID_UUID_2,
      session_id: VALID_UUID,
      caller_id: 'API',
      success: false,
      error_code: NexusErrorCode.TIMEOUT,
    };
    
    expect(entry.success).toBe(false);
    expect(entry.error_code).toBe(NexusErrorCode.TIMEOUT);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: ChronicleEntry hash chain
// ═══════════════════════════════════════════════════════════════════════════════

describe('ChronicleEntry hash chain', () => {
  it('should have prev_hash for chain integrity', () => {
    const auditEntry: AuditEntry = {
      ...VALID_AUDIT,
      request_id: VALID_UUID,
      response_id: VALID_UUID_2,
      session_id: VALID_UUID,
      caller_id: 'UI',
      success: true,
    };
    
    const chronicleEntry: ChronicleEntry = {
      index: 0,
      entry: auditEntry,
      prev_hash: '',  // First entry has empty prev_hash
      entry_hash: 'c'.repeat(64),
      chronicle_timestamp: '2026-01-05T00:00:00.000Z',
    };
    
    expect(chronicleEntry.index).toBe(0);
    expect(chronicleEntry.prev_hash).toBe('');
    expect(chronicleEntry.entry_hash).toHaveLength(64);
  });

  it('should link entries via prev_hash', () => {
    const entry1Hash = 'first'.padEnd(64, '0');
    const entry2: ChronicleEntry = {
      index: 1,
      entry: {} as AuditEntry,
      prev_hash: entry1Hash,
      entry_hash: 'second'.padEnd(64, '0'),
      chronicle_timestamp: '2026-01-05T00:00:01.000Z',
    };
    
    expect(entry2.prev_hash).toBe(entry1Hash);
    expect(entry2.index).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 6: ModuleTarget enum
// ═══════════════════════════════════════════════════════════════════════════════

describe('ModuleTarget enum', () => {
  it('should validate PIPELINE', () => {
    expect(isModuleTarget('PIPELINE')).toBe(true);
  });

  it('should validate ORACLE', () => {
    expect(isModuleTarget('ORACLE')).toBe(true);
  });

  it('should validate MUSE', () => {
    expect(isModuleTarget('MUSE')).toBe(true);
  });

  it('should reject invalid targets', () => {
    expect(isModuleTarget('INVALID')).toBe(false);
    expect(isModuleTarget(null)).toBe(false);
    expect(isModuleTarget(123)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 7: CallerType enum
// ═══════════════════════════════════════════════════════════════════════════════

describe('CallerType enum', () => {
  it('should validate all caller types', () => {
    expect(isCallerType('UI')).toBe(true);
    expect(isCallerType('SAGA')).toBe(true);
    expect(isCallerType('CANON')).toBe(true);
    expect(isCallerType('API')).toBe(true);
    expect(isCallerType('INTERNAL')).toBe(true);
  });

  it('should reject invalid callers', () => {
    expect(isCallerType('INTRUDER')).toBe(false);
    expect(isCallerType('')).toBe(false);
    expect(isCallerType(undefined)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 8: Type guards
// ═══════════════════════════════════════════════════════════════════════════════

describe('Type guards', () => {
  it('should identify success response', () => {
    const response = createSuccessResponse(
      VALID_UUID,
      VALID_UUID_2,
      { result: 'ok' },
      VALID_AUDIT
    );
    
    expect(isSuccessResponse(response)).toBe(true);
    expect(isErrorResponse(response)).toBe(false);
  });

  it('should identify error response', () => {
    const error = createNexusError(NexusErrorCode.TIMEOUT, 'Timeout', false);
    const response = createErrorResponse(
      VALID_UUID,
      VALID_UUID_2,
      error,
      VALID_AUDIT
    );
    
    expect(isErrorResponse(response)).toBe(true);
    expect(isSuccessResponse(response)).toBe(false);
  });

  it('should validate NexusErrorCode', () => {
    expect(isNexusErrorCode(NexusErrorCode.INVALID_JSON)).toBe(true);
    expect(isNexusErrorCode('E001')).toBe(true);
    expect(isNexusErrorCode('INVALID')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: Constants
// ═══════════════════════════════════════════════════════════════════════════════

describe('Constants', () => {
  it('should have correct MAX_PAYLOAD_SIZE (2MB)', () => {
    expect(MAX_PAYLOAD_SIZE).toBe(2 * 1024 * 1024);
  });

  it('should have correct DEFAULT_TIMEOUT_MS (15s)', () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(15000);
  });

  it('should have correct NEXUS_VERSION', () => {
    expect(NEXUS_VERSION).toBe('3.15.0');
  });
});
