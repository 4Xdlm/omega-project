// ═══════════════════════════════════════════════════════════════════════════
// OMEGA SCRIBE v1.0 — ERROR DEFINITIONS
// Version: 1.0.0
// Date: 01 janvier 2026
// Certification: NASA-GRADE AS9100D / DO-178C
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SCRIBE Error codes (unique, typed)
 * Each error has a unique code for precise diagnostics.
 * 
 * Nomenclature: SCRIBE_<CATEGORY>_<SPECIFIC>
 */
export enum ScribeErrorCode {
  // ─── Request Errors (E001-E010) ───
  INVALID_REQUEST = 'SCRIBE_E001_INVALID_REQUEST',
  MISSING_SCENE_SPEC = 'SCRIBE_E002_MISSING_SCENE_SPEC',
  MISSING_POV = 'SCRIBE_E003_MISSING_POV',
  MISSING_TENSE = 'SCRIBE_E004_MISSING_TENSE',
  EMPTY_CANON_SCOPE = 'SCRIBE_E005_EMPTY_CANON_SCOPE',
  INVALID_LENGTH_SPEC = 'SCRIBE_E006_INVALID_LENGTH_SPEC',
  MISSING_VOICE_REF = 'SCRIBE_E007_MISSING_VOICE_REF',
  INVALID_ENTITY_ID = 'SCRIBE_E008_INVALID_ENTITY_ID',
  INVALID_SCHEMA_VERSION = 'SCRIBE_E009_INVALID_SCHEMA_VERSION',
  INVALID_MODE = 'SCRIBE_E010_INVALID_MODE',
  
  // ─── Replay Errors (E011-E020) ───
  REPLAY_PROVIDER_CALL = 'SCRIBE_E011_REPLAY_PROVIDER_CALL',
  REPLAY_RECORD_NOT_FOUND = 'SCRIBE_E012_REPLAY_RECORD_NOT_FOUND',
  REPLAY_HASH_MISMATCH = 'SCRIBE_E013_REPLAY_HASH_MISMATCH',
  TAMPER_DETECTED = 'SCRIBE_E014_TAMPER_DETECTED',
  RECORD_CORRUPTED = 'SCRIBE_E015_RECORD_CORRUPTED',
  
  // ─── Provider Errors (E021-E030) ───
  PROVIDER_ERROR = 'SCRIBE_E021_PROVIDER_ERROR',
  PROVIDER_TIMEOUT = 'SCRIBE_E022_PROVIDER_TIMEOUT',
  PROVIDER_MISSING = 'SCRIBE_E023_PROVIDER_MISSING',
  PROVIDER_INVALID_RESPONSE = 'SCRIBE_E024_PROVIDER_INVALID_RESPONSE',
  
  // ─── Canon Errors (E031-E040) ───
  CANON_CONFLICT = 'SCRIBE_E031_CANON_CONFLICT',
  CANON_SCOPE_VIOLATION = 'SCRIBE_E032_CANON_SCOPE_VIOLATION',
  CANON_WRITE_ATTEMPTED = 'SCRIBE_E033_CANON_WRITE_ATTEMPTED',
  
  // ─── Scoring Errors (E041-E050) ───
  SCORE_OUT_OF_BOUNDS = 'SCRIBE_E041_SCORE_OUT_OF_BOUNDS',
  COMPLIANCE_FAILED = 'SCRIBE_E042_COMPLIANCE_FAILED',
  
  // ─── IO Errors (E051-E060) ───
  IO_READ_FAILED = 'SCRIBE_E051_IO_READ_FAILED',
  IO_WRITE_FAILED = 'SCRIBE_E052_IO_WRITE_FAILED',
  IO_DIR_CREATE_FAILED = 'SCRIBE_E053_IO_DIR_CREATE_FAILED',
  
