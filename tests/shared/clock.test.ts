/**
 * OMEGA Clock Tests
 * Phase C - NASA-Grade L4
 */

import { describe, it, expect } from 'vitest';
import { SystemClock, createTestClock } from '../../src/shared/clock.js';

describe('Clock', () => {
  describe('SystemClock', () => {
    it('returns monotonic bigint', () => {
      const t1 = SystemClock.nowMonoNs();
      const t2 = SystemClock.nowMonoNs();
      expect(typeof t1).toBe('bigint');
      expect(t2).toBeGreaterThanOrEqual(t1);
    });

    it('returns wall clock number', () => {
      const wall = SystemClock.nowWallMs();
      expect(typeof wall).toBe('number');
      expect(wall).toBeGreaterThan(0);
    });
  });

  describe('TestClock', () => {
    it('is deterministic with same seed', () => {
      const c1 = createTestClock(100n);
      const c2 = createTestClock(100n);
      expect(c1.nowMonoNs()).toBe(100n);
      expect(c2.nowMonoNs()).toBe(100n);
      expect(c1.nowMonoNs()).toBe(101n);
      expect(c2.nowMonoNs()).toBe(101n);
    });

    it('increments counter on each call', () => {
      const clock = createTestClock(1000n);
      expect(clock.nowMonoNs()).toBe(1000n);
      expect(clock.nowMonoNs()).toBe(1001n);
      expect(clock.nowMonoNs()).toBe(1002n);
    });

    it('wallMs returns UNKNOWN', () => {
      expect(createTestClock().nowWallMs()).toBe('UNKNOWN');
    });

    it('uses default seed if not provided', () => {
      const clock = createTestClock();
      const t1 = clock.nowMonoNs();
      expect(t1).toBe(1_000_000_000_000_000_000n);
    });
  });

  describe('INV-CLOCK-01: Monotonic timestamps', () => {
    it('timestamps always increase', () => {
      const clock = createTestClock(0n);
      const timestamps: bigint[] = [];
      for (let i = 0; i < 100; i++) {
        timestamps.push(clock.nowMonoNs());
      }
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
      }
    });
  });
});
