/**
 * OMEGA CONFLICT_RESOLVER — Types
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 */
/** Codes d'erreur */
export var ResolverErrorCode;
(function (ResolverErrorCode) {
    // Validation
    ResolverErrorCode["INVALID_CATEGORY"] = "INVALID_CATEGORY";
    ResolverErrorCode["INVALID_PARTY"] = "INVALID_PARTY";
    ResolverErrorCode["INVALID_STRATEGY"] = "INVALID_STRATEGY";
    // Conflict errors
    ResolverErrorCode["CONFLICT_NOT_FOUND"] = "CONFLICT_NOT_FOUND";
    ResolverErrorCode["CONFLICT_ALREADY_RESOLVED"] = "CONFLICT_ALREADY_RESOLVED";
    ResolverErrorCode["MAX_CONFLICTS_EXCEEDED"] = "MAX_CONFLICTS_EXCEEDED";
    // Resolution errors
    ResolverErrorCode["CANNOT_AUTO_RESOLVE"] = "CANNOT_AUTO_RESOLVE";
    ResolverErrorCode["REQUIRES_USER_INPUT"] = "REQUIRES_USER_INPUT";
    // System
    ResolverErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(ResolverErrorCode || (ResolverErrorCode = {}));
//# sourceMappingURL=types.js.map