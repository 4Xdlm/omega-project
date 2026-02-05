/**
 * PHASE J — INCIDENT REPORT BUILDER
 * Specification: INCIDENT_PROCESS.md
 *
 * Builds incident reports aggregating:
 * - Incidents
 * - Post-mortems
 * - Rollback plans
 * - Validations
 * - Rule violations
 *
 * INV-J-10: NON-ACTUATING (report only).
 */

import type {
  IncidentEvent,
  PostMortem,
  RollbackPlan,
  IncidentReport,
  IncidentSummary,
  IncidentValidationResult,
  IncidentRuleViolation,
  IncidentSeverity,
  IncidentStatus
} from './types.js';
import {
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES
} from './types.js';
import {
  generateIncidentReportId,
  computeWindow,
  computeContentHash,
  validateIncidentEvent,
  validatePostMortem,
  validateRollbackPlan,
  requiresPostMortem
} from './incident_utils.js';
import { validateAllRules } from './validators/rules.js';
import { validateRollback } from './validators/rollback.js';

/** Report generator identifier */
export const GENERATOR = 'INCIDENT_REPORT_GENERATOR_v1.0';

/**
 * Build incident report.
 * INV-J-10: NON-ACTUATING (report only).
 */
export function buildIncidentReport(
  incidents: readonly IncidentEvent[],
  postmortems: readonly PostMortem[],
  rollbackPlans: readonly RollbackPlan[],
  generatedAt: string,
  prevEventHash: string | null
): IncidentReport {
  // Build post-mortem lookup
  const postmortemMap = new Map<string, PostMortem>();
  for (const pm of postmortems) {
    postmortemMap.set(pm.incident_id, pm);
  }

  // Validate all incidents and collect violations
  const validations: { incident_id: string; validation: IncidentValidationResult }[] = [];
  const allViolations: IncidentRuleViolation[] = [];

  for (const incident of incidents) {
    const postmortem = postmortemMap.get(incident.incident_id) ?? null;
    const rollback = rollbackPlans.find(r => r.trigger.incident_id === incident.incident_id);

    const validation = validateIncidentComplete(incident, postmortem, rollback ?? null);
    validations.push({ incident_id: incident.incident_id, validation });

    // Collect rule violations
    const ruleViolations = validateAllRules(incident, postmortem);
    allViolations.push(...ruleViolations);
  }

  // Compute summary
  const summary = computeIncidentSummary(incidents, postmortems, rollbackPlans);

  // Compute window
  const window = computeWindow(incidents);

  // Determine escalation
  const escalationRequired = shouldEscalate(incidents, allViolations);
  const escalationTarget = escalationRequired ? 'ARCHITECTE' : '';

  // Generate report ID
  const contentForHash = JSON.stringify({ incidents, postmortems, rollbackPlans, generatedAt });
  const reportId = generateIncidentReportId(new Date(generatedAt), contentForHash);

  return {
    report_type: 'incident_report',
    schema_version: '1.0.0',
    report_id: reportId,
    timestamp: generatedAt,
    window,
    incidents,
    postmortems,
    rollback_plans: rollbackPlans,
    validations,
    rule_violations: allViolations,
    summary,
    escalation_required: escalationRequired,
    escalation_target: escalationTarget,
    notes: 'No automatic actions taken. Report for human review only. INV-J-10: NON-ACTUATING.',
    generated_at: generatedAt,
    generator: GENERATOR,
    log_chain_prev_hash: prevEventHash
  };
}

/**
 * Validate incident completely.
 */
function validateIncidentComplete(
  incident: IncidentEvent,
  postmortem: PostMortem | null,
  rollback: RollbackPlan | null
): IncidentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate incident
  const incidentResult = validateIncidentEvent(incident);
  errors.push(...incidentResult.errors);

  // Validate post-mortem if exists
  let postmortemValid = true;
  if (postmortem) {
    const pmResult = validatePostMortem(postmortem);
    if (!pmResult.valid) {
      postmortemValid = false;
      errors.push(...pmResult.errors);
    }
  } else if (requiresPostMortem(incident.severity)) {
    // INC-005: MEDIUM+ requires post-mortem
    postmortemValid = false;
    errors.push(`INC-005: ${incident.severity} incident requires post-mortem`);
  }

  // Validate rollback if exists
  let rollbackValid = true;
  if (rollback) {
    const rbResult = validateRollback(rollback);
    if (!rbResult.valid) {
      rollbackValid = false;
      errors.push(...rbResult.errors);
    }
  }

  // Validate rules
  const ruleViolations = validateAllRules(incident, postmortem);
  const errorViolations = ruleViolations.filter(v => v.severity === 'error');
  const warningViolations = ruleViolations.filter(v => v.severity === 'warning');

  warnings.push(...warningViolations.map(v => `${v.rule}: ${v.description}`));

  return {
    valid: errors.length === 0,
    incident_valid: incidentResult.valid,
    postmortem_valid: postmortemValid,
    rollback_valid: rollbackValid,
    rules_valid: errorViolations.length === 0,
    errors,
    warnings
  };
}

