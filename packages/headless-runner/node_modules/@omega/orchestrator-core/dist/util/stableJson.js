"use strict";
/**
 * @fileoverview Stable JSON serialization with sorted keys.
 * Guarantees identical output for identical data regardless of insertion order.
 * @module @omega/orchestrator-core/util/stableJson
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableStringify = stableStringify;
exports.stableParse = stableParse;
exports.stableEquals = stableEquals;
/**
 * Recursively sorts object keys for stable serialization.
 * @param value - Value to normalize
 * @returns Normalized value with sorted keys
 */
function sortKeys(value) {
    if (value === null || value === undefined) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(sortKeys);
    }
    if (typeof value === 'object' && value !== null) {
        const sorted = {};
        const keys = Object.keys(value).sort();
        for (const key of keys) {
            sorted[key] = sortKeys(value[key]);
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
function stableStringify(value, indent) {
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
function stableParse(json) {
    return JSON.parse(json);
}
/**
 * Compares two values for deep equality using stable JSON comparison.
 * Handles objects with different key insertion orders.
 *
 * @param a - First value
 * @param b - Second value
 * @returns true if values are deeply equal
 */
function stableEquals(a, b) {
    return stableStringify(a) === stableStringify(b);
}
//# sourceMappingURL=stableJson.js.map