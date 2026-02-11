/**
 * OMEGA Metrics — Structural Metrics Tests (S1-S8)
 * Phase R-METRICS — Gate 3
 */

import { describe, it, expect } from 'vitest';
import {
  arcCompleteness,
  sceneCompleteness,
  beatCoverage,
  seedIntegrity,
  tensionMonotonicity,
  conflictDiversity,
  causalDepth,
  structuralEntropy,
  computeStructuralMetrics,
} from '../src/metrics/structural.js';
import type { GenesisPlan, MetricConfig, Arc, Scene, Beat, Seed } from '../src/types.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: MetricConfig = {
  MIN_BEATS_PER_SCENE: 2,
  MAX_BEATS_PER_SCENE: 12,
  SEED_BLOOM_MAX_DISTANCE: 0.7,
  MAX_TENSION_PLATEAU: 3,
  MAX_TENSION_DROP: 3,
  MIN_CONFLICT_TYPES: 2,
};

function makeBeat(id: string): Beat {
  return {
    beat_id: id,
    action: 'Test action',
    intention: 'Test intention',
    pivot: false,
    tension_delta: 0,
    information_revealed: ['info'],
    information_withheld: ['hidden'],
  };
}

function makeScene(id: string, arcId: string, overrides: Partial<Scene> = {}): Scene {
  return {
    scene_id: id,
    arc_id: arcId,
    objective: 'Test objective',
    conflict: 'Test conflict',
    conflict_type: 'internal',
    emotion_target: 'fear',
    emotion_intensity: 0.5,
    beats: [makeBeat(`${id}-B1`), makeBeat(`${id}-B2`), makeBeat(`${id}-B3`)],
    target_word_count: 800,
    sensory_anchor: 'The smell of rain',
    subtext: {
      character_thinks: 'Deep thought',
      implied_emotion: 'Hidden sadness',
      reader_knows: 'Background info',
      tension_type: 'suspense',
    },
    seeds_planted: [],
    seeds_bloomed: [],
    justification: 'Test justification',
    ...overrides,
  };
}

function makeArc(id: string, scenes: Scene[], overrides: Partial<Arc> = {}): Arc {
  return {
    arc_id: id,
    theme: 'Test theme',
    progression: 'Test progression',
    justification: 'Test justification',
    scenes,
    ...overrides,
  };
}

function makePlan(arcs: Arc[], overrides: Partial<GenesisPlan> = {}): GenesisPlan {
  const allScenes: Scene[] = [];
  for (const arc of arcs) allScenes.push(...arc.scenes);
  const totalBeats = allScenes.reduce((sum, s) => sum + s.beats.length, 0);

  return {
    plan_id: 'GPLAN-test',
    arcs,
    scene_count: allScenes.length,
    beat_count: totalBeats,
    seed_registry: [],
    tension_curve: [1, 3, 5, 7, 9],
    emotion_trajectory: allScenes.map((s, i) => ({
      emotion: s.emotion_target,
      intensity: s.emotion_intensity,
      position: i / Math.max(allScenes.length - 1, 1),
    })),
    estimated_word_count: allScenes.reduce((sum, s) => sum + s.target_word_count, 0),
    version: '1.0.0',
    ...overrides,
  };
}

// ─── S1: arc_completeness ───────────────────────────────────────────────────

describe('S1 — arc_completeness', () => {
  it('returns 1.0 for fully complete arcs', () => {
    const plan = makePlan([
      makeArc('ARC-001', [makeScene('S1', 'ARC-001')]),
      makeArc('ARC-002', [makeScene('S2', 'ARC-002')]),
    ]);
    expect(arcCompleteness(plan)).toBe(1.0);
  });

  it('returns 0.5 when one of two arcs is incomplete', () => {
    const plan = makePlan([
      makeArc('ARC-001', [makeScene('S1', 'ARC-001')]),
      makeArc('ARC-002', [makeScene('S2', 'ARC-002')], { theme: '' }),
    ]);
    expect(arcCompleteness(plan)).toBe(0.5);
  });

  it('returns 0 for arcs with no scenes', () => {
    const plan = makePlan([
      makeArc('ARC-001', [], { scenes: [] as unknown as readonly Scene[] }),
    ]);
    expect(arcCompleteness(plan)).toBe(0);
  });

  it('returns 0 for empty plan', () => {
    const plan = makePlan([]);
    expect(arcCompleteness(plan)).toBe(0);
  });
});

