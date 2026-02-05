/**
 * MISUSE REPORT BUILDER — Build MISUSE_REPORT
 *
 * Aggregates all misuse events into a single report.
 * Follows Phase F matrix_builder.ts pattern.
 *
 * INV-G-01: NON-ACTUATING (auto_action_taken always "none")
 * INV-G-02: requires_human_decision always true
 * INV-G-03: Zero side effects (pure function)
 */

import type {
  MisuseReport,
  MisuseEvent,
  MisuseSummary,
  MisuseCaseCode,
  MisuseSeverity,
  MisuseObservationSources,
  ValidationResult
} from './types.js';
import {
  MISUSE_CASE_CODES,
  MISUSE_SEVERITIES
} from './types.js';
import {
  generateMisuseReportId,
  validateMisuseReport,
  computeWindow,
  getHighestSeverity,
  requiresEscalation
} from './misuse_utils.js';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

/** Generator identifier */
export const GENERATOR = 'Phase G Misuse Detector v1.0';

// ─────────────────────────────────────────────────────────────
// REPORT BUILDING
// ─────────────────────────────────────────────────────────────

/**
 * Build misuse report from detected events.
 * Pure function - aggregation only.
 * @param events - Array of detected misuse events
 * @param observations - Original observation sources (for window computation)
 * @param generatedAt - ISO8601 timestamp (optional, defaults to now)
 * @param prevEventHash - Previous event hash for chain (optional)
 * @returns Complete misuse report
 */
export function buildMisuseReport(
  events: readonly MisuseEvent[],
  observations: MisuseObservationSources,
  generatedAt?: string,
  prevEventHash?: string | null
): MisuseReport {
  const now = generatedAt || new Date().toISOString();
  const summary = computeSummary(events, observations);
  const escalation = determineEscalation(events);

  // Compute window from input event timestamps
  const timestamps = observations.inputEvents.map(e => e.timestamp);
  const window = computeWindow(timestamps);

  // Generate deterministic report ID
  const contentForHash = JSON.stringify({
    events: events.map(e => e.event_id),
    timestamp: now
  });
  const reportId = generateMisuseReportId(new Date(now), contentForHash);

  const report: MisuseReport = {
    report_type: 'misuse_report',
    schema_version: '1.0.0',
    report_id: reportId,
    timestamp: now,
    window,
    misuse_events: events,
    summary,
    escalation_required: escalation.required,
    escalation_target: escalation.target,
    notes: 'No automatic action taken. Awaiting human decision.',
    generated_at: now,
    generator: GENERATOR,
    log_chain_prev_hash: prevEventHash ?? null
  };

  // Validate before return
  const validation = validateMisuseReport(report);
  if (!validation.valid) {
    throw new Error(`MISUSE_REPORT validation failed: ${validation.errors.join('; ')}`);
  }

  return report;
}

// ─────────────────────────────────────────────────────────────
// SUMMARY COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute summary statistics from events.
 * @param events - Array of misuse events
 * @param observations - Original observation sources
 * @returns Summary with counts and breakdowns
 */
export function computeSummary(
  events: readonly MisuseEvent[],
  observations: MisuseObservationSources
): MisuseSummary {
  // Initialize counts
  const byCase: Record<MisuseCaseCode, number> = {
    'CASE-001': 0,
    'CASE-002': 0,
    'CASE-003': 0,
    'CASE-004': 0,
    'CASE-005': 0
  };

  const bySeverity: Record<MisuseSeverity, number> = {
    'low': 0,
    'medium': 0,
    'high': 0,
    'critical': 0
  };

  // Count events
  for (const event of events) {
    byCase[event.case_id]++;
    bySeverity[event.severity]++;
  }

  // Get highest severity
  const severities = events.map(e => e.severity);
  const highestSeverity = getHighestSeverity(severities);

  return {
    events_checked: observations.inputEvents.length,
    misuse_events_detected: events.length,
    by_case: byCase,
    by_severity: bySeverity,
    highest_severity: highestSeverity
  };
}

// ─────────────────────────────────────────────────────────────
// ESCALATION
// ─────────────────────────────────────────────────────────────

/**
 * Determine if escalation is required.
 * Escalation required for HIGH or CRITICAL severity.
 * @param events - Array of misuse events
 * @returns Escalation info with required flag and target
 */
export function determineEscalation(
  events: readonly MisuseEvent[]
): { required: boolean; target: string } {
  if (events.length === 0) {
    return { required: false, target: 'NONE' };
  }

  const severities = events.map(e => e.severity);
  const highest = getHighestSeverity(severities);

  if (requiresEscalation(highest)) {
    return { required: true, target: 'ARCHITECTE' };
  }

  return { required: false, target: 'NONE' };
}
