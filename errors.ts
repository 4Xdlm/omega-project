// ═══════════════════════════════════════════════════════════════════════════
// OMEGA CANON V1 — ERRORS
// Version: 1.0
// Date: 18 décembre 2025
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Codes d'erreur Canon typés.
 * Chaque erreur a un code unique pour diagnostic précis.
 */
export enum CanonErrorCode {
  // ─── IO Errors ───
  FILE_NOT_FOUND = 'CANON_FILE_NOT_FOUND',
  WRITE_FAILED = 'CANON_WRITE_FAILED',
  READ_FAILED = 'CANON_READ_FAILED',
  DIR_CREATE_FAILED = 'CANON_DIR_CREATE_FAILED',
  RENAME_FAILED = 'CANON_RENAME_FAILED',
  DELETE_FAILED = 'CANON_DELETE_FAILED',
  FSYNC_FAILED = 'CANON_FSYNC_FAILED',
  
  // ─── Security Errors ───
  PATH_UNSAFE = 'CANON_PATH_UNSAFE',
  PATH_TRAVERSAL = 'CANON_PATH_TRAVERSAL',
  PATH_TRAVERSAL_DETECTED = 'CANON_PATH_TRAVERSAL_DETECTED',
  PATH_ABSOLUTE = 'CANON_PATH_ABSOLUTE',
  ABSOLUTE_PATH_REJECTED = 'CANON_ABSOLUTE_PATH_REJECTED',
  
  // ─── Lock Errors ───
  PROJECT_LOCKED = 'CANON_PROJECT_LOCKED',
  LOCK_ACQUIRE_FAILED = 'CANON_LOCK_ACQUIRE_FAILED',
  LOCK_RELEASE_FAILED = 'CANON_LOCK_RELEASE_FAILED',
  
  // ─── Validation Errors ───
  INVALID_SCHEMA = 'CANON_INVALID_SCHEMA',
  INVALID_JSON = 'CANON_INVALID_JSON',
  INVARIANT_VIOLATED = 'CANON_INVARIANT_VIOLATED',
  
  // ─── Integrity Errors ───
  INTEGRITY_CHECK_FAILED = 'CANON_INTEGRITY_CHECK_FAILED',
  CORRUPTED_DATA = 'CANON_CORRUPTED_DATA',
  HASH_MISMATCH = 'CANON_HASH_MISMATCH',
  
  // ─── Version Errors ───
  VERSION_MISMATCH = 'CANON_VERSION_MISMATCH',
  MIGRATION_FAILED = 'CANON_MIGRATION_FAILED',
  
  // ─── Project Errors ───
  PROJECT_NOT_FOUND = 'CANON_PROJECT_NOT_FOUND',
  PROJECT_ALREADY_EXISTS = 'CANON_PROJECT_ALREADY_EXISTS',
  FILE_ALREADY_EXISTS = 'CANON_FILE_ALREADY_EXISTS',
  
  // ─── Generic ───
  UNKNOWN_ERROR = 'CANON_UNKNOWN_ERROR'
}

/**
 * Détails structurés pour une erreur Canon.
 */
export interface CanonErrorDetails {
  path?: string;
  expectedHash?: string;
  actualHash?: string;
  zodErrors?: unknown;
  invariantName?: string;
  lockHolder?: { pid: number; hostname: string; acquired_at: string };
  originalError?: Error;
  expected?: string;
  actual?: string;
  found?: string;
  reason?: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Erreur Canon typée avec code et détails structurés.
 */
export class CanonError extends Error {
  public readonly code: CanonErrorCode;
  public readonly details: CanonErrorDetails;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly recoverable: boolean;

  constructor(
    code: CanonErrorCode,
    message: string,
    details: CanonErrorDetails = {},
    options?: {
      context?: Record<string, unknown>;
      recoverable?: boolean;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'CanonError';
    this.code = code;
    this.details = details;
    this.context = options?.context || details.context || {};
    this.recoverable = options?.recoverable ?? false;
    this.timestamp = new Date().toISOString();

    if (options?.cause) {
      this.cause = options.cause;
    }

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CanonError);
    }
  }

