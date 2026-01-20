/**
 * OMEGA Base Error Hierarchy
 * Standard: NASA-Grade L4
 *
 * Base class for all OMEGA errors with:
 * - Typed error codes
 * - Structured context
 * - Injectable timestamp (testability)
 * - JSON serialization
 *
 * @packageDocumentation
 * @module @omega-private/nexus-shared
 * @public
 */

// ============================================================
// Types
// ============================================================

/**
 * Clock function type for injectable timestamps
 * @public
 */
export type ClockFn = () => number;

/**
 * Default clock using Date.now()
 * @internal
 */
export const defaultClock: ClockFn = () => Date.now();

// ============================================================
// Base Error
// ============================================================

/**
 * Base error class for all OMEGA errors.
 *
 * All OMEGA errors follow the convention:
 * - code: `{MODULE}_E{SEQ}_{DESCRIPTION}`
 * - module: lowercase module name
 * - context: structured error context
 * - timestamp: when error occurred (injectable for testing)
 *
 * @example
 * ```typescript
 * class MyModuleError extends OmegaError {
 *   readonly module = 'mymodule' as const;
 *
 *   constructor(
 *     code: string,
 *     message: string,
 *     context?: Record<string, unknown>,
 *     clock?: ClockFn
 *   ) {
 *     super(code, message, context, clock);
 *     this.name = 'MyModuleError';
 *   }
 * }
 * ```
 *
 * @public
 */
export abstract class OmegaError extends Error {
  /**
   * Error code following pattern: `{MODULE}_E{SEQ}_{DESCRIPTION}`
   */
  readonly code: string;

  /**
   * Module that produced this error
   */
  abstract readonly module: string;

  /**
   * Structured context for debugging
   */
  readonly context: Readonly<Record<string, unknown>>;

  /**
   * Timestamp when error was created
   */
  readonly timestamp: number;

  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
    clock: ClockFn = defaultClock
  ) {
    super(message);
    this.name = 'OmegaError';
    this.code = code;
    this.context = Object.freeze({ ...context });
    this.timestamp = clock();

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error to JSON for logging
   * @public
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      module: this.module,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * Create a formatted string representation
   * @public
   */
  toString(): string {
    return `[${this.code}] ${this.message}`;
  }
}

// ============================================================
// Type Guard
// ============================================================

/**
 * Type guard to check if an error is an OmegaError
 * @public
 */
export function isOmegaError(error: unknown): error is OmegaError {
  return error instanceof OmegaError;
}

// ============================================================
// Common Error Classes
// ============================================================

/**
 * Error for invalid configuration
 * @public
 */
export class OmegaConfigError extends OmegaError {
  readonly module = 'omega' as const;

  constructor(
    message: string,
    context?: Record<string, unknown>,
    clock?: ClockFn
  ) {
    super('OMEGA_E001_CONFIG_ERROR', message, context, clock);
    this.name = 'OmegaConfigError';
  }
}

/**
 * Error for validation failures
 * @public
 */
export class OmegaValidationError extends OmegaError {
  readonly module = 'omega' as const;

  constructor(
    message: string,
    context?: Record<string, unknown>,
    clock?: ClockFn
  ) {
    super('OMEGA_E002_VALIDATION_ERROR', message, context, clock);
    this.name = 'OmegaValidationError';
  }
}

/**
 * Error for timeout conditions
 * @public
 */
export class OmegaTimeoutError extends OmegaError {
  readonly module = 'omega' as const;

  constructor(
    message: string,
    context?: Record<string, unknown>,
    clock?: ClockFn
  ) {
    super('OMEGA_E003_TIMEOUT', message, context, clock);
    this.name = 'OmegaTimeoutError';
  }
}

/**
 * Error for not implemented features
 * @public
 */
export class OmegaNotImplementedError extends OmegaError {
  readonly module = 'omega' as const;

  constructor(
    feature: string,
    context?: Record<string, unknown>,
    clock?: ClockFn
  ) {
    super(
      'OMEGA_E004_NOT_IMPLEMENTED',
      `Feature not implemented: ${feature}`,
      { feature, ...context },
      clock
    );
    this.name = 'OmegaNotImplementedError';
  }
}

/**
 * Error for invariant violations (assertions)
 * @public
 */
export class OmegaInvariantError extends OmegaError {
  readonly module = 'omega' as const;

  constructor(
    invariant: string,
    context?: Record<string, unknown>,
    clock?: ClockFn
  ) {
    super(
      'OMEGA_E005_INVARIANT_VIOLATION',
      `Invariant violated: ${invariant}`,
      { invariant, ...context },
      clock
    );
    this.name = 'OmegaInvariantError';
  }
}
