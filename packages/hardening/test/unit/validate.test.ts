/**
 * @fileoverview Tests for validation utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  validateString,
  validateNonEmptyString,
  validateNumber,
  validateSafeInteger,
  validateObject,
  validateHash,
  validatePath,
  validateArray,
  createValidator,
  commonRules,
} from '../../src/index.js';

describe('validateString', () => {
  it('should validate string', () => {
    const result = validateString('hello');
    expect(result.valid).toBe(true);
  });

  it('should reject non-string', () => {
    const result = validateString(123);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Expected string');
  });

  it('should reject null by default', () => {
    const result = validateString(null);
    expect(result.valid).toBe(false);
  });

  it('should allow null if configured', () => {
    const result = validateString(null, { allowNull: true });
    expect(result.valid).toBe(true);
  });

  it('should check max length', () => {
    const result = validateString('hello world', { maxLength: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('max length');
  });

  it('should detect null bytes', () => {
    const result = validateString('hello\0world');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('null bytes');
  });
});

describe('validateNonEmptyString', () => {
  it('should validate non-empty string', () => {
    const result = validateNonEmptyString('hello');
    expect(result.valid).toBe(true);
  });

  it('should reject empty string', () => {
    const result = validateNonEmptyString('');
    expect(result.valid).toBe(false);
  });

  it('should reject whitespace-only string', () => {
    const result = validateNonEmptyString('   ');
    expect(result.valid).toBe(false);
  });
});

describe('validateNumber', () => {
  it('should validate number', () => {
    const result = validateNumber(42);
    expect(result.valid).toBe(true);
  });

  it('should reject non-number', () => {
    const result = validateNumber('42');
    expect(result.valid).toBe(false);
  });

  it('should reject NaN', () => {
    const result = validateNumber(NaN);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('NaN');
  });

  it('should reject Infinity', () => {
    const result = validateNumber(Infinity);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not finite');
  });

  it('should check min', () => {
    const result = validateNumber(5, { min: 10 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('at least 10');
  });

  it('should check max', () => {
    const result = validateNumber(15, { max: 10 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('at most 10');
  });

  it('should check integer', () => {
    const result = validateNumber(3.14, { integer: true });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('integer');
  });
});

describe('validateSafeInteger', () => {
  it('should validate safe integer', () => {
    const result = validateSafeInteger(42);
    expect(result.valid).toBe(true);
  });

  it('should reject float', () => {
    const result = validateSafeInteger(3.14);
    expect(result.valid).toBe(false);
  });

  it('should reject unsafe integer', () => {
    const result = validateSafeInteger(Number.MAX_SAFE_INTEGER + 1);
    expect(result.valid).toBe(false);
  });
});

describe('validateObject', () => {
  it('should validate plain object', () => {
    const result = validateObject({ key: 'value' });
    expect(result.valid).toBe(true);
  });

  it('should reject null by default', () => {
    const result = validateObject(null);
    expect(result.valid).toBe(false);
  });

  it('should allow null if configured', () => {
    const result = validateObject(null, { allowNull: true });
    expect(result.valid).toBe(true);
  });

  it('should reject non-plain object', () => {
    const result = validateObject(new Date());
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('plain object');
  });

  it('should detect dangerous keys in strict mode', () => {
    // Use constructor key since { __proto__: {} } sets prototype, doesn't create key
    const result = validateObject({ constructor: {} }, { strict: true });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('dangerous keys');
  });

  it('should check max depth', () => {
    const deep = { a: { b: { c: { d: {} } } } };
    const result = validateObject(deep, { maxDepth: 2 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('depth');
  });
});

describe('validateHash', () => {
  it('should validate valid SHA-256 hash', () => {
    const hash = 'a'.repeat(64);
    const result = validateHash(hash);
    expect(result.valid).toBe(true);
  });

  it('should reject short hash', () => {
    const result = validateHash('a'.repeat(63));
    expect(result.valid).toBe(false);
  });

  it('should reject long hash', () => {
    const result = validateHash('a'.repeat(65));
    expect(result.valid).toBe(false);
  });

  it('should reject invalid characters', () => {
    const hash = 'g'.repeat(64);
    const result = validateHash(hash);
    expect(result.valid).toBe(false);
  });

  it('should reject uppercase', () => {
    const hash = 'A'.repeat(64);
    const result = validateHash(hash);
    expect(result.valid).toBe(false);
  });
});

describe('validatePath', () => {
  it('should validate simple path', () => {
    const result = validatePath('file.txt', { allowRelative: true });
    expect(result.valid).toBe(true);
  });

  it('should detect null bytes', () => {
    const result = validatePath('file\0.txt', { allowRelative: true });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('null bytes');
  });

  it('should detect traversal', () => {
    const result = validatePath('../etc/passwd', { allowRelative: true });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('traversal');
  });

  it('should allow traversal if configured', () => {
    const result = validatePath('../file.txt', { allowRelative: true, allowTraversal: true });
    expect(result.valid).toBe(true);
  });

  it('should reject absolute paths by default', () => {
    const result = validatePath('/etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Absolute paths not allowed');
  });

  it('should allow absolute paths if configured', () => {
    const result = validatePath('/etc/passwd', { allowAbsolute: true });
    expect(result.valid).toBe(true);
  });

  it('should check base path', () => {
    const result = validatePath('/home/other/file', {
      allowAbsolute: true,
      basePath: '/home/user',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('base path');
  });
});

describe('validateArray', () => {
  it('should validate array', () => {
    const result = validateArray([1, 2, 3]);
    expect(result.valid).toBe(true);
  });

  it('should reject non-array', () => {
    const result = validateArray('not array');
    expect(result.valid).toBe(false);
  });

  it('should check min length', () => {
    const result = validateArray([1], { minLength: 2 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('at least 2');
  });

  it('should check max length', () => {
    const result = validateArray([1, 2, 3], { maxLength: 2 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('at most 2');
  });

  it('should validate items', () => {
    const result = validateArray(['a', 'b', 123], {
      itemValidator: (item) => validateString(item),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Item 2'))).toBe(true);
  });
});

describe('createValidator', () => {
  it('should create validator from rules', () => {
    const validate = createValidator<string>([
      commonRules.nonEmpty(),
      commonRules.maxLength(10),
    ]);

    expect(validate('hello').valid).toBe(true);
    expect(validate('').valid).toBe(false);
    expect(validate('very long string').valid).toBe(false);
  });

  it('should collect all errors', () => {
    const validate = createValidator<string>([
      commonRules.nonEmpty(),
      commonRules.pattern(/^[a-z]+$/, 'Must be lowercase letters'),
    ]);

    const result = validate('');
    expect(result.errors.length).toBe(2);
  });
});

describe('commonRules', () => {
  it('nonEmpty should check for empty values', () => {
    const rule = commonRules.nonEmpty<string>();
    expect(rule.validate('hello')).toBe(true);
    expect(rule.validate('')).toBe(false);
  });

  it('maxLength should check length', () => {
    const rule = commonRules.maxLength<string>(5);
    expect(rule.validate('hello')).toBe(true);
    expect(rule.validate('hello world')).toBe(false);
  });

  it('pattern should check regex', () => {
    const rule = commonRules.pattern(/^[0-9]+$/, 'Must be digits');
    expect(rule.validate('123')).toBe(true);
    expect(rule.validate('abc')).toBe(false);
  });

  it('range should check min/max', () => {
    const rule = commonRules.range(1, 10);
    expect(rule.validate(5)).toBe(true);
    expect(rule.validate(0)).toBe(false);
    expect(rule.validate(11)).toBe(false);
  });
});
