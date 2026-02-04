/**
 * SEMANTIC DRIFT DETECTOR (D-S)
 * Phase E — Decision/meaning inconsistency
 *
 * Detects when the same operation produces different verdicts across observations,
 * indicating a semantic shift in the system's decision-making.
 *
 * INV-E-01: Read-only (no BUILD code access)
 * INV-E-02: Zero side effects (pure function)
 */

import type { ObservationSources, Baseline, DriftResult } from '../types.js';
import { DRIFT_SCORING_DEFAULTS } from '../types.js';
import { computeDriftScore, classifyScore } from '../scoring.js';
import { generateDriftId } from '../drift_utils.js';

/**
 * Detect semantic drift in observations.
 * Checks for verdict inconsistency: same operation producing different verdicts.
 *
 * @param observations - Phase D observation sources (priority: snapshots > log > events)
 * @param baseline - Certified baseline reference
 * @returns DriftResult if semantic drift detected, null otherwise
 */
export function detectSemanticDrift(
  observations: ObservationSources,
  baseline: Baseline
): DriftResult | null {
  const defaults = DRIFT_SCORING_DEFAULTS['D-S'];

  // Collect verdict information from observations (priority order per spec)
  const verdicts = extractVerdicts(observations);

  if (verdicts.length < 2) return null;

  // Check for verdict inconsistency: same operation, different verdicts
  const inconsistencies = findVerdictInconsistencies(verdicts);

  if (inconsistencies.length === 0) return null;

  // Count consecutive observations with inconsistency
  const persistence = countConsecutiveInconsistencies(verdicts);

  if (persistence < defaults.persistenceMin) return null;

  const impact = inconsistencies.some(i => i.includes('FAIL') || i.includes('INCIDENT'))
    ? 5 : 4;
  const confidence = Math.max(defaults.confidenceMin, persistence / verdicts.length);
  const clampedConfidence = Math.min(1.0, confidence);
  const score = computeDriftScore(impact, clampedConfidence, persistence);
  const classification = classifyScore(score);

  const evidence = inconsistencies.map(i => `verdict_inconsistency:${i}`);
  const baselineVerdict = verdicts[0].verdict;
  const observedVerdicts = [...new Set(verdicts.map(v => v.verdict))].join(',');

  return {
    drift_id: generateDriftId('D-S', new Date(), 1),
    type: 'D-S',
    description: `Semantic drift: verdict inconsistency detected across ${inconsistencies.length} observations`,
    impact,
    confidence: clampedConfidence,
    persistence,
    score,
    classification,
    human_justification: score >= 2
      ? `Detected ${inconsistencies.length} verdict inconsistencies across ${verdicts.length} observations. Baseline expected consistent "${baselineVerdict}" verdicts.`
      : '',
    evidence,
    baseline_value: baselineVerdict,
    observed_value: observedVerdicts,
    deviation: `${inconsistencies.length} inconsistencies`
  };
}

interface VerdictEntry {
  event_id: string;
  verdict: string;
  operation: string;
}

function extractVerdicts(observations: ObservationSources): VerdictEntry[] {
  const verdicts: VerdictEntry[] = [];

  // Priority 1: Snapshots
  for (const snap of observations.snapshots) {
    verdicts.push({
      event_id: snap.snapshot_id,
      verdict: snap.status,
      operation: 'snapshot'
    });
  }

  // Priority 2: Log entries
  for (const entry of observations.logEntries) {
    if (entry.verdict) {
      verdicts.push({
        event_id: entry.event_id ?? 'unknown',
        verdict: entry.verdict,
        operation: 'log'
      });
    }
  }

  // Priority 3: Runtime events
  for (const event of observations.runtimeEvents) {
    verdicts.push({
      event_id: event.event_id,
      verdict: event.verdict,
      operation: event.operation
    });
  }

  return verdicts;
}

function findVerdictInconsistencies(verdicts: VerdictEntry[]): string[] {
  const inconsistencies: string[] = [];
  const firstVerdict = verdicts[0].verdict;

  for (let i = 1; i < verdicts.length; i++) {
    if (verdicts[i].verdict !== firstVerdict) {
      inconsistencies.push(`${verdicts[i].event_id}:${firstVerdict}->${verdicts[i].verdict}`);
    }
  }

  return inconsistencies;
}

function countConsecutiveInconsistencies(verdicts: VerdictEntry[]): number {
  if (verdicts.length < 2) return 0;
  const firstVerdict = verdicts[0].verdict;
  let consecutive = 0;

  for (let i = 1; i < verdicts.length; i++) {
    if (verdicts[i].verdict !== firstVerdict) {
      consecutive++;
    } else {
      break;
    }
  }

  return Math.max(1, consecutive);
}
