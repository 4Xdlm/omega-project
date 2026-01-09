/**
 * CAT-H: Seed Passthrough Tests
 * Phase 29.2 - NASA-Grade L4
 *
 * Question: "Le seed est-il transmis intact ?"
 *
 * Invariants couverts: INV-MYC-12
 * Rejets associés: REJ-MYC-400
 */

import { describe, it, expect } from 'vitest';
import {
  validate,
  isAccepted,
  isRejected,
  REJECTION_CODES,
  DEFAULT_SEED,
} from '../../src/index.js';

describe('CAT-H: Seed Passthrough', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // H.1: Seed passthrough integrity (INV-MYC-12)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('H.1: Seed passthrough', () => {
    it('H.1.1: custom seed is transmitted intact', () => {
      const testSeeds = [0, 1, 42, 12345, 999999, -1, -12345];

      for (const seed of testSeeds) {
        const result = validate({ content: 'Test', seed });
        expect(isAccepted(result)).toBe(true);
        if (isAccepted(result)) {
          expect(result.output.seed).toBe(seed);
        }
      }
    });

    it('H.1.2: floating point seed is transmitted intact', () => {
      const testSeeds = [3.14159, 0.001, 1000.5, -2.5];

      for (const seed of testSeeds) {
        const result = validate({ content: 'Test', seed });
        expect(isAccepted(result)).toBe(true);
        if (isAccepted(result)) {
          expect(result.output.seed).toBe(seed);
        }
      }
    });

    it('H.1.3: default seed (42) applied when not provided', () => {
      const result = validate({ content: 'Test' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.seed).toBe(DEFAULT_SEED);
        expect(result.output.seed).toBe(42);
      }
    });

    it('H.1.4: seed=0 is valid and passed through', () => {
      const result = validate({ content: 'Test', seed: 0 });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.seed).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // H.2: Invalid seed rejection (REJ-MYC-400)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('H.2: Invalid seed rejection', () => {
    it('H.2.1: NaN seed is rejected', () => {
      const result = validate({ content: 'Test', seed: NaN });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.INVALID_SEED);
        expect(result.rejection.category).toBe('Params');
      }
    });

    it('H.2.2: Infinity seed is rejected', () => {
      const result = validate({ content: 'Test', seed: Infinity });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.INVALID_SEED);
      }
    });

    it('H.2.3: -Infinity seed is rejected', () => {
      const result = validate({ content: 'Test', seed: -Infinity });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.INVALID_SEED);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // H.3: Seed determinism
  // ═══════════════════════════════════════════════════════════════════════════

  describe('H.3: Seed determinism', () => {
    it('H.3.1: same seed always produces same output', () => {
      const seed = 12345;
      const seeds: number[] = [];

      for (let i = 0; i < 100; i++) {
        const result = validate({ content: 'Test', seed });
        if (isAccepted(result)) {
          seeds.push(result.output.seed);
        }
      }

      expect(seeds.length).toBe(100);
      expect(new Set(seeds).size).toBe(1);
      expect(seeds[0]).toBe(seed);
    });

    it('H.3.2: different seeds produce different outputs', () => {
      const seedA = 111;
      const seedB = 222;

      const resultA = validate({ content: 'Test', seed: seedA });
      const resultB = validate({ content: 'Test', seed: seedB });

      expect(isAccepted(resultA)).toBe(true);
      expect(isAccepted(resultB)).toBe(true);

      if (isAccepted(resultA) && isAccepted(resultB)) {
        expect(resultA.output.seed).not.toBe(resultB.output.seed);
      }
    });

    it('H.3.3: content doesn\'t affect seed', () => {
      const seed = 99999;

      const resultA = validate({ content: 'Content A', seed });
      const resultB = validate({ content: 'Content B completely different', seed });

      expect(isAccepted(resultA)).toBe(true);
      expect(isAccepted(resultB)).toBe(true);

      if (isAccepted(resultA) && isAccepted(resultB)) {
        expect(resultA.output.seed).toBe(resultB.output.seed);
        expect(resultA.output.seed).toBe(seed);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // H.4: Edge cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('H.4: Edge cases', () => {
    it('H.4.1: very large seed is valid', () => {
      const largeSeed = Number.MAX_SAFE_INTEGER;
      const result = validate({ content: 'Test', seed: largeSeed });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.seed).toBe(largeSeed);
      }
    });

    it('H.4.2: very small negative seed is valid', () => {
      const smallSeed = Number.MIN_SAFE_INTEGER;
      const result = validate({ content: 'Test', seed: smallSeed });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.seed).toBe(smallSeed);
      }
    });

    it('H.4.3: undefined seed uses default', () => {
      const result = validate({ content: 'Test', seed: undefined });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.seed).toBe(DEFAULT_SEED);
      }
    });
  });
});
