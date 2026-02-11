/**
 * OMEGA Metrics — Semantic Metrics Tests (M1-M5)
 * Phase R-METRICS — Gate 4
 */

import { describe, it, expect } from 'vitest';
import {
  intentThemeCoverage,
  themeFidelity,
  canonRespect,
  emotionTrajectoryAlignment,
  constraintSatisfaction,
  computeSemanticMetrics,
} from '../src/metrics/semantic.js';
import type { GenesisPlan, IntentPack, Arc, Scene, Beat } from '../src/types.js';

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeBeat(id: string, action = 'Test action'): Beat {
  return {
    beat_id: id, action, intention: 'Test', pivot: false, tension_delta: 0,
    information_revealed: [], information_withheld: [],
  };
}

function makeScene(id: string, arcId: string, overrides: Partial<Scene> = {}): Scene {
  return {
    scene_id: id, arc_id: arcId, objective: 'Test objective', conflict: 'Test conflict',
    conflict_type: 'internal', emotion_target: 'fear', emotion_intensity: 0.5,
    beats: [makeBeat(`${id}-B1`), makeBeat(`${id}-B2`)],
    target_word_count: 800, sensory_anchor: 'Salt air',
    subtext: { character_thinks: 'Thought', implied_emotion: 'Hidden', reader_knows: 'Info', tension_type: 'suspense' },
    seeds_planted: [], seeds_bloomed: [], justification: 'Test',
    ...overrides,
  };
}

function makePlan(arcs: { id: string; theme: string; progression: string; scenes?: Partial<Scene>[] }[], overrides: Partial<GenesisPlan> = {}): GenesisPlan {
  const fullArcs: Arc[] = arcs.map(a => ({
    arc_id: a.id, theme: a.theme, progression: a.progression, justification: 'Test',
    scenes: (a.scenes || [{ }]).map((s, i) => makeScene(`${a.id}-S${i}`, a.id, s)),
  }));
  const allScenes = fullArcs.flatMap(a => a.scenes);
  return {
    plan_id: 'GPLAN-test', arcs: fullArcs, scene_count: allScenes.length,
    beat_count: allScenes.reduce((s, sc) => s + sc.beats.length, 0),
    seed_registry: [], tension_curve: [1, 3, 5],
    emotion_trajectory: allScenes.map((s, i) => ({
      emotion: s.emotion_target, intensity: s.emotion_intensity,
      position: i / Math.max(allScenes.length - 1, 1),
    })),
    estimated_word_count: 5000, version: '1.0.0',
    ...overrides,
  };
}

function makeIntent(overrides: Partial<IntentPack> = {}): IntentPack {
  return {
    intent: { title: 'Test', premise: 'Test premise', themes: ['isolation', 'duty'], core_emotion: 'fear', target_word_count: 5000 },
    canon: { entries: [
      { id: 'CANON-001', type: 'fact', statement: 'The lighthouse is on a remote island', immutable: true },
      { id: 'CANON-002', type: 'fact', statement: 'Keeper Elias has been alone for 3 years', immutable: true },
    ]},
    constraints: { min_scenes: 3, max_scenes: 15, pov: 'third', tense: 'past', banned_words: ['zombie', 'vampire'] },
    emotion: { core_emotion: 'fear', resolution_emotion: 'sadness', waypoints: [
      { position: 0.0, emotion: 'trust', intensity: 0.3 },
      { position: 0.5, emotion: 'fear', intensity: 0.6 },
    ]},
    genome: { style_seed: 'test-seed' },
    ...overrides,
  };
}

// ─── M1: intent_theme_coverage ──────────────────────────────────────────────

describe('M1 — intent_theme_coverage', () => {
  it('returns 1.0 when all themes are covered', () => {
    const plan = makePlan([
      { id: 'ARC-001', theme: 'isolation and routine', progression: 'Test' },
      { id: 'ARC-002', theme: 'duty versus terror', progression: 'Test' },
    ]);
    const intent = makeIntent();
    expect(intentThemeCoverage(plan, intent)).toBe(1.0);
  });

  it('returns 0.5 when one of two themes is missing', () => {
    const plan = makePlan([
      { id: 'ARC-001', theme: 'isolation and routine', progression: 'Test' },
    ]);
    const intent = makeIntent();
    expect(intentThemeCoverage(plan, intent)).toBe(0.5);
  });

  it('returns 0 when no themes match', () => {
    const plan = makePlan([
      { id: 'ARC-001', theme: 'romance', progression: 'Test' },
    ]);
    const intent = makeIntent();
    expect(intentThemeCoverage(plan, intent)).toBe(0);
  });

  it('returns 1.0 for empty themes list', () => {
    const plan = makePlan([{ id: 'ARC-001', theme: 'test', progression: 'Test' }]);
    const intent = makeIntent({ intent: { title: 'T', premise: 'P', themes: [], core_emotion: 'fear', target_word_count: 5000 } });
    expect(intentThemeCoverage(plan, intent)).toBe(1.0);
  });
});

// ─── M2: theme_fidelity ─────────────────────────────────────────────────────

