/**
 * PHASE H — HUMAN OVERRIDE TYPE DEFINITIONS
 * Specification: HUMAN_OVERRIDE.md
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * All types for the Phase H human override system.
 * INV-H-01: 5 mandatory conditions (ALL required)
 * INV-H-02: Expiration enforced (max 90 days)
 * INV-H-03: Single approver required
 * INV-H-04: Hash chain maintained
 * INV-H-05: No cascade (override cannot authorize override)
 * INV-H-06: NON-ACTUATING (produces reports only)
 */

// ─────────────────────────────────────────────────────────────
// OVERRIDE TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Override types per HUMAN_OVERRIDE.md.
 * Hotfix: 7 days max
 * Exception: 30 days max
 * Dérogation: 90 days max
 */
export type OverrideType = 'hotfix' | 'exception' | 'derogation';

/** All valid override types (frozen for validation) */
export const OVERRIDE_TYPES: readonly OverrideType[] = [
  'hotfix', 'exception', 'derogation'
] as const;

/** Maximum duration per override type (in days) */
export const OVERRIDE_MAX_DAYS: Readonly<Record<OverrideType, number>> = {
  'hotfix': 7,
  'exception': 30,
  'derogation': 90
} as const;

// ─────────────────────────────────────────────────────────────
// OVERRIDE STATUS
// ─────────────────────────────────────────────────────────────

/** Override status */
export type OverrideStatus = 'active' | 'expired' | 'revoked' | 'invalid';

export const OVERRIDE_STATUSES: readonly OverrideStatus[] = [
  'active', 'expired', 'revoked', 'invalid'
] as const;

// ─────────────────────────────────────────────────────────────
// APPROVAL METHODS
// ─────────────────────────────────────────────────────────────

/** Approval methods per template */
export type ApprovalMethod = 'email' | 'signature' | 'meeting';

export const APPROVAL_METHODS: readonly ApprovalMethod[] = [
  'email', 'signature', 'meeting'
] as const;

// ─────────────────────────────────────────────────────────────
// OVERRIDE SCOPE
// ─────────────────────────────────────────────────────────────

/**
 * Scope of the override - what it applies to.
 */
export interface OverrideScope {
  readonly target_rule: string;
  readonly target_component: string;
  readonly target_verdict: string;
}

// ─────────────────────────────────────────────────────────────
// JUSTIFICATION (CONDITION 1)
// ─────────────────────────────────────────────────────────────

/**
 * Justification structure - CONDITION 1.
 * Must have explicit textual reason.
 */
export interface OverrideJustification {
  readonly reason: string;
  readonly impact_assessment: string;
  readonly alternatives_considered: readonly string[];
  readonly why_alternatives_rejected: string;
}

// ─────────────────────────────────────────────────────────────
// APPROVAL (CONDITION 2)
// ─────────────────────────────────────────────────────────────

/**
 * Approval structure - CONDITION 2.
 * Must have human signature (approver identity).
 */
export interface OverrideApproval {
  readonly approver: string;
  readonly approver_role: string;
  readonly approved_at: string;
  readonly approval_method: ApprovalMethod;
}

// ─────────────────────────────────────────────────────────────
// VALIDITY (CONDITION 3)
// ─────────────────────────────────────────────────────────────

/**
 * Validity structure - CONDITION 3.
 * Must have expiration defined (max 90 days).
 */
export interface OverrideValidity {
  readonly effective_from: string;
  readonly expires_at: string;
  readonly renewable: boolean;
  readonly max_renewals: number;
}

// ─────────────────────────────────────────────────────────────
// MANIFEST REFERENCE (CONDITION 5)
// ─────────────────────────────────────────────────────────────

/**
 * Manifest reference structure - CONDITION 5.
 * Links override to system state (git tag + manifest hash).
 */
export interface ManifestRef {
  readonly tag: string;
  readonly manifest_sha256: string;
}

// ─────────────────────────────────────────────────────────────
// OVERRIDE EVENT
// ─────────────────────────────────────────────────────────────

/**
 * Override event - full structure matching OVERRIDE.template.json.
 *
 * INV-H-01: All 5 conditions must be present:
 *   1. justification (reason field non-empty)
 *   2. approval (approver field non-empty)
 *   3. validity (expires_at defined, within max days)
 *   4. override_hash (SHA256 of content)
 *   5. manifest_ref (tag and manifest_sha256)
 *
 * INV-H-04: log_chain_prev_hash for audit trail.
 */
