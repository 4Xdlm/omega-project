/**
 * @fileoverview Tests for timer utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  now,
  Timer,
  time,
  timeAsync,
  timed,
  sleep,
  timeMultiple,
  Stopwatch,
} from '../../src/index.js';

describe('now', () => {
  it('should return a number', () => {
    expect(typeof now()).toBe('number');
  });

  it('should increase over time', async () => {
    const t1 = now();
    await sleep(10);
    const t2 = now();
    expect(t2).toBeGreaterThan(t1);
  });
});

describe('Timer', () => {
  it('should measure elapsed time', async () => {
    const timer = new Timer({ name: 'test' });
    timer.start();
    await sleep(10);
    const result = timer.stop();

    expect(result.name).toBe('test');
    expect(result.duration).toBeGreaterThan(0);
    expect(result.startTime).toBeLessThan(result.endTime);
  });

  it('should throw if started twice', () => {
    const timer = new Timer();
    timer.start();
    expect(() => timer.start()).toThrow('already running');
  });

  it('should throw if stopped without starting', () => {
    const timer = new Timer();
    expect(() => timer.stop()).toThrow('not running');
  });

  it('should track running state', () => {
    const timer = new Timer();
    expect(timer.isRunning()).toBe(false);
    timer.start();
    expect(timer.isRunning()).toBe(true);
    timer.stop();
    expect(timer.isRunning()).toBe(false);
  });

  it('should get elapsed time while running', async () => {
    const timer = new Timer();
    timer.start();
    await sleep(10);
    const elapsed = timer.elapsed();
    expect(elapsed).toBeGreaterThan(0);
    expect(timer.isRunning()).toBe(true);
  });

  it('should reset timer', async () => {
    const timer = new Timer();
    timer.start();
    await sleep(10);
    timer.stop();
    timer.reset();
    expect(timer.elapsed()).toBe(0);
    expect(timer.isRunning()).toBe(false);
  });

  it('should include metadata', () => {
    const timer = new Timer({ name: 'test', metadata: { key: 'value' } });
    timer.start();
    const result = timer.stop();
    expect(result.metadata).toEqual({ key: 'value' });
  });
});

describe('time', () => {
  it('should measure sync function', () => {
    const { result, duration } = time(() => {
      let sum = 0;
      for (let i = 0; i < 1000; i++) sum += i;
      return sum;
    });

    expect(result).toBe(499500);
    expect(duration).toBeGreaterThan(0);
  });

  it('should return correct result', () => {
    const { result } = time(() => 42);
    expect(result).toBe(42);
  });
});

describe('timeAsync', () => {
  it('should measure async function', async () => {
    const { result, duration } = await timeAsync(async () => {
      await sleep(10);
      return 'done';
    });

    expect(result).toBe('done');
    expect(duration).toBeGreaterThanOrEqual(9);
  });
});

describe('timed', () => {
  it('should wrap sync function', () => {
    const durations: number[] = [];
    const fn = timed(
      (x: number) => x * 2,
      (duration) => durations.push(duration)
    );

    expect(fn(5)).toBe(10);
    expect(durations.length).toBe(1);
    expect(durations[0]).toBeGreaterThan(0);
  });

  it('should wrap async function', async () => {
    const durations: number[] = [];
    const fn = timed(
      async (x: number) => {
        await sleep(10);
        return x * 2;
      },
      (duration) => durations.push(duration)
    );

    const result = await fn(5);
    expect(result).toBe(10);
    expect(durations.length).toBe(1);
    expect(durations[0]).toBeGreaterThanOrEqual(9);
  });
});

describe('sleep', () => {
  it('should wait for specified time', async () => {
    const start = now();
    await sleep(20);
    const elapsed = now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(19);
  });
});

describe('timeMultiple', () => {
  it('should run multiple iterations', () => {
    const { results, durations } = timeMultiple(() => 42, 10);

    expect(results.length).toBe(10);
    expect(results.every((r) => r === 42)).toBe(true);
    expect(durations.length).toBe(10);
    expect(durations.every((d) => d >= 0)).toBe(true);
  });
});

describe('Stopwatch', () => {
  it('should record laps', async () => {
    const sw = new Stopwatch();
    sw.start();
    await sleep(10);
    const lap1 = sw.lap('lap1');
    await sleep(10);
    const lap2 = sw.lap('lap2');

    expect(lap1).toBeGreaterThan(0);
    expect(lap2).toBeGreaterThan(0);

    const laps = sw.getLaps();
    expect(laps.length).toBe(2);
    expect(laps[0].name).toBe('lap1');
    expect(laps[1].name).toBe('lap2');
  });

  it('should get total time', async () => {
    const sw = new Stopwatch();
    sw.start();
    await sleep(20);
    const total = sw.total();
    expect(total).toBeGreaterThanOrEqual(19);
  });

  it('should get summary', async () => {
    const sw = new Stopwatch();
    sw.start();
    await sleep(10);
    sw.lap('lap1');

    const summary = sw.getSummary();
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.laps.length).toBe(1);
  });
});
