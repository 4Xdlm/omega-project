import { describe, it, expect } from 'vitest';
import { createGenesisPlan } from '../src/planner.js';
import { validatePlan } from '../src/validators/plan-validator.js';
import { createDefaultConfig } from '../src/config.js';
import { verifyEvidenceChain } from '../src/evidence.js';
import {
  TIMESTAMP,
  SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_GENOME, SCENARIO_A_EMOTION,
} from './fixtures.js';
import type { GenesisPlan, Arc, Scene, Beat, SubtextLayer, Seed } from '../src/types.js';

const config = createDefaultConfig();

function makeValidBeat(sceneId: string, idx: number): Beat {
  return {
    beat_id: `BEAT-${sceneId}-${idx}`, action: 'Action', intention: 'Intent',
    pivot: false, tension_delta: 1, information_revealed: ['info'], information_withheld: [],
  };
}

function makeValidSubtext(): SubtextLayer {
  return { character_thinks: 'Thinks', reader_knows: 'Knows', tension_type: 'suspense', implied_emotion: 'fear' };
}

function makeScene(arcId: string, idx: number): Scene {
  const id = `SCN-${idx}`;
  return {
    scene_id: id, arc_id: arcId, objective: 'Obj', conflict: 'Conflict',
    conflict_type: idx % 2 === 0 ? 'internal' : 'external',
    emotion_target: 'fear', emotion_intensity: 0.5,
    seeds_planted: [], seeds_bloomed: [], subtext: makeValidSubtext(),
    sensory_anchor: 'Anchor', constraints: [],
    beats: [makeValidBeat(id, 0), makeValidBeat(id, 1)],
    target_word_count: 500, justification: 'Justified',
  };
}

function makeValidPlan(overrides?: Partial<GenesisPlan>): GenesisPlan {
  const scenes = [makeScene('ARC-1', 0), makeScene('ARC-1', 1), makeScene('ARC-1', 2)];
  return {
    plan_id: 'TEST', plan_hash: '', version: '1.0.0',
    intent_hash: 'h1', canon_hash: 'h2', constraints_hash: 'h3',
    genome_hash: 'h4', emotion_hash: 'h5',
    arcs: [{ arc_id: 'ARC-1', theme: 'test', progression: 'rising', scenes, justification: 'Main arc' }],
    seed_registry: [
      { id: 'S1', type: 'plot', description: 'd', planted_in: 'SCN-0', blooms_in: 'SCN-1' },
      { id: 'S2', type: 'character', description: 'd', planted_in: 'SCN-0', blooms_in: 'SCN-1' },
      { id: 'S3', type: 'thematic', description: 'd', planted_in: 'SCN-1', blooms_in: 'SCN-2' },
    ],
    tension_curve: [2, 4, 6],
    emotion_trajectory: [
      { position: 0, emotion: 'fear', intensity: 0.5 },
      { position: 0.5, emotion: 'fear', intensity: 0.7 },
      { position: 1.0, emotion: 'sadness', intensity: 0.6 },
    ],
    scene_count: 3, beat_count: 6, estimated_word_count: 1500,
    ...overrides,
  };
}