  // ─── Invariant Errors (E061-E070) ───
  INVARIANT_VIOLATED = 'SCRIBE_E061_INVARIANT_VIOLATED',
  HASH_INSTABILITY = 'SCRIBE_E062_HASH_INSTABILITY',
  DETERMINISM_FAILED = 'SCRIBE_E063_DETERMINISM_FAILED',
  
  // ─── Generic (E099) ───
  UNKNOWN_ERROR = 'SCRIBE_E099_UNKNOWN_ERROR'
}

/**
 * Structured details for SCRIBE errors
 */
export interface ScribeErrorDetails {
  run_id?: string;
  scene_id?: string;
  field?: string;
  expected?: string;
  actual?: string;
  expected_hash?: string;
  actual_hash?: string;
  provider_id?: string;
  invariant_id?: string;
  path?: string;
  original_error?: Error;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * SCRIBE Error class — typed error with code and structured details
 * 
 * Based on CanonError pattern from CANON v1.0.0
 */
export class ScribeError extends Error {
  public readonly code: ScribeErrorCode;
  public readonly details: ScribeErrorDetails;
  public readonly timestamp: string;
  public readonly recoverable: boolean;

  constructor(
    code: ScribeErrorCode,
    message: string,
    details: ScribeErrorDetails = {},
    options?: {
      recoverable?: boolean;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'ScribeError';
    this.code = code;
    this.details = details;
    this.recoverable = options?.recoverable ?? false;
    this.timestamp = new Date().toISOString();

    if (options?.cause) {
      this.cause = options.cause;
    }

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ScribeError);
    }
  }

  /**
   * Serialization for logs/transport
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Readable representation for debug
   */
  toString(): string {
    return `[${this.code}] ${this.message}`;
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(): boolean {
    return this.recoverable;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTIONS (helpers for typed errors)
// ─────────────────────────────────────────────────────────────────────────────

// === Request Errors ===

export function invalidRequest(message: string, details?: ScribeErrorDetails): ScribeError {
  return new ScribeError(
    ScribeErrorCode.INVALID_REQUEST,
    message,
    details
  );
}

export function missingSceneSpec(): ScribeError {
  return new ScribeError(
    ScribeErrorCode.MISSING_SCENE_SPEC,
    'SceneSpec is required but was not provided',
    { field: 'scene_spec' }
  );
}

export function missingPov(): ScribeError {
  return new ScribeError(
    ScribeErrorCode.MISSING_POV,
    'POV (Point of View) is required - no default allowed',
    { field: 'pov' }
  );
}

export function missingTense(): ScribeError {
  return new ScribeError(
    ScribeErrorCode.MISSING_TENSE,
    'Tense is required - no default allowed',
    { field: 'tense' }
  );
}

export function emptyCanonScope(): ScribeError {
  return new ScribeError(
    ScribeErrorCode.EMPTY_CANON_SCOPE,
    'canon_read_scope must have at least one entity (SCRIBE-I03)',
    { field: 'canon_read_scope', invariant_id: 'SCRIBE-I03' }
  );
}

export function invalidLengthSpec(min: number, max: number): ScribeError {
  return new ScribeError(
    ScribeErrorCode.INVALID_LENGTH_SPEC,
    `Invalid length spec: min_words (${min}) > max_words (${max})`,
    { field: 'target_length', expected: 'min <= max', actual: `${min} > ${max}` }
  );
}

export function missingVoiceRef(): ScribeError {
  return new ScribeError(
    ScribeErrorCode.MISSING_VOICE_REF,
    'voice_profile_ref is required',
    { field: 'voice_profile_ref' }
  );
}

export function invalidEntityId(entityId: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.INVALID_ENTITY_ID,
    `Invalid entity ID format: ${entityId}. Expected TYPE:ID (e.g., CHAR:VICK)`,
    { field: 'entity_id', actual: entityId, expected: 'TYPE:ID' }
  );
}

export function invalidSchemaVersion(found: string, expected: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.INVALID_SCHEMA_VERSION,
    `Invalid schema version: found ${found}, expected ${expected}`,
    { field: 'metadata.schema_version', expected, actual: found }
  );
}

export function invalidMode(mode: string, context: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.INVALID_MODE,
    `Invalid mode '${mode}' for context: ${context}`,
    { field: 'mode', actual: mode }
  );
}

