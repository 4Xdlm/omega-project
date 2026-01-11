/**
 * @fileoverview Unit tests for stable JSON utilities.
 */

import { describe, it, expect } from 'vitest';
import { stableStringify, stableParse, stableEquals } from '../../src/util/stableJson.js';

describe('stableStringify', () => {
  it('should stringify primitives correctly', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(true)).toBe('true');
    expect(stableStringify(false)).toBe('false');
    expect(stableStringify(42)).toBe('42');
    expect(stableStringify('hello')).toBe('"hello"');
  });

  it('should stringify arrays correctly', () => {
    expect(stableStringify([1, 2, 3])).toBe('[1,2,3]');
    expect(stableStringify(['a', 'b'])).toBe('["a","b"]');
  });

  it('should sort object keys alphabetically', () => {
    const obj = { c: 3, a: 1, b: 2 };
    expect(stableStringify(obj)).toBe('{"a":1,"b":2,"c":3}');
  });

  it('should produce identical output for same data with different key order', () => {
    const obj1 = { b: 1, a: 2 };
    const obj2 = { a: 2, b: 1 };
    expect(stableStringify(obj1)).toBe(stableStringify(obj2));
  });

  it('should handle nested objects', () => {
    const obj = { outer: { z: 1, a: 2 }, first: true };
    expect(stableStringify(obj)).toBe('{"first":true,"outer":{"a":2,"z":1}}');
  });

  it('should handle arrays of objects', () => {
    const arr = [{ b: 2, a: 1 }, { d: 4, c: 3 }];
    expect(stableStringify(arr)).toBe('[{"a":1,"b":2},{"c":3,"d":4}]');
  });

  it('should handle deeply nested structures', () => {
    const obj = {
      level1: {
        level2: {
          level3: { z: 1, a: 2 }
        }
      }
    };
    const result = stableStringify(obj);
    expect(result).toContain('"a":2');
    expect(result).toContain('"z":1');
    // Keys should be sorted at each level
    expect(result.indexOf('"a"')).toBeLessThan(result.indexOf('"z"'));
  });

  it('should handle null values in objects', () => {
    const obj = { b: null, a: 1 };
    expect(stableStringify(obj)).toBe('{"a":1,"b":null}');
  });

  it('should handle undefined as null in arrays', () => {
    // JSON.stringify converts undefined in arrays to null
    const arr = [1, undefined, 3];
    expect(stableStringify(arr)).toBe('[1,null,3]');
  });

  it('should support indentation', () => {
    const obj = { b: 1, a: 2 };
    const result = stableStringify(obj, 2);
    expect(result).toContain('\n');
    expect(result).toContain('  ');
  });

  it('should be deterministic across multiple calls', () => {
    const obj = { z: 26, a: 1, m: 13 };
    const results = Array(10).fill(null).map(() => stableStringify(obj));
    expect(new Set(results).size).toBe(1);
  });
});

describe('stableParse', () => {
  it('should parse valid JSON', () => {
    expect(stableParse('{"a":1}')).toEqual({ a: 1 });
    expect(stableParse('[1,2,3]')).toEqual([1, 2, 3]);
    expect(stableParse('null')).toBe(null);
    expect(stableParse('"hello"')).toBe('hello');
  });

  it('should throw on invalid JSON', () => {
    expect(() => stableParse('invalid')).toThrow();
    expect(() => stableParse('{a:1}')).toThrow();
  });

  it('should round-trip with stableStringify', () => {
    const original = { nested: { b: 2, a: 1 }, array: [3, 2, 1] };
    const stringified = stableStringify(original);
    const parsed = stableParse(stringified);
    expect(parsed).toEqual(original);
  });
});

describe('stableEquals', () => {
  it('should return true for equal primitives', () => {
    expect(stableEquals(1, 1)).toBe(true);
    expect(stableEquals('a', 'a')).toBe(true);
    expect(stableEquals(null, null)).toBe(true);
    expect(stableEquals(true, true)).toBe(true);
  });

  it('should return false for different primitives', () => {
    expect(stableEquals(1, 2)).toBe(false);
    expect(stableEquals('a', 'b')).toBe(false);
    expect(stableEquals(true, false)).toBe(false);
  });

  it('should return true for equal objects regardless of key order', () => {
    const obj1 = { b: 1, a: 2 };
    const obj2 = { a: 2, b: 1 };
    expect(stableEquals(obj1, obj2)).toBe(true);
  });

  it('should return true for deeply equal nested objects', () => {
    const obj1 = { outer: { z: 1, a: 2 } };
    const obj2 = { outer: { a: 2, z: 1 } };
    expect(stableEquals(obj1, obj2)).toBe(true);
  });

  it('should return false for different objects', () => {
    expect(stableEquals({ a: 1 }, { a: 2 })).toBe(false);
    expect(stableEquals({ a: 1 }, { b: 1 })).toBe(false);
  });

  it('should return true for equal arrays', () => {
    expect(stableEquals([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('should return false for arrays with different order', () => {
    expect(stableEquals([1, 2, 3], [3, 2, 1])).toBe(false);
  });
});
