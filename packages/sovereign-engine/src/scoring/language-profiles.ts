/**
 * PROFILE_FR / PROFILE_EN — Profils langue-aware
 *
 * L31 : semicolon = #1 FR (0.416) vs #5 EN (0.058), ratio 7.15
 * FR = monocentrique (D_FR=5.45). EN = polycentrique (D_EN=1.20).
 *
 * SHADOW MODE (D1) : informatif uniquement.
 */

import { computeTextFeatures } from './text-features.js';

const FR_WEIGHTS: Record<string, number> = {
  f26a_mean_sub_markers: 0.30,
  f26b_long_sent_rate: 0.20,
  f1a_rhythm_variance: 0.15,
  f16a_bigram_rarity: 0.15,
  f24c_contrast_delta: 0.10,
  f17_knife_count: -0.10,
};

const EN_WEIGHTS: Record<string, number> = {
  f1a_rhythm_variance: 0.25,
  f16a_bigram_rarity: 0.20,
  f26b_long_sent_rate: 0.15,
  f26a_mean_sub_markers: 0.15,
  f24c_contrast_delta: 0.10,
  f29d_ttr_score: 0.15,
};

export interface LanguageProfileResult {
  readonly language: 'fr' | 'en';
  readonly profile_score: number;
  readonly feature_contributions: Record<string, number>;
}

export function computeLanguageProfile(
  prose: string,
  language: 'fr' | 'en',
): LanguageProfileResult {
  if (!prose || prose.trim().length < 20) {
    return { language, profile_score: 0, feature_contributions: {} };
  }

  const features = computeTextFeatures(prose) as Record<string, number>;
  const weights = language === 'fr' ? FR_WEIGHTS : EN_WEIGHTS;

  const contributions: Record<string, number> = {};
  let raw = 0;

  for (const [featureName, weight] of Object.entries(weights)) {
    const value = features[featureName] ?? 0;
    const normed = Math.max(0, Math.min(1, value));
    const contribution = normed * weight;
    contributions[featureName] = Math.round(contribution * 10000) / 10000;
    raw += contribution;
  }

  const score = Math.min(100, Math.max(0, Math.round(raw * 10000) / 100));

  return { language, profile_score: score, feature_contributions: contributions };
}
