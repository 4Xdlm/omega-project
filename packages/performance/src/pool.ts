/**
 * @fileoverview OMEGA Performance - Object Pool
 * @module @omega/performance/pool
 *
 * Object pooling for reduced allocation overhead.
 */

import type { PoolOptions, PoolStats, Lazy } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// OBJECT POOL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generic object pool.
 */
export class ObjectPool<T> {
  private readonly create: () => T;
  private readonly reset?: (item: T) => void;
  private readonly maxSize: number;
  private readonly pool: T[] = [];
  private created = 0;
  private reused = 0;
  private inUse = 0;

  constructor(options: PoolOptions<T>) {
    this.create = options.create;
    this.reset = options.reset;
    this.maxSize = options.maxSize ?? 100;

    // Pre-populate pool
    const initialSize = options.initialSize ?? 0;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.create());
      this.created++;
    }
  }

  /**
   * Acquire an object from the pool.
   */
  acquire(): T {
    this.inUse++;

    if (this.pool.length > 0) {
      this.reused++;
      return this.pool.pop()!;
    }

    this.created++;
    return this.create();
  }

  /**
   * Release an object back to the pool.
   */
  release(item: T): void {
    this.inUse--;

    if (this.pool.length < this.maxSize) {
      this.reset?.(item);
      this.pool.push(item);
    }
    // If pool is full, item is discarded (GC will collect it)
  }

  /**
   * Use an object within a callback and auto-release.
   */
  use<R>(fn: (item: T) => R): R {
    const item = this.acquire();
    try {
      return fn(item);
    } finally {
      this.release(item);
    }
  }

  /**
   * Use an object within an async callback and auto-release.
   */
  async useAsync<R>(fn: (item: T) => Promise<R>): Promise<R> {
    const item = this.acquire();
    try {
      return await fn(item);
    } finally {
      this.release(item);
    }
  }

  /**
   * Get pool statistics.
   */
  getStats(): PoolStats {
    return {
      size: this.pool.length,
      available: this.pool.length,
      inUse: this.inUse,
      created: this.created,
      reused: this.reused,
    };
  }

  /**
   * Clear the pool.
   */
  clear(): void {
    this.pool.length = 0;
  }

  /**
   * Pre-warm the pool with objects.
   */
  warmup(count: number): void {
    const toCreate = Math.min(count, this.maxSize - this.pool.length);
    for (let i = 0; i < toCreate; i++) {
      this.pool.push(this.create());
      this.created++;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAZY EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a lazy value.
 */
export function lazy<T>(fn: () => T): Lazy<T> {
  let value: T | undefined;
  let evaluated = false;

  return {
    get: (): T => {
      if (!evaluated) {
        value = fn();
        evaluated = true;
      }
      return value as T;
    },
    isEvaluated: () => evaluated,
    reset: () => {
      value = undefined;
      evaluated = false;
    },
  };
}

/**
 * Create an async lazy value.
 */
export function lazyAsync<T>(fn: () => Promise<T>): {
  get: () => Promise<T>;
  isEvaluated: () => boolean;
  reset: () => void;
} {
  let value: T | undefined;
  let promise: Promise<T> | undefined;
  let evaluated = false;

  return {
    get: async (): Promise<T> => {
      if (evaluated) {
        return value as T;
      }
      if (promise) {
        return promise;
      }
      promise = fn().then((v) => {
        value = v;
        evaluated = true;
        return v;
      });
      return promise;
    },
    isEvaluated: () => evaluated,
    reset: () => {
      value = undefined;
      promise = undefined;
      evaluated = false;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// THROTTLE AND DEBOUNCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Throttle a function to run at most once per interval.
 */
export function throttle<A extends unknown[], R>(
  fn: (...args: A) => R,
  intervalMs: number
): (...args: A) => R | undefined {
  let lastCall = 0;
  let lastResult: R | undefined;

  return (...args: A): R | undefined => {
    const now = Date.now();
    if (now - lastCall >= intervalMs) {
      lastCall = now;
      lastResult = fn(...args);
    }
    return lastResult;
  };
}

/**
 * Debounce a function to run only after idle period.
 */
export function debounce<A extends unknown[], R>(
  fn: (...args: A) => R,
  delayMs: number
): {
  (...args: A): void;
  cancel: () => void;
  flush: () => R | undefined;
} {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: A | undefined;
  let lastResult: R | undefined;

  const debounced = (...args: A): void => {
    lastArgs = args;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      if (lastArgs) {
        lastResult = fn(...lastArgs);
      }
      timeoutId = undefined;
    }, delayMs);
  };

  debounced.cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    lastArgs = undefined;
  };

  debounced.flush = (): R | undefined => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
      lastResult = fn(...lastArgs);
      lastArgs = undefined;
    }
    return lastResult;
  };

  return debounced;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rate limiter using token bucket algorithm.
 */
export class RateLimiter {
  private readonly rate: number; // tokens per second
  private readonly burst: number; // max tokens
  private tokens: number;
  private lastRefill: number;

  constructor(rate: number, burst?: number) {
    this.rate = rate;
    this.burst = burst ?? rate;
    this.tokens = this.burst;
    this.lastRefill = Date.now();
  }

  /**
   * Try to acquire a token.
   */
  tryAcquire(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    return false;
  }

  /**
   * Get remaining tokens.
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Wait until a token is available.
   */
  async acquire(): Promise<void> {
    while (!this.tryAcquire()) {
      // Wait for one token worth of time
      await new Promise((resolve) => setTimeout(resolve, 1000 / this.rate));
    }
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.burst, this.tokens + elapsed * this.rate);
    this.lastRefill = now;
  }
}
