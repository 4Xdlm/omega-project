/**
 * V2.2-B Option E — boundaryZone.ts unit tests
 *
 * Tests innovation boundary-zone embedding helpers :
 *   - extractBoundaryZones : split chunks into end/start zones
 *   - computeBoundaryScores : cosine per boundary
 *   - aggregateBookBoundaries : per-book metrics
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, expect, it } from 'vitest';
import {
  extractBoundaryZones,
  computeBoundaryScores,
  aggregateBookBoundaries,
} from '../../src/embeddings/boundaryZone.js';

describe("OMEGA V2.2-B Option E — boundaryZone helpers (2026-05-28)", () => {
  describe('extractBoundaryZones', () => {
    it('returns N-1 pairs for N chunks', () => {
      const chunks = [
        { text: 'word '.repeat(500).trim() },
        { text: 'word '.repeat(500).trim() },
        { text: 'word '.repeat(500).trim() },
      ];
      const pairs = extractBoundaryZones(chunks, 100);
      expect(pairs.length).toBe(2);
      expect(pairs[0]!.boundary_index).toBe(0);
      expect(pairs[1]!.boundary_index).toBe(1);
    });

    it('extracts last N words from left + first N from right', () => {
      const leftWords = Array.from({ length: 500 }, (_, i) => `L${i}`).join(' ');
      const rightWords = Array.from({ length: 500 }, (_, i) => `R${i}`).join(' ');
      const chunks = [{ text: leftWords }, { text: rightWords }];
      const pairs = extractBoundaryZones(chunks, 50);
      expect(pairs.length).toBe(1);
      const pair = pairs[0]!;
      // Left zone: last 50 words → L450..L499
      expect(pair.end_of_left.startsWith('L450 ')).toBe(true);
      expect(pair.end_of_left.endsWith(' L499')).toBe(true);
      expect(pair.left_word_count).toBe(50);
      // Right zone: first 50 words → R0..R49
      expect(pair.start_of_right.startsWith('R0 ')).toBe(true);
      expect(pair.start_of_right.endsWith(' R49')).toBe(true);
      expect(pair.right_word_count).toBe(50);
    });

    it('handles chunks shorter than zone_words', () => {
      const chunks = [
        { text: 'a b c' }, // 3 words
        { text: 'd e f g h' }, // 5 words
      ];
      const pairs = extractBoundaryZones(chunks, 100);
      expect(pairs.length).toBe(1);
      expect(pairs[0]!.end_of_left).toBe('a b c');
      expect(pairs[0]!.start_of_right).toBe('d e f g h');
      expect(pairs[0]!.left_word_count).toBe(3);
      expect(pairs[0]!.right_word_count).toBe(5);
    });

    it('returns empty array for single chunk', () => {
      const chunks = [{ text: 'only one chunk here' }];
      const pairs = extractBoundaryZones(chunks, 100);
      expect(pairs).toEqual([]);
    });

    it('throws on zone_words <= 0', () => {
      const chunks = [{ text: 'a' }, { text: 'b' }];
      expect(() => extractBoundaryZones(chunks, 0)).toThrow();
      expect(() => extractBoundaryZones(chunks, -1)).toThrow();
    });
  });

  describe('computeBoundaryScores', () => {
    it('returns cosine for each boundary pair', () => {
      const v1 = new Float32Array([1, 0, 0]);
      const v2 = new Float32Array([1, 0, 0]); // identical
      const v3 = new Float32Array([0, 1, 0]); // orthogonal
      const pairs = [
        {
          boundary_index: 0,
          left_vector: v1,
          right_vector: v2,
          left_word_count: 100,
          right_word_count: 100,
        },
        {
          boundary_index: 1,
          left_vector: v1,
          right_vector: v3,
          left_word_count: 100,
          right_word_count: 100,
        },
      ];
      const scores = computeBoundaryScores(pairs);
      expect(scores.length).toBe(2);
      expect(scores[0]!.cosine).toBeCloseTo(1, 4);
      expect(scores[1]!.cosine).toBeCloseTo(0, 4);
    });

    it('clamps negative cosines to 0', () => {
      const v1 = new Float32Array([1, 0]);
      const v2 = new Float32Array([-1, 0]); // opposite
      const scores = computeBoundaryScores([
        {
          boundary_index: 0,
          left_vector: v1,
          right_vector: v2,
          left_word_count: 50,
          right_word_count: 50,
        },
      ]);
      expect(scores[0]!.cosine).toBe(0);
    });
  });

  describe('aggregateBookBoundaries', () => {
    it('computes min/mean/max/std/range over boundary scores', () => {
      const scores = [
        { boundary_index: 0, cosine: 0.5, left_word_count: 100, right_word_count: 100 },
        { boundary_index: 1, cosine: 0.7, left_word_count: 100, right_word_count: 100 },
        { boundary_index: 2, cosine: 0.9, left_word_count: 100, right_word_count: 100 },
      ];
      const agg = aggregateBookBoundaries(scores);
      expect(agg.boundary_count).toBe(3);
      expect(agg.min_boundary).toBeCloseTo(0.5, 4);
      expect(agg.max_boundary).toBeCloseTo(0.9, 4);
      expect(agg.mean_boundary).toBeCloseTo(0.7, 4);
      expect(agg.range_boundary).toBeCloseTo(0.4, 4);
      // std = sqrt(((0.5-0.7)^2 + (0.7-0.7)^2 + (0.9-0.7)^2) / 3) = sqrt(0.04*2/3) = sqrt(0.0267)
      expect(agg.std_boundary).toBeCloseTo(0.1633, 3);
    });

    it('returns zeros for empty input', () => {
      const agg = aggregateBookBoundaries([]);
      expect(agg.boundary_count).toBe(0);
      expect(agg.min_boundary).toBe(0);
      expect(agg.max_boundary).toBe(0);
      expect(agg.mean_boundary).toBe(0);
      expect(agg.std_boundary).toBe(0);
      expect(agg.range_boundary).toBe(0);
      expect(agg.boundary_scores).toEqual([]);
    });

    it('handles single boundary (std=0, range=0)', () => {
      const agg = aggregateBookBoundaries([
        { boundary_index: 0, cosine: 0.8, left_word_count: 100, right_word_count: 100 },
      ]);
      expect(agg.boundary_count).toBe(1);
      expect(agg.min_boundary).toBe(0.8);
      expect(agg.max_boundary).toBe(0.8);
      expect(agg.mean_boundary).toBe(0.8);
      expect(agg.std_boundary).toBe(0);
      expect(agg.range_boundary).toBe(0);
    });
  });
});
