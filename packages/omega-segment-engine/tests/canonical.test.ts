/**
 * @fileoverview Phase 3.2 - Error Path Tests for Canonical Functions
 * Tests error handling behavior in stableStringify, sha256Hex, shortHash, hashObject.
 */

import { describe, it, expect } from 'vitest';
import {
  stableStringify,
  sha256Hex,
  shortHash,
  hashObject,
  selfTest,
} from '../src/canonical.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - stableStringify
// ═══════════════════════════════════════════════════════════════════════════════

describe('stableStringify - Error Paths', () => {
  describe('Non-finite Numbers', () => {
    it('should throw on NaN', () => {
      expect(() => stableStringify(NaN)).toThrow('non-finite number');
    });

    it('should throw on Infinity', () => {
      expect(() => stableStringify(Infinity)).toThrow('non-finite number');
    });

    it('should throw on -Infinity', () => {
      expect(() => stableStringify(-Infinity)).toThrow('non-finite number');
    });

    it('should throw on NaN nested in object', () => {
      expect(() => stableStringify({ value: NaN })).toThrow('non-finite number');
    });

    it('should throw on Infinity nested in array', () => {
      expect(() => stableStringify([1, Infinity, 3])).toThrow('non-finite number');
    });

    it('should throw on -Infinity deep nested', () => {
      expect(() =>
        stableStringify({ a: { b: { c: -Infinity } } })
      ).toThrow('non-finite number');
    });
  });

  describe('Undefined Handling', () => {
    it('should throw on undefined', () => {
      expect(() => stableStringify(undefined)).toThrow('undefined not allowed');
    });

    it('should throw on undefined in object', () => {
      expect(() => stableStringify({ a: undefined })).toThrow('undefined not allowed');
    });

    it('should throw on undefined in array', () => {
      expect(() => stableStringify([1, undefined, 3])).toThrow('undefined not allowed');
    });

    it('should throw on undefined deep nested', () => {
      expect(() =>
        stableStringify({ a: { b: [{ c: undefined }] } })
      ).toThrow('undefined not allowed');
    });
  });

  describe('Unsupported Types', () => {
    it('should throw on function', () => {
      expect(() => stableStringify(() => {})).toThrow('unsupported type');
    });

    it('should throw on symbol', () => {
      expect(() => stableStringify(Symbol('test'))).toThrow('unsupported type');
    });

    it('should throw on BigInt', () => {
      expect(() => stableStringify(BigInt(42))).toThrow('unsupported type');
    });

    it('should throw on function in object', () => {
      expect(() => stableStringify({ fn: () => {} })).toThrow('unsupported type');
    });

    it('should throw on symbol in array', () => {
      expect(() => stableStringify([Symbol()])).toThrow('unsupported type');
    });
  });

  describe('Valid Cases', () => {
    it('should handle null', () => {
      expect(stableStringify(null)).toBe('null');
    });

    it('should handle empty string', () => {
      expect(stableStringify('')).toBe('""');
    });

    it('should handle empty object', () => {
      expect(stableStringify({})).toBe('{}');
    });

    it('should handle empty array', () => {
      expect(stableStringify([])).toBe('[]');
    });

    it('should handle boolean true', () => {
      expect(stableStringify(true)).toBe('true');
    });

    it('should handle boolean false', () => {
      expect(stableStringify(false)).toBe('false');
    });

    it('should handle zero', () => {
      expect(stableStringify(0)).toBe('0');
    });

    it('should handle negative zero', () => {
      expect(stableStringify(-0)).toBe('0');
    });

    it('should handle negative number', () => {
      expect(stableStringify(-42)).toBe('-42');
    });

    it('should handle float', () => {
      expect(stableStringify(3.14)).toBe('3.14');
    });

    it('should handle string with quotes', () => {
      expect(stableStringify('hello "world"')).toBe('"hello \\"world\\""');
    });

    it('should handle string with newline', () => {
      expect(stableStringify('line1\nline2')).toBe('"line1\\nline2"');
    });

    it('should handle unicode string', () => {
      expect(stableStringify('日本語')).toBe('"日本語"');
    });
  });

  describe('Key Ordering', () => {
    it('should sort keys alphabetically', () => {
      const result = stableStringify({ z: 1, a: 2, m: 3 });
      expect(result).toBe('{"a":2,"m":3,"z":1}');
    });

    it('should sort nested object keys', () => {
      const result = stableStringify({ outer: { z: 1, a: 2 } });
      expect(result).toBe('{"outer":{"a":2,"z":1}}');
    });

    it('should preserve array order', () => {
      const result = stableStringify([3, 1, 2]);
      expect(result).toBe('[3,1,2]');
    });

    it('should sort object keys in array', () => {
      const result = stableStringify([{ b: 1, a: 2 }]);
      expect(result).toBe('[{"a":2,"b":1}]');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIOR TESTS - sha256Hex
// ═══════════════════════════════════════════════════════════════════════════════

describe('sha256Hex - Behavior', () => {
  it('should return 64 character hex string', () => {
    const hash = sha256Hex('test');
    expect(hash.length).toBe(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('should be deterministic', () => {
    const hash1 = sha256Hex('test');
    const hash2 = sha256Hex('test');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hash for different input', () => {
    const hash1 = sha256Hex('test1');
    const hash2 = sha256Hex('test2');
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty string', () => {
    const hash = sha256Hex('');
    expect(hash.length).toBe(64);
  });

  it('should handle unicode', () => {
    const hash = sha256Hex('日本語');
    expect(hash.length).toBe(64);
  });

  it('should handle very long string', () => {
    const hash = sha256Hex('x'.repeat(10000));
    expect(hash.length).toBe(64);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIOR TESTS - shortHash
// ═══════════════════════════════════════════════════════════════════════════════

describe('shortHash - Behavior', () => {
  it('should return default 12 characters', () => {
    const hash = shortHash('test');
    expect(hash.length).toBe(12);
  });

  it('should respect custom length', () => {
    const hash = shortHash('test', 8);
    expect(hash.length).toBe(8);
  });

  it('should be deterministic', () => {
    const hash1 = shortHash('test', 8);
    const hash2 = shortHash('test', 8);
    expect(hash1).toBe(hash2);
  });

  it('should handle length 1', () => {
    const hash = shortHash('test', 1);
    expect(hash.length).toBe(1);
  });

  it('should handle length 64 (full hash)', () => {
    const hash = shortHash('test', 64);
    expect(hash.length).toBe(64);
  });

  it('should return lowercase hex', () => {
    const hash = shortHash('test');
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIOR TESTS - hashObject
// ═══════════════════════════════════════════════════════════════════════════════

describe('hashObject - Behavior', () => {
  it('should hash simple object', () => {
    const hash = hashObject({ key: 'value' });
    expect(hash.length).toBe(64);
  });

  it('should produce same hash regardless of key order', () => {
    const hash1 = hashObject({ a: 1, b: 2 });
    const hash2 = hashObject({ b: 2, a: 1 });
    expect(hash1).toBe(hash2);
  });

  it('should produce different hash for different values', () => {
    const hash1 = hashObject({ a: 1 });
    const hash2 = hashObject({ a: 2 });
    expect(hash1).not.toBe(hash2);
  });

  it('should hash nested objects deterministically', () => {
    const obj = { outer: { z: 1, a: 2 }, arr: [3, 2, 1] };
    const hash1 = hashObject(obj);
    const hash2 = hashObject({ arr: [3, 2, 1], outer: { a: 2, z: 1 } });
    expect(hash1).toBe(hash2);
  });

  it('should throw on invalid object', () => {
    expect(() => hashObject({ fn: () => {} })).toThrow();
  });

  it('should throw on undefined', () => {
    expect(() => hashObject(undefined)).toThrow();
  });

  it('should throw on NaN in object', () => {
    expect(() => hashObject({ value: NaN })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELF TEST VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('selfTest - Validation', () => {
  it('should pass all internal tests', () => {
    expect(selfTest()).toBe(true);
  });
});
