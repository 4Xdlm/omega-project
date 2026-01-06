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
import { Operator } from '../types.js';
// ═══════════════════════════════════════════════════════════════════════════════
// FIELD ACCESSOR
// ═══════════════════════════════════════════════════════════════════════════════
export function getFieldValue(fact, field) {
    switch (field) {
        case 'subject': return fact.subject;
        case 'predicate': return fact.predicate;
        case 'value': return fact.value;
        case 'source': return fact.source;
        case 'confidence': return fact.confidence;
        case 'createdAt': return fact.createdAt;
        case 'id': return fact.id;
        case 'hash': return fact.hash;
        default: return undefined;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// STRING OPERATORS
// ═══════════════════════════════════════════════════════════════════════════════
function stringEquals(actual, expected) {
    if (actual === null || actual === undefined)
        return false;
    return String(actual).toLowerCase() === String(expected).toLowerCase();
}
function stringNotEquals(actual, expected) {
    return !stringEquals(actual, expected);
}
function stringContains(actual, search) {
    if (actual === null || actual === undefined)
        return false;
    return String(actual).toLowerCase().includes(String(search).toLowerCase());
}
function stringNotContains(actual, search) {
    return !stringContains(actual, search);
}
function stringStartsWith(actual, prefix) {
    if (actual === null || actual === undefined)
        return false;
    return String(actual).toLowerCase().startsWith(String(prefix).toLowerCase());
}
function stringEndsWith(actual, suffix) {
    if (actual === null || actual === undefined)
        return false;
    return String(actual).toLowerCase().endsWith(String(suffix).toLowerCase());
}
function stringMatches(actual, pattern) {
    if (actual === null || actual === undefined)
        return false;
    try {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(String(pattern), 'i');
        return regex.test(String(actual));
    }
    catch {
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// NUMERIC OPERATORS
// ═══════════════════════════════════════════════════════════════════════════════
function toNumber(value) {
    if (value === null || value === undefined)
        return null;
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return isNaN(num) ? null : num;
}
function greaterThan(actual, threshold) {
    const a = toNumber(actual);
    const b = toNumber(threshold);
    if (a === null || b === null)
        return false;
    return a > b;
}
function greaterEqual(actual, threshold) {
    const a = toNumber(actual);
    const b = toNumber(threshold);
    if (a === null || b === null)
        return false;
    return a >= b;
}
function lessThan(actual, threshold) {
    const a = toNumber(actual);
    const b = toNumber(threshold);
    if (a === null || b === null)
        return false;
    return a < b;
}
function lessEqual(actual, threshold) {
    const a = toNumber(actual);
    const b = toNumber(threshold);
    if (a === null || b === null)
        return false;
    return a <= b;
}
function between(actual, min, max) {
    const a = toNumber(actual);
    const minVal = toNumber(min);
    const maxVal = toNumber(max);
    if (a === null || minVal === null || maxVal === null)
        return false;
    return a >= minVal && a <= maxVal;
}
// ═══════════════════════════════════════════════════════════════════════════════
// EXISTENCE OPERATORS
// ═══════════════════════════════════════════════════════════════════════════════
function exists(actual) {
    return actual !== null && actual !== undefined && String(actual).trim() !== '';
}
function notExists(actual) {
    return !exists(actual);
}
// ═══════════════════════════════════════════════════════════════════════════════
// LIST OPERATORS
// ═══════════════════════════════════════════════════════════════════════════════
function inList(actual, list) {
    if (!Array.isArray(list))
        return false;
    const actualStr = String(actual).toLowerCase();
    return list.some(item => String(item).toLowerCase() === actualStr);
}
function notInList(actual, list) {
    return !inList(actual, list);
}
// ═══════════════════════════════════════════════════════════════════════════════
// OPERATOR DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════
export function applyOperator(operator, actual, expected, expected2) {
    switch (operator) {
        // String
        case Operator.EQUALS:
            return stringEquals(actual, expected);
        case Operator.NOT_EQUALS:
            return stringNotEquals(actual, expected);
        case Operator.CONTAINS:
            return stringContains(actual, expected);
        case Operator.NOT_CONTAINS:
            return stringNotContains(actual, expected);
        case Operator.STARTS_WITH:
            return stringStartsWith(actual, expected);
        case Operator.ENDS_WITH:
            return stringEndsWith(actual, expected);
        case Operator.MATCHES:
            return stringMatches(actual, expected);
        // Numeric
        case Operator.GREATER_THAN:
            return greaterThan(actual, expected);
        case Operator.GREATER_EQUAL:
            return greaterEqual(actual, expected);
        case Operator.LESS_THAN:
            return lessThan(actual, expected);
        case Operator.LESS_EQUAL:
            return lessEqual(actual, expected);
        case Operator.BETWEEN:
            return between(actual, expected, expected2);
        // Existence
        case Operator.EXISTS:
            return exists(actual);
        case Operator.NOT_EXISTS:
            return notExists(actual);
        // List
        case Operator.IN:
            return inList(actual, expected);
        case Operator.NOT_IN:
            return notInList(actual, expected);
        default:
            return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
export const operators = {
    stringEquals,
    stringNotEquals,
    stringContains,
    stringNotContains,
    stringStartsWith,
    stringEndsWith,
    stringMatches,
    greaterThan,
    greaterEqual,
    lessThan,
    lessEqual,
    between,
    exists,
    notExists,
    inList,
    notInList,
};
//# sourceMappingURL=operators.js.map