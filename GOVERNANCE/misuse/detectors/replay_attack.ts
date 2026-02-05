/**
 * REPLAY ATTACK DETECTOR (CASE-005)
 * Phase G — Misuse Detection System
 * Specification: ABUSE_CASES.md
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Detects replay attacks by identifying:
 * 1. Duplicate event_id against known event registry
 * 2. Timestamp older than minimum valid timestamp
 *
 * INV-G-01: NON-ACTUATING (auto_action_taken always "none")
 * INV-G-02: requires_human_decision always true
 * INV-G-03: Zero side effects (pure function)
 */

import type { MisuseObservationSources, MisuseEvent } from '../types.js';
import { CASE_SEVERITY_MAP, AUTO_ACTION_NONE } from '../types.js';
import { generateMisuseEventId } from '../misuse_utils.js';

/**
 * Detect replay attacks in input events.
 * Checks for:
 * 1. Duplicate event_id against eventRegistry.known_event_ids
 * 2. Timestamp older than eventRegistry.min_valid_timestamp
 *
 * @param observations - Misuse observation sources containing inputEvents and eventRegistry
 * @param prevHash - Previous hash in the log chain (for chain integrity)
 * @returns Array of MisuseEvent for each detected replay attack
 */
export function detectReplayAttack(
  observations: MisuseObservationSources,
  prevHash: string | null
): readonly MisuseEvent[] {
  const events: MisuseEvent[] = [];
  const { inputEvents, eventRegistry } = observations;

  // No registry means no replay detection possible
  if (!eventRegistry) {
    return [];
  }

  const knownIds = new Set(eventRegistry.known_event_ids);
  const minValidTimestamp = eventRegistry.min_valid_timestamp;
  // Use input event timestamp for determinism (INV-G-03)
  let sequence = 1;

  for (const inputEvent of inputEvents) {
    const eventTimestamp = inputEvent.timestamp;
    const dateForId = new Date(eventTimestamp);

    // Check 1: Duplicate event_id
    if (knownIds.has(inputEvent.event_id)) {
      const misuseEvent: MisuseEvent = {
        event_type: 'misuse_event',
        schema_version: '1.0.0',
        event_id: generateMisuseEventId('CASE-005', dateForId, sequence++),
        timestamp: eventTimestamp,
        case_id: 'CASE-005',
        pattern_id: 'RA-001',
        severity: CASE_SEVERITY_MAP['CASE-005'],
        detection_method: 'id_registry_check',
        context: {
          source: inputEvent.source,
          run_id: inputEvent.run_id,
          inputs_hash: inputEvent.inputs_hash
        },
        evidence: {
          description: `Duplicate event_id detected: "${inputEvent.event_id}" already exists in known event registry`,
          samples: [
            `event_id: ${inputEvent.event_id}`,
            `timestamp: ${inputEvent.timestamp}`,
            `source: ${inputEvent.source}`
          ],
          evidence_refs: [
            `input_event:${inputEvent.event_id}`,
            `registry:known_event_ids`
          ]
        },
        auto_action_taken: AUTO_ACTION_NONE,
        requires_human_decision: true,
        recommended_actions: [
          {
            action: 'investigate',
            rationale: 'Duplicate event ID indicates potential replay attack. Investigate source and intent.'
          },
          {
            action: 'block',
            rationale: 'Block event processing to prevent replay attack from succeeding.'
          }
        ],
        log_chain_prev_hash: prevHash
      };
      events.push(misuseEvent);
    }

    // Check 2: Timestamp older than minimum valid
    if (inputEvent.timestamp < minValidTimestamp) {
      const misuseEvent: MisuseEvent = {
        event_type: 'misuse_event',
        schema_version: '1.0.0',
        event_id: generateMisuseEventId('CASE-005', dateForId, sequence++),
        timestamp: eventTimestamp,
        case_id: 'CASE-005',
        pattern_id: 'RA-002',
        severity: CASE_SEVERITY_MAP['CASE-005'],
        detection_method: 'timestamp_validation',
        context: {
          source: inputEvent.source,
          run_id: inputEvent.run_id,
          inputs_hash: inputEvent.inputs_hash
        },
        evidence: {
          description: `Event timestamp "${inputEvent.timestamp}" is older than minimum valid timestamp "${minValidTimestamp}"`,
          samples: [
            `event_id: ${inputEvent.event_id}`,
            `event_timestamp: ${inputEvent.timestamp}`,
            `min_valid_timestamp: ${minValidTimestamp}`,
            `source: ${inputEvent.source}`
          ],
          evidence_refs: [
            `input_event:${inputEvent.event_id}`,
            `registry:min_valid_timestamp`
          ]
        },
        auto_action_taken: AUTO_ACTION_NONE,
        requires_human_decision: true,
        recommended_actions: [
          {
            action: 'investigate',
            rationale: 'Stale timestamp indicates potential replay of old event. Verify event authenticity.'
          },
          {
            action: 'block',
            rationale: 'Reject events with timestamps outside valid window to prevent replay attacks.'
          }
        ],
        log_chain_prev_hash: prevHash
      };
      events.push(misuseEvent);
    }
  }

  return events;
}
