/**
 * @fileoverview OMEGA Hardening - Safe JSON Utilities
 * @module @omega/hardening/json
 *
 * Safe JSON parsing with prototype pollution prevention.
 */

import type { SafeJsonResult, SafeJsonOptions } from './types.js';
import { isPlainObject, hasDangerousKeys } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SAFE JSON PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default safe JSON options.
 */
const DEFAULT_OPTIONS: Required<SafeJsonOptions> = {
  maxDepth: 20,
  maxLength: 10_000_000, // 10MB
  allowProto: false,
  allowConstructor: false,
};

/**
 * Safely parse JSON with protection against prototype pollution.
 */
export function safeJsonParse<T = unknown>(
  input: string,
  options: SafeJsonOptions = {}
): SafeJsonResult<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check input length
  if (input.length > opts.maxLength) {
    return {
      success: false,
      value: null,
      error: `Input exceeds maximum length of ${opts.maxLength}`,
    };
  }

  // Quick check for dangerous patterns
  if (!opts.allowProto && input.includes('__proto__')) {
    return {
      success: false,
      value: null,
      error: 'Input contains __proto__ which is not allowed',
    };
  }

  if (!opts.allowConstructor && input.includes('"constructor"')) {
    return {
      success: false,
      value: null,
      error: 'Input contains "constructor" which is not allowed',
    };
  }

  try {
    const parsed = JSON.parse(input);

    // Validate the parsed result
    const validationResult = validateParsedJson(parsed, opts, 0);
    if (!validationResult.valid) {
      return {
        success: false,
        value: null,
        error: validationResult.error,
      };
    }

    return {
      success: true,
      value: parsed as T,
    };
  } catch (e) {
    return {
      success: false,
      value: null,
      error: e instanceof Error ? e.message : 'JSON parse error',
    };
  }
}

/**
 * Validate parsed JSON for security issues.
 */
function validateParsedJson(
  value: unknown,
  options: Required<SafeJsonOptions>,
  depth: number
): { valid: boolean; error?: string } {
  // Check depth
  if (depth > options.maxDepth) {
    return { valid: false, error: `Maximum depth of ${options.maxDepth} exceeded` };
  }

  // Primitives are safe
  if (value === null || value === undefined) {
    return { valid: true };
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return { valid: true };
  }

  // Check arrays
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = validateParsedJson(item, options, depth + 1);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  }

  // Check objects
  if (isPlainObject(value)) {
    // Check for dangerous keys
    if (!options.allowProto || !options.allowConstructor) {
      if (hasDangerousKeys(value)) {
        return { valid: false, error: 'Object contains dangerous keys' };
      }
    }

    // Check each value recursively
    for (const v of Object.values(value)) {
      const result = validateParsedJson(v, options, depth + 1);
      if (!result.valid) {
        return result;
      }
    }

    return { valid: true };
  }

  // Unknown type
  return { valid: false, error: `Unexpected type: ${typeof value}` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFE JSON STRINGIFY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safely stringify JSON with circular reference detection.
 */
export function safeJsonStringify(
  value: unknown,
  options: { indent?: number; maxDepth?: number } = {}
): SafeJsonResult<string> {
  const maxDepth = options.maxDepth ?? 20;
  const seen = new WeakSet();

  function replacer(_key: string, val: unknown): unknown {
    if (val !== null && typeof val === 'object') {
      if (seen.has(val as object)) {
        return '[Circular]';
      }
      seen.add(val as object);
    }
    return val;
  }

  try {
    // Check depth before stringifying
    const depth = getDepth(value, 0, maxDepth + 1);
    if (depth > maxDepth) {
      return {
        success: false,
        value: null,
        error: `Object depth exceeds maximum of ${maxDepth}`,
      };
    }

    const result = JSON.stringify(value, replacer, options.indent);
    return {
      success: true,
      value: result,
    };
  } catch (e) {
    return {
      success: false,
      value: null,
      error: e instanceof Error ? e.message : 'JSON stringify error',
    };
  }
}

/**
 * Get the depth of a value.
 */
function getDepth(value: unknown, current: number, max: number): number {
  if (current > max) {
    return current; // Early exit for performance
  }

  if (value === null || typeof value !== 'object') {
    return current;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return current;
    }
    return Math.max(...value.map((v) => getDepth(v, current + 1, max)));
  }

  const values = Object.values(value as Record<string, unknown>);
  if (values.length === 0) {
    return current;
  }
  return Math.max(...values.map((v) => getDepth(v, current + 1, max)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple type checking for JSON values.
 */
export type JsonType = 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object';

/**
 * Get the JSON type of a value.
 */
export function getJsonType(value: unknown): JsonType | 'unknown' {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (typeof value === 'object') {
    return 'object';
  }
  if (typeof value === 'string') {
    return 'string';
  }
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  return 'unknown';
}

/**
 * Check if value matches expected JSON type.
 */
export function isJsonType(value: unknown, expected: JsonType): boolean {
  return getJsonType(value) === expected;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FROZEN JSON
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse JSON and deeply freeze the result.
 */
export function parseFrozenJson<T = unknown>(input: string): SafeJsonResult<T> {
  const result = safeJsonParse<T>(input);
  if (!result.success || result.value === null) {
    return result;
  }

  const frozen = deepFreeze(result.value) as T;
  return {
    success: true,
    value: frozen,
  };
}

/**
 * Deeply freeze an object.
 */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
  } else {
    for (const v of Object.values(value)) {
      deepFreeze(v);
    }
  }

  return Object.freeze(value);
}
