/**
 * OMEGA Style Emergence Engine -- Type Definitions
 * Phase C.3 -- Voice Signature + Anti-Detection + Tournament Self-Play
 * All types are readonly and immutable by design.
 * Standard: NASA-Grade L4
 */

// Re-export consumed types
export type { GenesisPlan, Canon, Constraints, StyleGenomeInput, EmotionTarget } from '@omega/genesis-planner';
export type { GVerdict } from '@omega/genesis-planner';
export type { ScribeOutput, ProseDoc, ProseParagraph, SkeletonDoc } from '@omega/scribe-engine';

// ═══════════════════════ VERDICTS ═══════════════════════

export type EVerdict = 'PASS' | 'FAIL';

export type EInvariantId =
  | 'E-INV-01' | 'E-INV-02' | 'E-INV-03' | 'E-INV-04' | 'E-INV-05'
  | 'E-INV-06' | 'E-INV-07' | 'E-INV-08' | 'E-INV-09' | 'E-INV-10';

// ═══════════════════════ STYLE METRICS ═══════════════════════

export interface CadenceProfile {
  readonly avg_sentence_length: number;
  readonly sentence_length_stddev: number;
  readonly coefficient_of_variation: number;
  readonly short_ratio: number;
  readonly long_ratio: number;
  readonly sentence_count: number;
}

export interface LexicalProfile {
  readonly type_token_ratio: number;
  readonly hapax_legomena_ratio: number;
  readonly rare_word_ratio: number;
  readonly consecutive_rare_count: number;
  readonly avg_word_length: number;
  readonly vocabulary_size: number;
}

export type SyntacticStructure = 'SVO' | 'inversion' | 'fragment' | 'question'
  | 'exclamation' | 'compound' | 'complex' | 'imperative' | 'passive';

export interface SyntacticProfile {
  readonly structure_distribution: Readonly<Record<SyntacticStructure, number>>;
  readonly unique_structures: number;
  readonly dominant_structure: SyntacticStructure;
  readonly dominant_ratio: number;
  readonly diversity_index: number;
}

export interface DensityProfile {
  readonly description_density: number;
  readonly dialogue_ratio: number;
  readonly sensory_density: number;
  readonly action_density: number;
  readonly introspection_density: number;
}

export interface CoherenceProfile {
  readonly style_drift: number;
  readonly max_local_drift: number;
  readonly voice_stability: number;
  readonly outlier_paragraphs: readonly string[];
}

export interface StyleProfile {
  readonly profile_id: string;
  readonly profile_hash: string;
  readonly cadence: CadenceProfile;
  readonly lexical: LexicalProfile;
  readonly syntactic: SyntacticProfile;
  readonly density: DensityProfile;
  readonly coherence: CoherenceProfile;
  readonly genome_deviation: GenomeDeviation;
  readonly timestamp_deterministic: string;
}

export interface GenomeDeviation {
  readonly burstiness_delta: number;
  readonly lexical_richness_delta: number;
  readonly sentence_length_delta: number;
  readonly dialogue_ratio_delta: number;
  readonly description_density_delta: number;
  readonly max_deviation: number;
  readonly avg_deviation: number;
  readonly all_within_tolerance: boolean;
}

// ═══════════════════════ DETECTION ═══════════════════════

export interface IADetectionResult {
  readonly score: number;
  readonly patterns_found: readonly string[];
  readonly pattern_count: number;
  readonly verdict: EVerdict;
  readonly details: readonly DetectionFinding[];
}

