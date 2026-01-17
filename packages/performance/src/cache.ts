/**
 * @fileoverview OMEGA Performance - Cache Utilities
 * @module @omega/performance/cache
 *
 * Caching and memoization utilities.
 */

import type { CacheEntry, CacheStats, CacheOptions } from './types.js';
import { now } from './timer.js';

// ═══════════════════════════════════════════════════════════════════════════════
// LRU CACHE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * LRU (Least Recently Used) cache.
 */
export class LRUCache<T> {
  private readonly maxSize: number;
  private readonly ttlMs?: number;
  private readonly onEvict?: (key: string, value: T) => void;
  private readonly cache = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 100;
    this.ttlMs = options.ttlMs;
    this.onEvict = options.onEvict as ((key: string, value: T) => void) | undefined;
  }

  /**
   * Get a value from the cache.
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check TTL
    if (this.ttlMs && now() - entry.createdAt > this.ttlMs) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;

    // Update access time and move to end (most recently used)
    const updated: CacheEntry<T> = {
      ...entry,
      accessedAt: now(),
      hits: entry.hits + 1,
    };
    this.cache.delete(key);
    this.cache.set(key, updated);

    return entry.value;
  }

  /**
   * Set a value in the cache.
   */
  set(key: string, value: T): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value as string;
      const entry = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      this.evictions++;
      if (entry) {
        this.onEvict?.(oldestKey, entry.value);
      }
    }

    const entry: CacheEntry<T> = {
      value,
      createdAt: now(),
      accessedAt: now(),
      hits: 0,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (this.ttlMs && now() - entry.createdAt > this.ttlMs) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key.
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.onEvict?.(key, entry.value);
    }
    return this.cache.delete(key);
  }

  /**
   * Clear the cache.
   */
  clear(): void {
    for (const [key, entry] of this.cache) {
      this.onEvict?.(key, entry.value);
    }
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get cache size.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      evictions: this.evictions,
    };
  }

  /**
   * Get all keys.
   */
  keys(): string[] {
    return [...this.cache.keys()];
  }

  /**
   * Prune expired entries.
   */
  prune(): number {
    if (!this.ttlMs) return 0;

    let pruned = 0;
    const now_ = now();

    for (const [key, entry] of this.cache) {
      if (now_ - entry.createdAt > this.ttlMs) {
        this.delete(key);
        pruned++;
      }
    }

    return pruned;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMOIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Memoize a function with a single argument.
 */
export function memoize<A, R>(fn: (arg: A) => R): (arg: A) => R {
  const cache = new Map<A, R>();

  return (arg: A): R => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }

    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}

/**
 * Memoize a function with a custom key function.
 */
export function memoizeWith<A extends unknown[], R>(
  keyFn: (...args: A) => string,
  fn: (...args: A) => R,
  options: CacheOptions = {}
): (...args: A) => R {
  const cache = new LRUCache<R>(options);

  return (...args: A): R => {
    const key = keyFn(...args);
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Memoize an async function.
 */
export function memoizeAsync<A, R>(fn: (arg: A) => Promise<R>): (arg: A) => Promise<R> {
  const cache = new Map<A, Promise<R>>();

  return async (arg: A): Promise<R> => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }

    const promise = fn(arg);
    cache.set(arg, promise);

    try {
      return await promise;
    } catch (error) {
      // Remove failed promises from cache
      cache.delete(arg);
      throw error;
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHED COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a cached computation that only recomputes when dependencies change.
 */
export function computed<T>(fn: () => T, getDeps: () => unknown[]): () => T {
  let cachedValue: T | undefined;
  let cachedDeps: unknown[] | undefined;

  return (): T => {
    const deps = getDeps();

    // Check if deps changed
    if (cachedDeps && deps.length === cachedDeps.length) {
      let same = true;
      for (let i = 0; i < deps.length; i++) {
        if (deps[i] !== cachedDeps[i]) {
          same = false;
          break;
        }
      }
      if (same) {
        return cachedValue!;
      }
    }

    cachedValue = fn();
    cachedDeps = deps;
    return cachedValue;
  };
}
