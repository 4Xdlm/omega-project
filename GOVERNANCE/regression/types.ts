/**
 * PHASE F — NON-REGRESSION TYPE DEFINITIONS
 * Specification: NON_REGRESSION.md + HANDOFF_INSTRUCTION.md
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * All types for the Phase F non-regression system.
 * INV-REGR-001: Snapshot immutability
 * INV-REGR-002: Backward compatibility default
 * INV-REGR-003: Breaking change explicit
 * INV-REGR-004: WAIVER human-signed
 * INV-REGR-005: Regression test mandatory
 */

// ─────────────────────────────────────────────────────────────
// REGRESSION STATUS CODES
// ─────────────────────────────────────────────────────────────

/** Regression check result status */
export type RegressionStatus = 'PASS' | 'FAIL' | 'WAIVED';

/** All valid regression statuses (frozen for validation) */
export const REGRESSION_STATUSES: readonly RegressionStatus[] = [
  'PASS', 'FAIL', 'WAIVED'
] as const;

/** Waiver status values */
export type WaiverStatus = 'ACTIVE' | 'EXPIRED' | 'PENDING';

/** All valid waiver statuses */
export const WAIVER_STATUSES: readonly WaiverStatus[] = [
  'ACTIVE', 'EXPIRED', 'PENDING'
] as const;

/** Baseline seal status */
export type SealStatus = 'SEALED' | 'PENDING' | 'UNKNOWN';

/** All valid seal statuses */
export const SEAL_STATUSES: readonly SealStatus[] = [
  'SEALED', 'PENDING', 'UNKNOWN'
] as const;

// ─────────────────────────────────────────────────────────────
// REGRESSION TYPES
// ─────────────────────────────────────────────────────────────

/** Types of regression that can be detected */
export type RegressionType =
  | 'TEST_COUNT_DECREASE'
  | 'TEST_FAILURE_INCREASE'
  | 'ASSERTION_COUNT_DECREASE'
  | 'OUTPUT_HASH_MISMATCH'
  | 'DURATION_REGRESSION'
  | 'API_COMPATIBILITY_BREAK';

/** All valid regression types (frozen for validation) */
export const REGRESSION_TYPES: readonly RegressionType[] = [
  'TEST_COUNT_DECREASE',
  'TEST_FAILURE_INCREASE',
  'ASSERTION_COUNT_DECREASE',
  'OUTPUT_HASH_MISMATCH',
  'DURATION_REGRESSION',
  'API_COMPATIBILITY_BREAK'
] as const;

/** Human-readable names for regression types */
export const REGRESSION_TYPE_NAMES: Readonly<Record<RegressionType, string>> = {
  'TEST_COUNT_DECREASE': 'Test Count Decrease',
  'TEST_FAILURE_INCREASE': 'Test Failure Increase',
  'ASSERTION_COUNT_DECREASE': 'Assertion Count Decrease',
  'OUTPUT_HASH_MISMATCH': 'Output Hash Mismatch',
  'DURATION_REGRESSION': 'Duration Regression',
  'API_COMPATIBILITY_BREAK': 'API Compatibility Break'
} as const;

/** Severity levels for regression findings */
export type RegressionSeverity = 'critical' | 'major' | 'minor';

/** All valid severity levels */
export const REGRESSION_SEVERITIES: readonly RegressionSeverity[] = [
  'critical', 'major', 'minor'
] as const;

// ─────────────────────────────────────────────────────────────
// BASELINE TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Test results snapshot from a sealed version.
 */
export interface BaselineTestResults {
  readonly total_tests: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly duration_ms: number;
  readonly assertions_count: number;
  readonly output_hash: string;
  readonly test_files: readonly string[];
}

/**
 * Sealed baseline snapshot.
 * INV-REGR-001: Immutable once created.
 */
