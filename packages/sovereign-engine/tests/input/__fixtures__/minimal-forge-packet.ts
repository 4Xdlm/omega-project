/**
 * Minimal valid ForgePacket fixture for Sprint S0-A tests.
 * All 14D distributions sum to 1.0 (required by validateForge14D).
 * FORGE_14 keys: joy, trust, fear, surprise, sadness, disgust,
 *               anger, anticipation, love, submission, awe, disapproval, remorse, contempt
 */
import type { ForgePacket } from '../../../src/types.js';

// Uniform 14D distribution (1/14 each) — valid, sums to 1.0
export const UNIFORM_14D: Record<string, number> = {
  joy: 1/14, trust: 1/14, fear: 1/14, surprise: 1/14,
  sadness: 1/14, disgust: 1/14, anger: 1/14, anticipation: 1/14,
  love: 1/14, submission: 1/14, awe: 1/14, disapproval: 1/14,
  remorse: 1/14, contempt: 1/14,
};

// Fear-dominant 14D (fear=0.50, rest=0.50/13)
export const FEAR_DOMINANT_14D: Record<string, number> = (() => {
  const rest = 0.50 / 13;
  return {
    joy: rest, trust: rest, fear: 0.50, surprise: rest,
    sadness: rest, disgust: rest, anger: rest, anticipation: rest,
    love: rest, submission: rest, awe: rest, disapproval: rest,
    remorse: rest, contempt: rest,
  };
})();

export const MINIMAL_FORGE_PACKET: ForgePacket = {
  packet_id: 'FORGE_scene_001_run_test_001',
  packet_hash: 'a'.repeat(64), // 64-char hex placeholder
  scene_id: 'scene_001',
  run_id: 'run_test_001',
  quality_tier: 'sovereign',
  language: 'fr',

  intent: {
    story_goal: 'narrative progression',
    scene_goal: 'establish tension',
    conflict_type: 'internal',
    pov: 'third_limited',
    tense: 'past',
    target_word_count: 600,
  },

  emotion_contract: {
    curve_quartiles: [
      {
        quartile: 'Q1',
        target_14d: UNIFORM_14D,
        valence: 0.1,
        arousal: 0.3,
        dominant: 'anticipation',
        narrative_instruction: 'Opening with anticipation',
      },
      {
        quartile: 'Q2',
        target_14d: FEAR_DOMINANT_14D,
        valence: -0.3,
        arousal: 0.6,
        dominant: 'fear',
        narrative_instruction: 'Rising tension through fear',
      },
      {
        quartile: 'Q3',
        target_14d: FEAR_DOMINANT_14D,
        valence: -0.5,
        arousal: 0.8,
        dominant: 'fear',
        narrative_instruction: 'Peak tension',
      },
      {
        quartile: 'Q4',
        target_14d: UNIFORM_14D,
        valence: 0.0,
        arousal: 0.4,
        dominant: 'sadness',
        narrative_instruction: 'Closing with sadness',
      },
    ],
    intensity_range: { min: 0.3, max: 0.8 },
    tension: {
      slope_target: 'arc',
      pic_position_pct: 0.65,
      faille_position_pct: 0.80,
      silence_zones: [],
    },
    terminal_state: {
      target_14d: UNIFORM_14D,
      valence: 0.0,
      arousal: 0.4,
      dominant: 'sadness',
      reader_state: 'Terminal emotion: sadness',
    },
    rupture: {
      exists: false,
      position_pct: 0,
      before_dominant: 'fear',
      after_dominant: 'fear',
      delta_valence: 0,
    },
    valence_arc: {
      start: 0.1,
      end: 0.0,
      direction: 'darkening',
    },
  },

  beats: [
    {
      beat_id: 'beat_001',
      beat_order: 0,
      action: 'Marie enters the dark corridor',
      dialogue: '',
      subtext_type: 'progression',
      emotion_instruction: '',
      sensory_tags: ['sound', 'touch'],
      canon_refs: [],
    },
    {
      beat_id: 'beat_002',
      beat_order: 1,
      action: 'She hears a noise',
      dialogue: '',
      subtext_type: 'pivot',
      emotion_instruction: '',
      sensory_tags: ['sound'],
      canon_refs: ['CANON_001'],
    },
  ],

  subtext: {
    layers: [
      {
        layer_id: 'scene_001_layer_1',
        type: 'suspense',
        statement: 'She suspects she is not alone',
        visibility: 'buried',
      },
    ],
    tension_type: 'suspense',
    tension_intensity: 0.7,
  },

  sensory: {
    density_target: 3,
    categories: [
      { category: 'sight', min_count: 2, signature_words: [] },
      { category: 'sound', min_count: 2, signature_words: [] },
      { category: 'touch', min_count: 1, signature_words: [] },
      { category: 'smell', min_count: 0, signature_words: [] },
      { category: 'taste', min_count: 0, signature_words: [] },
      { category: 'proprioception', min_count: 0, signature_words: [] },
      { category: 'interoception', min_count: 1, signature_words: [] },
    ],
    recurrent_motifs: ['darkness', 'cold'],
    banned_metaphors: ['heart of stone'],
  },

  style_genome: {
    version: '1.0.0',
    universe: 'contemporary_thriller',
    lexicon: {
      signature_words: ['pierre', 'ombre', 'silence', 'souffle', 'chair',
                        'métal', 'froid', 'lumière', 'bruit', 'vide'],
      forbidden_words: ['soudainement', 'mystérieusement', 'bizarrement'],
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
      banned_metaphors: ['heart of stone', 'sea of emotions'],
    },
  },

  kill_lists: {
    banned_words: ['soudain', 'soudainement'],
    banned_cliches: Array.from({ length: 50 }, (_, i) => `cliche_${i}`),
    banned_ai_patterns: Array.from({ length: 30 }, (_, i) => `ai_pattern_${i}`),
    banned_filter_words: Array.from({ length: 25 }, (_, i) => `filter_${i}`),
  },

  canon: [
    { id: 'CANON_001', statement: 'The corridor is in an abandoned factory' },
    { id: 'CANON_002', statement: 'Marie is alone' },
  ],

  continuity: {
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
  },

  seeds: {
    llm_seed: 'run_test_001_scene_001',
    determinism_level: 'absolute',
  },

  generation: {
    timestamp: '2026-02-23T00:00:00.000Z',
    generator_version: '1.0.0',
    constraints_hash: 'b'.repeat(64),
  },
};
