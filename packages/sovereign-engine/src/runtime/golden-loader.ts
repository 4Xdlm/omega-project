/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — GOLDEN RUN LOADER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: runtime/golden-loader.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Reads a golden run directory and constructs ForgePacketInput.
 * Fail-closed: any missing file or invalid structure throws.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GenesisPlan, Scene } from '@omega/genesis-planner';
import type { ForgePacketInput } from '../input/forge-packet-assembler.js';
import type { StyleProfile, KillLists, CanonEntry, ForgeContinuity } from '../types.js';
import type { VoiceGenome } from '../voice/voice-genome.js';

/**
 * Structure of intent.json from golden run
 */
interface IntentJSON {
  readonly canon: {
    readonly entries: readonly CanonEntry[];
  };
  readonly constraints: {
    readonly pov: string;
    readonly tense: string;
    readonly banned_words: readonly string[];
    readonly banned_topics: readonly string[];
    readonly forbidden_cliches: readonly string[];
    readonly max_dialogue_ratio: number;
    readonly min_sensory_anchors_per_scene: number;
    readonly max_scenes: number;
    readonly min_scenes: number;
  };
  readonly genome: {
    readonly target_burstiness: number;
    readonly target_lexical_richness: number;
    readonly target_avg_sentence_length: number;
    readonly target_dialogue_ratio: number;
    readonly target_description_density: number;
    readonly signature_traits: readonly string[];
  };
  readonly emotion: unknown;
}

/**
 * Load golden run and construct ForgePacketInput
 * Throws on any error (fail-closed)
 */
export function loadGoldenRun(
  runPath: string,
  sceneIndex: number,
  runId: string,
): ForgePacketInput {
  // Verify runPath exists
  if (!fs.existsSync(runPath)) {
    throw new Error(`Golden run path not found: ${runPath}`);
  }

  // Read intent.json
  const intentPath = path.join(runPath, '00-intent', 'intent.json');
  if (!fs.existsSync(intentPath)) {
    throw new Error(`Intent file not found: ${intentPath}`);
  }
  const intentJSON: IntentJSON = JSON.parse(fs.readFileSync(intentPath, 'utf8'));

  // Read genesis-plan.json
  const planPath = path.join(runPath, '10-genesis', 'genesis-plan.json');
  if (!fs.existsSync(planPath)) {
    throw new Error(`Genesis plan file not found: ${planPath}`);
  }
  const plan: GenesisPlan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

  // Extract all scenes from all arcs
  const allScenes: Scene[] = [];
  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      allScenes.push(scene);
    }
  }

  // Validate sceneIndex
  if (sceneIndex < 0 || sceneIndex >= allScenes.length) {
    throw new Error(`Scene index ${sceneIndex} out of range (0-${allScenes.length - 1})`);
  }

  const scene = allScenes[sceneIndex];

  // Build StyleProfile from genome
  const style_profile: StyleProfile = buildStyleProfile(intentJSON.genome);

  // Build KillLists from constraints
  const kill_lists: KillLists = buildKillLists(intentJSON.constraints);

  // Build CanonEntry[] from canon
  const canon: readonly CanonEntry[] = intentJSON.canon.entries;

  // Build ForgeContinuity (empty for first scene)
  const continuity: ForgeContinuity = {
    previous_scene_summary: '',
    character_states: [],
    open_threads: [],
  };

  return {
    plan,
    scene,
    style_profile,
    kill_lists,
    canon,
    continuity,
    run_id: runId,
    language: 'fr' as const, // FR PREMIUM — default production language
  };
}

/**
 * Build StyleProfile from genome
 * Maps golden run genome structure to Sovereign Engine StyleProfile
 */
function buildStyleProfile(genome: IntentJSON['genome']): StyleProfile {
  return {
    version: '1.0.0',
    universe: 'golden-run',
    lexicon: {
      signature_words: [...genome.signature_traits],
      forbidden_words: [],
      abstraction_max_ratio: 0.3,
      concrete_min_ratio: 0.6,
    },
    rhythm: {
      avg_sentence_length_target: genome.target_avg_sentence_length,
      gini_target: genome.target_burstiness,
      max_consecutive_similar: 3,
      min_syncopes_per_scene: 2,
      min_compressions_per_scene: 1,
    },
    tone: {
      dominant_register: 'neutral',
      intensity_range: [0.3, 0.8],
    },
    imagery: {
      recurrent_motifs: [],
      density_target_per_100_words: 3.0,
      banned_metaphors: [],
    },
    voice: buildVoiceGenome(genome),
  };
}

/**
 * Build VoiceGenome from intent.json genome — Option A (partial mapping).
 * 4 fields mapped deterministically from intent genome, 6 use defaults.
 * Justification: 4 fields have direct semantic equivalents in intent.json.
 */
function buildVoiceGenome(genome: IntentJSON['genome']): VoiceGenome {
  // normalize: maps value from [min, max] to [0, 1], clamped
  const norm = (v: number, min: number, max: number) =>
    max === min ? 0.5 : Math.max(0, Math.min(1, (v - min) / (max - min)));

  return {
    phrase_length_mean: norm(genome.target_avg_sentence_length, 5, 40),
    dialogue_ratio: Math.max(0, Math.min(1, genome.target_dialogue_ratio)),
    metaphor_density: 0.4,       // no direct mapping — default
    language_register: Math.max(0, Math.min(1, genome.target_lexical_richness)),
    irony_level: 0.2,            // no direct mapping — default
    ellipsis_rate: 0.3,          // no direct mapping — default
    abstraction_ratio: 0.4,      // no direct mapping — default
    punctuation_style: 0.5,      // no direct mapping — default
    paragraph_rhythm: Math.max(0, Math.min(1, genome.target_burstiness)),
    opening_variety: 0.7,        // no direct mapping — default
  };
}

/**
 * Build KillLists from constraints
 * Maps golden run constraints structure to Sovereign Engine KillLists
 */
function buildKillLists(constraints: IntentJSON['constraints']): KillLists {
  return {
    banned_words: [...constraints.banned_words],
    banned_cliches: [...constraints.forbidden_cliches],
    banned_ai_patterns: [
      'as an AI',
      'I apologize',
      'I cannot',
      'I do not have the ability',
      'it is important to note',
    ],
    banned_filter_words: ['just', 'really', 'very', 'quite', 'rather', 'somewhat'],
  };
}
