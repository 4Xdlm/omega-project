/**
 * ESCALATION SPECIFICATIONS
 * Phase E-SPEC — Escalation rules (no implementation)
 *
 * INV-DRIFT-004: Chain breaks MUST escalate to HALT immediately
 */

import type { DriftType, EscalationLevel, DriftPolicy } from './DRIFT_TYPES.spec';

// ─────────────────────────────────────────────────────────────
// ESCALATION RULES
// ─────────────────────────────────────────────────────────────

/**
 * Escalation mapping from drift type to level
 * Policy-driven: thresholds come from E_POLICY.json
 */
export interface EscalationRule {
  drift_type: DriftType;
  base_level: EscalationLevel;
  escalate_on_repeat: boolean;
  max_before_halt: number; // τ_max_consecutive_drifts from policy
}

// ─────────────────────────────────────────────────────────────
// DEFAULT ESCALATION MATRIX
// ─────────────────────────────────────────────────────────────

export const ESCALATION_MATRIX: Record<DriftType, EscalationLevel> = {
  SCHEMA_MISMATCH: 'WARNING',
  HASH_DEVIATION: 'CRITICAL',
  INVARIANT_VIOLATION: 'CRITICAL',
  THRESHOLD_BREACH: 'WARNING',
  CHAIN_BREAK: 'HALT' // INV-DRIFT-004: Immediate HALT
} as const;

// ─────────────────────────────────────────────────────────────
// ESCALATION INTERFACE
// ─────────────────────────────────────────────────────────────

export interface IEscalationEngine {
  /**
   * Determine escalation level for a drift type
   * Uses policy thresholds (no hardcoded values)
   */
  getEscalationLevel(
    driftType: DriftType,
    consecutiveCount: number,
    policy: DriftPolicy
  ): EscalationLevel;

  /**
   * Check if escalation requires human override
   * HALT level always requires override
   */
  requiresHumanOverride(level: EscalationLevel): boolean;

  /**
   * Compare escalation levels (for max calculation)
   */
  compareLevel(a: EscalationLevel, b: EscalationLevel): number;
}

// ─────────────────────────────────────────────────────────────
// ESCALATION LEVEL ORDERING
// ─────────────────────────────────────────────────────────────

export const ESCALATION_ORDER: Record<EscalationLevel, number> = {
  INFO: 0,
  WARNING: 1,
  CRITICAL: 2,
  HALT: 3
} as const;
