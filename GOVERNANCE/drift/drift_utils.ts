/**
 * PHASE E — DRIFT DETECTION UTILITIES
 * Specification: PHASE_E_SPECIFICATION v1.2
 *
 * Shared utilities for ID generation, validation, deviation computation.
 * All functions are pure (no I/O, no side effects).
 *
 * INV-E-02: Zero side effects
 */

import * as crypto from 'crypto';
import type {
  DriftReport,
  DriftResult,
  DriftClassification,
  DriftTypeCode
} from './types.js';
import { DRIFT_CLASSIFICATIONS, DRIFT_TYPE_CODES } from './types.js';
import { classifyScore } from './scoring.js';

// ─────────────────────────────────────────────────────────────
// ID GENERATION
// ─────────────────────────────────────────────────────────────

/**
 * Generate a drift ID in format: D-{code}-YYYYMMDD-NNN
 * @param type - Drift type code
 * @param date - Date for the ID
 * @param sequence - Sequence number (1-based)
 */
export function generateDriftId(
  type: DriftTypeCode,
  date: Date,
  sequence: number
): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const seqStr = String(sequence).padStart(3, '0');
  return `${type}-${dateStr}-${seqStr}`;
}

/**
 * Generate a report ID in format: DRIFT_YYYYMMDDTHHMMSSZ_{hash8}
 * @param date - Report generation date
 * @param contentForHash - Content to derive hash suffix from
 */
