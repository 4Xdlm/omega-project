/**
 * OMEGA R-8.7 — Tests for Typological Normalizer
 * Phase R-8 — NASA-Grade L4
 *
 * Tests with embedded minimal data (no JSON dependency for unit tests).
 * Integration tests with real JSON data files marked separately.
 */

import { describe, it, expect } from 'vitest';
import { TypologicalNormalizer } from '../src/scoring/typological-normalizer.js';

// ═══════════════════════════════════════════════════════════════════════
// MINIMAL TEST DATA (extracted from R-8 results)
// ═══════════════════════════════════════════════════════════════════════

const MINIMAL_TYPO_DATA = {
  _types: ['action', 'narration', 'description', 'dialogue', 'introspection'],
  _gamma_features: ['f26a_mean_sub_markers', 'f_subordination_depth_approx', 'f26c_period_score'],
  features: {
    // Additive feature (f34b_para)
    f34b_para_per_1000w: {
      cif: { action: 2.5, narration: 2.0, description: 1.8, dialogue: 3.0, introspection: 2.2 },
      class: 'ADDITIVE',
      status: 'LAMBDA_NEUTRAL',
      lambda: { action: 1.0, narration: 1.0, description: 1.0, dialogue: 1.0, introspection: 1.0 },
    },
    // Lambda feature (f28d_sil)
    f28d_sil_score: {
      cif: { action: 0.001, narration: 0.005, description: 0.003, dialogue: 0.001, introspection: 0.008 },
      class: 'INTERACTIONAL',
      status: 'LAMBDA_USEFUL',
      lambda: { action: 0.5, narration: 1.2, description: 0.8, dialogue: 0.3, introspection: 2.0 },
    },
    // Gamma feature (f26a_mean_sub_markers)
    f26a_mean_sub_markers: {
      cif: { action: 0.3, narration: 0.5, description: 0.7, dialogue: 0.2, introspection: 0.6 },
      class: 'INTERACTIONAL',
      status: 'LAMBDA_USEFUL',
      lambda: { action: 0.9, narration: 1.1, description: 1.3, dialogue: 0.7, introspection: 1.2 },
      gamma: {
        'actionxnarration': 0.99,
        'actionxdescription': -1.23,
        'actionxdialogue': -0.91,
        'actionxintrospection': -2.28,
        'narrationxdescription': 0.0,
        'narrationxdialogue': 0.0,
        'narrationxintrospection': -0.96,
        'descriptionxdialogue': 0.86,
        'descriptionxintrospection': 3.15,
        'dialoguexintrospection': -0.60,
      },
    },
  },
};

const MINIMAL_TP_DATA = {
  tipping_points: [
    { feature: 'f26b_long_sent_rate', threshold: 0.024, direction: 'HIGHER_IS_BETTER', delta: 1.11, importance: 0.29 },
    { feature: 'f29d_ttr_score', threshold: 0.71, direction: 'LOWER_IS_BETTER', delta: -0.46, importance: 0.042 },
    { feature: 'f_pov_stability', threshold: 0.646, direction: 'LOWER_IS_BETTER', delta: -0.36, importance: 0.058 },
    { feature: 'f1a_rhythm_variance', threshold: 11.36, direction: 'HIGHER_IS_BETTER', delta: 0.98, importance: 0.036 },
  ],
  gb_spearman: 0.7865,
};

