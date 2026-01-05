/**
 * OMEGA CANON_CORE — Types
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 */
/** Codes d'erreur du CANON */
export var CanonErrorCode;
(function (CanonErrorCode) {
    // Validation errors
    CanonErrorCode["INVALID_SUBJECT"] = "INVALID_SUBJECT";
    CanonErrorCode["INVALID_PREDICATE"] = "INVALID_PREDICATE";
    CanonErrorCode["INVALID_VALUE"] = "INVALID_VALUE";
    CanonErrorCode["INVALID_TYPE"] = "INVALID_TYPE";
    CanonErrorCode["INVALID_SOURCE"] = "INVALID_SOURCE";
    // Limit errors
    CanonErrorCode["SUBJECT_TOO_LONG"] = "SUBJECT_TOO_LONG";
    CanonErrorCode["PREDICATE_TOO_LONG"] = "PREDICATE_TOO_LONG";
    CanonErrorCode["VALUE_TOO_LONG"] = "VALUE_TOO_LONG";
    CanonErrorCode["MAX_FACTS_EXCEEDED"] = "MAX_FACTS_EXCEEDED";
    CanonErrorCode["MAX_VERSIONS_EXCEEDED"] = "MAX_VERSIONS_EXCEEDED";
    // Operation errors
    CanonErrorCode["FACT_NOT_FOUND"] = "FACT_NOT_FOUND";
    CanonErrorCode["FACT_ALREADY_EXISTS"] = "FACT_ALREADY_EXISTS";
    CanonErrorCode["FACT_ARCHIVED"] = "FACT_ARCHIVED";
    CanonErrorCode["FACT_DELETED"] = "FACT_DELETED";
    CanonErrorCode["CONFLICT_UNRESOLVED"] = "CONFLICT_UNRESOLVED";
    // Integrity errors
    CanonErrorCode["HASH_MISMATCH"] = "HASH_MISMATCH";
    CanonErrorCode["CHAIN_BROKEN"] = "CHAIN_BROKEN";
    CanonErrorCode["SNAPSHOT_INVALID"] = "SNAPSHOT_INVALID";
    // System errors
    CanonErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(CanonErrorCode || (CanonErrorCode = {}));
//# sourceMappingURL=types.js.map