export interface OverrideEvent {
  readonly event_type: 'override_event';
  readonly schema_version: '1.0.0';
  readonly event_id: string;
  readonly timestamp: string;
  readonly override_id: string;
  readonly type: OverrideType;
  readonly scope: OverrideScope;
  readonly justification: OverrideJustification;
  readonly approval: OverrideApproval;
  readonly validity: OverrideValidity;
  readonly manifest_ref: ManifestRef;
  readonly override_hash: string;
  readonly log_chain_prev_hash: string | null;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION RESULT
// ─────────────────────────────────────────────────────────────

/**
 * Validation result with condition-level detail.
 */
export interface ConditionValidation {
  readonly condition: 1 | 2 | 3 | 4 | 5;
  readonly name: string;
  readonly valid: boolean;
  readonly error?: string;
}

/**
 * Full validation result for an override.
 */
export interface OverrideValidationResult {
  readonly valid: boolean;
  readonly conditions: readonly ConditionValidation[];
  readonly rule_violations: readonly string[];
  readonly errors: readonly string[];
}

// ─────────────────────────────────────────────────────────────
// OVERRIDE SUMMARY
// ─────────────────────────────────────────────────────────────

/**
 * Summary statistics for override report.
 */
export interface OverrideSummary {
  readonly total_overrides: number;
  readonly by_type: Readonly<Record<OverrideType, number>>;
  readonly by_status: Readonly<Record<OverrideStatus, number>>;
  readonly active_count: number;
  readonly expired_count: number;
  readonly expiring_soon_count: number;
  readonly invalid_count: number;
}

// ─────────────────────────────────────────────────────────────
// OVERRIDE REPORT
// ─────────────────────────────────────────────────────────────

/**
 * Override report - aggregates validation results.
 *
 * INV-H-06: NON-ACTUATING - report only, no enforcement.
 */
export interface OverrideReport {
  readonly report_type: 'override_report';
  readonly schema_version: '1.0.0';
  readonly report_id: string;
  readonly timestamp: string;
  readonly window: {
    readonly from: string;
    readonly to: string;
    readonly overrides_count: number;
  };
  readonly overrides: readonly OverrideEvent[];
  readonly validations: readonly {
    readonly override_id: string;
    readonly validation: OverrideValidationResult;
  }[];
  readonly summary: OverrideSummary;
  readonly rule_violations: readonly {
    readonly rule: string;
    readonly override_id: string;
    readonly description: string;
  }[];
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

/**
 * Pipeline arguments for override validation.
 */
export interface OverridePipelineArgs {
  readonly overrides: readonly OverrideEvent[];
  readonly existingOverrides?: readonly OverrideEvent[];
  readonly generatedAt?: string;
  readonly prevEventHash?: string;
}

// ─────────────────────────────────────────────────────────────
// CONDITION NAMES
// ─────────────────────────────────────────────────────────────

/** Human-readable condition names */
export const CONDITION_NAMES: Readonly<Record<1 | 2 | 3 | 4 | 5, string>> = {
  1: 'Justification written',
  2: 'Human signature',
  3: 'Expiration defined',
  4: 'Hash calculated',
  5: 'Manifest reference'
} as const;

// ─────────────────────────────────────────────────────────────
// RULE CODES
// ─────────────────────────────────────────────────────────────

/** Rule codes per HUMAN_OVERRIDE.md */
export type OverrideRuleCode = 'OVR-001' | 'OVR-002' | 'OVR-003' | 'OVR-004' | 'OVR-005';

export const OVERRIDE_RULES: readonly OverrideRuleCode[] = [
  'OVR-001', 'OVR-002', 'OVR-003', 'OVR-004', 'OVR-005'
] as const;

export const OVERRIDE_RULE_NAMES: Readonly<Record<OverrideRuleCode, string>> = {
  'OVR-001': 'No perpetual override',
  'OVR-002': 'Single approver',
  'OVR-003': 'Audit trail',
  'OVR-004': 'Review before renewal',
  'OVR-005': 'No cascade'
} as const;
