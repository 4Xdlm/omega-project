/**
 * PROMPT INJECTION DETECTOR (CASE-001)
 * Detects prompt injection attempts via regex patterns.
 * INV-G-01: NON-ACTUATING (auto_action_taken = "none")
 * INV-G-02: requires_human_decision = true
 * INV-G-03: Pure function (no side effects)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type {
  MisuseObservationSources,
  MisuseEvent,
  MisusePattern
} from '../types.js';
import {
  PROMPT_INJECTION_PATTERNS,
  CASE_SEVERITY_MAP,
  AUTO_ACTION_NONE
} from '../types.js';
import { generateMisuseEventId } from '../misuse_utils.js';

// ─────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Check a single string value against a pattern.
 * @param value - String to check
 * @param pattern - Pattern with regex to match
 * @returns Match result or null if no match
 */
function checkValueAgainstPattern(
  value: string,
  pattern: MisusePattern
): { matched: true; matchedText: string } | null {
  if (!pattern.regex) {
    return null;
  }

  try {
    const regex = new RegExp(pattern.regex, 'i');
    const match = regex.exec(value);
    if (match) {
      return { matched: true, matchedText: match[0] };
    }
  } catch {
    // Invalid regex - skip this pattern
  }

  return null;
}

/**
 * Recursively extract all string values from a payload object.
 * @param payload - Object to extract strings from
 * @returns Array of string values found
 */
function extractStringValues(payload: Readonly<Record<string, unknown>>): readonly string[] {
  const strings: string[] = [];

  function extract(value: unknown): void {
    if (typeof value === 'string') {
      strings.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        extract(item);
      }
    } else if (value !== null && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        extract((value as Record<string, unknown>)[key]);
      }
    }
  }

  extract(payload);
  return strings;
}

// ─────────────────────────────────────────────────────────────
// MAIN DETECTOR FUNCTION
// ─────────────────────────────────────────────────────────────

/**
 * Detect prompt injection attempts in observation sources.
 *
 * For each input event, checks all payload string values against
 * PROMPT_INJECTION_PATTERNS. Creates a MisuseEvent for each match.
 *
 * @param observations - Observation sources containing input events
 * @param prevHash - Previous hash in the log chain (for chain integrity)
 * @returns Array of detected misuse events (readonly)
 *
 * INV-G-01: auto_action_taken is always "none"
 * INV-G-02: requires_human_decision is always true
 * INV-G-03: Pure function - no side effects
 */
export function detectPromptInjection(
  observations: MisuseObservationSources,
  prevHash: string | null
): readonly MisuseEvent[] {
  const events: MisuseEvent[] = [];
  let sequenceCounter = 1;

  for (const inputEvent of observations.inputEvents) {
    // Use input event timestamp for determinism (INV-G-03)
    const eventTimestamp = inputEvent.timestamp;
    const dateForId = new Date(eventTimestamp);

    // Extract all string values from the payload
    const stringValues = extractStringValues(inputEvent.payload);

    // Check each string against each pattern
    for (const value of stringValues) {
      for (const pattern of PROMPT_INJECTION_PATTERNS) {
        const result = checkValueAgainstPattern(value, pattern);

        if (result) {
          // Create misuse event for this match
          const eventId = generateMisuseEventId('CASE-001', dateForId, sequenceCounter);
          sequenceCounter++;

          // Truncate sample for evidence (max 100 chars)
          const sampleText = value.length > 100
            ? value.substring(0, 100) + '...'
            : value;

          const misuseEvent: MisuseEvent = {
            event_type: 'misuse_event',
            schema_version: '1.0.0',
            event_id: eventId,
            timestamp: inputEvent.timestamp,
            case_id: 'CASE-001',
            pattern_id: pattern.pattern_id,
            severity: CASE_SEVERITY_MAP['CASE-001'],
            detection_method: 'regex_pattern_match',
            context: {
              source: inputEvent.source,
              run_id: inputEvent.run_id,
              inputs_hash: inputEvent.inputs_hash
            },
            evidence: {
              description: `${pattern.name}: ${pattern.description}`,
              samples: [sampleText],
              evidence_refs: [inputEvent.event_id, pattern.pattern_id]
            },
            auto_action_taken: AUTO_ACTION_NONE,
            requires_human_decision: true,
            recommended_actions: [
              {
                action: 'investigate',
                rationale: 'Potential injection attack detected'
              }
            ],
            log_chain_prev_hash: prevHash
          };

          events.push(misuseEvent);
        }
      }
    }
  }

  return events;
}
