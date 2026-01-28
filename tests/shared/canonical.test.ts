/**
 * OMEGA Canonical JSON Tests
 * Phase C - NASA-Grade L4
 */

import { describe, it, expect } from 'vitest';
import {
  canonicalize,
  verifyCanonical,
  hashCanonical,
  sha256,
  CanonicalizeError,
} from '../../src/shared/canonical.js';

describe('canonicalize', () => {
  describe('Key sorting (INV-CANONICAL-01)', () => {
    it('sorts keys recursively', () => {
      expect(canonicalize({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
    });

    it('sorts deeply nested objects', () => {
      const obj = { z: { y: { x: { w: 1 } } }, a: 1 };
      expect(canonicalize(obj)).toBe('{"a":1,"z":{"y":{"x":{"w":1}}}}');
    });
  });

  describe('Array handling', () => {
    it('preserves array order', () => {
      expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
    });

    it('handles nested arrays', () => {
      expect(canonicalize([[3, 2], [1]])).toBe('[[3,2],[1]]');
    });

    it('handles mixed arrays', () => {
      expect(canonicalize([1, 'a', null, true])).toBe('[1,"a",null,true]');
    });
  });

  describe('Primitive handling', () => {
    it('handles null', () => {
      expect(canonicalize(null)).toBe('null');
    });

    it('handles true', () => {
      expect(canonicalize(true)).toBe('true');
    });

    it('handles false', () => {
      expect(canonicalize(false)).toBe('false');
    });

    it('handles positive integers', () => {
      expect(canonicalize(42)).toBe('42');
    });

    it('handles negative integers', () => {
      expect(canonicalize(-42)).toBe('-42');
    });

    it('handles floats', () => {
      expect(canonicalize(3.14)).toBe('3.14');
    });

    it('handles zero', () => {
      expect(canonicalize(0)).toBe('0');
    });

    it('handles strings', () => {
      expect(canonicalize('test')).toBe('"test"');
    });

    it('handles strings with special chars', () => {
      expect(canonicalize('a"b\\c')).toBe('"a\\"b\\\\c"');
    });

    it('handles bigint by converting to string', () => {
      expect(canonicalize(123n)).toBe('"123"');
    });
  });

  describe('INV-CANONICAL-03: Unsupported types throw', () => {
    it('throws on Infinity', () => {
      expect(() => canonicalize(Infinity)).toThrow(CanonicalizeError);
    });

    it('throws on -Infinity', () => {
      expect(() => canonicalize(-Infinity)).toThrow(CanonicalizeError);
    });

    it('throws on NaN', () => {
      expect(() => canonicalize(NaN)).toThrow(CanonicalizeError);
    });

    it('throws on undefined', () => {
      expect(() => canonicalize(undefined)).toThrow(CanonicalizeError);
    });

    it('throws on function', () => {
      expect(() => canonicalize(() => {})).toThrow(CanonicalizeError);
    });

    it('throws on Symbol', () => {
      expect(() => canonicalize(Symbol('test'))).toThrow(CanonicalizeError);
    });
  });

  describe('INV-CANONICAL-02: Idempotence', () => {
    it('is idempotent after parse', () => {
      const obj = { z: 1, a: [1, 2], m: { y: 'x' } };
      const str = canonicalize(obj);
      expect(verifyCanonical(str)).toBe(true);
    });

    it('verifies canonical returns false for non-canonical', () => {
      expect(verifyCanonical('{ "b": 1, "a": 2 }')).toBe(false);
    });

    it('verifies canonical returns true for canonical', () => {
      expect(verifyCanonical('{"a":2,"b":1}')).toBe(true);
    });
  });

  describe('Hash consistency', () => {
    it('produces consistent hashes regardless of key order', () => {
      const h1 = hashCanonical({ b: 1, a: 2 });
      const h2 = hashCanonical({ a: 2, b: 1 });
      expect(h1).toBe(h2);
    });

    it('produces 64-char hex hash', () => {
      const hash = hashCanonical({ test: 'value' });
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('sha256 produces consistent results', () => {
      const h1 = sha256('test');
      const h2 = sha256('test');
      expect(h1).toBe(h2);
    });
  });

  describe('Complex objects', () => {
    it('handles empty object', () => {
      expect(canonicalize({})).toBe('{}');
    });

    it('handles empty array', () => {
      expect(canonicalize([])).toBe('[]');
    });

    it('handles complex nested structure', () => {
      const obj = {
        z: [{ b: 2, a: 1 }, { d: 4, c: 3 }],
        y: { q: null, p: true },
        x: 'string',
      };
      const result = canonicalize(obj);
      expect(result).toBe(
        '{"x":"string","y":{"p":true,"q":null},"z":[{"a":1,"b":2},{"c":3,"d":4}]}'
      );
    });
  });
});