// === Replay Errors ===

export function replayProviderCall(run_id: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.REPLAY_PROVIDER_CALL,
    'Provider call attempted in REPLAY mode - this is forbidden (SCRIBE-I09)',
    { run_id, invariant_id: 'SCRIBE-I09' }
  );
}

export function replayRecordNotFound(run_id: string, path: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.REPLAY_RECORD_NOT_FOUND,
    `Record file not found for run_id: ${run_id}`,
    { run_id, path }
  );
}

export function replayHashMismatch(field: string, expected: string, actual: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.REPLAY_HASH_MISMATCH,
    `Hash mismatch in replay for ${field}`,
    { field, expected_hash: expected, actual_hash: actual, invariant_id: 'SCRIBE-I07' }
  );
}

export function tamperDetected(field: string, details?: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.TAMPER_DETECTED,
    `Tamper detected: ${field}${details ? ` - ${details}` : ''}`,
    { field, invariant_id: 'SCRIBE-I08' }
  );
}

export function recordCorrupted(run_id: string, reason: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.RECORD_CORRUPTED,
    `Record file corrupted for run_id: ${run_id} - ${reason}`,
    { run_id, context: { reason } }
  );
}

// === Provider Errors ===

export function providerError(provider_id: string, message: string, originalError?: Error): ScribeError {
  return new ScribeError(
    ScribeErrorCode.PROVIDER_ERROR,
    `Provider ${provider_id} error: ${message}`,
    { provider_id, original_error: originalError },
    { recoverable: true, cause: originalError }
  );
}

export function providerTimeout(provider_id: string, timeout_ms: number): ScribeError {
  return new ScribeError(
    ScribeErrorCode.PROVIDER_TIMEOUT,
    `Provider ${provider_id} timed out after ${timeout_ms}ms`,
    { provider_id, context: { timeout_ms } },
    { recoverable: true }
  );
}

export function providerMissing(mode: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.PROVIDER_MISSING,
    `Provider is required in ${mode} mode but was not provided`,
    { field: 'provider_id', context: { mode } }
  );
}

export function providerInvalidResponse(provider_id: string, response: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.PROVIDER_INVALID_RESPONSE,
    `Invalid response from provider ${provider_id}`,
    { provider_id, context: { response: response.substring(0, 200) } }
  );
}

// === Canon Errors ===

export function canonConflict(subject: string, existingValue: string, newValue: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.CANON_CONFLICT,
    `CANON conflict for ${subject}: existing "${existingValue}" vs new "${newValue}"`,
    { context: { subject, existing: existingValue, new: newValue } }
  );
}

export function canonScopeViolation(entity: string, scope: string[]): ScribeError {
  return new ScribeError(
    ScribeErrorCode.CANON_SCOPE_VIOLATION,
    `Entity ${entity} not in canon_read_scope`,
    { context: { entity, allowed_scope: scope }, invariant_id: 'SCRIBE-I03' }
  );
}

export function canonWriteAttempted(operation: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.CANON_WRITE_ATTEMPTED,
    `CANON write attempted: ${operation} - SCRIBE is read-only (SCRIBE-I12)`,
    { context: { operation }, invariant_id: 'SCRIBE-I12' }
  );
}

// === Scoring Errors ===

export function scoreOutOfBounds(score: number): ScribeError {
  return new ScribeError(
    ScribeErrorCode.SCORE_OUT_OF_BOUNDS,
    `Score ${score} is out of bounds [0, 1] (SCRIBE-I10)`,
    { expected: '[0, 1]', actual: String(score), invariant_id: 'SCRIBE-I10' }
  );
}

