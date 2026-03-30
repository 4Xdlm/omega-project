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

// EN_MIN (Hemingway, Carver, Chandler — 80% du corpus EN Tier S)
const EN_MIN_WEIGHTS: Record<string, number> = {
  f17_knife_count: 0.25,
  f1a_rhythm_variance: 0.20,
  f16a_bigram_rarity: 0.20,
  f26b_long_sent_rate: -0.15,  // INVERSE : longues phrases = mauvais signe minimaliste
  f29d_ttr_score: 0.20,
};

// EN_MAX (Faulkner, Wallace, DFW — 20% du corpus EN Tier S)
const EN_MAX_WEIGHTS: Record<string, number> = {
  f26b_long_sent_rate: 0.25,
  f26a_mean_sub_markers: 0.25,
  f1a_rhythm_variance: 0.20,
  f16a_bigram_rarity: 0.15,
  f24c_contrast_delta: 0.15,
};

export type ENStyle = 'min' | 'max';

export interface LanguageProfileResult {
  readonly language: 'fr' | 'en';
  readonly en_style?: ENStyle;
  readonly profile_score: number;
  readonly feature_contributions: Record<string, number>;
}

export function computeLanguageProfile(
  prose: string,
  language: 'fr' | 'en',
  enStyle: ENStyle = 'min',
): LanguageProfileResult {
  if (!prose || prose.trim().length < 20) {
    return { language, en_style: language === 'en' ? enStyle : undefined, profile_score: 0, feature_contributions: {} };
  }

  const features = computeTextFeatures(prose) as Record<string, number>;
  const weights = language === 'fr' ? FR_WEIGHTS : (enStyle === 'max' ? EN_MAX_WEIGHTS : EN_MIN_WEIGHTS);

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

  return { language, en_style: language === 'en' ? enStyle : undefined, profile_score: score, feature_contributions: contributions };
}
