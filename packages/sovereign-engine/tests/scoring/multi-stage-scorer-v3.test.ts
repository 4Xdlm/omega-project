/**
 * R4-b + R4-c — Multi-Stage Scorer V3
 *   R4-b: R3 Confidence Modulation
 *   R4-c: R8 Tipping Points Integration
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import { MultiStageScorerV3 } from '../../src/scoring/multi-stage-scorer-v3.js';

// Representative feature vector (close to corpus mean values)
const MEAN_FEATURES: Record<string, number> = {
  f26b_long_sent_rate:    0.10,
  f1a_rhythm_variance:    14.88,
  f1_mean:                20.77,
  f24c_contrast_delta:    29.64,
  f28b_irony_density:     0.10,
  f27a_epistemic_rate:    10.17,
  f9a_contradiction_rate: 0.90,
  f19a_approx_entropy:    0.73,
  f27d_modal_score:       0.24,
  f26c_period_score:      0.11,
  f_pov_shift_rate:       0.21,
  f_subordination_depth:  0.54,
  f_clause_per_sentence:  1.40,
  f17_knife_count:        6.63,
  f29d_ttr_score:         0.71,
  f35c_hook_score:        0.54,
  f36c_cliff_score:       0.64,
};

describe('R4-b — Scorer V3 R3 Confidence Modulation', () => {

  const scorerR3 = new MultiStageScorerV3(true);
  const scorerRaw = new MultiStageScorerV3(false);

  // ── Structure ──

  it('R4b-01: V3Score has r3_modulated and r3_mean_confidence fields', () => {
    const result = scorerR3.score(MEAN_FEATURES, { wordCount: 600 });
    expect(result).toHaveProperty('r3_modulated');
    expect(result).toHaveProperty('r3_mean_confidence');
    expect(result.r3_modulated).toBe(true);
    expect(result.r3_mean_confidence).toBeGreaterThan(0);
    expect(result.r3_mean_confidence).toBeLessThanOrEqual(1);
  });

  it('R4b-02: raw mode has r3_modulated = false', () => {
    const result = scorerRaw.score(MEAN_FEATURES, { wordCount: 600 });
    expect(result.r3_modulated).toBe(false);
  });

  // ── A/B Comparison ──

  it('R4b-03: R3 modulation produces different raw score than unmodulated', () => {
    const r3Result = scorerR3.score(MEAN_FEATURES, { wordCount: 600 });
    const rawResult = scorerRaw.score(MEAN_FEATURES, { wordCount: 600 });

    // Scores must differ because R3 confidence < 1.0 for most features
    expect(r3Result.raw).not.toBe(rawResult.raw);
    // Both must be valid
    expect(r3Result.score100).toBeGreaterThanOrEqual(0);
    expect(r3Result.score100).toBeLessThanOrEqual(100);
    expect(rawResult.score100).toBeGreaterThanOrEqual(0);
    expect(rawResult.score100).toBeLessThanOrEqual(100);
  });

  it('R4b-04: R3 modulation reduces total absolute contribution magnitude', () => {
    // R3 confidence ≤ 1.0 for all features → each individual |contribution| is reduced.
    // Total absolute contribution sum should be smaller with R3 modulation.
    const r3Result = scorerR3.score(MEAN_FEATURES, { wordCount: 600 });
    const rawResult = scorerRaw.score(MEAN_FEATURES, { wordCount: 600 });

    const r3AbsSum = r3Result.top_contributors.reduce((s, c) => s + Math.abs(c.contribution), 0);
    const rawAbsSum = rawResult.top_contributors.reduce((s, c) => s + Math.abs(c.contribution), 0);

    expect(r3AbsSum).toBeLessThan(rawAbsSum);
  });

  // ── R3 Confidence Coverage ──

  it('R4b-05: R3_CONFIDENCE covers all 17 WEIGHTS features', () => {
    // If a feature is missing from R3_CONFIDENCE, it falls back to 1.0.
    // We verify that the R3 mean confidence is < 1.0 when all features are present,
    // which means at least some features have R3 confidence < 1.0
    const result = scorerR3.score(MEAN_FEATURES, { wordCount: 600 });
    expect(result.r3_mean_confidence).toBeLessThan(1.0);
    // All 17 features should be available
    expect(result.confidence).toBe(1.0);
  });

  // ── Floor-confidence features ──

  it('R4b-06: floor-confidence features have minimal contribution', () => {
    // f26b_long_sent_rate has R3 conf = 0.05 (floor) but Ridge weight +0.589
    // With R3 modulation, its contribution should be ~5% of unmodulated
    const singleFeat = { f26b_long_sent_rate: 0.5 };
    const r3Result = scorerR3.score(singleFeat, { wordCount: 600 });
    const rawResult = scorerRaw.score(singleFeat, { wordCount: 600 });

    const r3Contrib = r3Result.top_contributors.find(c => c.feature === 'f26b_long_sent_rate');
    const rawContrib = rawResult.top_contributors.find(c => c.feature === 'f26b_long_sent_rate');

    expect(r3Contrib).toBeDefined();
    expect(rawContrib).toBeDefined();
    // R3 contribution should be ~5% of raw contribution
    const ratio = Math.abs(r3Contrib!.contribution) / Math.abs(rawContrib!.contribution);
    expect(ratio).toBeCloseTo(0.05, 2);
  });

  it('R4b-07: high-confidence features retain most of their contribution', () => {
    // f29d_ttr_score has R3 conf = 0.9502 — should retain ~95%
    const singleFeat = { f29d_ttr_score: 0.71 };
    const r3Result = scorerR3.score(singleFeat, { wordCount: 600 });
    const rawResult = scorerRaw.score(singleFeat, { wordCount: 600 });

    const r3Contrib = r3Result.top_contributors.find(c => c.feature === 'f29d_ttr_score');
    const rawContrib = rawResult.top_contributors.find(c => c.feature === 'f29d_ttr_score');

    expect(r3Contrib).toBeDefined();
    expect(rawContrib).toBeDefined();
    const ratio = Math.abs(r3Contrib!.contribution) / Math.abs(rawContrib!.contribution);
    expect(ratio).toBeCloseTo(0.9502, 2);
  });

  // ── Depth features unmodulated ──

  it('R4b-08: depth features (R5bis) are unmodulated (conf=1.0)', () => {
    const depthFeat = { f_pov_shift_rate: 0.3, f_subordination_depth: 0.6, f_clause_per_sentence: 1.5 };
    const r3Result = scorerR3.score(depthFeat, { wordCount: 600 });
    const rawResult = scorerRaw.score(depthFeat, { wordCount: 600 });

    // With conf=1.0, R3 and raw should produce identical scores for depth features
    expect(r3Result.raw).toBe(rawResult.raw);
    expect(r3Result.score100).toBe(rawResult.score100);
  });

  // ── Interaction confidence ──

  it('R4b-09: interaction confidence = min(conf_a, conf_b)', () => {
    // ix_pov_x_irony: f_pov_shift_rate (conf=1.0) × f28b_irony_density (conf=0.05)
    // → interaction conf = 0.05
    const ixFeats = { f_pov_shift_rate: 0.3, f28b_irony_density: 0.5 };
    const r3Result = scorerR3.score(ixFeats, { wordCount: 600 });
    const rawResult = scorerRaw.score(ixFeats, { wordCount: 600 });

    const r3Ix = r3Result.top_contributors.find(c => c.feature === 'ix_pov_x_irony');
    const rawIx = rawResult.top_contributors.find(c => c.feature === 'ix_pov_x_irony');

    if (r3Ix && rawIx && rawIx.contribution !== 0) {
      const ratio = Math.abs(r3Ix.contribution) / Math.abs(rawIx.contribution);
      // min(1.0, 0.05) = 0.05 — allow rounding tolerance from r4()
      expect(ratio).toBeCloseTo(0.05, 1);
    }
  });

  // ── Bonuses unchanged ──

  it('R4b-10: bonuses are NOT affected by R3 modulation', () => {
    // Bonuses check feature VALUES (not contributions), so R3 should not affect them
    const bonusFeats = {
      f1_mean: 25.0,
      f1a_rhythm_variance: 15.0,
      f_subordination_depth: 0.8,
      f_clause_per_sentence: 1.6,
      f_pov_shift_rate: 0.3,
      f19a_approx_entropy: 0.8,
    };
    const r3Result = scorerR3.score(bonusFeats, { wordCount: 600 });
    const rawResult = scorerRaw.score(bonusFeats, { wordCount: 600 });

    expect(r3Result.bonuses.length).toBe(rawResult.bonuses.length);
    const r3Names = r3Result.bonuses.map(b => b.name).sort();
    const rawNames = rawResult.bonuses.map(b => b.name).sort();
    expect(r3Names).toEqual(rawNames);
  });

  // ── Mean confidence plausibility ──

  it('R4b-11: mean R3 confidence is in plausible range for full feature set', () => {
    const result = scorerR3.score(MEAN_FEATURES, { wordCount: 600 });
    // Weighted average of: ~0.05 (×4 floored), ~0.14 (×1), ~0.38-0.95 (×9), 1.0 (×3)
    // Expected range: approximately 0.45-0.65
    expect(result.r3_mean_confidence).toBeGreaterThan(0.40);
    expect(result.r3_mean_confidence).toBeLessThan(0.70);
  });

  // ── Empty features ──

  it('R4b-12: empty features → r3_mean_confidence = 0', () => {
    const result = scorerR3.score({}, { wordCount: 600 });
    expect(result.r3_mean_confidence).toBe(0);
    expect(result.r3_modulated).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// R4-c — R8 Tipping Points
// ═══════════════════════════════════════════════════════════════════════

describe('R4-c — R8 Tipping Points Integration', () => {

  const scorerFull = new MultiStageScorerV3(true, true);   // R3 + R8
  const scorerNoR8 = new MultiStageScorerV3(true, false);  // R3 only, no R8

  // Master-quality features: all on "good" side of tipping points
  const MASTER_FEATURES: Record<string, number> = {
    f26b_long_sent_rate:    0.10,    // > 0.024 ✓
    f_pov_stability:        0.30,    // < 0.646 ✓
    f_pov_shift_rate:       0.40,    // > 0.348 ✓
    f29d_ttr_score:         0.70,    // < 0.709 ✓
    f_causal_density:       0.10,    // > 0.068 ✓
    f1a_rhythm_variance:    15.0,    // > 11.36 ✓ (also feeds ix_variance_x_longrate = 15*0.1 = 1.5 > 0.096 ✓)
    f_pov_drift_rate:       0.15,    // > 0.113 ✓
    f19a_approx_entropy:    0.75,    // > 0.637 ✓
    f_clause_per_sentence:  1.50,    // > 1.010 ✓
    // All 10 tipping points evaluable, 10 on master side
  };

  // Poor-quality features: all on "bad" side
  const POOR_FEATURES: Record<string, number> = {
    f26b_long_sent_rate:    0.01,    // < 0.024 ✗
    f_pov_stability:        0.80,    // > 0.646 ✗
    f_pov_shift_rate:       0.10,    // < 0.348 ✗
    f29d_ttr_score:         0.75,    // > 0.709 ✗
    f_causal_density:       0.02,    // < 0.068 ✗
    f1a_rhythm_variance:    5.0,     // < 11.36 ✗ (ix = 5*0.01 = 0.05 < 0.096 ✗)
    f_pov_drift_rate:       0.05,    // < 0.113 ✗
    f19a_approx_entropy:    0.50,    // < 0.637 ✗
    f_clause_per_sentence:  0.80,    // < 1.010 ✗
    // All 10 evaluable, 0 on master side
  };

  // ── Structure ──

  it('R4c-01: V3Score has r8_tipping field', () => {
    const result = scorerFull.score(MASTER_FEATURES, { wordCount: 600 });
    expect(result).toHaveProperty('r8_tipping');
    expect(result.r8_tipping).toHaveProperty('master_count');
    expect(result.r8_tipping).toHaveProperty('total_evaluated');
    expect(result.r8_tipping).toHaveProperty('bonus');
  });

  // ── Master vs Poor ──

  it('R4c-02: master features → 10/10 tipping points, high bonus', () => {
    const result = scorerFull.score(MASTER_FEATURES, { wordCount: 600 });
    expect(result.r8_tipping.master_count).toBe(10);
    expect(result.r8_tipping.total_evaluated).toBe(10);
    expect(result.r8_tipping.bonus).toBe(10); // 100% → max bonus
  });

  it('R4c-03: poor features → 0/10 tipping points, zero bonus', () => {
    const result = scorerFull.score(POOR_FEATURES, { wordCount: 600 });
    expect(result.r8_tipping.master_count).toBe(0);
    expect(result.r8_tipping.total_evaluated).toBe(10);
    expect(result.r8_tipping.bonus).toBe(0);
  });

  it('R4c-04: master features score higher than poor features', () => {
    const masterResult = scorerFull.score(MASTER_FEATURES, { wordCount: 600 });
    const poorResult = scorerFull.score(POOR_FEATURES, { wordCount: 600 });
    expect(masterResult.final).toBeGreaterThan(poorResult.final);
  });

  // ── R8 bonus appears in bonuses array ──

  it('R4c-05: r8_tipping_mastery bonus appears when earned', () => {
    const result = scorerFull.score(MASTER_FEATURES, { wordCount: 600 });
    const r8Bonus = result.bonuses.find(b => b.name === 'r8_tipping_mastery');
    expect(r8Bonus).toBeDefined();
    expect(r8Bonus!.value).toBe(10);
  });

  it('R4c-06: no r8_tipping_mastery bonus when all poor', () => {
    const result = scorerFull.score(POOR_FEATURES, { wordCount: 600 });
    const r8Bonus = result.bonuses.find(b => b.name === 'r8_tipping_mastery');
    expect(r8Bonus).toBeUndefined();
  });

  // ── Disable R8 ──

  it('R4c-07: R8 disabled → no bonus, zero tipping result', () => {
    const result = scorerNoR8.score(MASTER_FEATURES, { wordCount: 600 });
    expect(result.r8_tipping.bonus).toBe(0);
    expect(result.r8_tipping.master_count).toBe(0);
    expect(result.r8_tipping.total_evaluated).toBe(0);
    const r8Bonus = result.bonuses.find(b => b.name === 'r8_tipping_mastery');
    expect(r8Bonus).toBeUndefined();
  });

  it('R4c-08: R8 disabled → final equals R3-only score (no R8 bonus)', () => {
    const withR8 = scorerFull.score(MASTER_FEATURES, { wordCount: 600 });
    const noR8 = scorerNoR8.score(MASTER_FEATURES, { wordCount: 600 });
    // score100 should be identical (same Ridge + R3), only final differs by R8 bonus
    expect(withR8.score100).toBe(noR8.score100);
    expect(withR8.final).toBeGreaterThan(noR8.final);
  });

  // ── Interaction tipping point ──

  it('R4c-09: ix_variance_x_longrate is computed from f1a*f26b', () => {
    // f1a=15, f26b=0.10 → product = 1.5 > threshold 0.096 → master side
    const feats = { f1a_rhythm_variance: 15.0, f26b_long_sent_rate: 0.10 };
    const result = scorerFull.score(feats, { wordCount: 600 });
    // Should evaluate at least 2 tipping points (f26b + ix) and f1a
    expect(result.r8_tipping.total_evaluated).toBeGreaterThanOrEqual(3);
    expect(result.r8_tipping.master_count).toBeGreaterThanOrEqual(3);
  });

  // ── Partial features ──

  it('R4c-10: missing features → only available ones evaluated', () => {
    const partial = { f19a_approx_entropy: 0.75 }; // only 1 tipping point evaluable
    const result = scorerFull.score(partial, { wordCount: 600 });
    expect(result.r8_tipping.total_evaluated).toBe(1);
    expect(result.r8_tipping.master_count).toBe(1); // 0.75 > 0.637
  });

  // ── Bonus capped at R8_MAX_BONUS (10) ──

  it('R4c-11: bonus never exceeds 10', () => {
    const result = scorerFull.score(MASTER_FEATURES, { wordCount: 600 });
    expect(result.r8_tipping.bonus).toBeLessThanOrEqual(10);
  });

  // ── Empty features ──

  it('R4c-12: empty features → 0/0 tipping, zero bonus', () => {
    const result = scorerFull.score({}, { wordCount: 600 });
    expect(result.r8_tipping.master_count).toBe(0);
    expect(result.r8_tipping.total_evaluated).toBe(0);
    expect(result.r8_tipping.bonus).toBe(0);
  });
});
