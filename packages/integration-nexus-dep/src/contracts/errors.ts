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

import type { NexusError, NexusErrorCode } from "./types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a NEXUS error with timestamp
 */
export function createNexusError(
  code: NexusErrorCode,
  message: string,
  source?: string
): NexusError {
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

export function validationError(
  message: string,
  source?: string
): NexusError {
  return createNexusError("VALIDATION_FAILED", message, source);
}

export function adapterError(
  adapter: string,
  operation: string,
  details: string
): NexusError {
  return createNexusError(
    "ADAPTER_ERROR",
    `${adapter}.${operation}: ${details}`,
    adapter
  );
}

export function timeoutError(
  operation: string,
  timeoutMs: number
): NexusError {
  return createNexusError(
    "TIMEOUT",
    `Operation '${operation}' timed out after ${timeoutMs}ms`,
    operation
  );
}

export function determinismViolation(
  expected: string,
  actual: string,
  source?: string
): NexusError {
  return createNexusError(
    "DETERMINISM_VIOLATION",
    `Expected hash ${expected}, got ${actual}`,
    source
  );
}

export function sanctuaryAccessDenied(
  sanctuary: string,
  operation: string
): NexusError {
  return createNexusError(
    "SANCTUARY_ACCESS_DENIED",
    `Write operation '${operation}' forbidden on sanctuary '${sanctuary}'`,
    sanctuary
  );
}

export function unknownOperationError(operation: string): NexusError {
  return createNexusError(
    "UNKNOWN_OPERATION",
    `Unknown operation type: ${operation}`,
    "router"
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CODES CATALOG
// ═══════════════════════════════════════════════════════════════════════════════

export const ERROR_CATALOG: Readonly<Record<NexusErrorCode, string>> = {
  VALIDATION_FAILED: "Input validation failed",
  ADAPTER_ERROR: "Adapter operation failed",
  TIMEOUT: "Operation timed out",
  DETERMINISM_VIOLATION: "Determinism check failed",
  SANCTUARY_ACCESS_DENIED: "Write access to sanctuary denied",
  UNKNOWN_OPERATION: "Operation type not recognized"
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CLASS (Optional typed errors)
// ═══════════════════════════════════════════════════════════════════════════════

export class NexusOperationError extends Error {
  readonly nexusError: NexusError;

  constructor(error: NexusError) {
    super(error.message);
    this.name = "NexusOperationError";
    this.nexusError = error;
    Object.freeze(this);
  }

  toJSON(): NexusError {
    return this.nexusError;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

export function isNexusOperationError(err: unknown): err is NexusOperationError {
  return err instanceof NexusOperationError;
}

export function extractNexusError(err: unknown): NexusError {
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
function isNexusErrorObject(obj: unknown): obj is NexusError {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "code" in obj &&
    "message" in obj &&
    "timestamp" in obj &&
    typeof (obj as NexusError).code === "string" &&
    typeof (obj as NexusError).message === "string" &&
    typeof (obj as NexusError).timestamp === "string"
  );
}
