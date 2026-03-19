/**
 * OMEGA Quality Profiles
 * Phase R4 — 6 profiles for different literary targets.
 *
 * Each profile defines:
 * - seal_threshold: minimum composite score for SEAL verdict
 * - min_axis: minimum score for any individual stage
 * - weight_overrides: feature-specific multipliers (@provisional — R5 calibration)
 *
 * The weight_overrides multiply the R3-derived weight_effective.
 * A multiplier of 1.30 means +30% importance for that feature.
 * A multiplier of 0.60 means -40% importance.
 */

import type { QualityProfile } from './types.js';

/** @provisional — weight_overrides to be calibrated in R5 bench. */
export const PROFILES: Record<string, QualityProfile> = {

  STRATOSPHERIQUE: {
    name: 'Stratosphérique',
    seal_threshold: 93.0,
    min_axis: 85,
    weight_overrides: {},
    description: 'Prose chef-d\'oeuvre, au-dessus des classiques. Coefficients R3 purs.',
  },

  LITTERAIRE: {
    name: 'Littéraire',
    seal_threshold: 88.0,
    min_axis: 80,
    weight_overrides: {},
    description: 'Roman de qualité littéraire. Même pondération, seuil plus accessible.',
  },

  COMMERCIAL: {
    name: 'Commercial',
    seal_threshold: 82.0,
    min_axis: 75,
    weight_overrides: {
      'f29b_ttr_window': 0.70,
      'f16a_bigram_rarity': 0.70,
      'f38c_speed_score': 1.30,
    },
    description: 'Best-seller grand public. Fluidité privilégiée sur richesse lexicale.',
  },

  THRILLER: {
    name: 'Thriller',
    seal_threshold: 80.0,
    min_axis: 70,
    weight_overrides: {
      'f38c_speed_score': 1.50,
      'f35c_hook_score': 1.40,
      'f36c_cliff_score': 1.40,
      'f25g_description_score': 0.60,
      'f29b_ttr_window': 0.50,
    },
    description: 'Tension maximale, prose efficace. Tolérant sur la description.',
  },

  CONTEMPLATIF: {
    name: 'Contemplatif',
    seal_threshold: 85.0,
    min_axis: 78,
    weight_overrides: {
      'f27d_modal_score': 1.50,
      'f25g_description_score': 1.30,
      'f1_mean': 1.20,
      'f38c_speed_score': 0.70,
      'f35c_hook_score': 0.60,
    },
    description: 'Style Woolf/Proust. Intériorité et contemplation, rythme lent toléré.',
  },

  EXPERIMENTAL: {
    name: 'Expérimental',
    seal_threshold: 78.0,
    min_axis: 65,
    weight_overrides: {
      'f15b_redundancy_compression': 0.50,
      'f16a_bigram_rarity': 0.50,
      'f1_mean': 0.60,
      'f24e_contrast_score': 1.40,
    },
    description: 'Style Faulkner/Simon. Fragmentation et expérimentation tolérées.',
  },
};

/**
 * Returns a quality profile by name. Falls back to LITTERAIRE if not found.
 */
export function getProfile(name: string): QualityProfile {
  return PROFILES[name] ?? PROFILES['LITTERAIRE'];
}

/**
 * Returns all available profile names.
 */
export function getProfileNames(): string[] {
  return Object.keys(PROFILES);
}
