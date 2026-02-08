/**
 * OMEGA Style Emergence Engine -- Test Fixtures
 * Phase C.3 -- Scenarios A, B, C + ScribeOutput builders
 */

import type {
  Intent, Canon, Constraints, StyleGenomeInput, EmotionTarget,
  GConfig,
} from '@omega/genesis-planner';
import { createGenesisPlan, createDefaultConfig } from '@omega/genesis-planner';
import { runScribe, createDefaultSConfig } from '@omega/scribe-engine';
import type { ScribeOutput, ProseParagraph, SConfig } from '@omega/scribe-engine';
import type { EConfig, StyledParagraph, StyleProfile, StyledOutput } from '../src/types.js';
import { createDefaultEConfig } from '../src/config.js';
import { profileStyle } from '../src/metrics/style-profiler.js';

export const TIMESTAMP = '2026-02-08T00:00:00.000Z';

// ═══════════════════════ SCENARIO A — "Le Gardien" ═══════════════════════

export const SCENARIO_A_INTENT: Intent = {
  title: 'Le Gardien',
  premise: 'A lighthouse keeper discovers the light keeps something in the deep ocean asleep.',
  themes: ['isolation', 'duty', 'forbidden knowledge'],
  core_emotion: 'fear',
  target_audience: 'adult literary fiction',
  message: 'Some truths are better left in darkness',
  target_word_count: 5000,
};

export const SCENARIO_A_CANON: Canon = {
  entries: [
    { id: 'CANON-001', category: 'world', statement: 'Lighthouse on remote island, 200km from mainland', immutable: true },
    { id: 'CANON-002', category: 'character', statement: 'Keeper Elias has been alone for 3 years', immutable: true },
    { id: 'CANON-003', category: 'rule', statement: 'The light must never go out', immutable: true },
    { id: 'CANON-004', category: 'event', statement: 'Previous keepers disappeared without explanation', immutable: true },
    { id: 'CANON-005', category: 'world', statement: 'Ocean around island is abnormally deep', immutable: true },
  ],
};

export const SCENARIO_A_CONSTRAINTS: Constraints = {
  pov: 'third-limited',
  tense: 'past',
  banned_words: ['suddenly', 'literally', 'basically'],
  banned_topics: [],
  max_dialogue_ratio: 0.1,
  min_sensory_anchors_per_scene: 2,
  max_scenes: 8,
  min_scenes: 4,
  forbidden_cliches: ['dark and stormy night', 'heart pounding', 'blood ran cold'],
};

export const SCENARIO_A_GENOME: StyleGenomeInput = {
  target_burstiness: 0.7,
  target_lexical_richness: 0.8,
  target_avg_sentence_length: 15,
  target_dialogue_ratio: 0.1,
  target_description_density: 0.6,
  signature_traits: ['concrete imagery', 'short declarative cuts', 'sensory immersion', 'parataxis'],
};

export const SCENARIO_A_EMOTION: EmotionTarget = {
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
};

// ═══════════════════════ SCENARIO B — "Le Choix" ═══════════════════════

export const SCENARIO_B_INTENT: Intent = {
  title: 'Le Choix',
  premise: 'A woman must choose between two doors',
  themes: ['choice'],
  core_emotion: 'anticipation',
  target_audience: 'general',
  message: 'Every choice is a death',
  target_word_count: 1000,
};

export const SCENARIO_B_CANON: Canon = {
  entries: [
    { id: 'CANON-001', category: 'world', statement: 'Two doors in a white room', immutable: true },
  ],
};

export const SCENARIO_B_CONSTRAINTS: Constraints = {
  pov: 'first',
  tense: 'present',
  banned_words: [],
  banned_topics: [],
  max_dialogue_ratio: 0.0,
  min_sensory_anchors_per_scene: 1,
  max_scenes: 4,
  min_scenes: 2,
  forbidden_cliches: [],
};

export const SCENARIO_B_GENOME: StyleGenomeInput = {
  target_burstiness: 0.5,
  target_lexical_richness: 0.5,
  target_avg_sentence_length: 10,
  target_dialogue_ratio: 0.0,
  target_description_density: 0.5,
  signature_traits: ['minimalist'],
};

export const SCENARIO_B_EMOTION: EmotionTarget = {
  arc_emotion: 'anticipation',
  waypoints: [
    { position: 0.0, emotion: 'anticipation', intensity: 0.3 },
    { position: 1.0, emotion: 'sadness', intensity: 0.6 },
  ],
  climax_position: 0.7,
  resolution_emotion: 'sadness',
};

// ═══════════════════════ SCENARIO C — "Hostile" ═══════════════════════

export const SCENARIO_C_INTENT: Intent = {
  title: 'The Fracture of Meridian',
  premise: 'A civilization built on suppressed memories discovers their history is fabricated.',
  themes: ['memory', 'identity', 'truth', 'sacrifice'],
  core_emotion: 'fear',
  target_audience: 'adult speculative fiction',
  message: 'Freedom requires the courage to lose everything you know',
  target_word_count: 100000,
};

export const SCENARIO_C_CANON: Canon = {
  entries: [
    { id: 'C-CANON-001', category: 'world', statement: 'Meridian is a city-state of 10 million inhabitants', immutable: true },
    { id: 'C-CANON-002', category: 'world', statement: 'The Archive is a sentient crystalline structure beneath the city', immutable: true },
    { id: 'C-CANON-003', category: 'character', statement: 'Kael is a memory archaeologist, age 34', immutable: true },
  ],
};