// ─── S2: scene_completeness ─────────────────────────────────────────────────

describe('S2 — scene_completeness', () => {
  it('returns 1.0 for fully complete scenes', () => {
    const plan = makePlan([
      makeArc('ARC-001', [makeScene('S1', 'ARC-001'), makeScene('S2', 'ARC-001')]),
    ]);
    expect(sceneCompleteness(plan)).toBe(1.0);
  });

  it('penalizes scenes with __pending__ subtext', () => {
    const plan = makePlan([
      makeArc('ARC-001', [
        makeScene('S1', 'ARC-001'),
        makeScene('S2', 'ARC-001', {
          subtext: {
            character_thinks: '__pending__',
            implied_emotion: '__pending__',
            reader_knows: 'info',
            tension_type: 'suspense',
          },
        }),
      ]),
    ]);
    expect(sceneCompleteness(plan)).toBe(0.5);
  });

  it('penalizes scenes with missing objective', () => {
    const plan = makePlan([
      makeArc('ARC-001', [makeScene('S1', 'ARC-001', { objective: '' })]),
    ]);
    expect(sceneCompleteness(plan)).toBe(0);
  });

  it('returns 0 for empty plan', () => {
    const plan = makePlan([]);
    expect(sceneCompleteness(plan)).toBe(0);
  });
});

// ─── S3: beat_coverage ──────────────────────────────────────────────────────

describe('S3 — beat_coverage', () => {
  it('returns 1.0 when all scenes have beats in range', () => {
    const plan = makePlan([
      makeArc('ARC-001', [
        makeScene('S1', 'ARC-001'), // 3 beats, in [2,12]
        makeScene('S2', 'ARC-001'), // 3 beats, in [2,12]
      ]),
    ]);
    expect(beatCoverage(plan, DEFAULT_CONFIG)).toBe(1.0);
  });

  it('penalizes scenes with too few beats', () => {
    const plan = makePlan([
      makeArc('ARC-001', [
        makeScene('S1', 'ARC-001'), // 3 beats
        makeScene('S2', 'ARC-001', { beats: [makeBeat('B1')] }), // 1 beat < 2
      ]),
    ]);
    expect(beatCoverage(plan, DEFAULT_CONFIG)).toBe(0.5);
  });

  it('penalizes scenes with too many beats', () => {
    const beats = Array.from({ length: 15 }, (_, i) => makeBeat(`B${i}`));
    const plan = makePlan([
      makeArc('ARC-001', [makeScene('S1', 'ARC-001', { beats })]),
    ]);
    expect(beatCoverage(plan, DEFAULT_CONFIG)).toBe(0);
  });

  it('returns 0 for empty plan', () => {
    const plan = makePlan([]);
    expect(beatCoverage(plan, DEFAULT_CONFIG)).toBe(0);
  });
});

// ─── S4: seed_integrity ─────────────────────────────────────────────────────

