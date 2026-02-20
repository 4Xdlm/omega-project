/**
 * OMEGA Canon Semantic Equals v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * INVARIANTS:
 * - INV-E-SEMANTIC-01: semanticEquals via canonical
 * - INV-E-SEMANTIC-02: Gère BigInt, objects, null
 * - INV-E-NAN-01: NaN détecté = INVALID_VALUE_NAN
 * - INV-E-CANONICAL-03: undefined → null
 *
 * RÈGLES:
 * - INT-E-07: 0 comparaison !== brute pour sémantique
 * - INT-E-08: 0 valeur NaN
 * - R21: semanticEquals obligatoire
 *
 * SPEC: CANON_SCHEMA_SPEC v1.2 §3.8
 */

import { canonicalize } from '../shared/canonical';

// ═══════════════════════════════════════════════════════════════════════════════
// NAN DETECTION (INV-E-NAN-01)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recursively detects NaN in a value structure.
 *
 * INV-E-NAN-01: NaN in canon = Guard FAIL
 *
 * @param value - Value to check for NaN
 * @returns true if NaN is found anywhere in the structure
 */
export function containsNaN(value: unknown): boolean {
  // Direct NaN check
  if (typeof value === 'number' && Number.isNaN(value)) {
    return true;
  }

  // Array recursion
  if (Array.isArray(value)) {
    return value.some(containsNaN);
  }

  // Object recursion
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some(containsNaN);
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNDEFINED NORMALIZATION (INV-E-CANONICAL-03)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recursively normalizes undefined to null.
 *
 * INV-E-CANONICAL-03: undefined → null in all serialization
 *
 * @param value - Value to normalize
 * @returns Value with all undefined replaced by null
 */
export function normalizeUndefined(value: unknown): unknown {
  // undefined → null
  if (value === undefined) {
    return null;
  }

  // Array recursion
  if (Array.isArray(value)) {
    return value.map(normalizeUndefined);
  }

  // Object recursion
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = normalizeUndefined(val);
    }
    return result;
  }

  return value;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC EQUALS (INV-E-SEMANTIC-01, INV-E-SEMANTIC-02)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compares two values semantically via canonical JSON.
 *
 * CRITICAL: This function MUST be used for all semantic comparisons.
 * Using !== directly for object/array comparison is FORBIDDEN (INT-E-07).
 *
 * INV-E-SEMANTIC-01: Comparison via canonicalize
 * INV-E-SEMANTIC-02: Handles BigInt, objects, null/undefined
 *
 * @param a - First value
 * @param b - Second value
 * @returns true if values are semantically equal
 * @throws Error if either value contains NaN (INV-E-NAN-01)
 */
export function semanticEquals(a: unknown, b: unknown): boolean {
  // NaN check - FAIL immédiat (INV-E-NAN-01)
  if (containsNaN(a)) {
    throw new Error('INVALID_VALUE_NAN: NaN forbidden in CANON (value a)');
  }
  if (containsNaN(b)) {
    throw new Error('INVALID_VALUE_NAN: NaN forbidden in CANON (value b)');
  }

  // BigInt special case - cannot be serialized to JSON directly
  // but needs semantic comparison
  if (typeof a === 'bigint' && typeof b === 'bigint') {
    return a === b;
  }

  // Mixed bigint/non-bigint - never equal
  if (typeof a === 'bigint' || typeof b === 'bigint') {
    return false;
  }

  // Null/undefined normalization (INV-E-CANONICAL-03)
  // null and undefined are treated as semantically equivalent
  if (a === null || a === undefined) {
    return b === null || b === undefined;
  }
  if (b === null || b === undefined) {
    return false; // a is not null/undefined at this point
  }

  // Primitive comparison for non-object types
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  // Object/Array comparison via canonical JSON
  // Normalize undefined → null before canonicalization
  const normalizedA = normalizeUndefined(a);
  const normalizedB = normalizeUndefined(b);

  return canonicalize(normalizedA) === canonicalize(normalizedB);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates that a value does not contain NaN.
 *
 * @param value - Value to validate
 * @throws Error if value contains NaN
 */
export function assertNoNaN(value: unknown): void {
  if (containsNaN(value)) {
    throw new Error('INVALID_VALUE_NAN: NaN forbidden in CANON');
  }
}

/**
 * Normalizes a value for canonical serialization.
 * - Converts undefined to null
 * - Throws if NaN is detected
 *
 * @param value - Value to normalize
 * @returns Normalized value safe for canonicalization
 * @throws Error if value contains NaN
 */
export function normalizeForCanon(value: unknown): unknown {
  assertNoNaN(value);
  return normalizeUndefined(value);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL WITH UNDEFINED SUPPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canonicalizes a value with automatic undefined → null normalization.
 *
 * This wraps the shared canonicalize function to support undefined values,
 * which the base function rejects.
 *
 * @param value - Value to canonicalize
 * @returns Canonical JSON string
 * @throws Error if value contains NaN
 */
export function canonicalizeWithUndefined(value: unknown): string {
  const normalized = normalizeForCanon(value);
  return canonicalize(normalized);
}
