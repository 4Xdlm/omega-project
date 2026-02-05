/**
 * THRESHOLD GAMING DETECTOR (CASE-002)
 * Detects threshold gaming by finding values clustered near thresholds.
 * INV-G-01: NON-ACTUATING (auto_action_taken = "none")
 * INV-G-02: requires_human_decision = true
 * INV-G-03: Pure function (no side effects)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type {
  MisuseObservationSources,
  MisuseEvent,
  ThresholdHistoryEntry
} from '../types.js';
import {
  CASE_SEVERITY_MAP,
  AUTO_ACTION_NONE
} from '../types.js';
import { generateMisuseEventId } from '../misuse_utils.js';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

/**
 * Epsilon for threshold proximity detection (5%).
 * Values within EPSILON of a threshold are considered "near" the threshold.
 */
const EPSILON = 0.05;

/**
 * Minimum cluster size to flag as gaming.
 * If 3+ values are within EPSILON of threshold, flag as gaming.
 */
const MIN_CLUSTER_SIZE = 3;

/**
 * Pattern ID for threshold gaming detection.
 */
const PATTERN_ID_THRESHOLD_GAMING = 'TG-001';

// ─────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Check if a value is within epsilon of a threshold.
 * @param value - The observed value
 * @param threshold - The threshold to compare against
 * @param epsilon - Relative tolerance (e.g., 0.05 for 5%)
 * @returns true if value is within epsilon of threshold
 */
function isNearThreshold(
  value: number,
  threshold: number,
  epsilon: number
): boolean {
  if (threshold === 0) {
    // For zero threshold, use absolute comparison
    return Math.abs(value) <= epsilon;
  }

  const relativeDistance = Math.abs(value - threshold) / Math.abs(threshold);
  return relativeDistance <= epsilon;
}

/**
 * Group threshold history entries by threshold value.
 * @param entries - Threshold history entries
 * @returns Map of threshold to entries near that threshold
 */
function groupByThreshold(
  entries: readonly ThresholdHistoryEntry[]
): Map<number, readonly ThresholdHistoryEntry[]> {
  const groups = new Map<number, ThresholdHistoryEntry[]>();

  for (const entry of entries) {
    const threshold = entry.threshold;

    if (!groups.has(threshold)) {
      groups.set(threshold, []);
    }

    // Only include entries where value is near the threshold
    if (isNearThreshold(entry.value, threshold, EPSILON)) {
      groups.get(threshold)!.push(entry);
    }
  }

  return groups;
}

/**
 * Format threshold proximity for evidence.
 * @param entry - Threshold history entry
 * @returns Formatted string showing value vs threshold
 */
function formatProximity(entry: ThresholdHistoryEntry): string {
  const diff = entry.value - entry.threshold;
  const percentDiff = entry.threshold !== 0
    ? ((diff / entry.threshold) * 100).toFixed(2)
    : 'N/A';

  return `value=${entry.value}, threshold=${entry.threshold}, diff=${percentDiff}%`;
}

// ─────────────────────────────────────────────────────────────
// MAIN DETECTOR FUNCTION
// ─────────────────────────────────────────────────────────────

/**
 * Detect threshold gaming in observation sources.
 *
 * Analyzes thresholdHistory for values clustered near thresholds.
 * If 3+ values are within EPSILON (5%) of a threshold, flags as gaming.
 *
 * @param observations - Observation sources containing threshold history
 * @param prevHash - Previous hash in the log chain (for chain integrity)
 * @returns Array of detected misuse events (readonly)
 *
 * INV-G-01: auto_action_taken is always "none"
 * INV-G-02: requires_human_decision is always true
 * INV-G-03: Pure function - no side effects
 */
export function detectThresholdGaming(
  observations: MisuseObservationSources,
  prevHash: string | null
): readonly MisuseEvent[] {
  const events: MisuseEvent[] = [];

  // Early return if no threshold history
  if (!observations.thresholdHistory || observations.thresholdHistory.length === 0) {
    return events;
  }

  let sequenceCounter = 1;

  // Group entries by threshold and find clusters near each threshold
  const thresholdGroups = groupByThreshold(observations.thresholdHistory);

  for (const [threshold, nearEntries] of thresholdGroups) {
    // Check if cluster size meets minimum for gaming detection
    if (nearEntries.length >= MIN_CLUSTER_SIZE) {
      // Get earliest and latest timestamps for context (moved up for ID generation)
      const sortedByTime = [...nearEntries].sort(
        (a, b) => a.timestamp.localeCompare(b.timestamp)
      );
      const firstTimestamp = sortedByTime[0].timestamp;
      const lastTimestamp = sortedByTime[sortedByTime.length - 1].timestamp;

      // Use latest entry timestamp for determinism (INV-G-03)
      const dateForId = new Date(lastTimestamp);
      const eventId = generateMisuseEventId('CASE-002', dateForId, sequenceCounter);
      sequenceCounter++;

      // Create evidence samples (first 5 entries max)
      const samples = nearEntries
        .slice(0, 5)
        .map(formatProximity);

      // Create evidence refs from timestamps
      const evidenceRefs = nearEntries
        .slice(0, 5)
        .map(e => e.timestamp);

      const misuseEvent: MisuseEvent = {
        event_type: 'misuse_event',
        schema_version: '1.0.0',
        event_id: eventId,
        timestamp: lastTimestamp,
        case_id: 'CASE-002',
        pattern_id: PATTERN_ID_THRESHOLD_GAMING,
        severity: CASE_SEVERITY_MAP['CASE-002'],
        detection_method: 'threshold_proximity',
        context: {
          source: 'threshold_history',
          run_id: undefined,
          inputs_hash: undefined
        },
        evidence: {
          description: `Detected ${nearEntries.length} values within ${EPSILON * 100}% of threshold ${threshold} between ${firstTimestamp} and ${lastTimestamp}. This pattern suggests intentional gaming of threshold boundaries.`,
          samples,
          evidence_refs: evidenceRefs
        },
        auto_action_taken: AUTO_ACTION_NONE,
        requires_human_decision: true,
        recommended_actions: [
          {
            action: 'investigate',
            rationale: `${nearEntries.length} values clustered near threshold ${threshold} - possible gaming behavior`
          }
        ],
        log_chain_prev_hash: prevHash
      };

      events.push(misuseEvent);
    }
  }

  return events;
}
