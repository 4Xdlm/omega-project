/**
 * OMEGA Metrics — Types
 * Phase R-METRICS — Objective narrative quality metrics
 */

export interface StructuralMetrics {
  readonly arc_completeness: number;
  readonly scene_completeness: number;
  readonly beat_coverage: number;
  readonly seed_integrity: number;
  readonly tension_monotonicity: number;
  readonly conflict_diversity: number;
  readonly causal_depth: number;
  readonly structural_entropy: number;
}

export interface SemanticMetrics {
  readonly intent_theme_coverage: number;
  readonly theme_fidelity: number;
  readonly canon_respect: number;
  readonly canon_violation_count: number;
  readonly emotion_trajectory_alignment: number;
  readonly constraint_satisfaction: number;
}

export interface DynamicMetrics {
  readonly intra_intent_stability: number | null;
  readonly inter_intent_variance: number | null;
  readonly variant_sensitivity: number | null;
  readonly noise_floor_ratio: number | null;
}

export interface GlobalScore {
  readonly structural: number;
  readonly semantic: number;
  readonly dynamic: number;
  readonly global: number;
  readonly status: 'PASS' | 'WARN' | 'FAIL';
  readonly hard_fails: readonly string[];
}

export interface MetricEvidence {
  readonly metric: string;
  readonly value: number;
  readonly detail: string;
}

export interface MetricsReport {
  readonly report_version: '1.0.0';
  readonly run_id: string;
  readonly source_dir: string;
  readonly artifacts_hash: string;
  readonly timestamp: string;
  readonly metrics: {
    readonly structural: StructuralMetrics;
    readonly semantic: SemanticMetrics;
    readonly dynamic: DynamicMetrics;
  };
  readonly score: GlobalScore;
  readonly evidence: readonly MetricEvidence[];
  readonly report_hash: string;
}

export interface WeightConfig {
  readonly structural: {
    readonly arc_completeness: number;
    readonly scene_completeness: number;
    readonly beat_coverage: number;
    readonly seed_integrity: number;
    readonly tension_monotonicity: number;
    readonly conflict_diversity: number;
    readonly causal_depth: number;
    readonly structural_entropy: number;
  };
  readonly semantic: {
    readonly intent_theme_coverage: number;
    readonly theme_fidelity: number;
    readonly canon_respect: number;
    readonly emotion_trajectory_alignment: number;
    readonly constraint_satisfaction: number;
  };
  readonly dynamic: {
    readonly intra_intent_stability: number;
    readonly inter_intent_variance: number;
    readonly variant_sensitivity: number;
    readonly noise_floor_ratio: number;
  };
  readonly category: {
    readonly structural: number;
    readonly semantic: number;
    readonly dynamic: number;
  };
}

export interface ThresholdConfig {
  readonly pass: number;
  readonly warn: number;
  readonly fail_below: number;
  readonly hard_fails: {
    readonly canon_violation_count_must_equal: number;
    readonly intra_intent_stability_must_gte: number;
  };
}

export interface MetricConfig {
  readonly MIN_BEATS_PER_SCENE: number;
  readonly MAX_BEATS_PER_SCENE: number;
  readonly SEED_BLOOM_MAX_DISTANCE: number;
  readonly MAX_TENSION_PLATEAU: number;
  readonly MAX_TENSION_DROP: number;
  readonly MIN_CONFLICT_TYPES: number;
}

// Genesis plan types (read from artifacts)
export interface Beat {
  readonly beat_id: string;
  readonly action: string;
  readonly intention: string;
  readonly pivot: boolean;
  readonly tension_delta: number;
  readonly information_revealed: readonly string[];
  readonly information_withheld: readonly string[];
}

export interface Scene {
  readonly scene_id: string;
  readonly arc_id: string;
  readonly objective: string;
  readonly conflict: string;
  readonly conflict_type: string;
  readonly emotion_target: string;
  readonly emotion_intensity: number;
  readonly beats: readonly Beat[];
  readonly target_word_count: number;
  readonly sensory_anchor: string;
  readonly subtext: {
    readonly character_thinks: string;
    readonly implied_emotion: string;
    readonly reader_knows: string;
    readonly tension_type: string;
  };
  readonly seeds_planted: readonly string[];
  readonly seeds_bloomed: readonly string[];
  readonly justification: string;
  readonly constraints?: readonly string[];
}

export interface Arc {
  readonly arc_id: string;
  readonly theme: string;
  readonly progression: string;
  readonly justification: string;
  readonly scenes: readonly Scene[];
}

export interface Seed {
  readonly id: string;
  readonly type: string;
  readonly planted_in: string;
  readonly blooms_in: string;
  readonly description: string;
}

export interface EmotionPoint {
  readonly emotion: string;
  readonly intensity: number;
  readonly position: number;
}

export interface GenesisPlan {
  readonly plan_id: string;
  readonly arcs: readonly Arc[];
  readonly scene_count: number;
  readonly beat_count: number;
  readonly seed_registry: readonly Seed[];
  readonly tension_curve: readonly number[];
  readonly emotion_trajectory: readonly EmotionPoint[];
  readonly estimated_word_count: number;
  readonly version: string;
  readonly plan_hash?: string;
  readonly canon_hash?: string;
  readonly constraints_hash?: string;
  readonly emotion_hash?: string;
  readonly genome_hash?: string;
  readonly intent_hash?: string;
}

export interface CanonEntry {
  readonly id: string;
  readonly type: string;
  readonly statement: string;
  readonly immutable: boolean;
}

export interface EmotionWaypoint {
  readonly position: number;
  readonly emotion: string;
  readonly intensity: number;
}

export interface IntentPack {
  readonly intent: {
    readonly title: string;
    readonly premise: string;
    readonly themes: readonly string[];
    readonly core_emotion: string;
    readonly target_word_count: number;
  };
  readonly canon: {
    readonly entries: readonly CanonEntry[];
  };
  readonly constraints: {
    readonly min_scenes: number;
    readonly max_scenes: number;
    readonly pov?: string;
    readonly tense?: string;
    readonly banned_topics?: readonly string[];
    readonly banned_words?: readonly string[];
  };
  readonly emotion: {
    readonly core_emotion: string;
    readonly resolution_emotion: string;
    readonly waypoints?: readonly EmotionWaypoint[];
  };
  readonly genome: {
    readonly style_seed: string;
  };
}

export interface RunArtifacts {
  readonly run_id: string;
  readonly intent: IntentPack;
  readonly plan: GenesisPlan;
}
