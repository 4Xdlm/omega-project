/**
 * OMEGA V2.3-A P1 — buildForgePacketFromSegment (Option P1-a, CONSTRUCTION DIRECTE)
 *
 * Pont P0 -> ForgePacket pour le mode RÉÉCRITURE/EXPANSION (ADR_V2_3 Option B).
 * Construit DIRECTEMENT un ForgePacket minimal valide en INJECTANT le contrat
 * dérivé par P0 (deriveEmotionContractFromSegment). N'appelle PAS assembleForgePacket
 * (genesis-plan-couplé + re-dériverait le 14d dormant — cf design P1 §1, FORBID-CANON-GARAGE-001).
 *
 * CONTRAT D'ISOLEMENT (Tribunal 2/2 GO_CODE P1-a 2026-05-29) :
 *   - Zéro appel generation/, zéro generateChunkedDraft, zéro assembleForgePacket.
 *   - Zéro LLM/Ollama/réseau, déterministe (même (segment, candidate) -> même packet/hash).
 *   - emotion_contract = candidate.contract (P0) INJECTÉ tel quel (target_14d={} reste dormant).
 *   - beats : 1 beat déterministe minimum (correction ChatGPT : beats=[] interdit car
 *     forgePacketToSceneBrief lit beats[].action -> brief pauvre si vide).
 *   - Ne modifie PAS ForgePacket/EmotionContract (schémas figés). Aucun champ fantôme.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A — Sprint V2.3-A P1 2026-05-29
 */

import { createHash } from 'node:crypto';
import type {
  ForgePacket,
  ForgeIntent,
  ForgeBeat,
  ForgeSubtext,
  ForgeSensory,
  StyleProfile,
  KillLists,
  ForgeContinuity,
  ForgeSeeds,
  ForgeGeneration,
} from '../types.js';
import type { EmotionContractCandidate, WarningCode } from './deriveEmotionContract.js';

export interface ForgePacketCandidate {
  readonly packet: ForgePacket;
  readonly confidence: number; // hérité de candidate.confidence (P0)
  readonly warning_codes: readonly WarningCode[];
  readonly evidence: Readonly<Record<string, number | string>>;
  readonly source_segment_hash: string;
}

export interface BuildForgePacketOptions {
  readonly language?: 'fr' | 'en';
  readonly run_id?: string;
  readonly target_word_count?: number;
}

/** Sentinelle déterministe (déterminisme P1 : aucun timestamp wall-clock). */
const DETERMINISTIC_TIMESTAMP = '1970-01-01T00:00:00.000Z';
const GENERATOR_VERSION = 'v2.3-a-p1-rewrite';

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function neutralSubtext(tensionIntensity: number): ForgeSubtext {
  return { layers: [], tension_type: 'derived_from_segment', tension_intensity: tensionIntensity };
}
function neutralSensory(): ForgeSensory {
  return { density_target: 0, categories: [], recurrent_motifs: [], banned_metaphors: [] };
}
function neutralStyleGenome(): StyleProfile {
  return {
    version: '0.0.0-rewrite',
    universe: 'rewrite_mode',
    lexicon: {
      signature_words: [],
      forbidden_words: [],
      abstraction_max_ratio: 0.2,
      concrete_min_ratio: 0.6,
    },
    rhythm: {
      avg_sentence_length_target: 18,
      gini_target: 0.45,
      max_consecutive_similar: 2,
      min_syncopes_per_scene: 2,
      min_compressions_per_scene: 1,
    },
    tone: { dominant_register: 'neutre', intensity_range: [0, 1] },
    imagery: { recurrent_motifs: [], density_target_per_100_words: 0, banned_metaphors: [] },
  };
}
function neutralKillLists(): KillLists {
  return { banned_words: [], banned_cliches: [], banned_ai_patterns: [], banned_filter_words: [] };
}
function neutralContinuity(): ForgeContinuity {
  return { previous_scene_summary: '', character_states: [], open_threads: [] };
}
function seeds(shortHash: string): ForgeSeeds {
  return { llm_seed: `seg_${shortHash}`, determinism_level: 'absolute' };
}
function generation(constraintsHash: string): ForgeGeneration {
  return {
    timestamp: DETERMINISTIC_TIMESTAMP,
    generator_version: GENERATOR_VERSION,
    constraints_hash: constraintsHash,
  };
}

