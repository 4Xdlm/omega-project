/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — TYPE DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: types.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * All types are immutable (readonly) and frozen.
 * No `any`, no optional emotion fields, no compromises.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// FORGE PACKET — INPUT CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

export type QualityTier = 'sovereign';

export interface ForgePacket {
  readonly packet_id: string;
  readonly packet_hash: string;
  readonly scene_id: string;
  readonly run_id: string;
  readonly quality_tier: QualityTier;
  readonly language: 'fr' | 'en';
  readonly intent: ForgeIntent;
  readonly emotion_contract: EmotionContract;
  readonly beats: readonly ForgeBeat[];
  readonly subtext: ForgeSubtext;
  readonly sensory: ForgeSensory;
  readonly style_genome: StyleProfile;
  readonly kill_lists: KillLists;
  readonly canon: readonly CanonEntry[];
  readonly continuity: ForgeContinuity;
  readonly seeds: ForgeSeeds;
  readonly generation: ForgeGeneration;
}

export interface ForgeIntent {
  readonly story_goal: string;
  readonly scene_goal: string;
  readonly conflict_type: string;
  readonly pov: string;
  readonly tense: string;
  readonly target_word_count: number;
}

export interface EmotionContract {
  readonly curve_quartiles: readonly [
    EmotionQuartile,
    EmotionQuartile,
    EmotionQuartile,
    EmotionQuartile
  ];
  readonly intensity_range: { readonly min: number; readonly max: number };
  readonly tension: TensionTargets;
  readonly terminal_state: EmotionTerminal;
  readonly rupture: EmotionRupture;
  readonly valence_arc: ValenceArc;
}

export interface EmotionQuartile {
  readonly quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  readonly target_14d: Record<string, number>;
  readonly target_omega?: { readonly X: number; readonly Y: number; readonly Z: number }; // NOUVEAU — XYZ space
  readonly valence: number;
  readonly arousal: number;
  readonly dominant: string;
  readonly narrative_instruction: string;
}

export interface TensionTargets {
  readonly slope_target: 'ascending' | 'descending' | 'arc' | 'reverse_arc';
  readonly pic_position_pct: number;
  readonly faille_position_pct: number;
  readonly silence_zones: readonly { readonly start_pct: number; readonly end_pct: number }[];
}

export interface EmotionTerminal {
  readonly target_14d: Record<string, number>;
  readonly valence: number;
  readonly arousal: number;
  readonly dominant: string;
  readonly reader_state: string;
}

export interface EmotionRupture {
  readonly exists: boolean;
  readonly position_pct: number;
  readonly before_dominant: string;
  readonly after_dominant: string;
  readonly delta_valence: number;
}

export interface ValenceArc {
  readonly start: number;
  readonly end: number;
  readonly direction: 'darkening' | 'brightening' | 'stable' | 'oscillating';
}

export interface ForgeBeat {
  readonly beat_id: string;
  readonly beat_order: number;
  readonly action: string;
  readonly dialogue: string;
  readonly subtext_type: string;
  readonly emotion_instruction: string;
  readonly sensory_tags: readonly string[];
  readonly canon_refs: readonly string[];
}

export interface ForgeSubtext {
  readonly layers: readonly SubtextLayer[];
  readonly tension_type: string;
  readonly tension_intensity: number;
}

export interface SubtextLayer {
  readonly layer_id: string;
  readonly type: string;
  readonly statement: string;
  readonly visibility: 'implicit' | 'buried' | 'surface';
}

export interface ForgeSensory {
  readonly density_target: number;
  readonly categories: readonly SensoryCategoryTarget[];
  readonly recurrent_motifs: readonly string[];
  readonly banned_metaphors: readonly string[];
}

export interface SensoryCategoryTarget {
  readonly category: 'sight' | 'sound' | 'touch' | 'smell' | 'taste' | 'proprioception' | 'interoception';
  readonly min_count: number;
  readonly signature_words: readonly string[];
}

export interface StyleProfile {
  readonly version: string;
  readonly universe: string;
  readonly lexicon: {
    readonly signature_words: readonly string[];
    readonly forbidden_words: readonly string[];
    readonly abstraction_max_ratio: number;
    readonly concrete_min_ratio: number;
  };
  readonly rhythm: {
    readonly avg_sentence_length_target: number;
    readonly gini_target: number;
    readonly max_consecutive_similar: number;
    readonly min_syncopes_per_scene: number;
    readonly min_compressions_per_scene: number;
  };
  readonly tone: {
    readonly dominant_register: string;
    readonly intensity_range: readonly [number, number];
  };
  readonly imagery: {
    readonly recurrent_motifs: readonly string[];
    readonly density_target_per_100_words: number;
    readonly banned_metaphors: readonly string[];
  };
}

