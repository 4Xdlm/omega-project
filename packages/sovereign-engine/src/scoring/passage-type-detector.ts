/**
 * OMEGA Passage Type Detector
 * Phase R4 — Detects the type of a text passage from its features.
 *
 * Uses empirical thresholds derived from R2/R3 data (181 works, 9141 windows).
 * Thresholds are loaded from the coefficients JSON (type_modifiers).
 */

import type { PassageType } from './types.js';

/**
 * Feature thresholds for passage type detection.
 * Derived from R2 percentile analysis (OMEGA_PASSAGE_TYPES.json).
 * These are the P75 percentiles from 9141 classified windows.
 */
const THRESHOLDS = {
  dialogue: {
    f34b_para_per_1000w_p75: 5.0,
    f33a_dots_count_p75: 50,
  },
  action: {
    f5a_verb_density_p75: 0.06,
    f38c_speed_score_p50: 0.28,
    f1_mean_p25: 12.0,
  },
  introspection: {
    f28d_sil_score_p75: 0.08,
    f27d_modal_score_p75: 0.45,
  },
  transition: {
    f12b_tense_switch_rate_p75: 0.12,
  },
} as const;

/**
 * Detects the passage type from pre-computed features.
 *
 * Priority order: DIALOGUE > INTROSPECTION > ACTION > TRANSITION > DESCRIPTION
 * DESCRIPTION is the default (71.7% of corpus).
 *
 * @param features - Record of feature name to value
 * @returns The detected passage type
 */
export function detectPassageType(features: Record<string, number>): PassageType {
  const f34b = features['f34b_para_per_1000w'] ?? 0;
  const f33a = features['f33a_dots_count'] ?? 0;
  const f5a = features['f5a_verb_density'] ?? 0;
  const f38c = features['f38c_speed_score'] ?? 0;
  const f1 = features['f1_mean'] ?? 20;
  const f28d = features['f28d_sil_score'] ?? 0;
  const f27d = features['f27d_modal_score'] ?? 0;
  const f12b = features['f12b_tense_switch_rate'] ?? 0;

  // DIALOGUE: high paragraph density + high punctuation dots
  if (
    f34b > THRESHOLDS.dialogue.f34b_para_per_1000w_p75 &&
    f33a > THRESHOLDS.dialogue.f33a_dots_count_p75
  ) {
    return 'DIALOGUE';
  }

  // INTROSPECTION: high SIL score + high modal score
  if (
    f28d > THRESHOLDS.introspection.f28d_sil_score_p75 &&
    f27d > THRESHOLDS.introspection.f27d_modal_score_p75
  ) {
    return 'INTROSPECTION';
  }

  // ACTION: high verb density + high speed + short sentences
  if (
    f5a > THRESHOLDS.action.f5a_verb_density_p75 &&
    f38c > THRESHOLDS.action.f38c_speed_score_p50 &&
    f1 < THRESHOLDS.action.f1_mean_p25
  ) {
    return 'ACTION';
  }

  // TRANSITION: high tense switch rate (and nothing extreme)
  if (f12b > THRESHOLDS.transition.f12b_tense_switch_rate_p75) {
    // Only if other features are moderate
    const isExtreme =
      f28d > THRESHOLDS.introspection.f28d_sil_score_p75 ||
      f5a > THRESHOLDS.action.f5a_verb_density_p75;
    if (!isExtreme) {
      return 'TRANSITION';
    }
  }

  // Default: DESCRIPTION (71.7% of corpus)
  return 'DESCRIPTION';
}
