/**
 * OMEGA Truth Gate — Drift/Toxicity Detection Types
 *
 * Types for narrative drift and toxicity detection.
 */

/**
 * Drift detection result.
 */
export interface DriftResult {
  readonly drift_score: number;  // 0-1, higher = more drift
  readonly drift_type: DriftType;
  readonly severity: DriftSeverity;
  readonly details: string;
  readonly source_hash?: string;
  readonly target_hash?: string;
}

/**
 * Types of narrative drift.
 */
export type DriftType =
  | 'character_inconsistency'
  | 'plot_contradiction'
  | 'timeline_violation'
  | 'tone_shift'
  | 'world_rule_violation'
  | 'relationship_inconsistency'
  | 'factual_contradiction'
  | 'none';

/**
 * Drift severity levels.
 */
export type DriftSeverity = 'none' | 'minor' | 'moderate' | 'major' | 'critical';

/**
 * Toxicity detection result.
 */
export interface ToxicityResult {
  readonly toxicity_score: number;  // 0-1, higher = more toxic
  readonly toxicity_type: ToxicityType;
  readonly severity: ToxicitySeverity;
  readonly flagged_content: readonly string[];
  readonly details: string;
}

/**
 * Types of toxicity.
 */
export type ToxicityType =
  | 'hate_speech'
  | 'violence_glorification'
  | 'harassment'
  | 'explicit_content'
  | 'self_harm'
  | 'dangerous_content'
  | 'misinformation'
  | 'none';

/**
 * Toxicity severity levels.
 */
export type ToxicitySeverity = 'none' | 'low' | 'medium' | 'high' | 'severe';

/**
 * Combined drift/toxicity analysis.
 */
export interface NarrativeAnalysis {
  readonly drift: DriftResult;
  readonly toxicity: ToxicityResult;
  readonly overall_score: number;  // Combined risk score
  readonly pass: boolean;
  readonly recommendations: readonly string[];
}

/**
 * Drift detector configuration.
 */
export interface DriftDetectorConfig {
  readonly max_drift_score: number;
  readonly max_toxicity_score: number;
  readonly enable_content_analysis: boolean;
  readonly blocked_terms: readonly string[];
  readonly sensitive_topics: readonly string[];
}
