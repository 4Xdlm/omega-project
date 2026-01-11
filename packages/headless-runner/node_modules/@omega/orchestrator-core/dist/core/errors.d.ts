/**
 * @fileoverview Error codes and types for the Orchestrator.
 * Errors are DATA - structured, serializable, and traceable.
 * @module @omega/orchestrator-core/core/errors
 */
/**
 * Orchestrator error codes.
 * Format: OMEGA_ORCH_NNN
 */
export declare enum OrchestratorErrorCode {
    /** Plan validation failed */
    OMEGA_ORCH_INVALID_PLAN = "OMEGA_ORCH_001",
    /** Step execution failed */
    OMEGA_ORCH_STEP_FAILED = "OMEGA_ORCH_002",
    /** Step execution timed out */
    OMEGA_ORCH_TIMEOUT = "OMEGA_ORCH_003",
    /** Determinism violation detected */
    OMEGA_ORCH_DETERMINISM_VIOLATION = "OMEGA_ORCH_004",
    /** Adapter not found for step kind */
    OMEGA_ORCH_ADAPTER_NOT_FOUND = "OMEGA_ORCH_005",
    /** Invalid run context */
    OMEGA_ORCH_INVALID_CONTEXT = "OMEGA_ORCH_006",
    /** Plan already executed */
    OMEGA_ORCH_PLAN_ALREADY_EXECUTED = "OMEGA_ORCH_007",
    /** Invalid step configuration */
    OMEGA_ORCH_INVALID_STEP = "OMEGA_ORCH_008",
    /** Hook execution failed */
    OMEGA_ORCH_HOOK_FAILED = "OMEGA_ORCH_009",
    /** Internal error */
    OMEGA_ORCH_INTERNAL = "OMEGA_ORCH_999"
}
/**
 * Structured orchestrator error.
 * Errors are data, not exceptions - fully serializable and traceable.
 */
export interface OrchestratorError {
    /** Error code */
    code: OrchestratorErrorCode;
    /** Human-readable message */
    message: string;
    /** Additional context (must be JSON-serializable) */
    context?: Record<string, unknown>;
    /** Timestamp when error occurred (ISO) */
    timestamp: string;
}
/**
 * Creates a structured orchestrator error.
 * @param code - Error code
 * @param message - Error message
 * @param timestamp - ISO timestamp
 * @param context - Optional additional context
 * @returns Structured error object
 */
export declare function createError(code: OrchestratorErrorCode, message: string, timestamp: string, context?: Record<string, unknown>): OrchestratorError;
/**
 * Creates an invalid plan error.
 * @param message - Validation error message
 * @param timestamp - ISO timestamp
 * @param details - Validation details
 */
export declare function invalidPlanError(message: string, timestamp: string, details?: Record<string, unknown>): OrchestratorError;
/**
 * Creates a step failed error.
 * @param stepId - ID of failed step
 * @param message - Failure message
 * @param timestamp - ISO timestamp
 * @param cause - Underlying cause
 */
export declare function stepFailedError(stepId: string, message: string, timestamp: string, cause?: unknown): OrchestratorError;
/**
 * Creates a timeout error.
 * @param stepId - ID of timed-out step
 * @param timeoutMs - Timeout value in ms
 * @param timestamp - ISO timestamp
 */
export declare function timeoutError(stepId: string, timeoutMs: number, timestamp: string): OrchestratorError;
/**
 * Creates a determinism violation error.
 * @param hash1 - First run hash
 * @param hash2 - Second run hash
 * @param timestamp - ISO timestamp
 */
export declare function determinismViolationError(hash1: string, hash2: string, timestamp: string): OrchestratorError;
/**
 * Creates an adapter not found error.
 * @param kind - Step kind that has no adapter
 * @param timestamp - ISO timestamp
 */
export declare function adapterNotFoundError(kind: string, timestamp: string): OrchestratorError;
/**
 * Type guard to check if a value is an OrchestratorError.
 * @param value - Value to check
 * @returns true if value is an OrchestratorError
 */
export declare function isOrchestratorError(value: unknown): value is OrchestratorError;
//# sourceMappingURL=errors.d.ts.map