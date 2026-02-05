/**
 * PHASE G — MISUSE DETECTION UTILITIES
 * Specification: ABUSE_CASES.md
 *
 * Shared utilities for ID generation, validation, hash computation.
 * All functions are pure (no I/O, no side effects).
 */

import * as crypto from 'crypto';
import type {
  MisuseEvent,
  MisuseReport,
  MisuseCaseCode,
  MisuseSeverity,
  ValidationResult
} from './types.js';
import {
  MISUSE_CASE_CODES,
  MISUSE_SEVERITIES,
  AUTO_ACTION_NONE,
  DETECTION_METHODS
} from './types.js';

// ─────────────────────────────────────────────────────────────
// ID GENERATION
// ─────────────────────────────────────────────────────────────

/**
 * Generate misuse event ID.
 * Format: MSE_{CASE}_{YYYYMMDD}_{NNN}
 * @param caseCode - Misuse case code
 * @param date - Event date
 * @param sequence - Sequence number within day
 * @returns Formatted event ID
 */
export function generateMisuseEventId(
  caseCode: MisuseCaseCode,
  date: Date,
  sequence: number
): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const seqStr = String(sequence).padStart(3, '0');
  const caseNum = caseCode.replace('CASE-', '');

  return `MSE_${caseNum}_${dateStr}_${seqStr}`;
}

/**
 * Generate misuse report ID.
 * Format: MISUSE_YYYYMMDDTHHMMSSZ_{hash8}
 * @param date - Report generation date
 * @param contentForHash - Content to hash for uniqueness
 * @returns Formatted report ID
 */
