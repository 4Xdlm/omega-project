/**
 * @fileoverview Stable JSON serialization with sorted keys.
 * Guarantees identical output for identical data regardless of insertion order.
 * @module @omega/orchestrator-core/util/stableJson
 */

/**
 * Recursively sorts object keys for stable serialization.
 * @param value - Value to normalize
 * @returns Normalized value with sorted keys
 */
function sortKeys(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (typeof value === 'object' && value !== null) {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value;
}

/**
 * Serializes a value to JSON with sorted keys for deterministic output.
 * Guarantees that objects with the same data produce identical strings
 * regardless of property insertion order.
 *
 * @param value - Value to serialize (must be JSON-serializable)
 * @param indent - Optional indentation (number of spaces or string)
 * @returns JSON string with sorted keys
 *
 * @example
 * ```typescript
 * const a = { b: 1, a: 2 };
 * const b = { a: 2, b: 1 };
 * stableStringify(a) === stableStringify(b) // true: '{"a":2,"b":1}'
 * ```
 */
export function stableStringify(value: unknown, indent?: number | string): string {
  const sorted = sortKeys(value);
  return JSON.stringify(sorted, null, indent);
}

/**
 * Parses JSON string to object.
 * Wrapper around JSON.parse for consistency.
 *
 * @param json - JSON string to parse
 * @returns Parsed value
 * @throws SyntaxError if JSON is invalid
 */
export function stableParse<T = unknown>(json: string): T {
  return JSON.parse(json) as T;
}

/**
 * Compares two values for deep equality using stable JSON comparison.
 * Handles objects with different key insertion orders.
 *
 * @param a - First value
 * @param b - Second value
 * @returns true if values are deeply equal
 */
export function stableEquals(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}