describe('M2 — theme_fidelity', () => {
  it('returns > 0 for matching tokens', () => {
    const plan = makePlan([
      { id: 'ARC-001', theme: 'isolation and loneliness', progression: 'duty to the lighthouse' },
    ]);
    const intent = makeIntent();
    const score = themeFidelity(plan, intent);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it('returns 0 for completely different tokens', () => {
    const plan = makePlan([
      { id: 'ARC-001', theme: 'romance flowers gardens', progression: 'cooking pasta dinner' },
    ]);
    const intent = makeIntent();
    expect(themeFidelity(plan, intent)).toBe(0);
  });
});

// ─── M3: canon_respect ──────────────────────────────────────────────────────

describe('M3 — canon_respect', () => {
  it('returns score 1.0 with 0 violations for clean plan', () => {
    const plan = makePlan([
      { id: 'ARC-001', theme: 'test', progression: 'The lighthouse stands proud' },
    ]);
    const intent = makeIntent();
    const result = canonRespect(plan, intent);
    expect(result.score).toBe(1.0);
    expect(result.violation_count).toBe(0);
  });

  it('detects negation violation', () => {
    const plan = makePlan([
      { id: 'ARC-001', theme: 'test', progression: 'This is not a remote island at all',
        scenes: [{ objective: 'Elias was never alone' }] },
    ]);
    const intent = makeIntent();
    const result = canonRespect(plan, intent);
    expect(result.violation_count).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1.0);
  });

  it('returns 1.0 for empty canon', () => {
    const plan = makePlan([{ id: 'ARC-001', theme: 'test', progression: 'test' }]);
    const intent = makeIntent({ canon: { entries: [] } });
    const result = canonRespect(plan, intent);
    expect(result.score).toBe(1.0);
  });
});

// ─── M4: emotion_trajectory_alignment ───────────────────────────────────────

describe('M4 — emotion_trajectory_alignment', () => {
  it('returns high score when resolution matches', () => {
    const plan = makePlan(
      [{ id: 'ARC-001', theme: 'test', progression: 'test',
         scenes: [{ emotion_target: 'trust' }, { emotion_target: 'fear' }, { emotion_target: 'sadness' }] }],
      { emotion_trajectory: [
        { emotion: 'trust', intensity: 0.3, position: 0 },
        { emotion: 'fear', intensity: 0.6, position: 0.5 },
        { emotion: 'sadness', intensity: 0.7, position: 1.0 },
      ]},
    );
    const intent = makeIntent();
    const score = emotionTrajectoryAlignment(plan, intent);
    // Resolution sadness matches ✓ (+0.4)
    // Waypoint trust@0.0 matches ✓, fear@0.5 matches ✓ (+0.6)
    expect(score).toBeGreaterThanOrEqual(0.8);
  });

  it('returns lower score when resolution does not match', () => {
    const plan = makePlan(
      [{ id: 'ARC-001', theme: 'test', progression: 'test' }],
      { emotion_trajectory: [
        { emotion: 'joy', intensity: 0.9, position: 1.0 },
      ]},
    );
    const intent = makeIntent(); // resolution_emotion = 'sadness'
    const score = emotionTrajectoryAlignment(plan, intent);
    expect(score).toBeLessThan(1.0);
  });

  it('returns 0 for empty trajectory', () => {
    const plan = makePlan(
      [{ id: 'ARC-001', theme: 'test', progression: 'test' }],
      { emotion_trajectory: [] },
    );
    const intent = makeIntent();
    expect(emotionTrajectoryAlignment(plan, intent)).toBe(0);
  });
});

// ─── M5: constraint_satisfaction ────────────────────────────────────────────

describe('M5 — constraint_satisfaction', () => {
  it('returns 1.0 when all constraints met', () => {
    const plan = makePlan([
      { id: 'ARC-001', theme: 'test', progression: 'test',
        scenes: [{}, {}, {}, {}, {}] }, // 5 scenes in [3, 15]
    ]);
    const intent = makeIntent();
    expect(constraintSatisfaction(plan, intent)).toBe(1.0);
  });

  it('penalizes scene count out of range', () => {
    const plan = makePlan(
      [{ id: 'ARC-001', theme: 'test', progression: 'test', scenes: [{}] }], // 1 scene < 3
    );
    const intent = makeIntent();
    const score = constraintSatisfaction(plan, intent);
    expect(score).toBeLessThan(1.0);
  });

  it('detects banned words in beat actions', () => {
    const plan = makePlan([
      { id: 'ARC-001', theme: 'test', progression: 'test',
        scenes: [{ }, { }, { }] },
    ]);
    // Override beats to include banned word
    (plan.arcs[0].scenes[0] as any).beats = [makeBeat('B1', 'A zombie appeared from the shadows')];
    const intent = makeIntent();
    const score = constraintSatisfaction(plan, intent);
    expect(score).toBeLessThan(1.0);
  });
});

// ─── computeSemanticMetrics ─────────────────────────────────────────────────

describe('computeSemanticMetrics', () => {
  it('returns all 6 fields', () => {
    const plan = makePlan([{ id: 'ARC-001', theme: 'isolation', progression: 'duty' }]);
    const intent = makeIntent();
    const metrics = computeSemanticMetrics(plan, intent);
    expect(metrics).toHaveProperty('intent_theme_coverage');
    expect(metrics).toHaveProperty('theme_fidelity');
    expect(metrics).toHaveProperty('canon_respect');
    expect(metrics).toHaveProperty('canon_violation_count');
    expect(metrics).toHaveProperty('emotion_trajectory_alignment');
    expect(metrics).toHaveProperty('constraint_satisfaction');
  });

  it('all scores are in [0, 1]', () => {
    const plan = makePlan([{ id: 'ARC-001', theme: 'isolation', progression: 'duty' }]);
    const intent = makeIntent();
    const metrics = computeSemanticMetrics(plan, intent);
    expect(metrics.intent_theme_coverage).toBeGreaterThanOrEqual(0);
    expect(metrics.intent_theme_coverage).toBeLessThanOrEqual(1);
    expect(metrics.canon_respect).toBeGreaterThanOrEqual(0);
    expect(metrics.canon_respect).toBeLessThanOrEqual(1);
    expect(metrics.canon_violation_count).toBeGreaterThanOrEqual(0);
  });
});
