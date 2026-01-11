/**
 * @fileoverview RunContext - Execution context with injectable dependencies.
 * Ensures deterministic execution through dependency injection.
 * @module @omega/orchestrator-core/core/RunContext
 */
import type { Clock } from '../util/clock.js';
import type { PlatformInfo, RunContextData, IdFactory } from './types.js';
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
 * RunContext implementation.
 * Provides deterministic execution context through dependency injection.
 */
export declare class RunContext implements RunContextData {
    readonly run_id: string;
    readonly seed: string;
    readonly clock: Clock;
    readonly platform: PlatformInfo;
    readonly created_at: string;
    private readonly idFactory;
    /**
     * Creates a new RunContext.
     * @param options - Context options including seed (required)
     * @throws Error if seed is empty
     */
    constructor(options: RunContextOptions);
    /**
     * Generates a new unique ID using the injected factory.
     * Deterministic given the same seed.
     * @returns Unique ID string
     */
    generateId(): string;
    /**
     * Gets current timestamp from injected clock.
     * @returns ISO timestamp string
     */
    timestamp(): string;
    /**
     * Converts context to plain data object (for serialization).
     * @returns RunContextData object
     */
    toData(): RunContextData;
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
export declare function createRunContext(options: RunContextOptions): RunContext;
/**
 * Validates that a value is a valid RunContextData.
 * @param value - Value to validate
 * @returns true if valid
 */
export declare function isValidRunContextData(value: unknown): value is RunContextData;
//# sourceMappingURL=RunContext.d.ts.map