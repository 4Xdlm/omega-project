/**
 * PHASE E — DRIFT DETECTION TYPE DEFINITIONS
 * Specification: PHASE_E_SPECIFICATION v1.2 (FUSION)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * All types for the Phase E drift detection system.
 * INV-E-01: Read-only (no BUILD code access)
 * INV-E-02: Zero side effects
 */

// ─────────────────────────────────────────────────────────────
// DRIFT TAXONOMY (8 TYPES)
// ─────────────────────────────────────────────────────────────

/**
 * Drift type codes per spec taxonomy.
 * D-S=Semantic, D-O=Output, D-F=Format, D-T=Temporal,
 * D-P=Performance, D-V=Variance, D-TL=Tooling, D-C=Contract
 */
export type DriftTypeCode =
  | 'D-S'
  | 'D-O'
  | 'D-F'
  | 'D-T'
  | 'D-P'
  | 'D-V'
  | 'D-TL'
  | 'D-C';

/** All valid drift type codes (frozen array for validation) */
export const DRIFT_TYPE_CODES: readonly DriftTypeCode[] = [
  'D-S', 'D-O', 'D-F', 'D-T', 'D-P', 'D-V', 'D-TL', 'D-C'
] as const;

/** Human-readable names for each drift type */
export const DRIFT_TYPE_NAMES: Readonly<Record<DriftTypeCode, string>> = {
  'D-S': 'Semantic',
  'D-O': 'Output',
  'D-F': 'Format',
  'D-T': 'Temporal',
  'D-P': 'Performance',
  'D-V': 'Variance',
  'D-TL': 'Tooling',
  'D-C': 'Contract'
} as const;

// ─────────────────────────────────────────────────────────────
// CLASSIFICATION
// ─────────────────────────────────────────────────────────────

/**
 * Drift classification levels.
 * Note: INCIDENT is NOT a drift — it is invariant violation (RUNBOOK only).
 * INV-E-10: Phase E cannot trigger INCIDENT.
 */
export type DriftClassification = 'STABLE' | 'INFO' | 'WARNING' | 'CRITICAL';

/** All valid classifications (frozen array for validation) */
export const DRIFT_CLASSIFICATIONS: readonly DriftClassification[] = [
  'STABLE', 'INFO', 'WARNING', 'CRITICAL'
] as const;

// ─────────────────────────────────────────────────────────────
// OBSERVATION SOURCES (from Phase D)
// ─────────────────────────────────────────────────────────────

/**
 * Runtime event from Phase D.
 * Matches GOVERNANCE/runtime/RUNTIME_EVENT.schema.json
 */
export interface RuntimeEvent {
  readonly event_id: string;
  readonly timestamp_utc: string;
  readonly phase: 'D';
  readonly source?: string;
  readonly build_ref: {
    readonly commit: string;
    readonly tag: string;
  };
  readonly operation: string;
  readonly input_hash: string;
  readonly output_hash: string;
  readonly verdict: 'PASS' | 'FAIL' | 'DRIFT' | 'TOOLING_DRIFT' | 'INCIDENT';
  readonly notes?: string;
}

/**
 * Snapshot from Phase D.
 * Matches GOVERNANCE/runtime/SNAPSHOT/*.json
 */
export interface Snapshot {
  readonly snapshot_id: string;
  readonly timestamp_utc: string;
  readonly baseline_ref: string;
  readonly last_event_id: string;
  readonly events_count_total: number;
  readonly anomalies: {
    readonly tooling_drift: number;
    readonly product_drift: number;
    readonly incidents: number;
  };
  readonly status: string;
  readonly notes?: string;
}

/**
 * Governance log entry from GOVERNANCE_LOG.ndjson.
 * Flexible structure with known optional fields.
 */
export interface GovernanceLogEntry {
  readonly event_id?: string;
  readonly timestamp_utc: string;
  readonly event?: string;
  readonly verdict?: string;
  readonly output_hash?: string;
  readonly classification?: string;
  readonly anomalies_count?: number;
  readonly [key: string]: unknown;
}

