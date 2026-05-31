import { describe, it, expect } from 'vitest';
import { repairProsePack } from '../src/prosepack/repair.js';
import type { ProsePack, ProsePackScene } from '../src/prosepack/types.js';
import type { ScribeProvider } from '../src/providers/types.js';
import type { GenesisPlan } from '../src/types.js';

// Provider qui echoue s'il est appele -> prouve que le chemin "scene propre" ne regenere pas.
const throwingProvider: ScribeProvider = {
  mode: 'mock',
  generateSceneProse: () => {
    throw new Error('provider must NOT be called when no scene needs repair');
  },
};

const cleanScene: ProsePackScene = {
  scene_id: 'S1',
  arc_id: 'A1',
  paragraphs: ['Une phrase propre.', 'Une autre phrase.'],
  word_count: 6,
  sentence_count: 2,
  target_word_count: 6,
  pov_detected: 'third-limited',
  tense_detected: 'past',
  sensory_anchor_count: 1,
  dialogue_ratio: 0,
  banned_word_hits: [],
  cliche_hits: [],
  violations: [], // AUCUNE violation -> aucune reparation
};

const cleanPack: ProsePack = {
  meta: {
    version: '1.0.0', run_id: 'r1', plan_id: 'p1', plan_hash: 'h', skeleton_hash: 'sk',
    prose_hash: 'pr', model: 'mock', provider_mode: 'mock', temperature: 0, created_utc: '2026-01-01T00:00:00.000Z',
  },
  constraints: {
    pov: 'third-limited', tense: 'past', min_scenes: 1, max_scenes: 10,
    banned_words: [], forbidden_cliches: [], max_dialogue_ratio: 0.5,
    min_sensory_anchors_per_scene: 0, word_count_tolerance: 0.3,
  },
  scenes: [cleanScene],
  score: {
    schema_ok: true, constraint_satisfaction: 1, hard_pass: true, soft_pass: true,
    total_violations: 0, hard_violations: 0, soft_violations: 0,
  },
  total_words: 6, total_sentences: 2, total_paragraphs: 2,
};

const minimalPlan: GenesisPlan = {
  plan_id: 'p1', plan_hash: 'h', version: '1.0.0', intent_hash: '', canon_hash: '',
  constraints_hash: '', genome_hash: '', emotion_hash: '', arcs: [], seed_registry: [],
  tension_curve: [], emotion_trajectory: [], scene_count: 1, beat_count: 0, estimated_word_count: 6,
};

describe('repairProsePack -- chemin no-op (scene propre)', () => {
  it('ne regenere pas et preserve un ProsePack sans violation', () => {
    const { repairedPack, report } = repairProsePack(cleanPack, minimalPlan, throwingProvider, 'seed-1');
    expect(repairedPack.scenes).toHaveLength(1);
    expect(repairedPack.scenes[0].scene_id).toBe('S1');
    expect(repairedPack.scenes[0]).toEqual(cleanScene); // inchangee
    expect(report.total_scenes).toBe(1);
  });

  it('est deterministe (meme entree -> meme sortie)', () => {
    const a = repairProsePack(cleanPack, minimalPlan, throwingProvider, 'seed-1');
    const b = repairProsePack(cleanPack, minimalPlan, throwingProvider, 'seed-1');
    expect(a.repairedPack).toEqual(b.repairedPack);
  });
});