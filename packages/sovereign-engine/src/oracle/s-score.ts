/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — S-SCORE COMPOSITE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/s-score.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Computes weighted composite S-Score from 9 axes.
 * THRESHOLD: 92/100 for SEAL, <92 = REJECT.
 * FLOOR: All axes must be ≥50, even if composite ≥92.
 * EMOTION WEIGHT: 63.3% (interiority 2.0 + tension_14d 3.0 + emotion_coherence 2.5 + impact 2.0 = 9.5 / 15.0).
 *
 * ALGORITHM:
 * 1. Compute weighted sum: Σ(axis.score × axis.weight) / Σ(axis.weight)
 * 2. Check floor: all axes ≥ 50
 * 3. Verdict: composite ≥92 AND all axes ≥50 → SEAL, else REJECT
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { AxesScores, SScore } from '../types.js';
import type { MacroAxesScores } from './macro-axes.js';
import { SOVEREIGN_CONFIG } from '../config.js';

export function computeSScore(
  axes: AxesScores,
  scene_id: string,
  seed: string,
): SScore {
  const axesArray = [
    axes.interiority,
    axes.tension_14d,
    axes.sensory_density,
    axes.necessity,
    axes.anti_cliche,
    axes.rhythm,
    axes.signature,
    axes.impact,
    axes.emotion_coherence,
  ];

  const weightedSum = axesArray.reduce((sum, axis) => sum + axis.score * axis.weight, 0);
  const totalWeight = axesArray.reduce((sum, axis) => sum + axis.weight, 0);

  const composite = weightedSum / totalWeight;

  const allAboveFloor = axesArray.every((axis) => axis.score >= SOVEREIGN_CONFIG.AXIS_FLOOR);

  const verdict: 'SEAL' | 'REJECT' =
    composite >= SOVEREIGN_CONFIG.SOVEREIGN_THRESHOLD && allAboveFloor ? 'SEAL' : 'REJECT';

  const emotionAxes = [axes.interiority, axes.tension_14d, axes.emotion_coherence, axes.impact];
  const emotionWeightSum = emotionAxes.reduce((sum, axis) => sum + axis.weight, 0);
  const emotion_weight_pct = (emotionWeightSum / totalWeight) * 100;

  const score_data = {
    scene_id,
    seed,
    axes,
    composite,
    verdict,
    emotion_weight_pct,
  };

  const score_hash = sha256(canonicalize(score_data));

  return {
    score_id: `SSCORE_${scene_id}_${Date.now()}`,
    score_hash,
    ...score_data,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MACRO S-SCORE — v3 avec 4 macro-axes
// ═══════════════════════════════════════════════════════════════════════════════

export interface MacroSScore {
  readonly score_id: string;
  readonly score_hash: string;
  readonly scene_id: string;
  readonly seed: string;
  readonly macro_axes: MacroAxesScores;
  readonly composite: number;
  readonly min_axis: number;
  readonly verdict: 'SEAL' | 'PITCH' | 'REJECT';
  readonly ecc_score: number;
  readonly emotion_weight_pct: number;
}

/**
 * Calcule le S-Score composite à partir des 4 macro-axes
 * ZONES:
 * - GREEN: composite ≥92 AND min_axis ≥85 AND ecc ≥88 → SEAL
 * - YELLOW: composite ≥85 AND min_axis ≥75 → PITCH
 * - RED: composite <85 → REJECT
 */
export function computeMacroSScore(
  macroAxes: MacroAxesScores,
  scene_id: string,
  seed: string,
): MacroSScore {
  const composite =
    macroAxes.ecc.score * SOVEREIGN_CONFIG.MACRO_WEIGHTS.ecc +
    macroAxes.rci.score * SOVEREIGN_CONFIG.MACRO_WEIGHTS.rci +
    macroAxes.sii.score * SOVEREIGN_CONFIG.MACRO_WEIGHTS.sii +
    macroAxes.ifi.score * SOVEREIGN_CONFIG.MACRO_WEIGHTS.ifi +
    macroAxes.aai.score * SOVEREIGN_CONFIG.MACRO_WEIGHTS.aai; // Sprint 11

  const min_axis = Math.min(
    macroAxes.ecc.score,
    macroAxes.rci.score,
    macroAxes.sii.score,
    macroAxes.ifi.score,
    macroAxes.aai.score, // Sprint 11
  );

  // ZONES (Sprint 11: +AAI floor check)
  const verdict: 'SEAL' | 'PITCH' | 'REJECT' =
    composite >= 92 && min_axis >= 85 && macroAxes.ecc.score >= 88 && macroAxes.aai.score >= 85
      ? 'SEAL'
      : composite >= 85 && min_axis >= 75
        ? 'PITCH'
        : 'REJECT';

  // Hash
  const data = { scene_id, seed, macroAxes, composite, verdict, min_axis };
  const score_hash = sha256(canonicalize(data));

  return {
    score_id: `MACRO_${scene_id}_${Date.now()}`,
    score_hash,
    scene_id,
    seed,
    macro_axes: macroAxes,
    composite,
    min_axis,
    verdict,
    ecc_score: macroAxes.ecc.score,
    emotion_weight_pct: SOVEREIGN_CONFIG.MACRO_WEIGHTS.ecc * 100,
  };
}