export interface SealedBaseline {
  readonly baseline_id: string;
  readonly version: string;
  readonly commit: string;
  readonly tag: string;
  readonly sealed_at: string;
  readonly manifest_sha256: string;
  readonly test_results: BaselineTestResults;
  readonly proof_ref: string;
  readonly seal_status: SealStatus;
}

/**
 * Candidate version under test.
 */
export interface CandidateVersion {
  readonly version: string;
  readonly commit: string;
  readonly branch: string;
  readonly test_results: BaselineTestResults;
}

// ─────────────────────────────────────────────────────────────
// WAIVER TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Regression waiver record.
 * INV-REGR-004: Must be human-signed (approved_by required).
 */
export interface RegressionWaiver {
  readonly waiver_id: string;
  readonly baseline_id: string;
  readonly gap_id: string;
  readonly severity: RegressionSeverity;
  readonly status: WaiverStatus;
  readonly approved_by: string;
  readonly approved_at: string;
  readonly reason: string;
  readonly scope_limitations: readonly string[];
  readonly expires_on_phase: string;
  readonly proof_ref: string;
  readonly hash_sha256: string;
}

/**
 * Waiver registry state.
 */
export interface WaiverRegistryState {
  readonly waivers: readonly RegressionWaiver[];
  readonly active_count: number;
  readonly expired_count: number;
  readonly pending_count: number;
}

// ─────────────────────────────────────────────────────────────
// REGRESSION RESULT TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Individual regression finding.
 */
export interface RegressionFinding {
  readonly finding_id: string;
  readonly type: RegressionType;
  readonly description: string;
  readonly baseline_value: string;
  readonly observed_value: string;
  readonly severity: RegressionSeverity;
  readonly evidence: readonly string[];
}

/**
 * Single regression check result.
 */
export interface RegressionCheckResult {
  readonly check_id: string;
  readonly baseline_id: string;
  readonly baseline_version: string;
  readonly candidate_version: string;
  readonly status: RegressionStatus;
  readonly tests_total: number;
  readonly tests_passed: number;
  readonly tests_failed: number;
  readonly tests_waived: number;
  readonly regressions_detected: readonly RegressionFinding[];
  readonly waiver_refs: readonly string[];
  readonly failure_refs: readonly string[];
}

// ─────────────────────────────────────────────────────────────
// REGRESSION MATRIX
// ─────────────────────────────────────────────────────────────

/**
 * Summary statistics for the regression matrix.
 */
export interface RegressionSummary {
  readonly baselines_checked: number;
  readonly total_checks: number;
  readonly passed: number;
  readonly failed: number;
  readonly waived: number;
  readonly regressions_found: number;
  readonly critical_regressions: number;
}

/**
 * Full regression matrix report.
 * Matches templates/regression/REGRESSION_MATRIX.template.json
 */
export interface RegressionMatrix {
  readonly event_type: 'regression_result';
  readonly schema_version: '1.0.0';
  readonly event_id: string;
  readonly timestamp: string;
  readonly candidate_ref: CandidateVersion;
  readonly entries: readonly RegressionCheckResult[];
  readonly overall_status: RegressionStatus;
  readonly requires_human_decision: boolean;
  readonly log_chain_prev_hash: string | null;
  readonly summary: RegressionSummary;
  readonly notes: string;
  readonly generated_at: string;
  readonly generator: string;
}

// ─────────────────────────────────────────────────────────────
// PIPELINE TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Pipeline arguments for regression check.
 */
export interface RegressionPipelineArgs {
  readonly baselines: readonly SealedBaseline[];
  readonly candidate: CandidateVersion;
  readonly waivers: readonly RegressionWaiver[];
  readonly generatedAt?: string;
  readonly prevEventHash?: string;
}

/**
 * Regression checker function signature.
 * Pure function matching Phase E detector pattern.
 */
export type RegressionCheckerFn = (
  baseline: SealedBaseline,
  candidate: CandidateVersion,
  waivers: readonly RegressionWaiver[]
) => RegressionCheckResult;

// ─────────────────────────────────────────────────────────────
// VALIDATION TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Validation result structure.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}
