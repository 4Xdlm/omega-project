/**
 * PHASE J — INCIDENT UTILITIES
 * Specification: INCIDENT_PROCESS.md
 *
 * Shared utilities for ID generation, validation, evidence handling.
 * All functions are pure (no I/O, no side effects).
 */

import * as crypto from 'crypto';
import type {
  IncidentEvent,
  IncidentSeverity,
  IncidentStatus,
  PostMortem,
  RollbackPlan,
  IncidentValidationResult
} from './types.js';
import {
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_SOURCES,
  SEVERITY_SLA_HOURS,
  ROOT_CAUSE_CATEGORIES,
  RESOLUTION_TYPES
} from './types.js';

// ─────────────────────────────────────────────────────────────
// ID GENERATION
// ─────────────────────────────────────────────────────────────

/**
 * Generate incident event ID.
 * Format: INC_{SEV}_{YYYYMMDD}_{NNN}
 */
export function generateIncidentEventId(
  severity: IncidentSeverity,
  date: Date,
  sequence: number
): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const seqStr = String(sequence).padStart(3, '0');
  const sevCode = severity.substring(0, 3).toUpperCase();

  return `INC_${sevCode}_${dateStr}_${seqStr}`;
}

/**
 * Generate incident ID.
 * Format: INCIDENT_{YYYYMMDDTHHMMSSZ}_{hash8}
 */
export function generateIncidentId(
  date: Date,
  contentForHash: string
): string {
  const ts = date.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const hash = crypto
    .createHash('sha256')
    .update(contentForHash)
    .digest('hex')
    .slice(0, 8);

  return `INCIDENT_${ts}_${hash}`;
}

/**
 * Generate post-mortem ID.
 * Format: PM_{INCIDENT_ID}
 */
export function generatePostMortemId(incidentId: string): string {
  return `PM_${incidentId}`;
}

/**
 * Generate rollback ID.
 * Format: RB_{INCIDENT_ID}_{NNN}
 */
export function generateRollbackId(
  incidentId: string,
  sequence: number
): string {
  const seqStr = String(sequence).padStart(3, '0');
  return `RB_${incidentId}_${seqStr}`;
}

/**
 * Generate incident report ID.
 * Format: INC_REPORT_{YYYYMMDDTHHMMSSZ}_{hash8}
 */
export function generateIncidentReportId(
  date: Date,
  contentForHash: string
): string {
  const ts = date.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const hash = crypto
    .createHash('sha256')
    .update(contentForHash)
    .digest('hex')
    .slice(0, 8);

  return `INC_REPORT_${ts}_${hash}`;
}

// ─────────────────────────────────────────────────────────────
// SLA COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute SLA deadline from detection time.
 * @param detectedAt - Detection timestamp
 * @param severity - Incident severity
 * @returns SLA deadline timestamp
 */
export function computeSLADeadline(
  detectedAt: string,
  severity: IncidentSeverity
): string {
  const detected = new Date(detectedAt);
  const slaHours = SEVERITY_SLA_HOURS[severity];
  const deadline = new Date(detected.getTime() + slaHours * 60 * 60 * 1000);
  return deadline.toISOString();
}

/**
 * Check if SLA was met.
 * @param detectedAt - Detection timestamp
 * @param resolvedAt - Resolution timestamp (or current time)
 * @param severity - Incident severity
 * @returns true if SLA was met
 */
export function checkSLACompliance(
  detectedAt: string,
  resolvedAt: string,
  severity: IncidentSeverity
): boolean {
  const deadline = computeSLADeadline(detectedAt, severity);
  return resolvedAt <= deadline;
}

/**
 * Check if incident was logged within 15 minutes.
 * INC-002: Immediate logging requirement.
 * @param detectedAt - Detection timestamp
 * @param loggedAt - Logging timestamp
 * @returns true if logged within 15 minutes
 */
