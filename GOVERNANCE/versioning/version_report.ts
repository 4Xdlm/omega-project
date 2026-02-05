/**
 * PHASE I — VERSION REPORT BUILDER
 * Specification: VERSIONING_CONTRACT.md
 *
 * Aggregates version validations into a single report.
 *
 * INV-I-10: NON-ACTUATING (report only, no enforcement)
 */

import type {
  VersionReport,
  VersionContractEvent,
  VersionSummary,
  VersionValidationResult,
  BumpType,
  Deprecation
} from './types.js';
import {
  generateVersionReportId,
  validateVersionEvent,
  computeWindow
} from './version_utils.js';
import { validateAllRules, buildCompatibilityMatrix } from './validators/index.js';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

/** Generator identifier */
export const GENERATOR = 'Phase I Version Validator v1.0';

// ─────────────────────────────────────────────────────────────
// REPORT BUILDING
// ─────────────────────────────────────────────────────────────

/**
 * Build version report from version events.
 * Pure function - validation and aggregation only.
 *
 * @param events - Array of version contract events to validate
 * @param existingDeprecations - Existing deprecations for VER-004 check
 * @param generatedAt - ISO8601 timestamp (optional)
 * @param prevEventHash - Previous event hash for chain
 * @returns Complete version report
 */
export function buildVersionReport(
  events: readonly VersionContractEvent[],
  existingDeprecations: readonly Deprecation[] = [],
  generatedAt?: string,
  prevEventHash?: string | null
): VersionReport {
  const now = generatedAt || new Date().toISOString();

  // Validate all events
  const validations = events.map(event => ({
    event_id: event.event_id,
    validation: validateVersionEvent(event)
  }));

  // Check all rules
  const allRuleViolations = events.flatMap(event =>
    validateAllRules(event, existingDeprecations)
  );

  // Build compatibility matrix
  const versions = events.map(e => e.version.current);
  const uniqueVersions = [...new Set([...versions, ...events.map(e => e.version.previous)])];
  const compatibilityMatrix = buildCompatibilityMatrix(uniqueVersions, events);

  // Compute summary
  const summary = computeSummary(events, validations, allRuleViolations);

  // Compute window
  const window = computeWindow(events);

  // Determine escalation
  const escalation = determineEscalation(validations, allRuleViolations);

  // Generate report ID
  const contentForHash = JSON.stringify({
    events: events.map(e => e.event_id),
    timestamp: now
  });
  const reportId = generateVersionReportId(new Date(now), contentForHash);

  return {
    report_type: 'version_report',
    schema_version: '1.0.0',
    report_id: reportId,
    timestamp: now,
    window,
    version_events: events,
    validations,
    compatibility_matrix: compatibilityMatrix,
    rule_violations: allRuleViolations,
    summary,
    escalation_required: escalation.required,
    escalation_target: escalation.target,
    notes: 'No automatic enforcement. Version validation report for human review.',
    generated_at: now,
    generator: GENERATOR,
    log_chain_prev_hash: prevEventHash ?? null
  };
}

// ─────────────────────────────────────────────────────────────
// SUMMARY COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute summary statistics from events.
 */
export function computeSummary(
  events: readonly VersionContractEvent[],
  validations: readonly { event_id: string; validation: VersionValidationResult }[],
  ruleViolations: readonly { rule: string }[]
): VersionSummary {
  // Initialize counts
  const byBumpType: Record<BumpType, number> = {
    'major': 0,
    'minor': 0,
    'patch': 0
  };

  let breakingChangesCount = 0;
  let deprecationsCount = 0;
  let migrationsRequired = 0;

  // Count events
  for (const event of events) {
    byBumpType[event.version.bump_type]++;
    breakingChangesCount += event.breaking_changes.length;
    deprecationsCount += event.deprecations.length;
    if (event.migration_path) {
      migrationsRequired++;
    }
  }

  return {
    total_events: events.length,
    by_bump_type: byBumpType,
    breaking_changes_count: breakingChangesCount,
    deprecations_count: deprecationsCount,
    migrations_required: migrationsRequired,
    rule_violations_count: ruleViolations.length
  };
}

// ─────────────────────────────────────────────────────────────
// ESCALATION
// ─────────────────────────────────────────────────────────────

/**
 * Determine if escalation is required.
 * Escalation required if:
 * - Any event validation fails
 * - Any rule violation detected
 * - Breaking changes without proper documentation
 */
export function determineEscalation(
  validations: readonly { event_id: string; validation: VersionValidationResult }[],
  ruleViolations: readonly { rule: string; severity: string }[]
): { required: boolean; target: string } {
  const hasInvalidEvents = validations.some(v => !v.validation.valid);
  const hasErrorViolations = ruleViolations.some(v => v.severity === 'error');

  if (hasInvalidEvents || hasErrorViolations) {
    return { required: true, target: 'ARCHITECTE' };
  }

  return { required: false, target: 'NONE' };
}
