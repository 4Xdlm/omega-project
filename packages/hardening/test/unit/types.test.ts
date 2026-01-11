/**
 * @fileoverview Tests for type guards and constants.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SECURITY_CONTEXT,
  isPlainObject,
  isSafeInteger,
  isNonEmptyString,
  isValidHash,
  hasDangerousKeys,
} from '../../src/index.js';

describe('DEFAULT_SECURITY_CONTEXT', () => {
  it('should have strict mode enabled', () => {
    expect(DEFAULT_SECURITY_CONTEXT.strict).toBe(true);
  });

  it('should have max depth of 10', () => {
    expect(DEFAULT_SECURITY_CONTEXT.maxDepth).toBe(10);
  });

  it('should have max length of 1 million', () => {
    expect(DEFAULT_SECURITY_CONTEXT.maxLength).toBe(1_000_000);
  });

  it('should only allow https by default', () => {
    expect(DEFAULT_SECURITY_CONTEXT.allowedProtocols).toContain('https');
    expect(DEFAULT_SECURITY_CONTEXT.allowedProtocols.length).toBe(1);
  });

  it('should have blocked patterns', () => {
    expect(DEFAULT_SECURITY_CONTEXT.blockedPatterns.length).toBeGreaterThan(0);
  });
});

describe('isPlainObject', () => {
  it('should return true for plain object', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ key: 'value' })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it('should return false for array', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2, 3])).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isPlainObject('string')).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });

  it('should return false for class instances', () => {
    expect(isPlainObject(new Date())).toBe(false);
    expect(isPlainObject(/regex/)).toBe(false);
  });

  it('should return true for Object.create(null)', () => {
    expect(isPlainObject(Object.create(null))).toBe(true);
  });
});

describe('isSafeInteger', () => {
  it('should return true for safe integers', () => {
    expect(isSafeInteger(0)).toBe(true);
    expect(isSafeInteger(42)).toBe(true);
    expect(isSafeInteger(-100)).toBe(true);
    expect(isSafeInteger(Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(isSafeInteger(Number.MIN_SAFE_INTEGER)).toBe(true);
  });

  it('should return false for floats', () => {
    expect(isSafeInteger(3.14)).toBe(false);
    expect(isSafeInteger(0.1)).toBe(false);
  });

  it('should return false for non-numbers', () => {
    expect(isSafeInteger('42')).toBe(false);
    expect(isSafeInteger(null)).toBe(false);
    expect(isSafeInteger(undefined)).toBe(false);
  });

  it('should return false for unsafe integers', () => {
    expect(isSafeInteger(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    expect(isSafeInteger(Number.MIN_SAFE_INTEGER - 1)).toBe(false);
  });

  it('should return false for NaN and Infinity', () => {
    expect(isSafeInteger(NaN)).toBe(false);
    expect(isSafeInteger(Infinity)).toBe(false);
    expect(isSafeInteger(-Infinity)).toBe(false);
  });
});

describe('isNonEmptyString', () => {
  it('should return true for non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString(' ')).toBe(true);
    expect(isNonEmptyString('a')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isNonEmptyString('')).toBe(false);
  });

  it('should return false for non-strings', () => {
    expect(isNonEmptyString(42)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(['a'])).toBe(false);
  });
});

describe('isValidHash', () => {
  it('should return true for valid SHA-256 hash', () => {
    const hash = 'a'.repeat(64);
    expect(isValidHash(hash)).toBe(true);
  });

  it('should return true for mixed hex characters', () => {
    const hash = 'abc123def456'.padEnd(64, '0');
    expect(isValidHash(hash)).toBe(true);
  });

  it('should return false for short hash', () => {
    expect(isValidHash('a'.repeat(63))).toBe(false);
  });

  it('should return false for long hash', () => {
    expect(isValidHash('a'.repeat(65))).toBe(false);
  });

  it('should return false for invalid characters', () => {
    expect(isValidHash('g'.repeat(64))).toBe(false);
    expect(isValidHash('G'.repeat(64))).toBe(false);
    expect(isValidHash('!'.repeat(64))).toBe(false);
  });

  it('should return false for uppercase hex', () => {
    expect(isValidHash('A'.repeat(64))).toBe(false);
  });

  it('should return false for non-strings', () => {
    expect(isValidHash(null)).toBe(false);
    expect(isValidHash(undefined)).toBe(false);
    expect(isValidHash(42)).toBe(false);
  });
});

describe('hasDangerousKeys', () => {
  it('should return true for constructor key', () => {
    // Note: { __proto__: {} } sets prototype, doesn't create a key
    // Use Object.create to test actual key presence
    const obj = Object.create(null);
    obj.constructor = {};
    expect(hasDangerousKeys(obj)).toBe(true);
  });

  it('should return true for prototype key', () => {
    const obj = Object.create(null);
    obj.prototype = {};
    expect(hasDangerousKeys(obj)).toBe(true);
  });

  it('should return true for __proto__ as actual key', () => {
    // Use Object.defineProperty to create actual __proto__ key
    const obj: Record<string, unknown> = {};
    Object.defineProperty(obj, '__proto__', {
      value: {},
      enumerable: true,
      configurable: true,
    });
    expect(hasDangerousKeys(obj)).toBe(true);
  });

  it('should return false for safe objects', () => {
    expect(hasDangerousKeys({})).toBe(false);
    expect(hasDangerousKeys({ key: 'value' })).toBe(false);
    expect(hasDangerousKeys({ a: 1, b: 2, c: 3 })).toBe(false);
  });

  it('should return true for mixed dangerous keys', () => {
    const obj = { safe: 'value', constructor: {} };
    expect(hasDangerousKeys(obj)).toBe(true);
  });
});
