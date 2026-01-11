/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — ERROR CONTRACTS
 * Version: 0.1.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Error definitions and factory functions for NEXUS DEP.
 * All errors include source tracing for debugging.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
// ═══════════════════════════════════════════════════════════════════════════════
// ERROR FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Create a NEXUS error with timestamp
 */
export function createNexusError(code, message, source) {
    return Object.freeze({
        code,
        message,
        source,
        timestamp: new Date().toISOString()
    });
}
// ═══════════════════════════════════════════════════════════════════════════════
// SPECIFIC ERROR FACTORIES
// ═══════════════════════════════════════════════════════════════════════════════
export function validationError(message, source) {
    return createNexusError("VALIDATION_FAILED", message, source);
}
export function adapterError(adapter, operation, details) {
    return createNexusError("ADAPTER_ERROR", `${adapter}.${operation}: ${details}`, adapter);
}
export function timeoutError(operation, timeoutMs) {
    return createNexusError("TIMEOUT", `Operation '${operation}' timed out after ${timeoutMs}ms`, operation);
}
export function determinismViolation(expected, actual, source) {
    return createNexusError("DETERMINISM_VIOLATION", `Expected hash ${expected}, got ${actual}`, source);
}
export function sanctuaryAccessDenied(sanctuary, operation) {
    return createNexusError("SANCTUARY_ACCESS_DENIED", `Write operation '${operation}' forbidden on sanctuary '${sanctuary}'`, sanctuary);
}
export function unknownOperationError(operation) {
    return createNexusError("UNKNOWN_OPERATION", `Unknown operation type: ${operation}`, "router");
}
// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CODES CATALOG
// ═══════════════════════════════════════════════════════════════════════════════
export const ERROR_CATALOG = {
    VALIDATION_FAILED: "Input validation failed",
    ADAPTER_ERROR: "Adapter operation failed",
    TIMEOUT: "Operation timed out",
    DETERMINISM_VIOLATION: "Determinism check failed",
    SANCTUARY_ACCESS_DENIED: "Write access to sanctuary denied",
    UNKNOWN_OPERATION: "Operation type not recognized"
};
// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CLASS (Optional typed errors)
// ═══════════════════════════════════════════════════════════════════════════════
export class NexusOperationError extends Error {
    nexusError;
    constructor(error) {
        super(error.message);
        this.name = "NexusOperationError";
        this.nexusError = error;
        Object.freeze(this);
    }
    toJSON() {
        return this.nexusError;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════
export function isNexusOperationError(err) {
    return err instanceof NexusOperationError;
}
export function extractNexusError(err) {
    if (isNexusOperationError(err)) {
        return err.nexusError;
    }
    // Check if it's already a NexusError object
    if (isNexusErrorObject(err)) {
        return err;
    }
    if (err instanceof Error) {
        return createNexusError("ADAPTER_ERROR", err.message, err.name);
    }
    return createNexusError("ADAPTER_ERROR", String(err), "unknown");
}
/**
 * Check if an object is a NexusError (duck typing)
 */
function isNexusErrorObject(obj) {
    return (typeof obj === "object" &&
        obj !== null &&
        "code" in obj &&
        "message" in obj &&
        "timestamp" in obj &&
        typeof obj.code === "string" &&
        typeof obj.message === "string" &&
        typeof obj.timestamp === "string");
}
//# sourceMappingURL=errors.js.map