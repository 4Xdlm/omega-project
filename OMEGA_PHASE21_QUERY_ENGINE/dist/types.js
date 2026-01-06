/**
 * OMEGA Query Engine — Types
 * Phase 21 — v3.21.0
 *
 * Types for querying the Canon intelligently.
 */
// ═══════════════════════════════════════════════════════════════════════════════
// OPERATOR TYPES
// ═══════════════════════════════════════════════════════════════════════════════
export var Operator;
(function (Operator) {
    // String operators
    Operator["EQUALS"] = "EQUALS";
    Operator["NOT_EQUALS"] = "NOT_EQUALS";
    Operator["CONTAINS"] = "CONTAINS";
    Operator["NOT_CONTAINS"] = "NOT_CONTAINS";
    Operator["STARTS_WITH"] = "STARTS_WITH";
    Operator["ENDS_WITH"] = "ENDS_WITH";
    Operator["MATCHES"] = "MATCHES";
    // Numeric operators (for confidence, parsed values)
    Operator["GREATER_THAN"] = "GREATER_THAN";
    Operator["GREATER_EQUAL"] = "GREATER_EQUAL";
    Operator["LESS_THAN"] = "LESS_THAN";
    Operator["LESS_EQUAL"] = "LESS_EQUAL";
    Operator["BETWEEN"] = "BETWEEN";
    // Existence
    Operator["EXISTS"] = "EXISTS";
    Operator["NOT_EXISTS"] = "NOT_EXISTS";
    // List operators
    Operator["IN"] = "IN";
    Operator["NOT_IN"] = "NOT_IN";
})(Operator || (Operator = {}));
export var LogicalOperator;
(function (LogicalOperator) {
    LogicalOperator["AND"] = "AND";
    LogicalOperator["OR"] = "OR";
    LogicalOperator["NOT"] = "NOT";
})(LogicalOperator || (LogicalOperator = {}));
//# sourceMappingURL=types.js.map