describe('S4 — seed_integrity', () => {
  it('returns 1.0 for valid seeds', () => {
    const seeds: Seed[] = [
      { id: 'SEED-001', type: 'plot', planted_in: 'S1', blooms_in: 'S2', description: 'test' },
    ];
    const plan = makePlan(
      [makeArc('ARC-001', [makeScene('S1', 'ARC-001'), makeScene('S2', 'ARC-001'), makeScene('S3', 'ARC-001')])],
      { seed_registry: seeds },
    );
    expect(seedIntegrity(plan, DEFAULT_CONFIG)).toBe(1.0);
  });

  it('returns 0 for seeds referencing nonexistent scenes', () => {
    const seeds: Seed[] = [
      { id: 'SEED-001', type: 'plot', planted_in: 'NOPE', blooms_in: 'NADA', description: 'test' },
    ];
    const plan = makePlan(
      [makeArc('ARC-001', [makeScene('S1', 'ARC-001')])],
      { seed_registry: seeds },
    );
    expect(seedIntegrity(plan, DEFAULT_CONFIG)).toBe(0);
  });

  it('returns 0 for seeds where bloom is before plant', () => {
    const seeds: Seed[] = [
      { id: 'SEED-001', type: 'plot', planted_in: 'S2', blooms_in: 'S1', description: 'test' },
    ];
    const plan = makePlan(
      [makeArc('ARC-001', [makeScene('S1', 'ARC-001'), makeScene('S2', 'ARC-001')])],
      { seed_registry: seeds },
    );
    expect(seedIntegrity(plan, DEFAULT_CONFIG)).toBe(0);
  });

  it('returns 0 for empty seed registry', () => {
    const plan = makePlan([makeArc('ARC-001', [makeScene('S1', 'ARC-001')])]);
    expect(seedIntegrity(plan, DEFAULT_CONFIG)).toBe(0);
  });
});

// ─── S5: tension_monotonicity ───────────────────────────────────────────────

describe('S5 — tension_monotonicity', () => {
  it('returns 1.0 for perfect ascending curve', () => {
    const plan = makePlan(
      [makeArc('ARC-001', [makeScene('S1', 'ARC-001')])],
      { tension_curve: [1, 3, 5, 7, 9] },
    );
    expect(tensionMonotonicity(plan, DEFAULT_CONFIG)).toBe(1.0);
  });

  it('returns 0.67 when one condition fails (descending)', () => {
    const plan = makePlan(
      [makeArc('ARC-001', [makeScene('S1', 'ARC-001')])],
      { tension_curve: [9, 7, 5, 3, 1] }, // descending: fails condition 3
    );
    // No plateau > 3 ✓, no drop > 3 (each drop is 2) ✓, not ascending ✗
    const score = tensionMonotonicity(plan, DEFAULT_CONFIG);
    expect(score).toBeCloseTo(0.667, 2);
  });

  it('returns 0 for flat curve', () => {
    const plan = makePlan(
      [makeArc('ARC-001', [makeScene('S1', 'ARC-001')])],
      { tension_curve: [5, 5, 5, 5, 5] }, // plateau 4 > 3, not ascending
    );
    // Plateau 4 > 3 ✗, no drop ✓, not ascending ✗ → 1/3
    const score = tensionMonotonicity(plan, DEFAULT_CONFIG);
    expect(score).toBeCloseTo(0.333, 2);
  });

  it('returns 0 for empty curve', () => {
    const plan = makePlan(
      [makeArc('ARC-001', [makeScene('S1', 'ARC-001')])],
      { tension_curve: [] },
    );
    expect(tensionMonotonicity(plan, DEFAULT_CONFIG)).toBe(0);
  });
});

// ─── S6: conflict_diversity ─────────────────────────────────────────────────

describe('S6 — conflict_diversity', () => {
  it('returns 1.0 for ≥ MIN_CONFLICT_TYPES unique types', () => {
    const plan = makePlan([
      makeArc('ARC-001', [
        makeScene('S1', 'ARC-001', { conflict_type: 'internal' }),
        makeScene('S2', 'ARC-001', { conflict_type: 'external' }),
        makeScene('S3', 'ARC-001', { conflict_type: 'existential' }),
      ]),
    ]);
    expect(conflictDiversity(plan, DEFAULT_CONFIG)).toBe(1.0);
  });

  it('returns 0.5 for only 1 type (min is 2)', () => {
    const plan = makePlan([
      makeArc('ARC-001', [
        makeScene('S1', 'ARC-001', { conflict_type: 'internal' }),
        makeScene('S2', 'ARC-001', { conflict_type: 'internal' }),
      ]),
    ]);
    expect(conflictDiversity(plan, DEFAULT_CONFIG)).toBe(0.5);
  });
});

