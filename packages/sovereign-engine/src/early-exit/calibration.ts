/**
 * OMEGA V2.3 — Threshold Calibration Framework
 *
 * Bench-runner agnostic framework for calibrating EarlyExitGate threshold
 * against historical run dataset.
 *
 * Use case: Architecte fournit N runs avec scores axis + qualité finale,
 * framework cherche threshold optimisant (skip_rate, quality_drift).
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Sprint V2.3 implementation 2026-05-26
 */

import type { AxisScores, EarlyExitConfig } from './types.js';
import { computeAxisDispersion, compositeScore } from './dispersion.js';

export interface CalibrationSample {
  readonly chapter_id: string;
  readonly first_candidate_scores: AxisScores;
  readonly final_quality: number; // ground truth from full Best-of-N
}

export interface CalibrationResult {
  readonly threshold: number;
  readonly skip_rate: number; // fraction skipped
  readonly avg_quality_skipped: number;
  readonly avg_quality_full: number;
  readonly quality_drift: number; // skipped vs full
  readonly samples_count: number;
}

export interface CalibrationSearchConfig {
  readonly min_threshold: number;
  readonly max_threshold: number;
  readonly step: number;
  readonly min_skip_rate: number; // optimization constraint
  readonly max_skip_rate: number;
  readonly max_quality_drift: number; // optimization constraint
}

export const DEFAULT_CALIBRATION_SEARCH: CalibrationSearchConfig = {
  min_threshold: 1.0,
  max_threshold: 10.0,
  step: 0.5,
  min_skip_rate: 0.2,
  max_skip_rate: 0.8,
  max_quality_drift: 1.0,
};

/**
 * Evaluate a threshold against calibration samples.
 *
 * For each sample, decide if early-exit would trigger.
 * Compute skip_rate + avg_quality_skipped vs avg_quality_full.
 */
export function evaluateThreshold(
  samples: readonly CalibrationSample[],
  threshold: number,
  baseConfig: EarlyExitConfig
): CalibrationResult {
  if (samples.length === 0) {
    return {
      threshold,
      skip_rate: 0,
      avg_quality_skipped: 0,
      avg_quality_full: 0,
      quality_drift: 0,
      samples_count: 0,
    };
  }

  let skipped = 0;
  // Audit 2026-05-26 P1 fix : drift on SAME subset (skipped samples)
  // Was: avg_quality_full (all samples) - avg_composite (skipped subset) → biased populations
  // Now: drift = avg(final - composite) ON skipped subset only (true skip cost)
  let totalCompositeSkippedSubset = 0;
  let totalFinalSkippedSubset = 0;
  let totalQualityFull = 0;

  for (const sample of samples) {
    const dispersion = computeAxisDispersion(sample.first_candidate_scores);
    const composite = compositeScore(sample.first_candidate_scores);

    const wouldSkip =
      composite >= baseConfig.min_avg_score &&
      dispersion.min >= baseConfig.absolute_floor &&
      dispersion.stdev <= threshold;

    if (wouldSkip) {
      skipped++;
      totalCompositeSkippedSubset += composite;
      totalFinalSkippedSubset += sample.final_quality;
    }
    totalQualityFull += sample.final_quality;
  }

  return {
    threshold,
    skip_rate: skipped / samples.length,
    avg_quality_skipped: skipped > 0 ? totalCompositeSkippedSubset / skipped : 0,
    avg_quality_full: totalQualityFull / samples.length,
    // Drift on the SAME subset : ground truth - approximation
    // Positive = we'd lose quality by skipping (skip cost)
    // Negative = composite over-estimates final (rare)
    quality_drift:
      skipped > 0
        ? (totalFinalSkippedSubset - totalCompositeSkippedSubset) / skipped
        : 0,
    samples_count: samples.length,
  };
}

/**
 * Grid search optimal threshold over a range.
 *
 * Returns thresholds satisfying constraints (skip_rate + quality_drift)
 * sorted by composite score (higher skip_rate * lower quality_drift = better).
 */
export function gridSearchThreshold(
  samples: readonly CalibrationSample[],
  baseConfig: EarlyExitConfig,
  searchConfig: CalibrationSearchConfig = DEFAULT_CALIBRATION_SEARCH
): CalibrationResult[] {
  const results: CalibrationResult[] = [];

  for (
    let t = searchConfig.min_threshold;
    t <= searchConfig.max_threshold;
    t += searchConfig.step
  ) {
    const result = evaluateThreshold(samples, t, baseConfig);
    results.push(result);
  }

  // Filter valid + sort
  const valid = results.filter(
    (r) =>
      r.skip_rate >= searchConfig.min_skip_rate &&
      r.skip_rate <= searchConfig.max_skip_rate &&
      Math.abs(r.quality_drift) <= searchConfig.max_quality_drift
  );

  // Composite score: higher is better
  return valid.sort((a, b) => {
    const scoreA = a.skip_rate * 100 - Math.abs(a.quality_drift) * 10;
    const scoreB = b.skip_rate * 100 - Math.abs(b.quality_drift) * 10;
    return scoreB - scoreA;
  });
}

/**
 * Generate synthetic calibration samples for smoke testing the framework.
 *
 * NOT production data — use real Best-of-N runs for real calibration.
 */
export function generateSyntheticSamples(count: number, seed: number = 42): CalibrationSample[] {
  // Simple linear congruential generator for deterministic samples
  let state = seed;
  const rand = (): number => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };

  const samples: CalibrationSample[] = [];
  for (let i = 0; i < count; i++) {
    const baseQuality = 70 + rand() * 25; // 70-95
    const variance = rand() * 8;
    samples.push({
      chapter_id: `synthetic_${i}`,
      first_candidate_scores: {
        ecc: baseQuality + (rand() - 0.5) * variance,
        aai: baseQuality + (rand() - 0.5) * variance,
        rci: baseQuality + (rand() - 0.5) * variance,
        sii: baseQuality + (rand() - 0.5) * variance,
        ifi: baseQuality + (rand() - 0.5) * variance,
      },
      final_quality: baseQuality + rand() * 5, // final usually slightly higher
    });
  }
  return samples;
}
