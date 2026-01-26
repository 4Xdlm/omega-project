/**
 * OMEGA Phase C — Canonical JSON Serialization
 * 
 * Version: 1.0.0
 * Date: 2026-01-26
 * Standard: NASA-Grade L4
 * 
 * Purpose:
 * - Deterministic JSON serialization
 * - Byte-identical output for same input
 * - Recursive key sorting
 * - UTF-8 strict encoding
 */

import { SentinelJudgeError, ERROR_CODES } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL JSON
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recursively sorts object keys alphabetically.
 * Arrays are preserved in order, objects are sorted.
 * 
 * @param value - Any JSON-serializable value
 * @returns Value with all object keys sorted recursively
 */
function sortKeysRecursively(value: unknown): unknown {
  // Null
  if (value === null) {
    return null;
  }
  
  // Array - preserve order, sort each element
  if (Array.isArray(value)) {
    return value.map(sortKeysRecursively);
  }
  
  // Object - sort keys
  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortKeysRecursively((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  
  // Primitives - return as-is
  return value;
}

/**
 * Converts a value to canonical JSON string.
 * 
 * Properties:
 * - Keys are sorted alphabetically at all levels
 * - No whitespace (compact output)
 * - UTF-8 strict encoding
 * - Byte-identical output for same input (regardless of key order)
 * 
 * @param obj - Any JSON-serializable value
 * @returns Canonical JSON string
 * @throws SentinelJudgeError if serialization fails
 */
export function canonicalStringify(obj: unknown): string {
  // Validate input type
  if (obj === undefined) {
    throw new SentinelJudgeError(
      ERROR_CODES.CANONICAL_02,
      'Cannot serialize undefined value',
      { inputType: 'undefined' }
    );
  }
  
  // Handle functions (not JSON-serializable)
  if (typeof obj === 'function') {
    throw new SentinelJudgeError(
      ERROR_CODES.CANONICAL_02,
      'Cannot serialize function',
      { inputType: 'function' }
    );
  }
  
  // Handle BigInt (not JSON-serializable by default)
  if (typeof obj === 'bigint') {
    throw new SentinelJudgeError(
      ERROR_CODES.CANONICAL_02,
      'Cannot serialize BigInt - convert to string first',
      { inputType: 'bigint' }
    );
  }
  
  // Handle Symbol (not JSON-serializable)
  if (typeof obj === 'symbol') {
    throw new SentinelJudgeError(
      ERROR_CODES.CANONICAL_02,
      'Cannot serialize Symbol',
      { inputType: 'symbol' }
    );
  }
  
  try {
    // Sort keys recursively
    const sorted = sortKeysRecursively(obj);
    
    // Serialize to compact JSON (no whitespace)
    return JSON.stringify(sorted);
  } catch (error) {
    throw new SentinelJudgeError(
      ERROR_CODES.CANONICAL_01,
      `Serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: String(error) }
    );
  }
}

/**
 * Parses a canonical JSON string back to an object.
 * 
 * @param json - JSON string to parse
 * @returns Parsed object
 * @throws SentinelJudgeError if parsing fails
 */
export function canonicalParse<T = unknown>(json: string): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    throw new SentinelJudgeError(
      ERROR_CODES.CANONICAL_01,
      `Parse failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: String(error) }
    );
  }
}

/**
 * Checks if two values produce identical canonical JSON.
 * 
 * @param a - First value
 * @param b - Second value
 * @returns true if canonical representations are byte-identical
 */
export function canonicalEquals(a: unknown, b: unknown): boolean {
  return canonicalStringify(a) === canonicalStringify(b);
}
