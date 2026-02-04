/**
 * TEMPORAL DRIFT DETECTOR (D-T)
 * Phase E — Time-dependent variation
 *
 * Detects unusual timing patterns between observations:
 * gaps, clusters, or irregular intervals.
 *
 * INV-E-01: Read-only (no BUILD code access)
 * INV-E-02: Zero side effects (pure function)
 */

import type { ObservationSources, Baseline, DriftResult } from '../types.js';
import { DRIFT_SCORING_DEFAULTS } from '../types.js';
import { computeDriftScore, classifyScore } from '../scoring.js';
import { generateDriftId, computeNumericDeviation } from '../drift_utils.js';

/** Threshold multiplier for gap detection (3x median = suspicious) */
const GAP_THRESHOLD_MULTIPLIER = 3;

/**
 * Detect temporal drift in observations.
 * Analyzes timestamp intervals for unusual patterns.
 *
 * @param observations - Phase D observation sources
 * @param baseline - Certified baseline reference
 * @returns DriftResult if temporal drift detected, null otherwise
 */
export function detectTemporalDrift(
  observations: ObservationSources,
  baseline: Baseline
): DriftResult | null {
  const defaults = DRIFT_SCORING_DEFAULTS['D-T'];

  // Collect all timestamps
  const timestamps = extractTimestamps(observations);

  if (timestamps.length < 3) return null;

  // Sort chronologically
  const sorted = [...timestamps].sort((a, b) => a.ms - b.ms);

  // Compute intervals between consecutive events
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(sorted[i].ms - sorted[i - 1].ms);
  }

  if (intervals.length === 0) return null;

  // Detect anomalous intervals
  const medianInterval = computeMedian(intervals);
  if (medianInterval === 0) return null;

  const anomalousGaps = intervals.filter(
    iv => iv > medianInterval * GAP_THRESHOLD_MULTIPLIER
  );

  if (anomalousGaps.length === 0) return null;

  // Count consecutive anomalous intervals
  let persistence = 0;
  for (let i = intervals.length - 1; i >= 0; i--) {
    if (intervals[i] > medianInterval * GAP_THRESHOLD_MULTIPLIER) {
      persistence++;
    } else {
      break;
    }
  }
  persistence = Math.max(1, persistence);

  if (persistence < defaults.persistenceMin) return null;

  const impact = anomalousGaps.length > intervals.length / 2 ? 3 : 2;
  const confidence = Math.max(
    defaults.confidenceMin,
    Math.min(1.0, anomalousGaps.length / intervals.length)
  );
  const score = computeDriftScore(impact, confidence, persistence);
  const classification = classifyScore(score);

  const maxGap = Math.max(...anomalousGaps);
  const evidence = anomalousGaps.map(
    (gap, i) => `temporal_gap:${i}:${Math.round(gap / 1000)}s (median=${Math.round(medianInterval / 1000)}s)`
  );

  return {
    drift_id: generateDriftId('D-T', new Date(), 1),
    type: 'D-T',
    description: `Temporal drift: ${anomalousGaps.length} anomalous time gaps detected`,
    impact,
    confidence,
    persistence,
    score,
    classification,
    human_justification: score >= 2
      ? `Detected ${anomalousGaps.length} time gaps exceeding ${GAP_THRESHOLD_MULTIPLIER}x median interval. Max gap: ${Math.round(maxGap / 1000)}s vs median ${Math.round(medianInterval / 1000)}s.`
      : '',
    evidence,
    baseline_value: `${Math.round(medianInterval / 1000)}s median interval`,
    observed_value: `${Math.round(maxGap / 1000)}s max gap`,
    deviation: computeNumericDeviation(medianInterval, maxGap)
  };
}

interface TimestampEntry {
  source: string;
  ms: number;
}

function extractTimestamps(observations: ObservationSources): TimestampEntry[] {
  const entries: TimestampEntry[] = [];

  for (const snap of observations.snapshots) {
    const ms = Date.parse(snap.timestamp_utc);
    if (!isNaN(ms)) entries.push({ source: snap.snapshot_id, ms });
  }

  for (const entry of observations.logEntries) {
    const ms = Date.parse(entry.timestamp_utc);
    if (!isNaN(ms)) entries.push({ source: entry.event_id ?? 'log', ms });
  }

  for (const event of observations.runtimeEvents) {
    const ms = Date.parse(event.timestamp_utc);
    if (!isNaN(ms)) entries.push({ source: event.event_id, ms });
  }

  return entries;
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
