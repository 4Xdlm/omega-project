/**
 * PHASE J — INCIDENT & ROLLBACK TYPE DEFINITIONS
 * Specification: INCIDENT_PROCESS.md
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * FINAL PHASE — EXCELLENCE ABSOLUE REQUISE
 *
 * All types for the Phase J incident and rollback system.
 *
 * INV-J-01: Incident classification valid
 * INV-J-02: Timestamp required (within 15 min)
 * INV-J-03: Evidence preservation
 * INV-J-04: Mandatory post-mortem for MEDIUM+
 * INV-J-05: Silence = violation
 * INV-J-06: Rollback requires human decision
 * INV-J-07: Rollback target must be verified stable
 * INV-J-08: No blame in post-mortem
 * INV-J-09: SLA compliance tracked
 * INV-J-10: NON-ACTUATING (report only)
 */

// ─────────────────────────────────────────────────────────────
// INCIDENT SEVERITY
// ─────────────────────────────────────────────────────────────

/**
 * Incident severity levels per INCIDENT_PROCESS.md.
 * CRITICAL: Data loss / Security breach (< 1h SLA)
 * HIGH: Service down / Major bug (< 4h SLA)
 * MEDIUM: Degraded service (< 24h SLA)
 * LOW: Minor issue (< 72h SLA)
 */
export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const INCIDENT_SEVERITIES: readonly IncidentSeverity[] = [
  'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
] as const;

/** SLA response time in hours per severity */
export const SEVERITY_SLA_HOURS: Readonly<Record<IncidentSeverity, number>> = {
  'CRITICAL': 1,
  'HIGH': 4,
  'MEDIUM': 24,
  'LOW': 72
} as const;

/** Severity descriptions */
export const SEVERITY_DESCRIPTIONS: Readonly<Record<IncidentSeverity, string>> = {
  'CRITICAL': 'Data loss / Security breach',
  'HIGH': 'Service down / Major bug',
  'MEDIUM': 'Degraded service',
  'LOW': 'Minor issue'
} as const;

// ─────────────────────────────────────────────────────────────
// INCIDENT SOURCE
// ─────────────────────────────────────────────────────────────

/** Source of incident detection */
export type IncidentSource = 'monitoring' | 'test' | 'user' | 'audit' | 'automated';

export const INCIDENT_SOURCES: readonly IncidentSource[] = [
  'monitoring', 'test', 'user', 'audit', 'automated'
] as const;

// ─────────────────────────────────────────────────────────────
// INCIDENT STATUS
// ─────────────────────────────────────────────────────────────

/** Incident lifecycle status */
export type IncidentStatus = 'detected' | 'triaged' | 'investigating' | 'resolving' | 'resolved' | 'postmortem';

export const INCIDENT_STATUSES: readonly IncidentStatus[] = [
  'detected', 'triaged', 'investigating', 'resolving', 'resolved', 'postmortem'
] as const;

// ─────────────────────────────────────────────────────────────
// INCIDENT EVENT
// ─────────────────────────────────────────────────────────────

/**
 * Incident event - captures an incident occurrence.
 */
export interface IncidentEvent {
  readonly event_type: 'incident_event';
  readonly schema_version: '1.0.0';
  readonly event_id: string;
  readonly incident_id: string;
  readonly timestamp: string;
  readonly detected_at: string;
  readonly source: IncidentSource;
  readonly severity: IncidentSeverity;
  readonly status: IncidentStatus;
  readonly metadata: {
    readonly title: string;
    readonly description: string;
    readonly affected_components: readonly string[];
    readonly affected_users?: string;
    readonly reporter?: string;
  };
  readonly timeline: readonly TimelineEntry[];
  readonly evidence_refs: readonly string[];
  readonly sla: {
    readonly response_deadline: string;
    readonly sla_met: boolean | null;
  };
  readonly log_chain_prev_hash: string | null;
}

/**
 * Timeline entry for incident progression.
 */
export interface TimelineEntry {
  readonly timestamp: string;
  readonly action: string;
  readonly actor: string;
  readonly details?: string;
}

// ─────────────────────────────────────────────────────────────
// POST-MORTEM
// ─────────────────────────────────────────────────────────────

