/**
 * @fileoverview Tests for safe JSON utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  safeJsonParse,
  safeJsonStringify,
  getJsonType,
  isJsonType,
  parseFrozenJson,
  deepFreeze,
} from '../../src/index.js';

describe('safeJsonParse', () => {
  it('should parse valid JSON', () => {
    const result = safeJsonParse('{"key": "value"}');
    expect(result.success).toBe(true);
    expect(result.value).toEqual({ key: 'value' });
  });

  it('should reject invalid JSON', () => {
    const result = safeJsonParse('not json');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject __proto__ by default', () => {
    const result = safeJsonParse('{"__proto__": {"polluted": true}}');
    expect(result.success).toBe(false);
    expect(result.error).toContain('__proto__');
  });

  it('should allow __proto__ if configured', () => {
    const result = safeJsonParse('{"key": "value"}', { allowProto: true });
    expect(result.success).toBe(true);
  });

  it('should reject constructor by default', () => {
    const result = safeJsonParse('{"constructor": {"polluted": true}}');
    expect(result.success).toBe(false);
    expect(result.error).toContain('constructor');
  });

  it('should check max length', () => {
    const long = JSON.stringify({ key: 'x'.repeat(1000) });
    const result = safeJsonParse(long, { maxLength: 100 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('maximum length');
  });

  it('should check max depth', () => {
    const deep = '{"a":{"b":{"c":{"d":{"e":{}}}}}}';
    const result = safeJsonParse(deep, { maxDepth: 3 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('depth');
  });

  it('should parse arrays', () => {
    const result = safeJsonParse('[1, 2, 3]');
    expect(result.success).toBe(true);
    expect(result.value).toEqual([1, 2, 3]);
  });

  it('should parse primitives', () => {
    expect(safeJsonParse('"hello"').value).toBe('hello');
    expect(safeJsonParse('42').value).toBe(42);
    expect(safeJsonParse('true').value).toBe(true);
    expect(safeJsonParse('null').value).toBe(null);
  });
});

describe('safeJsonStringify', () => {
  it('should stringify object', () => {
    const result = safeJsonStringify({ key: 'value' });
    expect(result.success).toBe(true);
    expect(result.value).toBe('{"key":"value"}');
  });

  it('should handle deeply nested objects', () => {
    const obj = { a: { b: { c: 1 } } };
    const result = safeJsonStringify(obj);
    expect(result.success).toBe(true);
    expect(result.value).toContain('"c":1');
  });

  it('should support indent', () => {
    const result = safeJsonStringify({ key: 'value' }, { indent: 2 });
    expect(result.success).toBe(true);
    expect(result.value).toContain('\n');
    expect(result.value).toContain('  ');
  });

  it('should check max depth', () => {
    const deep = { a: { b: { c: { d: { e: {} } } } } };
    const result = safeJsonStringify(deep, { maxDepth: 3 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('depth');
  });

  it('should stringify arrays', () => {
    const result = safeJsonStringify([1, 2, 3]);
    expect(result.success).toBe(true);
    expect(result.value).toBe('[1,2,3]');
  });

  it('should stringify primitives', () => {
    expect(safeJsonStringify('hello').value).toBe('"hello"');
    expect(safeJsonStringify(42).value).toBe('42');
    expect(safeJsonStringify(true).value).toBe('true');
    expect(safeJsonStringify(null).value).toBe('null');
  });
});

describe('getJsonType', () => {
  it('should detect string', () => {
    expect(getJsonType('hello')).toBe('string');
  });

  it('should detect number', () => {
    expect(getJsonType(42)).toBe('number');
  });

  it('should detect boolean', () => {
    expect(getJsonType(true)).toBe('boolean');
    expect(getJsonType(false)).toBe('boolean');
  });

  it('should detect null', () => {
    expect(getJsonType(null)).toBe('null');
  });

  it('should detect array', () => {
    expect(getJsonType([1, 2, 3])).toBe('array');
  });

  it('should detect object', () => {
    expect(getJsonType({ key: 'value' })).toBe('object');
  });

  it('should return unknown for other types', () => {
    expect(getJsonType(undefined)).toBe('unknown');
    expect(getJsonType(Symbol())).toBe('unknown');
  });
});

describe('isJsonType', () => {
  it('should check string type', () => {
    expect(isJsonType('hello', 'string')).toBe(true);
    expect(isJsonType(42, 'string')).toBe(false);
  });

  it('should check number type', () => {
    expect(isJsonType(42, 'number')).toBe(true);
    expect(isJsonType('42', 'number')).toBe(false);
  });

  it('should check object type', () => {
    expect(isJsonType({}, 'object')).toBe(true);
    expect(isJsonType([], 'object')).toBe(false);
  });

  it('should check array type', () => {
    expect(isJsonType([], 'array')).toBe(true);
    expect(isJsonType({}, 'array')).toBe(false);
  });
});

describe('parseFrozenJson', () => {
  it('should parse and freeze object', () => {
    const result = parseFrozenJson('{"key": "value"}');
    expect(result.success).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
  });

  it('should freeze nested objects', () => {
    const result = parseFrozenJson('{"a": {"b": {"c": 1}}}');
    expect(result.success).toBe(true);
    expect(Object.isFrozen((result.value as any).a)).toBe(true);
    expect(Object.isFrozen((result.value as any).a.b)).toBe(true);
  });

  it('should freeze arrays', () => {
    const result = parseFrozenJson('[1, 2, 3]');
    expect(result.success).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
  });

  it('should reject dangerous JSON', () => {
    const result = parseFrozenJson('{"__proto__": {}}');
    expect(result.success).toBe(false);
  });
});

describe('deepFreeze', () => {
  it('should freeze simple object', () => {
    const obj = { key: 'value' };
    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
  });

  it('should freeze nested objects', () => {
    const obj = { a: { b: { c: 1 } } };
    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen.a)).toBe(true);
    expect(Object.isFrozen(frozen.a.b)).toBe(true);
  });

  it('should freeze arrays', () => {
    const arr = [1, 2, [3, 4]];
    const frozen = deepFreeze(arr);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen[2])).toBe(true);
  });

  it('should handle primitives', () => {
    expect(deepFreeze('string')).toBe('string');
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze(null)).toBe(null);
  });

  it('should handle mixed content', () => {
    const obj = { arr: [1, { nested: true }], str: 'value' };
    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen.arr)).toBe(true);
    expect(Object.isFrozen(frozen.arr[1])).toBe(true);
  });
});
