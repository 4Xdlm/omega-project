/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — AUDIT TESTS
 * Test suite for traçabilité
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  computeHash,
  computeHashSync,
  createAuditEntry,
  createAuditSummary,
  validateAuditEntry,
  verifyAuditHash,
  freezeAuditEntry,
  isAuditFrozen,
  getNexusVersion,
  createDeterministicId,
} from '../audit';
import {
  NexusRequest,
  NexusResponse,
  AuditEntry,
  AuditSummary,
  NexusErrorCode,
  NEXUS_VERSION,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const MOCK_REQUEST: NexusRequest = {
  request_id: VALID_UUID,
  session_id: VALID_UUID_2,
  caller_id: 'UI',
  module: 'ORACLE',
  action: 'analyze',
  payload: { text: 'Test text' },
  seed: 42,
};

const MOCK_AUDIT_SUMMARY: AuditSummary = {
  input_hash: 'a'.repeat(64),
  output_hash: 'b'.repeat(64),
  route: 'ORACLE.analyze',
  duration_ms: 150,
  timestamp: '2026-01-05T00:00:00.000Z',
  module_version: '3.14.0',
};

const MOCK_RESPONSE: NexusResponse<{ result: string }> = {
  request_id: VALID_UUID,
  response_id: VALID_UUID_2,
  success: true,
  data: { result: 'ok' },
  audit: MOCK_AUDIT_SUMMARY,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: Input hash computation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Hash computation', () => {
  it('should compute input hash', () => {
    const hash = computeHashSync({ text: 'hello' });
    
    expect(hash).toBeDefined();
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/i.test(hash)).toBe(true);
  });

  it('should compute async hash', async () => {
    const hash = await computeHash({ text: 'hello' });
    
    expect(hash).toBeDefined();
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/i.test(hash)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: Output hash computation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Output hash', () => {
  it('should compute different hash for different data', () => {
    const hash1 = computeHashSync({ result: 'a' });
    const hash2 = computeHashSync({ result: 'b' });
    
    expect(hash1).not.toBe(hash2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: Hash determinism
// ═══════════════════════════════════════════════════════════════════════════════

describe('Hash determinism', () => {
  it('should produce same hash for same input', () => {
    const data = { text: 'test', value: 42 };
    
    const hash1 = computeHashSync(data);
    const hash2 = computeHashSync(data);
    
    expect(hash1).toBe(hash2);
  });

  it('should produce same hash regardless of key order', () => {
    const data1 = { a: 1, b: 2 };
    const data2 = { b: 2, a: 1 };
    
    const hash1 = computeHashSync(data1);
    const hash2 = computeHashSync(data2);
    
    expect(hash1).toBe(hash2);
  });

  it('should handle nested objects deterministically', () => {
    const data1 = { outer: { inner: { value: 1 } } };
    const data2 = { outer: { inner: { value: 1 } } };
    
    expect(computeHashSync(data1)).toBe(computeHashSync(data2));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: Audit entry structure
// ═══════════════════════════════════════════════════════════════════════════════

describe('Audit entry creation', () => {
  it('should create valid audit entry', () => {
    const entry = createAuditEntry(MOCK_REQUEST, MOCK_RESPONSE, '3.14.0');
    
    expect(entry.request_id).toBe(VALID_UUID);
    expect(entry.response_id).toBe(VALID_UUID_2);
    expect(entry.session_id).toBe(VALID_UUID_2);
    expect(entry.caller_id).toBe('UI');
    expect(entry.route).toBe('ORACLE.analyze');
    expect(entry.success).toBe(true);
    expect(entry.seed).toBe(42);
    expect(entry.module_version).toBe('3.14.0');
  });

  it('should include hashes', () => {
    const entry = createAuditEntry(MOCK_REQUEST, MOCK_RESPONSE, '3.14.0');
    
    expect(entry.input_hash).toHaveLength(64);
    expect(entry.output_hash).toHaveLength(64);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: Audit entry validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Audit entry validation', () => {
  it('should validate correct entry', () => {
    const entry: AuditEntry = {
      input_hash: 'a'.repeat(64),
      output_hash: 'b'.repeat(64),
      route: 'ORACLE.analyze',
      duration_ms: 150,
      timestamp: '2026-01-05T00:00:00.000Z',
      module_version: '3.14.0',
      request_id: VALID_UUID,
      response_id: VALID_UUID_2,
      session_id: VALID_UUID,
      caller_id: 'UI',
      success: true,
    };
    
    const result = validateAuditEntry(entry);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid hash length', () => {
    const entry: AuditEntry = {
      input_hash: 'short',
      output_hash: 'b'.repeat(64),
      route: 'ORACLE.analyze',
      duration_ms: 150,
      timestamp: '2026-01-05T00:00:00.000Z',
      module_version: '3.14.0',
      request_id: VALID_UUID,
      response_id: VALID_UUID_2,
      session_id: VALID_UUID,
      caller_id: 'UI',
      success: true,
    };
    
    const result = validateAuditEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('input_hash'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 6: Duration tracking
// ═══════════════════════════════════════════════════════════════════════════════

describe('Duration tracking', () => {
  it('should include duration in audit summary', () => {
    const summary = createAuditSummary(MOCK_REQUEST, { result: 'ok' }, 250, '3.14.0');
    
    expect(summary.duration_ms).toBe(250);
  });

  it('should reject negative duration', () => {
    const entry: AuditEntry = {
      ...createAuditEntry(MOCK_REQUEST, MOCK_RESPONSE, '3.14.0'),
      duration_ms: -10,
    };
    
    const result = validateAuditEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('duration'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 7: Timestamp ISO format
// ═══════════════════════════════════════════════════════════════════════════════

describe('Timestamp format', () => {
  it('should create valid ISO timestamp', () => {
    const summary = createAuditSummary(MOCK_REQUEST, { result: 'ok' }, 100, '3.14.0');
    
    const date = new Date(summary.timestamp);
    expect(isNaN(date.getTime())).toBe(false);
  });

  it('should reject invalid timestamp', () => {
    const entry: AuditEntry = {
      ...createAuditEntry(MOCK_REQUEST, MOCK_RESPONSE, '3.14.0'),
      timestamp: 'not-a-date',
    };
    
    const result = validateAuditEntry(entry);
    expect(result.valid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 8: Module version capture
// ═══════════════════════════════════════════════════════════════════════════════

describe('Module version', () => {
  it('should capture module version', () => {
    const entry = createAuditEntry(MOCK_REQUEST, MOCK_RESPONSE, '3.14.0');
    expect(entry.module_version).toBe('3.14.0');
  });

  it('should return NEXUS version', () => {
    expect(getNexusVersion()).toBe(NEXUS_VERSION);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 9: Route capture
// ═══════════════════════════════════════════════════════════════════════════════

describe('Route capture', () => {
  it('should capture route in format MODULE.action', () => {
    const entry = createAuditEntry(MOCK_REQUEST, MOCK_RESPONSE, '3.14.0');
    expect(entry.route).toBe('ORACLE.analyze');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 10: Audit immutability
// ═══════════════════════════════════════════════════════════════════════════════

describe('Audit immutability', () => {
  it('should freeze audit entry', () => {
    const entry = createAuditEntry(MOCK_REQUEST, MOCK_RESPONSE, '3.14.0');
    const frozen = freezeAuditEntry(entry);
    
    expect(isAuditFrozen(frozen)).toBe(true);
    expect(() => {
      (frozen as any).success = false;
    }).toThrow();
  });

  it('should detect unfrozen entry', () => {
    const entry = createAuditEntry(MOCK_REQUEST, MOCK_RESPONSE, '3.14.0');
    expect(isAuditFrozen(entry)).toBe(false);
  });

  it('should verify hash integrity', () => {
    const entry = createAuditEntry(MOCK_REQUEST, MOCK_RESPONSE, '3.14.0');
    const result = verifyAuditHash(entry, MOCK_REQUEST, MOCK_RESPONSE.data);
    
    expect(result.valid).toBe(true);
  });

  it('should detect hash mismatch', () => {
    const entry = createAuditEntry(MOCK_REQUEST, MOCK_RESPONSE, '3.14.0');
    const result = verifyAuditHash(entry, { ...MOCK_REQUEST, seed: 999 }, MOCK_RESPONSE.data);
    
    expect(result.valid).toBe(false);
    expect(result.mismatch).toBe('input');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: Deterministic ID generation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Deterministic ID', () => {
  it('should create UUID-like ID', () => {
    const id = createDeterministicId(42, 0);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should be deterministic', () => {
    const id1 = createDeterministicId(42, 0);
    const id2 = createDeterministicId(42, 0);
    expect(id1).toBe(id2);
  });

  it('should differ for different seeds', () => {
    const id1 = createDeterministicId(42, 0);
    const id2 = createDeterministicId(43, 0);
    expect(id1).not.toBe(id2);
  });
});
