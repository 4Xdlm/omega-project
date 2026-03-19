/**
 * OMEGA Passage Type Detector
 * Phase R4 — Detects the type of a text passage from its features.
 *
 * Uses empirical thresholds derived from R2/R3 data (181 works, 9141 windows).
 * Thresholds are loaded from the coefficients JSON (type_modifiers).
 *
 * FIX Grand Parallèle: DIALOGUE detection now requires actual dialogue markers
 * (guillemets, tirets cadratins, quotes). Literary prose with many short paragraphs
 * was false-positive triggering DIALOGUE via f34b alone.
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
    /** Minimum ratio of lines containing dialogue markers (« » — "" –).
     *  Raised from 0.20 to 0.40 after audit: Confrontation (35% markers)
     *  was false-positive. Only passages with >40% dialogue lines qualify. */
    dialogue_marker_min_ratio: 0.40,
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
 * @param text - Optional raw text for dialogue marker detection
 * @returns The detected passage type
 */
export function detectPassageType(features: Record<string, number>, text?: string): PassageType {
  const f34b = features['f34b_para_per_1000w'] ?? 0;
  const f33a = features['f33a_dots_count'] ?? 0;
  const f5a = features['f5a_verb_density'] ?? 0;
  const f38c = features['f38c_speed_score'] ?? 0;
  const f1 = features['f1_mean'] ?? 20;
  const f28d = features['f28d_sil_score'] ?? 0;
  const f27d = features['f27d_modal_score'] ?? 0;
  const f12b = features['f12b_tense_switch_rate'] ?? 0;

  // DIALOGUE: high paragraph density + high punctuation dots + actual dialogue markers
  // FIX Grand Parallèle: literary prose with many \n\n paragraphs was false-positive.
  // Real dialogue has guillemets (« »), tirets cadratins (—/–), or quotes ("").
  if (
    f34b > THRESHOLDS.dialogue.f34b_para_per_1000w_p75 &&
    f33a > THRESHOLDS.dialogue.f33a_dots_count_p75
  ) {
    // If raw text is provided, verify dialogue markers
    if (text) {
      const dialogueMarkerRatio = computeDialogueMarkerRatio(text);
      if (dialogueMarkerRatio >= THRESHOLDS.dialogue.dialogue_marker_min_ratio) {
        return 'DIALOGUE';
      }
      // else: f34b/f33a triggered but no actual dialogue markers → fall through
    } else {
      // No text available — use feature-only heuristic (legacy behavior)
      return 'DIALOGUE';
    }
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

/**
 * Computes the ratio of lines containing dialogue markers.
 * Dialogue markers: « » — – "" '' (guillemets, tirets cadratins, quotes)
 *
 * A line is counted as "dialogue" if it starts with a tiret cadratin/semi-cadratin,
 * or contains guillemets or quotation marks used for speech.
 *
 * @param text - Raw text
 * @returns Ratio 0.0-1.0 of lines with dialogue markers
 */
export function computeDialogueMarkerRatio(text: string): number {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return 0;

  let dialogueCount = 0;
  for (const line of lines) {
    if (
      line.startsWith('—') ||
      line.startsWith('–') ||
      line.startsWith('- ') ||
      line.startsWith('« ') ||
      line.startsWith('«') ||
      line.includes('« ') ||
      line.includes(' »') ||
      line.includes('« ') ||
      // English-style quotes used for dialogue (not scare quotes)
      /^[""\u201C]/.test(line) ||
      /^\s*[""\u201C]/.test(line)
    ) {
      dialogueCount++;
    }
  }

  return dialogueCount / lines.length;
}
