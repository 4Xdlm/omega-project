/**
 * OMEGA Memory System - Types Tests
 * Phase D2 - NASA-Grade L4
 *
 * Tests for branded types, Result type, and type guards.
 */

import { describe, it, expect } from 'vitest';
import {
  isValidEntryId,
  isValidTimestamp,
  isValidHash,
  isValidEntryClass,
  isValidEvidenceType,
  toEntryId,
  toTimestamp,
  toHashValue,
  toByteOffset,
  nowTimestamp,
  ok,
  err,
  isOk,
  isErr,
  ENTRY_CLASSES,
  EVIDENCE_TYPES,
  type EntryId,
  type Timestamp,
  type HashValue,
  type ByteOffset,
  type Result,
} from '../../src/memory/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES - Type Guards
// ═══════════════════════════════════════════════════════════════════════════════

describe('EntryId validation', () => {
  it('accepts valid entry ID format', () => {
    expect(isValidEntryId('FAC-20260127-0001-AAA111')).toBe(true);
    expect(isValidEntryId('DEC-99991231-9999-ZZZZZZ')).toBe(true);
    expect(isValidEntryId('NOT-00000000-0000-000000')).toBe(true);
  });

  it('rejects invalid entry ID formats', () => {
    expect(isValidEntryId('')).toBe(false);
    expect(isValidEntryId('invalid')).toBe(false);
    expect(isValidEntryId('fac-20260127-0001-AAA111')).toBe(false); // lowercase
    expect(isValidEntryId('FAC-2026012-0001-AAA111')).toBe(false); // short date
    expect(isValidEntryId('FAC-20260127-001-AAA111')).toBe(false); // short seq
    expect(isValidEntryId('FAC-20260127-0001-AAA11')).toBe(false); // short suffix
    expect(isValidEntryId('FACT-20260127-0001-AAA111')).toBe(false); // 4-char prefix
  });

  it('creates branded EntryId from valid string', () => {
    const id = toEntryId('FAC-20260127-0001-AAA111');
    expect(id).toBe('FAC-20260127-0001-AAA111');
  });

  it('throws on invalid EntryId creation', () => {
    expect(() => toEntryId('invalid')).toThrow('Invalid entry ID format');
  });
});

describe('Timestamp validation', () => {
  it('accepts valid ISO 8601 timestamps', () => {
    expect(isValidTimestamp('2026-01-27T00:00:00Z')).toBe(true);
    expect(isValidTimestamp('2026-01-27T12:34:56Z')).toBe(true);
    expect(isValidTimestamp('2026-01-27T12:34:56.789Z')).toBe(true);
  });

  it('rejects invalid timestamps', () => {
    expect(isValidTimestamp('')).toBe(false);
    expect(isValidTimestamp('2026-01-27')).toBe(false);
    expect(isValidTimestamp('2026-01-27 12:34:56')).toBe(false);
    expect(isValidTimestamp('2026-01-27T12:34:56')).toBe(false); // missing Z
    expect(isValidTimestamp('not-a-date')).toBe(false);
  });

  it('creates branded Timestamp from valid string', () => {
    const ts = toTimestamp('2026-01-27T00:00:00Z');
    expect(ts).toBe('2026-01-27T00:00:00Z');
  });

  it('nowTimestamp returns valid ISO string', () => {
    const ts = nowTimestamp();
    expect(isValidTimestamp(ts)).toBe(true);
  });
});

describe('HashValue validation', () => {
  it('accepts valid SHA-256 hex strings', () => {
    const validHash = 'a'.repeat(64);
    expect(isValidHash(validHash)).toBe(true);
    expect(isValidHash('0123456789abcdef'.repeat(4))).toBe(true);
  });

  it('rejects invalid hash formats', () => {
    expect(isValidHash('')).toBe(false);
    expect(isValidHash('a'.repeat(63))).toBe(false); // too short
    expect(isValidHash('a'.repeat(65))).toBe(false); // too long
    expect(isValidHash('A'.repeat(64))).toBe(false); // uppercase
    expect(isValidHash('g'.repeat(64))).toBe(false); // invalid hex
  });

  it('creates branded HashValue from valid string', () => {
    const hash = toHashValue('a'.repeat(64));
    expect(hash).toBe('a'.repeat(64));
  });

  it('throws on invalid HashValue creation', () => {
    expect(() => toHashValue('invalid')).toThrow('Invalid hash format');
  });
});

describe('ByteOffset validation', () => {
  it('accepts valid byte offsets', () => {
    const offset = toByteOffset(0);
    expect(offset).toBe(0);
    expect(toByteOffset(1000)).toBe(1000);
  });

  it('throws on negative offset', () => {
    expect(() => toByteOffset(-1)).toThrow('Invalid byte offset');
  });

  it('throws on non-integer offset', () => {
    expect(() => toByteOffset(1.5)).toThrow('Invalid byte offset');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY CLASS & EVIDENCE TYPE
// ═══════════════════════════════════════════════════════════════════════════════

describe('EntryClass validation', () => {
  it('accepts all valid entry classes', () => {
    for (const cls of ENTRY_CLASSES) {
      expect(isValidEntryClass(cls)).toBe(true);
    }
  });

  it('rejects invalid entry classes', () => {
    expect(isValidEntryClass('INVALID')).toBe(false);
    expect(isValidEntryClass('fact')).toBe(false);
    expect(isValidEntryClass('')).toBe(false);
  });
});

describe('EvidenceType validation', () => {
  it('accepts all valid evidence types', () => {
    for (const type of EVIDENCE_TYPES) {
      expect(isValidEvidenceType(type)).toBe(true);
    }
  });

  it('rejects invalid evidence types', () => {
    expect(isValidEvidenceType('INVALID')).toBe(false);
    expect(isValidEvidenceType('TAG')).toBe(false);
    expect(isValidEvidenceType('')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT TYPE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Result type', () => {
  it('ok creates successful result', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    }
  });

  it('err creates error result', () => {
    const result = err('something went wrong');
    expect(result.ok).toBe(false);
    expect(isOk(result)).toBe(false);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBe('something went wrong');
    }
  });

  it('type narrows correctly with isOk/isErr', () => {
    const success: Result<number, string> = ok(42);
    const failure: Result<number, string> = err('failed');

    if (isOk(success)) {
      const val: number = success.value;
      expect(val).toBe(42);
    }

    if (isErr(failure)) {
      const error: string = failure.error;
      expect(error).toBe('failed');
    }
  });
});
