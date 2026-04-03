/**
 * R4-d — Integrated Scorer V3 (LOCAL + ARC)
 *
 * Tests the full scoring pipeline:
 *   V3 Ridge (R3 + R8) → ARC → Dual Scale
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntegratedScorerV3, W_LOCAL, W_ARC } from '../../src/scoring/integrated-scorer-v3.js';
import { resetArc } from '../../src/scoring/arc-scorer.js';

// Feature vectors simulating a 4-chunk run with ascending quality
const CHUNK_1: Record<string, number> = {
  f1_mean: 18.0, f1a_rhythm_variance: 12.0, f19a_approx_entropy: 0.70,
  f29d_ttr_score: 0.71, f_pov_shift_rate: 0.20, f_clause_per_sentence: 1.30,
  f36c_cliff_score: 0.60, f35c_hook_score: 0.50, f26b_long_sent_rate: 0.08,
};

const CHUNK_2: Record<string, number> = {
  ...CHUNK_1,
  f1_mean: 20.0, f19a_approx_entropy: 0.73, f_pov_shift_rate: 0.25,
};

const CHUNK_3: Record<string, number> = {
  ...CHUNK_2,
  f1_mean: 22.0, f19a_approx_entropy: 0.76, f_clause_per_sentence: 1.50,
  f_subordination_depth: 0.65,
};

const CHUNK_4: Record<string, number> = {
  ...CHUNK_3,
  f1_mean: 24.0, f19a_approx_entropy: 0.80, f_pov_shift_rate: 0.35,
  f26b_long_sent_rate: 0.12,
};

const CHUNKS = [CHUNK_1, CHUNK_2, CHUNK_3, CHUNK_4];

describe('R4-d — Integrated Scorer V3', () => {

  beforeEach(() => {
    resetArc();
  });

  // ── Structure ──

  it('R4d-01: scoreChunk returns valid IntegratedV3Result', () => {
    const scorer = new IntegratedScorerV3(88);
    const result = scorer.scoreChunk(CHUNK_1, { wordCount: 750 });

    expect(result).toHaveProperty('local');
    expect(result).toHaveProperty('arc');
    expect(result).toHaveProperty('dual_score');
    expect(result).toHaveProperty('chunk_count');
    expect(result).toHaveProperty('flags');
    expect(result.local).toHaveProperty('raw');
    expect(result.local).toHaveProperty('score100');
    expect(result.local).toHaveProperty('final');
    expect(result.arc).toHaveProperty('arc_composite');
    expect(result.arc).toHaveProperty('progression');
    expect(result.arc).toHaveProperty('tension_variance');
    expect(result.arc).toHaveProperty('closure_signal');
  });

  // ── Dual Scale ──

  it('R4d-02: dual_score = W_LOCAL × local.final + W_ARC × arc.composite', () => {
    const scorer = new IntegratedScorerV3(88);
    scorer.scoreChunk(CHUNK_1, { wordCount: 750 });
    const result = scorer.scoreChunk(CHUNK_2, { wordCount: 750 });

    const expected = Math.round(
      (W_LOCAL * result.local.final + W_ARC * result.arc.arc_composite) * 100,
    ) / 100;

    expect(result.dual_score).toBeCloseTo(expected, 2);
  });

  it('R4d-03: W_LOCAL + W_ARC = 1.0', () => {
    expect(W_LOCAL + W_ARC).toBeCloseTo(1.0, 10);
  });

  // ── Chunk accumulation ──

  it('R4d-04: chunk_count increments with each scoreChunk', () => {
    const scorer = new IntegratedScorerV3(88);

    const r1 = scorer.scoreChunk(CHUNK_1, { wordCount: 750 });
    expect(r1.chunk_count).toBe(1);

    const r2 = scorer.scoreChunk(CHUNK_2, { wordCount: 750 });
    expect(r2.chunk_count).toBe(2);

    const r3 = scorer.scoreChunk(CHUNK_3, { wordCount: 750 });
    expect(r3.chunk_count).toBe(3);
  });

  it('R4d-05: getScores returns accumulated LOCAL finals', () => {
    const scorer = new IntegratedScorerV3(88);
    scorer.scoreChunk(CHUNK_1, { wordCount: 750 });
    scorer.scoreChunk(CHUNK_2, { wordCount: 750 });

    const scores = scorer.getScores();
    expect(scores).toHaveLength(2);
    expect(scores[0]).toBeGreaterThan(0);
    expect(scores[1]).toBeGreaterThan(0);
  });

  // ── Reset ──

  it('R4d-06: reset clears scores and ARC state', () => {
    const scorer = new IntegratedScorerV3(88);
    scorer.scoreChunk(CHUNK_1, { wordCount: 750 });
    scorer.scoreChunk(CHUNK_2, { wordCount: 750 });

    scorer.reset();
    expect(scorer.getScores()).toHaveLength(0);

    // After reset, first chunk should be chunk_count=1
    const r = scorer.scoreChunk(CHUNK_1, { wordCount: 750 });
    expect(r.chunk_count).toBe(1);
  });

  // ── ARC progression ──

  it('R4d-07: ascending chunks → progression > 50 (ascending detected)', () => {
    const scorer = new IntegratedScorerV3(88);
    let lastResult;
    for (const chunk of CHUNKS) {
      lastResult = scorer.scoreChunk(chunk, { wordCount: 750 });
    }
    expect(lastResult!.arc.progression).toBeGreaterThan(50);
  });

  // ── Stateless scoreSequence ──

  it('R4d-08: scoreSequence returns valid result without modifying state', () => {
    const scorer = new IntegratedScorerV3(88);
    // Score one chunk statefully
    scorer.scoreChunk(CHUNK_1, { wordCount: 750 });
    expect(scorer.getScores()).toHaveLength(1);

    // Score sequence statelessly
    const result = scorer.scoreSequence(CHUNKS, { wordCount: 750 });
    expect(result).not.toBeNull();
    expect(result!.chunk_count).toBe(4);

    // Internal state should still be 1 (not modified by scoreSequence)
    expect(scorer.getScores()).toHaveLength(1);
  });

  it('R4d-09: scoreSequence returns null for empty array', () => {
    const scorer = new IntegratedScorerV3(88);
    const result = scorer.scoreSequence([], { wordCount: 750 });
    expect(result).toBeNull();
  });

  it('R4d-10: scoreSequence result is close to sequential scoreChunk', () => {
    // Stateful
    const scorerA = new IntegratedScorerV3(88);
    let lastStateful;
    for (const chunk of CHUNKS) {
      lastStateful = scorerA.scoreChunk(chunk, { wordCount: 750 });
    }

    // Stateless
    const scorerB = new IntegratedScorerV3(88);
    const stateless = scorerB.scoreSequence(CHUNKS, { wordCount: 750 });

    // LOCAL scores should be identical (same Ridge scorer, same features)
    expect(stateless!.local.raw).toBe(lastStateful!.local.raw);
    expect(stateless!.local.final).toBe(lastStateful!.local.final);
    // ARC composites should be close (same scores, same algorithm)
    expect(stateless!.arc.arc_composite).toBeCloseTo(lastStateful!.arc.arc_composite, 1);
  });

  // ── Closure target ──

  it('R4d-11: setClosureTarget affects closure_signal', () => {
    const scorerLow = new IntegratedScorerV3(78);  // EXPERIMENTAL threshold
    const scorerHigh = new IntegratedScorerV3(93);  // STRATOSPHERIQUE threshold

    const rLow = scorerLow.scoreSequence(CHUNKS, { wordCount: 750 });
    const rHigh = scorerHigh.scoreSequence(CHUNKS, { wordCount: 750 });

    // Same features but different closure targets
    // Lower target → easier to reach → higher closure signal
    expect(rLow!.arc.closure_signal).toBeGreaterThan(rHigh!.arc.closure_signal);
  });

  // ── Flags ──

  it('R4d-12: flags reflect active modules', () => {
    const scorer = new IntegratedScorerV3(88, true, true);
    const result = scorer.scoreChunk(CHUNK_1, { wordCount: 750 });

    expect(result.flags.r3_modulated).toBe(true);
    expect(result.flags.arc_active).toBe(true);
    // r8_tipping_active depends on whether features hit tipping points
    expect(typeof result.flags.r8_tipping_active).toBe('boolean');
  });

  it('R4d-13: disabling R3/R8 produces different dual_score', () => {
    const full = new IntegratedScorerV3(88, true, true);
    const bare = new IntegratedScorerV3(88, false, false);

    const rFull = full.scoreSequence(CHUNKS, { wordCount: 750 });
    const rBare = bare.scoreSequence(CHUNKS, { wordCount: 750 });

    // LOCAL scores differ (R3 modulation changes weights)
    expect(rFull!.local.raw).not.toBe(rBare!.local.raw);
    // Dual scores differ
    expect(rFull!.dual_score).not.toBe(rBare!.dual_score);
  });

  // ── Score ranges ──

  it('R4d-14: all scores in valid ranges', () => {
    const scorer = new IntegratedScorerV3(88);
    for (const chunk of CHUNKS) {
      const result = scorer.scoreChunk(chunk, { wordCount: 750 });
      expect(result.local.final).toBeGreaterThanOrEqual(0);
      expect(result.local.final).toBeLessThanOrEqual(100);
      expect(result.arc.arc_composite).toBeGreaterThanOrEqual(0);
      expect(result.arc.arc_composite).toBeLessThanOrEqual(100);
      expect(result.dual_score).toBeGreaterThanOrEqual(0);
      expect(result.dual_score).toBeLessThanOrEqual(100);
    }
  });
});