/**
 * Observation sources in strict priority order (per spec).
 * 1. Snapshots (HIGHEST)
 * 2. Governance log entries
 * 3. Runtime events
 */
export interface ObservationSources {
  readonly snapshots: readonly Snapshot[];
  readonly logEntries: readonly GovernanceLogEntry[];
  readonly runtimeEvents: readonly RuntimeEvent[];
}

// ─────────────────────────────────────────────────────────────
// BASELINE
// ─────────────────────────────────────────────────────────────

/** Certified baseline reference */
export interface Baseline {
  readonly sha256: string;
  readonly commit: string;
  readonly tag: string;
  readonly scope: string;
}

// ─────────────────────────────────────────────────────────────
// DRIFT RESULT
// ─────────────────────────────────────────────────────────────

/**
 * Individual drift finding from a detector.
 * INV-E-07: human_justification mandatory when score >= 2 (WARNING).
 */
export interface DriftResult {
  readonly drift_id: string;
  readonly type: DriftTypeCode;
  readonly description: string;
  readonly impact: number;
  readonly confidence: number;
  readonly persistence: number;
  readonly score: number;
  readonly classification: DriftClassification;
  readonly human_justification: string;
  readonly evidence: readonly string[];
  readonly baseline_value: string;
  readonly observed_value: string;
  readonly deviation: string;
}

// ─────────────────────────────────────────────────────────────
// DRIFT REPORT
// ─────────────────────────────────────────────────────────────

/**
 * Full DRIFT_REPORT.json as defined in spec.
 * INV-E-06: Non-actuating (informational artifact only).
 * INV-E-08: trigger_events must be non-empty.
 */
export interface DriftReport {
  readonly report_id: string;
  readonly version: '1.0';
  readonly baseline_ref: string;
  readonly window: {
    readonly from: string;
    readonly to: string;
    readonly event_count: number;
  };
  readonly trigger_events: readonly string[];
  readonly detected_drifts: readonly DriftResult[];
  readonly summary: {
    readonly total_drifts: number;
    readonly by_classification: Readonly<Record<DriftClassification, number>>;
    readonly highest_score: number;
  };
  readonly recommendation: string;
  readonly escalation_target: string;
  readonly notes: string;
  readonly generated_at: string;
  readonly generator: string;
}

// ─────────────────────────────────────────────────────────────
// DETECTOR CONTRACT
// ─────────────────────────────────────────────────────────────

/**
 * Detector function signature.
 * Every detector MUST be a pure function matching this type.
 * INV-E-01: Accepts data only (no file paths to BUILD).
 * INV-E-02: No side effects.
 */
export type DriftDetectorFn = (
  observations: ObservationSources,
  baseline: Baseline
) => DriftResult | null;

// ─────────────────────────────────────────────────────────────
// SCORING PARAMETERS (from spec typical values)
// ─────────────────────────────────────────────────────────────

/** Default scoring parameters per drift type */
export const DRIFT_SCORING_DEFAULTS: Readonly<Record<DriftTypeCode, {
  readonly impactRange: readonly [number, number];
  readonly confidenceMin: number;
  readonly persistenceMin: number;
}>> = {
  'D-S':  { impactRange: [4, 5], confidenceMin: 0.8, persistenceMin: 2 },
  'D-O':  { impactRange: [3, 5], confidenceMin: 0.9, persistenceMin: 1 },
  'D-F':  { impactRange: [3, 4], confidenceMin: 0.9, persistenceMin: 1 },
  'D-T':  { impactRange: [2, 3], confidenceMin: 0.6, persistenceMin: 3 },
  'D-P':  { impactRange: [2, 4], confidenceMin: 0.7, persistenceMin: 2 },
  'D-V':  { impactRange: [2, 3], confidenceMin: 0.5, persistenceMin: 3 },
  'D-TL': { impactRange: [1, 2], confidenceMin: 0.8, persistenceMin: 1 },
  'D-C':  { impactRange: [3, 4], confidenceMin: 0.9, persistenceMin: 1 }
} as const;
