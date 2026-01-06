/**
 * OMEGA Query Engine — Operators
 * Phase 21 — v3.21.0
 *
 * Operator implementations for fact filtering.
 *
 * Invariants:
 * - INV-QUERY-01: Operators are pure functions (no side effects)
 * - INV-QUERY-02: Null/undefined handling is explicit
 */
import { Operator, type CanonFact, type FactField } from '../types.js';
export declare function getFieldValue(fact: CanonFact, field: FactField): unknown;
declare function stringEquals(actual: unknown, expected: unknown): boolean;
declare function stringNotEquals(actual: unknown, expected: unknown): boolean;
declare function stringContains(actual: unknown, search: unknown): boolean;
declare function stringNotContains(actual: unknown, search: unknown): boolean;
declare function stringStartsWith(actual: unknown, prefix: unknown): boolean;
declare function stringEndsWith(actual: unknown, suffix: unknown): boolean;
declare function stringMatches(actual: unknown, pattern: unknown): boolean;
declare function greaterThan(actual: unknown, threshold: unknown): boolean;
declare function greaterEqual(actual: unknown, threshold: unknown): boolean;
declare function lessThan(actual: unknown, threshold: unknown): boolean;
declare function lessEqual(actual: unknown, threshold: unknown): boolean;
declare function between(actual: unknown, min: unknown, max: unknown): boolean;
declare function exists(actual: unknown): boolean;
declare function notExists(actual: unknown): boolean;
declare function inList(actual: unknown, list: unknown): boolean;
declare function notInList(actual: unknown, list: unknown): boolean;
export declare function applyOperator(operator: Operator, actual: unknown, expected: unknown, expected2?: unknown): boolean;
export declare const operators: {
    stringEquals: typeof stringEquals;
    stringNotEquals: typeof stringNotEquals;
    stringContains: typeof stringContains;
    stringNotContains: typeof stringNotContains;
    stringStartsWith: typeof stringStartsWith;
    stringEndsWith: typeof stringEndsWith;
    stringMatches: typeof stringMatches;
    greaterThan: typeof greaterThan;
    greaterEqual: typeof greaterEqual;
    lessThan: typeof lessThan;
    lessEqual: typeof lessEqual;
    between: typeof between;
    exists: typeof exists;
    notExists: typeof notExists;
    inList: typeof inList;
    notInList: typeof notInList;
};
export {};
//# sourceMappingURL=operators.d.ts.map