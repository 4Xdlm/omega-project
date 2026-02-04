/**
 * OUTPUT DRIFT DETECTOR (D-O)
 * Phase E — Output hash differs
 *
 * Detects when output hashes diverge from baseline expectations,
 * indicating that the system produces different outputs for the same inputs.
 *
 * INV-E-01: Read-only (no BUILD code access)
 * INV-E-02: Zero side effects (pure function)
 */

import type { ObservationSources, Baseline, DriftResult } from '../types.js';
import { DRIFT_SCORING_DEFAULTS } from '../types.js';
import { computeDriftScore, classifyScore } from '../scoring.js';
import { generateDriftId, computeStringDeviation } from '../drift_utils.js';

/**
 * Detect output drift in observations.
 * Compares output_hash values across events and log entries.
 *
 * @param observations - Phase D observation sources
 * @param baseline - Certified baseline reference
 * @returns DriftResult if output drift detected, null otherwise
 */
export function detectOutputDrift(
  observations: ObservationSources,
  baseline: Baseline
): DriftResult | null {
  const defaults = DRIFT_SCORING_DEFAULTS['D-O'];

  // Collect output hashes from all sources
  const hashes = extractOutputHashes(observations);

  if (hashes.length === 0) return null;

  // Use first hash as reference (baseline output)
  const referenceHash = hashes[0].hash;
  const deviations = hashes.filter(h => h.hash !== referenceHash);

  if (deviations.length === 0) return null;

  // Count consecutive deviations
  let persistence = 0;
  for (let i = hashes.length - 1; i >= 0; i--) {
    if (hashes[i].hash !== referenceHash) {
      persistence++;
    } else {
      break;
    }
  }
  persistence = Math.max(1, persistence);

  if (persistence < defaults.persistenceMin) return null;

  const impact = deviations.length > hashes.length / 2 ? 5 : 3;
  const confidence = Math.max(defaults.confidenceMin, 0.9);
  const score = computeDriftScore(impact, confidence, persistence);
  const classification = classifyScore(score);

  const evidence = deviations.map(d => `${d.source}:output_hash=${d.hash.slice(0, 16)}...`);
  const deviation = computeStringDeviation(referenceHash, deviations[0].hash);

  return {
    drift_id: generateDriftId('D-O', new Date(), 1),
    type: 'D-O',
    description: `Output drift: ${deviations.length} hash deviations detected across ${hashes.length} observations`,
    impact,
    confidence,
    persistence,
    score,
    classification,
    human_justification: score >= 2
      ? `Output hash changed in ${deviations.length} of ${hashes.length} observations. Reference hash: ${referenceHash.slice(0, 16)}...`
      : '',
    evidence,
    baseline_value: referenceHash,
    observed_value: deviations[0].hash,
    deviation
  };
}

interface HashEntry {
  source: string;
  hash: string;
}

function extractOutputHashes(observations: ObservationSources): HashEntry[] {
  const hashes: HashEntry[] = [];

  // Log entries with output_hash
  for (const entry of observations.logEntries) {
    if (entry.output_hash && typeof entry.output_hash === 'string') {
      hashes.push({
        source: entry.event_id ?? 'log',
        hash: entry.output_hash
      });
    }
  }

  // Runtime events with output_hash
  for (const event of observations.runtimeEvents) {
    hashes.push({
      source: event.event_id,
      hash: event.output_hash
    });
  }

  return hashes;
}