export function generateReportId(date: Date, contentForHash: string): string {
  const ts = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const hash = crypto.createHash('sha256').update(contentForHash).digest('hex').slice(0, 8);
  return `DRIFT_${ts}_${hash}`;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

/** Validation result with errors list */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate a DriftReport against spec mandatory fields.
 * INV-E-08: DRIFT_REPORT without trigger_events is INVALID.
 */
export function validateDriftReport(report: DriftReport): ValidationResult {
  const errors: string[] = [];

  if (!report.report_id) errors.push('Missing report_id');
  if (report.version !== '1.0') errors.push(`Invalid version: ${report.version}`);
  if (!report.baseline_ref) errors.push('Missing baseline_ref');
  if (!report.window) errors.push('Missing window');
  if (report.window && !report.window.from) errors.push('Missing window.from');
  if (report.window && !report.window.to) errors.push('Missing window.to');
  if (report.window && typeof report.window.event_count !== 'number') {
    errors.push('Missing window.event_count');
  }

  // INV-E-08: trigger_events must be non-empty
  if (!report.trigger_events || report.trigger_events.length === 0) {
    errors.push('INV-E-08: trigger_events must be non-empty');
  }

  if (!Array.isArray(report.detected_drifts)) errors.push('Missing detected_drifts');
  if (!report.summary) errors.push('Missing summary');
  if (!report.recommendation) errors.push('Missing recommendation');
  if (!report.generated_at) errors.push('Missing generated_at');
  if (!report.generator) errors.push('Missing generator');

  // Validate each drift result
  for (const drift of report.detected_drifts) {
    const driftErrors = validateDriftResult(drift);
    errors.push(...driftErrors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate individual DriftResult fields.
 * INV-E-07: Human justification for score >= 2.
 */
export function validateDriftResult(drift: DriftResult): readonly string[] {
  const errors: string[] = [];

  if (!drift.drift_id) errors.push('DriftResult missing drift_id');
  if (!DRIFT_TYPE_CODES.includes(drift.type)) {
    errors.push(`Invalid drift type: ${drift.type}`);
  }
  if (!drift.description) errors.push('DriftResult missing description');

  // Validate scoring ranges
  if (!Number.isInteger(drift.impact) || drift.impact < 1 || drift.impact > 5) {
    errors.push(`Invalid impact: ${drift.impact}. Must be integer in [1, 5].`);
  }
  if (!Number.isFinite(drift.confidence) || drift.confidence < 0.1 || drift.confidence > 1.0) {
    errors.push(`Invalid confidence: ${drift.confidence}. Must be in [0.1, 1.0].`);
  }
  if (!Number.isInteger(drift.persistence) || drift.persistence < 1) {
    errors.push(`Invalid persistence: ${drift.persistence}. Must be positive integer.`);
  }

  // Verify score matches formula
  const expectedScore = drift.impact * drift.confidence * drift.persistence;
  if (Math.abs(drift.score - expectedScore) > 0.001) {
    errors.push(`Score ${drift.score} does not match impact×confidence×persistence = ${expectedScore}`);
  }

  // Verify classification matches score
  const expectedClassification = classifyScore(drift.score);
  if (drift.classification !== expectedClassification) {
    errors.push(`Classification ${drift.classification} does not match score ${drift.score} (expected ${expectedClassification})`);
  }

  // INV-E-07: Human justification for score >= 2
  if (drift.score >= 2 && !drift.human_justification) {
    errors.push(`INV-E-07: Score ${drift.score} >= 2 requires human_justification`);
  }

  if (!Array.isArray(drift.evidence)) {
    errors.push('DriftResult missing evidence array');
  }

  return errors;
}

/**
 * Validate impact value.
 * @returns true if valid (integer in [1, 5])
 */
export function validateImpact(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Validate confidence value.
 * @returns true if valid (number in [0.1, 1.0])
 */
export function validateConfidence(value: number): boolean {
  return Number.isFinite(value) && value >= 0.1 && value <= 1.0;
}

/**
 * Validate persistence value.
 * @returns true if valid (positive integer)
 */
export function validatePersistence(value: number): boolean {
  return Number.isInteger(value) && value >= 1;
}

// ─────────────────────────────────────────────────────────────
// DEVIATION COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute deviation string between baseline and observed numeric values.
 * @returns Formatted deviation string like "+47%" or "-12%"
 */
export function computeNumericDeviation(
  baselineValue: number,
  observedValue: number
): string {
  if (baselineValue === 0) {
    if (observedValue === 0) return '0%';
    return observedValue > 0 ? '+Inf%' : '-Inf%';
  }
  const pct = ((observedValue - baselineValue) / Math.abs(baselineValue)) * 100;
  const rounded = Math.round(pct);
  const sign = rounded >= 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

/**
 * Compute deviation for string values (hash comparison).
 * @returns 'MATCH' or 'MISMATCH'
 */
export function computeStringDeviation(
  baselineValue: string,
  observedValue: string
): string {
  return baselineValue === observedValue ? 'MATCH' : 'MISMATCH';
}

// ─────────────────────────────────────────────────────────────
// SUMMARY BUILDER
// ─────────────────────────────────────────────────────────────

/**
 * Build summary object from detected drifts.
 */
export function buildSummary(drifts: readonly DriftResult[]): {
  total_drifts: number;
  by_classification: Record<DriftClassification, number>;
  highest_score: number;
} {
  const byClassification: Record<DriftClassification, number> = {
    STABLE: 0,
    INFO: 0,
    WARNING: 0,
    CRITICAL: 0
  };

  let highestScore = 0;

  for (const drift of drifts) {
    byClassification[drift.classification]++;
    if (drift.score > highestScore) {
      highestScore = drift.score;
    }
  }

  return {
    total_drifts: drifts.length,
    by_classification: byClassification,
    highest_score: highestScore
  };
}

// ─────────────────────────────────────────────────────────────
// OBSERVATION WINDOW
// ─────────────────────────────────────────────────────────────

/**
 * Compute observation window from timestamps.
 * @returns Window object with from, to, event_count
 */
export function computeWindow(timestamps: readonly string[]): {
  from: string;
  to: string;
  event_count: number;
} {
  if (timestamps.length === 0) {
    const now = new Date().toISOString();
    return { from: now, to: now, event_count: 0 };
  }

  const sorted = [...timestamps].sort();
  return {
    from: sorted[0],
    to: sorted[sorted.length - 1],
    event_count: timestamps.length
  };
}
