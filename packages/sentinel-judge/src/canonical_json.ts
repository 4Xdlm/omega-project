/**
 * OMEGA Phase C.1.2 - Canonical JSON (FIXED)
 * Deterministic JSON serialization for hash stability
 * 
 * @module canonical_json
 * @version 1.2.0
 */

import { SentinelJudgeError, ERROR_CODES } from './types.js';

// =============================================================================
// CANONICAL JSON SERIALIZATION
// =============================================================================

/**
 * Recursively sort object keys for deterministic serialization
 */
function sortObject(obj: unknown): unknown {
  if (obj === null) {
    return null;
  }
  
  if (obj === undefined) {
    throw new SentinelJudgeError(
      ERROR_CODES.CANONICAL_02,
      'Cannot serialize undefined value'
    );
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  }

  if (typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortObject((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  // Reject non-serializable types
  if (typeof obj === 'function') {
    throw new SentinelJudgeError(
      ERROR_CODES.CANONICAL_02,
      'Cannot serialize function'
    );
  }
  
  if (typeof obj === 'bigint') {
    throw new SentinelJudgeError(
      ERROR_CODES.CANONICAL_02,
      'Cannot serialize BigInt'
    );
  }
  
  if (typeof obj === 'symbol') {
    throw new SentinelJudgeError(
      ERROR_CODES.CANONICAL_02,
      'Cannot serialize Symbol'
    );
  }

  return obj;
}

/**
 * Serialize object to canonical JSON string
 * - Keys sorted alphabetically at all levels
 * - No whitespace
 * - Deterministic output
 * 
 * Aliases: canonicalStringify (test compatibility)
 */
export function toCanonicalJson(obj: unknown): string {
  const sorted = sortObject(obj);
  return JSON.stringify(sorted);
}

// Alias for test compatibility
export const canonicalStringify = toCanonicalJson;

/**
 * Parse canonical JSON and return sorted object
 * 
 * Aliases: canonicalParse (test compatibility)
 */
export function fromCanonicalJson<T = unknown>(json: string): T {
  try {
    const parsed = JSON.parse(json);
    return sortObject(parsed) as T;
  } catch (error) {
    throw new SentinelJudgeError(
      ERROR_CODES.CANONICAL_01,
      `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Alias for test compatibility
export const canonicalParse = fromCanonicalJson;

/**
 * Compare two values for deep equality after canonical sorting
 */
export function canonicalEquals(a: unknown, b: unknown): boolean {
  return toCanonicalJson(a) === toCanonicalJson(b);
}

/**
 * Create a canonical copy of an object (sorted keys at all levels)
 */
export function canonicalize<T>(obj: T): T {
  return fromCanonicalJson<T>(toCanonicalJson(obj));
}

// =============================================================================
// DETERMINISM VERIFICATION
// =============================================================================

/**
 * Verify that an object serializes deterministically
 * Runs multiple serializations and compares results
 */
export function verifyDeterminism(obj: unknown, iterations: number = 10): boolean {
  const first = toCanonicalJson(obj);
  for (let i = 0; i < iterations; i++) {
    if (toCanonicalJson(obj) !== first) {
      return false;
    }
  }
  return true;
}

/**
 * Get canonical JSON with formatted output for debugging
 */
export function toCanonicalJsonPretty(obj: unknown): string {
  const sorted = sortObject(obj);
  return JSON.stringify(sorted, null, 2);
}
