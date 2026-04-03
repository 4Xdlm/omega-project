/**
 * OMEGA Multi-Stage Scorer V3 — "Tribunal Academique"
 * Phase R-6 — Built from Ridge regression on 571 classified works
 * with depth features + interactions.
 *
 * Key improvements over V2:
 * - 3 depth features (subordination, POV shift, clause density)
 * - 3 interaction terms (synergy detection)
 * - Lambda=50 Ridge (stronger regularization, less overfit)
 * - Spearman 0.52 on full corpus
 *
 * R4-b — R3 Confidence Modulation (P2-01)
 * Each Ridge weight is multiplied by R3 empirical confidence @600w.
 * Source: OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json weight_table.LOCAL_600
 * Features not in R3 (depth, R5bis) keep confidence = 1.0.
 * Features with R3 confidence = 0 @600w use floor = 0.05.
 *
 * STANDALONE — no dependency on V1/V2 scorers.
 *
 * Usage:
 *   import { MultiStageScorerV3 } from './multi-stage-scorer-v3.js';
 *   import { computeTextFeatures } from './text-features.js';
 *   import { computeDepthFeatures } from './depth-features.js';
 *
 *   const scorer = new MultiStageScorerV3();
 *   const baseFeats = computeTextFeatures(text);
 *   const depthFeats = computeDepthFeatures(text);
 *   const result = scorer.score({ ...baseFeats, ...depthFeats }, { wordCount: 500 });
 */

