/**
 * PHASE I — VERSIONING & COMPATIBILITY TYPE DEFINITIONS
 * Specification: VERSIONING_CONTRACT.md
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * All types for the Phase I versioning system.
 *
 * INV-I-01: Semantic version format valid
 * INV-I-02: MAJOR bump required for breaking changes
 * INV-I-03: Backward compatible by default
 * INV-I-04: Schema stability (VER-001)
 * INV-I-05: API stability (VER-002)
 * INV-I-06: Migration path required (VER-003)
 * INV-I-07: Deprecation cycle enforced (VER-004)
 * INV-I-08: Changelog mandatory (VER-005)
 * INV-I-09: Downgrade prevention
 * INV-I-10: NON-ACTUATING (report only)
 */

// ─────────────────────────────────────────────────────────────
// SEMANTIC VERSION
// ─────────────────────────────────────────────────────────────

/**
 * Semantic version structure.
 * Format: MAJOR.MINOR.PATCH
 */
export interface SemanticVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease?: string;
  readonly build?: string;
}

/**
 * Version bump type.
 */
export type BumpType = 'major' | 'minor' | 'patch';

export const BUMP_TYPES: readonly BumpType[] = [
  'major', 'minor', 'patch'
] as const;

// ─────────────────────────────────────────────────────────────
// COMPATIBILITY TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Compatibility type.
 */
export type CompatibilityType = 'backward' | 'breaking';

export const COMPATIBILITY_TYPES: readonly CompatibilityType[] = [
  'backward', 'breaking'
] as const;

/**
 * Compatibility status for version transition.
 */
export interface CompatibilityStatus {
  readonly type: CompatibilityType;
  readonly backward_compatible: boolean;
  readonly data_compatible: boolean;
  readonly api_compatible: boolean;
  readonly schema_compatible: boolean;
}

// ─────────────────────────────────────────────────────────────
// BREAKING CHANGE TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Type of breaking change.
 */
export type BreakingChangeType = 'api' | 'schema' | 'behavior' | 'removal';

export const BREAKING_CHANGE_TYPES: readonly BreakingChangeType[] = [
  'api', 'schema', 'behavior', 'removal'
] as const;

/**
 * Breaking change entry.
 */
export interface BreakingChange {
  readonly component: string;
  readonly change_type: BreakingChangeType;
  readonly description: string;
  readonly migration_required: boolean;
  readonly migration_doc_ref: string | null;
}

// ─────────────────────────────────────────────────────────────
// DEPRECATION TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Deprecation entry.
 * VER-004: Deprecation → Warning 2 MINOR versions → Removal at next MAJOR
 */
export interface Deprecation {
  readonly component: string;
  readonly deprecated_in: string;
  readonly removal_planned: string;
  readonly replacement: string | null;
  readonly warning_count: number;
}

// ─────────────────────────────────────────────────────────────
// MIGRATION TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Migration effort level.
 */
export type MigrationEffort = 'low' | 'medium' | 'high';

export const MIGRATION_EFFORTS: readonly MigrationEffort[] = [
  'low', 'medium', 'high'
] as const;

/**
 * Migration path for version transition.
 */
export interface MigrationPath {
  readonly from_version: string;
  readonly to_version: string;
  readonly script_ref: string | null;
  readonly manual_steps: readonly string[];
  readonly estimated_effort: MigrationEffort;
  readonly data_migration_required: boolean;
}

// ─────────────────────────────────────────────────────────────
// VERSION CONTRACT EVENT
// ─────────────────────────────────────────────────────────────

/**
 * Version contract event - matches VERSION_CONTRACT.template.json.
 */
export interface VersionContractEvent {
  readonly event_type: 'version_contract_event';
  readonly schema_version: '1.0.0';
  readonly event_id: string;
  readonly timestamp: string;
  readonly version: {
    readonly current: string;
    readonly previous: string;
    readonly bump_type: BumpType;
  };
  readonly compatibility: CompatibilityStatus;
  readonly breaking_changes: readonly BreakingChange[];
  readonly deprecations: readonly Deprecation[];
  readonly migration_path: MigrationPath | null;
  readonly changelog_ref: string | null;
  readonly log_chain_prev_hash: string | null;
}

// ─────────────────────────────────────────────────────────────
// RULE CODES
// ─────────────────────────────────────────────────────────────

/**
 * Version rule codes per VERSIONING_CONTRACT.md.
 */
export type VersionRuleCode = 'VER-001' | 'VER-002' | 'VER-003' | 'VER-004' | 'VER-005';

