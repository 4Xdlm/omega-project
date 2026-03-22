/**
 * OMEGA GB V1 Scorer — Phase P0
 * Date: 2026-03-22
 * Role: Unified scorer that computes all 42 features from raw text
 *       and scores via the GB V1 inference engine.
 *
 * This is the OFFICIAL judge (Layer 1 of the 3-layer architecture).
 * Spearman 0.79 on 571-work corpus, 19/2780 S-D inversions.
 */

import { computeTextFeatures } from './text-features.js';
import { computeDepthFeatures } from './depth-features.js';
import { computeSemanticDepthFeatures } from './semantic-depth-features.js';
import { scoreGB, getFeatureNames, getFeatureImportance } from './gb-inference.js';

// ═══════════════════════════════════════════════════════════════════════
// FEATURE ASSEMBLY
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute all 42 GB features from raw text.
 * Combines: text-features (V3) + depth-features + semantic-depth-features + interactions.
 *
 * @param text - Raw text to analyze
 * @returns Record of all 42 feature values
 */
export function computeAllGBFeatures(text: string): Record<string, number> {
  const textF = computeTextFeatures(text);
  const depthF = computeDepthFeatures(text);
  const semF = computeSemanticDepthFeatures(text);

  return {
    ...textF,
    ...depthF,
    ...semF,
    ix_mean_x_subdepth: (textF.f1_mean ?? 0) * (depthF.f_subordination_depth ?? 0),
    ix_pov_x_irony: (depthF.f_pov_shift_rate ?? 0) * (textF.f28b_irony_density ?? 0),
    ix_variance_x_longrate: (textF.f1a_rhythm_variance ?? 0) * (textF.f26b_long_sent_rate ?? 0),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════════════

export interface GBScoreResult {
  /** GB V1 prediction on tier scale (1-5) */
  score: number;
  /** Tier interpretation */
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  /** All 42 computed features */
  features: Record<string, number>;
  /** Top 10 contributing features */
  topFeatures: Array<{ name: string; value: number; importance: number }>;
}

const TIER_THRESHOLDS: Array<[number, 'S' | 'A' | 'B' | 'C' | 'D']> = [
  [4.5, 'S'],
  [3.5, 'A'],
  [2.5, 'B'],
  [1.5, 'C'],
  [0, 'D'],
];

function scoreToTier(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  for (const [threshold, tier] of TIER_THRESHOLDS) {
    if (score >= threshold) return tier;
  }
  return 'D';
}

/**
 * Score raw text with the GB V1 model.
 *
 * @param text - Raw text to analyze and score
 * @returns Score result with tier, features, and top contributors
 */
export function scoreText(text: string): GBScoreResult {
  const features = computeAllGBFeatures(text);
  const score = scoreGB(features);
  const tier = scoreToTier(score);

  const importance = getFeatureImportance();
  const topFeatures = importance.slice(0, 10).map(({ name, importance: imp }) => ({
    name,
    value: features[name] ?? 0,
    importance: imp,
  }));

  return { score, tier, features, topFeatures };
}

/**
 * Score from pre-computed features (no text analysis needed).
 *
 * @param features - Pre-computed feature record (42 features)
 * @returns GB V1 score on tier scale (1-5)
 */
export function scoreFromFeatures(features: Record<string, number>): number {
  return scoreGB(features);
}

export { getFeatureNames, getFeatureImportance };
