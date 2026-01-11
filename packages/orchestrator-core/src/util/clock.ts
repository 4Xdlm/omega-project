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
export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }

  nowISO(): string {
    return new Date(this.now()).toISOString();
  }
}

/**
 * Deterministic clock for testing.
 * Time advances only when explicitly incremented.
 */
export class DeterministicClock implements Clock {
  private currentTime: number;

  /**
   * Creates a deterministic clock starting at specified time.
   * @param startTime - Initial timestamp in ms (default: 0)
   */
  constructor(startTime: number = 0) {
    this.currentTime = startTime;
  }

  now(): number {
    return this.currentTime;
  }

  nowISO(): string {
    return new Date(this.currentTime).toISOString();
  }

  /**
   * Advances clock by specified milliseconds.
   * @param ms - Milliseconds to advance
   */
  advance(ms: number): void {
    if (ms < 0) {
      throw new Error('Cannot advance clock by negative value');
    }
    this.currentTime += ms;
  }

  /**
   * Sets clock to specific timestamp.
   * @param time - Timestamp in ms
   */
  setTime(time: number): void {
    if (time < 0) {
      throw new Error('Cannot set clock to negative value');
    }
    this.currentTime = time;
  }

  /**
   * Resets clock to initial state (0).
   */
  reset(): void {
    this.currentTime = 0;
  }
}

/**
 * Creates a system clock instance.
 * @returns SystemClock instance
 */
export function createSystemClock(): Clock {
  return new SystemClock();
}

/**
 * Creates a deterministic clock instance for testing.
 * @param startTime - Initial timestamp in ms (default: 0)
 * @returns DeterministicClock instance
 */
export function createDeterministicClock(startTime: number = 0): DeterministicClock {
  return new DeterministicClock(startTime);
}
