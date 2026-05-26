/**
 * OMEGA V2.1 — Calibration Framework Tests + SMOKE RUN
 *
 * Tests grid search framework + executes smoke calibration on synthetic corpus.
 */

import { describe, it, expect } from 'vitest';
import {
  GRID_VALUES,
  generateGridCombinations,
  gridSearch,
  generateSyntheticCorpus,
  formatGridResults,
} from '../../src/chunking/calibration/index.js';

describe('OMEGA V2.1 — Calibration Framework', () => {
  describe('Grid combinations', () => {
    it('GRID_VALUES = [0.1, 0.3, 0.5, 0.7, 0.9]', () => {
      expect(GRID_VALUES).toEqual([0.1, 0.3, 0.5, 0.7, 0.9]);
    });

    it('generateGridCombinations: 125 combos (5^3)', () => {
      const combos = generateGridCombinations();
      expect(combos.length).toBe(125);
    });

    it('combinations are unique', () => {
      const combos = generateGridCombinations();
      const keys = combos.map(
        (c) => `${c.arc_breakage}_${c.length_variance}_${c.discontinuity}`
      );
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(125);
    });

    it('combinations span all GRID_VALUES', () => {
      const combos = generateGridCombinations();
      for (const v of GRID_VALUES) {
        const hasW1 = combos.some((c) => c.arc_breakage === v);
        const hasW2 = combos.some((c) => c.length_variance === v);
        const hasW3 = combos.some((c) => c.discontinuity === v);
        expect(hasW1).toBe(true);
        expect(hasW2).toBe(true);
        expect(hasW3).toBe(true);
      }
    });
  });

  describe('Synthetic corpus generation', () => {
    it('deterministic with seed', () => {
      const a = generateSyntheticCorpus(10, 42);
      const b = generateSyntheticCorpus(10, 42);
      expect(a[0]!.text).toBe(b[0]!.text);
      expect(a.length).toBe(10);
    });

    it('different seeds → different corpus', () => {
      const a = generateSyntheticCorpus(10, 42);
      const b = generateSyntheticCorpus(10, 99);
      expect(a[0]!.text).not.toBe(b[0]!.text);
    });

    it('all samples have non-empty text', () => {
      const corpus = generateSyntheticCorpus(20, 42);
      corpus.forEach((s) => {
        expect(s.text.length).toBeGreaterThan(0);
        expect(s.id).toMatch(/^synth_\d+$/);
      });
    });
  });

  describe('gridSearch SMOKE RUN', () => {
    it('rejects empty samples', async () => {
      await expect(gridSearch([])).rejects.toThrow();
    });

    it('runs 125 combos on small synthetic corpus', async () => {
      // SMOKE: 5 synthetic samples + 125 combos = 625 chunkAdaptive calls
      const corpus = generateSyntheticCorpus(5, 42);
      const results = await gridSearch(corpus);
      expect(results.length).toBe(125);
      // Results sorted by avg_cost ascending
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i]!.avg_cost).toBeLessThanOrEqual(results[i + 1]!.avg_cost);
      }
      // Best result has reasonable samples processed
      expect(results[0]!.samples_count).toBeGreaterThan(0);
    }, 60000);

    it('progress callback invoked correctly', async () => {
      const corpus = generateSyntheticCorpus(2, 42);
      const progressUpdates: number[] = [];
      await gridSearch(corpus, 750, (p) => {
        progressUpdates.push(p.current);
      });
      expect(progressUpdates.length).toBe(125);
      expect(progressUpdates[0]).toBe(1);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(125);
    }, 60000);

    it('formatGridResults: produces readable string', async () => {
      const corpus = generateSyntheticCorpus(3, 42);
      const results = await gridSearch(corpus);
      const formatted = formatGridResults(results, 5);
      expect(formatted).toContain('OMEGA V2.1 Grid Search Results');
      expect(formatted).toContain('Total combinations evaluated: 125');
      expect(formatted).toContain('Top 5');
    }, 60000);
  });
});