// ═══════════════════════════════════════════════════════════════════════
// UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('TypologicalNormalizer', () => {
  const normalizer = new TypologicalNormalizer(
    MINIMAL_TYPO_DATA as any,
    MINIMAL_TP_DATA as any,
  );

  describe('getExpectedValue', () => {
    it('should compute additive expected value (pure action)', () => {
      const typeVec = { action: 1, narration: 0, description: 0, dialogue: 0, introspection: 0 };
      const val = normalizer.getExpectedValue('f34b_para_per_1000w', typeVec);
      // λ = 1.0 for additive, so f = 1.0 × 2.5 = 2.5
      expect(val).toBeCloseTo(2.5, 3);
    });

    it('should compute additive expected value (mixed types)', () => {
      const typeVec = { action: 0.5, narration: 0.3, description: 0.2, dialogue: 0, introspection: 0 };
      // f = 0.5*1.0*2.5 + 0.3*1.0*2.0 + 0.2*1.0*1.8 = 1.25 + 0.6 + 0.36 = 2.21
      const val = normalizer.getExpectedValue('f34b_para_per_1000w', typeVec);
      expect(val).toBeCloseTo(2.21, 3);
    });

    it('should apply lambda correction for SIL', () => {
      const typeVec = { action: 0, narration: 0, description: 0, dialogue: 0, introspection: 1 };
      // f = 1.0 × 2.0 × 0.008 = 0.016
      const val = normalizer.getExpectedValue('f28d_sil_score', typeVec);
      expect(val).toBeCloseTo(0.016, 4);
    });

    it('should apply gamma for subordination markers', () => {
      const typeVec = { action: 0, narration: 0, description: 0.5, dialogue: 0, introspection: 0.5 };
      // Lambda part: 0.5*1.3*0.7 + 0.5*1.2*0.6 = 0.455 + 0.36 = 0.815
      // Gamma part: desc×intro = 0.5*0.5*3.15 = 0.7875
      // Total: 0.815 + 0.7875 = 1.6025
      const val = normalizer.getExpectedValue('f26a_mean_sub_markers', typeVec);
      expect(val).toBeCloseTo(1.6025, 3);
    });

    it('should return null for unknown feature', () => {
      const typeVec = { action: 1, narration: 0, description: 0, dialogue: 0, introspection: 0 };
      expect(normalizer.getExpectedValue('unknown_feature', typeVec)).toBeNull();
    });
  });

  describe('getLayer', () => {
    it('should identify additive layer', () => {
      expect(normalizer.getLayer('f34b_para_per_1000w')).toBe('lambda');
      // Note: even "additive" features have lambda in the data (λ≈1.0)
    });

    it('should identify gamma layer', () => {
      expect(normalizer.getLayer('f26a_mean_sub_markers')).toBe('gamma');
    });

    it('should return unknown for missing features', () => {
      expect(normalizer.getLayer('nonexistent')).toBe('unknown');
    });
  });

  describe('getDeviation', () => {
    it('should compute positive deviation (above expectation)', () => {
      const typeVec = { action: 1, narration: 0, description: 0, dialogue: 0, introspection: 0 };
      const measured = { f34b_para_per_1000w: 3.5 };
      const result = normalizer.getDeviation(measured, typeVec);

      expect(result.expected['f34b_para_per_1000w']).toBeCloseTo(2.5, 3);
      expect(result.deviation['f34b_para_per_1000w']).toBeCloseTo(1.0, 3);
    });

    it('should compute negative deviation (below expectation)', () => {
      const typeVec = { action: 0, narration: 0, description: 0, dialogue: 0, introspection: 1 };
      const measured = { f28d_sil_score: 0.005 };
      const result = normalizer.getDeviation(measured, typeVec);

      // Expected: 2.0 × 0.008 = 0.016
      expect(result.expected['f28d_sil_score']).toBeCloseTo(0.016, 4);
      // Deviation: 0.005 - 0.016 = -0.011
      expect(result.deviation['f28d_sil_score']).toBeCloseTo(-0.011, 4);
    });
  });

  describe('evaluateTippingPoints', () => {
    it('should identify master side for HIGHER_IS_BETTER above threshold', () => {
      const measured = { f26b_long_sent_rate: 0.05 };
      const results = normalizer.evaluateTippingPoints(measured);

      const tp = results.find(r => r.feature === 'f26b_long_sent_rate');
      expect(tp).toBeDefined();
      expect(tp!.above).toBe(true);
      expect(tp!.master_side).toBe(true);
      expect(tp!.threshold).toBe(0.024);
    });

    it('should identify non-master side for HIGHER_IS_BETTER below threshold', () => {
      const measured = { f26b_long_sent_rate: 0.01 };
      const results = normalizer.evaluateTippingPoints(measured);

      const tp = results.find(r => r.feature === 'f26b_long_sent_rate');
      expect(tp!.master_side).toBe(false);
    });

    it('should handle LOWER_IS_BETTER (inverted features)', () => {
      // TTR > 0.71 → NOT master side (too artificial)
      const measured = { f29d_ttr_score: 0.75 };
      const results = normalizer.evaluateTippingPoints(measured);

      const tp = results.find(r => r.feature === 'f29d_ttr_score');
      expect(tp).toBeDefined();
      expect(tp!.above).toBe(true);
      expect(tp!.master_side).toBe(false); // High TTR = artificial
    });

    it('should handle LOWER_IS_BETTER correctly below threshold', () => {
      // TTR < 0.71 → master side
      const measured = { f29d_ttr_score: 0.68 };
      const results = normalizer.evaluateTippingPoints(measured);

      const tp = results.find(r => r.feature === 'f29d_ttr_score');
      expect(tp!.master_side).toBe(true);
    });
  });

  describe('normalize (full report)', () => {
    it('should produce complete normalization report', () => {
      const typeVec = { action: 0.2, narration: 0.3, description: 0.3, dialogue: 0.1, introspection: 0.1 };
      const measured = {
        f34b_para_per_1000w: 2.5,
        f28d_sil_score: 0.003,
        f26a_mean_sub_markers: 0.8,
        f26b_long_sent_rate: 0.05,
        f29d_ttr_score: 0.69,
        f_pov_stability: 0.55,
        f1a_rhythm_variance: 15.0,
      };

      const report = normalizer.normalize(measured, typeVec);

      // Structure checks
      expect(report.expectation).toBeDefined();
      expect(report.tipping_points).toBeDefined();
      expect(report.master_count).toBeGreaterThanOrEqual(0);
      expect(report.total_tk).toBeGreaterThan(0);
      expect(report.master_pct).toBeGreaterThanOrEqual(0);
      expect(report.master_pct).toBeLessThanOrEqual(100);

      // With these values, all 4 Tk should be on master side
      // f26b > 0.024 ✓, TTR < 0.71 ✓, POV_stab < 0.646 ✓, rhythm_var > 11.36 ✓
      expect(report.master_count).toBe(4);
      expect(report.master_pct).toBe(100);
    });

    it('should handle LLM-like features (high TTR, high stability)', () => {
      const typeVec = { action: 0.4, narration: 0.1, description: 0.1, dialogue: 0.3, introspection: 0.1 };
      const measured = {
        f26b_long_sent_rate: 0.01,  // below threshold → not master
        f29d_ttr_score: 0.75,       // above → NOT master (inverted)
        f_pov_stability: 0.85,      // above → NOT master (inverted)
        f1a_rhythm_variance: 8.0,   // below → not master
      };

      const report = normalizer.normalize(measured, typeVec);
      expect(report.master_count).toBe(0);
      expect(report.master_pct).toBe(0);
    });
  });

  describe('gammaFeatureCount', () => {
    it('should report correct number of gamma features', () => {
      expect(normalizer.gammaFeatureCount).toBe(3);
    });
  });

  describe('getFeatureNames', () => {
    it('should list all features', () => {
      const names = normalizer.getFeatureNames();
      expect(names).toContain('f34b_para_per_1000w');
      expect(names).toContain('f28d_sil_score');
      expect(names).toContain('f26a_mean_sub_markers');
      expect(names.length).toBe(3);
    });
  });
});
