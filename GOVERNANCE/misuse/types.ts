/**
 * PHASE G — MISUSE CONTROL TYPE DEFINITIONS
 * Specification: ABUSE_CASES.md
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * All types for the Phase G misuse detection system.
 * INV-G-01: NON-ACTUATING (auto_action_taken always "none")
 * INV-G-02: requires_human_decision always true
 * INV-G-03: Zero side effects (pure functions)
 */

// ─────────────────────────────────────────────────────────────
// MISUSE CASE CODES
// ─────────────────────────────────────────────────────────────

/**
 * Misuse case codes per ABUSE_CASES.md.
 * CASE-001: Prompt Injection
 * CASE-002: Threshold Gaming
 * CASE-003: Override Abuse
 * CASE-004: Log Tampering
 * CASE-005: Replay Attack
 */
export type MisuseCaseCode =
  | 'CASE-001'
  | 'CASE-002'
  | 'CASE-003'
  | 'CASE-004'
  | 'CASE-005';

/** All valid case codes (frozen for validation) */
export const MISUSE_CASE_CODES: readonly MisuseCaseCode[] = [
  'CASE-001', 'CASE-002', 'CASE-003', 'CASE-004', 'CASE-005'
] as const;

/** Human-readable names for each case */
export const MISUSE_CASE_NAMES: Readonly<Record<MisuseCaseCode, string>> = {
  'CASE-001': 'Prompt Injection',
  'CASE-002': 'Threshold Gaming',
  'CASE-003': 'Override Abuse',
  'CASE-004': 'Log Tampering',
  'CASE-005': 'Replay Attack'
} as const;

// ─────────────────────────────────────────────────────────────
// SEVERITY LEVELS
// ─────────────────────────────────────────────────────────────

/** Severity levels per ABUSE_CASES.md */
export type MisuseSeverity = 'low' | 'medium' | 'high' | 'critical';

/** All valid severities (frozen for validation) */
export const MISUSE_SEVERITIES: readonly MisuseSeverity[] = [
  'low', 'medium', 'high', 'critical'
] as const;

/** Case-to-severity mapping per ABUSE_CASES.md */
export const CASE_SEVERITY_MAP: Readonly<Record<MisuseCaseCode, MisuseSeverity>> = {
  'CASE-001': 'high',      // Prompt Injection
  'CASE-002': 'medium',    // Threshold Gaming
  'CASE-003': 'medium',    // Override Abuse
  'CASE-004': 'critical',  // Log Tampering
  'CASE-005': 'high'       // Replay Attack
} as const;

// ─────────────────────────────────────────────────────────────
// DETECTION METHODS
// ─────────────────────────────────────────────────────────────

/** Detection methods per case */
export type DetectionMethod =
  | 'regex_pattern_match'
  | 'anomaly_scoring'
  | 'statistical_analysis'
  | 'threshold_proximity'
  | 'ratio_counting'
  | 'trend_analysis'
  | 'hash_chain_verification'
  | 'id_registry_check'
  | 'timestamp_validation';

export const DETECTION_METHODS: readonly DetectionMethod[] = [
  'regex_pattern_match', 'anomaly_scoring', 'statistical_analysis',
  'threshold_proximity', 'ratio_counting', 'trend_analysis',
  'hash_chain_verification', 'id_registry_check', 'timestamp_validation'
] as const;

// ─────────────────────────────────────────────────────────────
// AUTO-ACTION (ALWAYS "none" - NON-ACTUATING)
// ─────────────────────────────────────────────────────────────

/** Auto-action type - INV-G-01: Always "none" */
export type AutoAction = 'none';

/** The only valid auto-action value */
export const AUTO_ACTION_NONE: AutoAction = 'none' as const;

// ─────────────────────────────────────────────────────────────
// INPUT OBSERVATION TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Input event to be checked for misuse.
 */