import { detectPassageType } from './passage-type-detector.js';
import type { PassageType, ScoringOptions } from './types.js';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface V3Score {
  /** Raw linear prediction (tier scale: 1-5) */
  raw: number;
  /** Normalized to 0-100 */
  score100: number;
  /** After bonuses/penalties */
  final: number;
  /** Confidence (proportion of features available) */
  confidence: number;
  /** Detected passage type */
  passage_type: PassageType;
  /** Top contributing features */
  top_contributors: Array<{ feature: string; contribution: number }>;
  /** Active bonuses */
  bonuses: Array<{ name: string; value: number }>;
  /** R4-b: R3 confidence modulation active */
  r3_modulated: boolean;
  /** R4-b: mean R3 confidence of active features */
  r3_mean_confidence: number;
  /** R4-c: R8 tipping points evaluation */
  r8_tipping: {
    /** Number of tipping points on master side */
    master_count: number;
    /** Total tipping points evaluated (max 10) */
    total_evaluated: number;
    /** Weighted bonus applied (0-10 scale, added to score100) */
    bonus: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════
// WEIGHTS (from R-6 Ridge regression, lambda=50, n=571)
// ═══════════════════════════════════════════════════════════════════════

interface FeatureWeight {
  weight: number;
  mean: number;
  std: number;
}

// ═══════════════════════════════════════════════════════════════════════
// R3 CONFIDENCE MAP (R4-b)
// Source: OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json
// - weight_table.LOCAL_600.{feature}.weight_effective for features in LOCAL_600
// - confidence_table.{feature}["600"] for features not in LOCAL_600
// - 1.0 for depth features not in R3 (R5bis additions)
// Floor: 0.05 for features with 0 empirical confidence @600w
// ═══════════════════════════════════════════════════════════════════════

/** Minimum confidence for features with 0 R3 support. Not zeroed because Ridge found them predictive. */
const R3_CONFIDENCE_FLOOR = 0.05;

/**
 * R3 empirical confidence @600w for each V3 Ridge feature.
 * Values sourced from LOCAL_600 weight_effective when available,
 * otherwise from confidence_table @600w.
 */
const R3_CONFIDENCE: Record<string, number> = {
  // ── From weight_table.LOCAL_600 ──
  f1_mean:                0.5116,
  f9a_contradiction_rate: 0.5974,
  f19a_approx_entropy:    0.5204,
  f24c_contrast_delta:    0.4764,
  f27d_modal_score:       0.3767,
  f17_knife_count:        0.6617,
  f29d_ttr_score:         0.9502,
  f35c_hook_score:        0.6356,
  f36c_cliff_score:       0.8252,

  // ── From confidence_table @600w (not in LOCAL_600 weight_table) ──
  f1a_rhythm_variance:    0.1401,
  f26b_long_sent_rate:    R3_CONFIDENCE_FLOOR,  // 0.0 @600w, floor applied
  f26c_period_score:      R3_CONFIDENCE_FLOOR,  // 0.0 @600w, floor applied
  f27a_epistemic_rate:    R3_CONFIDENCE_FLOOR,  // 0.0 @600w, floor applied
  f28b_irony_density:     R3_CONFIDENCE_FLOOR,  // 0.0 @600w, floor applied

  // ── Depth features from R5bis — NOT IN R3, keep unmodulated ──
  f_pov_shift_rate:       1.0,
  f_subordination_depth:  1.0,
  f_clause_per_sentence:  1.0,
};

// ═══════════════════════════════════════════════════════════════════════
// R8 TIPPING POINTS (R4-c)
// Source: R8_TIPPING_POINTS.json (Phase R-8.7, GB Spearman = 0.786)
// 10 empirical thresholds from gradient-boosted tree extraction.
// Each evaluated point on master side → weighted bonus.
// ═══════════════════════════════════════════════════════════════════════

interface TippingPoint {
  feature: string;
  threshold: number;
  direction: 'HIGHER' | 'LOWER';
  /** Delta impact from GB extraction */
  delta: number;
  /** Normalized importance (sum ≈ 0.66 across all 10) */
  importance: number;
}

const R8_TIPPING_POINTS: readonly TippingPoint[] = [
  { feature: 'f26b_long_sent_rate',   threshold: 0.02405, direction: 'HIGHER', delta: 1.11018, importance: 0.29017 },
  { feature: 'f_pov_stability',       threshold: 0.64625, direction: 'LOWER',  delta:-0.35827, importance: 0.05832 },
  { feature: 'ix_variance_x_longrate',threshold: 0.09608, direction: 'HIGHER', delta: 1.26294, importance: 0.05554 },
  { feature: 'f_pov_shift_rate',      threshold: 0.34800, direction: 'HIGHER', delta: 0.45885, importance: 0.04411 },
  { feature: 'f29d_ttr_score',        threshold: 0.70945, direction: 'LOWER',  delta:-0.46210, importance: 0.04213 },
  { feature: 'f_causal_density',      threshold: 0.06795, direction: 'HIGHER', delta: 0.64488, importance: 0.03849 },
  { feature: 'f1a_rhythm_variance',   threshold: 11.36105,direction: 'HIGHER', delta: 0.97566, importance: 0.03562 },
  { feature: 'f_pov_drift_rate',      threshold: 0.11262, direction: 'HIGHER', delta: 0.42167, importance: 0.03559 },
  { feature: 'f19a_approx_entropy',   threshold: 0.63735, direction: 'HIGHER', delta: 0.53735, importance: 0.03462 },
  { feature: 'f_clause_per_sentence', threshold: 1.00953, direction: 'HIGHER', delta: 0.30261, importance: 0.02616 },
] as const;

/** Maximum bonus from tipping points (on 0-100 scale). */
const R8_MAX_BONUS = 10;

/**
 * Evaluate tipping points against measured features.
 * Returns weighted bonus in [0, R8_MAX_BONUS].
 *
 * For interaction features (ix_*), the caller must pre-compute and include
 * the product in the features dict.
 */
function evaluateR8TippingPoints(
  features: Record<string, number>,
): { masterCount: number; totalEvaluated: number; bonus: number } {
  let masterCount = 0;
  let totalEvaluated = 0;
  let weightedScore = 0;
  let totalImportance = 0;

  for (const tp of R8_TIPPING_POINTS) {
    let value: number | undefined;

    // For interaction features, compute product on the fly
    if (tp.feature === 'ix_variance_x_longrate') {
      const a = features['f1a_rhythm_variance'];
      const b = features['f26b_long_sent_rate'];
      if (a !== undefined && b !== undefined && Number.isFinite(a) && Number.isFinite(b)) {
        value = a * b;
      }
    } else {
      value = features[tp.feature];
    }

    if (value === undefined || !Number.isFinite(value)) continue;

    totalEvaluated++;
    totalImportance += tp.importance;

    const onMasterSide = tp.direction === 'HIGHER'
      ? value > tp.threshold
      : value < tp.threshold;

    if (onMasterSide) {
      masterCount++;
      weightedScore += tp.importance;
    }
  }

  // Bonus = proportion of weighted importance on master side, scaled to R8_MAX_BONUS
  const bonus = totalImportance > 0
    ? r4(weightedScore / totalImportance * R8_MAX_BONUS)
    : 0;

  return { masterCount, totalEvaluated, bonus };
}

// Weights in original scale (not standardized)
const WEIGHTS: Record<string, FeatureWeight> = {
  // ── Original discriminant features ──
  f26b_long_sent_rate:    { weight: +0.589303, mean: 0.100752, std: 0.118182 },
  f1a_rhythm_variance:    { weight: +0.011339, mean: 14.881284, std: 8.718101 },
  f1_mean:                { weight: -0.001941, mean: 20.769247, std: 10.541339 },
  f24c_contrast_delta:    { weight: +0.019501, mean: 29.637445, std: 10.597023 },
  f28b_irony_density:     { weight: +0.023386, mean: 0.100576, std: 1.021942 },
  f27a_epistemic_rate:    { weight: +0.005280, mean: 10.174103, std: 21.480252 },
  f9a_contradiction_rate: { weight: -0.088281, mean: 0.898543, std: 0.909155 },
  f19a_approx_entropy:    { weight: +1.272268, mean: 0.733467, std: 0.120471 },
  f27d_modal_score:       { weight: +0.595408, mean: 0.243476, std: 0.131629 },
  f26c_period_score:      { weight: +0.090256, mean: 0.110724, std: 0.098839 },

  // ── Depth features (R-5bis) ──
  f_pov_shift_rate:       { weight: +0.542860, mean: 0.213009, std: 0.150979 },
  f_subordination_depth:  { weight: -0.076731, mean: 0.544684, std: 0.948001 },
  f_clause_per_sentence:  { weight: +0.134374, mean: 1.402990, std: 0.827227 },

  // ── Suspect features (tested, kept with learned weights) ──
  f17_knife_count:        { weight: -0.003674, mean: 6.625753, std: 7.021261 },
  f29d_ttr_score:         { weight: -4.879874, mean: 0.711665, std: 0.024577 },
  f35c_hook_score:        { weight: -0.893573, mean: 0.535052, std: 0.126445 },
  f36c_cliff_score:       { weight: +0.024771, mean: 0.639920, std: 0.061135 },
};

const INTERCEPT = 7.455419;

// Interaction weights
const INTERACTIONS: Array<{
  name: string;
  feat_a: string;
  feat_b: string;
  weight: number;
}> = [
  { name: 'ix_mean_x_subdepth',     feat_a: 'f1_mean',              feat_b: 'f_subordination_depth',  weight: -0.000115 },
  { name: 'ix_pov_x_irony',         feat_a: 'f_pov_shift_rate',     feat_b: 'f28b_irony_density',     weight: -0.046621 },
  { name: 'ix_variance_x_longrate', feat_a: 'f1a_rhythm_variance',  feat_b: 'f26b_long_sent_rate',    weight: -0.012510 },
];

// Raw score mapping to 0-100
const RAW_MIN = 2.0;
const RAW_MAX = 5.5;

// ═══════════════════════════════════════════════════════════════════════
// SCORER
// ═══════════════════════════════════════════════════════════════════════

export class MultiStageScorerV3 {
  private readonly _useR3Modulation: boolean;
  private readonly _useR8TippingPoints: boolean;

  /**
   * @param useR3Modulation If true (default), apply R3 confidence as weight multipliers.
   *   Set false to get original Ridge-only scoring (for A/B comparison).
   * @param useR8TippingPoints If true (default), apply R8 tipping point bonus.
   *   Set false to disable R8 bonus (for A/B comparison).
   */
  constructor(useR3Modulation = true, useR8TippingPoints = true) {
    this._useR3Modulation = useR3Modulation;
    this._useR8TippingPoints = useR8TippingPoints;
  }

  score(features: Record<string, number>, options: ScoringOptions): V3Score {
    let raw = INTERCEPT;
    let available = 0;
    const total = Object.keys(WEIGHTS).length + INTERACTIONS.length;
    const contribs: Array<{ feature: string; contribution: number }> = [];
    let r3ConfidenceSum = 0;
    let r3ConfidenceCount = 0;

    // Main features — R4-b: contribution modulated by R3 confidence
    for (const [feat, spec] of Object.entries(WEIGHTS)) {
      const val = features[feat];
      if (val === undefined || val === null || !Number.isFinite(val)) continue;
      available++;

      const r3Conf = this._useR3Modulation ? (R3_CONFIDENCE[feat] ?? 1.0) : 1.0;
      r3ConfidenceSum += r3Conf;
      r3ConfidenceCount++;

      const c = spec.weight * val * r3Conf;
      raw += c;
      contribs.push({ feature: feat, contribution: r4(c) });
    }

    // Interactions — R4-b: use min(conf_a, conf_b) as interaction confidence
    for (const ix of INTERACTIONS) {
      const a = features[ix.feat_a];
      const b = features[ix.feat_b];
      if (a === undefined || b === undefined || !Number.isFinite(a) || !Number.isFinite(b)) continue;
      available++;

      const r3ConfA = this._useR3Modulation ? (R3_CONFIDENCE[ix.feat_a] ?? 1.0) : 1.0;
      const r3ConfB = this._useR3Modulation ? (R3_CONFIDENCE[ix.feat_b] ?? 1.0) : 1.0;
      const ixConf = Math.min(r3ConfA, r3ConfB);

      const c = ix.weight * a * b * ixConf;
      raw += c;
      contribs.push({ feature: ix.name, contribution: r4(c) });
    }

    // Sort by |contribution|
    contribs.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    const score100 = r4(clamp((raw - RAW_MIN) / (RAW_MAX - RAW_MIN) * 100, 0, 100));
    const confidence = r4(available / total);
    const r3MeanConf = r3ConfidenceCount > 0 ? r4(r3ConfidenceSum / r3ConfidenceCount) : 0;

    // Passage type
    const passageType = options.text
      ? detectPassageType(options.text)
      : ('INTROSPECTION' as PassageType);

    // Bonuses (structural synergy — only if both conditions met)
    const bonuses: Array<{ name: string; value: number }> = [];

    // Bonus: Rhythmic mastery (long + varied sentences)
    const f1Mean = features.f1_mean ?? 0;
    const f1aVar = features.f1a_rhythm_variance ?? 0;
    if (f1Mean > 18 && f1aVar > 12) {
      bonuses.push({ name: 'rhythmic_mastery', value: 5 });
    }

    // Bonus: Syntactic depth (subordination + long clauses)
    const subDepth = features.f_subordination_depth ?? 0;
    const clausePerSent = features.f_clause_per_sentence ?? 0;
    if (subDepth > 0.6 && clausePerSent > 1.4) {
      bonuses.push({ name: 'syntactic_depth', value: 5 });
    }

    // Bonus: Narrative polyphony (POV shifts + irony)
    const povShift = features.f_pov_shift_rate ?? 0;
    const entropy = features.f19a_approx_entropy ?? 0;
    if (povShift > 0.2 && entropy > 0.7) {
      bonuses.push({ name: 'narrative_polyphony', value: 5 });
    }

    const bonusTotal = bonuses.reduce((s, b) => s + b.value, 0);

    // R4-c: R8 tipping points evaluation
    const r8 = this._useR8TippingPoints
      ? evaluateR8TippingPoints(features)
      : { masterCount: 0, totalEvaluated: 0, bonus: 0 };

    if (r8.bonus > 0) {
      bonuses.push({ name: 'r8_tipping_mastery', value: r4(r8.bonus) });
    }

    const totalBonus = bonusTotal + r8.bonus;
    const final = r4(clamp(score100 + totalBonus, 0, 100));

    return {
      raw: r4(raw),
      score100,
      final,
      confidence,
      passage_type: passageType,
      top_contributors: contribs.slice(0, 10),
      bonuses,
      r3_modulated: this._useR3Modulation,
      r3_mean_confidence: r3MeanConf,
      r8_tipping: {
        master_count: r8.masterCount,
        total_evaluated: r8.totalEvaluated,
        bonus: r4(r8.bonus),
      },
    };
  }
}

function r4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
