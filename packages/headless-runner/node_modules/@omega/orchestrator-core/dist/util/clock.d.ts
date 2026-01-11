/**
 * @fileoverview Injectable clock abstraction for deterministic time handling.
 * NEVER use Date.now() directly - always inject a Clock instance.
 * @module @omega/orchestrator-core/util/clock
 */
/**
 * Clock interface for injectable time source.
 * Enables deterministic execution by controlling time.
 */
export interface Clock {
    /**
     * Returns current timestamp in milliseconds since epoch.
     * @returns Current time in ms
     */
    now(): number;
    /**
     * Returns current timestamp as ISO 8601 string.
     * @returns ISO timestamp string
     */
    nowISO(): string;
}
/**
 * System clock implementation using real time.
 * Use only in production - NOT for tests requiring determinism.
 */
export declare class SystemClock implements Clock {
    now(): number;
    nowISO(): string;
}
/**
 * Deterministic clock for testing.
 * Time advances only when explicitly incremented.
 */
export declare class DeterministicClock implements Clock {
    private currentTime;
    /**
     * Creates a deterministic clock starting at specified time.
     * @param startTime - Initial timestamp in ms (default: 0)
     */
    constructor(startTime?: number);
    now(): number;
    nowISO(): string;
    /**
     * Advances clock by specified milliseconds.
     * @param ms - Milliseconds to advance
     */
    advance(ms: number): void;
    /**
     * Sets clock to specific timestamp.
     * @param time - Timestamp in ms
     */
    setTime(time: number): void;
    /**
     * Resets clock to initial state (0).
     */
    reset(): void;
}
/**
 * Creates a system clock instance.
 * @returns SystemClock instance
 */
export declare function createSystemClock(): Clock;
/**
 * Creates a deterministic clock instance for testing.
 * @param startTime - Initial timestamp in ms (default: 0)
 * @returns DeterministicClock instance
 */
export declare function createDeterministicClock(startTime?: number): DeterministicClock;
//# sourceMappingURL=clock.d.ts.map