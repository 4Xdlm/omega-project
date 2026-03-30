/**
 * DUAL_SCALE — Score LOCAL (600w) + ARC (multi-briques)
 *
 * R2 FR @600w = 0.297 (plafond de mesure)
 * R2 FR @3000w = 0.519 (la vraie mesure)
 * Score_FINAL = 0.43 x LOCAL + 0.57 x ARC
 *
 * SHADOW MODE (D1) : informatif uniquement.
 * ARC commence a LOCAL (pas de donnees multi-briques en shadow).
 */

const W_LOCAL = 0.43;
const W_ARC = 0.57;

let arcBuffer: number[] = [];

export function resetArcBuffer(): void {
  arcBuffer = [];
}

export interface DualScaleResult {
  readonly local_score: number;
  readonly arc_score: number;
  readonly dual_score: number;
  readonly arc_window_size: number;
}

export function computeDualScale(localScore: number): DualScaleResult {
  arcBuffer.push(localScore);

  const ARC_WINDOW = 5;
  const recentScores = arcBuffer.slice(-ARC_WINDOW);
  const arcScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

  const dualScore = Math.round((W_LOCAL * localScore + W_ARC * arcScore) * 100) / 100;

  return {
    local_score: localScore,
    arc_score: Math.round(arcScore * 100) / 100,
    dual_score: dualScore,
    arc_window_size: recentScores.length,
  };
}
