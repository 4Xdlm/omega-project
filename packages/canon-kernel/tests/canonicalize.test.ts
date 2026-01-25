import { describe, it, expect } from 'vitest';
import { canonicalize, verifyCanonicalEquivalence } from '../src/hash/canonicalize';

describe('Canonicalize', () => {
  describe('Object key sorting', () => {
    it('should sort object keys', () => {
      const obj1 = { b: 1, a: 2, c: 3 };
      const obj2 = { a: 2, c: 3, b: 1 };
      expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    });

    it('should sort nested object keys', () => {
      const obj1 = { z: { b: 1, a: 2 }, y: 3 };
      const obj2 = { y: 3, z: { a: 2, b: 1 } };
      expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    });

    it('should handle deeply nested objects', () => {
      const obj1 = { z: { b: { d: 1, c: 2 }, a: 3 }, y: 4 };
      const obj2 = { y: 4, z: { a: 3, b: { c: 2, d: 1 } } };
      expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    });
  });

  describe('Array handling', () => {
    it('should preserve array order', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [3, 2, 1];
      expect(canonicalize(arr1)).not.toBe(canonicalize(arr2));
    });

    it('should handle nested arrays', () => {
      const obj1 = { arr: [1, 2, 3] };
      const obj2 = { arr: [1, 2, 3] };
      expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    });

    it('should handle arrays of objects', () => {
      const arr = [{ b: 1, a: 2 }, { d: 3, c: 4 }];
      const canonical = canonicalize(arr);
      expect(canonical).toContain('"a":2');
      expect(canonical).toContain('"b":1');
    });
  });

  describe('Primitive handling', () => {
    it('should handle null', () => {
      expect(canonicalize(null)).toBe('null');
    });

    it('should handle booleans', () => {
      expect(canonicalize(true)).toBe('true');
      expect(canonicalize(false)).toBe('false');
    });

    it('should handle numbers', () => {
      expect(canonicalize(42)).toBe('42');
      expect(canonicalize(3.14)).toBe('3.14');
      expect(canonicalize(-0)).toBe('0'); // Normalize -0
    });

    it('should handle strings with escaping', () => {
      expect(canonicalize('hello')).toBe('"hello"');
      expect(canonicalize('hello\nworld')).toBe('"hello\\nworld"');
      expect(canonicalize('quote: "')).toBe('"quote: \\""');
    });

    it('should handle empty objects/arrays', () => {
      expect(canonicalize({})).toBe('{}');
      expect(canonicalize([])).toBe('[]');
    });
  });

  describe('Forbidden values', () => {
    it('should throw on undefined', () => {
      expect(() => canonicalize(undefined)).toThrow('undefined is forbidden');
    });

    it('should throw on functions', () => {
      expect(() => canonicalize(() => {})).toThrow('function is forbidden');
    });

    it('should throw on symbols', () => {
      expect(() => canonicalize(Symbol('test'))).toThrow('symbol is forbidden');
    });

    it('should throw on Infinity', () => {
      expect(() => canonicalize(Infinity)).toThrow('Infinity and NaN are forbidden');
    });

    it('should throw on NaN', () => {
      expect(() => canonicalize(NaN)).toThrow('Infinity and NaN are forbidden');
    });
  });

  describe('Special types', () => {
    it('should handle BigInt', () => {
      expect(canonicalize(BigInt(12345))).toBe('"12345n"');
    });

    it('should handle Date', () => {
      const date = new Date('2026-01-24T00:00:00.000Z');
      expect(canonicalize(date)).toBe('"2026-01-24T00:00:00.000Z"');
    });

    it('should throw on invalid Date', () => {
      expect(() => canonicalize(new Date('invalid'))).toThrow('Invalid Date is forbidden');
    });
  });

  describe('Undefined in objects', () => {
    it('should skip undefined values in objects', () => {
      const obj = { a: 1, b: undefined, c: 3 };
      expect(canonicalize(obj)).toBe('{"a":1,"c":3}');
    });
  });

  describe('Determinism', () => {
    it('should be deterministic (100 iterations)', () => {
      const obj = { complex: { nested: [1, 2, { x: 'y' }] }, simple: true };
      const first = canonicalize(obj);
      for (let i = 0; i < 100; i++) {
        expect(canonicalize(obj)).toBe(first);
      }
    });
  });

  describe('verifyCanonicalEquivalence', () => {
    it('should return true for equivalent objects', () => {
      expect(verifyCanonicalEquivalence({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    });

    it('should return false for different objects', () => {
      expect(verifyCanonicalEquivalence({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('should return false if either throws', () => {
      expect(verifyCanonicalEquivalence(undefined, { a: 1 })).toBe(false);
    });
  });
});
