/**
 * @fileoverview OMEGA Hardening - Validation Utilities
 * @module @omega/hardening/validate
 *
 * Input validation for security hardening.
 */

import type {
  ValidationResult,
  ValidationRule,
  ValidatorOptions,
  PathValidationResult,
  PathValidationOptions,
} from './types.js';
import {
  isPlainObject,
  isSafeInteger,
  isValidHash,
  hasDangerousKeys,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// STRING VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a string value.
 */
export function validateString(
  value: unknown,
  options: ValidatorOptions = {}
): ValidationResult {
  const errors: string[] = [];

  if (value === null) {
    if (options.allowNull) {
      return { valid: true, errors: [], sanitized: null };
    }
    errors.push('Value cannot be null');
    return { valid: false, errors };
  }

  if (typeof value !== 'string') {
    errors.push(`Expected string, got ${typeof value}`);
    return { valid: false, errors };
  }

  if (options.maxLength && value.length > options.maxLength) {
    errors.push(`String exceeds max length of ${options.maxLength}`);
  }

  if (value.includes('\0')) {
    errors.push('String contains null bytes');
  }

  return { valid: errors.length === 0, errors, sanitized: value };
}

/**
 * Validate a non-empty string.
 */
export function validateNonEmptyString(value: unknown): ValidationResult {
  const result = validateString(value);
  if (!result.valid) {
    return result;
  }

  if ((value as string).trim().length === 0) {
    return {
      valid: false,
      errors: ['String cannot be empty'],
    };
  }

  return { valid: true, errors: [], sanitized: value };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NUMBER VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a number value.
 */
export function validateNumber(
  value: unknown,
  options: { min?: number; max?: number; integer?: boolean } = {}
): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'number') {
    errors.push(`Expected number, got ${typeof value}`);
    return { valid: false, errors };
  }

  if (Number.isNaN(value)) {
    errors.push('Value is NaN');
    return { valid: false, errors };
  }

  if (!Number.isFinite(value)) {
    errors.push('Value is not finite');
    return { valid: false, errors };
  }

  if (options.integer && !Number.isInteger(value)) {
    errors.push('Value must be an integer');
  }

  if (options.min !== undefined && value < options.min) {
    errors.push(`Value must be at least ${options.min}`);
  }

  if (options.max !== undefined && value > options.max) {
    errors.push(`Value must be at most ${options.max}`);
  }

  return { valid: errors.length === 0, errors, sanitized: value };
}

/**
 * Validate a safe integer.
 */
export function validateSafeInteger(value: unknown): ValidationResult {
  if (!isSafeInteger(value)) {
    return {
      valid: false,
      errors: ['Value must be a safe integer'],
    };
  }
  return { valid: true, errors: [], sanitized: value };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBJECT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate an object value.
 */
export function validateObject(
  value: unknown,
  options: ValidatorOptions = {}
): ValidationResult {
  const errors: string[] = [];

  if (value === null) {
    if (options.allowNull) {
      return { valid: true, errors: [], sanitized: null };
    }
    errors.push('Value cannot be null');
    return { valid: false, errors };
  }

  if (!isPlainObject(value)) {
    errors.push('Value must be a plain object');
    return { valid: false, errors };
  }

  // Check for dangerous keys
  if (options.strict && hasDangerousKeys(value)) {
    errors.push('Object contains dangerous keys (__proto__, constructor, prototype)');
  }

  // Check depth
  if (options.maxDepth) {
    const depth = getObjectDepth(value);
    if (depth > options.maxDepth) {
      errors.push(`Object depth ${depth} exceeds max of ${options.maxDepth}`);
    }
  }

  return { valid: errors.length === 0, errors, sanitized: value };
}

/**
 * Get the maximum depth of an object.
 */
function getObjectDepth(value: unknown, current: number = 0): number {
  if (!isPlainObject(value) && !Array.isArray(value)) {
    return current;
  }

  const values = Array.isArray(value) ? value : Object.values(value);
  if (values.length === 0) {
    return current;
  }

  return Math.max(...values.map((v) => getObjectDepth(v, current + 1)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a SHA-256 hash.
 */
export function validateHash(value: unknown): ValidationResult {
  if (!isValidHash(value)) {
    return {
      valid: false,
      errors: ['Value must be a valid SHA-256 hash (64 hex characters)'],
    };
  }
  return { valid: true, errors: [], sanitized: value };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATH VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a file path.
 */
export function validatePath(
  value: unknown,
  options: PathValidationOptions = {}
): PathValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'string') {
    return {
      valid: false,
      normalized: '',
      errors: [`Expected string, got ${typeof value}`],
    };
  }

  // Check max length
  if (options.maxLength && value.length > options.maxLength) {
    errors.push(`Path exceeds max length of ${options.maxLength}`);
  }

  // Check for null bytes
  if (value.includes('\0')) {
    errors.push('Path contains null bytes');
  }

  // Normalize path
  let normalized = value.replace(/\\/g, '/');

  // Check for traversal
  if (!options.allowTraversal && (normalized.includes('..') || normalized.includes('./'))) {
    errors.push('Path contains traversal sequences');
  }

  // Check absolute vs relative
  const isAbsolute = normalized.startsWith('/') || /^[a-z]:/i.test(normalized);

  if (isAbsolute && !options.allowAbsolute) {
    errors.push('Absolute paths not allowed');
  }

  if (!isAbsolute && !options.allowRelative) {
    errors.push('Relative paths not allowed');
  }

  // Check base path constraint
  if (options.basePath && isAbsolute) {
    const normalizedBase = options.basePath.replace(/\\/g, '/');
    if (!normalized.startsWith(normalizedBase)) {
      errors.push(`Path must be within base path: ${options.basePath}`);
    }
  }

  return {
    valid: errors.length === 0,
    normalized,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARRAY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate an array.
 */
export function validateArray(
  value: unknown,
  options: { minLength?: number; maxLength?: number; itemValidator?: (item: unknown) => ValidationResult } = {}
): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(value)) {
    return {
      valid: false,
      errors: [`Expected array, got ${typeof value}`],
    };
  }

  if (options.minLength !== undefined && value.length < options.minLength) {
    errors.push(`Array must have at least ${options.minLength} items`);
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    errors.push(`Array must have at most ${options.maxLength} items`);
  }

  if (options.itemValidator) {
    for (let i = 0; i < value.length; i++) {
      const itemResult = options.itemValidator(value[i]);
      if (!itemResult.valid) {
        errors.push(`Item ${i}: ${itemResult.errors.join(', ')}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, sanitized: value };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE-BASED VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a validator from rules.
 */
export function createValidator<T>(
  rules: readonly ValidationRule<T>[]
): (value: T) => ValidationResult {
  return (value: T) => {
    const errors: string[] = [];

    for (const rule of rules) {
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: value,
    };
  };
}

/**
 * Common validation rules.
 */
export const commonRules = {
  nonEmpty: <T extends { length: number }>(): ValidationRule<T> => ({
    name: 'nonEmpty',
    validate: (value) => value.length > 0,
    message: 'Value cannot be empty',
  }),

  maxLength: <T extends { length: number }>(max: number): ValidationRule<T> => ({
    name: 'maxLength',
    validate: (value) => value.length <= max,
    message: `Value must not exceed ${max} characters`,
  }),

  pattern: (regex: RegExp, description: string): ValidationRule<string> => ({
    name: 'pattern',
    validate: (value) => regex.test(value),
    message: description,
  }),

  range: (min: number, max: number): ValidationRule<number> => ({
    name: 'range',
    validate: (value) => value >= min && value <= max,
    message: `Value must be between ${min} and ${max}`,
  }),
};
