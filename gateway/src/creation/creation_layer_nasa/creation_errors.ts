/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — CREATION_LAYER
 * creation_errors.ts — Error Codes NASA-Grade
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 9A
 * STANDARD    : DO-178C Level A
 * 
 * INVARIANT COUVERT : INV-CRE-09 (Error Traceability)
 * Chaque erreur traçable jusqu'à sa cause root
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { CreationErrorCode, CreationErrorInfo } from "./creation_types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — ERROR DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Définition complète de chaque code d'erreur
 */
export interface ErrorDefinition {
  readonly code: CreationErrorCode;
  readonly severity: "FATAL" | "ERROR" | "WARNING";
  readonly category: "VALIDATION" | "SNAPSHOT" | "TEMPLATE" | "EXECUTION" | "INTERNAL";
  readonly description: string;
  readonly recoverable: boolean;
}

/**
 * Registry des erreurs avec descriptions complètes
 */
export const ERROR_DEFINITIONS: Readonly<Record<CreationErrorCode, ErrorDefinition>> = Object.freeze({
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATION ERRORS
  // ─────────────────────────────────────────────────────────────────────────────
  
  INVALID_REQUEST: {
    code: "INVALID_REQUEST",
    severity: "ERROR",
    category: "VALIDATION",
    description: "Request structure is invalid or missing required fields",
    recoverable: true,
  },
  
  PARAMS_VALIDATION_FAILED: {
    code: "PARAMS_VALIDATION_FAILED",
    severity: "ERROR",
    category: "VALIDATION",
    description: "Request params do not match template input_schema",
    recoverable: true,
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SNAPSHOT ERRORS
  // ─────────────────────────────────────────────────────────────────────────────
  
  SNAPSHOT_NOT_FOUND: {
    code: "SNAPSHOT_NOT_FOUND",
    severity: "ERROR",
    category: "SNAPSHOT",
    description: "Requested snapshot_id does not exist",
    recoverable: true,
  },
  
  SNAPSHOT_INVALID: {
    code: "SNAPSHOT_INVALID",
    severity: "FATAL",
    category: "SNAPSHOT",
    description: "Snapshot exists but is corrupted or invalid",
    recoverable: false,
  },
  
  SOURCE_NOT_FOUND: {
    code: "SOURCE_NOT_FOUND",
    severity: "ERROR",
    category: "SNAPSHOT",
    description: "Required source entry not found in snapshot",
    recoverable: true,
  },
  
  SOURCE_HASH_MISMATCH: {
    code: "SOURCE_HASH_MISMATCH",
    severity: "FATAL",
    category: "SNAPSHOT",
    description: "Source entry hash does not match expected value (integrity violation)",
    recoverable: false,
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TEMPLATE ERRORS
  // ─────────────────────────────────────────────────────────────────────────────
  
  TEMPLATE_NOT_FOUND: {
    code: "TEMPLATE_NOT_FOUND",
    severity: "ERROR",
    category: "TEMPLATE",
    description: "Requested template_id is not registered",
    recoverable: true,
  },
  
  TEMPLATE_VERSION_MISMATCH: {
    code: "TEMPLATE_VERSION_MISMATCH",
    severity: "ERROR",
    category: "TEMPLATE",
    description: "Template version does not match request (if version specified)",
    recoverable: true,
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // EXECUTION ERRORS
  // ─────────────────────────────────────────────────────────────────────────────
  
  EXECUTION_FAILED: {
    code: "EXECUTION_FAILED",
    severity: "ERROR",
    category: "EXECUTION",
    description: "Template execution threw an exception",
    recoverable: true,
  },
  
  EXECUTION_TIMEOUT: {
    code: "EXECUTION_TIMEOUT",
    severity: "ERROR",
    category: "EXECUTION",
    description: "Template execution exceeded timeout_ms",
    recoverable: true,
  },
  
  OUTPUT_VALIDATION_FAILED: {
    code: "OUTPUT_VALIDATION_FAILED",
    severity: "ERROR",
    category: "EXECUTION",
    description: "Template output does not match output_schema",
    recoverable: false,
  },
  
  ARTIFACT_TOO_LARGE: {
    code: "ARTIFACT_TOO_LARGE",
    severity: "ERROR",
    category: "EXECUTION",
    description: "Generated artifact exceeds maxArtifactBytes",
    recoverable: true,
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // INTERNAL ERRORS
  // ─────────────────────────────────────────────────────────────────────────────
  
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    severity: "FATAL",
    category: "INTERNAL",
    description: "Unexpected internal error (bug in CREATION_LAYER)",
    recoverable: false,
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Exception typée pour CREATION_LAYER
 * 
 * Étend Error standard avec :
 * - Code d'erreur typé
 * - Détails structurés
 * - Chaîne de cause (cause)
 */
export class CreationError extends Error {
  readonly code: CreationErrorCode;
  readonly details?: unknown;
  readonly timestamp_utc: string;
  
  constructor(
    code: CreationErrorCode,
    message: string,
    details?: unknown,
    cause?: Error
  ) {
    super(message);
    this.name = "CreationError";
    this.code = code;
    this.details = details;
    this.timestamp_utc = new Date().toISOString();
    
    // Chaîne de cause (ES2022)
    if (cause) {
      this.cause = cause;
    }
    
    // Préserve le stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CreationError);
    }
  }
  
  /**
   * Convertit en CreationErrorInfo pour Result pattern
   */
  toErrorInfo(request_id?: string): CreationErrorInfo {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      request_id,
    };
  }
  
  /**
   * Récupère la définition de cette erreur
   */
  getDefinition(): ErrorDefinition {
    return ERROR_DEFINITIONS[this.code];
  }
  
  /**
   * Est-ce une erreur récupérable ?
   */
  isRecoverable(): boolean {
    return ERROR_DEFINITIONS[this.code].recoverable;
  }
  
  /**
   * Sérialisation JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp_utc: this.timestamp_utc,
      stack: this.stack,
      cause: this.cause instanceof Error ? {
        name: this.cause.name,
        message: this.cause.message,
      } : undefined,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — ERROR FACTORIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Factory functions pour créer des erreurs typées
 * Garantit messages cohérents
 */
export const CreationErrors = {
  
  invalidRequest(reason: string, details?: unknown): CreationError {
    return new CreationError(
      "INVALID_REQUEST",
      `Invalid request: ${reason}`,
      details
    );
  },
  
  snapshotNotFound(snapshotId: string): CreationError {
    return new CreationError(
      "SNAPSHOT_NOT_FOUND",
      `Snapshot not found: ${snapshotId}`,
      { snapshot_id: snapshotId }
    );
  },
  
  snapshotInvalid(snapshotId: string, reason: string): CreationError {
    return new CreationError(
      "SNAPSHOT_INVALID",
      `Snapshot invalid: ${snapshotId} — ${reason}`,
      { snapshot_id: snapshotId, reason }
    );
  },
  
  templateNotFound(templateId: string): CreationError {
    return new CreationError(
      "TEMPLATE_NOT_FOUND",
      `Template not found: ${templateId}`,
      { template_id: templateId }
    );
  },
  
  templateVersionMismatch(
    templateId: string,
    requested: string,
    actual: string
  ): CreationError {
    return new CreationError(
      "TEMPLATE_VERSION_MISMATCH",
      `Template version mismatch: ${templateId} — requested ${requested}, found ${actual}`,
      { template_id: templateId, requested, actual }
    );
  },
  
  paramsValidationFailed(reason: string, details?: unknown): CreationError {
    return new CreationError(
      "PARAMS_VALIDATION_FAILED",
      `Params validation failed: ${reason}`,
      details
    );
  },
  
  sourceNotFound(key: string, version?: number): CreationError {
    return new CreationError(
      "SOURCE_NOT_FOUND",
      `Source not found: ${key}${version !== undefined ? `@${version}` : ""}`,
      { key, version }
    );
  },
  
  sourceHashMismatch(key: string, expected: string, actual: string): CreationError {
    return new CreationError(
      "SOURCE_HASH_MISMATCH",
      `Source hash mismatch: ${key} — expected ${expected.slice(0, 16)}..., got ${actual.slice(0, 16)}...`,
      { key, expected, actual }
    );
  },
  
  executionFailed(reason: string, cause?: Error): CreationError {
    return new CreationError(
      "EXECUTION_FAILED",
      `Template execution failed: ${reason}`,
      { reason },
      cause
    );
  },
  
  executionTimeout(timeoutMs: number): CreationError {
    return new CreationError(
      "EXECUTION_TIMEOUT",
      `Template execution exceeded timeout: ${timeoutMs}ms`,
      { timeout_ms: timeoutMs }
    );
  },
  
  outputValidationFailed(reason: string, details?: unknown): CreationError {
    return new CreationError(
      "OUTPUT_VALIDATION_FAILED",
      `Template output validation failed: ${reason}`,
      details
    );
  },
  
  artifactTooLarge(size: number, maxSize: number): CreationError {
    return new CreationError(
      "ARTIFACT_TOO_LARGE",
      `Artifact too large: ${size} bytes (max: ${maxSize} bytes)`,
      { size, max_size: maxSize }
    );
  },
  
  internal(reason: string, cause?: Error): CreationError {
    return new CreationError(
      "INTERNAL_ERROR",
      `Internal error: ${reason}`,
      { reason },
      cause
    );
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — ERROR UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type guard pour CreationError
 */
export function isCreationError(e: unknown): e is CreationError {
  return e instanceof CreationError;
}

/**
 * Wrap une erreur inconnue en CreationError
 */
export function wrapError(e: unknown): CreationError {
  if (isCreationError(e)) return e;
  
  if (e instanceof Error) {
    return CreationErrors.internal(e.message, e);
  }
  
  return CreationErrors.internal(String(e));
}

/**
 * Extrait la chaîne de cause d'une erreur
 */
export function getErrorChain(e: Error): Error[] {
  const chain: Error[] = [e];
  let current: unknown = e.cause;
  
  while (current instanceof Error) {
    chain.push(current);
    current = current.cause;
  }
  
  return chain;
}

/**
 * Formate une erreur pour logging
 */
export function formatError(e: CreationError): string {
  const def = e.getDefinition();
  const lines: string[] = [
    `[${def.severity}] ${e.code}: ${e.message}`,
    `  Category: ${def.category}`,
    `  Recoverable: ${def.recoverable}`,
    `  Timestamp: ${e.timestamp_utc}`,
  ];
  
  if (e.details) {
    lines.push(`  Details: ${JSON.stringify(e.details)}`);
  }
  
  const chain = getErrorChain(e);
  if (chain.length > 1) {
    lines.push(`  Cause chain:`);
    for (let i = 1; i < chain.length; i++) {
      lines.push(`    ${i}. ${chain[i].name}: ${chain[i].message}`);
    }
  }
  
  return lines.join("\n");
}
