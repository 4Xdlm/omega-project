/**
 * Minimal GenesisPlan + Scene fixtures for forge-packet-assembler tests.
 * Standard: NASA-Grade L4
 */
import type { GenesisPlan, Scene, Arc, Beat } from '@omega/genesis-planner';
import type { StyleProfile, KillLists, CanonEntry, ForgeContinuity } from '../../../src/types.js';

// ─── Beats ────────────────────────────────────────────────────────────────────
export const MINIMAL_BEATS: readonly Beat[] = [
  {
    beat_id: 'beat_001',
    action: 'Marie enters the corridor',
    intention: 'Establish location',
    pivot: false,
    tension_delta: 0,
    information_revealed: ['CANON_001'],
    information_withheld: [],
  },
  {
    beat_id: 'beat_002',
    action: 'She hears a sound',
    intention: 'Raise tension',
    pivot: true,
    tension_delta: 1,
    information_revealed: [],
    information_withheld: ['mystery_identity'],
  },
];

// ─── Scene ────────────────────────────────────────────────────────────────────
export const MINIMAL_SCENE: Scene = {
  scene_id: 'scene_001',
  arc_id: 'arc_001',
  objective: 'Establish tension and Marie entering danger zone',
  conflict: 'Marie vs unknown threat',
  conflict_type: 'external',
  emotion_target: 'fear',
  emotion_intensity: 0.7,
  seeds_planted: [],
  seeds_bloomed: [],
  subtext: {
    character_thinks: 'She suspects she is not alone',
    reader_knows: 'Someone is waiting',
    tension_type: 'suspense',
    implied_emotion: 'fear',
  },
  sensory_anchor: 'Dripping water and metallic cold',
  constraints: [],
  beats: MINIMAL_BEATS,
  target_word_count: 600,
  justification: 'Opening scene to establish atmosphere',
};

// ─── Arc ──────────────────────────────────────────────────────────────────────
export const MINIMAL_ARC: Arc = {
  arc_id: 'arc_001',
  theme: 'survival',
  progression: 'ascending tension',
  scenes: [MINIMAL_SCENE],
  justification: 'First arc — establish world threat',
};

// ─── GenesisPlan ──────────────────────────────────────────────────────────────
export const MINIMAL_GENESIS_PLAN: GenesisPlan = {
  plan_id: 'plan_test_001',
  plan_hash: 'c'.repeat(64),
  version: '1.0.0',
  intent_hash: 'd'.repeat(64),
  canon_hash: 'e'.repeat(64),
  constraints_hash: 'f'.repeat(64),
  genome_hash: '0'.repeat(64),
  emotion_hash: '1'.repeat(64),
  arcs: [MINIMAL_ARC],
  seed_registry: [],
  tension_curve: [0.3, 0.5, 0.7, 0.8, 0.6],
  emotion_trajectory: [
    { position: 0.0, emotion: 'anticipation', intensity: 0.3 },
    { position: 0.25, emotion: 'fear', intensity: 0.5 },
    { position: 0.5, emotion: 'fear', intensity: 0.8 },
    { position: 0.75, emotion: 'fear', intensity: 0.9 },
    { position: 1.0, emotion: 'sadness', intensity: 0.5 },
  ],
  scene_count: 1,
  beat_count: 2,
  estimated_word_count: 600,
};

// ─── Style Profile ─────────────────────────────────────────────────────────── 
export const MINIMAL_STYLE_PROFILE: StyleProfile = {
  version: '1.0.0',
  universe: 'contemporary_thriller',
  lexicon: {
    signature_words: ['pierre', 'ombre', 'silence', 'souffle', 'chair',
                      'métal', 'froid', 'lumière', 'bruit', 'vide'],
    forbidden_words: ['soudainement', 'mystérieusement'],
    abstraction_max_ratio: 0.20,
    concrete_min_ratio: 0.60,
  },
  rhythm: {
    avg_sentence_length_target: 18,
    gini_target: 0.45,
    max_consecutive_similar: 2,
    min_syncopes_per_scene: 2,
    min_compressions_per_scene: 1,
  },
  tone: {
    dominant_register: 'soutenu',
    intensity_range: [0.3, 0.8],
  },
  imagery: {
    recurrent_motifs: ['darkness', 'cold', 'metal'],
    density_target_per_100_words: 3,
    banned_metaphors: ['heart of stone'],
  },
};

// ─── Kill Lists ───────────────────────────────────────────────────────────────
export const MINIMAL_KILL_LISTS: KillLists = {
  banned_words: ['soudain'],
  banned_cliches: Array.from({ length: 50 }, (_, i) => `cliche_${i}`),
  banned_ai_patterns: Array.from({ length: 30 }, (_, i) => `ai_pattern_${i}`),
  banned_filter_words: Array.from({ length: 25 }, (_, i) => `filter_${i}`),
};

// ─── Canon ────────────────────────────────────────────────────────────────────
export const MINIMAL_CANON: readonly CanonEntry[] = [
  { id: 'CANON_001', statement: 'The corridor is in an abandoned factory' },
  { id: 'CANON_002', statement: 'Marie is alone' },
];

// ─── Continuity ───────────────────────────────────────────────────────────────
export const MINIMAL_CONTINUITY: ForgeContinuity = {
  previous_scene_summary: 'Marie received a mysterious message',
  character_states: [
    {
      character_id: 'char_marie',
      character_name: 'Marie',
      emotional_state: 'anxious',
      physical_state: 'standing, alert',
      location: 'corridor entrance',
    },
  ],
  open_threads: ['Who sent the message?'],
};
