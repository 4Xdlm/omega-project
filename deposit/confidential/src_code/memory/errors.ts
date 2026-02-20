/**
 * OMEGA Memory System - Error Classes
 * Phase D2 - NASA-Grade L4
 * 
 * Typed errors with codes. No generic Error throws.
 * All failures typed and traceable.
 */

import type { MemoryErrorCode, EntryId } from './types.js';
import { MEMORY_ERROR_CODES } from './types.js';

/**
 * Base memory error - all memory operations throw this.
 * Typed code enables exhaustive error handling.
 */
export class MemoryError extends Error {
  public readonly code: MemoryErrorCode;
  public readonly entryId: EntryId | null;
  public readonly lineNumber: number | null;
  public readonly cause: Error | null;

  constructor(
    code: MemoryErrorCode,
    message: string,
    options?: {
      entryId?: EntryId | null;
      lineNumber?: number | null;
      cause?: Error | null;
    }
  ) {
    super(message);
    this.name = 'MemoryError';
    this.code = code;
    this.entryId = options?.entryId ?? null;
    this.lineNumber = options?.lineNumber ?? null;
    this.cause = options?.cause ?? null;
    
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MemoryError);
    }
  }

  /** Create error with context string */
  public withContext(context: string): MemoryError {
    return new MemoryError(
      this.code,
      `${context}: ${this.message}`,
      {
        entryId: this.entryId,
        lineNumber: this.lineNumber,
        cause: this,
      }
    );
  }

  /** Convert to JSON-serializable object */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      entryId: this.entryId,
      lineNumber: this.lineNumber,
      stack: this.stack,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS - Consistent error creation
// ═══════════════════════════════════════════════════════════════════════════════

export function invalidJson(raw: string, lineNumber?: number, cause?: Error): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.INVALID_JSON,
    `Invalid JSON: ${cause?.message ?? 'parse failed'}`,
    { lineNumber: lineNumber ?? null, cause: cause ?? null }
  );
}

export function schemaViolation(message: string, entryId?: EntryId, lineNumber?: number): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.SCHEMA_VIOLATION,
    message,
    { entryId: entryId ?? null, lineNumber: lineNumber ?? null }
  );
}

export function invalidIdFormat(value: string, lineNumber?: number): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.INVALID_ID_FORMAT,
    `Invalid entry ID format: "${value}"`,
    { lineNumber: lineNumber ?? null }
  );
}

export function invalidTimestamp(value: string, lineNumber?: number): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.INVALID_TIMESTAMP,
    `Invalid timestamp format: "${value}"`,
    { lineNumber: lineNumber ?? null }
  );
}

export function invalidClass(value: string, lineNumber?: number): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.INVALID_CLASS,
    `Invalid entry class: "${value}"`,
    { lineNumber: lineNumber ?? null }
  );
}

export function missingField(field: string, lineNumber?: number): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.MISSING_FIELD,
    `Missing required field: "${field}"`,
    { lineNumber: lineNumber ?? null }
  );
}

export function duplicateId(id: EntryId, lineNumber: number): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.DUPLICATE_ID,
    `Duplicate entry ID: "${id}"`,
    { entryId: id, lineNumber }
  );
}

export function hashMismatch(expected: string, actual: string, lineNumber?: number): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.HASH_MISMATCH,
    `Hash mismatch: expected ${expected}, got ${actual}`,
    { lineNumber: lineNumber ?? null }
  );
}

export function chainBroken(message: string, lineNumber?: number): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.CHAIN_BROKEN,
    message,
    { lineNumber: lineNumber ?? null }
  );
}

export function genesisInvalid(message: string): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.GENESIS_INVALID,
    message,
    { lineNumber: 1 }
  );
}

export function fileNotFound(path: string): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.FILE_NOT_FOUND,
    `File not found: ${path}`
  );
}

export function readError(message: string, cause?: Error): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.READ_ERROR,
    message,
    { cause: cause ?? null }
  );
}

export function writeError(message: string, cause?: Error): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.WRITE_ERROR,
    message,
    { cause: cause ?? null }
  );
}

export function offsetOutOfBounds(offset: number, fileSize: number): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.OFFSET_OUT_OF_BOUNDS,
    `Offset ${offset} out of bounds (file size: ${fileSize})`
  );
}

export function lineTooLarge(size: number, maxSize: number, lineNumber?: number): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.LINE_TOO_LARGE,
    `Line too large: ${size} bytes (max: ${maxSize})`,
    { lineNumber: lineNumber ?? null }
  );
}

export function unauthorized(action: string, reason: string): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.UNAUTHORIZED,
    `Unauthorized ${action}: ${reason}`
  );
}

export function authorityDenied(reason: string): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.AUTHORITY_DENIED,
    `Authority denied: ${reason}`
  );
}

export function indexCorrupted(message: string): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.INDEX_CORRUPTED,
    `Index corrupted: ${message}`
  );
}

export function indexStale(expected: string, actual: string): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.INDEX_STALE,
    `Index stale: ledger hash changed (expected ${expected}, got ${actual})`
  );
}

export function entryNotFound(id: EntryId): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.ENTRY_NOT_FOUND,
    `Entry not found: ${id}`,
    { entryId: id }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

export function isMemoryError(error: unknown): error is MemoryError {
  return error instanceof MemoryError;
}
