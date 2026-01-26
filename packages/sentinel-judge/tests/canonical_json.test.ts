/**
 * OMEGA Phase C — Canonical JSON Tests
 * 
 * Version: 1.0.0
 * Date: 2026-01-26
 * 
 * Test Requirements:
 * - Same input → same bytes
 * - Key order not significant at input
 * - Deterministic output
 */

import { describe, it, expect } from 'vitest';
import {
  canonicalStringify,
  canonicalParse,
  canonicalEquals,
  SentinelJudgeError,
  ERROR_CODES,
} from '../src/index.js';

describe('canonicalStringify', () => {
  describe('key sorting', () => {
    it('sorts keys alphabetically', () => {
      const input = { z: 1, a: 2, m: 3 };
      const result = canonicalStringify(input);
      expect(result).toBe('{"a":2,"m":3,"z":1}');
    });

    it('sorts nested object keys', () => {
      const input = { outer: { z: 1, a: 2 }, first: true };
      const result = canonicalStringify(input);
      expect(result).toBe('{"first":true,"outer":{"a":2,"z":1}}');
    });

    it('sorts deeply nested keys', () => {
      const input = {
        level1: {
          z: {
            deep: { c: 3, a: 1, b: 2 },
          },
          a: 'first',
        },
      };
      const result = canonicalStringify(input);
      expect(result).toBe('{"level1":{"a":"first","z":{"deep":{"a":1,"b":2,"c":3}}}}');
    });
  });

  describe('determinism', () => {
    it('produces identical output for same logical input', () => {
      const input1 = { b: 2, a: 1 };
      const input2 = { a: 1, b: 2 };
      
      const result1 = canonicalStringify(input1);
      const result2 = canonicalStringify(input2);
      
      expect(result1).toBe(result2);
      expect(result1).toBe('{"a":1,"b":2}');
    });

    it('produces identical bytes across multiple calls', () => {
      const input = { complex: { nested: { value: 42 } }, simple: 'test' };
      
      const results = Array.from({ length: 100 }, () => canonicalStringify(input));
      const allSame = results.every((r) => r === results[0]);
      
      expect(allSame).toBe(true);
    });

    it('handles complex OMEGA-style objects deterministically', () => {
      const decisionRequest = {
        traceId: 'C-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        submittedBy: 'FORGE_ADAPTER',
        claim: {
          type: 'ARTIFACT_CERTIFICATION',
          payloadHash: 'abc123',
          payload: { data: 'test' },
        },
        contextRefs: [],
      };

      const result1 = canonicalStringify(decisionRequest);
      const result2 = canonicalStringify(decisionRequest);
      
      expect(result1).toBe(result2);
    });
  });

  describe('array handling', () => {
    it('preserves array order', () => {
      const input = { arr: [3, 1, 2] };
      const result = canonicalStringify(input);
      expect(result).toBe('{"arr":[3,1,2]}');
    });

    it('sorts objects within arrays', () => {
      const input = { arr: [{ z: 1, a: 2 }, { b: 3, a: 4 }] };
      const result = canonicalStringify(input);
      expect(result).toBe('{"arr":[{"a":2,"z":1},{"a":4,"b":3}]}');
    });
  });

  describe('primitive handling', () => {
    it('handles null', () => {
      expect(canonicalStringify(null)).toBe('null');
    });

    it('handles strings', () => {
      expect(canonicalStringify('test')).toBe('"test"');
    });

    it('handles numbers', () => {
      expect(canonicalStringify(42)).toBe('42');
      expect(canonicalStringify(3.14)).toBe('3.14');
    });

    it('handles booleans', () => {
      expect(canonicalStringify(true)).toBe('true');
      expect(canonicalStringify(false)).toBe('false');
    });

    it('handles empty objects', () => {
      expect(canonicalStringify({})).toBe('{}');
    });

    it('handles empty arrays', () => {
      expect(canonicalStringify([])).toBe('[]');
    });
  });

  describe('error handling', () => {
    it('throws on undefined', () => {
      expect(() => canonicalStringify(undefined)).toThrow(SentinelJudgeError);
      expect(() => canonicalStringify(undefined)).toThrow(ERROR_CODES.CANONICAL_02);
    });

    it('throws on functions', () => {
      expect(() => canonicalStringify(() => {})).toThrow(SentinelJudgeError);
      expect(() => canonicalStringify(() => {})).toThrow(ERROR_CODES.CANONICAL_02);
    });

    it('throws on BigInt', () => {
      expect(() => canonicalStringify(BigInt(42))).toThrow(SentinelJudgeError);
      expect(() => canonicalStringify(BigInt(42))).toThrow(ERROR_CODES.CANONICAL_02);
    });

    it('throws on Symbol', () => {
      expect(() => canonicalStringify(Symbol('test'))).toThrow(SentinelJudgeError);
      expect(() => canonicalStringify(Symbol('test'))).toThrow(ERROR_CODES.CANONICAL_02);
    });
  });

  describe('no whitespace', () => {
    it('produces compact output without spaces', () => {
      const input = { a: 1, b: [1, 2, 3], c: { d: 'test' } };
      const result = canonicalStringify(input);
      
      expect(result).not.toContain(' ');
      expect(result).not.toContain('\n');
      expect(result).not.toContain('\t');
    });
  });
});

describe('canonicalParse', () => {
  it('parses valid JSON', () => {
    const result = canonicalParse<{ a: number }>('{"a":1}');
    expect(result).toEqual({ a: 1 });
  });

  it('throws on invalid JSON', () => {
    expect(() => canonicalParse('not json')).toThrow(SentinelJudgeError);
    expect(() => canonicalParse('not json')).toThrow(ERROR_CODES.CANONICAL_01);
  });
});

describe('canonicalEquals', () => {
  it('returns true for objects with same content but different key order', () => {
    const a = { z: 1, a: 2 };
    const b = { a: 2, z: 1 };
    expect(canonicalEquals(a, b)).toBe(true);
  });

  it('returns false for different objects', () => {
    const a = { a: 1 };
    const b = { a: 2 };
    expect(canonicalEquals(a, b)).toBe(false);
  });

  it('returns true for identical primitives', () => {
    expect(canonicalEquals(42, 42)).toBe(true);
    expect(canonicalEquals('test', 'test')).toBe(true);
  });
});
