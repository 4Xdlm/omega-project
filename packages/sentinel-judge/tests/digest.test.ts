/**
 * OMEGA Phase C — Digest Tests
 * 
 * Version: 1.0.0
 * Date: 2026-01-26
 * 
 * Test Requirements:
 * - Volatile field change → hash IDENTICAL
 * - Structural field change → hash DIFFERENT
 * - Deterministic hashing
 */

import { describe, it, expect } from 'vitest';
import {
  stripVolatileFields,
  stripDecisionRequestVolatile,
  stripJudgementVolatile,
  computeSha256,
  computeDigest,
  computeDecisionRequestDigest,
  computeJudgementDigest,
  verifyDigest,
  computePayloadHash,
  DECISION_REQUEST_VOLATILE_FIELDS,
  JUDGEMENT_VOLATILE_FIELDS,
} from '../src/index.js';

describe('stripVolatileFields', () => {
  it('removes specified fields from object', () => {
    const input = { a: 1, b: 2, c: 3 };
    const result = stripVolatileFields(input, ['b']);
    
    expect(result).toEqual({ a: 1, c: 3 });
    expect('b' in result).toBe(false);
  });

  it('removes multiple fields', () => {
    const input = { a: 1, b: 2, c: 3, d: 4 };
    const result = stripVolatileFields(input, ['b', 'd']);
    
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it('handles nested objects', () => {
    const input = {
      outer: { a: 1, volatile: 'remove' },
      keep: 'this',
    };
    const result = stripVolatileFields(input, ['volatile']);
    
    expect(result).toEqual({
      outer: { a: 1 },
      keep: 'this',
    });
  });

  it('does not mutate original object', () => {
    const input = { a: 1, b: 2 };
    const original = { ...input };
    stripVolatileFields(input, ['b']);
    
    expect(input).toEqual(original);
  });

  it('handles empty fields array', () => {
    const input = { a: 1, b: 2 };
    const result = stripVolatileFields(input, []);
    
    expect(result).toEqual(input);
  });

  it('handles arrays in objects', () => {
    const input = {
      arr: [{ a: 1, volatile: 'x' }, { b: 2, volatile: 'y' }],
    };
    const result = stripVolatileFields(input, ['volatile']);
    
    expect(result).toEqual({
      arr: [{ a: 1 }, { b: 2 }],
    });
  });
});

describe('stripDecisionRequestVolatile', () => {
  it('removes submittedAt field', () => {
    const request = {
      traceId: 'C-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      submittedBy: 'TEST',
      submittedAt: '2026-01-26T14:30:22Z',
      claim: { type: 'CUSTOM', payload: {}, payloadHash: 'abc' },
    };
    
    const result = stripDecisionRequestVolatile(request);
    
    expect('submittedAt' in result).toBe(false);
    expect(result.traceId).toBe(request.traceId);
    expect(result.submittedBy).toBe(request.submittedBy);
  });
});

describe('stripJudgementVolatile', () => {
  it('removes executedAt, executionDurationMs, and judgementHash', () => {
    const judgement = {
      judgementId: 'J-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      verdict: 'ACCEPT',
      executedAt: '2026-01-26T14:30:22Z',
      executionDurationMs: 150,
      judgementHash: 'abc123',
      reasons: [],
    };
    
    const result = stripJudgementVolatile(judgement);
    
    expect('executedAt' in result).toBe(false);
    expect('executionDurationMs' in result).toBe(false);
    expect('judgementHash' in result).toBe(false);
    expect(result.judgementId).toBe(judgement.judgementId);
    expect(result.verdict).toBe(judgement.verdict);
  });
});

describe('computeSha256', () => {
  it('computes correct SHA-256 hash', () => {
    // Known test vector
    const result = computeSha256('hello');
    expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('returns lowercase hex string', () => {
    const result = computeSha256('test');
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic', () => {
    const input = 'determinism test';
    const results = Array.from({ length: 10 }, () => computeSha256(input));
    
    expect(results.every(r => r === results[0])).toBe(true);
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = computeSha256('input1');
    const hash2 = computeSha256('input2');
    
    expect(hash1).not.toBe(hash2);
  });
});

describe('computeDigest', () => {
  it('produces same hash regardless of key order', () => {
    const obj1 = { z: 1, a: 2, m: 3 };
    const obj2 = { a: 2, m: 3, z: 1 };
    
    const hash1 = computeDigest(obj1);
    const hash2 = computeDigest(obj2);
    
    expect(hash1).toBe(hash2);
  });

  it('excludes volatile fields from hash', () => {
    const obj1 = { data: 'test', volatile: 'value1' };
    const obj2 = { data: 'test', volatile: 'value2' };
    
    const hash1 = computeDigest(obj1, ['volatile']);
    const hash2 = computeDigest(obj2, ['volatile']);
    
    expect(hash1).toBe(hash2);
  });

  it('produces different hash when structural field changes', () => {
    const obj1 = { data: 'test1' };
    const obj2 = { data: 'test2' };
    
    const hash1 = computeDigest(obj1);
    const hash2 = computeDigest(obj2);
    
    expect(hash1).not.toBe(hash2);
  });
});

describe('computeDecisionRequestDigest', () => {
  it('ignores submittedAt changes', () => {
    const request1 = {
      traceId: 'C-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      submittedBy: 'TEST',
      submittedAt: '2026-01-26T14:30:22Z',
      claim: { type: 'CUSTOM', payload: { x: 1 }, payloadHash: 'abc' },
    };
    
    const request2 = {
      ...request1,
      submittedAt: '2026-01-27T10:00:00Z', // Different time
    };
    
    const hash1 = computeDecisionRequestDigest(request1);
    const hash2 = computeDecisionRequestDigest(request2);
    
    expect(hash1).toBe(hash2);
  });

  it('detects structural changes', () => {
    const request1 = {
      traceId: 'C-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      submittedBy: 'TEST',
      submittedAt: '2026-01-26T14:30:22Z',
      claim: { type: 'CUSTOM', payload: { x: 1 }, payloadHash: 'abc' },
    };
    
    const request2 = {
      ...request1,
      submittedBy: 'OTHER', // Structural change
    };
    
    const hash1 = computeDecisionRequestDigest(request1);
    const hash2 = computeDecisionRequestDigest(request2);
    
    expect(hash1).not.toBe(hash2);
  });
});

describe('computeJudgementDigest', () => {
  it('ignores executedAt and executionDurationMs changes', () => {
    const judgement1 = {
      judgementId: 'J-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      traceId: 'C-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      verdict: 'ACCEPT',
      reasons: [{ code: 'RC-001', severity: 'MINOR' }],
      requiredActions: [],
      evidenceRefs: ['abc123'],
      prevJudgementHash: 'GENESIS',
      judgementHash: 'will-be-excluded',
      executedAt: '2026-01-26T14:30:22Z',
      executionDurationMs: 100,
    };
    
    const judgement2 = {
      ...judgement1,
      executedAt: '2026-01-27T10:00:00Z',
      executionDurationMs: 500,
      judgementHash: 'different-hash',
    };
    
    const hash1 = computeJudgementDigest(judgement1);
    const hash2 = computeJudgementDigest(judgement2);
    
    expect(hash1).toBe(hash2);
  });

  it('detects verdict changes', () => {
    const judgement1 = {
      judgementId: 'J-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      verdict: 'ACCEPT',
      executedAt: '2026-01-26T14:30:22Z',
      executionDurationMs: 100,
      judgementHash: 'x',
    };
    
    const judgement2 = {
      ...judgement1,
      verdict: 'REJECT',
    };
    
    const hash1 = computeJudgementDigest(judgement1);
    const hash2 = computeJudgementDigest(judgement2);
    
    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyDigest', () => {
  it('returns true for matching digest', () => {
    const obj = { data: 'test' };
    const hash = computeDigest(obj);
    
    expect(verifyDigest(obj, hash)).toBe(true);
  });

  it('returns false for non-matching digest', () => {
    const obj = { data: 'test' };
    
    expect(verifyDigest(obj, 'wrong-hash')).toBe(false);
  });

  it('handles case-insensitive hash comparison', () => {
    const obj = { data: 'test' };
    const hash = computeDigest(obj);
    
    expect(verifyDigest(obj, hash.toUpperCase())).toBe(true);
  });
});

describe('computePayloadHash', () => {
  it('computes hash of canonical JSON payload', () => {
    const payload = { b: 2, a: 1 };
    const hash = computePayloadHash(payload);
    
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces same hash for same content different key order', () => {
    const payload1 = { z: 1, a: 2 };
    const payload2 = { a: 2, z: 1 };
    
    expect(computePayloadHash(payload1)).toBe(computePayloadHash(payload2));
  });
});
