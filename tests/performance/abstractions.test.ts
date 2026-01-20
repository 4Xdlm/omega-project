/**
 * Performance Abstractions Tests
 * Standard: NASA-Grade L4
 *
 * Tests for injectable ClockFn and PerfNowFn abstractions.
 */

import { describe, test, expect, afterEach } from 'vitest';
import {
  createClock,
  createPerfNow,
  setClock,
  setPerfNow,
  getClock,
  getPerfNow,
  resetClock,
  resetPerfNow,
  createStopwatch,
} from '../../nexus/shared/performance';

// ============================================================
// Clock Abstraction Tests
// ============================================================

describe('Clock abstraction', () => {
  afterEach(() => {
    resetClock();
  });

  test('default clock uses Date.now()', () => {
    const clock = createClock();
    const now = clock();
    expect(now).toBeGreaterThan(0);
    expect(now).toBeLessThanOrEqual(Date.now() + 1);
  });

  test('mockable clock', () => {
    let time = 1000;
    const mockClock = createClock(() => time);

    expect(mockClock()).toBe(1000);
    time = 2000;
    expect(mockClock()).toBe(2000);
  });

  test('global clock can be set', () => {
    let time = 5000;
    setClock(() => time);

    const clock = getClock();
    expect(clock()).toBe(5000);

    time = 6000;
    expect(clock()).toBe(6000);
  });

  test('resetClock restores default', () => {
    setClock(() => 9999);
    expect(getClock()()).toBe(9999);

    resetClock();
    const now = getClock()();
    expect(now).toBeGreaterThan(1000000000000); // Reasonable timestamp
  });
});

// ============================================================
// PerfNow Abstraction Tests
// ============================================================

describe('PerfNow abstraction', () => {
  afterEach(() => {
    resetPerfNow();
  });

  test('default perfNow works', () => {
    const perfNow = createPerfNow();
    const now = perfNow();
    expect(now).toBeGreaterThanOrEqual(0);
  });

  test('mockable perfNow', () => {
    let time = 0;
    const mockPerfNow = createPerfNow(() => time);

    expect(mockPerfNow()).toBe(0);
    time = 123.45;
    expect(mockPerfNow()).toBe(123.45);
  });

  test('global perfNow can be set', () => {
    let time = 100.5;
    setPerfNow(() => time);

    const perfNow = getPerfNow();
    expect(perfNow()).toBe(100.5);

    time = 200.75;
    expect(perfNow()).toBe(200.75);
  });

  test('resetPerfNow restores default', () => {
    setPerfNow(() => 9999.99);
    expect(getPerfNow()()).toBe(9999.99);

    resetPerfNow();
    const now = getPerfNow()();
    expect(now).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// Stopwatch Tests
// ============================================================

describe('Stopwatch', () => {
  test('stopwatch measures duration with mock timer', () => {
    let time = 0;
    const mockPerfNow = () => time;

    const stopwatch = createStopwatch(mockPerfNow);

    stopwatch.start();
    time = 100;
    const elapsed = stopwatch.stop();

    expect(elapsed).toBe(100);
  });

  test('stopwatch elapsed() works during measurement', () => {
    let time = 0;
    const mockPerfNow = () => time;

    const stopwatch = createStopwatch(mockPerfNow);

    stopwatch.start();
    time = 50;
    expect(stopwatch.elapsed()).toBe(50);

    time = 100;
    expect(stopwatch.elapsed()).toBe(100);
  });

  test('stopwatch reset() clears state', () => {
    let time = 0;
    const mockPerfNow = () => time;

    const stopwatch = createStopwatch(mockPerfNow);

    stopwatch.start();
    time = 100;
    stopwatch.stop();

    stopwatch.reset();
    expect(stopwatch.elapsed()).toBe(0);
  });

  test('stopwatch stop() throws if not started', () => {
    const stopwatch = createStopwatch();
    expect(() => stopwatch.stop()).toThrow('Stopwatch not started');
  });
});
