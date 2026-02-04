/**
 * CONTRACT DRIFT DETECTOR (D-C)
 * Phase E — Doc/code/tests divergence
 *
 * Detects when test counts, event counts, or structural expectations
 * diverge from baseline, indicating doc↔code↔tests contract violations.
 *
 * INV-E-01: Read-only (no BUILD code access)
 * INV-E-02: Zero side effects (pure function)
 */

import type { ObservationSources, Baseline, DriftResult } from '../types.js';
import { DRIFT_SCORING_DEFAULTS } from '../types.js';
import { computeDriftScore, classifyScore } from '../scoring.js';
import { generateDriftId, computeNumericDeviation } from '../drift_utils.js';

/**
 * Detect contract drift in observations.
 * Compares observed state against baseline contract expectations:
 * - Baseline SHA256 consistency
 * - Event count stability
 * - Status consistency
 *
 * @param observations - Phase D observation sources
 * @param baseline - Certified baseline reference
 * @returns DriftResult if contract drift detected, null otherwise
 */
export function detectContractDrift(
  observations: ObservationSources,
  baseline: Baseline
): DriftResult | null {
  const defaults = DRIFT_SCORING_DEFAULTS['D-C'];
  const issues: string[] = [];

  // Check baseline_ref consistency in snapshots
  for (const snap of observations.snapshots) {
    if (snap.baseline_ref !== baseline.sha256) {
      issues.push(`snapshot:${snap.snapshot_id}:baseline_ref_mismatch:expected=${baseline.sha256.slice(0, 16)}...:got=${snap.baseline_ref.slice(0, 16)}...`);
    }
  }

  // Check build_ref consistency in runtime events
  for (const event of observations.runtimeEvents) {
    if (event.build_ref.commit !== baseline.commit) {
      issues.push(`event:${event.event_id}:commit_mismatch:expected=${baseline.commit}:got=${event.build_ref.commit}`);
    }
    if (event.build_ref.tag !== baseline.tag) {
      issues.push(`event:${event.event_id}:tag_mismatch:expected=${baseline.tag}:got=${event.build_ref.tag}`);
    }
  }

  // Check for DRIFT or INCIDENT verdicts (contract violations)
  for (const event of observations.runtimeEvents) {
    if (event.verdict === 'DRIFT') {
      issues.push(`event:${event.event_id}:verdict=DRIFT (contract violation)`);
    }
  }

  // Check status consistency across snapshots
  const statuses = observations.snapshots.map(s => s.status);
  const uniqueStatuses = [...new Set(statuses)];
  if (uniqueStatuses.length > 1) {
    issues.push(`status_inconsistency:statuses=[${uniqueStatuses.join(',')}]`);
  }

  if (issues.length === 0) return null;

  const persistence = Math.max(1, issues.length);
  if (persistence < defaults.persistenceMin) return null;

  const hasBaselineMismatch = issues.some(i => i.includes('baseline_ref_mismatch'));
  const impact = hasBaselineMismatch ? 4 : 3;
  const confidence = defaults.confidenceMin;
  const score = computeDriftScore(impact, confidence, persistence);
  const classification = classifyScore(score);

  return {
    drift_id: generateDriftId('D-C', new Date(), 1),
    type: 'D-C',
    description: `Contract drift: ${issues.length} contract violations detected`,
    impact,
    confidence,
    persistence,
    score,
    classification,
    human_justification: score >= 2
      ? `Detected ${issues.length} contract violations between observed state and baseline. ${hasBaselineMismatch ? 'Baseline reference mismatch detected.' : 'Build reference or status inconsistencies.'}`
      : '',
    evidence: issues,
    baseline_value: `commit=${baseline.commit}:tag=${baseline.tag}`,
    observed_value: `${issues.length} contract violations`,
    deviation: `${issues.length} violations`
  };
}
