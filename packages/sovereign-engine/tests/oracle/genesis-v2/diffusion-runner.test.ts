// tests/oracle/genesis-v2/diffusion-runner.test.ts
// Diffusion Runner — INV-DIFF-01/02/03 — 5 tests
// W3b-partial — Phase T

import { describe, it, expect, vi } from 'vitest';
import { runDiffusionCleanup, DIFFUSION_COMPOSITE_THRESHOLD } from '../../../src/oracle/genesis-v2/diffusion-runner.js';
import type { DiffusionRunnerResult } from '../../../src/oracle/genesis-v2/diffusion-runner.js';
import type { SScoreV2 } from '../../../src/oracle/s-oracle-v2.js';
import type { TranscendentPlanJSON } from '../../../src/oracle/genesis-v2/transcendent-planner.js';
import type { LLMJudge } from '../../../src/oracle/llm-judge.js';
import type { ForgePacket } from '../../../src/types.js';

// ── FIXTURES ────────────────────────────────────────────────────────────────

const PLAN: TranscendentPlanJSON = {
  subtext_truth: 'La peur de perdre ce qui reste de lien familial',
  objective_correlative: 'tasse ébréchée',
  forbidden_lexicon: ['peur', 'amour', 'tristesse'],
  forbidden_lemmes: ['trembl', 'pleur', 'souffr'],
  forbidden_bigrammes: ['il savait', 'elle comprit', 'le silence'],
  likely_metaphor: 'un mur invisible entre eux',
  subversion_angle: 'Le mur est en fait une porte restée ouverte',
  master_axes_targets: { tension_14d: 0.8, signature: 0.7, interiorite: 0.75 },
};

const PROSE_WITH_BANNED_WORD = 'La tasse ébréchée sur la table. La peur montait en lui. Le vent soufflait.';
const PROSE_CLEANED = 'La tasse ébréchée sur la table. L\'inquiétude montait en lui. Le vent soufflait.';

const MOCK_PACKET = { packet_id: 'test-packet' } as unknown as ForgePacket;