// ─── S7: causal_depth ───────────────────────────────────────────────────────

describe('S7 — causal_depth', () => {
  it('returns positive score for plan with sequential scenes', () => {
    const plan = makePlan([
      makeArc('ARC-001', [
        makeScene('S1', 'ARC-001'),
        makeScene('S2', 'ARC-001'),
        makeScene('S3', 'ARC-001'),
      ]),
    ]);
    expect(causalDepth(plan)).toBeGreaterThan(0);
    expect(causalDepth(plan)).toBeLessThanOrEqual(1.0);
  });

  it('returns 1.0 for fully connected plan', () => {
    const plan = makePlan([
      makeArc('ARC-001', [
        makeScene('S1', 'ARC-001'),
        makeScene('S2', 'ARC-001'),
        makeScene('S3', 'ARC-001'),
      ]),
    ]);
    // 3 scenes, longest path = 3 → 3/3 = 1.0
    expect(causalDepth(plan)).toBe(1.0);
  });

  it('returns 0 for empty plan', () => {
    const plan = makePlan([]);
    expect(causalDepth(plan)).toBe(0);
  });
});

// ─── S8: structural_entropy ─────────────────────────────────────────────────

describe('S8 — structural_entropy', () => {
  it('returns > 0 for diverse conflict types', () => {
    const plan = makePlan([
      makeArc('ARC-001', [
        makeScene('S1', 'ARC-001', { conflict_type: 'internal' }),
        makeScene('S2', 'ARC-001', { conflict_type: 'external' }),
        makeScene('S3', 'ARC-001', { conflict_type: 'existential' }),
      ]),
    ]);
    const entropy = structuralEntropy(plan);
    expect(entropy).toBeGreaterThan(0);
    expect(entropy).toBeLessThanOrEqual(1.0);
  });

  it('returns 0 for single conflict type', () => {
    const plan = makePlan([
      makeArc('ARC-001', [
        makeScene('S1', 'ARC-001', { conflict_type: 'internal' }),
        makeScene('S2', 'ARC-001', { conflict_type: 'internal' }),
      ]),
    ]);
    expect(structuralEntropy(plan)).toBe(0);
  });

  it('returns 0 for empty plan', () => {
    const plan = makePlan([]);
    expect(structuralEntropy(plan)).toBe(0);
  });
});

// ─── computeStructuralMetrics (aggregate) ───────────────────────────────────

describe('computeStructuralMetrics', () => {
  it('returns all 8 metrics', () => {
    const plan = makePlan([
      makeArc('ARC-001', [makeScene('S1', 'ARC-001'), makeScene('S2', 'ARC-001')]),
    ]);
    const metrics = computeStructuralMetrics(plan, DEFAULT_CONFIG);
    expect(Object.keys(metrics)).toHaveLength(8);
    expect(metrics.arc_completeness).toBeDefined();
    expect(metrics.scene_completeness).toBeDefined();
    expect(metrics.beat_coverage).toBeDefined();
    expect(metrics.seed_integrity).toBeDefined();
    expect(metrics.tension_monotonicity).toBeDefined();
    expect(metrics.conflict_diversity).toBeDefined();
    expect(metrics.causal_depth).toBeDefined();
    expect(metrics.structural_entropy).toBeDefined();
  });

  it('all metrics are in [0, 1]', () => {
    const plan = makePlan([
      makeArc('ARC-001', [makeScene('S1', 'ARC-001')]),
    ]);
    const metrics = computeStructuralMetrics(plan, DEFAULT_CONFIG);
    for (const [key, value] of Object.entries(metrics)) {
      expect(value, `${key} should be >= 0`).toBeGreaterThanOrEqual(0);
      expect(value, `${key} should be <= 1`).toBeLessThanOrEqual(1);
    }
  });
});
