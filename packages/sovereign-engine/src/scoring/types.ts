/**
 * OMEGA Multi-Stage Scorer — Type Definitions
 * Phase R4 — NASA-Grade L4 / DO-178C Level A
 *
 * These types are INDEPENDENT of the frozen types.ts in the parent module.
 * They define the multi-stage scoring contract derived from R3 coefficients.
 */

// ═══════════════════════════════════════════════════════════════════════
// SCORING TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface StageScore {
  /** Score on 0-100 scale */
  score: number;
  /** Mean confidence of active features (0.0-1.0) */
  confidence: number;
  /** Number of features with confidence >= 0.20 */
  active_features: number;
  /** Total features evaluated */
  total_features: number;
}

export interface CompositeScore {
  /** Weighted composite: alpha * local + beta * arc */
  score: number;
  /** Weight of LOCAL stage (derived from text size) */
  alpha: number;
  /** Weight of ARC stage */
  beta: number;
  /** Overall confidence */
  confidence: number;
}

export type PassageType =
  | 'DESCRIPTION'
  | 'DIALOGUE'
  | 'ACTION'
  | 'INTROSPECTION'
  | 'TRANSITION';

export interface MultiStageScore {
  local: StageScore;
  arc: StageScore;
  composite: CompositeScore;
  passage_type: PassageType;
  profile: string;
  seal_eligible: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// SCORING OPTIONS
// ═══════════════════════════════════════════════════════════════════════

export interface ScoringOptions {
  /** Word count of the text being scored */
  wordCount: number;
  /** Relative position in the work (0.0-1.0), undefined if unknown */
  pRel?: number;
  /** Quality profile to apply */
  profile?: string;
  /** Language code (fr, en, es) */
  language?: string;
  /** Raw text for passage type detection (enables dialogue marker check) */
  text?: string;
  /** Apply type_modifiers from R3 coefficients. Default: false (disabled after ablation). */
  applyTypeModifiers?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// COEFFICIENTS TYPES (mirrors JSON structure)
// ═══════════════════════════════════════════════════════════════════════

export interface ConfidenceEntry {
  [windowSize: string]: number | null;
}

export interface WeightEntry {
  classification: string;
  confidence: number;
  weight_effective: number;
}

export interface PositionModifierEntry {
  trend: string;
  OPENING: number;
  SETUP: number;
  MIDDLE: number;
  TENSION: number;
  CLOSING: number;
}

export interface ScoringFormulaEntry {
  alpha_LOCAL: number;
  beta_ARC: number;
  n_local_active: number;
  n_arc_active: number;
  n_total_active: number;
}

export interface LanguageDependencyEntry {
  status: 'UNIVERSAL' | 'LANGUAGE_DEPENDENT';
  cv_600: Record<string, number>;
  divergent_langs?: Record<string, number>;
}

export interface OmegaCoefficients {
  confidence_table: Record<string, ConfidenceEntry>;
  disabled_below: Record<string, number>;
  never_active_features: string[];
  weight_table: Record<string, Record<string, WeightEntry>>;
  position_modifiers: Record<string, PositionModifierEntry>;
  type_modifiers: Record<string, Record<string, number>>;
  language_dependency: Record<string, LanguageDependencyEntry>;
  scoring_formula: Record<string, ScoringFormulaEntry>;
}

// ═══════════════════════════════════════════════════════════════════════
// QUALITY PROFILES
// ═══════════════════════════════════════════════════════════════════════

export interface QualityProfile {
  name: string;
  seal_threshold: number;
  min_axis: number;
  /** Feature name -> weight multiplier. @provisional — to be calibrated in R5. */
  weight_overrides: Record<string, number>;
  description: string;
}

export type PrelZone = 'OPENING' | 'SETUP' | 'MIDDLE' | 'TENSION' | 'CLOSING';
