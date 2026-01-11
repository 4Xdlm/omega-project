/**
 * @fileoverview Stable JSON serialization with sorted keys.
 * Guarantees identical output for identical data regardless of insertion order.
 * @module @omega/orchestrator-core/util/stableJson
 */
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
export declare function stableStringify(value: unknown, indent?: number | string): string;
/**
 * Parses JSON string to object.
 * Wrapper around JSON.parse for consistency.
 *
 * @param json - JSON string to parse
 * @returns Parsed value
 * @throws SyntaxError if JSON is invalid
 */
export declare function stableParse<T = unknown>(json: string): T;
/**
 * Compares two values for deep equality using stable JSON comparison.
 * Handles objects with different key insertion orders.
 *
 * @param a - First value
 * @param b - Second value
 * @returns true if values are deeply equal
 */
export declare function stableEquals(a: unknown, b: unknown): boolean;
//# sourceMappingURL=stableJson.d.ts.map