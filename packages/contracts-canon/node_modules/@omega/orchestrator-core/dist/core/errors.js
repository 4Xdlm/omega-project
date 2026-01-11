"use strict";
/**
 * @fileoverview Error codes and types for the Orchestrator.
 * Errors are DATA - structured, serializable, and traceable.
 * @module @omega/orchestrator-core/core/errors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorErrorCode = void 0;
exports.createError = createError;
exports.invalidPlanError = invalidPlanError;
exports.stepFailedError = stepFailedError;
exports.timeoutError = timeoutError;
exports.determinismViolationError = determinismViolationError;
exports.adapterNotFoundError = adapterNotFoundError;
exports.isOrchestratorError = isOrchestratorError;
/**
 * Orchestrator error codes.
 * Format: OMEGA_ORCH_NNN
 */
var OrchestratorErrorCode;
(function (OrchestratorErrorCode) {
    /** Plan validation failed */
    OrchestratorErrorCode["OMEGA_ORCH_INVALID_PLAN"] = "OMEGA_ORCH_001";
    /** Step execution failed */
    OrchestratorErrorCode["OMEGA_ORCH_STEP_FAILED"] = "OMEGA_ORCH_002";
    /** Step execution timed out */
    OrchestratorErrorCode["OMEGA_ORCH_TIMEOUT"] = "OMEGA_ORCH_003";
    /** Determinism violation detected */
    OrchestratorErrorCode["OMEGA_ORCH_DETERMINISM_VIOLATION"] = "OMEGA_ORCH_004";
    /** Adapter not found for step kind */
    OrchestratorErrorCode["OMEGA_ORCH_ADAPTER_NOT_FOUND"] = "OMEGA_ORCH_005";
    /** Invalid run context */
    OrchestratorErrorCode["OMEGA_ORCH_INVALID_CONTEXT"] = "OMEGA_ORCH_006";
    /** Plan already executed */
    OrchestratorErrorCode["OMEGA_ORCH_PLAN_ALREADY_EXECUTED"] = "OMEGA_ORCH_007";
    /** Invalid step configuration */
    OrchestratorErrorCode["OMEGA_ORCH_INVALID_STEP"] = "OMEGA_ORCH_008";
    /** Hook execution failed */
    OrchestratorErrorCode["OMEGA_ORCH_HOOK_FAILED"] = "OMEGA_ORCH_009";
    /** Internal error */
    OrchestratorErrorCode["OMEGA_ORCH_INTERNAL"] = "OMEGA_ORCH_999";
})(OrchestratorErrorCode || (exports.OrchestratorErrorCode = OrchestratorErrorCode = {}));
/**
 * Creates a structured orchestrator error.
 * @param code - Error code
 * @param message - Error message
 * @param timestamp - ISO timestamp
 * @param context - Optional additional context
 * @returns Structured error object
 */
function createError(code, message, timestamp, context) {
    const error = {
        code,
        message,
        timestamp,
    };
    if (context !== undefined) {
        error.context = context;
    }
    return error;
}
/**
 * Creates an invalid plan error.
 * @param message - Validation error message
 * @param timestamp - ISO timestamp
 * @param details - Validation details
 */
function invalidPlanError(message, timestamp, details) {
    return createError(OrchestratorErrorCode.OMEGA_ORCH_INVALID_PLAN, message, timestamp, details);
}
/**
 * Creates a step failed error.
 * @param stepId - ID of failed step
 * @param message - Failure message
 * @param timestamp - ISO timestamp
 * @param cause - Underlying cause
 */
function stepFailedError(stepId, message, timestamp, cause) {
    return createError(OrchestratorErrorCode.OMEGA_ORCH_STEP_FAILED, message, timestamp, { step_id: stepId, cause: String(cause) });
}
/**
 * Creates a timeout error.
 * @param stepId - ID of timed-out step
 * @param timeoutMs - Timeout value in ms
 * @param timestamp - ISO timestamp
 */
function timeoutError(stepId, timeoutMs, timestamp) {
    return createError(OrchestratorErrorCode.OMEGA_ORCH_TIMEOUT, `Step '${stepId}' timed out after ${timeoutMs}ms`, timestamp, { step_id: stepId, timeout_ms: timeoutMs });
}
/**
 * Creates a determinism violation error.
 * @param hash1 - First run hash
 * @param hash2 - Second run hash
 * @param timestamp - ISO timestamp
 */
function determinismViolationError(hash1, hash2, timestamp) {
    return createError(OrchestratorErrorCode.OMEGA_ORCH_DETERMINISM_VIOLATION, 'Determinism violation: identical inputs produced different outputs', timestamp, { hash1, hash2 });
}
/**
 * Creates an adapter not found error.
 * @param kind - Step kind that has no adapter
 * @param timestamp - ISO timestamp
 */
function adapterNotFoundError(kind, timestamp) {
    return createError(OrchestratorErrorCode.OMEGA_ORCH_ADAPTER_NOT_FOUND, `No adapter registered for step kind '${kind}'`, timestamp, { kind });
}
/**
 * Type guard to check if a value is an OrchestratorError.
 * @param value - Value to check
 * @returns true if value is an OrchestratorError
 */
function isOrchestratorError(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const obj = value;
    return (typeof obj.code === 'string' &&
        typeof obj.message === 'string' &&
        typeof obj.timestamp === 'string' &&
        Object.values(OrchestratorErrorCode).includes(obj.code));
}
//# sourceMappingURL=errors.js.map