describe('Invariants — G-INV-01 through G-INV-10', () => {
  it('G-INV-01: should FAIL when inputs are absent', () => {
    const { report } = createGenesisPlan(
      null as unknown as typeof SCENARIO_A_INTENT,
      SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(report.verdict).toBe('FAIL');
  });

  it('G-INV-02: should FAIL when arc has no justification', () => {
    const plan = makeValidPlan({
      arcs: [{
        arc_id: 'ARC-1', theme: 'test', progression: 'rising', justification: '',
        scenes: [makeScene('ARC-1', 0), makeScene('ARC-1', 1), makeScene('ARC-1', 2)],
      }],
    });
    const result = validatePlan(plan, config, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.errors.some((e) => e.invariant === 'G-INV-02')).toBe(true);
  });

  it('G-INV-03: should FAIL when seed has no bloom (orphan seed)', () => {
    const plan = makeValidPlan({
      seed_registry: [
        { id: 'S1', type: 'plot', description: 'd', planted_in: 'SCN-0', blooms_in: 'NONEXIST' },
        { id: 'S2', type: 'character', description: 'd', planted_in: 'SCN-0', blooms_in: 'SCN-1' },
        { id: 'S3', type: 'thematic', description: 'd', planted_in: 'SCN-1', blooms_in: 'SCN-2' },
      ],
    });
    const result = validatePlan(plan, config, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.errors.some((e) => e.invariant === 'G-INV-03')).toBe(true);
  });

  it('G-INV-03: should FAIL when bloom references unknown seed (orphan bloom)', () => {
    const plan = makeValidPlan({
      seed_registry: [
        { id: 'S1', type: 'plot', description: 'd', planted_in: 'NONEXIST', blooms_in: 'SCN-1' },
        { id: 'S2', type: 'character', description: 'd', planted_in: 'SCN-0', blooms_in: 'SCN-1' },
        { id: 'S3', type: 'thematic', description: 'd', planted_in: 'SCN-1', blooms_in: 'SCN-2' },
      ],
    });
    const result = validatePlan(plan, config, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.errors.some((e) => e.invariant === 'G-INV-03')).toBe(true);
  });

  it('G-INV-04: should FAIL when tension has plateau > max', () => {
    const plan = makeValidPlan({ tension_curve: [5, 5, 5, 5] });
    const fourScenes = [0, 1, 2, 3].map((i) => makeScene('ARC-1', i));
    const result = validatePlan({
      ...plan,
      arcs: [{ arc_id: 'ARC-1', theme: 'test', progression: 'rising', scenes: fourScenes, justification: 'J' }],
      emotion_trajectory: [
        { position: 0, emotion: 'fear', intensity: 0.5 },
        { position: 0.33, emotion: 'fear', intensity: 0.6 },
        { position: 0.66, emotion: 'fear', intensity: 0.7 },
        { position: 1.0, emotion: 'sadness', intensity: 0.6 },
      ],
      scene_count: 4, beat_count: 8,
      seed_registry: [
        { id: 'S1', type: 'plot', description: 'd', planted_in: 'SCN-0', blooms_in: 'SCN-1' },
        { id: 'S2', type: 'character', description: 'd', planted_in: 'SCN-0', blooms_in: 'SCN-2' },
        { id: 'S3', type: 'thematic', description: 'd', planted_in: 'SCN-1', blooms_in: 'SCN-3' },
      ],
    }, config, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.errors.some((e) => e.invariant === 'G-INV-04')).toBe(true);
  });

  it('G-INV-04: should FAIL when tension has excessive drop', () => {
    const plan = makeValidPlan({ tension_curve: [10, 2, 5] });
    const result = validatePlan(plan, config, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.errors.some((e) => e.invariant === 'G-INV-04')).toBe(true);
  });

  it('G-INV-05: should FAIL when scene has no conflict', () => {
    const badScene = { ...makeScene('ARC-1', 0), conflict: '' };
    const plan = makeValidPlan({
      arcs: [{ arc_id: 'ARC-1', theme: 'test', progression: 'rising',
        scenes: [badScene, makeScene('ARC-1', 1), makeScene('ARC-1', 2)], justification: 'J' }],
    });
    const result = validatePlan(plan, config, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.errors.some((e) => e.invariant === 'G-INV-05')).toBe(true);
  });

  it('G-INV-06: should FAIL when emotion trajectory has gaps', () => {
    const plan = makeValidPlan({ emotion_trajectory: [{ position: 0, emotion: 'fear', intensity: 0.5 }] });
    const result = validatePlan(plan, config, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.errors.some((e) => e.invariant === 'G-INV-06')).toBe(true);
  });

  it('G-INV-07: should PASS — 2 runs produce same plan', () => {
    const { plan: p1 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    const { plan: p2 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(p1.plan_hash).toBe(p2.plan_hash);
  });

  it('G-INV-08: should FAIL when arc has no resolution (progression)', () => {
    const plan = makeValidPlan({
      arcs: [{ arc_id: 'ARC-1', theme: 'test', progression: '', justification: 'J',
        scenes: [makeScene('ARC-1', 0), makeScene('ARC-1', 1), makeScene('ARC-1', 2)] }],
    });
    const result = validatePlan(plan, config, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.errors.some((e) => e.invariant === 'G-INV-08')).toBe(true);
  });

  it('G-INV-09: should FAIL when scene has no subtext', () => {
    const noSubtext = { ...makeScene('ARC-1', 0), subtext: { character_thinks: '', reader_knows: '', tension_type: 'suspense' as const, implied_emotion: '' } };
    const plan = makeValidPlan({
      arcs: [{ arc_id: 'ARC-1', theme: 'test', progression: 'rising', justification: 'J',
        scenes: [noSubtext, makeScene('ARC-1', 1), makeScene('ARC-1', 2)] }],
    });
    const result = validatePlan(plan, config, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.errors.some((e) => e.invariant === 'G-INV-09')).toBe(true);
  });

  it('G-INV-10: should PASS — evidence chain is verifiable', () => {
    const { report } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(verifyEvidenceChain(report.evidence)).toBe(true);
  });
});