export function checkImmediateLogging(
  detectedAt: string,
  loggedAt: string
): boolean {
  const detected = new Date(detectedAt);
  const logged = new Date(loggedAt);
  const diffMinutes = (logged.getTime() - detected.getTime()) / (1000 * 60);
  return diffMinutes <= 15;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * Validate incident event.
 * @param incident - Incident to validate
 * @returns Validation result
 */
export function validateIncidentEvent(incident: IncidentEvent): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Schema validation
  if (incident.event_type !== 'incident_event') {
    errors.push('event_type must be "incident_event"');
  }
  if (incident.schema_version !== '1.0.0') {
    errors.push('schema_version must be "1.0.0"');
  }

  // INV-J-01: Severity validation
  if (!INCIDENT_SEVERITIES.includes(incident.severity)) {
    errors.push(`INV-J-01: Invalid severity "${incident.severity}"`);
  }

  // INV-J-02: Timestamp validation
  if (!incident.detected_at || incident.detected_at.trim() === '') {
    errors.push('INV-J-02: detected_at timestamp is required');
  }
  if (!incident.timestamp || incident.timestamp.trim() === '') {
    errors.push('INV-J-02: timestamp is required');
  }

  // Check 15-minute logging requirement
  if (incident.detected_at && incident.timestamp) {
    if (!checkImmediateLogging(incident.detected_at, incident.timestamp)) {
      errors.push('INC-002: Incident must be logged within 15 minutes of detection');
    }
  }

  // INV-J-03: Evidence validation
  if (!incident.evidence_refs || incident.evidence_refs.length === 0) {
    errors.push('INV-J-03: At least one evidence reference is required');
  }

  // Source validation
  if (!INCIDENT_SOURCES.includes(incident.source)) {
    errors.push(`Invalid source "${incident.source}"`);
  }

  // Status validation
  if (!INCIDENT_STATUSES.includes(incident.status)) {
    errors.push(`Invalid status "${incident.status}"`);
  }

  // Metadata validation
  if (!incident.metadata.title || incident.metadata.title.trim() === '') {
    errors.push('Incident title is required');
  }
  if (!incident.metadata.description || incident.metadata.description.trim() === '') {
    errors.push('Incident description is required');
  }

  // INV-J-09: SLA tracking
  if (!incident.sla.response_deadline) {
    errors.push('INV-J-09: SLA response deadline is required');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate post-mortem.
 * INC-005: Required for MEDIUM+ incidents.
 * @param postmortem - Post-mortem to validate
 * @returns Validation result
 */
export function validatePostMortem(postmortem: PostMortem): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required sections
  if (!postmortem.summary || postmortem.summary.trim() === '') {
    errors.push('Post-mortem summary is required');
  }

  if (!postmortem.timeline || postmortem.timeline.length === 0) {
    errors.push('Post-mortem timeline is required');
  }

  if (!postmortem.root_cause.description || postmortem.root_cause.description.trim() === '') {
    errors.push('Root cause description is required');
  }

  if (!ROOT_CAUSE_CATEGORIES.includes(postmortem.root_cause.category)) {
    errors.push(`Invalid root cause category "${postmortem.root_cause.category}"`);
  }

  if (!postmortem.impact.description || postmortem.impact.description.trim() === '') {
    errors.push('Impact description is required');
  }

  if (!postmortem.resolution.description || postmortem.resolution.description.trim() === '') {
    errors.push('Resolution description is required');
  }

  if (!RESOLUTION_TYPES.includes(postmortem.resolution.resolution_type)) {
    errors.push(`Invalid resolution type "${postmortem.resolution.resolution_type}"`);
  }

  if (!postmortem.actions || postmortem.actions.length === 0) {
    errors.push('At least one preventive action is required');
  }

  if (!postmortem.evidence_refs || postmortem.evidence_refs.length === 0) {
    errors.push('At least one evidence reference is required');
  }

  // INV-J-08: No blame culture
  if (!postmortem.blame_free_statement || postmortem.blame_free_statement.trim() === '') {
    errors.push('INV-J-08: Blame-free statement is required');
  }

  // Check for blame language (simple check)
  const blameWords = ['fault', 'blame', 'responsible for the failure', 'caused by'];
  const fullText = `${postmortem.summary} ${postmortem.root_cause.description}`.toLowerCase();
  for (const word of blameWords) {
    if (fullText.includes(word)) {
      errors.push(`INV-J-08: Post-mortem should not contain blame language ("${word}")`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate rollback plan.
 * @param rollback - Rollback plan to validate
 * @returns Validation result
 */
export function validateRollbackPlan(rollback: RollbackPlan): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Schema validation
  if (rollback.event_type !== 'rollback_event') {
    errors.push('event_type must be "rollback_event"');
  }

  // INV-J-06: Human decision required
  if (!rollback.human_decision.approver || rollback.human_decision.approver.trim() === '') {
    errors.push('INV-J-06: Rollback requires human approver');
  }
  if (!rollback.human_decision.rationale || rollback.human_decision.rationale.trim() === '') {
    errors.push('INV-J-06: Rollback requires documented rationale');
  }
  if (!rollback.human_decision.approved_at || rollback.human_decision.approved_at.trim() === '') {
    errors.push('INV-J-06: Rollback requires approval timestamp');
  }

  // INV-J-07: Target must be verified stable
  if (!rollback.verification.target_was_stable) {
    errors.push('INV-J-07: Rollback target must be verified as stable');
  }
  if (!rollback.verification.stability_evidence_ref || rollback.verification.stability_evidence_ref.trim() === '') {
    errors.push('INV-J-07: Stability evidence reference is required');
  }

  // Trigger validation
  if (!rollback.trigger.incident_id) {
    errors.push('Rollback must reference triggering incident');
  }

  // State validation
  if (!rollback.current_state.version || !rollback.target_state.version) {
    errors.push('Current and target state versions are required');
  }

  if (!rollback.target_state.tag) {
    errors.push('Target state must have a tag (SEALED)');
  }

  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────
// WINDOW COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute window from incident timestamps.
 */
export function computeWindow(
  incidents: readonly IncidentEvent[]
): { from: string; to: string; incidents_count: number } {
  if (incidents.length === 0) {
    const now = new Date().toISOString();
    return { from: now, to: now, incidents_count: 0 };
  }

  const timestamps = incidents.map(i => i.timestamp).sort();
  return {
    from: timestamps[0],
    to: timestamps[timestamps.length - 1],
    incidents_count: incidents.length
  };
}

// ─────────────────────────────────────────────────────────────
// HASH COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute SHA256 hash of content.
 */
export function computeContentHash(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
}

// ─────────────────────────────────────────────────────────────
// POST-MORTEM REQUIREMENT CHECK
// ─────────────────────────────────────────────────────────────

/**
 * Check if post-mortem is required for severity.
 * INC-005: MEDIUM+ requires post-mortem.
 */
export function requiresPostMortem(severity: IncidentSeverity): boolean {
  return severity === 'CRITICAL' || severity === 'HIGH' || severity === 'MEDIUM';
}