export interface MisuseInputEvent {
  readonly event_id: string;
  readonly timestamp: string;
  readonly source: string;
  readonly run_id?: string;
  readonly inputs_hash?: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * Override record for CASE-003 detection.
 */
export interface OverrideRecord {
  readonly override_id: string;
  readonly timestamp: string;
  readonly decision_id: string;
  readonly approved_by: string;
  readonly reason: string;
}

/**
 * Decision record for CASE-003 detection.
 */
export interface DecisionRecord {
  readonly decision_id: string;
  readonly timestamp: string;
  readonly verdict: string;
  readonly was_overridden: boolean;
}

/**
 * Log entry for CASE-004 detection (hash chain).
 */
export interface LogChainEntry {
  readonly entry_id: string;
  readonly timestamp: string;
  readonly content_hash: string;
  readonly prev_hash: string | null;
}

/**
 * Event registry for CASE-005 detection.
 */
export interface EventRegistry {
  readonly known_event_ids: readonly string[];
  readonly min_valid_timestamp: string;
}

/**
 * Threshold history entry for CASE-002 detection.
 */
export interface ThresholdHistoryEntry {
  readonly timestamp: string;
  readonly value: number;
  readonly threshold: number;
}

/**
 * Observation sources for misuse detection.
 */
export interface MisuseObservationSources {
  readonly inputEvents: readonly MisuseInputEvent[];
  readonly overrideRecords?: readonly OverrideRecord[];
  readonly decisionRecords?: readonly DecisionRecord[];
  readonly logChain?: readonly LogChainEntry[];
  readonly eventRegistry?: EventRegistry;
  readonly thresholdHistory?: readonly ThresholdHistoryEntry[];
}

// ─────────────────────────────────────────────────────────────
// MISUSE PATTERN
// ─────────────────────────────────────────────────────────────

/**
 * Known pattern definition for a misuse case.
 */
export interface MisusePattern {
  readonly pattern_id: string;
  readonly case_id: MisuseCaseCode;
  readonly name: string;
  readonly regex?: string;
  readonly description: string;
}

/** Predefined patterns for CASE-001 Prompt Injection */
export const PROMPT_INJECTION_PATTERNS: readonly MisusePattern[] = [
  {
    pattern_id: 'PI-001',
    case_id: 'CASE-001',
    name: 'SQL Injection',
    regex: "';\\s*(?:DROP|DELETE|INSERT|UPDATE|SELECT)\\s",
    description: 'SQL injection attempt with semicolon escape'
  },
  {
    pattern_id: 'PI-002',
    case_id: 'CASE-001',
    name: 'Script Tag Injection',
    regex: '<script[^>]*>',
    description: 'HTML script tag injection attempt'
  },
  {
    pattern_id: 'PI-003',
    case_id: 'CASE-001',
    name: 'Null Byte Injection',
    regex: '\\x00|%00',
    description: 'Null byte injection attempt'
  },
  {
    pattern_id: 'PI-004',
    case_id: 'CASE-001',
    name: 'Command Injection',
    regex: ';\\s*(?:rm|cat|ls|wget|curl)\\s',
    description: 'Shell command injection attempt'
  },
  {
    pattern_id: 'PI-005',
    case_id: 'CASE-001',
    name: 'Path Traversal',
    regex: '\\.\\.\\/|\\.\\.\\\\',
    description: 'Path traversal attempt'
  }
] as const;

// ─────────────────────────────────────────────────────────────
// EVIDENCE
// ─────────────────────────────────────────────────────────────

/**
 * Evidence structure for a misuse event.
 */
export interface MisuseEvidence {
  readonly description: string;
  readonly samples: readonly string[];
  readonly evidence_refs: readonly string[];
}

// ─────────────────────────────────────────────────────────────
// RECOMMENDED ACTION
// ─────────────────────────────────────────────────────────────

/** Recommended action types */
export type RecommendedActionType = 'investigate' | 'block' | 'allow' | 'escalate';

/**
 * Recommended action for human review.
 */
export interface RecommendedAction {
  readonly action: RecommendedActionType;
  readonly rationale: string;
}

// ─────────────────────────────────────────────────────────────
// MISUSE EVENT (RESULT)
// ─────────────────────────────────────────────────────────────

/**
 * Misuse event result from a detector.
 * Matches MISUSE_EVENT.template.json schema.
 *
 * INV-G-01: auto_action_taken is always "none"
 * INV-G-02: requires_human_decision is always true
 */
export interface MisuseEvent {
  readonly event_type: 'misuse_event';
  readonly schema_version: '1.0.0';
  readonly event_id: string;
  readonly timestamp: string;
  readonly case_id: MisuseCaseCode;
  readonly pattern_id: string;
  readonly severity: MisuseSeverity;
  readonly detection_method: DetectionMethod;
  readonly context: {
    readonly source: string;
    readonly run_id?: string;
    readonly inputs_hash?: string;
  };
  readonly evidence: MisuseEvidence;
  readonly auto_action_taken: AutoAction;
  readonly requires_human_decision: true;
  readonly recommended_actions: readonly RecommendedAction[];
  readonly log_chain_prev_hash: string | null;
}

// ─────────────────────────────────────────────────────────────
// MISUSE REPORT
// ─────────────────────────────────────────────────────────────

/**
 * Summary statistics for the misuse report.
 */
export interface MisuseSummary {
  readonly events_checked: number;
  readonly misuse_events_detected: number;
  readonly by_case: Readonly<Record<MisuseCaseCode, number>>;
  readonly by_severity: Readonly<Record<MisuseSeverity, number>>;
  readonly highest_severity: MisuseSeverity | null;
}

/**
 * Full MISUSE_REPORT structure.
 * INV-G-01: NON-ACTUATING (auto_action_taken always "none")
 * INV-G-02: requires_human_decision always true
 * INV-G-03: Zero side effects (report is data-only)
 */
export interface MisuseReport {
  readonly report_type: 'misuse_report';
  readonly schema_version: '1.0.0';
  readonly report_id: string;
  readonly timestamp: string;
  readonly window: {
    readonly from: string;
    readonly to: string;
    readonly events_count: number;
  };
  readonly misuse_events: readonly MisuseEvent[];
  readonly summary: MisuseSummary;
  readonly escalation_required: boolean;
  readonly escalation_target: string;
  readonly notes: string;
  readonly generated_at: string;
  readonly generator: string;
  readonly log_chain_prev_hash: string | null;
}

// ─────────────────────────────────────────────────────────────
// DETECTOR CONTRACT
// ─────────────────────────────────────────────────────────────

/**
 * Detector function signature.
 * Every detector MUST be a pure function matching this type.
 * INV-G-03: No side effects.
 */
export type MisuseDetectorFn = (
  observations: MisuseObservationSources,
  prevHash: string | null
) => readonly MisuseEvent[];

// ─────────────────────────────────────────────────────────────
// PIPELINE TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Pipeline arguments for misuse detection.
 */
export interface MisusePipelineArgs {
  readonly observations: MisuseObservationSources;
  readonly generatedAt?: string;
  readonly prevEventHash?: string;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * Validation result structure.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}
