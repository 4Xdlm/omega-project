/**
 * OMEGA Genesis Planner — Type Definitions
 * Phase C.1 — Deterministic Narrative Structure Engine
 * All types are readonly and immutable by design.
 * Standard: NASA-Grade L4
 */

// ═══════════════════════ VERDICTS ═══════════════════════

export type GVerdict = 'PASS' | 'FAIL';

export type GInvariantId =
  | 'G-INV-01' | 'G-INV-02' | 'G-INV-03' | 'G-INV-04' | 'G-INV-05'
  | 'G-INV-06' | 'G-INV-07' | 'G-INV-08' | 'G-INV-09' | 'G-INV-10';

// ═══════════════════════ 5 INPUTS ═══════════════════════

export interface Intent {
  readonly title: string;
  readonly premise: string;
  readonly themes: readonly string[];
  readonly core_emotion: string;
  readonly target_audience: string;
  readonly message: string;
  readonly target_word_count: number;
}

export type CanonCategory = 'character' | 'world' | 'event' | 'rule' | 'relationship';

export interface CanonEntry {
  readonly id: string;
  readonly category: CanonCategory;
  readonly statement: string;
  readonly immutable: boolean;
}

export interface Canon {
  readonly entries: readonly CanonEntry[];
}

export type POV = 'first' | 'third-limited' | 'third-omniscient' | 'second' | 'mixed';
export type Tense = 'past' | 'present' | 'mixed';

export interface Constraints {
  readonly pov: POV;
  readonly tense: Tense;
  readonly banned_words: readonly string[];
  readonly banned_topics: readonly string[];
  readonly max_dialogue_ratio: number;
  readonly min_sensory_anchors_per_scene: number;
  readonly max_scenes: number;
  readonly min_scenes: number;
  readonly forbidden_cliches: readonly string[];
}

export interface StyleGenomeInput {
  readonly target_burstiness: number;
  readonly target_lexical_richness: number;
  readonly target_avg_sentence_length: number;
  readonly target_dialogue_ratio: number;
  readonly target_description_density: number;
  readonly signature_traits: readonly string[];
}

export interface EmotionWaypoint {
  readonly position: number;
  readonly emotion: string;
  readonly intensity: number;
}

export interface EmotionTarget {
  readonly arc_emotion: string;
  readonly waypoints: readonly EmotionWaypoint[];
  readonly climax_position: number;
  readonly resolution_emotion: string;
}

// ═══════════════════════ PLAN OUTPUT ═══════════════════════

export type SeedType = 'thematic' | 'character' | 'plot' | 'symbol' | 'emotional';
export type ConflictType = 'internal' | 'external' | 'relational' | 'societal' | 'existential';
export type SubtextTensionType = 'dramatic_irony' | 'suspense' | 'hidden_motive' | 'unspoken_desire' | 'suppressed_emotion';

export interface Seed {
  readonly id: string;
  readonly type: SeedType;
  readonly description: string;
  readonly planted_in: string;
  readonly blooms_in: string;
}

export interface SubtextLayer {
  readonly character_thinks: string;
  readonly reader_knows: string;
  readonly tension_type: SubtextTensionType;
  readonly implied_emotion: string;
}

export interface Beat {
  readonly beat_id: string;
  readonly action: string;
  readonly intention: string;
  readonly pivot: boolean;
  readonly tension_delta: -1 | 0 | 1;
  readonly information_revealed: readonly string[];
  readonly information_withheld: readonly string[];
}

export interface Scene {
  readonly scene_id: string;
  readonly arc_id: string;
  readonly objective: string;
  readonly conflict: string;
  readonly conflict_type: ConflictType;
  readonly emotion_target: string;
  readonly emotion_intensity: number;
  readonly seeds_planted: readonly string[];
  readonly seeds_bloomed: readonly string[];
  readonly subtext: SubtextLayer;
  readonly sensory_anchor: string;
  readonly constraints: readonly string[];
  readonly beats: readonly Beat[];
  readonly target_word_count: number;
  readonly justification: string;
}

export interface Arc {
  readonly arc_id: string;
  readonly theme: string;
  readonly progression: string;
  readonly scenes: readonly Scene[];
  readonly justification: string;
}

export interface GenesisPlan {
  readonly plan_id: string;
  readonly plan_hash: string;
  readonly version: '1.0.0';
  readonly intent_hash: string;
  readonly canon_hash: string;
  readonly constraints_hash: string;
  readonly genome_hash: string;
  readonly emotion_hash: string;
  readonly arcs: readonly Arc[];
  readonly seed_registry: readonly Seed[];
  readonly tension_curve: readonly number[];
  readonly emotion_trajectory: readonly EmotionWaypoint[];
  readonly scene_count: number;
  readonly beat_count: number;
  readonly estimated_word_count: number;
}

// ═══════════════════════ VALIDATION ═══════════════════════

export interface ValidationError {
  readonly invariant: GInvariantId;
  readonly path: string;
  readonly message: string;
  readonly severity: 'FATAL' | 'ERROR';
}

export interface ValidationResult {
  readonly verdict: GVerdict;
  readonly errors: readonly ValidationError[];
  readonly invariants_checked: readonly GInvariantId[];
  readonly invariants_passed: readonly GInvariantId[];
  readonly timestamp_deterministic: string;
}

// ═══════════════════════ CONFIG ═══════════════════════

export interface GConfigSymbol {
  readonly value: number | string;
  readonly unit: string;
  readonly rule: string;
  readonly derivation: string;
  readonly alternatives?: readonly string[];
  readonly override?: string;
}

export interface GConfig {
  readonly MAX_TENSION_PLATEAU: GConfigSymbol;
  readonly MAX_TENSION_DROP: GConfigSymbol;
  readonly MIN_BEATS_PER_SCENE: GConfigSymbol;
  readonly MAX_BEATS_PER_SCENE: GConfigSymbol;
  readonly MIN_SEEDS: GConfigSymbol;
  readonly SEED_BLOOM_MAX_DISTANCE: GConfigSymbol;
  readonly MIN_CONFLICT_TYPES: GConfigSymbol;
  readonly EMOTION_COVERAGE_THRESHOLD: GConfigSymbol;
}

// ═══════════════════════ EVIDENCE ═══════════════════════

export interface GEvidenceStep {
  readonly step: string;
  readonly input_hash: string;
  readonly output_hash: string;
  readonly rule_applied: string;
  readonly verdict: GVerdict;
  readonly timestamp_deterministic: string;
}

export interface GEvidenceChain {
  readonly plan_id: string;
  readonly steps: readonly GEvidenceStep[];
  readonly chain_hash: string;
}

// ═══════════════════════ REPORT ═══════════════════════

export interface GenesisMetrics {
  readonly arc_count: number;
  readonly scene_count: number;
  readonly beat_count: number;
  readonly seed_count: number;
  readonly tension_curve_length: number;
  readonly emotion_coverage_percent: number;
  readonly subtext_coverage_percent: number;
  readonly avg_beats_per_scene: number;
  readonly conflict_type_diversity: number;
}

export interface GenesisReport {
  readonly plan_id: string;
  readonly plan_hash: string;
  readonly verdict: GVerdict;
  readonly validation: ValidationResult;
  readonly evidence: GEvidenceChain;
  readonly metrics: GenesisMetrics;
  readonly config_hash: string;
  readonly timestamp_deterministic: string;
}
