/**
 * Raw Storage Error Hierarchy
 * Standard: NASA-Grade L4
 *
 * Error codes follow pattern: RAW_E{SEQ}_{DESCRIPTION}
 */

// ============================================================
// Base Error
// ============================================================

export abstract class RawError extends Error {
  abstract readonly code: string;
  readonly module = 'raw' as const;
  readonly context: Readonly<Record<string, unknown>>;
  readonly timestamp: number;

  constructor(
    message: string,
    context: Record<string, unknown> = {},
    timestampProvider: () => number = () => Date.now()
  ) {
    super(message);
    this.name = this.constructor.name;
    this.context = Object.freeze({ ...context });
    this.timestamp = timestampProvider();
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// ============================================================
// Path Errors (RAW_E001_*)
// ============================================================

export class RawPathError extends RawError {
  readonly code = 'RAW_E001_PATH_ERROR';
}

export class RawPathTraversalError extends RawError {
  readonly code = 'RAW_E001_PATH_TRAVERSAL';
}

export class RawPathInvalidError extends RawError {
  readonly code = 'RAW_E001_PATH_INVALID';
}

// ============================================================
// Storage Errors (RAW_E002_*)
// ============================================================

export class RawStorageError extends RawError {
  readonly code = 'RAW_E002_STORAGE_ERROR';
}

export class RawStorageWriteError extends RawError {
  readonly code = 'RAW_E002_WRITE_FAILED';
}

export class RawStorageReadError extends RawError {
  readonly code = 'RAW_E002_READ_FAILED';
}

export class RawStorageDeleteError extends RawError {
  readonly code = 'RAW_E002_DELETE_FAILED';
}

export class RawStorageNotFoundError extends RawError {
  readonly code = 'RAW_E002_NOT_FOUND';
}

export class RawStorageQuotaError extends RawError {
  readonly code = 'RAW_E002_QUOTA_EXCEEDED';
}

// ============================================================
// Crypto Errors (RAW_E003_*)
// ============================================================

export class RawCryptoError extends RawError {
  readonly code = 'RAW_E003_CRYPTO_ERROR';
}

export class RawCryptoEncryptError extends RawError {
  readonly code = 'RAW_E003_ENCRYPT_FAILED';
}

export class RawCryptoDecryptError extends RawError {
  readonly code = 'RAW_E003_DECRYPT_FAILED';
}

export class RawCryptoKeyNotFoundError extends RawError {
  readonly code = 'RAW_E003_KEY_NOT_FOUND';
}

export class RawCryptoKeyExpiredError extends RawError {
  readonly code = 'RAW_E003_KEY_EXPIRED';
}

// ============================================================
// Backend Errors (RAW_E004_*)
// ============================================================

export class RawBackendError extends RawError {
  readonly code = 'RAW_E004_BACKEND_ERROR';
}

export class RawBackendInitError extends RawError {
  readonly code = 'RAW_E004_INIT_FAILED';
}

export class RawBackendClosedError extends RawError {
  readonly code = 'RAW_E004_CLOSED';
}

// ============================================================
// TTL Errors (RAW_E005_*)
// ============================================================

export class RawTTLError extends RawError {
  readonly code = 'RAW_E005_TTL_ERROR';
}

export class RawTTLExpiredError extends RawError {
  readonly code = 'RAW_E005_EXPIRED';
}

// ============================================================
// Compression Errors (RAW_E006_*)
// ============================================================

export class RawCompressionError extends RawError {
  readonly code = 'RAW_E006_COMPRESSION_ERROR';
}

export class RawDecompressionError extends RawError {
  readonly code = 'RAW_E006_DECOMPRESSION_FAILED';
}

// ============================================================
// Backup Errors (RAW_E007_*)
// ============================================================

export class RawBackupError extends RawError {
  readonly code = 'RAW_E007_BACKUP_ERROR';
}

export class RawRestoreError extends RawError {
  readonly code = 'RAW_E007_RESTORE_FAILED';
}

// ============================================================
// Checksum Errors (RAW_E008_*)
// ============================================================

export class RawChecksumError extends RawError {
  readonly code = 'RAW_E008_CHECKSUM_ERROR';
}

export class RawChecksumMismatchError extends RawError {
  readonly code = 'RAW_E008_CHECKSUM_MISMATCH';
}

// ============================================================
// Error Type Guard
// ============================================================

export function isRawError(error: unknown): error is RawError {
  return error instanceof RawError;
}
