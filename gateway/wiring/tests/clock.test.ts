// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS CLOCK
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// @invariant INV-ENV-02: timestamp DOIT venir d'un Clock injectable
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  SystemClock,
  FixedClock,
  IncrementalClock,
  createSystemClock,
  createFixedClock,
  createIncrementalClock,
} from '../src/clock.js';

describe('Clock', () => {
  describe('SystemClock', () => {
    it('returns current time in ms', () => {
      const clock = new SystemClock();
      const before = Date.now();
      const result = clock.nowMs();
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });

    it('returns different values on successive calls', async () => {
      const clock = new SystemClock();
      const t1 = clock.nowMs();
      await new Promise(r => setTimeout(r, 5));
      const t2 = clock.nowMs();
      expect(t2).toBeGreaterThan(t1);
    });
  });

  describe('FixedClock', () => {
    it('always returns the same value', () => {
      const clock = new FixedClock(1234567890);
      expect(clock.nowMs()).toBe(1234567890);
      expect(clock.nowMs()).toBe(1234567890);
      expect(clock.nowMs()).toBe(1234567890);
    });

    it('works with zero', () => {
      const clock = new FixedClock(0);
      expect(clock.nowMs()).toBe(0);
    });

    it('throws on negative value', () => {
      expect(() => new FixedClock(-1)).toThrow();
    });

    it('throws on NaN', () => {
      expect(() => new FixedClock(NaN)).toThrow();
    });

    it('throws on Infinity', () => {
      expect(() => new FixedClock(Infinity)).toThrow();
    });

    it('is deterministic for tests', () => {
      const clock1 = new FixedClock(42);
      const clock2 = new FixedClock(42);
      expect(clock1.nowMs()).toBe(clock2.nowMs());
    });
  });

  describe('IncrementalClock', () => {
    it('increments on each call', () => {
      const clock = new IncrementalClock(0, 1);
      expect(clock.nowMs()).toBe(0);
      expect(clock.nowMs()).toBe(1);
      expect(clock.nowMs()).toBe(2);
      expect(clock.nowMs()).toBe(3);
    });

    it('respects custom increment', () => {
      const clock = new IncrementalClock(100, 10);
      expect(clock.nowMs()).toBe(100);
      expect(clock.nowMs()).toBe(110);
      expect(clock.nowMs()).toBe(120);
    });

    it('can be reset', () => {
      const clock = new IncrementalClock(0, 1);
      clock.nowMs();
      clock.nowMs();
      clock.reset(0);
      expect(clock.nowMs()).toBe(0);
    });

    it('throws on negative start', () => {
      expect(() => new IncrementalClock(-1, 1)).toThrow();
    });

    it('throws on zero increment', () => {
      expect(() => new IncrementalClock(0, 0)).toThrow();
    });

    it('throws on negative increment', () => {
      expect(() => new IncrementalClock(0, -1)).toThrow();
    });
  });

  describe('Factory functions', () => {
    it('createSystemClock returns SystemClock', () => {
      const clock = createSystemClock();
      expect(clock).toBeInstanceOf(SystemClock);
    });

    it('createFixedClock returns FixedClock', () => {
      const clock = createFixedClock(42);
      expect(clock.nowMs()).toBe(42);
    });

    it('createIncrementalClock returns IncrementalClock', () => {
      const clock = createIncrementalClock(10, 5);
      expect(clock.nowMs()).toBe(10);
      expect(clock.nowMs()).toBe(15);
    });
  });

  describe('INV-ENV-02: Clock determinism', () => {
    it('FixedClock guarantees determinism', () => {
      const ts = 1704499200000; // 2024-01-06 00:00:00 UTC
      const clock1 = createFixedClock(ts);
      const clock2 = createFixedClock(ts);
      
      // 100 appels identiques
      for (let i = 0; i < 100; i++) {
        expect(clock1.nowMs()).toBe(clock2.nowMs());
      }
    });

    it('IncrementalClock is predictable', () => {
      const clock1 = createIncrementalClock(0, 1);
      const clock2 = createIncrementalClock(0, 1);
      
      // Les deux clocks doivent produire la même séquence
      const seq1: number[] = [];
      const seq2: number[] = [];
      for (let i = 0; i < 10; i++) {
        seq1.push(clock1.nowMs());
        seq2.push(clock2.nowMs());
      }
      expect(seq1).toEqual(seq2);
    });
  });
});