/**
 * Construit un ForgePacket de mode réécriture à partir du segment source + contrat P0.
 * @param segment   prose source (le même segment passé à P0)
 * @param candidate sortie de deriveEmotionContractFromSegment
 */
export function buildForgePacketFromSegment(
  segment: string,
  candidate: EmotionContractCandidate,
  opts: BuildForgePacketOptions = {}
): ForgePacketCandidate {
  // Garde de cohérence : le candidate (P0) doit provenir DU segment fourni.
  const normalized = segment.replace(/\s+/g, ' ').trim();
  if (sha256(normalized) !== candidate.segment_hash) {
    throw new Error(
      'buildForgePacketFromSegment: candidate.segment_hash ne correspond pas au segment fourni (P0/P1 desynchronises).'
    );
  }
  const language = opts.language ?? 'fr';
  const sh = candidate.segment_hash;
  const shortHash = sh.slice(0, 12);
  const wordCount = Number(candidate.evidence['word_count'] ?? 0);
  const targetWords = opts.target_word_count ?? Math.max(1, wordCount);
  const run_id = opts.run_id ?? `rewrite_${shortHash}`;

  const contract = candidate.contract;
  const q1 = contract.curve_quartiles[0];
  const q4 = contract.curve_quartiles[3];
  const intensityMax = contract.intensity_range.max;

  const intent: ForgeIntent = {
    story_goal: 'Réécriture fidèle du segment source (mode V2.3 réécriture/expansion).',
    scene_goal:
      'Réécrire et/ou étendre ce segment en préservant son intention, son contenu narratif et son contrat émotionnel dérivé (P0).',
    conflict_type: 'preserved_from_source',
    pov: 'unchanged',
    tense: 'unchanged',
    target_word_count: targetWords,
  };

  // 1 beat déterministe (correction Tribunal : beats=[] interdit).
  const beats: readonly ForgeBeat[] = [
    {
      beat_id: `seg_${shortHash}_beat_0`,
      beat_order: 0,
      action:
        'Réécrire le segment source en préservant son intention, son contenu narratif et son contrat émotionnel dérivé.',
      dialogue: '',
      subtext_type: 'rewrite',
      emotion_instruction: `Trajectoire ${q1.dominant} (Q1) -> ${q4.dominant} (Q4), arousal max ${intensityMax.toFixed(2)}.`,
      sensory_tags: [],
      canon_refs: [],
    },
  ];

  // packet_hash déterministe = sha256 des champs porteurs de sens (intent + contrat + beats + ids).
  const packetSeed = JSON.stringify({ sh, intent, contract, beats, language, run_id });
  const packet_hash = sha256(packetSeed);
  const constraints_hash = sha256(`constraints:${packetSeed}`);

  const packet: ForgePacket = {
    packet_id: `FORGE_rewrite_${shortHash}`,
    packet_hash,
    scene_id: `seg_${shortHash}`,
    run_id,
    quality_tier: 'sovereign',
    language,
    intent,
    emotion_contract: contract, // INJECTION P0 — pas de re-dérivation, target_14d={} dormant préservé
    beats,
    subtext: neutralSubtext(intensityMax),
    sensory: neutralSensory(),
    style_genome: neutralStyleGenome(),
    kill_lists: neutralKillLists(),
    canon: [],
    continuity: neutralContinuity(),
    seeds: seeds(shortHash),
    generation: generation(constraints_hash),
  };

  const evidence: Record<string, number | string> = {
    source_word_count: wordCount,
    target_word_count: targetWords,
    beats_count: beats.length,
    q1_dominant: q1.dominant,
    q4_dominant: q4.dominant,
    p0_confidence: candidate.confidence,
  };

  return {
    packet,
    confidence: candidate.confidence, // hérité strictement de P0
    warning_codes: candidate.warning_codes, // propagés tels quels
    evidence,
    source_segment_hash: sh,
  };
}
