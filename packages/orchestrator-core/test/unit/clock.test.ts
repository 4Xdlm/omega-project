/**
 * @fileoverview Unit tests for Clock utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  SystemClock,
  DeterministicClock,
  createSystemClock,
  createDeterministicClock,
} from '../../src/util/clock.js';

describe('SystemClock', () => {
  it('should return current time from now()', () => {
    const clock = new SystemClock();
    const before = Date.now();
    const result = clock.now();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });

  it('should return ISO string from nowISO()', () => {
    const clock = new SystemClock();
    const result = clock.nowISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it('should create via factory function', () => {
    const clock = createSystemClock();
    expect(clock).toBeInstanceOf(SystemClock);
  });
});

describe('DeterministicClock', () => {
  it('should start at 0 by default', () => {
    const clock = new DeterministicClock();
    expect(clock.now()).toBe(0);
  });

  it('should start at specified time', () => {
    const clock = new DeterministicClock(1000);
    expect(clock.now()).toBe(1000);
  });

  it('should return consistent time without advance', () => {
    const clock = new DeterministicClock(5000);
    expect(clock.now()).toBe(5000);
    expect(clock.now()).toBe(5000);
    expect(clock.now()).toBe(5000);
  });

  it('should advance time correctly', () => {
    const clock = new DeterministicClock(0);
    clock.advance(100);
    expect(clock.now()).toBe(100);
    clock.advance(50);
    expect(clock.now()).toBe(150);
  });

  it('should throw on negative advance', () => {
    const clock = new DeterministicClock(100);
    expect(() => clock.advance(-10)).toThrow('Cannot advance clock by negative value');
  });

  it('should set time correctly', () => {
    const clock = new DeterministicClock(0);
    clock.setTime(5000);
    expect(clock.now()).toBe(5000);
  });

  it('should throw on negative setTime', () => {
    const clock = new DeterministicClock(100);
    expect(() => clock.setTime(-10)).toThrow('Cannot set clock to negative value');
  });

  it('should reset to 0', () => {
    const clock = new DeterministicClock(5000);
    clock.advance(1000);
    clock.reset();
    expect(clock.now()).toBe(0);
  });

  it('should return correct ISO string', () => {
    // Unix epoch 0 = 1970-01-01T00:00:00.000Z
    const clock = new DeterministicClock(0);
    expect(clock.nowISO()).toBe('1970-01-01T00:00:00.000Z');
  });

  it('should return correct ISO string for specific timestamp', () => {
    // 2026-01-01T00:00:00.000Z
    const timestamp = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
    const clock = new DeterministicClock(timestamp);
    expect(clock.nowISO()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('should create via factory function', () => {
    const clock = createDeterministicClock(1000);
    expect(clock).toBeInstanceOf(DeterministicClock);
    expect(clock.now()).toBe(1000);
  });

  it('should create via factory with default value', () => {
    const clock = createDeterministicClock();
    expect(clock.now()).toBe(0);
  });
});
