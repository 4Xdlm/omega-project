/**
 * Atlas Error Hierarchy
 * Standard: NASA-Grade L4
 *
 * Error codes follow pattern: ATLAS_E{SEQ}_{DESCRIPTION}
 */

// ============================================================
// Base Error
// ============================================================

export abstract class AtlasError extends Error {
  abstract readonly code: string;
  readonly module = 'atlas' as const;
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
// Query Errors (ATLAS_E001_*)
// ============================================================

export class AtlasQueryError extends AtlasError {
  readonly code = 'ATLAS_E001_QUERY_ERROR';
}

export class AtlasQueryInvalidFilterError extends AtlasError {
  readonly code = 'ATLAS_E001_INVALID_FILTER';
}

export class AtlasQueryInvalidOperatorError extends AtlasError {
  readonly code = 'ATLAS_E001_INVALID_OPERATOR';
}

export class AtlasQueryFieldNotFoundError extends AtlasError {
  readonly code = 'ATLAS_E001_FIELD_NOT_FOUND';
}

// ============================================================
// Index Errors (ATLAS_E002_*)
// ============================================================

export class AtlasIndexError extends AtlasError {
  readonly code = 'ATLAS_E002_INDEX_ERROR';
}

export class AtlasIndexAlreadyExistsError extends AtlasError {
  readonly code = 'ATLAS_E002_INDEX_EXISTS';
}

export class AtlasIndexNotFoundError extends AtlasError {
  readonly code = 'ATLAS_E002_INDEX_NOT_FOUND';
}

export class AtlasIndexCorruptError extends AtlasError {
  readonly code = 'ATLAS_E002_INDEX_CORRUPT';
}

// ============================================================
// Subscription Errors (ATLAS_E003_*)
// ============================================================

export class AtlasSubscriptionError extends AtlasError {
  readonly code = 'ATLAS_E003_SUBSCRIPTION_ERROR';
}

export class AtlasSubscriptionNotFoundError extends AtlasError {
  readonly code = 'ATLAS_E003_SUBSCRIPTION_NOT_FOUND';
}

export class AtlasSubscriptionCallbackError extends AtlasError {
  readonly code = 'ATLAS_E003_CALLBACK_ERROR';
}

// ============================================================
// View Errors (ATLAS_E004_*)
// ============================================================

export class AtlasViewError extends AtlasError {
  readonly code = 'ATLAS_E004_VIEW_ERROR';
}

export class AtlasViewNotFoundError extends AtlasError {
  readonly code = 'ATLAS_E004_VIEW_NOT_FOUND';
}

export class AtlasViewAlreadyExistsError extends AtlasError {
  readonly code = 'ATLAS_E004_VIEW_EXISTS';
}

export class AtlasViewVersionConflictError extends AtlasError {
  readonly code = 'ATLAS_E004_VERSION_CONFLICT';
}

// ============================================================
// Projection Errors (ATLAS_E005_*)
// ============================================================

export class AtlasProjectionError extends AtlasError {
  readonly code = 'ATLAS_E005_PROJECTION_ERROR';
}

export class AtlasProjectionFailedError extends AtlasError {
  readonly code = 'ATLAS_E005_PROJECTION_FAILED';
}

// ============================================================
// Error Type Guard
// ============================================================

export function isAtlasError(error: unknown): error is AtlasError {
  return error instanceof AtlasError;
}
