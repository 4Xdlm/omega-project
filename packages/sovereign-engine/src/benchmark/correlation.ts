/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — BENCHMARK CORRELATION REPORT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: benchmark/correlation.ts
 * Sprint: 17.3
 * Invariant: ART-BENCH-03
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Computes correlation between OMEGA axes scores and human evaluations.
 * Uses Pearson correlation coefficient.
 * Identifies axes that need recalibration (correlation < 0.5).
 *
 * 100% CALC — deterministic.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { HumanEvaluation } from './protocol.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AxisCorrelation {
  readonly omega_axis: string;           // OMEGA axis name
  readonly human_axis: string;           // Human evaluation axis name
  readonly pearson_r: number;            // Pearson correlation coefficient [-1, 1]
  readonly p_significant: boolean;       // |r| > 0.5 considered significant
  readonly n_samples: number;            // Number of data points
  readonly verdict: 'ALIGNED' | 'WEAK' | 'MISALIGNED';
}

export interface CorrelationReport {
  readonly report_id: string;
  readonly date: string;
  readonly correlations: readonly AxisCorrelation[];
  readonly overall_correlation: number;  // Average |r| across axes
  readonly axes_to_recalibrate: readonly string[];
  readonly omega_vs_human_quality: {
    readonly omega_mean: number;
    readonly human_mean: number;
    readonly delta: number;              // omega - human (positive = OMEGA scored higher)
  };
  readonly verdict: 'PASS' | 'NEEDS_CALIBRATION';
}

export interface ScoreDataPoint {
  readonly sample_id: string;
  readonly omega_score: number;          // 0-100
  readonly human_score: number;          // 1-10 (normalized to 0-100)
}

// ═══════════════════════════════════════════════════════════════════════════════
// PEARSON CORRELATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute Pearson correlation coefficient between two arrays.
 * Returns value in [-1, 1].
 * Returns 0 if insufficient data or zero variance.
 */
export function pearsonCorrelation(x: readonly number[], y: readonly number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0; // Need at least 3 points

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denominator = Math.sqrt(sumX2 * sumY2);
  if (denominator === 0) return 0;

  return sumXY / denominator;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AXIS MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mapping between OMEGA macro-axes and human evaluation axes.
 */
export const AXIS_MAPPING: ReadonlyArray<{ omega: string; human: keyof HumanEvaluation }> = [
  { omega: 'ecc', human: 'emotion_impact' },
  { omega: 'rci', human: 'rhythm_musicality' },
  { omega: 'ifi', human: 'sensory_immersion' },
  { omega: 'sii', human: 'originality' },
  { omega: 'aai', human: 'authenticity' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CORRELATION COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute correlation report between OMEGA scores and human evaluations.
 *
 * @param omegaScores - Map of sample_id → { axis_name → score (0-100) }
 * @param humanEvals - Array of human evaluations
 * @returns CorrelationReport
 */
export function computeCorrelationReport(
  omegaScores: ReadonlyMap<string, Record<string, number>>,
  humanEvals: readonly HumanEvaluation[],
): CorrelationReport {
  // Group human evals by sample_id, average scores
  const humanBySample = new Map<string, Record<string, number>>();

  for (const eval_ of humanEvals) {
    if (!humanBySample.has(eval_.sample_id)) {
      humanBySample.set(eval_.sample_id, {
        emotion_impact: 0,
        rhythm_musicality: 0,
        sensory_immersion: 0,
        originality: 0,
        authenticity: 0,
        overall_quality: 0,
        count: 0,
      });
    }
    const agg = humanBySample.get(eval_.sample_id)!;
    agg.emotion_impact += eval_.emotion_impact;
    agg.rhythm_musicality += eval_.rhythm_musicality;
    agg.sensory_immersion += eval_.sensory_immersion;
    agg.originality += eval_.originality;
    agg.authenticity += eval_.authenticity;
    agg.overall_quality += eval_.overall_quality;
    agg.count += 1;
  }

  // Average human scores
  for (const [, agg] of humanBySample) {
    const c = agg.count;
    agg.emotion_impact /= c;
    agg.rhythm_musicality /= c;
    agg.sensory_immersion /= c;
    agg.originality /= c;
    agg.authenticity /= c;
    agg.overall_quality /= c;
  }

  // Compute correlations per axis
  const correlations: AxisCorrelation[] = [];
  const sampleIds = [...omegaScores.keys()].filter(id => humanBySample.has(id));

  for (const mapping of AXIS_MAPPING) {
    const omegaValues: number[] = [];
    const humanValues: number[] = [];

    for (const id of sampleIds) {
      const omegaScore = omegaScores.get(id)?.[mapping.omega];
      const humanAvg = humanBySample.get(id)?.[mapping.human as string];

      if (omegaScore !== undefined && humanAvg !== undefined) {
        omegaValues.push(omegaScore);
        humanValues.push(humanAvg * 10); // Normalize 1-10 → 10-100
      }
    }

    const r = pearsonCorrelation(omegaValues, humanValues);
    const absR = Math.abs(r);

    correlations.push({
      omega_axis: mapping.omega,
      human_axis: mapping.human as string,
      pearson_r: Math.round(r * 1000) / 1000,
      p_significant: absR > 0.5,
      n_samples: omegaValues.length,
      verdict: absR > 0.7 ? 'ALIGNED' : absR > 0.5 ? 'WEAK' : 'MISALIGNED',
    });
  }

  // Overall correlation
  const avgAbsR = correlations.length > 0
    ? correlations.reduce((sum, c) => sum + Math.abs(c.pearson_r), 0) / correlations.length
    : 0;

  // Axes to recalibrate
  const axesToRecalibrate = correlations
    .filter(c => c.verdict === 'MISALIGNED')
    .map(c => c.omega_axis);

  // OMEGA vs human quality comparison
  let omegaMean = 0;
  let humanMean = 0;
  let qualityCount = 0;

  for (const id of sampleIds) {
    const omegaOverall = omegaScores.get(id)?.['composite'];
    const humanOverall = humanBySample.get(id)?.['overall_quality'];

    if (omegaOverall !== undefined && humanOverall !== undefined) {
      omegaMean += omegaOverall;
      humanMean += humanOverall * 10;
      qualityCount++;
    }
  }

  if (qualityCount > 0) {
    omegaMean /= qualityCount;
    humanMean /= qualityCount;
  }

  const verdict = avgAbsR >= 0.5 ? 'PASS' : 'NEEDS_CALIBRATION';

  return {
    report_id: `CORR-${Date.now()}`,
    date: new Date().toISOString(),
    correlations,
    overall_correlation: Math.round(avgAbsR * 1000) / 1000,
    axes_to_recalibrate: axesToRecalibrate,
    omega_vs_human_quality: {
      omega_mean: Math.round(omegaMean * 10) / 10,
      human_mean: Math.round(humanMean * 10) / 10,
      delta: Math.round((omegaMean - humanMean) * 10) / 10,
    },
    verdict,
  };
}
