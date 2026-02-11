/**
 * OMEGA Metrics — Dynamic Metrics (D1-D4)
 * Phase R-METRICS — Comparative metrics across runs
 * Deterministic, offline only
 */

import type { DynamicMetrics, MetricsReport } from '../types.js';

/**
 * D1 — intra_intent_stability (weight: 0.35)
 * Compares run vs replay of same intent. Hash-identical → 1.0
 */
export function intraIntentStability(
  runHash: string,
  replayHash: string | null,
): number | null {
  if (replayHash === null) return null; // SKIP
  return runHash === replayHash ? 1.0 : 0.0;
}

/**
 * D2 — inter_intent_variance (weight: 0.25)
 * Compares two runs of different intents.
 * Must show structural differences.
 */
export function interIntentVariance(
  run1: { plan_hash: string; arc_themes: string[]; scene_count: number; final_emotion: string },
  run2: { plan_hash: string; arc_themes: string[]; scene_count: number; final_emotion: string } | null,
): number | null {
  if (run2 === null) return null; // SKIP

  let score = 0;

  // Different plan hashes
  if (run1.plan_hash !== run2.plan_hash) score += 0.25;

  // Different arc themes
  const themes1 = new Set(run1.arc_themes.map(t => t.toLowerCase()));
  const themes2 = new Set(run2.arc_themes.map(t => t.toLowerCase()));
  const themesEqual = themes1.size === themes2.size && [...themes1].every(t => themes2.has(t));
  if (!themesEqual) score += 0.25;

  // Different scene count
  if (run1.scene_count !== run2.scene_count) score += 0.25;

  // Different final emotion
  if (run1.final_emotion.toLowerCase() !== run2.final_emotion.toLowerCase()) score += 0.25;

  return score;
}

/**
 * D3 — variant_sensitivity (weight: 0.20)
 * Compares baseline vs variant of same intent with modifications.
 * Requires variant run (typically not available in standard golden runs).
 */
export function variantSensitivity(
  _baselineHash: string,
  _variantHash: string | null,
): number | null {
  // Currently SKIP — requires variant run data
  return null;
}

/**
 * D4 — noise_floor_ratio (weight: 0.20)
 * Ratio of unexplained variance to signal variance.
 * Score = 1.0 - (noise / signal). Higher is better.
 */
export function noiseFloorRatio(
  signalDistance: number | null,
  noiseDistance: number | null,
): number | null {
  if (signalDistance === null || noiseDistance === null) return null;
  if (signalDistance === 0) return 0;

  const ratio = noiseDistance / signalDistance;
  return Math.max(0, Math.min(1.0, 1.0 - ratio));
}

/**
 * Compute structural distance between two plans (for noise floor)
 * Returns normalized count of differing fields.
 */
export function planDistance(
  plan1: { scene_count: number; beat_count: number; arc_count: number; plan_hash: string },
  plan2: { scene_count: number; beat_count: number; arc_count: number; plan_hash: string },
): number {
  let diffs = 0;
  const total = 4;

  if (plan1.scene_count !== plan2.scene_count) diffs++;
  if (plan1.beat_count !== plan2.beat_count) diffs++;
  if (plan1.arc_count !== plan2.arc_count) diffs++;
  if (plan1.plan_hash !== plan2.plan_hash) diffs++;

  return diffs / total;
}

/**
 * Compute all dynamic metrics from run reports
 */
export function computeDynamicMetrics(
  runReport: { artifacts_hash: string; plan_hash: string; arc_themes: string[]; scene_count: number; beat_count: number; arc_count: number; final_emotion: string },
  replayReport: { artifacts_hash: string; plan_hash: string; scene_count: number; beat_count: number; arc_count: number } | null,
  otherRunReport: { plan_hash: string; arc_themes: string[]; scene_count: number; beat_count: number; arc_count: number; final_emotion: string } | null,
): DynamicMetrics {
  // D1: stability (run vs replay)
  const d1 = intraIntentStability(
    runReport.plan_hash,
    replayReport?.plan_hash ?? null,
  );

  // D2: variance (run vs different intent)
  const d2 = interIntentVariance(
    runReport,
    otherRunReport,
  );

  // D3: variant sensitivity (always SKIP for now)
  const d3 = variantSensitivity(runReport.plan_hash, null);

  // D4: noise floor
  let d4: number | null = null;
  if (replayReport && otherRunReport) {
    const signal = planDistance(
      runReport,
      { ...otherRunReport, plan_hash: otherRunReport.plan_hash },
    );
    const noise = planDistance(
      runReport,
      replayReport,
    );
    d4 = noiseFloorRatio(signal, noise);
  }

  return {
    intra_intent_stability: d1,
    inter_intent_variance: d2,
    variant_sensitivity: d3,
    noise_floor_ratio: d4,
  };
}
