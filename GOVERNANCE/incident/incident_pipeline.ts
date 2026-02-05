/**
 * PHASE J — INCIDENT PIPELINE
 * Specification: INCIDENT_PROCESS.md
 *
 * Orchestrates:
 * 1. Incident detection & classification
 * 2. Post-mortem validation
 * 3. Rollback validation
 * 4. Rule validation (INC-001 to INC-005)
 * 5. Report generation
 *
 * INV-J-10: NON-ACTUATING — produces reports only.
 */

import type {
  IncidentEvent,
  PostMortem,
  RollbackPlan,
  IncidentReport,
  IncidentPipelineArgs,
  IncidentRuleViolation,
  IncidentValidationResult
} from './types.js';
import { buildIncidentReport, computeReportHash } from './incident_report.js';
import { validateAllRules } from './validators/rules.js';
import { validateRollback, isRollbackSafe } from './validators/rollback.js';
import {
  validateIncidentEvent,
  validatePostMortem,
  validateRollbackPlan,
  requiresPostMortem,
  computeContentHash
} from './incident_utils.js';

/**
 * Pipeline result.
 */
export interface IncidentPipelineResult {
  readonly report: IncidentReport;
  readonly report_hash: string;
  readonly validation_summary: {
    readonly incidents_valid: number;
    readonly incidents_invalid: number;
    readonly postmortems_valid: number;
    readonly postmortems_invalid: number;
    readonly rollbacks_valid: number;
    readonly rollbacks_invalid: number;
    readonly rule_violations: number;
    readonly escalation_required: boolean;
  };
}

/**
 * Run incident pipeline.
 * INV-J-10: NON-ACTUATING — produces report only.
 *
 * Pure function: same inputs produce same outputs.
 */
export function runIncidentPipeline(args: IncidentPipelineArgs): IncidentPipelineResult {
  const {
    incidents,
    postmortems = [],
    rollbackPlans = [],
    generatedAt = new Date().toISOString(),
    prevEventHash = null
  } = args;

  // Phase 1: Validate all incidents
  const incidentValidations = incidents.map(incident => ({
    incident,
    result: validateIncidentEvent(incident)
  }));

  // Phase 2: Validate all post-mortems
  const postmortemValidations = postmortems.map(pm => ({
    postmortem: pm,
    result: validatePostMortem(pm)
  }));

  // Phase 3: Validate all rollback plans
  const rollbackValidations = rollbackPlans.map(rb => ({
    rollback: rb,
    result: validateRollback(rb),
    safe: isRollbackSafe(rb)
  }));

  // Phase 4: Build report
  const report = buildIncidentReport(
    incidents,
    postmortems,
    rollbackPlans,
    generatedAt,
    prevEventHash
  );

  // Compute report hash
  const reportHash = computeReportHash(report);

  // Build validation summary
  const validationSummary = {
    incidents_valid: incidentValidations.filter(v => v.result.valid).length,
    incidents_invalid: incidentValidations.filter(v => !v.result.valid).length,
    postmortems_valid: postmortemValidations.filter(v => v.result.valid).length,
    postmortems_invalid: postmortemValidations.filter(v => !v.result.valid).length,
    rollbacks_valid: rollbackValidations.filter(v => v.result.valid).length,
    rollbacks_invalid: rollbackValidations.filter(v => !v.result.valid).length,
    rule_violations: report.rule_violations.length,
    escalation_required: report.escalation_required
  };

  return {
    report,
    report_hash: reportHash,
    validation_summary: validationSummary
  };
}

/**
 * Validate single incident with context.
 * Returns comprehensive validation including post-mortem requirement check.
 */
export function validateIncidentWithContext(
  incident: IncidentEvent,
  postmortem: PostMortem | null,
  rollback: RollbackPlan | null
): {
  valid: boolean;
  incident_validation: { valid: boolean; errors: string[] };
  postmortem_validation: { valid: boolean; errors: string[] } | null;
  rollback_validation: { valid: boolean; errors: string[] } | null;
  rule_violations: readonly IncidentRuleViolation[];
  postmortem_required: boolean;
  postmortem_missing: boolean;
} {
  // Validate incident
  const incidentValidation = validateIncidentEvent(incident);

  // Check post-mortem requirement
  const postmortemRequired = requiresPostMortem(incident.severity);
  const postmortemMissing = postmortemRequired && !postmortem;

  // Validate post-mortem if present
  let postmortemValidation: { valid: boolean; errors: string[] } | null = null;
  if (postmortem) {
    postmortemValidation = validatePostMortem(postmortem);
  }

  // Validate rollback if present
  let rollbackValidation: { valid: boolean; errors: string[] } | null = null;
  if (rollback) {
    const rbResult = validateRollback(rollback);
    rollbackValidation = { valid: rbResult.valid, errors: [...rbResult.errors] };
  }

  // Validate rules
  const ruleViolations = validateAllRules(incident, postmortem);

  // Compute overall validity
  const valid =
    incidentValidation.valid &&
    (!postmortem || postmortemValidation?.valid !== false) &&
    (!rollback || rollbackValidation?.valid !== false) &&
    !postmortemMissing &&
    ruleViolations.filter(v => v.severity === 'error').length === 0;

  return {
    valid,
    incident_validation: incidentValidation,
    postmortem_validation: postmortemValidation,
    rollback_validation: rollbackValidation,
    rule_violations: ruleViolations,
    postmortem_required: postmortemRequired,
    postmortem_missing: postmortemMissing
  };
}

/**
 * Check pipeline determinism.
 * Verifies same inputs produce same outputs.
 */
export function verifyPipelineDeterminism(
  args: IncidentPipelineArgs,
  runs: number = 3
): {
  deterministic: boolean;
  hashes: string[];
} {
  const hashes: string[] = [];

  for (let i = 0; i < runs; i++) {
    const result = runIncidentPipeline(args);
    hashes.push(result.report_hash);
  }

  const allSame = hashes.every(h => h === hashes[0]);

  return {
    deterministic: allSame,
    hashes
  };
}

/**
 * Check if incident requires immediate attention.
 * CRITICAL incidents always require immediate attention.
 */
export function requiresImmediateAttention(incident: IncidentEvent): boolean {
  return incident.severity === 'CRITICAL';
}

/**
 * Get incidents needing post-mortem.
 * INV-J-04 & INV-J-05: MEDIUM+ requires post-mortem, silence = violation.
 */
export function getIncidentsNeedingPostMortem(
  incidents: readonly IncidentEvent[],
  postmortems: readonly PostMortem[]
): readonly IncidentEvent[] {
  const postmortemIncidentIds = new Set(postmortems.map(pm => pm.incident_id));

  return incidents.filter(incident =>
    requiresPostMortem(incident.severity) &&
    !postmortemIncidentIds.has(incident.incident_id)
  );
}

/**
 * Get rollbacks needing verification.
 */
export function getRollbacksNeedingVerification(
  rollbackPlans: readonly RollbackPlan[]
): readonly RollbackPlan[] {
  return rollbackPlans.filter(rb =>
    rb.execution.status === 'completed' &&
    rb.post_rollback.verification_status === 'pending'
  );
}

/**
 * Compute incident chain hash.
 * Links incidents in chronological order.
 */
export function computeIncidentChainHash(
  incidents: readonly IncidentEvent[]
): string {
  const sorted = [...incidents].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );

  const chain = sorted.map(i => ({
    id: i.incident_id,
    timestamp: i.timestamp,
    severity: i.severity
  }));

  return computeContentHash(JSON.stringify(chain));
}
