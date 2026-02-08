/**
 * OMEGA Forge — Test Fixtures
 * Phase C.5 — CreationResult scenarios for forge testing
 */

import { createDefaultConfig, createGenesisPlan } from '@omega/genesis-planner';
import { createDefaultSConfig, runScribe } from '@omega/scribe-engine';
import { createDefaultEConfig, runStyleEmergence } from '@omega/style-emergence-engine';
import { createDefaultC4Config, runCreation } from '@omega/creation-pipeline';
import type { CreationResult, IntentPack, IntentPackMetadata, StyledParagraph, StyledOutput } from '@omega/creation-pipeline';
import type { CanonicalEmotionTable, F5Config, EmotionState14D, ParagraphEmotionState, OmegaState } from '../src/types.js';
import { createDefaultF5Config } from '../src/config.js';
import { DEFAULT_CANONICAL_TABLE } from '../src/physics/canonical-table.js';
import { EMOTION_14_KEYS } from '../src/types.js';

export const TIMESTAMP = '2026-02-08T00:00:00.000Z';
export const DEFAULT_F5_CONFIG = createDefaultF5Config();
export const CANONICAL_TABLE = DEFAULT_CANONICAL_TABLE;

// ═══════════════════════ INTENT PACKS (reuse C.4 patterns) ═══════════════════════

export const INTENT_PACK_A: IntentPack = {
  intent: {
    title: 'Le Gardien',
    premise: 'A lighthouse keeper discovers the light keeps something in the deep ocean asleep.',
    themes: ['isolation', 'duty', 'forbidden knowledge'],
    core_emotion: 'fear',
    target_audience: 'adult literary fiction',
    message: 'Some truths are better left in darkness',
    target_word_count: 5000,
  },
  canon: {
    entries: [
      { id: 'CANON-001', category: 'world', statement: 'Lighthouse on remote island, 200km from mainland', immutable: true },
      { id: 'CANON-002', category: 'character', statement: 'Keeper Elias has been alone for 3 years', immutable: true },
      { id: 'CANON-003', category: 'rule', statement: 'The light must never go out', immutable: true },
      { id: 'CANON-004', category: 'event', statement: 'Previous keepers disappeared without explanation', immutable: true },
      { id: 'CANON-005', category: 'world', statement: 'Ocean around island is abnormally deep', immutable: true },
    ],
  },
  constraints: {
    pov: 'third-limited',
    tense: 'past',
    banned_words: ['suddenly', 'literally', 'basically'],
    banned_topics: [],
    max_dialogue_ratio: 0.1,
    min_sensory_anchors_per_scene: 2,
    max_scenes: 8,
    min_scenes: 4,
    forbidden_cliches: ['dark and stormy night', 'heart pounding', 'blood ran cold'],
  },
  genome: {
    target_burstiness: 0.7,
    target_lexical_richness: 0.8,
    target_avg_sentence_length: 15,
    target_dialogue_ratio: 0.1,
    target_description_density: 0.6,
    signature_traits: ['concrete imagery', 'short declarative cuts', 'sensory immersion', 'parataxis'],
  },
  emotion: {
    arc_emotion: 'fear',
    waypoints: [
      { position: 0.0, emotion: 'trust', intensity: 0.3 },
      { position: 0.3, emotion: 'anticipation', intensity: 0.5 },
      { position: 0.5, emotion: 'fear', intensity: 0.6 },
      { position: 0.8, emotion: 'fear', intensity: 0.9 },
      { position: 1.0, emotion: 'sadness', intensity: 0.7 },
    ],
    climax_position: 0.8,
    resolution_emotion: 'sadness',
  },
  metadata: {
    pack_id: 'PACK-A-001',
    pack_version: '1.0.0',
    author: 'Francky',
    created_at: TIMESTAMP,
    description: 'Le Gardien — Horror scenario',
  },
};

export const INTENT_PACK_B: IntentPack = {
  intent: {
    title: 'Le Choix',
    premise: 'A woman must choose between two doors',
    themes: ['choice'],
    core_emotion: 'anticipation',
    target_audience: 'general',
    message: 'Every choice is a death',
    target_word_count: 1000,
  },
  canon: {
    entries: [
      { id: 'CANON-001', category: 'world', statement: 'Two doors in a white room', immutable: true },
    ],
  },
  constraints: {
    pov: 'first',
    tense: 'present',
    banned_words: [],
    banned_topics: [],
    max_dialogue_ratio: 0.0,
    min_sensory_anchors_per_scene: 1,
    max_scenes: 4,
    min_scenes: 2,
    forbidden_cliches: [],
  },
  genome: {
    target_burstiness: 0.5,
    target_lexical_richness: 0.5,
    target_avg_sentence_length: 10,
    target_dialogue_ratio: 0.0,
    target_description_density: 0.5,
    signature_traits: ['minimalist'],
  },
  emotion: {
    arc_emotion: 'anticipation',
    waypoints: [
      { position: 0.0, emotion: 'anticipation', intensity: 0.3 },
      { position: 1.0, emotion: 'sadness', intensity: 0.6 },
    ],
    climax_position: 0.7,
    resolution_emotion: 'sadness',
  },
  metadata: {
    pack_id: 'PACK-B-001',
    pack_version: '1.0.0',
    author: 'Francky',
    created_at: TIMESTAMP,
    description: 'Le Choix — Minimal scenario',
  },
};

