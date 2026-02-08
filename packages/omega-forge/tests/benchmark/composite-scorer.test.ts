/**
 * OMEGA Forge — Composite Scorer Tests
 * Phase C.5 — 8 tests for computeM12 and computeForgeScore
 */

import { describe, it, expect } from 'vitest';
import { computeM12, computeForgeScore } from '../../src/benchmark/composite-scorer.js';
import { DEFAULT_F5_CONFIG } from '../fixtures.js';
import type { QualityMetrics } from '../../src/types.js';

const MOCK_METRICS: QualityMetrics = {
  M1_contradiction_rate: 0,
  M2_canon_compliance: 1,
  M3_coherence_span: 100,
  M4_arc_maintenance: 3,
  M5_memory_integrity: 0.9,
  M6_style_emergence: 0.8,
  M7_author_fingerprint: 0.6,
  M8_sentence_necessity: 0.98,
  M9_semantic_density: 0.45,
  M10_reading_levels: 3,
  M11_discomfort_index: 0.5,
  M12_superiority_index: 0,
};

describe('composite-scorer', () => {
  describe('computeM12', () => {
    it('computes M12 with known inputs', () => {
      const result = computeM12(MOCK_METRICS);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('applies correct weights (sum to 10)', () => {
      // Weights: [2.0, 1.5, 0.5, 0.5, 0.5, 1.0, 0.5, 1.5, 0.5, 0.5, 1.0] = 10.0
      // With perfect metrics each normalized to 1, M12 = 10/10 = 1
      const perfect: QualityMetrics = {
        M1_contradiction_rate: 0,     // -> 1
        M2_canon_compliance: 1,       // -> 1
        M3_coherence_span: 200,       // -> 1
        M4_arc_maintenance: 5,        // -> 1
        M5_memory_integrity: 1,       // -> 1
        M6_style_emergence: 1,        // -> 1
        M7_author_fingerprint: 1,     // -> 1
        M8_sentence_necessity: 1,     // -> 1
        M9_semantic_density: 0.6,     // -> 1
        M10_reading_levels: 4,        // -> 1
        M11_discomfort_index: 0.5,    // -> 1 (in [0.3, 0.7])
        M12_superiority_index: 0,
      };
      const result = computeM12(perfect);
      expect(result).toBeCloseTo(1.0, 4);
    });

    it('normalizes metrics to [0, 1] range', () => {
      const result = computeM12(MOCK_METRICS);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('returns high score for high-quality metrics', () => {
      const result = computeM12(MOCK_METRICS);
      expect(result).toBeGreaterThan(0.6);
    });

    it('returns low score for low-quality metrics', () => {
      const low: QualityMetrics = {
        M1_contradiction_rate: 5,
        M2_canon_compliance: 0,
        M3_coherence_span: 0,
        M4_arc_maintenance: 0,
        M5_memory_integrity: 0,
        M6_style_emergence: 0,
        M7_author_fingerprint: 0,
        M8_sentence_necessity: 0,
        M9_semantic_density: 0,
        M10_reading_levels: 0,
        M11_discomfort_index: 0,
        M12_superiority_index: 0,
      };
      const result = computeM12(low);
      expect(result).toBeLessThan(0.3);
    });

    it('handles edge case: all zeros', () => {
      const zero: QualityMetrics = {
        M1_contradiction_rate: 0,
        M2_canon_compliance: 0,
        M3_coherence_span: 0,
        M4_arc_maintenance: 0,
        M5_memory_integrity: 0,
        M6_style_emergence: 0,
        M7_author_fingerprint: 0,
        M8_sentence_necessity: 0,
        M9_semantic_density: 0,
        M10_reading_levels: 0,
        M11_discomfort_index: 0,
        M12_superiority_index: 0,
      };
      const result = computeM12(zero);
      expect(typeof result).toBe('number');
      // M1=0 gives normalized 1, rest are 0, so result = 2/10 = 0.2
      expect(result).toBeCloseTo(0.2, 4);
    });
  });

  describe('computeForgeScore', () => {
    it('computes composite with pass threshold', () => {
      const score = computeForgeScore(0.9, 0.8, DEFAULT_F5_CONFIG);
      // 0.6*0.9 + 0.4*0.8 = 0.54 + 0.32 = 0.86
      expect(score.composite).toBeCloseTo(0.86, 4);
      expect(score.composite).toBeGreaterThanOrEqual(0.7);
    });

    it('is deterministic across calls', () => {
      const a = computeForgeScore(0.75, 0.65, DEFAULT_F5_CONFIG);
      const b = computeForgeScore(0.75, 0.65, DEFAULT_F5_CONFIG);
      expect(a.composite).toBe(b.composite);
      expect(a.emotion_compliance).toBe(b.emotion_compliance);
      expect(a.quality_score).toBe(b.quality_score);
    });
  });
});