export function complianceFailed(score: number, threshold: number): ScribeError {
  return new ScribeError(
    ScribeErrorCode.COMPLIANCE_FAILED,
    `Compliance score ${score.toFixed(3)} below threshold ${threshold}`,
    { context: { score, threshold } },
    { recoverable: true }
  );
}

// === IO Errors ===

export function ioReadFailed(path: string, originalError?: Error): ScribeError {
  return new ScribeError(
    ScribeErrorCode.IO_READ_FAILED,
    `Failed to read file: ${path}`,
    { path, original_error: originalError },
    { cause: originalError }
  );
}

export function ioWriteFailed(path: string, originalError?: Error): ScribeError {
  return new ScribeError(
    ScribeErrorCode.IO_WRITE_FAILED,
    `Failed to write file: ${path}`,
    { path, original_error: originalError },
    { cause: originalError }
  );
}

export function ioDirCreateFailed(path: string, originalError?: Error): ScribeError {
  return new ScribeError(
    ScribeErrorCode.IO_DIR_CREATE_FAILED,
    `Failed to create directory: ${path}`,
    { path, original_error: originalError },
    { cause: originalError }
  );
}

// === Invariant Errors ===

export function invariantViolated(invariant_id: string, message: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.INVARIANT_VIOLATED,
    `Invariant ${invariant_id} violated: ${message}`,
    { invariant_id }
  );
}

export function hashInstability(context: string, hash1: string, hash2: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.HASH_INSTABILITY,
    `Hash instability detected in ${context}: same input produced different hashes (SCRIBE-I02)`,
    { context: { context }, expected_hash: hash1, actual_hash: hash2, invariant_id: 'SCRIBE-I02' }
  );
}

export function determinismFailed(context: string, run1: string, run2: string): ScribeError {
  return new ScribeError(
    ScribeErrorCode.DETERMINISM_FAILED,
    `Determinism failed in ${context}: different results for same input`,
    { context: { context, run1, run2 }, invariant_id: 'SCRIBE-I08' }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wrap unknown error in ScribeError
 */
export function wrapError(
  error: unknown,
  fallbackCode: ScribeErrorCode = ScribeErrorCode.UNKNOWN_ERROR
): ScribeError {
  if (error instanceof ScribeError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new ScribeError(
      fallbackCode,
      error.message,
      { original_error: error },
      { cause: error }
    );
  }
  
  return new ScribeError(
    fallbackCode,
    String(error),
    {}
  );
}

/**
 * Type guard for ScribeError
 */
export function isScribeError(error: unknown): error is ScribeError {
  return error instanceof ScribeError;
}

/**
 * Get all error codes (for testing)
 */
export function getAllErrorCodes(): ScribeErrorCode[] {
  return Object.values(ScribeErrorCode);
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUPED EXPORTS (like CanonErrors pattern)
// ─────────────────────────────────────────────────────────────────────────────

export const ScribeErrors = {
  // Request
  invalidRequest,
  missingSceneSpec,
  missingPov,
  missingTense,
  emptyCanonScope,
  invalidLengthSpec,
  missingVoiceRef,
  invalidEntityId,
  invalidSchemaVersion,
  invalidMode,
  
  // Replay
  replayProviderCall,
  replayRecordNotFound,
  replayHashMismatch,
  tamperDetected,
  recordCorrupted,
  
  // Provider
  providerError,
  providerTimeout,
  providerMissing,
  providerInvalidResponse,
  
  // Canon
  canonConflict,
  canonScopeViolation,
  canonWriteAttempted,
  
  // Scoring
  scoreOutOfBounds,
  complianceFailed,
  
  // IO
  ioReadFailed,
  ioWriteFailed,
  ioDirCreateFailed,
  
  // Invariant
  invariantViolated,
  hashInstability,
  determinismFailed,
  
  // Utility
  wrapError,
  isScribeError
};
