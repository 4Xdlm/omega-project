/**
 * WAIVER REGISTRY — Manage regression waivers (READ-ONLY)
 *
 * INV-REGR-003: Breaking change explicit
 * INV-REGR-004: WAIVER human-signed
 *
 * This module is NON-ACTUATING. It reads waiver data only.
 */

import type {
  RegressionWaiver,
  WaiverRegistryState,
  WaiverStatus,
  ValidationResult
} from './types.js';

// ─────────────────────────────────────────────────────────────
// REGISTRY FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Create waiver registry state from array of waivers.
 * Pure function - no I/O.
 * @param waivers - Array of regression waivers
 * @param sealedPhases - Set of phase names that are sealed (for expiration check)
 * @returns Waiver registry state with counts
 */
export function createWaiverRegistry(
  waivers: readonly RegressionWaiver[],
  sealedPhases: ReadonlySet<string>
): WaiverRegistryState {
  // Recalculate status based on sealed phases
  const processedWaivers: RegressionWaiver[] = waivers.map(waiver => ({
    ...waiver,
    status: determineWaiverStatus(waiver, sealedPhases)
  }));

  const active = processedWaivers.filter(w => w.status === 'ACTIVE').length;
  const expired = processedWaivers.filter(w => w.status === 'EXPIRED').length;
  const pending = processedWaivers.filter(w => w.status === 'PENDING').length;

  return {
    waivers: processedWaivers,
    active_count: active,
    expired_count: expired,
    pending_count: pending
  };
}

/**
 * Get all active waivers (not expired).
 * @param state - Waiver registry state
 * @returns Array of active waivers
 */
export function getActiveWaivers(
  state: WaiverRegistryState
): readonly RegressionWaiver[] {
  return state.waivers.filter(w => w.status === 'ACTIVE');
}

/**
 * Find waivers applicable to a specific baseline.
 * @param state - Waiver registry state
 * @param baselineId - Baseline ID to match
 * @returns Array of matching waivers
 */
export function findWaiversForBaseline(
  state: WaiverRegistryState,
  baselineId: string
): readonly RegressionWaiver[] {
  return state.waivers.filter(w =>
    w.baseline_id === baselineId && w.status === 'ACTIVE'
  );
}

/**
 * Check if a specific gap is waived for a baseline.
 * @param state - Waiver registry state
 * @param baselineId - Baseline ID
 * @param gapId - Gap ID to check
 * @returns Waiver if gap is waived, null otherwise
 */
export function isGapWaived(
  state: WaiverRegistryState,
  baselineId: string,
  gapId: string
): RegressionWaiver | null {
  const matching = state.waivers.find(w =>
    w.baseline_id === baselineId &&
    w.gap_id === gapId &&
    w.status === 'ACTIVE'
  );

  return matching ?? null;
}

/**
 * Check if a regression type is waived for a baseline.
 * @param state - Waiver registry state
 * @param baselineId - Baseline ID
 * @param regressionType - Regression type to check
 * @returns Waiver if type is waived, null otherwise
 */
export function isRegressionTypeWaived(
  state: WaiverRegistryState,
  baselineId: string,
  regressionType: string
): RegressionWaiver | null {
  // Gap ID format: GAP-{REGRESSION_TYPE}
  const gapId = `GAP-${regressionType}`;
  return isGapWaived(state, baselineId, gapId);
}

// ─────────────────────────────────────────────────────────────
// WAIVER STATUS
// ─────────────────────────────────────────────────────────────

/**
 * Determine waiver status based on phase seal state.
 * INV-REGR-004: Expiration is FACTUAL (phase sealed check).
 * @param waiver - Waiver to check
 * @param sealedPhases - Set of sealed phase names
 * @returns Current waiver status
 */
export function determineWaiverStatus(
  waiver: RegressionWaiver,
  sealedPhases: ReadonlySet<string>
): WaiverStatus {
  // If the phase this waiver expires on is sealed, waiver is expired
  const expiresPhase = waiver.expires_on_phase.toUpperCase();

  // Check various formats: "C", "PHASE C", "phase-c-sealed"
  const normalizedPhase = expiresPhase
    .replace('PHASE ', '')
    .replace('PHASE-', '')
    .replace('-SEALED', '');

  for (const sealed of sealedPhases) {
    const normalizedSealed = sealed.toUpperCase()
      .replace('PHASE ', '')
      .replace('PHASE-', '')
      .replace('-SEALED', '');

    if (normalizedPhase === normalizedSealed) {
      return 'EXPIRED';
    }
  }

  // Check if waiver has required approval
  if (!waiver.approved_by || waiver.approved_by.trim() === '') {
    return 'PENDING';
  }

  return 'ACTIVE';
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * Validate a waiver structure.
 * INV-REGR-004: Must have approved_by (human-signed).
 * @param waiver - Waiver to validate
 * @returns Validation result with errors if invalid
 */
export function validateWaiver(
  waiver: RegressionWaiver
): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!waiver.waiver_id || waiver.waiver_id.trim() === '') {
    errors.push('waiver_id is required');
  }
  if (!waiver.baseline_id || waiver.baseline_id.trim() === '') {
    errors.push('baseline_id is required');
  }
  if (!waiver.gap_id || waiver.gap_id.trim() === '') {
    errors.push('gap_id is required');
  }

  // Severity validation
  if (!['critical', 'major', 'minor'].includes(waiver.severity)) {
    errors.push('severity must be critical, major, or minor');
  }

  // INV-REGR-004: Human signature required
  if (!waiver.approved_by || waiver.approved_by.trim() === '') {
    errors.push('INV-REGR-004: approved_by is required (human-signed)');
  }

  // Reason required for traceability
  if (!waiver.reason || waiver.reason.trim() === '') {
    errors.push('reason is required for traceability');
  }

  // Expiration phase required
  if (!waiver.expires_on_phase || waiver.expires_on_phase.trim() === '') {
    errors.push('expires_on_phase is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate waiver ID from run ID and gap ID.
 * @param runId - Current run ID
 * @param gapId - Gap being waived
 * @returns Formatted waiver ID
 */
export function generateWaiverId(
  runId: string,
  gapId: string
): string {
  return `WAIVER_${runId}_${gapId}`;
}

/**
 * Get waiver statistics.
 * @param state - Waiver registry state
 * @returns Statistics by severity
 */
export function getWaiverStats(
  state: WaiverRegistryState
): {
  readonly total: number;
  readonly by_status: Readonly<Record<WaiverStatus, number>>;
  readonly by_severity: {
    readonly critical: number;
    readonly major: number;
    readonly minor: number;
  };
} {
  return {
    total: state.waivers.length,
    by_status: {
      ACTIVE: state.active_count,
      EXPIRED: state.expired_count,
      PENDING: state.pending_count
    },
    by_severity: {
      critical: state.waivers.filter(w => w.severity === 'critical').length,
      major: state.waivers.filter(w => w.severity === 'major').length,
      minor: state.waivers.filter(w => w.severity === 'minor').length
    }
  };
}
