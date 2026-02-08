/**
 * OMEGA Creation Pipeline — Test Fixtures
 * Phase C.4 — 3 IntentPack scenarios (A, B, C)
 */

import type { Intent, Canon, Constraints, StyleGenomeInput, EmotionTarget } from '@omega/genesis-planner';
import { createDefaultConfig } from '@omega/genesis-planner';
import { createDefaultSConfig } from '@omega/scribe-engine';
import { createDefaultEConfig } from '@omega/style-emergence-engine';
import { createDefaultC4Config } from '../src/config.js';
import type { IntentPack, IntentPackMetadata, C4Config } from '../src/types.js';

export const TIMESTAMP = '2026-02-08T00:00:00.000Z';

// ═══════════════════════ SCENARIO A — "Le Gardien" ═══════════════════════

export const INTENT_A: Intent = {
  title: 'Le Gardien',
  premise: 'A lighthouse keeper discovers the light keeps something in the deep ocean asleep.',
  themes: ['isolation', 'duty', 'forbidden knowledge'],
  core_emotion: 'fear',
  target_audience: 'adult literary fiction',
  message: 'Some truths are better left in darkness',
  target_word_count: 5000,
};

export const CANON_A: Canon = {
  entries: [
    { id: 'CANON-001', category: 'world', statement: 'Lighthouse on remote island, 200km from mainland', immutable: true },
    { id: 'CANON-002', category: 'character', statement: 'Keeper Elias has been alone for 3 years', immutable: true },
    { id: 'CANON-003', category: 'rule', statement: 'The light must never go out', immutable: true },
    { id: 'CANON-004', category: 'event', statement: 'Previous keepers disappeared without explanation', immutable: true },
    { id: 'CANON-005', category: 'world', statement: 'Ocean around island is abnormally deep', immutable: true },
  ],
};

