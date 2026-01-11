/**
 * @fileoverview RunContext - Execution context with injectable dependencies.
 * Ensures deterministic execution through dependency injection.
 * @module @omega/orchestrator-core/core/RunContext
 */

import type { Clock } from '../util/clock.js';
import { createSystemClock } from '../util/clock.js';
import { sha256 } from '../util/hash.js';
import type { PlatformInfo, RunContextData, IdFactory } from './types.js';
import { SeededIdFactory } from './types.js';

/**
 * Options for creating a RunContext.
 */
export interface RunContextOptions {
  /** Seed for deterministic execution (REQUIRED) */
  seed: string;
  /** Injectable clock (defaults to SystemClock) */
  clock?: Clock;
  /** Injectable ID factory (defaults to SeededIdFactory) */
  idFactory?: IdFactory;
}

/**
 * Captures current platform information.
 * Called once at context creation, immutable thereafter.
 */
function capturePlatformInfo(): PlatformInfo {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
  };
}

/**
 * RunContext implementation.
 * Provides deterministic execution context through dependency injection.
 */
export class RunContext implements RunContextData {
  readonly run_id: string;
  readonly seed: string;
  readonly clock: Clock;
  readonly platform: PlatformInfo;
  readonly created_at: string;

  private readonly idFactory: IdFactory;

  /**
   * Creates a new RunContext.
   * @param options - Context options including seed (required)
   * @throws Error if seed is empty
   */
  constructor(options: RunContextOptions) {
    if (!options.seed || options.seed.trim() === '') {
      throw new Error('RunContext requires a non-empty seed');
    }

    this.seed = options.seed;
    this.clock = options.clock ?? createSystemClock();
    this.idFactory = options.idFactory ?? new SeededIdFactory(sha256(options.seed));
    this.platform = capturePlatformInfo();
    this.created_at = this.clock.nowISO();
    this.run_id = this.idFactory.next();
  }

  /**
   * Generates a new unique ID using the injected factory.
   * Deterministic given the same seed.
   * @returns Unique ID string
   */
  generateId(): string {
    return this.idFactory.next();
  }

  /**
   * Gets current timestamp from injected clock.
   * @returns ISO timestamp string
   */
  timestamp(): string {
    return this.clock.nowISO();
  }

  /**
   * Converts context to plain data object (for serialization).
   * @returns RunContextData object
   */
  toData(): RunContextData {
    return {
      run_id: this.run_id,
      seed: this.seed,
      clock: this.clock,
      platform: this.platform,
      created_at: this.created_at,
    };
  }
}

/**
 * Creates a RunContext with the given options.
 * @param options - Context options
 * @returns New RunContext instance
 *
 * @example
 * ```typescript
 * // Production usage
 * const ctx = createRunContext({ seed: 'my-seed-123' });
 *
 * // Test usage with deterministic clock
 * const clock = new DeterministicClock(1000);
 * const ctx = createRunContext({ seed: 'test-seed', clock });
 * ```
 */
export function createRunContext(options: RunContextOptions): RunContext {
  return new RunContext(options);
}

/**
 * Validates that a value is a valid RunContextData.
 * @param value - Value to validate
 * @returns true if valid
 */
export function isValidRunContextData(value: unknown): value is RunContextData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.run_id === 'string' &&
    typeof obj.seed === 'string' &&
    typeof obj.created_at === 'string' &&
    obj.clock !== undefined &&
    typeof obj.platform === 'object'
  );
}
