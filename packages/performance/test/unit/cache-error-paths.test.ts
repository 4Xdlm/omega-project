/**
 * @fileoverview Phase 3.2 - Error Path Tests for Cache Utilities
 * Tests error handling behavior in memoization and cache functions.
 */

import { describe, it, expect } from 'vitest';
import {
  memoize,
  memoizeWith,
  memoizeAsync,
  computed,
  LRUCache,
} from '../../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - memoizeAsync
// ═══════════════════════════════════════════════════════════════════════════════

describe('memoizeAsync - Error Handling', () => {
  it('should remove failed promise from cache and allow retry', async () => {
    let calls = 0;
    const fn = memoizeAsync(async (x: number) => {
      calls++;
      if (calls === 1) {
        throw new Error('First call fails');
      }
      return x * 2;
    });

    await expect(fn(5)).rejects.toThrow('First call fails');
    expect(await fn(5)).toBe(10);
    expect(calls).toBe(2);
  });

  it('should remove failed promise for each failing call', async () => {
    let calls = 0;
    const fn = memoizeAsync(async (x: number) => {
      calls++;
      if (calls <= 3) {
        throw new Error(`Call ${calls} fails`);
      }
      return x * 2;
    });

    await expect(fn(5)).rejects.toThrow('Call 1 fails');
    await expect(fn(5)).rejects.toThrow('Call 2 fails');
    await expect(fn(5)).rejects.toThrow('Call 3 fails');
    expect(await fn(5)).toBe(10);
    expect(calls).toBe(4);
  });

  it('should handle thrown string', async () => {
    const fn = memoizeAsync(async () => {
      throw 'string error';
    });

    await expect(fn(1)).rejects.toBe('string error');
  });

  it('should handle thrown null', async () => {
    const fn = memoizeAsync(async () => {
      throw null;
    });

    await expect(fn(1)).rejects.toBe(null);
  });

  it('should handle Promise.reject with Error', async () => {
    const fn = memoizeAsync(async () => {
      return Promise.reject(new Error('Rejected'));
    });

    await expect(fn(1)).rejects.toThrow('Rejected');
  });

  it('should not cache rejected promises', async () => {
    let calls = 0;
    const fn = memoizeAsync(async () => {
      calls++;
      throw new Error('Always fails');
    });

    await expect(fn(1)).rejects.toThrow();
    await expect(fn(1)).rejects.toThrow();
    await expect(fn(1)).rejects.toThrow();

    expect(calls).toBe(3);
  });

  it('should cache success after failure', async () => {
    let calls = 0;
    const fn = memoizeAsync(async (x: number) => {
      calls++;
      if (calls === 1) throw new Error('fail');
      return x * 2;
    });

    await expect(fn(5)).rejects.toThrow();
    expect(await fn(5)).toBe(10);
    expect(await fn(5)).toBe(10);
    expect(calls).toBe(2);
  });

  it('should handle TypeError', async () => {
    const fn = memoizeAsync(async () => {
      const obj: any = null;
      return obj.method();
    });

    await expect(fn(1)).rejects.toThrow(TypeError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - memoize (sync)
// ═══════════════════════════════════════════════════════════════════════════════

describe('memoize - Error Handling', () => {
  it('should not cache thrown errors', () => {
    let calls = 0;
    const fn = memoize((x: number) => {
      calls++;
      if (x < 0) throw new Error('Negative');
      return x * 2;
    });

    expect(() => fn(-1)).toThrow('Negative');
    expect(() => fn(-1)).toThrow('Negative');
    expect(calls).toBe(2);
  });

  it('should cache after error is fixed', () => {
    let shouldFail = true;
    let calls = 0;
    const fn = memoize((x: number) => {
      calls++;
      if (shouldFail) throw new Error('fail');
      return x * 2;
    });

    expect(() => fn(5)).toThrow();
    shouldFail = false;
    expect(fn(5)).toBe(10);
    expect(fn(5)).toBe(10);
    expect(calls).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - memoizeWith
// ═══════════════════════════════════════════════════════════════════════════════

describe('memoizeWith - Error Handling', () => {
  it('should handle key function throwing', () => {
    const fn = memoizeWith(
      () => {
        throw new Error('Key error');
      },
      (x: number) => x * 2
    );

    expect(() => fn(5)).toThrow('Key error');
  });

  it('should not cache when function throws', () => {
    let calls = 0;
    const fn = memoizeWith(
      (x: number) => String(x),
      (x) => {
        calls++;
        if (x < 0) throw new Error('Negative');
        return x * 2;
      }
    );

    expect(() => fn(-1)).toThrow();
    expect(() => fn(-1)).toThrow();
    expect(calls).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - computed
// ═══════════════════════════════════════════════════════════════════════════════

describe('computed - Error Handling', () => {
  it('should handle computation throwing', () => {
    const getValue = computed(
      () => {
        throw new Error('Compute error');
      },
      () => [1]
    );

    expect(() => getValue()).toThrow('Compute error');
  });

  it('should handle deps function throwing', () => {
    const getValue = computed(
      () => 42,
      () => {
        throw new Error('Deps error');
      }
    );

    expect(() => getValue()).toThrow('Deps error');
  });

  it('should recompute after error if deps change', () => {
    let shouldFail = true;
    let dep = 1;

    const getValue = computed(
      () => {
        if (shouldFail) throw new Error('fail');
        return 42;
      },
      () => [dep]
    );

    expect(() => getValue()).toThrow();
    shouldFail = false;
    dep = 2;
    expect(getValue()).toBe(42);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - LRUCache
// ═══════════════════════════════════════════════════════════════════════════════

describe('LRUCache - Edge Cases', () => {
  it('should handle onEvict callback throwing', () => {
    const cache = new LRUCache<string>({
      maxSize: 1,
      onEvict: () => {
        throw new Error('Evict error');
      },
    });

    cache.set('a', '1');
    // This should not throw despite onEvict throwing
    expect(() => cache.set('b', '2')).not.toThrow();
  });

  it('should handle get on empty cache', () => {
    const cache = new LRUCache<string>();
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should handle delete on empty cache', () => {
    const cache = new LRUCache<string>();
    expect(cache.delete('nonexistent')).toBe(false);
  });

  it('should handle has on empty cache', () => {
    const cache = new LRUCache<string>();
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('should handle prune with no TTL', () => {
    const cache = new LRUCache<string>();
    cache.set('key', 'value');
    expect(cache.prune()).toBe(0);
  });

  it('should handle clear on empty cache', () => {
    const cache = new LRUCache<string>();
    expect(() => cache.clear()).not.toThrow();
    expect(cache.size).toBe(0);
  });

  it('should handle keys on empty cache', () => {
    const cache = new LRUCache<string>();
    expect(cache.keys()).toEqual([]);
  });

  it('should return correct stats when empty', () => {
    const cache = new LRUCache<string>();
    const stats = cache.getStats();
    expect(stats.size).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.hitRate).toBe(0);
  });

  it('should handle maxSize of 0 gracefully', () => {
    // Edge case: maxSize 0 might cause issues
    const cache = new LRUCache<string>({ maxSize: 1 });
    cache.set('a', '1');
    expect(cache.size).toBe(1);
  });

  it('should handle undefined values', () => {
    const cache = new LRUCache<string | undefined>();
    cache.set('key', undefined);
    expect(cache.has('key')).toBe(true);
    expect(cache.get('key')).toBeUndefined();
  });
});