export function generateMisuseReportId(
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

  return `MISUSE_${ts}_${hash}`;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * Validate a misuse event structure.
 * @param event - Event to validate
 * @returns Validation result with errors if invalid
 */
export function validateMisuseEvent(event: MisuseEvent): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (event.event_type !== 'misuse_event') {
    errors.push('event_type must be "misuse_event"');
  }
  if (event.schema_version !== '1.0.0') {
    errors.push('schema_version must be "1.0.0"');
  }
  if (!event.event_id || event.event_id.trim() === '') {
    errors.push('event_id is required');
  }
  if (!event.timestamp || event.timestamp.trim() === '') {
    errors.push('timestamp is required');
  }

  // Case validation
  if (!MISUSE_CASE_CODES.includes(event.case_id)) {
    errors.push(`case_id must be one of: ${MISUSE_CASE_CODES.join(', ')}`);
  }

  // Severity validation
  if (!MISUSE_SEVERITIES.includes(event.severity)) {
    errors.push(`severity must be one of: ${MISUSE_SEVERITIES.join(', ')}`);
  }

  // Detection method validation
  if (!DETECTION_METHODS.includes(event.detection_method)) {
    errors.push(`detection_method must be one of: ${DETECTION_METHODS.join(', ')}`);
  }

  // INV-G-01: auto_action_taken must be "none"
  if (event.auto_action_taken !== AUTO_ACTION_NONE) {
    errors.push('INV-G-01: auto_action_taken must be "none"');
  }

  // INV-G-02: requires_human_decision must be true
  if (event.requires_human_decision !== true) {
    errors.push('INV-G-02: requires_human_decision must be true');
  }

  // Evidence validation
  if (!event.evidence) {
    errors.push('evidence is required');
  } else {
    if (!event.evidence.description || event.evidence.description.trim() === '') {
      errors.push('evidence.description is required');
    }
    if (!Array.isArray(event.evidence.samples)) {
      errors.push('evidence.samples must be an array');
    }
  }

  // Context validation
  if (!event.context) {
    errors.push('context is required');
  } else {
    if (!event.context.source || event.context.source.trim() === '') {
      errors.push('context.source is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a misuse report structure.
 * @param report - Report to validate
 * @returns Validation result with errors if invalid
 */
export function validateMisuseReport(report: MisuseReport): ValidationResult {
  const errors: string[] = [];

  // Schema fields
  if (report.report_type !== 'misuse_report') {
    errors.push('report_type must be "misuse_report"');
  }
  if (report.schema_version !== '1.0.0') {
    errors.push('schema_version must be "1.0.0"');
  }

  // Required fields
  if (!report.report_id || report.report_id.trim() === '') {
    errors.push('report_id is required');
  }
  if (!report.timestamp || report.timestamp.trim() === '') {
    errors.push('timestamp is required');
  }
  if (!report.generated_at || report.generated_at.trim() === '') {
    errors.push('generated_at is required');
  }
  if (!report.generator || report.generator.trim() === '') {
    errors.push('generator is required');
  }

  // Window validation
  if (!report.window) {
    errors.push('window is required');
  } else {
    if (!report.window.from) {
      errors.push('window.from is required');
    }
    if (!report.window.to) {
      errors.push('window.to is required');
    }
    if (typeof report.window.events_count !== 'number') {
      errors.push('window.events_count must be a number');
    }
  }

  // Events array
  if (!Array.isArray(report.misuse_events)) {
    errors.push('misuse_events must be an array');
  }

  // Summary validation
  if (!report.summary) {
    errors.push('summary is required');
  }

  // Notes validation (non-actuation)
  if (!report.notes || !report.notes.toLowerCase().includes('no automatic action')) {
    errors.push('notes must contain non-actuation statement');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ─────────────────────────────────────────────────────────────
// HASH COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute SHA256 hash of content.
 * @param content - Content to hash
 * @returns Hex-encoded SHA256 hash
 */
export function computeContentHash(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
}

/**
 * Verify hash chain integrity.
 * @param entries - Log chain entries to verify
 * @returns true if chain is valid, false if broken
 */
export function verifyHashChain(
  entries: readonly { content_hash: string; prev_hash: string | null }[]
): boolean {
  if (entries.length === 0) {
    return true;
  }

  for (let i = 1; i < entries.length; i++) {
    const current = entries[i];
    const previous = entries[i - 1];

    if (current.prev_hash !== previous.content_hash) {
      return false;
    }
  }

  return true;
}

/**
 * Find hash chain breaks.
 * @param entries - Log chain entries to check
 * @returns Array of indices where chain is broken
 */
export function findHashChainBreaks(
  entries: readonly { entry_id: string; content_hash: string; prev_hash: string | null }[]
): readonly number[] {
  const breaks: number[] = [];

  for (let i = 1; i < entries.length; i++) {
    const current = entries[i];
    const previous = entries[i - 1];

    if (current.prev_hash !== previous.content_hash) {
      breaks.push(i);
    }
  }

  return breaks;
}

// ─────────────────────────────────────────────────────────────
// WINDOW COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute observation window from timestamps.
 * @param timestamps - Array of ISO8601 timestamps
 * @returns Window with from, to, and count
 */
export function computeWindow(
  timestamps: readonly string[]
): { from: string; to: string; events_count: number } {
  if (timestamps.length === 0) {
    const now = new Date().toISOString();
    return { from: now, to: now, events_count: 0 };
  }

  const sorted = [...timestamps].sort();
  return {
    from: sorted[0],
    to: sorted[sorted.length - 1],
    events_count: timestamps.length
  };
}

// ─────────────────────────────────────────────────────────────
// SEVERITY HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Get highest severity from a list of severities.
 * Order: critical > high > medium > low
 * @param severities - Array of severity values
 * @returns Highest severity, or null if empty
 */
export function getHighestSeverity(
  severities: readonly MisuseSeverity[]
): MisuseSeverity | null {
  if (severities.length === 0) {
    return null;
  }

  const order: Record<MisuseSeverity, number> = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1
  };

  let highest: MisuseSeverity = severities[0];
  for (const sev of severities) {
    if (order[sev] > order[highest]) {
      highest = sev;
    }
  }

  return highest;
}

/**
 * Check if severity requires escalation.
 * @param severity - Severity to check
 * @returns true if escalation required (high or critical)
 */
export function requiresEscalation(severity: MisuseSeverity | null): boolean {
  return severity === 'high' || severity === 'critical';
}
