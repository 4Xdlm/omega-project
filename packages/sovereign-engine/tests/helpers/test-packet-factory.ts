/**
 * Test Packet Factory — creates ForgePacket instances for prompt assembler tests
 * Fields match the exact types expected by prompt-assembler-v2.ts
 */

import type { ForgePacket } from '../../src/types.js';
import type { VoiceGenome } from '../../src/voice/voice-genome.js';

interface TestPacketOptions {
  style_genome_voice?: VoiceGenome;
}

export function createTestPacket(options?: TestPacketOptions): ForgePacket {
  return {
    packet_id: 'PKT_TEST_PROMPT_001',
    packet_hash: 'test_hash_001',
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
          target_14d: { fear: 0.7, sadness: 0.2, anticipation: 0.1, joy: 0, trust: 0, surprise: 0, disgust: 0, anger: 0, love: 0, submission: 0, awe: 0, disapproval: 0, remorse: 0, contempt: 0 },
          valence: -0.5,
          arousal: 0.6,
          dominant: 'fear',
          narrative_instruction: 'Opening with rising fear',
        },
        {
          quartile: 'Q2',
          target_14d: { fear: 0.8, anger: 0.1, anticipation: 0.1, joy: 0, trust: 0, surprise: 0, sadness: 0, disgust: 0, love: 0, submission: 0, awe: 0, disapproval: 0, remorse: 0, contempt: 0 },
          valence: -0.6,
          arousal: 0.8,
          dominant: 'fear',
          narrative_instruction: 'Peak fear',
        },
        {
          quartile: 'Q3',
          target_14d: { fear: 0.5, sadness: 0.3, remorse: 0.2, joy: 0, trust: 0, surprise: 0, disgust: 0, anger: 0, anticipation: 0, love: 0, submission: 0, awe: 0, disapproval: 0, contempt: 0 },
          valence: -0.4,
          arousal: 0.4,
          dominant: 'fear',
          narrative_instruction: 'Descent',
        },
        {
          quartile: 'Q4',
          target_14d: { sadness: 0.6, remorse: 0.3, anticipation: 0.1, joy: 0, trust: 0, fear: 0, surprise: 0, disgust: 0, anger: 0, love: 0, submission: 0, awe: 0, disapproval: 0, contempt: 0 },
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
        target_14d: { sadness: 0.6, remorse: 0.3, anticipation: 0.1, joy: 0, trust: 0, fear: 0, surprise: 0, disgust: 0, anger: 0, love: 0, submission: 0, awe: 0, disapproval: 0, contempt: 0 },
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
        beat_order: 0,
        action: 'Character enters the room',
        dialogue: '',
        subtext_type: 'symbolic',
        emotion_instruction: 'Rising tension',
        sensory_tags: ['vue', 'son'],
        canon_refs: ['CANON_001'],
      },
    ],

    subtext: {
      layers: [
        {
          layer_id: 'LAYER_001',
          type: 'symbolic',
          statement: 'Fear of abandonment',
          visibility: 'implicit',
        },
      ],
      tension_type: 'internal',
      tension_intensity: 0.7,
    },

    sensory: {
      density_target: 8,
      categories: [
        { category: 'sight', min_count: 3, signature_words: ['ombre', 'lumière'] },
        { category: 'sound', min_count: 2, signature_words: ['silence', 'écho'] },
        { category: 'touch', min_count: 1, signature_words: ['froid', 'rugueux'] },
      ],
      recurrent_motifs: ['feu', 'obscurité'],
      banned_metaphors: [],
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
        banned_metaphors: [],
      },
      voice: options?.style_genome_voice,
    },

    kill_lists: {
      banned_cliches: ['coeur battait', 'frisson parcourut'],
      banned_ai_patterns: ['dans l\'air flottait'],
      banned_filter_words: ['il sentit', 'elle remarqua'],
      banned_words: ['suddenly', 'just'],
    },

    canon: [
      { id: 'CANON_001', statement: 'Marie has blue eyes' },
    ],

    continuity: {
      previous_scene_summary: 'Previous scene summary',
      character_states: [
        {
          character_id: 'CHAR_001',
          character_name: 'Marie',
          physical_state: 'tired',
          emotional_state: 'anxious',
          location: 'apartment',
        },
      ],
      open_threads: ['Thread 1'],
    },

    seeds: {
      llm_seed: 'TEST_SEED_001',
      determinism_level: 'absolute',
    },

    generation: {
      timestamp: '2026-02-20T00:00:00Z',
      generator_version: '1.0.0',
      constraints_hash: 'constraints_hash_001',
    },
  };
}