export interface DetectionFinding {
  readonly pattern: string;
  readonly paragraph_id: string;
  readonly context: string;
  readonly severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface GenreDetectionResult {
  readonly genre_scores: Readonly<Record<string, number>>;
  readonly top_genre: string;
  readonly top_score: number;
  readonly specificity: number;
  readonly verdict: EVerdict;
  readonly genre_markers_found: readonly string[];
}

export interface BanalityResult {
  readonly cliche_count: number;
  readonly ia_speak_count: number;
  readonly generic_transition_count: number;
  readonly total_banality: number;
  readonly verdict: EVerdict;
  readonly findings: readonly string[];
}

// ═══════════════════════ TOURNAMENT ═══════════════════════

export interface StyleVariant {
  readonly variant_id: string;
  readonly paragraph_id: string;
  readonly text: string;
  readonly variation_seed: number;
  readonly style_profile: StyleProfile;
  readonly ia_score: number;
  readonly genre_specificity: number;
  readonly banality_count: number;
}

export interface VariantScore {
  readonly variant_id: string;
  readonly genome_compliance: number;
  readonly anti_ia_score: number;
  readonly anti_genre_score: number;
  readonly anti_banality_score: number;
  readonly cadence_score: number;
  readonly lexical_score: number;
  readonly composite_score: number;
}

export interface TournamentRound {
  readonly paragraph_id: string;
  readonly variants: readonly StyleVariant[];
  readonly scores: readonly VariantScore[];
  readonly selected_variant_id: string;
  readonly selection_reason: string;
}

export interface TournamentResult {
  readonly tournament_id: string;
  readonly tournament_hash: string;
  readonly rounds: readonly TournamentRound[];
  readonly total_variants_generated: number;
  readonly total_rounds: number;
  readonly avg_composite_score: number;
}

// ═══════════════════════ OUTPUT ═══════════════════════

export interface StyledParagraph {
  readonly paragraph_id: string;
  readonly original_paragraph_id: string;
  readonly text: string;
  readonly word_count: number;
  readonly sentence_count: number;
  readonly selected_variant_id: string;
  readonly style_profile: StyleProfile;
}

export interface StyledOutput {
  readonly output_id: string;
  readonly output_hash: string;
  readonly scribe_output_id: string;
  readonly scribe_output_hash: string;
  readonly plan_id: string;
  readonly paragraphs: readonly StyledParagraph[];
  readonly global_profile: StyleProfile;
  readonly ia_detection: IADetectionResult;
  readonly genre_detection: GenreDetectionResult;
  readonly banality_result: BanalityResult;
  readonly tournament: TournamentResult;
  readonly total_word_count: number;
}

// ═══════════════════════ CONFIG ═══════════════════════

export interface EConfigSymbol {
  readonly value: number | string | readonly string[] | Readonly<Record<string, readonly string[]>>;
  readonly unit: string;
  readonly rule: string;
  readonly derivation: string;
}

export interface EConfig {
  readonly TOURNAMENT_VARIANTS_PER_PARAGRAPH: EConfigSymbol;
  readonly TOURNAMENT_MIN_VARIANTS: EConfigSymbol;
  readonly STYLE_MAX_DEVIATION: EConfigSymbol;
  readonly CADENCE_TOLERANCE: EConfigSymbol;
  readonly LEXICAL_MIN_RARITY: EConfigSymbol;
  readonly LEXICAL_MAX_RARITY: EConfigSymbol;
  readonly LEXICAL_MAX_CONSECUTIVE_RARE: EConfigSymbol;
  readonly SYNTACTIC_MIN_TYPES: EConfigSymbol;
  readonly SYNTACTIC_MAX_RATIO: EConfigSymbol;
  readonly IA_MAX_DETECTION_SCORE: EConfigSymbol;
  readonly IA_DETECTION_PATTERNS: EConfigSymbol;
  readonly GENRE_MAX_SPECIFICITY: EConfigSymbol;
  readonly GENRE_MARKERS: EConfigSymbol;
  readonly VOICE_MAX_DRIFT: EConfigSymbol;
  readonly SCORE_WEIGHT_GENOME: EConfigSymbol;
  readonly SCORE_WEIGHT_ANTI_IA: EConfigSymbol;
  readonly SCORE_WEIGHT_ANTI_GENRE: EConfigSymbol;
  readonly SCORE_WEIGHT_ANTI_BANALITY: EConfigSymbol;
}

// ═══════════════════════ EVIDENCE ═══════════════════════

export interface EEvidenceStep {
  readonly step: string;
  readonly input_hash: string;
  readonly output_hash: string;
  readonly rule_applied: string;
  readonly verdict: EVerdict;
  readonly timestamp_deterministic: string;
}

export interface EEvidenceChain {
  readonly output_id: string;
  readonly steps: readonly EEvidenceStep[];
  readonly chain_hash: string;
}

// ═══════════════════════ REPORT ═══════════════════════

export interface StyleMetrics {
  readonly total_words: number;
  readonly total_sentences: number;
  readonly total_paragraphs: number;
  readonly burstiness_actual: number;
  readonly burstiness_target: number;
  readonly lexical_richness_actual: number;
  readonly lexical_richness_target: number;
  readonly avg_sentence_length_actual: number;
  readonly avg_sentence_length_target: number;
  readonly ia_detection_score: number;
  readonly genre_specificity: number;
  readonly banality_total: number;
  readonly voice_stability: number;
  readonly tournament_rounds: number;
  readonly tournament_avg_score: number;
  readonly genome_max_deviation: number;
  readonly syntactic_diversity: number;
  readonly rare_word_ratio: number;
}

export interface StyleReport {
  readonly output_id: string;
  readonly output_hash: string;
  readonly plan_id: string;
  readonly verdict: EVerdict;
  readonly style_profile: StyleProfile;
  readonly ia_detection: IADetectionResult;
  readonly genre_detection: GenreDetectionResult;
  readonly metrics: StyleMetrics;
  readonly evidence: EEvidenceChain;
  readonly config_hash: string;
  readonly invariants_checked: readonly EInvariantId[];
  readonly invariants_passed: readonly EInvariantId[];
  readonly timestamp_deterministic: string;
}
