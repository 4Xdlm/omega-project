/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — MEMORY_LAYER
 * memory_errors.ts — Error Hierarchy NASA-Grade
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 10A
 * STANDARD    : DO-178C Level A / MIL-STD-882E
 * 
 * ARCHITECTURE :
 *   Hiérarchie d'erreurs typées, traçables et déterministes.
 *   Chaque erreur a un code unique pour faciliter le debugging.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Codes d'erreur MEMORY_LAYER
 */
export type MemoryErrorCode =
  // Validation errors (1xx)
  | "MEM_100_INVALID_KEY"
  | "MEM_101_INVALID_PAYLOAD"
  | "MEM_102_INVALID_PROVENANCE"
  | "MEM_103_INVALID_REQUEST"
  | "MEM_104_INVALID_QUERY"
  | "MEM_105_SCHEMA_VIOLATION"
  
  // Store errors (2xx)
  | "MEM_200_RECORD_NOT_FOUND"
  | "MEM_201_VERSION_CONFLICT"
  | "MEM_202_HASH_MISMATCH"
  | "MEM_203_INTEGRITY_VIOLATION"
  | "MEM_204_STORE_CORRUPTED"
  
  // Operation errors (3xx)
  | "MEM_300_WRITE_FAILED"
  | "MEM_301_QUERY_FAILED"
  | "MEM_302_QUERY_TIMEOUT"
  | "MEM_303_OPERATION_REJECTED"
  
  // Invariant violations (4xx)
  | "MEM_400_MUTATION_ATTEMPTED"
  | "MEM_401_DELETE_ATTEMPTED"
  | "MEM_402_IMPLICIT_LINK_DETECTED"
  | "MEM_403_PROVENANCE_MISSING"
  
  // System errors (5xx)
  | "MEM_500_INTERNAL_ERROR"
  | "MEM_501_NOT_IMPLEMENTED";

/**
 * Catégories d'erreurs
 */
export type MemoryErrorCategory =
  | "VALIDATION"
  | "STORE"
  | "OPERATION"
  | "INVARIANT"
  | "SYSTEM";

/**
 * Détermine la catégorie d'une erreur par son code
 */
