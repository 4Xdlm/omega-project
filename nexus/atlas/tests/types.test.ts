/**
 * Atlas Types Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect } from 'vitest';
import { seededRNG, systemClock, systemRNG } from '../src/types.js';

describe('Atlas Types', () => {
  describe('seededRNG', () => {
    it('produces deterministic sequence with same seed', () => {
      const rng1 = seededRNG(42);
      const rng2 = seededRNG(42);

      const seq1 = Array.from({ length: 10 }, () => rng1.random());
      const seq2 = Array.from({ length: 10 }, () => rng2.random());

      expect(seq1).toEqual(seq2);
    });

    it('produces different sequences with different seeds', () => {
      const rng1 = seededRNG(42);
      const rng2 = seededRNG(43);

      const val1 = rng1.random();
      const val2 = rng2.random();

      expect(val1).not.toBe(val2);
    });

    it('generates deterministic IDs', () => {
      const rng1 = seededRNG(42);
      const rng2 = seededRNG(42);

      const id1 = rng1.randomId();
      const id2 = rng2.randomId();

      expect(id1).toBe(id2);
      expect(id1).toHaveLength(16);
    });

    it('generates alphanumeric IDs', () => {
      const rng = seededRNG(42);
      const id = rng.randomId();

      expect(id).toMatch(/^[a-z0-9]{16}$/);
    });

    it('random() returns values in [0, 1)', () => {
      const rng = seededRNG(42);

      for (let i = 0; i < 100; i++) {
        const val = rng.random();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('systemClock', () => {
    it('returns current time', () => {
      const before = Date.now();
      const time = systemClock.now();
      const after = Date.now();

      expect(time).toBeGreaterThanOrEqual(before);
      expect(time).toBeLessThanOrEqual(after);
    });
  });

  describe('systemRNG', () => {
    it('random() returns values in [0, 1)', () => {
      for (let i = 0; i < 10; i++) {
        const val = systemRNG.random();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('randomId() returns 16-char string', () => {
      const id = systemRNG.randomId();
      expect(id).toHaveLength(16);
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });
});