export const VERSION_RULES: readonly VersionRuleCode[] = [
  'VER-001', 'VER-002', 'VER-003', 'VER-004', 'VER-005'
] as const;

export const VERSION_RULE_NAMES: Readonly<Record<VersionRuleCode, string>> = {
  'VER-001': 'Schema stability',
  'VER-002': 'API stability',
  'VER-003': 'Data migration',
  'VER-004': 'Deprecation cycle',
  'VER-005': 'Changelog mandatory'
} as const;

// ─────────────────────────────────────────────────────────────
// RULE VIOLATION
// ─────────────────────────────────────────────────────────────

/**
 * Rule violation entry.
 */
export interface VersionRuleViolation {
  readonly rule: VersionRuleCode;
  readonly component: string;
  readonly description: string;
  readonly severity: 'warning' | 'error';
}

// ─────────────────────────────────────────────────────────────
// VALIDATION RESULT
// ─────────────────────────────────────────────────────────────

/**
 * Version validation result.
 */
export interface VersionValidationResult {
  readonly valid: boolean;
  readonly semver_valid: boolean;
  readonly bump_valid: boolean;
  readonly compatibility_valid: boolean;
  readonly rules_valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

// ─────────────────────────────────────────────────────────────
// COMPATIBILITY MATRIX
// ─────────────────────────────────────────────────────────────

/**
 * Compatibility matrix cell.
 */
export type CompatibilityCellStatus = 'compatible' | 'partial' | 'incompatible' | 'migration_required';

export const COMPATIBILITY_CELL_STATUSES: readonly CompatibilityCellStatus[] = [
  'compatible', 'partial', 'incompatible', 'migration_required'
] as const;

/**
 * Compatibility matrix entry.
 */
export interface CompatibilityMatrixEntry {
  readonly from_version: string;
  readonly to_version: string;
  readonly status: CompatibilityCellStatus;
  readonly notes: string;
}

/**
 * Full compatibility matrix.
 */
export interface CompatibilityMatrix {
  readonly versions: readonly string[];
  readonly entries: readonly CompatibilityMatrixEntry[];
}

// ─────────────────────────────────────────────────────────────
// VERSION SUMMARY
// ─────────────────────────────────────────────────────────────

/**
 * Summary statistics for version report.
 */
export interface VersionSummary {
  readonly total_events: number;
  readonly by_bump_type: Readonly<Record<BumpType, number>>;
  readonly breaking_changes_count: number;
  readonly deprecations_count: number;
  readonly migrations_required: number;
  readonly rule_violations_count: number;
}

// ─────────────────────────────────────────────────────────────
// VERSION REPORT
// ─────────────────────────────────────────────────────────────

/**
 * Version report - aggregates version contract validations.
 *
 * INV-I-10: NON-ACTUATING (report only)
 */
export interface VersionReport {
  readonly report_type: 'version_report';
  readonly schema_version: '1.0.0';
  readonly report_id: string;
  readonly timestamp: string;
  readonly window: {
    readonly from: string;
    readonly to: string;
    readonly events_count: number;
  };
  readonly version_events: readonly VersionContractEvent[];
  readonly validations: readonly {
    readonly event_id: string;
    readonly validation: VersionValidationResult;
  }[];
  readonly compatibility_matrix: CompatibilityMatrix;
  readonly rule_violations: readonly VersionRuleViolation[];
  readonly summary: VersionSummary;
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
 * Pipeline arguments for version validation.
 */
export interface VersionPipelineArgs {
  readonly events: readonly VersionContractEvent[];
  readonly existingVersions?: readonly string[];
  readonly generatedAt?: string;
  readonly prevEventHash?: string;
}

// ─────────────────────────────────────────────────────────────
// INVARIANT NAMES
// ─────────────────────────────────────────────────────────────

/** Invariant names for Phase I */
export const INVARIANT_NAMES: Readonly<Record<string, string>> = {
  'INV-I-01': 'Semantic version format valid',
  'INV-I-02': 'MAJOR bump required for breaking changes',
  'INV-I-03': 'Backward compatible by default',
  'INV-I-04': 'Schema stability (VER-001)',
  'INV-I-05': 'API stability (VER-002)',
  'INV-I-06': 'Migration path required (VER-003)',
  'INV-I-07': 'Deprecation cycle enforced (VER-004)',
  'INV-I-08': 'Changelog mandatory (VER-005)',
  'INV-I-09': 'Downgrade prevention',
  'INV-I-10': 'NON-ACTUATING (report only)'
} as const;
