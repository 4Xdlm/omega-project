/**
 * TOOLING DRIFT DETECTOR (D-TL)
 * Phase E — Tooling only (product OK)
 *
 * Detects discrepancies between reporter outputs and console/exit code,
 * identifying tooling issues that don't affect product behavior.
 *
 * INV-E-01: Read-only (no BUILD code access)
 * INV-E-02: Zero side effects (pure function)
 */

import type { ObservationSources, Baseline, DriftResult } from '../types.js';
import { DRIFT_SCORING_DEFAULTS } from '../types.js';
import { computeDriftScore, classifyScore } from '../scoring.js';
import { generateDriftId } from '../drift_utils.js';

/**
 * Detect tooling drift in observations.
 * Checks for TOOLING_DRIFT verdicts in events and anomaly counts in snapshots.
 *
 * @param observations - Phase D observation sources
 * @param baseline - Certified baseline reference
 * @returns DriftResult if tooling drift detected, null otherwise
 */
export function detectToolingDrift(
  observations: ObservationSources,
  baseline: Baseline
): DriftResult | null {
  const defaults = DRIFT_SCORING_DEFAULTS['D-TL'];
  const issues: string[] = [];

  // Check for TOOLING_DRIFT verdicts in runtime events
  for (const event of observations.runtimeEvents) {
    if (event.verdict === 'TOOLING_DRIFT') {
      issues.push(`event:${event.event_id}:verdict=TOOLING_DRIFT`);
    }
  }

  // Check for tooling_drift anomalies in snapshots
  for (const snap of observations.snapshots) {
    if (snap.anomalies.tooling_drift > 0) {
      issues.push(`snapshot:${snap.snapshot_id}:tooling_drift=${snap.anomalies.tooling_drift}`);
    }
  }

  // Check log entries for tooling drift indicators
  for (const entry of observations.logEntries) {
    if (entry.verdict === 'TOOLING_DRIFT') {
      issues.push(`log:${entry.event_id ?? 'unknown'}:verdict=TOOLING_DRIFT`);
    }
  }

  if (issues.length === 0) return null;

  const persistence = Math.max(1, issues.length);
  if (persistence < defaults.persistenceMin) return null;

  const impact = issues.length > 5 ? 2 : 1;
  const confidence = defaults.confidenceMin;
  const score = computeDriftScore(impact, confidence, persistence);
  const classification = classifyScore(score);

  return {
    drift_id: generateDriftId('D-TL', new Date(), 1),
    type: 'D-TL',
    description: `Tooling drift: ${issues.length} tooling discrepancies detected (product behavior unaffected)`,
    impact,
    confidence,
    persistence,
    score,
    classification,
    human_justification: score >= 2
      ? `Detected ${issues.length} tooling-level discrepancies. Product behavior is unaffected but tooling outputs diverge.`
      : '',
    evidence: issues,
    baseline_value: '0 tooling issues',
    observed_value: `${issues.length} tooling issues`,
    deviation: `${issues.length} tooling discrepancies`
  };
}
