/**
 * OMEGA Metrics — Prose Quality Metrics
 * Phase P.2-B Gate B4 — Measures prose artifacts from ProsePack v1
 *
 * Metrics:
 *   MP1: prose_schema_valid (bool→0/1)
 *   MP2: constraint_satisfaction (0..1) — from ProsePack score
 *   MP3: pov_tense_consistency (0..1) — scenes with correct POV+tense / total
 *   MP4: lexical_repetition_rate (0..1 inverted — higher=better)
 *   MP5: sensory_anchor_density (per 1000 words)
 *   MP6: dialogue_ratio_conformity (0..1)
 */

import { sha256 } from '@omega/canon-kernel';

// ─── Types ───────────────────────────────────────────────────────

export interface ProseMetricsInput {
  /** Parsed ProsePack JSON */
  readonly prosePack: {
    readonly meta: { readonly version: string };
    readonly constraints: {
      readonly pov: string;
      readonly tense: string;
      readonly max_dialogue_ratio: number;
      readonly min_sensory_anchors_per_scene: number;
    };
    readonly scenes: readonly Array<{
      readonly scene_id: string;
      readonly word_count: number;
      readonly pov_detected: string;
      readonly tense_detected: string;
      readonly sensory_anchor_count: number;
      readonly dialogue_ratio: number;
      readonly paragraphs: readonly string[];
      readonly violations: readonly Array<{ readonly severity: string }>;
    }>;
    readonly score: {
      readonly schema_ok: boolean;
      readonly constraint_satisfaction: number;
      readonly hard_pass: boolean;
    };
    readonly total_words: number;
  };
}

export interface ProseMetricsResult {
  readonly mp1_schema_valid: number;
  readonly mp2_constraint_satisfaction: number;
  readonly mp3_pov_tense_consistency: number;
  readonly mp4_lexical_diversity: number;
  readonly mp5_sensory_density: number;
  readonly mp6_dialogue_conformity: number;
  readonly prose_composite: number;
}

// ─── MP1: Schema Valid ───────────────────────────────────────────

export function mp1SchemaValid(input: ProseMetricsInput): number {
  const pp = input.prosePack;
  if (!pp.meta?.version) return 0;
  if (pp.meta.version !== '1.0.0') return 0;
  if (!pp.scenes || pp.scenes.length === 0) return 0;
  if (!pp.score) return 0;
  return pp.score.schema_ok ? 1 : 0;
}

// ─── MP2: Constraint Satisfaction ────────────────────────────────

export function mp2ConstraintSatisfaction(input: ProseMetricsInput): number {
  return input.prosePack.score.constraint_satisfaction;
}

// ─── MP3: POV + Tense Consistency ────────────────────────────────

export function mp3PovTenseConsistency(input: ProseMetricsInput): number {
  const pp = input.prosePack;
  const scenes = pp.scenes;
  if (scenes.length === 0) return 0;

  let conformScenes = 0;
  for (const scene of scenes) {
    const povOk =
      scene.pov_detected === 'unknown' ||
      (pp.constraints.pov === 'first' && scene.pov_detected === 'first') ||
      (pp.constraints.pov.startsWith('third') && scene.pov_detected.startsWith('third'));
    const tenseOk =
      scene.tense_detected === 'unknown' ||
      scene.tense_detected === pp.constraints.tense;

    if (povOk && tenseOk) conformScenes++;
  }

  return conformScenes / scenes.length;
}

// ─── MP4: Lexical Diversity ──────────────────────────────────────

export function mp4LexicalDiversity(input: ProseMetricsInput): number {
  const allText = input.prosePack.scenes
    .flatMap(s => s.paragraphs)
    .join(' ')
    .toLowerCase();

  const words = allText.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return 0;

  const uniqueWords = new Set(words);
  // Type-token ratio (TTR) — normalized for text length
  // Use root TTR (Guiraud) = unique / sqrt(total) for length independence
  const guiraud = uniqueWords.size / Math.sqrt(words.length);
  // Normalize to 0..1 range (typical Guiraud: 5-15 for literary text)
  return Math.min(1, guiraud / 15);
}

// ─── MP5: Sensory Anchor Density ─────────────────────────────────

export function mp5SensoryDensity(input: ProseMetricsInput): number {
  const pp = input.prosePack;
  if (pp.total_words === 0) return 0;

  const totalAnchors = pp.scenes.reduce((s, sc) => s + sc.sensory_anchor_count, 0);
  // Density per 1000 words, capped at 1.0 for score
  const density = (totalAnchors / pp.total_words) * 1000;
  // Normalize: 10+ anchors per 1000 words = 1.0
  return Math.min(1, density / 10);
}

// ─── MP6: Dialogue Conformity ────────────────────────────────────

export function mp6DialogueConformity(input: ProseMetricsInput): number {
  const pp = input.prosePack;
  const scenes = pp.scenes;
  if (scenes.length === 0) return 0;
  if (pp.constraints.max_dialogue_ratio <= 0) return 1; // no dialogue constraint

  let conformScenes = 0;
  for (const scene of scenes) {
    if (scene.dialogue_ratio <= pp.constraints.max_dialogue_ratio) {
      conformScenes++;
    }
  }

  return conformScenes / scenes.length;
}

// ─── Composite ───────────────────────────────────────────────────

export function computeProseMetrics(input: ProseMetricsInput): ProseMetricsResult {
  const mp1 = mp1SchemaValid(input);
  const mp2 = mp2ConstraintSatisfaction(input);
  const mp3 = mp3PovTenseConsistency(input);
  const mp4 = mp4LexicalDiversity(input);
  const mp5 = mp5SensoryDensity(input);
  const mp6 = mp6DialogueConformity(input);

  // Weighted composite: mp1+mp2 are critical, mp3-mp6 are quality
  const composite = mp1 * 0.15 + mp2 * 0.25 + mp3 * 0.20 + mp4 * 0.15 + mp5 * 0.10 + mp6 * 0.15;

  return {
    mp1_schema_valid: mp1,
    mp2_constraint_satisfaction: mp2,
    mp3_pov_tense_consistency: mp3,
    mp4_lexical_diversity: mp4,
    mp5_sensory_density: mp5,
    mp6_dialogue_conformity: mp6,
    prose_composite: composite,
  };
}
