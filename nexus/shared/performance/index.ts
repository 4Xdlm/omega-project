/**
 * Performance abstractions for testability
 * Standard: NASA-Grade L4
 *
 * CRITICAL: Never use performance.now() or Date.now() directly in production
 * All timing must be injectable for deterministic testing.
 *
 * @module performance
 */

// ============================================================================
// Clock Abstraction (for Date.now())
// ============================================================================

/**
 * Clock function type for timestamp generation
 * @public
 */
export type ClockFn = () => number;

let globalClock: ClockFn = () => Date.now();

/**
 * Set the global clock function
 * @public
 */
export function setClock(clock: ClockFn): void {
  globalClock = clock;
}

/**
 * Get the current global clock function
 * @public
 */
export function getClock(): ClockFn {
  return globalClock;
}

/**
 * Create a clock function with optional custom implementation
 * @public
 */
export function createClock(impl?: ClockFn): ClockFn {
  return impl || (() => Date.now());
}

/**
 * Reset global clock to default (Date.now)
 * @public
 */
export function resetClock(): void {
  globalClock = () => Date.now();
}

// ============================================================================
// Performance Abstraction (for performance.now())
// ============================================================================

/**
 * High-resolution timer function type
 * @public
 */
export type PerfNowFn = () => number;

const defaultPerfNow: PerfNowFn = () => {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  // Fallback for environments without performance.now
  return Date.now();
};

let globalPerfNow: PerfNowFn = defaultPerfNow;

/**
 * Set the global performance.now function
 * @public
 */
export function setPerfNow(perfNow: PerfNowFn): void {
  globalPerfNow = perfNow;
}

/**
 * Get the current global performance.now function
 * @public
 */
export function getPerfNow(): PerfNowFn {
  return globalPerfNow;
}

/**
 * Create a performance.now function with optional custom implementation
 * @public
 */
export function createPerfNow(impl?: PerfNowFn): PerfNowFn {
  return impl || defaultPerfNow;
}

/**
 * Reset global perfNow to default
 * @public
 */
export function resetPerfNow(): void {
  globalPerfNow = defaultPerfNow;
}

// ============================================================================
// Stopwatch Utility
// ============================================================================

/**
 * Stopwatch for measuring durations with injectable timer
 * @public
 */
export interface Stopwatch {
  start(): void;
  stop(): number;
  elapsed(): number;
  reset(): void;
}

/**
 * Create a stopwatch with injectable performance timer
 * @public
 */
export function createStopwatch(perfNow?: PerfNowFn): Stopwatch {
  const timer = perfNow || getPerfNow();
  let startTime: number | null = null;
  let endTime: number | null = null;

  return {
    start(): void {
      startTime = timer();
      endTime = null;
    },
    stop(): number {
      if (startTime === null) {
        throw new Error('Stopwatch not started');
      }
      endTime = timer();
      return endTime - startTime;
    },
    elapsed(): number {
      if (startTime === null) {
        return 0;
      }
      const end = endTime ?? timer();
      return end - startTime;
    },
    reset(): void {
      startTime = null;
      endTime = null;
    },
  };
}