  /**
   * Sérialisation pour logs/transport.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      context: this.context,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Représentation lisible pour debug.
   */
  toString(): string {
    return `[${this.code}] ${this.message}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTIONS (helpers pour créer des erreurs typées)
// ─────────────────────────────────────────────────────────────────────────────

export function fileNotFound(path: string): CanonError {
  return new CanonError(
    CanonErrorCode.FILE_NOT_FOUND,
    `File not found: ${path}`,
    { path }
  );
}

export function fileExists(path: string): CanonError {
  return new CanonError(
    CanonErrorCode.FILE_ALREADY_EXISTS,
    `File already exists: ${path}`,
    { path }
  );
}

export function writeFailed(path: string, originalError?: Error): CanonError {
  return new CanonError(
    CanonErrorCode.WRITE_FAILED,
    `Failed to write file: ${path}`,
    { path, originalError }
  );
}

export function readFailed(path: string, originalError?: Error): CanonError {
  return new CanonError(
    CanonErrorCode.READ_FAILED,
    `Failed to read file: ${path}`,
    { path, originalError }
  );
}

export function pathUnsafe(path: string, reason: string): CanonError {
  return new CanonError(
    CanonErrorCode.PATH_UNSAFE,
    `Unsafe path rejected: ${reason}`,
    { path, reason }
  );
}

export function pathTraversal(path: string): CanonError {
  return new CanonError(
    CanonErrorCode.PATH_TRAVERSAL,
    `Path traversal detected in: ${path}`,
    { path }
  );
}

export function absolutePath(path: string): CanonError {
  return new CanonError(
    CanonErrorCode.ABSOLUTE_PATH_REJECTED,
    `Absolute path not allowed: ${path}`,
    { path }
  );
}

export function projectLocked(lockInfo: { pid: number; hostname: string; acquired_at: string }): CanonError {
  return new CanonError(
    CanonErrorCode.PROJECT_LOCKED,
    `Project is locked by PID ${lockInfo.pid} on ${lockInfo.hostname} since ${lockInfo.acquired_at}`,
    { lockHolder: lockInfo }
  );
}

export function invalidSchema(zodErrors: unknown): CanonError {
  return new CanonError(
    CanonErrorCode.INVALID_SCHEMA,
    'Project data does not match expected schema',
    { zodErrors }
  );
}

export function invalidJson(path: string, originalError?: Error): CanonError {
  return new CanonError(
    CanonErrorCode.INVALID_JSON,
    `Invalid JSON in file: ${path}`,
    { path, originalError }
  );
}

export function integrityCheckFailed(expected: string, actual: string, path?: string): CanonError {
  return new CanonError(
    CanonErrorCode.INTEGRITY_CHECK_FAILED,
    `Integrity check failed: hash mismatch`,
    { expectedHash: expected, actualHash: actual, path }
  );
}

export function hashMismatch(expected: string, actual: string): CanonError {
  return new CanonError(
    CanonErrorCode.HASH_MISMATCH,
    `Hash mismatch: expected ${expected.substring(0, 16)}..., got ${actual.substring(0, 16)}...`,
    { expected, actual },
    { recoverable: true }
  );
}

export function corruptedData(message: string, path?: string): CanonError {
  return new CanonError(
    CanonErrorCode.CORRUPTED_DATA,
    message,
    { path },
    { recoverable: true }
  );
}

export function versionMismatch(found: string, expected: string): CanonError {
  return new CanonError(
    CanonErrorCode.VERSION_MISMATCH,
    `Schema version mismatch: found ${found}, expected ${expected}`,
    { found, expected }
  );
}

export function invariantViolated(name: string, message: string): CanonError {
  return new CanonError(
    CanonErrorCode.INVARIANT_VIOLATED,
    `Invariant violated [${name}]: ${message}`,
    { invariantName: name }
  );
}

export function projectAlreadyExists(path: string): CanonError {
  return new CanonError(
    CanonErrorCode.PROJECT_ALREADY_EXISTS,
    `Project already exists at: ${path}`,
    { path }
  );
}

export function projectNotFound(path: string): CanonError {
  return new CanonError(
    CanonErrorCode.PROJECT_NOT_FOUND,
    `No project found at: ${path}`,
    { path }
  );
}
export function ioError(message: string, originalError?: Error): CanonError {
  return new CanonError(
    CanonErrorCode.UNKNOWN_ERROR,
    message,
    { originalError }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WRAP UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wrap une erreur inconnue en CanonError si ce n'en est pas déjà une.
 */
export function wrapError(error: unknown, fallbackCode: CanonErrorCode = CanonErrorCode.UNKNOWN_ERROR): CanonError {
  if (error instanceof CanonError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new CanonError(
      fallbackCode,
      error.message,
      { originalError: error }
    );
  }
  
  return new CanonError(
    fallbackCode,
    String(error),
    {}
  );
}

/**
 * Vérifie si une erreur est une CanonError
 */
export function isCanonError(error: unknown): error is CanonError {
  return error instanceof CanonError;
}

/**
 * Factory functions groupées (comme dans les conversations)
 */
export const CanonErrors = {
  pathUnsafe,
  pathTraversal,
  absolutePath,
  fileNotFound,
  fileExists,
  corrupted: corruptedData,
  hashMismatch,
  invalidJson,
  projectLocked,
  versionMismatch,
  invariantViolation: invariantViolated
};