/**
 * Compute incident summary statistics.
 */
function computeIncidentSummary(
  incidents: readonly IncidentEvent[],
  postmortems: readonly PostMortem[],
  rollbackPlans: readonly RollbackPlan[]
): IncidentSummary {
  // Initialize counts
  const bySeverity: Record<IncidentSeverity, number> = {
    'CRITICAL': 0,
    'HIGH': 0,
    'MEDIUM': 0,
    'LOW': 0
  };

  const byStatus: Record<IncidentStatus, number> = {
    'detected': 0,
    'triaged': 0,
    'investigating': 0,
    'resolving': 0,
    'resolved': 0,
    'postmortem': 0
  };

  let slaMetCount = 0;
  let slaBreachedCount = 0;

  // Count incidents
  for (const incident of incidents) {
    bySeverity[incident.severity]++;
    byStatus[incident.status]++;

    if (incident.sla.sla_met === true) {
      slaMetCount++;
    } else if (incident.sla.sla_met === false) {
      slaBreachedCount++;
    }
  }

  // Count post-mortems
  const postmortemIncidentIds = new Set(postmortems.map(pm => pm.incident_id));
  const incidentsRequiringPM = incidents.filter(i => requiresPostMortem(i.severity));
  const postmortemsCompleted = incidentsRequiringPM.filter(i =>
    postmortemIncidentIds.has(i.incident_id)
  ).length;
  const postmortemsPending = incidentsRequiringPM.length - postmortemsCompleted;

  // Count rollbacks
  const rollbacksExecuted = rollbackPlans.filter(r =>
    r.execution.status === 'completed'
  ).length;

  return {
    total_incidents: incidents.length,
    by_severity: bySeverity,
    by_status: byStatus,
    postmortems_completed: postmortemsCompleted,
    postmortems_pending: postmortemsPending,
    rollbacks_executed: rollbacksExecuted,
    sla_met_count: slaMetCount,
    sla_breached_count: slaBreachedCount
  };
}

/**
 * Determine if escalation is required.
 * Escalate for:
 * - Any CRITICAL incident
 * - SLA breach on HIGH+ incident
 * - Missing post-mortem for MEDIUM+ (INV-J-05: Silence = violation)
 */
function shouldEscalate(
  incidents: readonly IncidentEvent[],
  violations: readonly IncidentRuleViolation[]
): boolean {
  // CRITICAL incidents always escalate
  if (incidents.some(i => i.severity === 'CRITICAL')) {
    return true;
  }

  // SLA breach on HIGH+ escalates
  if (incidents.some(i =>
    (i.severity === 'CRITICAL' || i.severity === 'HIGH') &&
    i.sla.sla_met === false
  )) {
    return true;
  }

  // Error-level violations escalate
  if (violations.some(v => v.severity === 'error')) {
    return true;
  }

  return false;
}

/**
 * Generate report hash for chain linking.
 */
export function computeReportHash(report: IncidentReport): string {
  const content = JSON.stringify({
    report_id: report.report_id,
    timestamp: report.timestamp,
    incidents: report.incidents.map(i => i.incident_id),
    violations_count: report.rule_violations.length,
    escalation_required: report.escalation_required
  });
  return computeContentHash(content);
}

/**
 * Check if report indicates healthy state.
 */
export function isHealthyReport(report: IncidentReport): boolean {
  return (
    report.rule_violations.length === 0 &&
    report.summary.postmortems_pending === 0 &&
    report.summary.sla_breached_count === 0 &&
    !report.escalation_required
  );
}
