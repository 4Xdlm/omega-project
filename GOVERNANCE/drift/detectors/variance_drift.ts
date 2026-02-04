/**
 * VARIANCE DRIFT DETECTOR (D-V)
 * Phase E — Statistical dispersion abnormal
 *
 * Detects when statistical dispersion of observed metrics exceeds
 * baseline expectations, indicating instability.
 *
 * INV-E-01: Read-only (no BUILD code access)
 * INV-E-02: Zero side effects (pure function)
 */

import type { ObservationSources, Baseline, DriftResult } from '../types.js';
import { DRIFT_SCORING_DEFAULTS } from '../types.js';
import { computeDriftScore, classifyScore } from '../scoring.js';
import { generateDriftId, computeNumericDeviation } from '../drift_utils.js';

/** Coefficient of variation threshold for anomaly detection */
const CV_THRESHOLD = 0.5;

/**
 * Detect variance drift in observations.
 * Computes statistical metrics across snapshot values and detects
 * when dispersion exceeds expected baseline stability.
 *
 * @param observations - Phase D observation sources
 * @param baseline - Certified baseline reference
 * @returns DriftResult if variance drift detected, null otherwise
 */
export function detectVarianceDrift(
  observations: ObservationSources,
  baseline: Baseline
): DriftResult | null {
  const defaults = DRIFT_SCORING_DEFAULTS['D-V'];

  if (observations.snapshots.length < 3) return null;

  // Collect measurable metrics from snapshots
  const eventCounts = observations.snapshots.map(s => s.events_count_total);
  const anomalyCounts = observations.snapshots.map(s =>
    s.anomalies.tooling_drift + s.anomalies.product_drift + s.anomalies.incidents
  );

  const issues: string[] = [];

  // Check coefficient of variation of event counts
  const eventStats = computeStats(eventCounts);
  if (eventStats.mean > 0) {
    const cv = eventStats.stddev / eventStats.mean;
    if (cv > CV_THRESHOLD) {
      issues.push(`event_count:cv=${round(cv)}:mean=${round(eventStats.mean)}:stddev=${round(eventStats.stddev)}`);
    }
  }

  // Check variance in anomaly counts (should be near-zero in stable system)
  const anomalyStats = computeStats(anomalyCounts);
  if (anomalyStats.mean > 0 || anomalyStats.stddev > 0) {
    issues.push(`anomaly_count:mean=${round(anomalyStats.mean)}:stddev=${round(anomalyStats.stddev)}`);
  }

  // Check verdict distribution variance across log entries
  const verdictCounts = countVerdicts(observations);
  if (verdictCounts.nonPass > 0) {
    issues.push(`verdict_variance:non_pass=${verdictCounts.nonPass}:total=${verdictCounts.total}`);
  }

  if (issues.length === 0) return null;

  const persistence = Math.max(1, issues.length);
  if (persistence < defaults.persistenceMin) return null;

  const impact = anomalyStats.mean > 0 ? 3 : 2;
  const confidence = Math.max(defaults.confidenceMin, 0.5);
  const score = computeDriftScore(impact, confidence, persistence);
  const classification = classifyScore(score);

  return {
    drift_id: generateDriftId('D-V', new Date(), 1),
    type: 'D-V',
    description: `Variance drift: statistical dispersion abnormal across ${observations.snapshots.length} snapshots`,
    impact,
    confidence,
    persistence,
    score,
    classification,
    human_justification: score >= 2
      ? `Statistical dispersion exceeds expected baseline stability. ${issues.length} variance anomalies detected across ${observations.snapshots.length} snapshots.`
      : '',
    evidence: issues,
    baseline_value: 'stable (cv < 0.5)',
    observed_value: `${issues.length} variance anomalies`,
    deviation: `${issues.length} metrics outside tolerance`
  };
}

interface Stats {
  mean: number;
  stddev: number;
  min: number;
  max: number;
}

function computeStats(values: number[]): Stats {
  if (values.length === 0) return { mean: 0, stddev: 0, min: 0, max: 0 };

  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);

  return {
    mean,
    stddev,
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

function countVerdicts(observations: ObservationSources): { total: number; nonPass: number } {
  let total = 0;
  let nonPass = 0;

  for (const entry of observations.logEntries) {
    if (entry.verdict) {
      total++;
      if (entry.verdict !== 'PASS') nonPass++;
    }
  }

  for (const event of observations.runtimeEvents) {
    total++;
    if (event.verdict !== 'PASS') nonPass++;
  }

  return { total, nonPass };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
