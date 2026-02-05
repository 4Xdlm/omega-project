/**
 * MATRIX BUILDER — Build REGRESSION_MATRIX
 *
 * Aggregates all regression check results into a single matrix.
 * Matches templates/regression/REGRESSION_MATRIX.template.json
 */

import * as crypto from 'crypto';
import type {
  RegressionMatrix,
  RegressionCheckResult,
  RegressionSummary,
  CandidateVersion,
  RegressionStatus,
  ValidationResult
} from './types.js';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

/** Generator identifier */
export const GENERATOR = 'Phase F Non-Regression v1.0';

// ─────────────────────────────────────────────────────────────
// MATRIX BUILDING
// ─────────────────────────────────────────────────────────────

/**
 * Build regression matrix from check results.
 * Pure function - aggregation only.
 * @param entries - Array of regression check results
 * @param candidate - Candidate version reference
 * @param generatedAt - ISO8601 timestamp (optional, defaults to now)
 * @param prevEventHash - Previous event hash for chain (optional)
 * @returns Complete regression matrix
 */
export function buildRegressionMatrix(
  entries: readonly RegressionCheckResult[],
  candidate: CandidateVersion,
  generatedAt?: string,
  prevEventHash?: string | null
): RegressionMatrix {
  const now = generatedAt || new Date().toISOString();
  const summary = computeSummary(entries);
  const overallStatus = determineOverallStatus(entries);
  const requiresHuman = requiresHumanDecision(entries);

  // Generate deterministic event ID
  const contentForHash = JSON.stringify({
    entries: entries.map(e => e.check_id),
    candidate: candidate.commit,
    timestamp: now
  });
  const eventId = generateEventId(new Date(now), contentForHash);

  const matrix: RegressionMatrix = {
    event_type: 'regression_result',
    schema_version: '1.0.0',
    event_id: eventId,
    timestamp: now,
    candidate_ref: candidate,
    entries,
    overall_status: overallStatus,
    requires_human_decision: requiresHuman,
    log_chain_prev_hash: prevEventHash ?? null,
    summary,
    notes: 'No automatic action taken. Awaiting human decision.',
    generated_at: now,
    generator: GENERATOR
  };

  // Validate before return
  const validation = validateMatrix(matrix);
  if (!validation.valid) {
    throw new Error(`REGRESSION_MATRIX validation failed: ${validation.errors.join('; ')}`);
  }

  return matrix;
}

// ─────────────────────────────────────────────────────────────
// SUMMARY COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute summary statistics from entries.
 * @param entries - Array of regression check results
 * @returns Summary with counts and totals
 */
export function computeSummary(
  entries: readonly RegressionCheckResult[]
): RegressionSummary {
  const passed = entries.filter(e => e.status === 'PASS').length;
  const failed = entries.filter(e => e.status === 'FAIL').length;
  const waived = entries.filter(e => e.status === 'WAIVED').length;

  // Count total regressions across all entries
  const regressions = entries.reduce(
    (sum, e) => sum + e.regressions_detected.length,
    0
  );

  // Count critical regressions
  const criticalRegressions = entries.reduce(
    (sum, e) => sum + e.regressions_detected.filter(r => r.severity === 'critical').length,
    0
  );

  return {
    baselines_checked: entries.length,
    total_checks: entries.length,
    passed,
    failed,
    waived,
    regressions_found: regressions,
    critical_regressions: criticalRegressions
  };
}

// ─────────────────────────────────────────────────────────────
// STATUS DETERMINATION
// ─────────────────────────────────────────────────────────────

/**
 * Determine overall status from all entries.
 * @param entries - Array of regression check results
 * @returns PASS if all pass, WAIVED if any waived (none fail), FAIL if any fail
 */
export function determineOverallStatus(
  entries: readonly RegressionCheckResult[]
): RegressionStatus {
  // If no entries, return PASS (nothing to check)
  if (entries.length === 0) {
    return 'PASS';
  }

  // If any entry failed, overall is FAIL
  const hasFailed = entries.some(e => e.status === 'FAIL');
  if (hasFailed) {
    return 'FAIL';
  }

  // If any entry was waived (and none failed), overall is WAIVED
  const hasWaived = entries.some(e => e.status === 'WAIVED');
  if (hasWaived) {
    return 'WAIVED';
  }

  // All passed
  return 'PASS';
}

/**
 * Check if human decision is required.
 * Required when: any FAIL status or any critical regressions.
 * @param entries - Array of regression check results
 * @returns true if human decision required
 */
export function requiresHumanDecision(
  entries: readonly RegressionCheckResult[]
): boolean {
  // Any failure requires human decision
  const hasFailed = entries.some(e => e.status === 'FAIL');
  if (hasFailed) {
    return true;
  }

  // Any critical regression requires human decision
  const hasCritical = entries.some(e =>
    e.regressions_detected.some(r => r.severity === 'critical')
  );
  if (hasCritical) {
    return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────
// ID GENERATION
// ─────────────────────────────────────────────────────────────

/**
 * Generate matrix event ID.
 * @param date - Generation date
 * @param contentForHash - Content to hash for uniqueness
 * @returns Formatted event ID
 */
export function generateEventId(
  date: Date,
  contentForHash: string
): string {
  const dateStr = date.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const hash = crypto
    .createHash('sha256')
    .update(contentForHash)
    .digest('hex')
    .slice(0, 8);

  return `REG_${dateStr}_${hash}`;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * Validate a regression matrix structure.
 * @param matrix - Matrix to validate
 * @returns Validation result with errors if invalid
 */
export function validateMatrix(
  matrix: RegressionMatrix
): ValidationResult {
  const errors: string[] = [];

  // Schema fields
  if (matrix.event_type !== 'regression_result') {
    errors.push('event_type must be "regression_result"');
  }
  if (matrix.schema_version !== '1.0.0') {
    errors.push('schema_version must be "1.0.0"');
  }

  // Required fields
  if (!matrix.event_id || matrix.event_id.trim() === '') {
    errors.push('event_id is required');
  }
  if (!matrix.timestamp || matrix.timestamp.trim() === '') {
    errors.push('timestamp is required');
  }
  if (!matrix.generated_at || matrix.generated_at.trim() === '') {
    errors.push('generated_at is required');
  }
  if (!matrix.generator || matrix.generator.trim() === '') {
    errors.push('generator is required');
  }

  // Candidate reference
  if (!matrix.candidate_ref) {
    errors.push('candidate_ref is required');
  } else {
    if (!matrix.candidate_ref.version) {
      errors.push('candidate_ref.version is required');
    }
    if (!matrix.candidate_ref.commit) {
      errors.push('candidate_ref.commit is required');
    }
  }

  // Entries validation
  if (!Array.isArray(matrix.entries)) {
    errors.push('entries must be an array');
  }

  // Status validation
  if (!['PASS', 'FAIL', 'WAIVED'].includes(matrix.overall_status)) {
    errors.push('overall_status must be PASS, FAIL, or WAIVED');
  }

  // Summary validation
  if (!matrix.summary) {
    errors.push('summary is required');
  } else {
    if (typeof matrix.summary.baselines_checked !== 'number') {
      errors.push('summary.baselines_checked must be a number');
    }
    if (typeof matrix.summary.total_checks !== 'number') {
      errors.push('summary.total_checks must be a number');
    }
  }

  // Notes validation (non-actuation)
  if (!matrix.notes || !matrix.notes.toLowerCase().includes('no automatic action')) {
    errors.push('notes must contain non-actuation statement');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
