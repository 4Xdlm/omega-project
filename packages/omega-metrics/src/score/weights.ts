/**
 * OMEGA Metrics — Weights Configuration
 */

import type { WeightConfig } from '../types.js';

export const DEFAULT_WEIGHTS: WeightConfig = {
  structural: {
    arc_completeness: 0.15,
    scene_completeness: 0.15,
    beat_coverage: 0.12,
    seed_integrity: 0.12,
    tension_monotonicity: 0.12,
    conflict_diversity: 0.10,
    causal_depth: 0.12,
    structural_entropy: 0.12,
  },
  semantic: {
    intent_theme_coverage: 0.20,
    theme_fidelity: 0.15,
    canon_respect: 0.25,
    emotion_trajectory_alignment: 0.20,
    constraint_satisfaction: 0.20,
  },
  dynamic: {
    intra_intent_stability: 0.35,
    inter_intent_variance: 0.25,
    variant_sensitivity: 0.20,
    noise_floor_ratio: 0.20,
  },
  category: {
    structural: 0.40,
    semantic: 0.35,
    dynamic: 0.25,
  },
};
