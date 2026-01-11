/**
 * @fileoverview Tests for cache utilities.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  LRUCache,
  memoize,
  memoizeWith,
  memoizeAsync,
  computed,
} from '../../src/index.js';

describe('LRUCache', () => {
  it('should get and set values', () => {
    const cache = new LRUCache<string>();
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('should return undefined for missing keys', () => {
    const cache = new LRUCache<string>();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should track size', () => {
    const cache = new LRUCache<string>();
    expect(cache.size).toBe(0);
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.size).toBe(2);
  });

  it('should evict LRU entries', () => {
    const cache = new LRUCache<string>({ maxSize: 2 });
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3'); // Should evict 'a'

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('2');
    expect(cache.get('c')).toBe('3');
  });

  it('should update LRU order on access', () => {
    const cache = new LRUCache<string>({ maxSize: 2 });
    cache.set('a', '1');
    cache.set('b', '2');
    cache.get('a'); // Access 'a', making it recently used
    cache.set('c', '3'); // Should evict 'b' now

    expect(cache.get('a')).toBe('1');
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe('3');
  });

  it('should expire entries by TTL', async () => {
    const cache = new LRUCache<string>({ ttlMs: 50 });
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');

    await new Promise((r) => setTimeout(r, 60));
    expect(cache.get('key')).toBeUndefined();
  });

  it('should track hits and misses', () => {
    const cache = new LRUCache<string>();
    cache.set('key', 'value');
    cache.get('key'); // hit
    cache.get('key'); // hit
    cache.get('missing'); // miss

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(2 / 3);
  });

  it('should call onEvict callback', () => {
    const evicted: string[] = [];
    const cache = new LRUCache<string>({
      maxSize: 1,
      onEvict: (key) => evicted.push(key),
    });

    cache.set('a', '1');
    cache.set('b', '2'); // Evicts 'a'

    expect(evicted).toContain('a');
  });

  it('should check existence with has', () => {
    const cache = new LRUCache<string>();
    cache.set('key', 'value');
    expect(cache.has('key')).toBe(true);
    expect(cache.has('missing')).toBe(false);
  });

  it('should delete entries', () => {
    const cache = new LRUCache<string>();
    cache.set('key', 'value');
    expect(cache.delete('key')).toBe(true);
    expect(cache.get('key')).toBeUndefined();
    expect(cache.delete('missing')).toBe(false);
  });

  it('should clear all entries', () => {
    const cache = new LRUCache<string>();
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.getStats().hits).toBe(0);
  });

  it('should get all keys', () => {
    const cache = new LRUCache<string>();
    cache.set('a', '1');
    cache.set('b', '2');
    const keys = cache.keys();
    expect(keys).toContain('a');
    expect(keys).toContain('b');
  });

  it('should prune expired entries', async () => {
    const cache = new LRUCache<string>({ ttlMs: 50 });
    cache.set('a', '1');
    cache.set('b', '2');

    await new Promise((r) => setTimeout(r, 60));
    const pruned = cache.prune();

    expect(pruned).toBe(2);
    expect(cache.size).toBe(0);
  });
});

describe('memoize', () => {
  it('should cache function results', () => {
    let calls = 0;
    const fn = memoize((x: number) => {
      calls++;
      return x * 2;
    });

    expect(fn(5)).toBe(10);
    expect(fn(5)).toBe(10);
    expect(calls).toBe(1);
  });

  it('should cache different arguments separately', () => {
    let calls = 0;
    const fn = memoize((x: number) => {
      calls++;
      return x * 2;
    });

    expect(fn(5)).toBe(10);
    expect(fn(10)).toBe(20);
    expect(calls).toBe(2);
  });
});

describe('memoizeWith', () => {
  it('should use custom key function', () => {
    let calls = 0;
    const fn = memoizeWith(
      (a: number, b: number) => `${a},${b}`,
      (a, b) => {
        calls++;
        return a + b;
      }
    );

    expect(fn(1, 2)).toBe(3);
    expect(fn(1, 2)).toBe(3);
    expect(calls).toBe(1);
  });

  it('should respect cache options', () => {
    const fn = memoizeWith(
      (x: number) => `${x}`,
      (x) => x * 2,
      { maxSize: 2 }
    );

    fn(1);
    fn(2);
    fn(3); // Evicts 1
    fn(1); // Cache miss

    // Should have computed 1 twice
  });
});

describe('memoizeAsync', () => {
  it('should cache async function results', async () => {
    let calls = 0;
    const fn = memoizeAsync(async (x: number) => {
      calls++;
      return x * 2;
    });

    expect(await fn(5)).toBe(10);
    expect(await fn(5)).toBe(10);
    expect(calls).toBe(1);
  });

  it('should remove failed promises from cache', async () => {
    let calls = 0;
    const fn = memoizeAsync(async (x: number) => {
      calls++;
      if (calls === 1) throw new Error('fail');
      return x * 2;
    });

    await expect(fn(5)).rejects.toThrow('fail');
    expect(await fn(5)).toBe(10);
    expect(calls).toBe(2);
  });
});

describe('computed', () => {
  it('should cache computation', () => {
    let calls = 0;
    let dep = 1;
    const getValue = computed(
      () => {
        calls++;
        return dep * 2;
      },
      () => [dep]
    );

    expect(getValue()).toBe(2);
    expect(getValue()).toBe(2);
    expect(calls).toBe(1);
  });

  it('should recompute when dependencies change', () => {
    let calls = 0;
    let dep = 1;
    const getValue = computed(
      () => {
        calls++;
        return dep * 2;
      },
      () => [dep]
    );

    expect(getValue()).toBe(2);
    dep = 2;
    expect(getValue()).toBe(4);
    expect(calls).toBe(2);
  });

  it('should handle multiple dependencies', () => {
    let a = 1;
    let b = 2;
    const getValue = computed(
      () => a + b,
      () => [a, b]
    );

    expect(getValue()).toBe(3);
    a = 5;
    expect(getValue()).toBe(7);
    b = 10;
    expect(getValue()).toBe(15);
  });
});
