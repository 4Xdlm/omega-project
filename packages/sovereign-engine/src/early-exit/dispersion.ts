/**
 * OMEGA V2.3 — Dispersion Estimator (IMPLEMENTED — pure math)
 *
 * Computes statistical dispersion across axis scores.
 * Used by EarlyExitGate to decide if candidate is uniformly high → confident exit.
 */

import type { AxisScores, DispersionResult } from './types.js';

/**
 * Compute dispersion (stdev + mean + range) for an array of numeric scores.
 *
 * @param values - Score values
 * @returns Dispersion statistics
 */
export function computeDispersion(values: readonly number[]): DispersionResult {
  if (values.length === 0) {
    return { stdev: 0, mean: 0, min: 0, max: 0, range: 0 };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;

  let variance = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const v of values) {
    variance += (v - mean) ** 2;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  variance /= values.length;
  const stdev = Math.sqrt(variance);

  return {
    stdev,
    mean,
    min,
    max,
    range: max - min,
  };
}

/**
 * Compute dispersion across 5 S-Oracle macro-axes.
 *
 * @param scores - Axis scores object
 * @returns Dispersion result
 */
export function computeAxisDispersion(scores: AxisScores): DispersionResult {
  return computeDispersion([scores.ecc, scores.aai, scores.rci, scores.sii, scores.ifi]);
}

/**
 * Compute composite score (weighted average of 5 axes).
 *
 * Default weights uniform 0.2 each. Sprint V2.3 may calibrate weights.
 *
 * @param scores - Axis scores
 * @param weights - Optional axis weights (must sum to 1)
 * @returns Composite score
 */
export function compositeScore(
  scores: AxisScores,
  weights?: { ecc: number; aai: number; rci: number; sii: number; ifi: number }
): number {
  const w = weights ?? { ecc: 0.2, aai: 0.2, rci: 0.2, sii: 0.2, ifi: 0.2 };
  return (
    scores.ecc * w.ecc +
    scores.aai * w.aai +
    scores.rci * w.rci +
    scores.sii * w.sii +
    scores.ifi * w.ifi
  );
}
