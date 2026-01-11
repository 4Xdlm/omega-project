/**
 * @fileoverview Tests for pool utilities.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  ObjectPool,
  lazy,
  lazyAsync,
  throttle,
  debounce,
  RateLimiter,
  sleep,
} from '../../src/index.js';

describe('ObjectPool', () => {
  it('should create objects on demand', () => {
    let created = 0;
    const pool = new ObjectPool({
      create: () => {
        created++;
        return { value: created };
      },
    });

    const obj = pool.acquire();
    expect(obj.value).toBe(1);
    expect(created).toBe(1);
  });

  it('should reuse released objects', () => {
    let created = 0;
    const pool = new ObjectPool({
      create: () => {
        created++;
        return { id: created };
      },
    });

    const obj1 = pool.acquire();
    pool.release(obj1);
    const obj2 = pool.acquire();

    expect(obj2).toBe(obj1);
    expect(created).toBe(1);
  });

  it('should reset objects on release', () => {
    const pool = new ObjectPool({
      create: () => ({ count: 0 }),
      reset: (obj) => {
        obj.count = 0;
      },
    });

    const obj = pool.acquire();
    obj.count = 5;
    pool.release(obj);
    const obj2 = pool.acquire();

    expect(obj2.count).toBe(0);
  });

  it('should respect max size', () => {
    const pool = new ObjectPool({
      create: () => ({}),
      maxSize: 2,
    });

    const obj1 = pool.acquire();
    const obj2 = pool.acquire();
    const obj3 = pool.acquire();

    pool.release(obj1);
    pool.release(obj2);
    pool.release(obj3); // Discarded (pool full)

    const stats = pool.getStats();
    expect(stats.size).toBe(2);
  });

  it('should pre-populate on init', () => {
    const pool = new ObjectPool({
      create: () => ({}),
      initialSize: 5,
    });

    const stats = pool.getStats();
    expect(stats.size).toBe(5);
    expect(stats.created).toBe(5);
  });

  it('should track statistics', () => {
    const pool = new ObjectPool({
      create: () => ({}),
    });

    const obj1 = pool.acquire();
    const obj2 = pool.acquire();
    pool.release(obj1);
    pool.acquire(); // Reuse

    const stats = pool.getStats();
    expect(stats.created).toBe(2);
    expect(stats.reused).toBe(1);
  });

  it('should use with auto-release', () => {
    const pool = new ObjectPool({
      create: () => ({ value: 0 }),
    });

    const result = pool.use((obj) => {
      obj.value = 42;
      return obj.value;
    });

    expect(result).toBe(42);
    const stats = pool.getStats();
    expect(stats.available).toBe(1);
    expect(stats.inUse).toBe(0);
  });

  it('should useAsync with auto-release', async () => {
    const pool = new ObjectPool({
      create: () => ({ value: 0 }),
    });

    const result = await pool.useAsync(async (obj) => {
      obj.value = 42;
      await sleep(10);
      return obj.value;
    });

    expect(result).toBe(42);
    expect(pool.getStats().available).toBe(1);
  });

  it('should warmup pool', () => {
    const pool = new ObjectPool({
      create: () => ({}),
      maxSize: 10,
    });

    pool.warmup(5);
    expect(pool.getStats().size).toBe(5);
  });

  it('should clear pool', () => {
    const pool = new ObjectPool({
      create: () => ({}),
      initialSize: 5,
    });

    pool.clear();
    expect(pool.getStats().size).toBe(0);
  });
});

describe('lazy', () => {
  it('should defer evaluation', () => {
    let evaluated = false;
    const value = lazy(() => {
      evaluated = true;
      return 42;
    });

    expect(evaluated).toBe(false);
    expect(value.get()).toBe(42);
    expect(evaluated).toBe(true);
  });

  it('should cache result', () => {
    let calls = 0;
    const value = lazy(() => {
      calls++;
      return 42;
    });

    value.get();
    value.get();
    value.get();

    expect(calls).toBe(1);
  });

  it('should track evaluation state', () => {
    const value = lazy(() => 42);

    expect(value.isEvaluated()).toBe(false);
    value.get();
    expect(value.isEvaluated()).toBe(true);
  });

  it('should reset and re-evaluate', () => {
    let calls = 0;
    const value = lazy(() => {
      calls++;
      return calls;
    });

    expect(value.get()).toBe(1);
    value.reset();
    expect(value.isEvaluated()).toBe(false);
    expect(value.get()).toBe(2);
  });
});

describe('lazyAsync', () => {
  it('should defer async evaluation', async () => {
    let evaluated = false;
    const value = lazyAsync(async () => {
      evaluated = true;
      return 42;
    });

    expect(evaluated).toBe(false);
    expect(await value.get()).toBe(42);
    expect(evaluated).toBe(true);
  });

  it('should cache async result', async () => {
    let calls = 0;
    const value = lazyAsync(async () => {
      calls++;
      return 42;
    });

    await value.get();
    await value.get();
    await value.get();

    expect(calls).toBe(1);
  });

  it('should reset async value', async () => {
    let calls = 0;
    const value = lazyAsync(async () => {
      calls++;
      return calls;
    });

    expect(await value.get()).toBe(1);
    value.reset();
    expect(await value.get()).toBe(2);
  });
});

describe('throttle', () => {
  it('should limit call frequency', async () => {
    let calls = 0;
    const fn = throttle(() => {
      calls++;
      return calls;
    }, 50);

    fn();
    fn();
    fn();

    expect(calls).toBe(1);

    await sleep(60);
    fn();
    expect(calls).toBe(2);
  });

  it('should return last result', () => {
    const fn = throttle((x: number) => x * 2, 50);

    expect(fn(5)).toBe(10);
    expect(fn(10)).toBe(10); // Returns cached
  });
});

describe('debounce', () => {
  it('should delay execution', async () => {
    let calls = 0;
    const fn = debounce(() => {
      calls++;
    }, 50);

    fn();
    fn();
    fn();

    expect(calls).toBe(0);

    await sleep(60);
    expect(calls).toBe(1);
  });

  it('should cancel pending execution', async () => {
    let calls = 0;
    const fn = debounce(() => {
      calls++;
    }, 50);

    fn();
    fn.cancel();

    await sleep(60);
    expect(calls).toBe(0);
  });

  it('should flush immediately', async () => {
    let calls = 0;
    const fn = debounce(() => {
      calls++;
      return calls;
    }, 50);

    fn();
    const result = fn.flush();

    expect(calls).toBe(1);
    expect(result).toBe(1);
  });

  it('should use latest arguments', async () => {
    let lastArg = 0;
    const fn = debounce((x: number) => {
      lastArg = x;
    }, 50);

    fn(1);
    fn(2);
    fn(3);

    await sleep(60);
    expect(lastArg).toBe(3);
  });
});

describe('RateLimiter', () => {
  it('should limit rate', () => {
    const limiter = new RateLimiter(10); // 10/sec

    let acquired = 0;
    for (let i = 0; i < 20; i++) {
      if (limiter.tryAcquire()) acquired++;
    }

    expect(acquired).toBe(10); // burst limit
  });

  it('should refill over time', async () => {
    const limiter = new RateLimiter(100, 10); // 100/sec, burst 10

    // Drain tokens
    while (limiter.tryAcquire());

    await sleep(50); // Should refill ~5 tokens

    let acquired = 0;
    for (let i = 0; i < 10; i++) {
      if (limiter.tryAcquire()) acquired++;
    }

    expect(acquired).toBeGreaterThan(0);
    expect(acquired).toBeLessThanOrEqual(10);
  });

  it('should get remaining tokens', () => {
    const limiter = new RateLimiter(10, 10);

    expect(limiter.getTokens()).toBe(10);
    limiter.tryAcquire();
    expect(limiter.getTokens()).toBe(9);
  });

  it('should wait for token', async () => {
    const limiter = new RateLimiter(100, 1); // 100/sec, burst 1

    limiter.tryAcquire(); // Use the one token

    const start = Date.now();
    await limiter.acquire();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(5); // Should wait ~10ms
  });
});
