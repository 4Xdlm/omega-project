/**
 * @fileoverview Phase 3.2 - Error Path Tests for Safe JSON
 * Tests error handling behavior in JSON parsing/stringify functions.
 */

import { describe, it, expect } from 'vitest';
import {
  safeJsonParse,
  safeJsonStringify,
  parseFrozenJson,
  deepFreeze,
  getJsonType,
  isJsonType,
} from '../../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - safeJsonParse
// ═══════════════════════════════════════════════════════════════════════════════

describe('safeJsonParse - Error Paths', () => {
  it('should handle syntax error in JSON', () => {
    const result = safeJsonParse('{key: value}');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle truncated JSON', () => {
    const result = safeJsonParse('{"key": "val');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle trailing comma', () => {
    const result = safeJsonParse('{"key": 1,}');
    expect(result.success).toBe(false);
  });

  it('should handle single quotes', () => {
    const result = safeJsonParse("{'key': 'value'}");
    expect(result.success).toBe(false);
  });

  it('should handle undefined literal', () => {
    const result = safeJsonParse('undefined');
    expect(result.success).toBe(false);
  });

  it('should handle NaN literal', () => {
    const result = safeJsonParse('NaN');
    expect(result.success).toBe(false);
  });

  it('should reject deeply nested beyond maxDepth', () => {
    let deep = '{"a":';
    for (let i = 0; i < 25; i++) {
      deep += '{"b":';
    }
    deep += '1';
    for (let i = 0; i < 25; i++) {
      deep += '}';
    }
    deep += '}';

    const result = safeJsonParse(deep, { maxDepth: 20 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('depth');
  });

  it('should reject input exceeding maxLength', () => {
    const long = JSON.stringify({ key: 'x'.repeat(1000) });
    const result = safeJsonParse(long, { maxLength: 100 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('maximum length');
  });

  it('should handle nested __proto__ in object', () => {
    const json = '{"a": {"__proto__": {}}}';
    const result = safeJsonParse(json);
    expect(result.success).toBe(false);
    expect(result.error).toContain('__proto__');
  });

  it('should handle prototype key in array', () => {
    const json = '[{"__proto__": {}}]';
    const result = safeJsonParse(json);
    expect(result.success).toBe(false);
  });

  it('should handle empty string input', () => {
    const result = safeJsonParse('');
    expect(result.success).toBe(false);
  });

  it('should handle whitespace only input', () => {
    const result = safeJsonParse('   \n\t  ');
    expect(result.success).toBe(false);
  });

  it('should accept __proto__ when allowProto is true', () => {
    const result = safeJsonParse('{"safe": true}', { allowProto: true });
    expect(result.success).toBe(true);
  });

  it('should handle constructor key deep in object', () => {
    const json = '{"a": {"b": {"constructor": {}}}}';
    const result = safeJsonParse(json);
    expect(result.success).toBe(false);
  });

  it('should accept constructor when allowConstructor is true', () => {
    const result = safeJsonParse('{"safe": true}', { allowConstructor: true });
    expect(result.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - safeJsonStringify
// ═══════════════════════════════════════════════════════════════════════════════

describe('safeJsonStringify - Error Paths', () => {
  it('should handle circular reference', () => {
    const obj: any = { a: 1 };
    obj.self = obj;

    const result = safeJsonStringify(obj);

    expect(result.success).toBe(true);
    expect(result.value).toContain('[Circular]');
  });

  it('should handle deeply circular reference', () => {
    const obj: any = { a: { b: { c: {} } } };
    obj.a.b.c.root = obj;

    const result = safeJsonStringify(obj);

    expect(result.success).toBe(true);
    expect(result.value).toContain('[Circular]');
  });

  it('should reject object exceeding maxDepth', () => {
    const deep: any = {};
    let current = deep;
    for (let i = 0; i < 25; i++) {
      current.next = {};
      current = current.next;
    }

    const result = safeJsonStringify(deep, { maxDepth: 20 });

    expect(result.success).toBe(false);
    expect(result.error).toContain('depth');
  });

  it('should handle BigInt (throws by default)', () => {
    const result = safeJsonStringify({ value: BigInt(42) });
    expect(result.success).toBe(false);
  });

  it('should handle undefined values in object', () => {
    const result = safeJsonStringify({ a: 1, b: undefined });
    expect(result.success).toBe(true);
    // undefined values are omitted by JSON.stringify
    expect(result.value).not.toContain('undefined');
  });

  it('should handle function values in object', () => {
    const result = safeJsonStringify({ fn: () => {} });
    expect(result.success).toBe(true);
    // functions are omitted
    expect(result.value).toBe('{}');
  });

  it('should handle Symbol values', () => {
    const result = safeJsonStringify({ sym: Symbol('test') });
    expect(result.success).toBe(true);
    expect(result.value).toBe('{}');
  });

  it('should handle array with circular ref', () => {
    const arr: any[] = [1, 2];
    arr.push(arr);

    const result = safeJsonStringify(arr);

    expect(result.success).toBe(true);
    expect(result.value).toContain('[Circular]');
  });

  it('should handle null value', () => {
    const result = safeJsonStringify(null);
    expect(result.success).toBe(true);
    expect(result.value).toBe('null');
  });

  it('should handle empty object', () => {
    const result = safeJsonStringify({});
    expect(result.success).toBe(true);
    expect(result.value).toBe('{}');
  });

  it('should handle empty array', () => {
    const result = safeJsonStringify([]);
    expect(result.success).toBe(true);
    expect(result.value).toBe('[]');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - parseFrozenJson
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseFrozenJson - Error Paths', () => {
  it('should fail on invalid JSON', () => {
    const result = parseFrozenJson('not json');
    expect(result.success).toBe(false);
  });

  it('should fail on dangerous keys', () => {
    const result = parseFrozenJson('{"__proto__": {}}');
    expect(result.success).toBe(false);
  });

  it('should freeze result on success', () => {
    const result = parseFrozenJson('{"key": "value"}');
    expect(result.success).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
  });

  it('should deep freeze nested objects', () => {
    const result = parseFrozenJson('{"a": {"b": {"c": 1}}}');
    expect(result.success).toBe(true);
    expect(Object.isFrozen((result.value as any).a)).toBe(true);
    expect(Object.isFrozen((result.value as any).a.b)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - deepFreeze
// ═══════════════════════════════════════════════════════════════════════════════

describe('deepFreeze - Edge Cases', () => {
  it('should handle null', () => {
    expect(deepFreeze(null)).toBe(null);
  });

  it('should handle undefined', () => {
    expect(deepFreeze(undefined)).toBe(undefined);
  });

  it('should handle primitives', () => {
    expect(deepFreeze('string')).toBe('string');
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze(true)).toBe(true);
  });

  it('should freeze array elements', () => {
    const arr = [{ a: 1 }, { b: 2 }];
    const frozen = deepFreeze(arr);
    expect(Object.isFrozen(frozen[0])).toBe(true);
    expect(Object.isFrozen(frozen[1])).toBe(true);
  });

  it('should handle nested arrays', () => {
    const arr = [[{ deep: true }]];
    const frozen = deepFreeze(arr);
    expect(Object.isFrozen(frozen[0])).toBe(true);
    expect(Object.isFrozen(frozen[0][0])).toBe(true);
  });

  it('should handle mixed content', () => {
    const obj = {
      arr: [1, { nested: true }],
      obj: { key: 'value' },
      num: 42,
    };
    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.arr)).toBe(true);
    expect(Object.isFrozen(frozen.arr[1])).toBe(true);
    expect(Object.isFrozen(frozen.obj)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - getJsonType / isJsonType
// ═══════════════════════════════════════════════════════════════════════════════

describe('getJsonType - Edge Cases', () => {
  it('should return unknown for function', () => {
    expect(getJsonType(() => {})).toBe('unknown');
  });

  it('should return unknown for Symbol', () => {
    expect(getJsonType(Symbol())).toBe('unknown');
  });

  it('should return unknown for BigInt', () => {
    expect(getJsonType(BigInt(42))).toBe('unknown');
  });

  it('should distinguish null from object', () => {
    expect(getJsonType(null)).toBe('null');
    expect(getJsonType({})).toBe('object');
  });

  it('should distinguish array from object', () => {
    expect(getJsonType([])).toBe('array');
    expect(getJsonType({})).toBe('object');
  });
});

describe('isJsonType - Edge Cases', () => {
  it('should validate null type', () => {
    expect(isJsonType(null, 'null')).toBe(true);
    expect(isJsonType({}, 'null')).toBe(false);
  });

  it('should not match array as object', () => {
    expect(isJsonType([], 'object')).toBe(false);
  });

  it('should not match object as array', () => {
    expect(isJsonType({}, 'array')).toBe(false);
  });

  it('should match primitives', () => {
    expect(isJsonType(42, 'number')).toBe(true);
    expect(isJsonType('str', 'string')).toBe(true);
    expect(isJsonType(true, 'boolean')).toBe(true);
  });
});