// ═══════════════════════ PIPELINE EXECUTION CACHE ═══════════════════════

const creationCache = new Map<string, CreationResult>();

export function getCreationResult(pack: IntentPack): CreationResult {
  const key = pack.metadata.pack_id;
  if (creationCache.has(key)) return creationCache.get(key)!;

  const gConfig = createDefaultConfig();
  const sConfig = createDefaultSConfig();
  const eConfig = createDefaultEConfig();
  const c4Config = createDefaultC4Config();

  const result = runCreation(pack, c4Config, gConfig, sConfig, eConfig, TIMESTAMP);
  creationCache.set(key, result);
  return result;
}

/** Return certified (PASS) creation result for scenario A */
export const CREATION_A = (): CreationResult => {
  const r = getCreationResult(INTENT_PACK_A);
  // C.4 gates may FAIL on minimal test data — override verdict for C.5 testing
  // C.5 needs certified input to exercise the full analysis path
  return r.verdict === 'PASS' ? r : { ...r, verdict: 'PASS' as const } as CreationResult;
};

/** Return certified (PASS) creation result for scenario B */
export const CREATION_B = (): CreationResult => {
  const r = getCreationResult(INTENT_PACK_B);
  return r.verdict === 'PASS' ? r : { ...r, verdict: 'PASS' as const } as CreationResult;
};

// ═══════════════════════ FAILED CREATION (for F5-INV-01 testing) ═══════════════════════

export function makeFailedCreation(): CreationResult {
  const result = CREATION_A();
  return { ...result, verdict: 'FAIL' } as CreationResult;
}

// ═══════════════════════ HELPERS ═══════════════════════

/** Create a simple EmotionState14D with one dominant emotion */
export function makeState14D(dominant: string, intensity: number): EmotionState14D {
  const state: Record<string, number> = {};
  for (const key of EMOTION_14_KEYS) {
    state[key] = key === dominant ? Math.min(1, intensity) : 0;
  }
  return state as EmotionState14D;
}

/** Create a simple OmegaState */
export function makeOmega(X: number, Y: number, Z: number): OmegaState {
  return { X, Y, Z };
}

/** Create a minimal StyledParagraph */
export function makeParagraph(text: string, index: number): StyledParagraph {
  return {
    paragraph_id: `P-${index}`,
    original_paragraph_id: `OP-${index}`,
    text,
    word_count: text.split(/\s+/).length,
    sentence_count: text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0).length,
    selected_variant_id: `V-${index}`,
    style_profile: {
      profile_id: `SP-${index}`,
      profile_hash: 'abc123',
      cadence: { avg_sentence_length: 10, sentence_length_stddev: 3, coefficient_of_variation: 0.3, short_ratio: 0.3, long_ratio: 0.2, sentence_count: 3 },
      lexical: { type_token_ratio: 0.7, hapax_legomena_ratio: 0.3, rare_word_ratio: 0.1, consecutive_rare_count: 0, avg_word_length: 5, vocabulary_size: 50 },
      syntactic: { structure_distribution: { SVO: 0.6, inversion: 0.1, fragment: 0.1, question: 0.05, exclamation: 0.05, compound: 0.05, complex: 0.02, imperative: 0.02, passive: 0.01 }, unique_structures: 9, dominant_structure: 'SVO', dominant_ratio: 0.6, diversity_index: 0.7 },
      density: { description_density: 0.5, dialogue_ratio: 0.1, sensory_density: 0.3, action_density: 0.2, introspection_density: 0.2 },
      coherence: { style_drift: 0.1, max_local_drift: 0.15, voice_stability: 0.85, outlier_paragraphs: [] },
      genome_deviation: { burstiness_delta: 0.05, lexical_richness_delta: 0.03, sentence_length_delta: 0.1, dialogue_ratio_delta: 0.02, description_density_delta: 0.05, max_deviation: 0.1, avg_deviation: 0.05, all_within_tolerance: true },
      timestamp_deterministic: TIMESTAMP,
    },
  };
}
