/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — STYLE PRESETS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: microsurgery/style-presets.ts
 * Version: 1.0.0 (Phase W Integration)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Predefined style configurations combining archetype + threshold overrides.
 * Based on Phase W research: archetype derivatives and category sensitivities.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ArchetypeId, DamageCategory, DamageGateConfig } from './damage-gate.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StylePreset {
  readonly name: string;
  readonly description: string;
  readonly archetype: ArchetypeId;
  readonly config: DamageGateConfig;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * LITTERAIRE_PREMIUM: Maximum protection of literary qualities.
 * Very strict on MUSICALITE and SENSORIEL. Low thresholds everywhere.
 * Archetype: CATHEDRAL (Proust/Simon — maximal syntactic sensitivity).
 */
export const LITTERAIRE_PREMIUM: StylePreset = {
  name: 'LITTERAIRE_PREMIUM',
  description: 'Maximum literary protection — Proust/Simon archetype, near-zero tolerances',
  archetype: 'CATHEDRAL',
  config: {
    max_amplitude: 0.30,
    thresholds: {
      MUSICALITE: 0.01,
      COMPLEXITE: 0.02,
      SENSORIEL: 0.01,
      LEXICAL: 0.03,
      INTERIORITE: 0.05,
      TENSION: 0.20,
    },
  },
};

/**
 * EQUILIBRE_FLAUBERT: Balanced protection with moderate tolerance.
 * MUSICALITE still protected. Other categories at research-calibrated thresholds.
 * Archetype: BALANCED (default — no multiplier distortions).
 */
export const EQUILIBRE_FLAUBERT: StylePreset = {
  name: 'EQUILIBRE_FLAUBERT',
  description: 'Balanced Flaubert style — default thresholds, BALANCED archetype',
  archetype: 'BALANCED',
  config: {
    max_amplitude: 0.50,
    thresholds: {
      MUSICALITE: 0.02,
      COMPLEXITE: 0.05,
      SENSORIEL: 0.03,
      LEXICAL: 0.08,
      INTERIORITE: 0.15,
      TENSION: 0.50,
    },
  },
};

/**
 * THRILLER_NERVEUX: Aggressive intervention permitted on most categories.
 * Only MUSICALITE is protected. High amplitude, high thresholds.
 * Archetype: BRUTAL (McCarthy — maximizes TENSION intervention effects).
 */
export const THRILLER_NERVEUX: StylePreset = {
  name: 'THRILLER_NERVEUX',
  description: 'Aggressive thriller style — BRUTAL archetype, high tolerances',
  archetype: 'BRUTAL',
  config: {
    max_amplitude: 0.50,
    thresholds: {
      MUSICALITE: 0.05,
      COMPLEXITE: 0.10,
      SENSORIEL: 0.10,
      LEXICAL: 0.15,
      INTERIORITE: 0.30,
      TENSION: 1.00,
    },
  },
};

/** All available presets indexed by name */
export const STYLE_PRESETS: Readonly<Record<string, StylePreset>> = {
  LITTERAIRE_PREMIUM,
  EQUILIBRE_FLAUBERT,
  THRILLER_NERVEUX,
};

/**
 * Get a style preset by name.
 * Returns undefined if not found.
 */
export function getPreset(name: string): StylePreset | undefined {
  return STYLE_PRESETS[name];
}
