/**
 * FORMAT DRIFT DETECTOR (D-F)
 * Phase E — Structure/schema modified
 *
 * Detects when observation data structures deviate from expected schemas,
 * indicating format changes in events or snapshots.
 *
 * INV-E-01: Read-only (no BUILD code access)
 * INV-E-02: Zero side effects (pure function)
 */

import type { ObservationSources, Baseline, DriftResult } from '../types.js';
import { DRIFT_SCORING_DEFAULTS } from '../types.js';
import { computeDriftScore, classifyScore } from '../scoring.js';
import { generateDriftId } from '../drift_utils.js';

/** Expected fields in a RuntimeEvent */
const EXPECTED_EVENT_FIELDS: readonly string[] = [
  'event_id', 'timestamp_utc', 'phase', 'build_ref',
  'operation', 'input_hash', 'output_hash', 'verdict'
] as const;

/** Expected fields in a Snapshot */
const EXPECTED_SNAPSHOT_FIELDS: readonly string[] = [
  'snapshot_id', 'timestamp_utc', 'baseline_ref',
  'last_event_id', 'events_count_total', 'anomalies', 'status'
] as const;

/**
 * Detect format drift in observations.
 * Validates structural integrity of events and snapshots.
 *
 * @param observations - Phase D observation sources
 * @param baseline - Certified baseline reference
 * @returns DriftResult if format drift detected, null otherwise
 */
export function detectFormatDrift(
  observations: ObservationSources,
  baseline: Baseline
): DriftResult | null {
  const defaults = DRIFT_SCORING_DEFAULTS['D-F'];
  const issues: string[] = [];

  // Check runtime events structure
  for (const event of observations.runtimeEvents) {
    const eventObj = event as unknown as Record<string, unknown>;
    const missing = EXPECTED_EVENT_FIELDS.filter(f => !(f in eventObj));
    if (missing.length > 0) {
      issues.push(`event:${event.event_id}:missing_fields=[${missing.join(',')}]`);
    }
  }

  // Check snapshots structure
  for (const snap of observations.snapshots) {
    const snapObj = snap as unknown as Record<string, unknown>;
    const missing = EXPECTED_SNAPSHOT_FIELDS.filter(f => !(f in snapObj));
    if (missing.length > 0) {
      issues.push(`snapshot:${snap.snapshot_id}:missing_fields=[${missing.join(',')}]`);
    }
  }

  // Check log entries for minimal structure
  for (const entry of observations.logEntries) {
    if (!entry.timestamp_utc) {
      issues.push(`log:${entry.event_id ?? 'unknown'}:missing_timestamp_utc`);
    }
  }

  if (issues.length === 0) return null;

  const persistence = Math.max(1, issues.length);
  if (persistence < defaults.persistenceMin) return null;

  const impact = issues.length > 3 ? 4 : 3;
  const confidence = defaults.confidenceMin;
  const score = computeDriftScore(impact, confidence, persistence);
  const classification = classifyScore(score);

  return {
    drift_id: generateDriftId('D-F', new Date(), 1),
    type: 'D-F',
    description: `Format drift: ${issues.length} structural issues detected`,
    impact,
    confidence,
    persistence,
    score,
    classification,
    human_justification: score >= 2
      ? `Detected ${issues.length} structural deviations from expected schema. Fields missing or malformed in observation data.`
      : '',
    evidence: issues,
    baseline_value: 'expected schema',
    observed_value: `${issues.length} deviations`,
    deviation: `${issues.length} structural issues`
  };
}
