/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — WEIGHT CALIBRATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: calibration/weight-calibrator.ts
 * Sprint: 18.1
 * Invariant: ART-CAL-01
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Adjusts axis weights based on correlation with human perception.
 * High-correlation axes get more weight, low-correlation get less.
 * Maintains total weight sum and minimum floor per axis.
 *
 * 100% CALC — deterministic.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { AxisCorrelation, CorrelationReport } from '../benchmark/correlation.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WeightAdjustment {
  readonly axis: string;
  readonly current_weight: number;
  readonly correlation_r: number;
  readonly adjusted_weight: number;
  readonly delta: number;            // adjusted - current
  readonly reason: string;
}

export interface CalibrationResult {
  readonly adjustments: readonly WeightAdjustment[];
  readonly total_weight_before: number;
  readonly total_weight_after: number;
  readonly max_delta: number;
  readonly calibration_quality: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface WeightConfig {
  readonly axis: string;
  readonly weight: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimum weight for any axis.
 * No axis can be pushed below this floor regardless of correlation.
 */
const MIN_WEIGHT = 0.5;

/**
 * Maximum weight adjustment per calibration round.
 * Prevents drastic changes from a single benchmark.
 */
const MAX_ADJUSTMENT = 0.5;

/**
 * Default macro-axis weights (ECC, RCI, SII, IFI, AAI).
 * From current SOVEREIGN_CONFIG.
 */
export const DEFAULT_MACRO_WEIGHTS: readonly WeightConfig[] = [
  { axis: 'ecc', weight: 0.30 },
  { axis: 'rci', weight: 0.17 },
  { axis: 'sii', weight: 0.18 },
  { axis: 'ifi', weight: 0.15 },
  { axis: 'aai', weight: 0.20 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CALIBRATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calibrate axis weights based on correlation report.
 *
 * Strategy:
 * - Axes with |r| > 0.7 (ALIGNED): boost weight by up to +MAX_ADJUSTMENT
 * - Axes with |r| 0.5-0.7 (WEAK): keep weight unchanged
 * - Axes with |r| < 0.5 (MISALIGNED): reduce weight by up to -MAX_ADJUSTMENT
 * - Normalize to maintain total weight sum = 1.0
 * - Enforce minimum floor per axis
 *
 * @param currentWeights - Current axis weights
 * @param report - Correlation report from benchmark
 * @returns CalibrationResult with new weights
 */
export function calibrateWeights(
  currentWeights: readonly WeightConfig[],
  report: CorrelationReport,
): CalibrationResult {
  const totalBefore = currentWeights.reduce((sum, w) => sum + w.weight, 0);

  // Map correlations by omega axis
  const corrMap = new Map<string, AxisCorrelation>();
  for (const corr of report.correlations) {
    corrMap.set(corr.omega_axis, corr);
  }

  // Compute raw adjustments
  const rawAdjustments: Array<{
    axis: string;
    current: number;
    rawTarget: number;
    r: number;
    reason: string;
  }> = [];

  for (const wc of currentWeights) {
    const corr = corrMap.get(wc.axis);

    if (!corr) {
      // No correlation data → keep unchanged
      rawAdjustments.push({
        axis: wc.axis,
        current: wc.weight,
        rawTarget: wc.weight,
        r: 0,
        reason: 'No correlation data — weight unchanged',
      });
      continue;
    }

    const absR = Math.abs(corr.pearson_r);
    let delta = 0;
    let reason = '';

    if (absR > 0.7) {
      // ALIGNED: boost proportional to |r|
      delta = MAX_ADJUSTMENT * ((absR - 0.7) / 0.3);
      reason = `ALIGNED (r=${corr.pearson_r.toFixed(3)}) — weight boosted`;
    } else if (absR >= 0.5) {
      // WEAK: no change
      delta = 0;
      reason = `WEAK (r=${corr.pearson_r.toFixed(3)}) — weight unchanged`;
    } else {
      // MISALIGNED: reduce proportional to distance from 0.5
      delta = -MAX_ADJUSTMENT * ((0.5 - absR) / 0.5);
      reason = `MISALIGNED (r=${corr.pearson_r.toFixed(3)}) — weight reduced`;
    }

    const rawTarget = Math.max(MIN_WEIGHT, wc.weight + delta);

    rawAdjustments.push({
      axis: wc.axis,
      current: wc.weight,
      rawTarget,
      r: corr.pearson_r,
      reason,
    });
  }

  // Normalize to maintain total = totalBefore
  const rawSum = rawAdjustments.reduce((sum, a) => sum + a.rawTarget, 0);
  const scale = rawSum > 0 ? totalBefore / rawSum : 1;

  const adjustments: WeightAdjustment[] = rawAdjustments.map(a => {
    const adjusted = Math.max(MIN_WEIGHT, Math.round(a.rawTarget * scale * 100) / 100);
    return {
      axis: a.axis,
      current_weight: a.current,
      correlation_r: a.r,
      adjusted_weight: adjusted,
      delta: Math.round((adjusted - a.current) * 100) / 100,
      reason: a.reason,
    };
  });

  const totalAfter = adjustments.reduce((sum, a) => sum + a.adjusted_weight, 0);
  const maxDelta = Math.max(...adjustments.map(a => Math.abs(a.delta)));

  // Calibration quality based on overall correlation
  let calibration_quality: 'HIGH' | 'MEDIUM' | 'LOW';
  if (report.overall_correlation >= 0.7) {
    calibration_quality = 'HIGH';
  } else if (report.overall_correlation >= 0.5) {
    calibration_quality = 'MEDIUM';
  } else {
    calibration_quality = 'LOW';
  }

  return {
    adjustments,
    total_weight_before: Math.round(totalBefore * 100) / 100,
    total_weight_after: Math.round(totalAfter * 100) / 100,
    max_delta: Math.round(maxDelta * 100) / 100,
    calibration_quality,
  };
}
