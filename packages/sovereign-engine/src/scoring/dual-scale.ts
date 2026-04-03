/**
 * DUAL_SCALE — Score LOCAL (600w) + ARC (multi-briques)
 *
 * R2 FR @600w = 0.297 (plafond de mesure)
 * R2 FR @3000w = 0.519 (la vraie mesure)
 * Score_FINAL = 0.43 x LOCAL + 0.57 x ARC
 *
 * P2-00 ARC-03 : PRODUCTION MODE. SHADOW retiré.
 * Délègue le calcul ARC à arc-scorer.ts (3 sous-scores CALC).
 * Conservé comme wrapper de compatibilité pour engine.ts et les tests existants.
 */

import { pushScoreAndComputeArc, resetArc, type ArcScore } from './arc-scorer.js';

const W_LOCAL = 0.43;
const W_ARC = 0.57;

export function resetArcBuffer(): void {
  resetArc();
}

export interface DualScaleResult {
  readonly local_score: number;
  readonly arc_score: number;
  readonly dual_score: number;
  readonly arc_window_size: number;
  /** P2-00 : détail des 3 sous-scores ARC (progression, tension, closure). */
  readonly arc_detail?: ArcScore;
}

export function computeDualScale(localScore: number): DualScaleResult {
  const arcResult = pushScoreAndComputeArc(localScore);

  const dualScore = Math.round((W_LOCAL * localScore + W_ARC * arcResult.arc_composite) * 100) / 100;

  return {
    local_score: localScore,
    arc_score: Math.round(arcResult.arc_composite * 100) / 100,
    dual_score: dualScore,
    arc_window_size: 0, // deprecated — use arc_detail for window info
    arc_detail: arcResult,
  };
}