export const SCENARIO_C_CONSTRAINTS: Constraints = {
  pov: 'third-omniscient',
  tense: 'past',
  banned_words: ['suddenly', 'literally', 'basically', 'very', 'really', 'just', 'quite'],
  banned_topics: ['gratuitous violence'],
  max_dialogue_ratio: 0.4,
  min_sensory_anchors_per_scene: 3,
  max_scenes: 3,
  min_scenes: 3,
  forbidden_cliches: ['chosen one', 'dark lord', 'prophecy fulfilled'],
};

export const SCENARIO_C_GENOME: StyleGenomeInput = {
  target_burstiness: 0.99,
  target_lexical_richness: 0.99,
  target_avg_sentence_length: 22,
  target_dialogue_ratio: 0.35,
  target_description_density: 0.7,
  signature_traits: ['recursive metaphor', 'unreliable narrator'],
};

export const SCENARIO_C_EMOTION: EmotionTarget = {
  arc_emotion: 'fear',
  waypoints: [
    { position: 0.0, emotion: 'trust', intensity: 0.2 },
    { position: 0.5, emotion: 'fear', intensity: 0.7 },
    { position: 1.0, emotion: 'hope', intensity: 0.5 },
  ],
  climax_position: 0.8,
  resolution_emotion: 'hope',
};

// ═══════════════════════ SCRIBE OUTPUT BUILDERS ═══════════════════════

const gConfig: GConfig = createDefaultConfig();
const sConfig: SConfig = createDefaultSConfig();

let cachedScribeA: ScribeOutput | null = null;
let cachedScribeB: ScribeOutput | null = null;
let cachedScribeC: ScribeOutput | null = null;

export function getScribeOutputA(): ScribeOutput {
  if (!cachedScribeA) {
    const { plan } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, gConfig, TIMESTAMP,
    );
    const { output } = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, sConfig, TIMESTAMP);
    cachedScribeA = output;
  }
  return cachedScribeA;
}

export function getScribeOutputB(): ScribeOutput {
  if (!cachedScribeB) {
    const { plan } = createGenesisPlan(
      SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS,
      SCENARIO_B_GENOME, SCENARIO_B_EMOTION, gConfig, TIMESTAMP,
    );
    const { output } = runScribe(plan, SCENARIO_B_CANON, SCENARIO_B_GENOME, SCENARIO_B_EMOTION, SCENARIO_B_CONSTRAINTS, sConfig, TIMESTAMP);
    cachedScribeB = output;
  }
  return cachedScribeB;
}

export function getScribeOutputC(): ScribeOutput {
  if (!cachedScribeC) {
    const { plan } = createGenesisPlan(
      SCENARIO_C_INTENT, SCENARIO_C_CANON, SCENARIO_C_CONSTRAINTS,
      SCENARIO_C_GENOME, SCENARIO_C_EMOTION, gConfig, TIMESTAMP,
    );
    const { output } = runScribe(plan, SCENARIO_C_CANON, SCENARIO_C_GENOME, SCENARIO_C_EMOTION, SCENARIO_C_CONSTRAINTS, sConfig, TIMESTAMP);
    cachedScribeC = output;
  }
  return cachedScribeC;
}

export function getDefaultEConfig(): EConfig {
  return createDefaultEConfig();
}

// ═══════════════════════ HELPER BUILDERS ═══════════════════════

export function buildMinimalProseParagraph(overrides?: Partial<ProseParagraph>): ProseParagraph {
  return {
    paragraph_id: 'PARA-TEST-001',
    segment_ids: ['SEG-001'],
    text: 'The lighthouse stood on the edge of the precipice, casting its beam across the dark water below.',
    word_count: 16,
    sentence_count: 1,
    avg_sentence_length: 16,
    emotion: 'fear',
    intensity: 0.6,
    rhetorical_devices: [],
    sensory_anchors: ['lighthouse beam', 'dark water'],
    motif_refs: [],
    canon_refs: ['CANON-001'],
    ...overrides,
  };
}

export function buildMinimalStyledParagraph(overrides?: Partial<StyledParagraph>): StyledParagraph {
  const profile = profileStyle([buildMinimalProseParagraph()], SCENARIO_A_GENOME, TIMESTAMP);
  return {
    paragraph_id: 'ESTYLE-PARA-TEST-001',
    original_paragraph_id: 'PARA-TEST-001',
    text: 'The lighthouse stood on the edge of the precipice, casting its beam across the dark water below.',
    word_count: 16,
    sentence_count: 1,
    selected_variant_id: 'VAR-TEST-0',
    style_profile: profile,
    ...overrides,
  };
}

export function buildMinimalStyledOutput(overrides?: Partial<StyledOutput>): StyledOutput {
  const para = buildMinimalStyledParagraph();
  const profile = profileStyle([buildMinimalProseParagraph()], SCENARIO_A_GENOME, TIMESTAMP);
  return {
    output_id: 'EOUT-TEST-001',
    output_hash: 'a'.repeat(64),
    scribe_output_id: 'SOUT-TEST',
    scribe_output_hash: 'b'.repeat(64),
    plan_id: 'GPLAN-TEST',
    paragraphs: [para],
    global_profile: profile,
    ia_detection: { score: 0, patterns_found: [], pattern_count: 0, verdict: 'PASS', details: [] },
    genre_detection: { genre_scores: {}, top_genre: 'none', top_score: 0, specificity: 0, verdict: 'PASS', genre_markers_found: [] },
    banality_result: { cliche_count: 0, ia_speak_count: 0, generic_transition_count: 0, total_banality: 0, verdict: 'PASS', findings: [] },
    tournament: { tournament_id: 'ETOURN-TEST', tournament_hash: 'c'.repeat(64), rounds: [], total_variants_generated: 3, total_rounds: 1, avg_composite_score: 0.8 },
    total_word_count: para.word_count,
    ...overrides,
  };
}
