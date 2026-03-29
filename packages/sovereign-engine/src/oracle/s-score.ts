/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — S-SCORE COMPOSITE (LEGACY)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @deprecated Use s-oracle-v2.ts for all scoring decisions.
 * This module is kept for backward compatibility only.
 * The 9-axis weighting system here (total=15.0) is superseded by
 * the macro-axes system (ECC/RCI/SII/IFI/AAI, total=1.00) in s-oracle-v2.ts.
 *
 * @see src/oracle/s-oracle-v2.ts — Source de verite pour le scoring
 * @see src/oracle/macro-axes.ts — Calcul des 5 macro-axes
 * @see src/config.ts MACRO_WEIGHTS — Ponderations officielles (ECC=33%, AAI=25%, RCI=17%, SII=15%, IFI=10%)
 *
 * Module: oracle/s-score.ts
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * @deprecated LEGACY — Utiliser s-oracle-v2.ts comme autorité de scoring.
 *
 * Ce module est conservé pour backward compatibility uniquement.
 * L'autorité de scoring est oracle/s-oracle-v2.ts (macro-axes ECC/RCI/SII/IFI/AAI).
 *
 * NE PAS ajouter de nouvelles fonctionnalités ici.
 * Toute évolution du scoring doit se faire dans s-oracle-v2.ts.
 *
 * Migration : 2026-03-14 — CLEAN-2 SSOT consolidation
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

  // ZONES (Sprint 12: Threshold 93, floor checks)
  const verdict: 'SEAL' | 'PITCH' | 'REJECT' =
    composite >= SOVEREIGN_CONFIG.ZONES.GREEN.min_composite &&
    min_axis >= SOVEREIGN_CONFIG.ZONES.GREEN.min_axis &&
    macroAxes.ecc.score >= SOVEREIGN_CONFIG.MACRO_FLOORS.ecc &&
    macroAxes.aai.score >= SOVEREIGN_CONFIG.MACRO_FLOORS.aai
      ? 'SEAL'
      : composite >= SOVEREIGN_CONFIG.ZONES.YELLOW.min_composite &&
        min_axis >= SOVEREIGN_CONFIG.ZONES.YELLOW.min_axis
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
