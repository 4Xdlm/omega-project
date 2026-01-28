/**
 * OMEGA Canon Semantic Equals Tests v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * Tests INV-E-SEMANTIC-01, INV-E-SEMANTIC-02, INV-E-NAN-01, INV-E-CANONICAL-03
 * Includes Golden Tests E1-GOLD-1 to E1-GOLD-4
 */

import { describe, it, expect } from 'vitest';
import {
  containsNaN,
  normalizeUndefined,
  semanticEquals,
  assertNoNaN,
  normalizeForCanon,
  canonicalizeWithUndefined,
} from '../../src/canon/semantic-equals.js';
import { canonicalize, hashCanonical } from '../../src/shared/canonical.js';

describe('CANON Semantic Equals — Phase E', () => {
  // ═══════════════════════════════════════════════════════════════════════════════
  // E1-GOLD-3: containsNaN récursif (INV-E-NAN-01)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('E1-GOLD-3: containsNaN recursive (INV-E-NAN-01)', () => {
    it('detects direct NaN', () => {
      expect(containsNaN(NaN)).toBe(true);
    });

    it('detects NaN in nested object', () => {
      expect(containsNaN({ a: 1, b: { c: NaN } })).toBe(true);
    });

    it('detects NaN in array', () => {
      expect(containsNaN({ a: 1, b: [2, NaN] })).toBe(true);
    });

    it('returns false for valid object', () => {
      expect(containsNaN({ a: 1, b: 2 })).toBe(false);
    });

    it('returns false for primitives', () => {
      expect(containsNaN(null)).toBe(false);
      expect(containsNaN(undefined)).toBe(false);
      expect(containsNaN(42)).toBe(false);
      expect(containsNaN('hello')).toBe(false);
      expect(containsNaN(true)).toBe(false);
    });

    it('detects NaN in deeply nested structure', () => {
      const deep = { a: { b: { c: { d: { e: NaN } } } } };
      expect(containsNaN(deep)).toBe(true);
    });

    it('detects NaN in mixed array/object', () => {
      const mixed = { arr: [{ nested: [1, 2, NaN] }] };
      expect(containsNaN(mixed)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // E1-GOLD-1: undefined → null (INV-E-CANONICAL-03)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('E1-GOLD-1: undefined → null (INV-E-CANONICAL-03)', () => {
    it('converts undefined to null in object', () => {
      const obj = { a: undefined, b: 1, c: { d: undefined } };
      const expected = { a: null, b: 1, c: { d: null } };

      expect(normalizeUndefined(obj)).toEqual(expected);
    });

    it('canonicalizes with undefined → null', () => {
      const obj = { a: undefined, b: 1, c: { d: undefined } };
      const expected = '{"a":null,"b":1,"c":{"d":null}}';

      expect(canonicalizeWithUndefined(obj)).toBe(expected);
    });

    it('converts undefined to null at top level', () => {
      expect(normalizeUndefined(undefined)).toBe(null);
    });

    it('converts undefined in arrays', () => {
      const arr = [1, undefined, 3];
      expect(normalizeUndefined(arr)).toEqual([1, null, 3]);
    });

    it('preserves null as null', () => {
      expect(normalizeUndefined(null)).toBe(null);
      expect(normalizeUndefined({ a: null })).toEqual({ a: null });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // E1-GOLD-2: semanticEquals bigint (INV-E-SEMANTIC-02)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('E1-GOLD-2: semanticEquals bigint (INV-E-SEMANTIC-02)', () => {
    it('compares equal bigints', () => {
      expect(semanticEquals(BigInt(123), BigInt(123))).toBe(true);
    });

    it('compares different bigints', () => {
      expect(semanticEquals(BigInt(123), BigInt(456))).toBe(false);
    });

    it('bigint vs number are not equal', () => {
      expect(semanticEquals(BigInt(123), 123)).toBe(false);
    });

    it('handles large bigints', () => {
      const big1 = BigInt('9007199254740993');
      const big2 = BigInt('9007199254740993');
      const big3 = BigInt('9007199254740994');

      expect(semanticEquals(big1, big2)).toBe(true);
      expect(semanticEquals(big1, big3)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // semanticEquals general (INV-E-SEMANTIC-01)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('semanticEquals general (INV-E-SEMANTIC-01)', () => {
    it('compares primitives', () => {
      expect(semanticEquals(42, 42)).toBe(true);
      expect(semanticEquals(42, 43)).toBe(false);
      expect(semanticEquals('hello', 'hello')).toBe(true);
      expect(semanticEquals('hello', 'world')).toBe(false);
      expect(semanticEquals(true, true)).toBe(true);
      expect(semanticEquals(true, false)).toBe(false);
    });

    it('compares null and undefined as equal', () => {
      expect(semanticEquals(null, null)).toBe(true);
      expect(semanticEquals(undefined, undefined)).toBe(true);
      expect(semanticEquals(null, undefined)).toBe(true);
      expect(semanticEquals(undefined, null)).toBe(true);
    });

    it('null/undefined not equal to other values', () => {
      expect(semanticEquals(null, 0)).toBe(false);
      expect(semanticEquals(undefined, '')).toBe(false);
      expect(semanticEquals(null, false)).toBe(false);
    });

    it('compares arrays by content', () => {
      expect(semanticEquals([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(semanticEquals([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(semanticEquals([1, 2], [1, 2, 3])).toBe(false);
    });

    it('compares objects with key order independence', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 2, a: 1 };
      expect(semanticEquals(obj1, obj2)).toBe(true);
    });

    it('compares nested objects', () => {
      const obj1 = { a: { b: { c: 1 } } };
      const obj2 = { a: { b: { c: 1 } } };
      const obj3 = { a: { b: { c: 2 } } };

      expect(semanticEquals(obj1, obj2)).toBe(true);
      expect(semanticEquals(obj1, obj3)).toBe(false);
    });

    it('throws on NaN (INV-E-NAN-01)', () => {
      expect(() => semanticEquals(NaN, 1)).toThrow('INVALID_VALUE_NAN');
      expect(() => semanticEquals(1, NaN)).toThrow('INVALID_VALUE_NAN');
      expect(() => semanticEquals({ a: NaN }, { a: 1 })).toThrow('INVALID_VALUE_NAN');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // E1-GOLD-4: Hash stable (INV-E-CANONICAL-01)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('E1-GOLD-4: Hash stable (INV-E-CANONICAL-01, INV-E-CANONICAL-02)', () => {
    it('produces identical hash across multiple runs', () => {
      const claim = {
        id: 'CLM-abc-12345678',
        subject: 'ENT-xyz-87654321',
        predicate: 'HAS_NAME',
        value: 'John Doe',
        status: 'ACTIVE',
      };

      const hash1 = hashCanonical(claim);
      const hash2 = hashCanonical(claim);
      const hash3 = hashCanonical(claim);

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('key order does not affect hash', () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { c: 3, a: 1, b: 2 };

      expect(hashCanonical(obj1)).toBe(hashCanonical(obj2));
    });

    it('different values produce different hashes', () => {
      const obj1 = { a: 1 };
      const obj2 = { a: 2 };

      expect(hashCanonical(obj1)).not.toBe(hashCanonical(obj2));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // Validation helpers
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('assertNoNaN', () => {
    it('does not throw for valid values', () => {
      expect(() => assertNoNaN(42)).not.toThrow();
      expect(() => assertNoNaN({ a: 1 })).not.toThrow();
      expect(() => assertNoNaN([1, 2, 3])).not.toThrow();
    });

    it('throws for NaN values', () => {
      expect(() => assertNoNaN(NaN)).toThrow('INVALID_VALUE_NAN');
      expect(() => assertNoNaN({ a: NaN })).toThrow('INVALID_VALUE_NAN');
    });
  });

  describe('normalizeForCanon', () => {
    it('normalizes undefined and validates no NaN', () => {
      const result = normalizeForCanon({ a: undefined, b: 1 });
      expect(result).toEqual({ a: null, b: 1 });
    });

    it('throws if NaN is present', () => {
      expect(() => normalizeForCanon({ a: NaN })).toThrow('INVALID_VALUE_NAN');
    });
  });

  describe('E1-T3: Canonical hash stable (INV-E-CANONICAL-01)', () => {
    it('same object produces same canonical string', () => {
      const obj = { z: 1, a: 2, m: 3 };
      expect(canonicalize(obj)).toBe('{"a":2,"m":3,"z":1}');
    });
  });

  describe('E1-T4: undefined → null (INV-E-CANONICAL-03)', () => {
    it('normalizeUndefined handles all cases', () => {
      expect(normalizeUndefined(undefined)).toBe(null);
      expect(normalizeUndefined({ x: undefined })).toEqual({ x: null });
      expect(normalizeUndefined([undefined])).toEqual([null]);
    });
  });
});
