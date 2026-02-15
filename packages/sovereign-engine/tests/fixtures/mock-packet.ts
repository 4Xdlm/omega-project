/**
 * Mock ForgePacket complet pour les tests
 */

import type { ForgePacket } from '../../src/types.js';

export const MOCK_PACKET: ForgePacket = {
  packet_id: 'PKT_TEST_001',
  packet_hash: 'abc123def456',
  scene_id: 'SCENE_TEST_001',
  run_id: 'RUN_TEST_001',
  quality_tier: 'sovereign',
  language: 'fr',

  intent: {
    story_goal: 'Test story goal',
    scene_goal: 'Test scene goal',
    conflict_type: 'internal',
    pov: 'third_limited',
    tense: 'past',
    target_word_count: 800,
  },

  emotion_contract: {
    curve_quartiles: [
      {
        quartile: 'Q1',
        target_14d: {
          fear: 0.7,
          sadness: 0.2,
          anticipation: 0.1,
          joy: 0,
          trust: 0,
          surprise: 0,
          disgust: 0,
          anger: 0,
          love: 0,
          submission: 0,
          awe: 0,
          disapproval: 0,
          remorse: 0,
          contempt: 0,
        },
        valence: -0.5,
        arousal: 0.6,
        dominant: 'fear',
        narrative_instruction: 'Opening with rising fear',
      },
      {
        quartile: 'Q2',
        target_14d: {
          fear: 0.8,
          anger: 0.1,
          anticipation: 0.1,
          joy: 0,
          trust: 0,
          surprise: 0,
          sadness: 0,
          disgust: 0,
          love: 0,
          submission: 0,
          awe: 0,
          disapproval: 0,
          remorse: 0,
          contempt: 0,
        },
        valence: -0.6,
        arousal: 0.8,
        dominant: 'fear',
        narrative_instruction: 'Peak fear',
      },
      {
        quartile: 'Q3',
        target_14d: {
          fear: 0.5,
          sadness: 0.3,
          remorse: 0.2,
          joy: 0,
          trust: 0,
          surprise: 0,
          disgust: 0,
          anger: 0,
          anticipation: 0,
          love: 0,
          submission: 0,
          awe: 0,
          disapproval: 0,
          contempt: 0,
        },
        valence: -0.4,
        arousal: 0.4,
        dominant: 'fear',
        narrative_instruction: 'Descent',
      },
      {
        quartile: 'Q4',
        target_14d: {
          sadness: 0.6,
          remorse: 0.3,
          anticipation: 0.1,
          joy: 0,
          trust: 0,
          fear: 0,
          surprise: 0,
          disgust: 0,
          anger: 0,
          love: 0,
          submission: 0,
          awe: 0,
          disapproval: 0,
          contempt: 0,
        },
        valence: -0.3,
        arousal: 0.3,
        dominant: 'sadness',
        narrative_instruction: 'Resolution in sadness',
      },
    ],
    intensity_range: { min: 0.3, max: 0.8 },
    tension: {
      slope_target: 'arc',
      pic_position_pct: 0.5,
      faille_position_pct: 0.75,
      silence_zones: [],
    },
    terminal_state: {
      target_14d: {
        sadness: 0.6,
        remorse: 0.3,
        anticipation: 0.1,
        joy: 0,
        trust: 0,
        fear: 0,
        surprise: 0,
        disgust: 0,
        anger: 0,
        love: 0,
        submission: 0,
        awe: 0,
        disapproval: 0,
        contempt: 0,
      },
      valence: -0.3,
      arousal: 0.3,
      dominant: 'sadness',
      reader_state: 'Grief with acceptance',
    },
    rupture: {
      exists: false,
      position_pct: 0,
      before_dominant: 'fear',
      after_dominant: 'fear',
      delta_valence: 0,
    },
    valence_arc: {
      start: -0.5,
      end: -0.3,
      direction: 'brightening',
    },
  },

  beats: [
    {
      beat_id: 'BEAT_001',
      beat_type: 'action',
      beat_order: 1,
      description: 'Character enters the room',
      mandatory_elements: ['room', 'door'],
      forbidden_elements: [],
    },
  ],

  subtext: {
    layers: [
      {
        layer_id: 'LAYER_001',
        layer_type: 'symbolic',
        description: 'Fear of abandonment',
        intensity: 0.7,
      },
    ],
    themes: ['loss', 'memory'],
  },

  sensory: {
    primary_sense: 'vue',
    secondary_sense: 'son',
    density_target: 8,
    forbidden_senses: [],
  },

  style_genome: {
    version: '1.0.0',
    universe: 'test_universe',
    lexicon: {
      signature_words: ['ombre', 'cendre', 'fer', 'pierre', 'flamme'],
      forbidden_words: ['nice', 'very', 'really'],
      abstraction_max_ratio: 0.35,
      concrete_min_ratio: 0.65,
    },
    rhythm: {
      avg_sentence_length_target: 15,
      gini_target: 0.45,
      max_consecutive_similar: 3,
      min_syncopes_per_scene: 2,
      min_compressions_per_scene: 1,
    },
    tone: {
      dominant_register: 'sombre',
      intensity_range: [0.4, 0.9],
    },
    imagery: {
      recurrent_motifs: ['feu', 'obscurité'],
      density_target_per_100_words: 8,
      banned_metaphors: ['cœur qui bat'],
    },
  },

  kill_lists: {
    banned_cliches: ['cœur battait', 'frisson parcourut', 'silence pesant'],
    banned_ai_patterns: ['dans l\'air flottait'],
    banned_filter_words: ['il sentit', 'elle remarqua'],
    banned_words: ['suddenly', 'just', 'very'],
  },

  canon: [
    {
      entry_id: 'CANON_001',
      entity_type: 'character',
      entity_name: 'Marie',
      fact: 'Marie has blue eyes',
      source: 'Chapter 1',
    },
  ],

  continuity: {
    previous_scene_id: null,
    next_scene_id: null,
    character_states: [
      {
        character_name: 'Marie',
        physical_state: 'tired',
        emotional_state: 'anxious',
        knowledge_state: 'unaware of the truth',
      },
    ],
    world_state: {
      location: 'apartment',
      time_of_day: 'evening',
      weather: 'rainy',
    },
  },

  seeds: {
    llm_seed: 'TEST_SEED_001',
    determinism_token: 'DET_TOKEN_001',
  },

  generation: {
    timestamp: '2026-02-13T00:00:00Z',
    generator_version: '1.0.0',
    constraints_hash: 'constraints_hash_001',
  },
};
