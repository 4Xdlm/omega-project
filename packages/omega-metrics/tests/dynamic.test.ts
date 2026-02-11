/**
 * OMEGA Metrics — Dynamic Metrics Tests (D1-D4)
 * Phase R-METRICS — Gate 5
 */

import { describe, it, expect } from 'vitest';
import {
  intraIntentStability,
  interIntentVariance,
  variantSensitivity,
  noiseFloorRatio,
  planDistance,
  computeDynamicMetrics,
} from '../src/metrics/dynamic.js';

// ─── D1: intra_intent_stability ─────────────────────────────────────────────

describe('D1 — intra_intent_stability', () => {
  it('returns 1.0 for identical hashes', () => {
    expect(intraIntentStability('abc123', 'abc123')).toBe(1.0);
  });

  it('returns 0.0 for different hashes', () => {
    expect(intraIntentStability('abc123', 'def456')).toBe(0.0);
  });

  it('returns null (SKIP) when replay is null', () => {
    expect(intraIntentStability('abc123', null)).toBeNull();
  });
});

// ─── D2: inter_intent_variance ──────────────────────────────────────────────

describe('D2 — inter_intent_variance', () => {
  it('returns 1.0 for completely different runs', () => {
    const run1 = { plan_hash: 'aaa', arc_themes: ['isolation'], scene_count: 5, final_emotion: 'fear' };
    const run2 = { plan_hash: 'bbb', arc_themes: ['romance'], scene_count: 8, final_emotion: 'joy' };
    expect(interIntentVariance(run1, run2)).toBe(1.0);
  });

  it('returns 0.0 for identical runs', () => {
    const run = { plan_hash: 'aaa', arc_themes: ['isolation'], scene_count: 5, final_emotion: 'fear' };
    expect(interIntentVariance(run, { ...run })).toBe(0.0);
  });

  it('returns null when other run is null', () => {
    const run = { plan_hash: 'aaa', arc_themes: ['isolation'], scene_count: 5, final_emotion: 'fear' };
    expect(interIntentVariance(run, null)).toBeNull();
  });

  it('returns 0.5 for partially different runs', () => {
    const run1 = { plan_hash: 'aaa', arc_themes: ['isolation'], scene_count: 5, final_emotion: 'fear' };
    const run2 = { plan_hash: 'bbb', arc_themes: ['isolation'], scene_count: 5, final_emotion: 'joy' };
    // Different hash (+0.25) + different emotion (+0.25) = 0.5
    expect(interIntentVariance(run1, run2)).toBe(0.5);
  });
});

// ─── D3: variant_sensitivity ────────────────────────────────────────────────

describe('D3 — variant_sensitivity', () => {
  it('returns null (SKIP) — not implemented yet', () => {
    expect(variantSensitivity('hash1', null)).toBeNull();
  });
});

// ─── D4: noise_floor_ratio ──────────────────────────────────────────────────

describe('D4 — noise_floor_ratio', () => {
  it('returns 1.0 when noise is 0', () => {
    expect(noiseFloorRatio(0.5, 0)).toBe(1.0);
  });

  it('returns 0.0 when noise equals signal', () => {
    expect(noiseFloorRatio(0.5, 0.5)).toBe(0.0);
  });

  it('returns 0.0 when signal is 0', () => {
    expect(noiseFloorRatio(0, 0.5)).toBe(0);
  });

  it('returns null when data is missing', () => {
    expect(noiseFloorRatio(null, null)).toBeNull();
    expect(noiseFloorRatio(0.5, null)).toBeNull();
  });

  it('is bounded [0, 1]', () => {
    // noise > signal → clamp to 0
    expect(noiseFloorRatio(0.1, 0.5)).toBe(0);
    // normal case
    const score = noiseFloorRatio(1.0, 0.25);
    expect(score).toBe(0.75);
  });
});

// ─── planDistance ────────────────────────────────────────────────────────────

describe('planDistance', () => {
  it('returns 0 for identical plans', () => {
    const p = { scene_count: 5, beat_count: 20, arc_count: 3, plan_hash: 'abc' };
    expect(planDistance(p, p)).toBe(0);
  });

  it('returns 1.0 for completely different plans', () => {
    const p1 = { scene_count: 5, beat_count: 20, arc_count: 3, plan_hash: 'abc' };
    const p2 = { scene_count: 8, beat_count: 30, arc_count: 2, plan_hash: 'def' };
    expect(planDistance(p1, p2)).toBe(1.0);
  });
});

// ─── computeDynamicMetrics ──────────────────────────────────────────────────

describe('computeDynamicMetrics', () => {
  it('returns all 4 fields', () => {
    const run = { artifacts_hash: 'a', plan_hash: 'h1', arc_themes: ['t1'], scene_count: 5, beat_count: 20, arc_count: 2, final_emotion: 'fear' };
    const metrics = computeDynamicMetrics(run, null, null);
    expect(metrics).toHaveProperty('intra_intent_stability');
    expect(metrics).toHaveProperty('inter_intent_variance');
    expect(metrics).toHaveProperty('variant_sensitivity');
    expect(metrics).toHaveProperty('noise_floor_ratio');
  });

  it('returns nulls when no comparison data', () => {
    const run = { artifacts_hash: 'a', plan_hash: 'h1', arc_themes: ['t1'], scene_count: 5, beat_count: 20, arc_count: 2, final_emotion: 'fear' };
    const metrics = computeDynamicMetrics(run, null, null);
    expect(metrics.intra_intent_stability).toBeNull();
    expect(metrics.inter_intent_variance).toBeNull();
    expect(metrics.variant_sensitivity).toBeNull();
    expect(metrics.noise_floor_ratio).toBeNull();
  });
});