export interface KillLists {
  readonly banned_words: readonly string[];
  readonly banned_cliches: readonly string[];
  readonly banned_ai_patterns: readonly string[];
  readonly banned_filter_words: readonly string[];
}

export interface CanonEntry {
  readonly id: string;
  readonly statement: string;
}

export interface ForgeContinuity {
  readonly previous_scene_summary: string;
  readonly character_states: readonly CharacterState[];
  readonly open_threads: readonly string[];
}

export interface CharacterState {
  readonly character_id: string;
  readonly character_name: string;
  readonly emotional_state: string;
  readonly physical_state: string;
  readonly location: string;
}

export interface ForgeSeeds {
  readonly llm_seed: string;
  readonly determinism_level: 'absolute' | 'high' | 'medium';
}

export interface ForgeGeneration {
  readonly timestamp: string;
  readonly generator_version: string;
  readonly constraints_hash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELTA REPORT — TRUTH MEASUREMENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DeltaReport {
  readonly report_id: string;
  readonly report_hash: string;
  readonly scene_id: string;
  readonly timestamp: string;
  readonly emotion_delta: EmotionDelta;
  readonly tension_delta: TensionDelta;
  readonly style_delta: StyleDelta;
  readonly cliche_delta: ClicheDelta;
  readonly global_distance: number;
  readonly physics_delta?: PhysicsDelta;           // Sprint 3.2
  readonly prescriptions_delta?: PrescriptionsDelta; // Sprint 3.3 (placeholder en 3.2)
}

export interface EmotionDelta {
  readonly quartile_distances: readonly QuartileDistance[];
  readonly curve_correlation: number;
  readonly terminal_distance: number;
  readonly rupture_detected: boolean;
  readonly rupture_timing_error: number;
}

export interface QuartileDistance {
  readonly quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  readonly euclidean_distance: number;
  readonly cosine_similarity: number;
  readonly valence_delta: number;
  readonly arousal_delta: number;
  readonly dominant_match: boolean;
}

export interface TensionDelta {
  readonly slope_match: number;
  readonly pic_present: boolean;
  readonly pic_timing_error: number;
  readonly faille_present: boolean;
  readonly faille_timing_error: number;
  readonly consequence_present: boolean;
  readonly monotony_score: number;
}

export interface StyleDelta {
  readonly gini_actual: number;
  readonly gini_target: number;
  readonly gini_delta: number;
  readonly sensory_density_actual: number;
  readonly sensory_density_target: number;
  readonly abstraction_ratio_actual: number;
  readonly abstraction_ratio_target: number;
  readonly signature_hit_rate: number;
  readonly monotony_sequences: number;
  readonly opening_repetition_rate: number;
}

export interface ClicheDelta {
  readonly total_matches: number;
  readonly matches: readonly ClicheMatch[];
  readonly ai_pattern_matches: number;
  readonly filter_word_matches: number;
}

export interface ClicheMatch {
  readonly pattern: string;
  readonly location: string;
  readonly category: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELTA-PHYSICS + PRESCRIPTIONS — SPRINT 3.2+3.3 (INFORMATIF)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PhysicsDelta {
  readonly enabled: boolean;
  readonly physics_score: number;
  readonly trajectory_compliance: {
    readonly cosine_avg: number;
    readonly euclidean_avg: number;
  };
  readonly violations: {
    readonly dead_zones_count: number;
    readonly forced_transitions_count: number;
    readonly feasibility_failures_count: number;
  };
  readonly delta_hash: string;
}

export interface PrescriptionsDelta {
  readonly enabled: boolean;
  readonly count: number;
  readonly severity_histogram: {
    readonly critical: number;
    readonly high: number;
    readonly medium: number;
  };
  readonly delta_hash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// S-SCORE — AESTHETIC MEASUREMENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface SScore {
  readonly score_id: string;
  readonly score_hash: string;
  readonly scene_id: string;
  readonly seed: string;
  readonly axes: AxesScores;
  readonly composite: number;
  readonly verdict: 'SEAL' | 'REJECT';
  readonly emotion_weight_pct: number;
}

export interface AxesScores {
  readonly interiority: AxisScore;
  readonly tension_14d: AxisScore;
  readonly sensory_density: AxisScore;
  readonly necessity: AxisScore;
  readonly anti_cliche: AxisScore;
  readonly rhythm: AxisScore;
  readonly signature: AxisScore;
  readonly impact: AxisScore;
  readonly emotion_coherence: AxisScore;
}

export interface AxisScore {
  readonly name: string;
  readonly score: number;
  readonly weight: number;
  readonly method: 'CALC' | 'LLM' | 'HYBRID';
  readonly details: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PITCH — SURGICAL CORRECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type CorrectionOp =
  | 'inject_sensory_detail'
  | 'convert_dialogue_to_indirect'
  | 'add_micro_rupture_event'
  | 'tighten_sentence_rhythm'
  | 'replace_cliche'
  | 'increase_interiority_signal'
  | 'compress_exposition'
  | 'add_consequence_line'
  | 'shift_emotion_register'
  | 'inject_silence_zone'
  | 'sharpen_opening'
  | 'deepen_closing';

export interface PitchItem {
  readonly id: string;
  readonly zone: string;
  readonly op: CorrectionOp;
  readonly reason: string;
  readonly instruction: string;
  readonly expected_gain: { readonly axe: string; readonly delta: number };
}

export interface CorrectionPitch {
  readonly pitch_id: string;
  readonly strategy: 'emotional_intensification' | 'structural_rupture' | 'compression_musicality';
  readonly items: readonly PitchItem[];
  readonly total_expected_gain: number;
}

export interface PitchOracleResult {
  readonly pitches: readonly CorrectionPitch[];
  readonly selected_pitch_id: string;
  readonly selection_score: number;
  readonly selection_reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOVEREIGN PROVIDER — LLM INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface SovereignProvider {
  scoreInteriority(prose: string, context: { readonly pov: string; readonly character_state: string }): Promise<number>;
  scoreSensoryDensity(prose: string, sensory_counts: Record<string, number>): Promise<number>;
  scoreNecessity(prose: string, beat_count: number, beat_actions?: string, scene_goal?: string, conflict_type?: string): Promise<number>;
  scoreImpact(opening: string, closing: string, context: { readonly story_premise: string }): Promise<number>;
  applyPatch(prose: string, pitch: CorrectionPitch, constraints: { readonly canon: readonly string[]; readonly beats: readonly string[] }): Promise<string>;
  generateDraft(prompt: string, mode: string, seed: string): Promise<string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOVEREIGN LOOP OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface SovereignLoopResult {
  readonly final_prose: string;
  readonly s_score_initial: SScore;
  readonly s_score_final: SScore;
  readonly pitches_applied: readonly CorrectionPitch[];
  readonly passes_executed: number;
  readonly verdict: 'SEAL' | 'REJECT';
  readonly verdict_reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DUEL ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface DuelResult {
  readonly drafts: readonly Draft[];
  readonly winner_id: string;
  readonly winner_score: number;
  readonly fusion_applied: boolean;
  readonly final_prose: string;
}

export interface Draft {
  readonly draft_id: string;
  readonly mode: string;
  readonly prose: string;
  readonly score: SScore;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-WRITE SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface SceneBattlePlan {
  readonly battle_plan_id: string;
  readonly battle_plan_hash: string;
  readonly predicted_obstacles: readonly PredictedObstacle[];
  readonly mitigation_strategies: readonly MitigationStrategy[];
  readonly estimated_pass_count: number;
}

export interface PredictedObstacle {
  readonly obstacle_id: string;
  readonly type: 'emotion_deviation' | 'tension_flatness' | 'cliche_risk' | 'rhythm_monotony' | 'signature_drift';
  readonly severity: 'high' | 'medium' | 'low';
  readonly description: string;
  readonly probability: number;
}

export interface MitigationStrategy {
  readonly strategy_id: string;
  readonly targets: readonly string[];
  readonly action: string;
  readonly expected_effectiveness: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly string[];
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly severity: 'FATAL' | 'ERROR' | 'WARNING';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT ASSEMBLY
// ═══════════════════════════════════════════════════════════════════════════════

export interface SovereignPrompt {
  readonly sections: readonly PromptSection[];
  readonly total_length: number;
  readonly prompt_hash: string;
}

export interface PromptSection {
  readonly section_id: string;
  readonly title: string;
  readonly content: string;
  readonly priority: 'critical' | 'high' | 'medium' | 'low';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYMBOL MAP v3 — Re-exports
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  SymbolMap,
  SymbolQuartile,
  SymbolGlobal,
  SensoryQuota,
  SyntaxProfile,
  AntiClicheReplacement,
  ImageryMode,
} from './symbol/symbol-map-types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MACRO AXES v3 — Re-exports
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  MacroAxisScore,
  MacroAxesScores,
  BonusMalus,
  ScoreReasons,
} from './oracle/macro-axes.js';

export type { MacroSScore } from './oracle/s-score.js';
