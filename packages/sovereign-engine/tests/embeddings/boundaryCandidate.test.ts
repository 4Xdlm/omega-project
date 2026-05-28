import { describe, expect, it } from 'vitest';
import {
  extractCandidateZones,
  computeBoundaryVerdict,
  aggregateBookB1,
  pairCosine,
  type BoundaryCandidateScores,
} from '../../src/embeddings/boundaryCandidate.js';

describe('OMEGA V2.2-B B1 — boundaryCandidate (2026-05-28)', () => {
  describe('extractCandidateZones', () => {
    it('returns 4 candidate zone pairs', () => {
      const leftWords = Array.from({ length: 1000 }, (_, i) => `L${i}`).join(' ');
      const rightWords = Array.from({ length: 1000 }, (_, i) => `R${i}`).join(' ');
      const chunks = [{ text: leftWords }, { text: rightWords }];
      const set = extractCandidateZones(chunks, 0, 100, 50);
      expect(set.boundary_index).toBe(0);
      expect(set.actual.end_left.length).toBeGreaterThan(0);
      expect(set.actual.start_right.length).toBeGreaterThan(0);
      expect(set.shifted_minus100.end_left.length).toBeGreaterThan(0);
      expect(set.shifted_plus100.end_left.length).toBeGreaterThan(0);
      expect(set.random_intra.end_left.length).toBeGreaterThan(0);
    });

    it('actual zones use last/first words of chunks', () => {
      const leftWords = Array.from({ length: 500 }, (_, i) => `L${i}`).join(' ');
      const rightWords = Array.from({ length: 500 }, (_, i) => `R${i}`).join(' ');
      const set = extractCandidateZones([{ text: leftWords }, { text: rightWords }], 0, 50, 10);
      expect(set.actual.end_left.endsWith('L499')).toBe(true);
      expect(set.actual.start_right.startsWith('R0 ')).toBe(true);
    });

    it('shifted_minus crosses the boundary by `shift` words', () => {
      const leftWords = Array.from({ length: 500 }, (_, i) => `L${i}`).join(' ');
      const rightWords = Array.from({ length: 500 }, (_, i) => `R${i}`).join(' ');
      const set = extractCandidateZones([{ text: leftWords }, { text: rightWords }], 0, 50, 10);
      // start_right_minus = last 10 of left + first 40 of right
      const sr = set.shifted_minus100.start_right.split(' ');
      expect(sr[0]).toBe('L490');
      expect(sr.slice(0, 10).every((w) => w.startsWith('L'))).toBe(true);
      expect(sr[10]).toBe('R0');
    });

    it('shifted_plus crosses the boundary by `shift` words', () => {
      const leftWords = Array.from({ length: 500 }, (_, i) => `L${i}`).join(' ');
      const rightWords = Array.from({ length: 500 }, (_, i) => `R${i}`).join(' ');
      const set = extractCandidateZones([{ text: leftWords }, { text: rightWords }], 0, 50, 10);
      // end_left_plus = last 40 of left + first 10 of right
      const el = set.shifted_plus100.end_left.split(' ');
      expect(el[el.length - 1]).toBe('R9');
      expect(el[el.length - 10]).toBe('R0'); // 10 R words at end of array
    });

    it('random_intra uses words from same (left) chunk', () => {
      const leftWords = Array.from({ length: 1000 }, (_, i) => `L${i}`).join(' ');
      const rightWords = Array.from({ length: 1000 }, (_, i) => `R${i}`).join(' ');
      // Seeded RNG for determinism
      const rng = (() => {
        let s = 12345;
        return () => {
          s = (s * 1103515245 + 12345) & 0x7fffffff;
          return s / 0x7fffffff;
        };
      })();
      const set = extractCandidateZones([{ text: leftWords }, { text: rightWords }], 0, 50, 10, rng);
      // Random end_left and start_right both from left chunk
      const elWords = set.random_intra.end_left.split(' ');
      const srWords = set.random_intra.start_right.split(' ');
      expect(elWords.every((w) => w.startsWith('L'))).toBe(true);
      expect(srWords.every((w) => w.startsWith('L'))).toBe(true);
    });

    it('throws on invalid boundary_index', () => {
      const chunks = [{ text: 'a b c' }, { text: 'd e f' }];
      expect(() => extractCandidateZones(chunks, -1, 1)).toThrow();
      expect(() => extractCandidateZones(chunks, 1, 1)).toThrow();
    });
  });

  describe('computeBoundaryVerdict', () => {
    it('OPTIMAL when actual notably lower than shifted min', () => {
      const v = computeBoundaryVerdict(0.50, 0.80, 0.85, 0.90, 0.02);
      // shifted_min=0.80, delta=-0.30, < -0.02 → OPTIMAL
      expect(v.verdict).toBe('OPTIMAL');
      expect(v.delta_vs_shifted_min).toBeCloseTo(-0.30, 4);
    });

    it('SUB_OPTIMAL when actual notably higher than shifted min', () => {
      const v = computeBoundaryVerdict(0.90, 0.60, 0.65, 0.80, 0.02);
      // shifted_min=0.60, delta=+0.30 > +0.02 → SUB_OPTIMAL
      expect(v.verdict).toBe('SUB_OPTIMAL');
      expect(v.delta_vs_shifted_min).toBeCloseTo(0.30, 4);
    });

    it('AMBIGUOUS when delta within ±threshold', () => {
      const v = computeBoundaryVerdict(0.80, 0.81, 0.82, 0.85, 0.02);
      // shifted_min=0.81, delta=-0.01, within threshold → AMBIGUOUS
      expect(v.verdict).toBe('AMBIGUOUS');
    });
  });

  describe('aggregateBookB1', () => {
    it('counts verdicts and computes means', () => {
      const scores: BoundaryCandidateScores[] = [
        { boundary_index: 0, cosine_actual: 0.5, cosine_minus100: 0.8, cosine_plus100: 0.85, cosine_random_intra: 0.9, delta_vs_shifted_min: -0.3, delta_vs_random: -0.4, verdict: 'OPTIMAL' },
        { boundary_index: 1, cosine_actual: 0.8, cosine_minus100: 0.79, cosine_plus100: 0.82, cosine_random_intra: 0.85, delta_vs_shifted_min: 0.01, delta_vs_random: -0.05, verdict: 'AMBIGUOUS' },
        { boundary_index: 2, cosine_actual: 0.9, cosine_minus100: 0.6, cosine_plus100: 0.65, cosine_random_intra: 0.8, delta_vs_shifted_min: 0.3, delta_vs_random: 0.1, verdict: 'SUB_OPTIMAL' },
      ];
      const m = aggregateBookB1(scores);
      expect(m.boundary_count).toBe(3);
      expect(m.count_optimal).toBe(1);
      expect(m.count_sub_optimal).toBe(1);
      expect(m.count_ambiguous).toBe(1);
      expect(m.mean_delta_shifted).toBeCloseTo((-0.3 + 0.01 + 0.3) / 3, 4);
      expect(m.mean_cosine_actual).toBeCloseTo((0.5 + 0.8 + 0.9) / 3, 4);
    });

    it('returns zeros for empty', () => {
      const m = aggregateBookB1([]);
      expect(m.boundary_count).toBe(0);
      expect(m.count_optimal).toBe(0);
      expect(m.mean_cosine_actual).toBe(0);
    });
  });

  describe('pairCosine', () => {
    it('returns clamped cosine for identical vectors', () => {
      const v = new Float32Array([1, 0, 0]);
      expect(pairCosine(v, v)).toBeCloseTo(1, 4);
    });
    it('clamps negative cosines to 0', () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([-1, 0]);
      expect(pairCosine(a, b)).toBe(0);
    });
  });
});
