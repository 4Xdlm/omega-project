/**
 * DRIFT TYPE SPECIFICATIONS
 * Phase E-SPEC — Type definitions only (no implementation)
 *
 * INV-DRIFT-001: Detector MUST be read-only
 * INV-DRIFT-002: All thresholds from policy
 * INV-DRIFT-003: Detection MUST be deterministic
 */

// ─────────────────────────────────────────────────────────────
// DRIFT EVENT TYPES
// ─────────────────────────────────────────────────────────────

export type DriftType =
  | 'SCHEMA_MISMATCH'
  | 'HASH_DEVIATION'
  | 'INVARIANT_VIOLATION'
  | 'THRESHOLD_BREACH'
  | 'CHAIN_BREAK';

export type EscalationLevel = 'INFO' | 'WARNING' | 'CRITICAL' | 'HALT';

// ─────────────────────────────────────────────────────────────
// DRIFT EVENT STRUCTURE
// ─────────────────────────────────────────────────────────────

export interface DriftEvent {
  event_type: 'drift_event';
  schema_version: '1.0.0';
  event_id: string;
  timestamp: string; // ISO8601
  drift_type: DriftType;
  escalation: EscalationLevel;
  source: {
    file_path: string;
    expected_hash?: string;
    actual_hash?: string;
  };
  manifest_ref: {
    tag: string;
    manifest_sha256: string;
  };
  details: string;
  log_chain_prev_hash: string | null;
}

// ─────────────────────────────────────────────────────────────
// POLICY STRUCTURE
// ─────────────────────────────────────────────────────────────

export interface DriftPolicy {
  policy_id: string;
  schema_version: string;
  thresholds: {
    τ_drift_warning: number;
    τ_drift_critical: number;
    τ_drift_halt: number;
    τ_max_consecutive_drifts: number;
    τ_observation_window_ms: number;
  };
  drift_types: DriftType[];
  escalation_levels: Record<EscalationLevel, string>;
  invariants: string[];
}

// ─────────────────────────────────────────────────────────────
// DETECTION RESULT
// ─────────────────────────────────────────────────────────────

export interface DetectionResult {
  detected: boolean;
  events: DriftEvent[];
  summary: {
    total_checks: number;
    drifts_found: number;
    max_escalation: EscalationLevel | null;
  };
}

// ─────────────────────────────────────────────────────────────
// DETECTOR INTERFACE (contract only)
// ─────────────────────────────────────────────────────────────

export interface IDriftDetector {
  /**
   * Detect drift in a single artifact
   * INV-DRIFT-001: Read-only operation
   * INV-DRIFT-003: Deterministic
   */
  detectSingle(
    filePath: string,
    expectedHash: string,
    manifestRef: { tag: string; manifest_sha256: string }
  ): DriftEvent | null;

  /**
   * Detect drift across multiple artifacts
   * Returns aggregated result
   */
  detectBatch(
    artifacts: Array<{ path: string; expectedHash: string }>,
    manifestRef: { tag: string; manifest_sha256: string }
  ): DetectionResult;

  /**
   * Validate hash chain integrity
   * INV-DRIFT-004: Chain breaks escalate to HALT
   */
  validateChain(events: DriftEvent[]): DriftEvent | null;
}