export const CONSTRAINTS_A: Constraints = {
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

export const GENOME_A: StyleGenomeInput = {
  target_burstiness: 0.7,
  target_lexical_richness: 0.8,
  target_avg_sentence_length: 15,
  target_dialogue_ratio: 0.1,
  target_description_density: 0.6,
  signature_traits: ['concrete imagery', 'short declarative cuts', 'sensory immersion', 'parataxis'],
};

export const EMOTION_A: EmotionTarget = {
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

const METADATA_A: IntentPackMetadata = {
  pack_id: 'PACK-A-001',
  pack_version: '1.0.0',
  author: 'Francky',
  created_at: TIMESTAMP,
  description: 'Le Gardien — Horror scenario',
};

export const INTENT_PACK_A: IntentPack = {
  intent: INTENT_A,
  canon: CANON_A,
  constraints: CONSTRAINTS_A,
  genome: GENOME_A,
  emotion: EMOTION_A,
  metadata: METADATA_A,
};

// ═══════════════════════ SCENARIO B — "Le Choix" ═══════════════════════

export const INTENT_B: Intent = {
  title: 'Le Choix',
  premise: 'A woman must choose between two doors',
  themes: ['choice'],
  core_emotion: 'anticipation',
  target_audience: 'general',
  message: 'Every choice is a death',
  target_word_count: 1000,
};

export const CANON_B: Canon = {
  entries: [
    { id: 'CANON-001', category: 'world', statement: 'Two doors in a white room', immutable: true },
  ],
};

export const CONSTRAINTS_B: Constraints = {
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

export const GENOME_B: StyleGenomeInput = {
  target_burstiness: 0.5,
  target_lexical_richness: 0.5,
  target_avg_sentence_length: 10,
  target_dialogue_ratio: 0.0,
  target_description_density: 0.5,
  signature_traits: ['minimalist'],
};

export const EMOTION_B: EmotionTarget = {
  arc_emotion: 'anticipation',
  waypoints: [
    { position: 0.0, emotion: 'anticipation', intensity: 0.3 },
    { position: 1.0, emotion: 'sadness', intensity: 0.6 },
  ],
  climax_position: 0.7,
  resolution_emotion: 'sadness',
};

const METADATA_B: IntentPackMetadata = {
  pack_id: 'PACK-B-001',
  pack_version: '1.0.0',
  author: 'Francky',
  created_at: TIMESTAMP,
  description: 'Le Choix — Minimal scenario',
};

export const INTENT_PACK_B: IntentPack = {
  intent: INTENT_B,
  canon: CANON_B,
  constraints: CONSTRAINTS_B,
  genome: GENOME_B,
  emotion: EMOTION_B,
  metadata: METADATA_B,
};

// ═══════════════════════ SCENARIO C — "Hostile/XL" ═══════════════════════

export const INTENT_C: Intent = {
  title: 'The Fracture of Meridian',
  premise: 'A civilization built on suppressed memories discovers that their entire history is fabricated by a sentient archive that feeds on cognitive dissonance, and the only way to free themselves is to remember what they chose to forget, but remembering will destroy the archive and with it all knowledge they ever had.',
  themes: [
    'memory', 'identity', 'truth', 'sacrifice', 'collective consciousness',
    'technological hubris', 'freedom', 'loss',
  ],
  core_emotion: 'fear',
  target_audience: 'adult speculative fiction',
  message: 'Freedom requires the courage to lose everything you know',
  target_word_count: 100000,
};

export const CANON_C: Canon = {
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

export const CONSTRAINTS_C: Constraints = {
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

export const GENOME_C: StyleGenomeInput = {
  target_burstiness: 0.99,
  target_lexical_richness: 0.99,
  target_avg_sentence_length: 22,
  target_dialogue_ratio: 0.35,
  target_description_density: 0.7,
  signature_traits: [
    'recursive metaphor', 'unreliable narrator', 'temporal fragmentation',
    'synesthetic description', 'stream of consciousness', 'parallel structure',
  ],
};

export const EMOTION_C: EmotionTarget = {
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

const METADATA_C: IntentPackMetadata = {
  pack_id: 'PACK-C-001',
  pack_version: '1.0.0',
  author: 'Francky',
  created_at: TIMESTAMP,
  description: 'The Fracture of Meridian — Hostile/XL scenario',
};

export const INTENT_PACK_C: IntentPack = {
  intent: INTENT_C,
  canon: CANON_C,
  constraints: CONSTRAINTS_C,
  genome: GENOME_C,
  emotion: EMOTION_C,
  metadata: METADATA_C,
};

// ═══════════════════════ CONFIGS ═══════════════════════

export const DEFAULT_G_CONFIG = createDefaultConfig();
export const DEFAULT_S_CONFIG = createDefaultSConfig();
export const DEFAULT_E_CONFIG = createDefaultEConfig();
export const DEFAULT_C4_CONFIG = createDefaultC4Config();

// ═══════════════════════ HELPERS ═══════════════════════

/** Run C.1→C.2→C.3 pipeline and cache the result for reuse */
import { createGenesisPlan } from '@omega/genesis-planner';
import { runScribe } from '@omega/scribe-engine';
import { runStyleEmergence } from '@omega/style-emergence-engine';

export interface PipelineSnapshot {
  readonly plan: import('@omega/genesis-planner').GenesisPlan;
  readonly scribeOutput: import('@omega/scribe-engine').ScribeOutput;
  readonly styleOutput: import('@omega/style-emergence-engine').StyledOutput;
  readonly genesisReport: import('@omega/genesis-planner').GenesisReport;
  readonly scribeReport: import('@omega/scribe-engine').ScribeReport;
  readonly styleReport: import('@omega/style-emergence-engine').StyleReport;
}

const cache = new Map<string, PipelineSnapshot>();

export function runPipeline(pack: IntentPack): PipelineSnapshot {
  const key = pack.metadata.pack_id;
  if (cache.has(key)) return cache.get(key)!;

  const { plan, report: genesisReport } = createGenesisPlan(
    pack.intent, pack.canon, pack.constraints, pack.genome, pack.emotion,
    DEFAULT_G_CONFIG, TIMESTAMP,
  );
  const { output: scribeOutput, report: scribeReport } = runScribe(
    plan, pack.canon, pack.genome, pack.emotion, pack.constraints,
    DEFAULT_S_CONFIG, TIMESTAMP,
  );
  const { output: styleOutput, report: styleReport } = runStyleEmergence(
    scribeOutput, pack.genome, pack.constraints, DEFAULT_E_CONFIG, TIMESTAMP,
  );

  const snapshot: PipelineSnapshot = { plan, scribeOutput, styleOutput, genesisReport, scribeReport, styleReport };
  cache.set(key, snapshot);
  return snapshot;
}
