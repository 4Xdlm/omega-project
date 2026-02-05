/**
 * PHASE G — LOG TAMPERING DETECTOR (CASE-004)
 * Specification: ABUSE_CASES.md
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Detects log tampering by verifying hash chain integrity.
 * Creates a misuse event for each break in the chain.
 *
 * INV-G-01: NON-ACTUATING (auto_action_taken always "none")
 * INV-G-02: requires_human_decision always true
 * INV-G-03: Zero side effects (pure function)
 */

import type { MisuseObservationSources, MisuseEvent, LogChainEntry } from '../types.js';
import { CASE_SEVERITY_MAP, AUTO_ACTION_NONE } from '../types.js';
import { generateMisuseEventId, findHashChainBreaks } from '../misuse_utils.js';

/**
 * Detect log tampering (CASE-004).
 * Verifies hash chain integrity and creates events for each break.
 *
 * @param observations - Observation sources containing logChain
 * @param prevHash - Previous hash for log chain continuity
 * @returns Array of misuse events (one per chain break)
 */
export function detectLogTampering(
  observations: MisuseObservationSources,
  prevHash: string | null
): readonly MisuseEvent[] {
  const { logChain } = observations;

  // No log chain to verify
  if (!logChain || logChain.length === 0) {
    return [];
  }

  // Find all chain breaks
  const breakIndices = findHashChainBreaks(logChain);

  // No breaks - chain is valid
  if (breakIndices.length === 0) {
    return [];
  }

  // Create misuse event for each break
  // Use latest input event timestamp for determinism (INV-G-03)
  const latestTimestamp = observations.inputEvents.length > 0
    ? observations.inputEvents[observations.inputEvents.length - 1].timestamp
    : logChain[logChain.length - 1].timestamp;
  const dateForId = new Date(latestTimestamp);
  const events: MisuseEvent[] = [];

  for (let i = 0; i < breakIndices.length; i++) {
    const breakIndex = breakIndices[i];
    const currentEntry = logChain[breakIndex];
    const previousEntry = logChain[breakIndex - 1];

    const eventId = generateMisuseEventId('CASE-004', dateForId, i + 1);

    const event: MisuseEvent = {
      event_type: 'misuse_event',
      schema_version: '1.0.0',
      event_id: eventId,
      timestamp: latestTimestamp,
      case_id: 'CASE-004',
      pattern_id: 'LT-001',
      severity: CASE_SEVERITY_MAP['CASE-004'],
      detection_method: 'hash_chain_verification',
      context: {
        source: 'log_tampering_detector',
        run_id: undefined,
        inputs_hash: undefined
      },
      evidence: {
        description: `Hash chain break detected at index ${breakIndex}. ` +
          `Entry ${currentEntry.entry_id} has prev_hash "${currentEntry.prev_hash}" ` +
          `but previous entry ${previousEntry.entry_id} has content_hash "${previousEntry.content_hash}".`,
        samples: [
          `Break at entry: ${currentEntry.entry_id}`,
          `Expected prev_hash: ${previousEntry.content_hash}`,
          `Actual prev_hash: ${currentEntry.prev_hash}`,
          `Previous entry ID: ${previousEntry.entry_id}`,
          `Current entry timestamp: ${currentEntry.timestamp}`
        ],
        evidence_refs: [
          `break_index:${breakIndex}`,
          `current_entry_id:${currentEntry.entry_id}`,
          `previous_entry_id:${previousEntry.entry_id}`,
          `expected_hash:${previousEntry.content_hash}`,
          `actual_hash:${currentEntry.prev_hash}`
        ]
      },
      auto_action_taken: AUTO_ACTION_NONE,
      requires_human_decision: true,
      recommended_actions: [
        {
          action: 'investigate',
          rationale: 'Hash chain integrity violation requires forensic analysis to determine if tampering occurred'
        },
        {
          action: 'escalate',
          rationale: 'Critical severity - escalate immediately to security team'
        },
        {
          action: 'block',
          rationale: 'Consider quarantining affected log entries pending investigation'
        }
      ],
      log_chain_prev_hash: i === 0 ? prevHash : events[i - 1].event_id
    };

    events.push(event);
  }

  return events;
}
