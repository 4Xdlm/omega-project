/**
 * @fileoverview OMEGA Performance - Timer Utilities
 * @module @omega/performance/timer
 *
 * High-resolution timing utilities.
 */

import type { TimerResult, TimerOptions } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HIGH-RESOLUTION TIME
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get current high-resolution time in milliseconds.
 */
export function now(): number {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  // Fallback for environments without performance.now
  const [sec, nsec] = process.hrtime();
  return sec * 1000 + nsec / 1_000_000;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * High-resolution timer.
 */
export class Timer {
  private readonly name: string;
  private readonly metadata?: Record<string, unknown>;
  private startTime: number = 0;
  private endTime: number = 0;
  private running: boolean = false;

  constructor(options: TimerOptions = {}) {
    this.name = options.name ?? 'timer';
    this.metadata = options.metadata;
  }

  /**
   * Start the timer.
   */
  start(): this {
    if (this.running) {
      throw new Error('Timer is already running');
    }
    this.startTime = now();
    this.endTime = 0;
    this.running = true;
    return this;
  }

  /**
   * Stop the timer and return result.
   */
  stop(): TimerResult {
    if (!this.running) {
      throw new Error('Timer is not running');
    }
    this.endTime = now();
    this.running = false;

    return {
      name: this.name,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.endTime - this.startTime,
      metadata: this.metadata,
    };
  }

  /**
   * Get elapsed time without stopping.
   */
  elapsed(): number {
    if (!this.running) {
      return this.endTime - this.startTime;
    }
    return now() - this.startTime;
  }

  /**
   * Check if timer is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Reset the timer.
   */
  reset(): void {
    this.startTime = 0;
    this.endTime = 0;
    this.running = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Measure execution time of a synchronous function.
 */
export function time<T>(fn: () => T, _name?: string): { result: T; duration: number } {
  const start = now();
  const result = fn();
  const duration = now() - start;
  return { result, duration };
}

/**
 * Measure execution time of an async function.
 */
export async function timeAsync<T>(
  fn: () => Promise<T>,
  _name?: string
): Promise<{ result: T; duration: number }> {
  const start = now();
  const result = await fn();
  const duration = now() - start;
  return { result, duration };
}

/**
 * Create a timed wrapper for a function.
 */
export function timed<T extends (...args: never[]) => unknown>(
  fn: T,
  onComplete?: (duration: number, args: Parameters<T>) => void
): T {
  return ((...args: Parameters<T>) => {
    const start = now();
    const result = fn(...args);

    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = now() - start;
        onComplete?.(duration, args);
      }) as ReturnType<T>;
    }

    const duration = now() - start;
    onComplete?.(duration, args);
    return result;
  }) as T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sleep for specified milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Measure multiple runs and return statistics.
 */
export function timeMultiple<T>(
  fn: () => T,
  iterations: number
): { results: T[]; durations: number[] } {
  const results: T[] = [];
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { result, duration } = time(fn);
    results.push(result);
    durations.push(duration);
  }

  return { results, durations };
}

/**
 * Create a stopwatch for multiple laps.
 */
export class Stopwatch {
  private readonly laps: { name: string; time: number }[] = [];
  private startTime: number = 0;
  private lastLapTime: number = 0;

  /**
   * Start the stopwatch.
   */
  start(): this {
    this.startTime = now();
    this.lastLapTime = this.startTime;
    this.laps.length = 0;
    return this;
  }

  /**
   * Record a lap.
   */
  lap(name: string): number {
    const currentTime = now();
    const lapTime = currentTime - this.lastLapTime;
    this.laps.push({ name, time: lapTime });
    this.lastLapTime = currentTime;
    return lapTime;
  }

  /**
   * Get total elapsed time.
   */
  total(): number {
    return now() - this.startTime;
  }

  /**
   * Get all laps.
   */
  getLaps(): readonly { name: string; time: number }[] {
    return this.laps;
  }

  /**
   * Get summary.
   */
  getSummary(): { total: number; laps: readonly { name: string; time: number }[] } {
    return {
      total: this.total(),
      laps: this.laps,
    };
  }
}
