/**
 * PHASE G — OVERRIDE ABUSE DETECTOR (CASE-003)
 * Specification: ABUSE_CASES.md
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Detects excessive override usage by calculating override/decision ratio.
 * Threshold: > 10% (0.10) triggers misuse event.
 *
 * INV-G-01: NON-ACTUATING (auto_action_taken always "none")
 * INV-G-02: requires_human_decision always true
 * INV-G-03: Zero side effects (pure function)
 */

import type { MisuseObservationSources, MisuseEvent } from '../types.js';
import { CASE_SEVERITY_MAP, AUTO_ACTION_NONE } from '../types.js';
import { generateMisuseEventId } from '../misuse_utils.js';

/** Override ratio threshold - 10% */
const OVERRIDE_RATIO_THRESHOLD = 0.10;

/**
 * Detect override abuse (CASE-003).
 * Calculates override/decision ratio and flags if > 10%.
 *
 * @param observations - Observation sources containing overrideRecords and decisionRecords
 * @param prevHash - Previous hash for log chain continuity
 * @returns Array of misuse events (empty if no abuse detected)
 */
export function detectOverrideAbuse(
  observations: MisuseObservationSources,
  prevHash: string | null
): readonly MisuseEvent[] {
  const { overrideRecords, decisionRecords } = observations;

  // No data to analyze
  if (!overrideRecords || !decisionRecords) {
    return [];
  }

  // No decisions means no ratio to calculate
  if (decisionRecords.length === 0) {
    return [];
  }

  // Calculate override ratio
  const overrideCount = overrideRecords.length;
  const decisionCount = decisionRecords.length;
  const ratio = overrideCount / decisionCount;

  // Below threshold - no misuse detected
  if (ratio <= OVERRIDE_RATIO_THRESHOLD) {
    return [];
  }

  // Misuse detected - ratio exceeds threshold
  // Use latest override timestamp for determinism (INV-G-03)
  const latestTimestamp = overrideRecords.length > 0
    ? overrideRecords[overrideRecords.length - 1].timestamp
    : decisionRecords[decisionRecords.length - 1].timestamp;
  const dateForId = new Date(latestTimestamp);
  const eventId = generateMisuseEventId('CASE-003', dateForId, 1);
  const percentageStr = (ratio * 100).toFixed(2);

  // Collect evidence samples (first few override IDs)
  const samples: string[] = overrideRecords
    .slice(0, 5)
    .map((r) => `Override ${r.override_id} on decision ${r.decision_id} by ${r.approved_by}`);

  const event: MisuseEvent = {
    event_type: 'misuse_event',
    schema_version: '1.0.0',
    event_id: eventId,
    timestamp: latestTimestamp,
    case_id: 'CASE-003',
    pattern_id: 'OA-001',
    severity: CASE_SEVERITY_MAP['CASE-003'],
    detection_method: 'ratio_counting',
    context: {
      source: 'override_abuse_detector',
      run_id: undefined,
      inputs_hash: undefined
    },
    evidence: {
      description: `Override ratio ${percentageStr}% exceeds threshold of ${OVERRIDE_RATIO_THRESHOLD * 100}%. ` +
        `${overrideCount} overrides out of ${decisionCount} decisions.`,
      samples,
      evidence_refs: [
        `override_count:${overrideCount}`,
        `decision_count:${decisionCount}`,
        `ratio:${ratio.toFixed(4)}`
      ]
    },
    auto_action_taken: AUTO_ACTION_NONE,
    requires_human_decision: true,
    recommended_actions: [
      {
        action: 'investigate',
        rationale: `Review override patterns - ${percentageStr}% override rate may indicate systematic bypass of controls`
      },
      {
        action: 'escalate',
        rationale: 'Escalate to governance team for policy review'
      }
    ],
    log_chain_prev_hash: prevHash
  };

  return [event];
}
