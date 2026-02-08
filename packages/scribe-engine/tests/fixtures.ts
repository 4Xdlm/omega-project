/**
 * OMEGA Scribe Engine -- Test Fixtures
 * Phase C.2 -- Scenarios A, B, C + pre-built plans
 */

import type {
  Intent, Canon, Constraints, StyleGenomeInput, EmotionTarget,
  GConfig,
} from '@omega/genesis-planner';
import { createGenesisPlan, createDefaultConfig } from '@omega/genesis-planner';
import type { SConfig, ProseDoc, ProseParagraph, SkeletonDoc, Segment } from '../src/types.js';
import { createDefaultSConfig } from '../src/config.js';

export const TIMESTAMP = '2026-02-08T00:00:00.000Z';

// ═══════════════════════ SCENARIO A — "Le Gardien" (M) ═══════════════════════

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

// ═══════════════════════ SCENARIO B — "Le Choix" (S) ═══════════════════════

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

// ═══════════════════════ SCENARIO C — "Hostile" (XL) ═══════════════════════

export const SCENARIO_C_INTENT: Intent = {
  title: 'The Fracture of Meridian',
  premise: 'A civilization built on suppressed memories discovers that their entire history is fabricated by a sentient archive that feeds on cognitive dissonance, and the only way to free themselves is to remember what they chose to forget, but remembering will destroy the archive and with it all knowledge they ever had.',
  themes: ['memory', 'identity', 'truth', 'sacrifice', 'collective consciousness', 'technological hubris', 'freedom', 'loss'],
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
    { id: 'C-CANON-004', category: 'character', statement: 'Vesper is the Archive keeper, age unknown', immutable: true },
    { id: 'C-CANON-005', category: 'character', statement: 'Lira is Kael resistance contact, age 28', immutable: true },
    { id: 'C-CANON-006', category: 'rule', statement: 'Accessing suppressed memories causes physical pain', immutable: true },
    { id: 'C-CANON-007', category: 'rule', statement: 'The Archive rewrites memories every 7 years', immutable: true },
    { id: 'C-CANON-008', category: 'event', statement: 'The Great Forgetting happened 49 years ago (7 cycles)', immutable: true },
    { id: 'C-CANON-009', category: 'relationship', statement: 'Kael and Vesper were siblings before memory suppression', immutable: true },
    { id: 'C-CANON-010', category: 'world', statement: 'Memory crystals grow in fractal patterns', immutable: true },
    { id: 'C-CANON-011', category: 'character', statement: 'The Collective is a hive-mind of recovered memories', immutable: true },
    { id: 'C-CANON-012', category: 'event', statement: 'Three previous attempts to destroy the Archive all failed', immutable: true },
    { id: 'C-CANON-013', category: 'rule', statement: 'Complete memory recovery is irreversible', immutable: true },
    { id: 'C-CANON-014', category: 'world', statement: 'The city has 7 districts, each representing a memory layer', immutable: true },
    { id: 'C-CANON-015', category: 'relationship', statement: 'Lira was memory-bonded to Kael in a previous cycle', immutable: true },
    { id: 'C-CANON-016', category: 'character', statement: 'Elder Mara remembers fragments from before the Great Forgetting', immutable: true },
    { id: 'C-CANON-017', category: 'event', statement: 'The Archive pulse happens at midnight, reinforcing suppression', immutable: true },
    { id: 'C-CANON-018', category: 'rule', statement: 'Memory recovery spreads through physical contact', immutable: true },
    { id: 'C-CANON-019', category: 'world', statement: 'Outside Meridian is the Blanklands — erased territory', immutable: true },
    { id: 'C-CANON-020', category: 'relationship', statement: 'Vesper chose to become the Archive keeper voluntarily', immutable: true },
    { id: 'C-CANON-021', category: 'event', statement: 'Kael found a pre-Forgetting journal in the ruins', immutable: true },
  ],
};

export const SCENARIO_C_CONSTRAINTS: Constraints = {
  pov: 'third-omniscient',
  tense: 'past',
  banned_words: ['suddenly', 'literally', 'basically', 'very', 'really', 'just', 'quite'],
  banned_topics: ['gratuitous violence', 'sexual content'],
  max_dialogue_ratio: 0.4,
  min_sensory_anchors_per_scene: 3,
  max_scenes: 3,
  min_scenes: 3,
  forbidden_cliches: ['chosen one', 'dark lord', 'prophecy fulfilled', 'love at first sight'],
};

