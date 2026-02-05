/**
 * PHASE H — OVERRIDE REPORT BUILDER
 * Specification: HUMAN_OVERRIDE.md
 *
 * Aggregates override validations into a single report.
 *
 * INV-H-06: NON-ACTUATING (report only, no enforcement)
 */

import type {
  OverrideEvent,
  OverrideReport,
  OverrideSummary,
  OverrideType,
  OverrideStatus,
  OverrideValidationResult
} from './types.js';
import {
  generateOverrideReportId,
  validateOverrideConditions,
  getOverrideStatus,
  isExpiringSoon,
  computeWindow
} from './override_utils.js';
import { validateAllRules, type RuleViolation } from './validators/index.js';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

/** Generator identifier */
export const GENERATOR = 'Phase H Override Validator v1.0';

// ─────────────────────────────────────────────────────────────
// REPORT BUILDING
// ─────────────────────────────────────────────────────────────

/**
 * Build override report from overrides.
 * Pure function - validation and aggregation only.
 *
 * @param overrides - Array of override events to validate
 * @param existingOverrides - Existing overrides for renewal check
 * @param generatedAt - ISO8601 timestamp (optional)
 * @param prevEventHash - Previous event hash for chain
 * @returns Complete override report
 */
export function buildOverrideReport(
  overrides: readonly OverrideEvent[],
  existingOverrides: readonly OverrideEvent[] = [],
  generatedAt?: string,
  prevEventHash?: string | null
): OverrideReport {
  const now = generatedAt || new Date().toISOString();

  // Validate all overrides
  const validations = overrides.map(override => ({
    override_id: override.override_id,
    validation: validateOverrideConditions(override)
  }));

  // Check all rules
  const allRuleViolations: {
    rule: string;
    override_id: string;
    description: string;
  }[] = [];

  for (const override of overrides) {
    const violations = validateAllRules(override, existingOverrides);
    for (const v of violations) {
      allRuleViolations.push({
        rule: v.rule,
        override_id: v.override_id,
        description: v.description
      });
    }
  }

  // Compute summary
  const summary = computeSummary(overrides, validations, now);

  // Compute window
  const window = computeWindow(overrides);

  // Determine escalation
  const escalation = determineEscalation(validations, allRuleViolations);

  // Generate report ID
  const contentForHash = JSON.stringify({
    overrides: overrides.map(o => o.override_id),
    timestamp: now
  });
  const reportId = generateOverrideReportId(new Date(now), contentForHash);

  return {
    report_type: 'override_report',
    schema_version: '1.0.0',
    report_id: reportId,
    timestamp: now,
    window,
    overrides,
    validations,
    summary,
    rule_violations: allRuleViolations,
    escalation_required: escalation.required,
    escalation_target: escalation.target,
    notes: 'No automatic enforcement. Override validation report for human review.',
    generated_at: now,
    generator: GENERATOR,
    log_chain_prev_hash: prevEventHash ?? null
  };
}

// ─────────────────────────────────────────────────────────────
// SUMMARY COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute summary statistics from overrides.
 * @param overrides - Array of override events
 * @param validations - Validation results
 * @param currentTime - Current timestamp for status checks
 * @returns Summary with counts and breakdowns
 */
export function computeSummary(
  overrides: readonly OverrideEvent[],
  validations: readonly { override_id: string; validation: OverrideValidationResult }[],
  currentTime: string
): OverrideSummary {
  // Initialize counts
  const byType: Record<OverrideType, number> = {
    'hotfix': 0,
    'exception': 0,
    'derogation': 0
  };

  const byStatus: Record<OverrideStatus, number> = {
    'active': 0,
    'expired': 0,
    'revoked': 0,
    'invalid': 0
  };

  let expiringSoonCount = 0;

  // Count by type and status
  for (const override of overrides) {
    byType[override.type]++;

    const status = getOverrideStatus(override, currentTime);
    byStatus[status]++;

    if (isExpiringSoon(override, currentTime)) {
      expiringSoonCount++;
    }
  }

  // Count invalid from validations
  const invalidCount = validations.filter(v => !v.validation.valid).length;

  return {
    total_overrides: overrides.length,
    by_type: byType,
    by_status: byStatus,
    active_count: byStatus['active'],
    expired_count: byStatus['expired'],
    expiring_soon_count: expiringSoonCount,
    invalid_count: invalidCount
  };
}

// ─────────────────────────────────────────────────────────────
// ESCALATION
// ─────────────────────────────────────────────────────────────

/**
 * Determine if escalation is required.
 * Escalation required if:
 * - Any override has invalid conditions
 * - Any rule violation detected
 * @param validations - Validation results
 * @param ruleViolations - Rule violations
 * @returns Escalation info
 */
export function determineEscalation(
  validations: readonly { override_id: string; validation: OverrideValidationResult }[],
  ruleViolations: readonly { rule: string; override_id: string; description: string }[]
): { required: boolean; target: string } {
  const hasInvalidConditions = validations.some(v => !v.validation.valid);
  const hasRuleViolations = ruleViolations.length > 0;

  if (hasInvalidConditions || hasRuleViolations) {
    return { required: true, target: 'ARCHITECTE' };
  }

  return { required: false, target: 'NONE' };
}
