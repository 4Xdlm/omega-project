/**
 * OMEGA Metrics — Score Tests
 * Phase R-METRICS — Gate 5
 */

import { describe, it, expect } from 'vitest';
import { computeGlobalScore, DEFAULT_THRESHOLDS } from '../src/score/global.js';
import type { StructuralMetrics, SemanticMetrics, DynamicMetrics } from '../src/types.js';

function perfectStructural(): StructuralMetrics {
  return {
    arc_completeness: 1.0, scene_completeness: 1.0, beat_coverage: 1.0,
    seed_integrity: 1.0, tension_monotonicity: 1.0, conflict_diversity: 1.0,
    causal_depth: 1.0, structural_entropy: 1.0,
  };
}

function perfectSemantic(): SemanticMetrics {
  return {
    intent_theme_coverage: 1.0, theme_fidelity: 1.0, canon_respect: 1.0,
    canon_violation_count: 0, emotion_trajectory_alignment: 1.0, constraint_satisfaction: 1.0,
  };
}

function skipDynamic(): DynamicMetrics {
  return { intra_intent_stability: null, inter_intent_variance: null, variant_sensitivity: null, noise_floor_ratio: null };
}

function perfectDynamic(): DynamicMetrics {
  return { intra_intent_stability: 1.0, inter_intent_variance: 0.75, variant_sensitivity: null, noise_floor_ratio: 1.0 };
}

describe('computeGlobalScore', () => {
  it('returns PASS for perfect scores', () => {
    const score = computeGlobalScore(perfectStructural(), perfectSemantic(), perfectDynamic());
    expect(score.status).toBe('PASS');
    expect(score.global).toBeGreaterThanOrEqual(0.90);
    expect(score.hard_fails).toHaveLength(0);
  });

  it('returns PASS with all dynamic SKIP (weight redistributed)', () => {
    // With SKIP redistribution: structural=1.0*(0.40/0.75)=0.533, semantic=1.0*(0.35/0.75)=0.467 → 1.0
    const score = computeGlobalScore(perfectStructural(), perfectSemantic(), skipDynamic());
    expect(score.dynamic).toBe(0);
    expect(score.global).toBeCloseTo(1.0, 2);
    expect(score.status).toBe('PASS');
  });

  it('returns FAIL for canon violations (hard fail)', () => {
    const semantic = { ...perfectSemantic(), canon_violation_count: 2 };
    const score = computeGlobalScore(perfectStructural(), semantic, perfectDynamic());
    expect(score.status).toBe('FAIL');
    expect(score.hard_fails.length).toBeGreaterThan(0);
  });

  it('returns FAIL for unstable replay (hard fail)', () => {
    const dynamic: DynamicMetrics = { intra_intent_stability: 0.5, inter_intent_variance: 1.0, variant_sensitivity: null, noise_floor_ratio: 1.0 };
    const score = computeGlobalScore(perfectStructural(), perfectSemantic(), dynamic);
    expect(score.status).toBe('FAIL');
    expect(score.hard_fails.some(f => f.includes('intra_intent_stability'))).toBe(true);
  });

  it('global score is in [0, 1]', () => {
    const score = computeGlobalScore(perfectStructural(), perfectSemantic(), perfectDynamic());
    expect(score.global).toBeGreaterThanOrEqual(0);
    expect(score.global).toBeLessThanOrEqual(1);
  });

  it('returns FAIL for very low scores', () => {
    const structural: StructuralMetrics = {
      arc_completeness: 0.1, scene_completeness: 0.1, beat_coverage: 0.1,
      seed_integrity: 0.1, tension_monotonicity: 0.1, conflict_diversity: 0.1,
      causal_depth: 0.1, structural_entropy: 0.1,
    };
    const semantic: SemanticMetrics = {
      intent_theme_coverage: 0.1, theme_fidelity: 0.1, canon_respect: 0.1,
      canon_violation_count: 0, emotion_trajectory_alignment: 0.1, constraint_satisfaction: 0.1,
    };
    const score = computeGlobalScore(structural, semantic, skipDynamic());
    expect(score.status).toBe('FAIL');
    expect(score.global).toBeLessThan(0.80);
  });
});