export function getErrorCategory(code: MemoryErrorCode): MemoryErrorCategory {
  const prefix = code.substring(4, 5);
  switch (prefix) {
    case "1": return "VALIDATION";
    case "2": return "STORE";
    case "3": return "OPERATION";
    case "4": return "INVARIANT";
    case "5": return "SYSTEM";
    default: return "SYSTEM";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — MEMORY ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Erreur MEMORY_LAYER — typée et traçable
 */
export class MemoryError extends Error {
  /** Code d'erreur unique */
  readonly code: MemoryErrorCode;
  
  /** Catégorie d'erreur */
  readonly category: MemoryErrorCategory;
  
  /** Détails additionnels */
  readonly details?: unknown;
  
  /** Timestamp de création */
  readonly timestamp_utc: string;
  
  /** Erreur cause (si wrapping) */
  readonly cause_error?: Error;
  
  constructor(
    code: MemoryErrorCode,
    message: string,
    details?: unknown,
    cause?: Error
  ) {
    super(message);
    this.name = "MemoryError";
    this.code = code;
    this.category = getErrorCategory(code);
    this.details = details;
    this.timestamp_utc = new Date().toISOString();
    this.cause_error = cause;
    
    // Maintenir le stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MemoryError);
    }
  }
  
  /**
   * Sérialise l'erreur en objet
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      details: this.details,
      timestamp_utc: this.timestamp_utc,
      cause: this.cause_error?.message,
    };
  }
  
  /**
   * Crée une représentation string détaillée
   */
  toString(): string {
    let str = `[${this.code}] ${this.message}`;
    if (this.details) {
      str += ` — Details: ${JSON.stringify(this.details)}`;
    }
    return str;
  }
}

/**
 * Type guard pour MemoryError
 */
export function isMemoryError(error: unknown): error is MemoryError {
  return error instanceof MemoryError;
}

/**
 * Type guard pour une catégorie spécifique
 */
export function isMemoryErrorOfCategory(
  error: unknown,
  category: MemoryErrorCategory
): error is MemoryError {
  return isMemoryError(error) && error.category === category;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — ERROR FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Factory pour créer des erreurs typées
 */
export const MemoryErrors = {
  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATION ERRORS (1xx)
  // ─────────────────────────────────────────────────────────────────────────────
  
  invalidKey(key: string, reason: string): MemoryError {
    return new MemoryError(
      "MEM_100_INVALID_KEY",
      `Invalid key "${key}": ${reason}`,
      { key, reason }
    );
  },
  
  invalidPayload(reason: string, details?: unknown): MemoryError {
    return new MemoryError(
      "MEM_101_INVALID_PAYLOAD",
      `Invalid payload: ${reason}`,
      details
    );
  },
  
  invalidProvenance(reason: string): MemoryError {
    return new MemoryError(
      "MEM_102_INVALID_PROVENANCE",
      `Invalid provenance: ${reason}`
    );
  },
  
  invalidRequest(reason: string, details?: unknown): MemoryError {
    return new MemoryError(
      "MEM_103_INVALID_REQUEST",
      `Invalid request: ${reason}`,
      details
    );
  },
  
  invalidQuery(reason: string, details?: unknown): MemoryError {
    return new MemoryError(
      "MEM_104_INVALID_QUERY",
      `Invalid query: ${reason}`,
      details
    );
  },
  
  schemaViolation(field: string, expected: string, received: string): MemoryError {
    return new MemoryError(
      "MEM_105_SCHEMA_VIOLATION",
      `Schema violation on field "${field}": expected ${expected}, received ${received}`,
      { field, expected, received }
    );
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STORE ERRORS (2xx)
  // ─────────────────────────────────────────────────────────────────────────────
  
  recordNotFound(key: string, version?: number): MemoryError {
    const msg = version 
      ? `Record not found: "${key}" version ${version}`
      : `Record not found: "${key}"`;
    return new MemoryError(
      "MEM_200_RECORD_NOT_FOUND",
      msg,
      { key, version }
    );
  },
  
  versionConflict(key: string, expected: number, actual: number): MemoryError {
    return new MemoryError(
      "MEM_201_VERSION_CONFLICT",
      `Version conflict on "${key}": expected ${expected}, actual ${actual}`,
      { key, expected, actual }
    );
  },
  
  hashMismatch(key: string, expected: string, actual: string): MemoryError {
    return new MemoryError(
      "MEM_202_HASH_MISMATCH",
      `Hash mismatch on "${key}": integrity compromised`,
      { key, expected_prefix: expected.substring(0, 16), actual_prefix: actual.substring(0, 16) }
    );
  },
  
  integrityViolation(key: string, reason: string): MemoryError {
    return new MemoryError(
      "MEM_203_INTEGRITY_VIOLATION",
      `Integrity violation on "${key}": ${reason}`,
      { key, reason }
    );
  },
  
  storeCorrupted(reason: string): MemoryError {
    return new MemoryError(
      "MEM_204_STORE_CORRUPTED",
      `Store corrupted: ${reason}`,
      { reason }
    );
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // OPERATION ERRORS (3xx)
  // ─────────────────────────────────────────────────────────────────────────────
  
  writeFailed(key: string, reason: string, cause?: Error): MemoryError {
    return new MemoryError(
      "MEM_300_WRITE_FAILED",
      `Write failed for "${key}": ${reason}`,
      { key, reason },
      cause
    );
  },
  
  queryFailed(reason: string, cause?: Error): MemoryError {
    return new MemoryError(
      "MEM_301_QUERY_FAILED",
      `Query failed: ${reason}`,
      { reason },
      cause
    );
  },
  
  queryTimeout(timeoutMs: number): MemoryError {
    return new MemoryError(
      "MEM_302_QUERY_TIMEOUT",
      `Query timed out after ${timeoutMs}ms`,
      { timeout_ms: timeoutMs }
    );
  },
  
  operationRejected(operation: string, reason: string): MemoryError {
    return new MemoryError(
      "MEM_303_OPERATION_REJECTED",
      `Operation "${operation}" rejected: ${reason}`,
      { operation, reason }
    );
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // INVARIANT VIOLATIONS (4xx)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * INV-MEM-01 : Append-Only violation
   */
  mutationAttempted(key: string, operation: string): MemoryError {
    return new MemoryError(
      "MEM_400_MUTATION_ATTEMPTED",
      `INVARIANT VIOLATION [INV-MEM-01]: Mutation attempted on "${key}" via "${operation}"`,
      { key, operation, invariant: "INV-MEM-01" }
    );
  },
  
  /**
   * INV-MEM-01 : Delete violation
   */
  deleteAttempted(key: string): MemoryError {
    return new MemoryError(
      "MEM_401_DELETE_ATTEMPTED",
      `INVARIANT VIOLATION [INV-MEM-01]: Delete attempted on "${key}"`,
      { key, invariant: "INV-MEM-01" }
    );
  },
  
  /**
   * INV-MEM-03 : Explicit Linking violation
   */
  implicitLinkDetected(source: string, target: string): MemoryError {
    return new MemoryError(
      "MEM_402_IMPLICIT_LINK_DETECTED",
      `INVARIANT VIOLATION [INV-MEM-03]: Implicit link detected from "${source}" to "${target}"`,
      { source, target, invariant: "INV-MEM-03" }
    );
  },
  
  /**
   * INV-MEM-07 : Provenance violation
   */
  provenanceMissing(key: string): MemoryError {
    return new MemoryError(
      "MEM_403_PROVENANCE_MISSING",
      `INVARIANT VIOLATION [INV-MEM-07]: Provenance missing for "${key}"`,
      { key, invariant: "INV-MEM-07" }
    );
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SYSTEM ERRORS (5xx)
  // ─────────────────────────────────────────────────────────────────────────────
  
  internal(message: string, cause?: Error): MemoryError {
    return new MemoryError(
      "MEM_500_INTERNAL_ERROR",
      `Internal error: ${message}`,
      undefined,
      cause
    );
  },
  
  notImplemented(feature: string): MemoryError {
    return new MemoryError(
      "MEM_501_NOT_IMPLEMENTED",
      `Not implemented: ${feature}`,
      { feature }
    );
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — ERROR UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wrap une erreur quelconque en MemoryError
 */
export function wrapError(error: unknown, context: string): MemoryError {
  if (isMemoryError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return MemoryErrors.internal(`${context}: ${error.message}`, error);
  }
  
  return MemoryErrors.internal(`${context}: ${String(error)}`);
}

/**
 * Crée une erreur à partir d'un code
 */
export function createErrorFromCode(
  code: MemoryErrorCode,
  message: string,
  details?: unknown
): MemoryError {
  return new MemoryError(code, message, details);
}

/**
 * Vérifie si une erreur est une violation d'invariant
 */
export function isInvariantViolation(error: unknown): error is MemoryError {
  return isMemoryErrorOfCategory(error, "INVARIANT");
}

/**
 * Extrait les erreurs d'invariant d'une liste d'erreurs
 */
export function filterInvariantViolations(errors: unknown[]): MemoryError[] {
  return errors.filter(isInvariantViolation);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — RESULT TYPE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type Result pour les opérations qui peuvent échouer
 */
export type MemoryResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: MemoryError };

/**
 * Crée un résultat succès
 */
export function success<T>(value: T): MemoryResult<T> {
  return Object.freeze({ success: true, value });
}

/**
 * Crée un résultat échec
 */
export function failure<T>(error: MemoryError): MemoryResult<T> {
  return Object.freeze({ success: false, error });
}

/**
 * Unwrap un résultat ou throw
 */
export function unwrap<T>(result: MemoryResult<T>): T {
  if (result.success) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwrap un résultat ou retourner une valeur par défaut
 */
export function unwrapOr<T>(result: MemoryResult<T>, defaultValue: T): T {
  if (result.success) {
    return result.value;
  }
  return defaultValue;
}
