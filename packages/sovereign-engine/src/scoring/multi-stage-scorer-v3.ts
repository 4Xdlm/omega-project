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
}

// ═══════════════════════════════════════════════════════════════════════
// WEIGHTS (from R-6 Ridge regression, lambda=50, n=571)
// ═══════════════════════════════════════════════════════════════════════

interface FeatureWeight {
  weight: number;
  mean: number;
  std: number;
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
  score(features: Record<string, number>, options: ScoringOptions): V3Score {
    let raw = INTERCEPT;
    let available = 0;
    const total = Object.keys(WEIGHTS).length + INTERACTIONS.length;
    const contribs: Array<{ feature: string; contribution: number }> = [];

    // Main features
    for (const [feat, spec] of Object.entries(WEIGHTS)) {
      const val = features[feat];
      if (val === undefined || val === null || !Number.isFinite(val)) continue;
      available++;
      const c = spec.weight * val;
      raw += c;
      contribs.push({ feature: feat, contribution: r4(c) });
    }

    // Interactions
    for (const ix of INTERACTIONS) {
      const a = features[ix.feat_a];
      const b = features[ix.feat_b];
      if (a === undefined || b === undefined || !Number.isFinite(a) || !Number.isFinite(b)) continue;
      available++;
      const c = ix.weight * a * b;
      raw += c;
      contribs.push({ feature: ix.name, contribution: r4(c) });
    }

    // Sort by |contribution|
    contribs.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    const score100 = r4(clamp((raw - RAW_MIN) / (RAW_MAX - RAW_MIN) * 100, 0, 100));
    const confidence = r4(available / total);

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
    const final = r4(clamp(score100 + bonusTotal, 0, 100));

    return {
      raw: r4(raw),
      score100,
      final,
      confidence,
      passage_type: passageType,
      top_contributors: contribs.slice(0, 10),
      bonuses,
    };
  }
}

function r4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