/**
 * Post-mortem document structure.
 * INC-005: Mandatory for all MEDIUM+ incidents.
 *
 * Required sections:
 * 1. Summary
 * 2. Timeline
 * 3. Root Cause
 * 4. Impact
 * 5. Resolution
 * 6. Actions
 * 7. Evidence
 */
export interface PostMortem {
  readonly postmortem_id: string;
  readonly incident_id: string;
  readonly created_at: string;
  readonly author: string;

  // Required sections (all mandatory)
  readonly summary: string;
  readonly timeline: readonly TimelineEntry[];
  readonly root_cause: {
    readonly description: string;
    readonly category: RootCauseCategory;
    readonly contributing_factors: readonly string[];
  };
  readonly impact: {
    readonly description: string;
    readonly affected_users_count?: number;
    readonly data_loss: boolean;
    readonly service_downtime_minutes?: number;
  };
  readonly resolution: {
    readonly description: string;
    readonly resolution_type: ResolutionType;
    readonly resolved_at: string;
    readonly resolved_by: string;
  };
  readonly actions: readonly PreventiveAction[];
  readonly evidence_refs: readonly string[];

  // INC-001: No blame culture
  readonly blame_free_statement: string;
  readonly lessons_learned: readonly string[];
}

/** Root cause categories */
export type RootCauseCategory =
  | 'code_defect'
  | 'configuration_error'
  | 'infrastructure_failure'
  | 'dependency_issue'
  | 'human_error'
  | 'security_incident'
  | 'external_factor'
  | 'unknown';

export const ROOT_CAUSE_CATEGORIES: readonly RootCauseCategory[] = [
  'code_defect', 'configuration_error', 'infrastructure_failure',
  'dependency_issue', 'human_error', 'security_incident',
  'external_factor', 'unknown'
] as const;

/** Resolution types */
export type ResolutionType = 'fix' | 'rollback' | 'workaround' | 'manual_intervention';

export const RESOLUTION_TYPES: readonly ResolutionType[] = [
  'fix', 'rollback', 'workaround', 'manual_intervention'
] as const;

/** Preventive action */
export interface PreventiveAction {
  readonly action_id: string;
  readonly description: string;
  readonly owner: string;
  readonly due_date: string;
  readonly priority: 'high' | 'medium' | 'low';
  readonly status: 'pending' | 'in_progress' | 'completed';
}

// ─────────────────────────────────────────────────────────────
// ROLLBACK
// ─────────────────────────────────────────────────────────────

/** Rollback execution status */
export type RollbackStatus = 'planned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export const ROLLBACK_STATUSES: readonly RollbackStatus[] = [
  'planned', 'in_progress', 'completed', 'failed', 'cancelled'
] as const;

/** Verification status */
export type VerificationStatus = 'pending' | 'passed' | 'failed';

export const VERIFICATION_STATUSES: readonly VerificationStatus[] = [
  'pending', 'passed', 'failed'
] as const;

/**
 * Rollback plan - matches ROLLBACK_PLAN.template.json.
 */
export interface RollbackPlan {
  readonly event_type: 'rollback_event';
  readonly schema_version: '1.0.0';
  readonly event_id: string;
  readonly timestamp: string;
  readonly rollback_id: string;

  readonly trigger: {
    readonly incident_id: string;
    readonly incident_severity: IncidentSeverity;
    readonly trigger_reason: string;
  };

  readonly current_state: {
    readonly version: string;
    readonly commit: string;
    readonly manifest_sha256: string;
  };

  readonly target_state: {
    readonly tag: string;
    readonly version: string;
    readonly commit: string;
    readonly manifest_sha256: string;
    readonly last_known_good: string;
  };

  // INV-J-07: Target must be verified stable
  readonly verification: {
    readonly target_was_stable: boolean;
    readonly stability_evidence_ref: string;
    readonly tests_to_run_post_rollback: readonly string[];
  };

  // INV-J-06: Human decision required
  readonly human_decision: {
    readonly approver: string;
    readonly approver_role: string;
    readonly approved_at: string;
    readonly rationale: string;
  };

  readonly execution: {
    readonly planned_at: string;
    readonly executed_at: string | null;
    readonly status: RollbackStatus;
    readonly execution_log_ref: string | null;
  };

  readonly post_rollback: {
    readonly verification_status: VerificationStatus;
    readonly verification_ref: string | null;
    readonly services_restored: readonly string[];
  };