export const SCENARIO_C_GENOME: StyleGenomeInput = {
  target_burstiness: 0.99,
  target_lexical_richness: 0.99,
  target_avg_sentence_length: 22,
  target_dialogue_ratio: 0.35,
  target_description_density: 0.7,
  signature_traits: ['recursive metaphor', 'unreliable narrator', 'temporal fragmentation', 'synesthetic description', 'stream of consciousness', 'parallel structure'],
};

export const SCENARIO_C_EMOTION: EmotionTarget = {
  arc_emotion: 'fear',
  waypoints: [
    { position: 0.0, emotion: 'trust', intensity: 0.2 },
    { position: 0.1, emotion: 'anticipation', intensity: 0.4 },
    { position: 0.2, emotion: 'surprise', intensity: 0.6 },
    { position: 0.3, emotion: 'fear', intensity: 0.5 },
    { position: 0.4, emotion: 'anger', intensity: 0.7 },
    { position: 0.5, emotion: 'sadness', intensity: 0.6 },
    { position: 0.6, emotion: 'disgust', intensity: 0.8 },
    { position: 0.7, emotion: 'fear', intensity: 0.9 },
    { position: 0.8, emotion: 'anger', intensity: 0.95 },
    { position: 1.0, emotion: 'hope', intensity: 0.5 },
  ],
  climax_position: 0.8,
  resolution_emotion: 'hope',
};

// ═══════════════════════ PRE-BUILT PLANS ═══════════════════════

const gConfig: GConfig = createDefaultConfig();

export function getPlanA() {
  return createGenesisPlan(
    SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
    SCENARIO_A_GENOME, SCENARIO_A_EMOTION, gConfig, TIMESTAMP,
  );
}

export function getPlanB() {
  return createGenesisPlan(
    SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS,
    SCENARIO_B_GENOME, SCENARIO_B_EMOTION, gConfig, TIMESTAMP,
  );
}

export function getPlanC() {
  return createGenesisPlan(
    SCENARIO_C_INTENT, SCENARIO_C_CANON, SCENARIO_C_CONSTRAINTS,
    SCENARIO_C_GENOME, SCENARIO_C_EMOTION, gConfig, TIMESTAMP,
  );
}

export function getDefaultSConfig(): SConfig {
  return createDefaultSConfig();
}

// ═══════════════════════ HELPER: Build minimal prose for testing ═══════════════════════

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

export function buildMinimalProseDoc(overrides?: Partial<ProseDoc>): ProseDoc {
  const para = buildMinimalProseParagraph();
  return {
    prose_id: 'PROSE-TEST-001',
    prose_hash: 'a'.repeat(64),
    skeleton_id: 'SKEL-TEST-001',
    paragraphs: [para],
    total_word_count: para.word_count,
    total_sentence_count: para.sentence_count,
    pass_number: 0,
    ...overrides,
  };
}

export function buildMinimalSegment(overrides?: Partial<Segment>): Segment {
  return {
    segment_id: 'SEG-TEST-001',
    type: 'action',
    source_beat_id: 'BEAT-001',
    source_scene_id: 'SCN-001',
    source_arc_id: 'ARC-001',
    content: '[ACTION] Elias checks the light mechanism',
    role: 'action segment',
    canon_refs: ['CANON-001'],
    seed_refs: [],
    emotion: 'fear',
    intensity: 0.5,
    tension_delta: 0,
    is_pivot: false,
    subtext_slot: 'worried about the mechanism',
    ...overrides,
  };
}

export function buildMinimalSkeleton(overrides?: Partial<SkeletonDoc>): SkeletonDoc {
  const seg = buildMinimalSegment();
  return {
    skeleton_id: 'SKEL-TEST-001',
    skeleton_hash: 'b'.repeat(64),
    plan_id: 'GPLAN-TEST',
    plan_hash: 'c'.repeat(64),
    segments: [seg],
    segment_count: 1,
    scene_order: ['SCN-001'],
    ...overrides,
  };
}
