/**
 * PERFORMANCE DRIFT DETECTOR (D-P)
 * Phase E — Latency/cost abnormal
 *
 * Detects significant changes in operational throughput and event counts
 * between snapshots, indicating performance degradation or anomaly.
 *
 * INV-E-01: Read-only (no BUILD code access)
 * INV-E-02: Zero side effects (pure function)
 */

import type { ObservationSources, Baseline, DriftResult } from '../types.js';
import { DRIFT_SCORING_DEFAULTS } from '../types.js';
import { computeDriftScore, classifyScore } from '../scoring.js';
import { generateDriftId, computeNumericDeviation } from '../drift_utils.js';

/** Threshold for event count change (percentage) to be considered drift */
const EVENT_COUNT_DRIFT_THRESHOLD = 0.20;

/**
 * Detect performance drift in observations.
 * Analyzes event counts and anomaly rates across snapshots.
 *
 * @param observations - Phase D observation sources
 * @param baseline - Certified baseline reference
 * @returns DriftResult if performance drift detected, null otherwise
 */
export function detectPerformanceDrift(
  observations: ObservationSources,
  baseline: Baseline
): DriftResult | null {
  const defaults = DRIFT_SCORING_DEFAULTS['D-P'];

  if (observations.snapshots.length < 2) return null;

  // Compare event counts across snapshots
  const counts = observations.snapshots.map(s => s.events_count_total);
  const baselineCount = counts[0];

  if (baselineCount === 0) return null;

  // Detect significant changes in event count
  const deviations: Array<{ index: number; count: number; pct: number }> = [];
  for (let i = 1; i < counts.length; i++) {
    const pct = Math.abs(counts[i] - baselineCount) / baselineCount;
    if (pct > EVENT_COUNT_DRIFT_THRESHOLD) {
      deviations.push({ index: i, count: counts[i], pct });
    }
  }

  // Also check anomaly rates
  const anomalyRates = observations.snapshots.map(s => {
    const total = s.anomalies.tooling_drift + s.anomalies.product_drift + s.anomalies.incidents;
    return { snapshot_id: s.snapshot_id, total, events: s.events_count_total };
  });

  const anomalySpikes = anomalyRates.filter(a => a.total > 0);

  if (deviations.length === 0 && anomalySpikes.length === 0) return null;

  // Count consecutive issues
  let persistence = 0;
  for (let i = counts.length - 1; i >= 1; i--) {
    const pct = Math.abs(counts[i] - baselineCount) / baselineCount;
    if (pct > EVENT_COUNT_DRIFT_THRESHOLD || anomalyRates[i].total > 0) {
      persistence++;
    } else {
      break;
    }
  }
  persistence = Math.max(1, persistence);

  if (persistence < defaults.persistenceMin) return null;

  const hasAnomalies = anomalySpikes.length > 0;
  const impact = hasAnomalies ? 4 : (deviations.length > 1 ? 3 : 2);
  const confidence = Math.max(defaults.confidenceMin, 0.7);
  const score = computeDriftScore(impact, confidence, persistence);
  const classification = classifyScore(score);

  const evidence: string[] = [];
  for (const d of deviations) {
    evidence.push(`event_count_drift:snapshot[${d.index}]:count=${d.count}:change=${Math.round(d.pct * 100)}%`);
  }
  for (const a of anomalySpikes) {
    evidence.push(`anomaly_spike:${a.snapshot_id}:total=${a.total}`);
  }

  const lastCount = counts[counts.length - 1];
  const deviation = computeNumericDeviation(baselineCount, lastCount);

  return {
    drift_id: generateDriftId('D-P', new Date(), 1),
    type: 'D-P',
    description: `Performance drift: ${deviations.length} event count deviations, ${anomalySpikes.length} anomaly spikes`,
    impact,
    confidence,
    persistence,
    score,
    classification,
    human_justification: score >= 2
      ? `Event count changed from baseline ${baselineCount} to ${lastCount} (${deviation}). ${anomalySpikes.length} snapshots with anomalies detected.`
      : '',
    evidence,
    baseline_value: String(baselineCount),
    observed_value: String(lastCount),
    deviation
  };
}
