/**
 * OMEGA Memory System - Hash Tests
 * Phase D2 - NASA-Grade L4
 *
 * Tests for deterministic hashing.
 * INV-D2-03: Hash deterministic = canonical JSON + SHA-256
 */

import { describe, it, expect } from 'vitest';
import {
  sha256Hex,
  canonicalJSON,
  stableJSON,
  computeEntryHash,
  verifyEntryHash,
} from '../../src/memory/hash.js';
import { toEntryId, toTimestamp, toHashValue } from '../../src/memory/types.js';
import type { MemoryEntry, HashValue } from '../../src/memory/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SHA-256 TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('sha256Hex', () => {
  it('computes correct SHA-256 for known input', () => {
    // Well-known test vector
    const hash = sha256Hex('hello');
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('produces 64-character hex string', () => {
    const hash = sha256Hex('test');
    expect(hash.length).toBe(64);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });

  it('is deterministic - same input produces same hash', () => {
    const input = 'deterministic test';
    const hash1 = sha256Hex(input);
    const hash2 = sha256Hex(input);
    const hash3 = sha256Hex(input);
    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it('different inputs produce different hashes', () => {
    const hash1 = sha256Hex('input1');
    const hash2 = sha256Hex('input2');
    expect(hash1).not.toBe(hash2);
  });

  it('handles empty string', () => {
    const hash = sha256Hex('');
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('handles Buffer input', () => {
    const buffer = Buffer.from('hello');
    const hashFromBuffer = sha256Hex(buffer);
    const hashFromString = sha256Hex('hello');
    expect(hashFromBuffer).toBe(hashFromString);
  });

  it('handles Unicode correctly', () => {
    const hash = sha256Hex('Hello, 世界! 🌍');
    expect(hash.length).toBe(64);
    // Same input should always produce same hash
    expect(sha256Hex('Hello, 世界! 🌍')).toBe(hash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL JSON TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('canonicalJSON', () => {
  it('sorts object keys alphabetically', () => {
    const obj = { z: 1, a: 2, m: 3 };
    const json = canonicalJSON(obj);
    expect(json).toBe('{"a":2,"m":3,"z":1}');
  });

  it('sorts nested object keys', () => {
    const obj = { outer: { z: 1, a: 2 }, inner: { b: 3 } };
    const json = canonicalJSON(obj);
    expect(json).toBe('{"inner":{"b":3},"outer":{"a":2,"z":1}}');
  });

  it('preserves array order', () => {
    const obj = { arr: [3, 1, 2] };
    const json = canonicalJSON(obj);
    expect(json).toBe('{"arr":[3,1,2]}');
  });

  it('handles null', () => {
    expect(canonicalJSON(null)).toBe('null');
    expect(canonicalJSON({ a: null })).toBe('{"a":null}');
  });

  it('handles primitives', () => {
    expect(canonicalJSON(42)).toBe('42');
    expect(canonicalJSON('string')).toBe('"string"');
    expect(canonicalJSON(true)).toBe('true');
  });

  it('is deterministic - same input produces same output', () => {
    const obj = { b: 1, a: 2, nested: { z: 3, y: 4 } };
    const json1 = canonicalJSON(obj);
    const json2 = canonicalJSON(obj);
    expect(json1).toBe(json2);
  });

  it('different key orders produce same output', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 2, a: 1 };
    expect(canonicalJSON(obj1)).toBe(canonicalJSON(obj2));
  });
});

describe('stableJSON', () => {
  it('produces formatted output with sorted keys', () => {
    const obj = { b: 1, a: 2 };
    const json = stableJSON(obj);
    expect(json).toContain('"a": 2');
    expect(json).toContain('"b": 1');
    expect(json.endsWith('\n')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY HASH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeEntryHash', () => {
  const sampleEntry: MemoryEntry = {
    id: toEntryId('FAC-20260127-0001-AAA111'),
    ts_utc: toTimestamp('2026-01-27T00:00:00Z'),
    author: 'Francky',
    class: 'FACT',
    scope: 'PHASE-D/MEMORY',
    payload: {
      title: 'Test Entry',
      body: 'Test body content',
    },
    meta: {
      schema_version: '1.0',
      sealed: false,
    },
  };

  it('computes hash for entry without prevHash (genesis)', () => {
    const hash = computeEntryHash(sampleEntry, null);
    expect(hash.length).toBe(64);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });

  it('computes hash with prevHash', () => {
    const prevHash = toHashValue('a'.repeat(64));
    const hash = computeEntryHash(sampleEntry, prevHash);
    expect(hash.length).toBe(64);
  });

  it('is deterministic', () => {
    const hash1 = computeEntryHash(sampleEntry, null);
    const hash2 = computeEntryHash(sampleEntry, null);
    const hash3 = computeEntryHash(sampleEntry, null);
    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it('different prevHash produces different hash', () => {
    const hash1 = computeEntryHash(sampleEntry, null);
    const hash2 = computeEntryHash(sampleEntry, toHashValue('a'.repeat(64)));
    expect(hash1).not.toBe(hash2);
  });

  it('different entry content produces different hash', () => {
    const entry2 = { ...sampleEntry, author: 'Different' };
    const hash1 = computeEntryHash(sampleEntry, null);
    const hash2 = computeEntryHash(entry2, null);
    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyEntryHash', () => {
  const sampleEntry: MemoryEntry = {
    id: toEntryId('FAC-20260127-0001-AAA111'),
    ts_utc: toTimestamp('2026-01-27T00:00:00Z'),
    author: 'Francky',
    class: 'FACT',
    scope: 'PHASE-D/MEMORY',
    payload: {
      title: 'Test Entry',
      body: 'Test body content',
    },
    meta: {
      schema_version: '1.0',
      sealed: false,
    },
  };

  it('returns true for matching hash', () => {
    const hash = computeEntryHash(sampleEntry, null);
    expect(verifyEntryHash(sampleEntry, null, hash)).toBe(true);
  });

  it('returns false for non-matching hash', () => {
    const wrongHash = toHashValue('b'.repeat(64));
    expect(verifyEntryHash(sampleEntry, null, wrongHash)).toBe(false);
  });
});