function makeScore(overrides: Partial<SScoreV2>): SScoreV2 {
  return {
    axes: [],
    composite: 0,
    emotion_weight_ratio: 0.63,
    verdict: 'REJECT',
    s_score_hash: 'test-hash',
    scored_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeMockJudge(cleanedProse: string): LLMJudge {
  return {
    generateText: vi.fn().mockResolvedValue(cleanedProse),
    judge: vi.fn(),
  } as unknown as LLMJudge;
}

// ── TESTS ───────────────────────────────────────────────────────────────────

describe('diffusion-runner — INV-DIFF-01/02/03', () => {

  // Test 1: Prose with banned word + composite_without_gate=82 → diffusion triggered
  it('paradox rejection + composite_without_gate > threshold → diffusion triggered', async () => {
    const initialScore = makeScore({
      rejection_reason: 'paradox_gate: INV-PARADOX-01',
      composite: 0,
      composite_without_gate: 82,
    });

    const cleanedScore = makeScore({
      composite: 85,
      verdict: 'SEAL',
    });

    const judge = makeMockJudge(PROSE_CLEANED);
    const scoreAsync = vi.fn().mockResolvedValue(cleanedScore);

    const result = await runDiffusionCleanup({
      prose: PROSE_WITH_BANNED_WORD,
      packet: MOCK_PACKET,
      plan: PLAN,
      initialScore,
      judge,
      seed: 'test-seed',
      scoreAsync,
    });

    expect(result.diffusion_triggered).toBe(true);
    expect(result.nb_steps).toBeGreaterThanOrEqual(1);
    expect(result.final_prose).toBe(PROSE_CLEANED);
    expect(result.paradox_cleaned).toBe(true);
  });

  // Test 2: composite_without_gate=70 (< 75 threshold) → diffusion still runs
  // (threshold check is in validation-runner, not in diffusion-runner itself)
  // Diffusion runner always runs when called — it's the caller's responsibility to check threshold
  it('low composite_without_gate → diffusion runs but may not clear paradox', async () => {
    const initialScore = makeScore({
      rejection_reason: 'paradox_gate: INV-PARADOX-01',
      composite: 0,
      composite_without_gate: 70,
    });

    // Score still below threshold after cleanup
    const stillBadScore = makeScore({
      rejection_reason: 'composite_below_threshold',
      composite: 68,
      verdict: 'REJECT',
    });

    const judge = makeMockJudge(PROSE_CLEANED);
    const scoreAsync = vi.fn().mockResolvedValue(stillBadScore);

    const result = await runDiffusionCleanup({
      prose: PROSE_WITH_BANNED_WORD,
      packet: MOCK_PACKET,
      plan: PLAN,
      initialScore,
      judge,
      seed: 'test-seed-low',
      scoreAsync,
    });

    expect(result.diffusion_triggered).toBe(true);
    expect(result.nb_steps).toBeGreaterThanOrEqual(1);
    // paradox_cleaned depends on whether re-score still has paradox
    expect(result.composite_initial).toBe(70);
  });

  // Test 3: Cleanup LLM returns prose without banned word → paradox_cleaned=true
  it('cleanup removes banned word → paradox_cleaned=true', async () => {
    const initialScore = makeScore({
      rejection_reason: 'paradox_gate: INV-PARADOX-01',
      composite: 0,
      composite_without_gate: 85,
    });

    // After cleanup, no more paradox rejection
    const cleanScore = makeScore({
      composite: 88,
      verdict: 'SEAL',
      // No rejection_reason → paradox cleared
    });

    const judge = makeMockJudge(PROSE_CLEANED);
    const scoreAsync = vi.fn().mockResolvedValue(cleanScore);

    const result = await runDiffusionCleanup({
      prose: PROSE_WITH_BANNED_WORD,
      packet: MOCK_PACKET,
      plan: PLAN,
      initialScore,
      judge,
      seed: 'test-seed-clean',
      scoreAsync,
    });

    expect(result.paradox_cleaned).toBe(true);
    expect(result.final_prose).toBe(PROSE_CLEANED);
    expect(result.composite_final).toBe(88);
  });

  // Test 4: INV-DIFF-02 — no-regress gate: cleanup degrades composite → rolled_back
  it('INV-DIFF-02: no-regress gate — composite regression → rolled_back', async () => {
    const initialScore = makeScore({
      rejection_reason: 'paradox_gate: INV-PARADOX-01',
      composite: 0,
      composite_without_gate: 82,
    });

    // After cleanup, composite DROPS (regression)
    const worseScore = makeScore({
      rejection_reason: 'paradox_gate: INV-PARADOX-01',
      composite: 0,
      composite_without_gate: 75, // dropped from 82
    });

    const judge = makeMockJudge('degraded prose');
    const scoreAsync = vi.fn().mockResolvedValue(worseScore);

    const result = await runDiffusionCleanup({
      prose: PROSE_WITH_BANNED_WORD,
      packet: MOCK_PACKET,
      plan: PLAN,
      initialScore,
      judge,
      seed: 'test-seed-regress',
      scoreAsync,
    });

    expect(result.steps.length).toBe(1);
    expect(result.steps[0].rolled_back).toBe(true);
    // Original prose preserved on rollback
    expect(result.final_prose).toBe(PROSE_WITH_BANNED_WORD);
    expect(result.paradox_cleaned).toBe(false);
  });

  // Test 5: INV-DIFF-01 — max steps reached → stops
  it('INV-DIFF-01: max 3 steps → stops even if violations persist', async () => {
    const initialScore = makeScore({
      rejection_reason: 'paradox_gate: INV-PARADOX-01',
      composite: 0,
      composite_without_gate: 80,
    });

    // Every re-score still has paradox (cleanup doesn't fix it)
    const stillParadoxScore = makeScore({
      rejection_reason: 'paradox_gate: INV-PARADOX-01',
      composite: 0,
      composite_without_gate: 81, // slightly better, no regression
    });

    const judge = makeMockJudge(PROSE_WITH_BANNED_WORD); // cleanup returns same prose (mock)
    const scoreAsync = vi.fn().mockResolvedValue(stillParadoxScore);

    const result = await runDiffusionCleanup({
      prose: PROSE_WITH_BANNED_WORD,
      packet: MOCK_PACKET,
      plan: PLAN,
      initialScore,
      judge,
      seed: 'test-seed-max',
      scoreAsync,
    });

    // Should stop at max steps (3 by default via DIFFUSION_MAX_STEPS env)
    expect(result.nb_steps).toBeLessThanOrEqual(3);
    expect(result.paradox_cleaned).toBe(false);
    expect(result.diffusion_triggered).toBe(true);
  });
});
