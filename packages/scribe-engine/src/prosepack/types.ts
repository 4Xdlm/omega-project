/**
 * OMEGA Scribe Engine — ProsePack v1 Types
 * Phase P.2-B — Canonical prose artifact format
 * Strict, auditable, fail-closed
 */

/** ProsePack metadata */
export interface ProsePackMeta {
  readonly version: '1.0.0';
  readonly run_id: string;
  readonly plan_id: string;
  readonly plan_hash: string;
  readonly skeleton_hash: string;
  readonly prose_hash: string;
  readonly model: string;
  readonly provider_mode: 'mock' | 'llm' | 'cache';
  readonly temperature: number;
  readonly created_utc: string;
}

/** Per-scene constraint violations */
export interface ProseViolation {
  readonly scene_id: string;
  readonly rule: string;
  readonly severity: 'HARD' | 'SOFT';
  readonly message: string;
  readonly value: number | string;
  readonly threshold: number | string;
}

/** Per-scene prose data */
export interface ProsePackScene {
  readonly scene_id: string;
  readonly arc_id: string;
  readonly paragraphs: readonly string[];
  readonly word_count: number;
  readonly sentence_count: number;
  readonly target_word_count: number;
  readonly pov_detected: 'first' | 'third-limited' | 'third-omniscient' | 'second' | 'unknown';
  readonly tense_detected: 'past' | 'present' | 'unknown';
  readonly sensory_anchor_count: number;
  readonly dialogue_ratio: number;
  readonly banned_word_hits: readonly string[];
  readonly cliche_hits: readonly string[];
  readonly violations: readonly ProseViolation[];
}

/** Constraint satisfaction summary */
export interface ProsePackScore {
  readonly schema_ok: boolean;
  readonly constraint_satisfaction: number;
  readonly hard_pass: boolean;
  readonly soft_pass: boolean;
  readonly total_violations: number;
  readonly hard_violations: number;
  readonly soft_violations: number;
}

/** Constraint config (from intent) */
export interface ProseConstraintConfig {
  readonly pov: string;
  readonly tense: string;
  readonly min_scenes: number;
  readonly max_scenes: number;
  readonly banned_words: readonly string[];
  readonly forbidden_cliches: readonly string[];
  readonly max_dialogue_ratio: number;
  readonly min_sensory_anchors_per_scene: number;
  readonly word_count_tolerance: number; // 0.3 = ±30%
}

/** Complete ProsePack v1 */
export interface ProsePack {
  readonly meta: ProsePackMeta;
  readonly constraints: ProseConstraintConfig;
  readonly scenes: readonly ProsePackScene[];
  readonly score: ProsePackScore;
  readonly total_words: number;
  readonly total_sentences: number;
  readonly total_paragraphs: number;
}
