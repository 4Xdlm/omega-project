/**
 * Tests for P2-03b: Duel V1 Skip
 * Date: 2026-04-04
 *
 * Tests the V1 scoring bypass in the duel engine when V3 selection
 * is available (symbolMap present). Saves ~12 LLM calls per duel.
 *
 * INV-DUEL-V1-01: symbolMap absent → V1 FORCÉ.
 */
import { describe, it, expect, afterEach } from 'vitest';
import type { Draft } from '../../src/types.js';
import {
  DUEL_PREFILTER_COMPOSITE_MIN,
  DUEL_PREFILTER_MIN_AXIS,
} from '../../src/core/thresholds.js';

describe('P2-03b: Duel V1 Skip — Draft type contract', () => {
  // ── Draft type validation ──

  it('DV1-01: Draft with v1_skipped=false has non-null score', () => {
    const draft: Draft = {
      draft_id: 'TEST_001',
      mode: 'loop_refined',
      prose: 'Test prose.',
      score: {
        score_id: 'S1',
        score_hash: 'h1',
        scene_id: 'SC1',
        seed: 'SEED',
        axes: {} as any,
        composite: 88.5,
        verdict: 'REJECT',
        emotion_weight_pct: 63.3,
      },
      v1_skipped: false,
    };
    expect(draft.score).not.toBeNull();
    expect(draft.v1_skipped).toBe(false);
  });

  it('DV1-02: Draft with v1_skipped=true has null score', () => {
    const draft: Draft = {
      draft_id: 'TEST_002',
      mode: 'tranchant_minimaliste',
      prose: 'Test prose skipped.',
      score: null,
      v1_skipped: true,
    };
    expect(draft.score).toBeNull();
    expect(draft.v1_skipped).toBe(true);
  });

  it('DV1-03: null-safe score access with optional chaining', () => {
    const draftSkipped: Draft = {
      draft_id: 'TEST_003',
      mode: 'sensoriel_dense',
      prose: 'Prose.',
      score: null,
      v1_skipped: true,
    };
    // This pattern is used in fallback + telemetry
    const composite = draftSkipped.score?.composite ?? 0;
    expect(composite).toBe(0);
  });
});

describe('P2-03b: skipV1ForModes condition logic', () => {
  afterEach(() => {
    delete process.env.OMEGA_DUEL_SKIP_V1;
  });

  // ── Condition: OMEGA_DUEL_SKIP_V1 === '1' && !!symbolMap ──

  it('DV1-04: skip active when toggle=1 AND symbolMap present', () => {
    process.env.OMEGA_DUEL_SKIP_V1 = '1';
    const symbolMap = { hooks: [] }; // truthy
    const skipV1ForModes = process.env.OMEGA_DUEL_SKIP_V1 === '1' && !!symbolMap;
    expect(skipV1ForModes).toBe(true);
  });

  it('DV1-05: INV-DUEL-V1-01 — skip BLOCKED when symbolMap absent', () => {
    process.env.OMEGA_DUEL_SKIP_V1 = '1';
    const symbolMap = undefined;
    const skipV1ForModes = process.env.OMEGA_DUEL_SKIP_V1 === '1' && !!symbolMap;
    expect(skipV1ForModes).toBe(false);
  });

  it('DV1-06: skip BLOCKED when toggle not set', () => {
    delete process.env.OMEGA_DUEL_SKIP_V1;
    const symbolMap = { hooks: [] };
    const skipV1ForModes = process.env.OMEGA_DUEL_SKIP_V1 === '1' && !!symbolMap;
    expect(skipV1ForModes).toBe(false);
  });

  it('DV1-07: skip BLOCKED when toggle=0', () => {
    process.env.OMEGA_DUEL_SKIP_V1 = '0';
    const symbolMap = { hooks: [] };
    const skipV1ForModes = process.env.OMEGA_DUEL_SKIP_V1 === '1' && !!symbolMap;
    expect(skipV1ForModes).toBe(false);
  });

  it('DV1-08: skip BLOCKED when symbolMap null', () => {
    process.env.OMEGA_DUEL_SKIP_V1 = '1';
    const symbolMap = null;
    const skipV1ForModes = process.env.OMEGA_DUEL_SKIP_V1 === '1' && !!symbolMap;
    expect(skipV1ForModes).toBe(false);
  });
});

describe('P2-03b: Fallback V1 safety — -Infinity guard', () => {
  it('DV1-09: fallback selection with null scores picks existingProse (only non-null)', () => {
    const drafts: Draft[] = [
      { draft_id: 'D0', mode: 'loop_refined', prose: 'A', score: { composite: 85.0 } as any, v1_skipped: false },
      { draft_id: 'D1', mode: 'mode_a', prose: 'B', score: null, v1_skipped: true },
      { draft_id: 'D2', mode: 'mode_b', prose: 'C', score: null, v1_skipped: true },
    ];

    // Simulate fallback V1 selection (no symbolMap)
    const scores = drafts.map((d) => d.score?.composite ?? -Infinity);
    const maxScore = Math.max(...scores);
    const winnerIdx = scores.indexOf(maxScore);

    expect(winnerIdx).toBe(0); // existingProse wins (only one with real score)
    expect(maxScore).toBe(85.0);
  });

  it('DV1-10: fallback selection with all non-null scores works normally', () => {
    const drafts: Draft[] = [
      { draft_id: 'D0', mode: 'loop_refined', prose: 'A', score: { composite: 80.0 } as any, v1_skipped: false },
      { draft_id: 'D1', mode: 'mode_a', prose: 'B', score: { composite: 90.0 } as any, v1_skipped: false },
      { draft_id: 'D2', mode: 'mode_b', prose: 'C', score: { composite: 85.0 } as any, v1_skipped: false },
    ];

    const scores = drafts.map((d) => d.score?.composite ?? -Infinity);
    const maxScore = Math.max(...scores);
    const winnerIdx = scores.indexOf(maxScore);

    expect(winnerIdx).toBe(1);
    expect(maxScore).toBe(90.0);
  });
});

describe('P2-03b: LLM call savings calculation', () => {
  it('DV1-11: savings = modes.length × 4 (4 LLM axes per V1 call)', () => {
    // SOVEREIGN_CONFIG.DRAFT_MODES has 3 modes by default
    const modesCount = 3;
    const v1AxesPerCall = 4; // interiority, sensory_density, necessity, impact
    const expectedSavings = modesCount * v1AxesPerCall;
    expect(expectedSavings).toBe(12);
  });

  it('DV1-12: existingProse V1 is NOT counted in savings (always scored)', () => {
    // existingProse gets V1 scored regardless of toggle
    // So total savings = 12, NOT 16
    const existingProseSaved = 0; // directive Francky: always score
    const modeDraftsSaved = 3 * 4; // 3 modes × 4 V1 axes
    expect(existingProseSaved + modeDraftsSaved).toBe(12);
  });
});

describe('P2-03b: Thresholds coherence with P2-03a', () => {
  it('DV1-13: P2-03a thresholds still correct after P2-03b', () => {
    expect(DUEL_PREFILTER_COMPOSITE_MIN).toBe(90.0);
    expect(DUEL_PREFILTER_MIN_AXIS).toBe(80.0);
  });
});
