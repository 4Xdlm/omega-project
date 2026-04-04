/**
 * Tests for P2-03a: Duel Pre-Filter (shouldSkipDuel)
 * Date: 2026-04-04
 *
 * Tests the decision logic that skips the duel when loop prose
 * already meets quality thresholds. Saves ~11 LLM calls.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { shouldSkipDuel, type DuelPrefilterDecision } from '../../src/engine.js';
import {
  DUEL_PREFILTER_COMPOSITE_MIN,
  DUEL_PREFILTER_MIN_AXIS,
} from '../../src/core/thresholds.js';
import type { SovereignLoopResult, SScore, AxesScores, AxisScore } from '../../src/types.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeAxisScore(score: number, name = 'test'): AxisScore {
  return { name, score, weight: 1.0, method: 'CALC', details: '' };
}

function makeAxes(scores: Record<string, number>): AxesScores {
  return {
    interiority: makeAxisScore(scores.interiority ?? 85, 'interiority'),
    tension_14d: makeAxisScore(scores.tension_14d ?? 85, 'tension_14d'),
    sensory_density: makeAxisScore(scores.sensory_density ?? 85, 'sensory_density'),
    necessity: makeAxisScore(scores.necessity ?? 85, 'necessity'),
    anti_cliche: makeAxisScore(scores.anti_cliche ?? 85, 'anti_cliche'),
    rhythm: makeAxisScore(scores.rhythm ?? 85, 'rhythm'),
    signature: makeAxisScore(scores.signature ?? 85, 'signature'),
    impact: makeAxisScore(scores.impact ?? 85, 'impact'),
    emotion_coherence: makeAxisScore(scores.emotion_coherence ?? 85, 'emotion_coherence'),
  };
}

function makeSScore(composite: number, axes: AxesScores, verdict: 'SEAL' | 'REJECT' = 'REJECT'): SScore {
  return {
    score_id: 'TEST_001',
    score_hash: 'hash_test',
    scene_id: 'SCENE_TEST',
    seed: 'SEED_TEST',
    axes,
    composite,
    verdict,
    emotion_weight_pct: 63.3,
  };
}

function makeLoopResult(
  composite: number,
  axisOverrides: Record<string, number> = {},
  verdict: 'SEAL' | 'REJECT' = 'REJECT',
): SovereignLoopResult {
  const axes = makeAxes(axisOverrides);
  return {
    final_prose: 'Test prose for pre-filter.',
    s_score_initial: makeSScore(80, axes),
    s_score_final: makeSScore(composite, axes, verdict),
    pitches_applied: [],
    passes_executed: 1,
    verdict,
    verdict_reason: verdict === 'SEAL' ? 'composite >= 93' : 'composite < 93',
    forensic_data: { patches: [], rollbacks: [] } as any,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('P2-03a: Duel Pre-Filter (shouldSkipDuel)', () => {
  afterEach(() => {
    delete process.env.OMEGA_DUEL_PREFILTER;
  });

  // ── Threshold values ──
  it('PF-01: thresholds are SSOT-sourced from core/thresholds.ts', () => {
    expect(DUEL_PREFILTER_COMPOSITE_MIN).toBe(90.0);
    expect(DUEL_PREFILTER_MIN_AXIS).toBe(80.0);
  });

  // ── SKIP cases ──
  it('PF-02: SKIP when V1 composite >= 90 AND min_axis >= 80 AND verdict REJECT', () => {
    const result = shouldSkipDuel(makeLoopResult(91.0, { interiority: 82, tension_14d: 85 }));
    expect(result.skip).toBe(true);
    expect(result.reason).toContain('SKIP');
    expect(result.v1_composite).toBe(91.0);
  });

  it('PF-03: SKIP at exact thresholds (composite=90.0, all axes=80.0)', () => {
    const axisAll80: Record<string, number> = {};
    for (const name of ['interiority', 'tension_14d', 'sensory_density', 'necessity', 'anti_cliche', 'rhythm', 'signature', 'impact', 'emotion_coherence']) {
      axisAll80[name] = 80.0;
    }
    const result = shouldSkipDuel(makeLoopResult(90.0, axisAll80));
    expect(result.skip).toBe(true);
  });

  // ── PASS-THROUGH cases ──
  it('PF-04: PASS-THROUGH when composite below threshold', () => {
    const result = shouldSkipDuel(makeLoopResult(85.0, { interiority: 82 }));
    expect(result.skip).toBe(false);
    expect(result.reason).toContain('PASS-THROUGH');
    expect(result.reason).toContain('below threshold');
  });

  it('PF-05: PASS-THROUGH when one axis below min_axis threshold', () => {
    // composite OK but one axis dragging below 80
    const result = shouldSkipDuel(makeLoopResult(91.0, { rhythm: 75.0 }));
    expect(result.skip).toBe(false);
    expect(result.reason).toContain('PASS-THROUGH');
  });

  it('PF-06: PASS-THROUGH when both composite and min_axis below', () => {
    const result = shouldSkipDuel(makeLoopResult(82.0, { interiority: 60 }));
    expect(result.skip).toBe(false);
  });

  // ── INV-PREFILTER-01: V1 SEAL + V3 REJECT ──
  it('PF-07: INV-PREFILTER-01 — NEVER skip if V1 verdict is SEAL (V3 rejected)', () => {
    // Even though composite is high, V1 said SEAL but V3 disagreed
    // → V3 found a problem V1 missed → must duel
    const result = shouldSkipDuel(makeLoopResult(94.0, {}, 'SEAL'));
    expect(result.skip).toBe(false);
    expect(result.reason).toContain('INV-PREFILTER-01');
  });

  // ── Toggle: OMEGA_DUEL_PREFILTER=0 ──
  it('PF-08: DISABLED when OMEGA_DUEL_PREFILTER=0 (even if scores are high)', () => {
    process.env.OMEGA_DUEL_PREFILTER = '0';
    const result = shouldSkipDuel(makeLoopResult(95.0));
    expect(result.skip).toBe(false);
    expect(result.reason).toContain('DISABLED');
  });

  it('PF-09: ENABLED by default (no env var set)', () => {
    delete process.env.OMEGA_DUEL_PREFILTER;
    const result = shouldSkipDuel(makeLoopResult(91.0));
    expect(result.skip).toBe(true);
  });

  it('PF-10: ENABLED when OMEGA_DUEL_PREFILTER=1', () => {
    process.env.OMEGA_DUEL_PREFILTER = '1';
    const result = shouldSkipDuel(makeLoopResult(91.0));
    expect(result.skip).toBe(true);
  });

  // ── Edge cases ──
  it('PF-11: composite exactly at threshold boundary (89.9 → no skip)', () => {
    const result = shouldSkipDuel(makeLoopResult(89.9));
    expect(result.skip).toBe(false);
  });

  it('PF-12: min_axis exactly at boundary (79.9 → no skip)', () => {
    const result = shouldSkipDuel(makeLoopResult(91.0, { signature: 79.9 }));
    expect(result.skip).toBe(false);
  });

  // ── Return shape ──
  it('PF-13: decision object contains v1_composite and v1_min_axis when scores computed', () => {
    const result = shouldSkipDuel(makeLoopResult(88.0, { rhythm: 72 }));
    expect(result.v1_composite).toBe(88.0);
    expect(result.v1_min_axis).toBe(72);
  });

  it('PF-14: decision object omits scores when disabled or INV-PREFILTER-01', () => {
    process.env.OMEGA_DUEL_PREFILTER = '0';
    const r1 = shouldSkipDuel(makeLoopResult(95.0));
    expect(r1.v1_composite).toBeUndefined();

    delete process.env.OMEGA_DUEL_PREFILTER;
    const r2 = shouldSkipDuel(makeLoopResult(94.0, {}, 'SEAL'));
    expect(r2.v1_composite).toBeUndefined();
  });
});