  readonly evidence_refs: readonly string[];
  readonly log_chain_prev_hash: string | null;
}

// ─────────────────────────────────────────────────────────────
// RULE CODES
// ─────────────────────────────────────────────────────────────

/** Incident rule codes per INCIDENT_PROCESS.md */
export type IncidentRuleCode = 'INC-001' | 'INC-002' | 'INC-003' | 'INC-004' | 'INC-005';

export const INCIDENT_RULES: readonly IncidentRuleCode[] = [
  'INC-001', 'INC-002', 'INC-003', 'INC-004', 'INC-005'
] as const;

export const INCIDENT_RULE_NAMES: Readonly<Record<IncidentRuleCode, string>> = {
  'INC-001': 'No blame culture',
  'INC-002': 'Immediate logging (15 min)',
  'INC-003': 'Evidence preservation',
  'INC-004': 'Transparent communication',
  'INC-005': 'Mandatory post-mortem (MEDIUM+)'
} as const;

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

/** Rule violation entry */
export interface IncidentRuleViolation {
  readonly rule: IncidentRuleCode;
  readonly incident_id: string;
  readonly description: string;
  readonly severity: 'warning' | 'error';
}

/** Validation result */
export interface IncidentValidationResult {
  readonly valid: boolean;
  readonly incident_valid: boolean;
  readonly postmortem_valid: boolean;
  readonly rollback_valid: boolean;
  readonly rules_valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

// ─────────────────────────────────────────────────────────────
// REPORT
// ─────────────────────────────────────────────────────────────

/** Incident summary */
export interface IncidentSummary {
  readonly total_incidents: number;
  readonly by_severity: Readonly<Record<IncidentSeverity, number>>;
  readonly by_status: Readonly<Record<IncidentStatus, number>>;
  readonly postmortems_completed: number;
  readonly postmortems_pending: number;
  readonly rollbacks_executed: number;
  readonly sla_met_count: number;
  readonly sla_breached_count: number;
}

/**
 * Incident report - aggregates incident validations.
 *
 * INV-J-10: NON-ACTUATING (report only)
 */
export interface IncidentReport {
  readonly report_type: 'incident_report';
  readonly schema_version: '1.0.0';
  readonly report_id: string;
  readonly timestamp: string;
  readonly window: {
    readonly from: string;
    readonly to: string;
    readonly incidents_count: number;
  };
  readonly incidents: readonly IncidentEvent[];
  readonly postmortems: readonly PostMortem[];
  readonly rollback_plans: readonly RollbackPlan[];
  readonly validations: readonly {
    readonly incident_id: string;
    readonly validation: IncidentValidationResult;
  }[];
  readonly rule_violations: readonly IncidentRuleViolation[];
  readonly summary: IncidentSummary;
  readonly escalation_required: boolean;
  readonly escalation_target: string;
  readonly notes: string;
  readonly generated_at: string;
  readonly generator: string;
  readonly log_chain_prev_hash: string | null;
}

// ─────────────────────────────────────────────────────────────
// PIPELINE TYPES
// ─────────────────────────────────────────────────────────────

/** Pipeline arguments */
export interface IncidentPipelineArgs {
  readonly incidents: readonly IncidentEvent[];
  readonly postmortems?: readonly PostMortem[];
  readonly rollbackPlans?: readonly RollbackPlan[];
  readonly generatedAt?: string;
  readonly prevEventHash?: string;
}

// ─────────────────────────────────────────────────────────────
// INVARIANT NAMES
// ─────────────────────────────────────────────────────────────

/** Invariant names for Phase J */
export const INVARIANT_NAMES: Readonly<Record<string, string>> = {
  'INV-J-01': 'Incident classification valid',
  'INV-J-02': 'Timestamp required (within 15 min)',
  'INV-J-03': 'Evidence preservation',
  'INV-J-04': 'Mandatory post-mortem for MEDIUM+',
  'INV-J-05': 'Silence = violation',
  'INV-J-06': 'Rollback requires human decision',
  'INV-J-07': 'Rollback target must be verified stable',
  'INV-J-08': 'No blame in post-mortem',
  'INV-J-09': 'SLA compliance tracked',
  'INV-J-10': 'NON-ACTUATING (report only)'
} as const;
