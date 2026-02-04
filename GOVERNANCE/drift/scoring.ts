/**
 * PHASE E — DRIFT SCORING & CLASSIFICATION
 * Specification: PHASE_E_SPECIFICATION v1.2
 *
 * drift_score = impact × confidence × persistence
 *
 * Classification:
 *   0     → STABLE
 *   < 2   → INFO
 *   2–4   → WARNING
 *   >= 5  → CRITICAL
 *
 * INV-E-04: No auto-blocking thresholds (informational only)
 * INV-E-07: Human justification for score >= WARNING (score >= 2)
 * INV-E-09: Strict RUNBOOK mapping
 * INV-E-10: Phase E cannot trigger INCIDENT
 */

import type { DriftClassification } from './types.js';

// ─────────────────────────────────────────────────────────────
// SCORE COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute drift score per spec formula.
 * @param impact - Impact factor [1, 5] (integer)
 * @param confidence - Confidence level [0.1, 1.0]
 * @param persistence - Consecutive occurrences (positive integer)
 * @returns Computed score (impact × confidence × persistence)
 * @throws Error if parameters outside valid ranges
 */
export function computeDriftScore(
  impact: number,
  confidence: number,
  persistence: number
): number {
  if (!Number.isInteger(impact) || impact < 1 || impact > 5) {
    throw new Error(`Invalid impact: ${impact}. Must be integer in [1, 5].`);
  }
  if (!Number.isFinite(confidence) || confidence < 0.1 || confidence > 1.0) {
    throw new Error(`Invalid confidence: ${confidence}. Must be in [0.1, 1.0].`);
  }
  if (!Number.isInteger(persistence) || persistence < 1) {
    throw new Error(`Invalid persistence: ${persistence}. Must be positive integer.`);
  }

  return impact * confidence * persistence;
}

// ─────────────────────────────────────────────────────────────
// CLASSIFICATION
// ─────────────────────────────────────────────────────────────

/**
 * Classify a drift score into severity level.
 * INV-E-10: Never returns INCIDENT (not a drift classification).
 *
 * @param score - Computed drift score
 * @returns Classification level
 */
export function classifyScore(score: number): DriftClassification {
  if (score === 0) return 'STABLE';
  if (score < 2) return 'INFO';
  if (score < 5) return 'WARNING';
  return 'CRITICAL';
}

// ─────────────────────────────────────────────────────────────
// RUNBOOK RECOMMENDATION
// ─────────────────────────────────────────────────────────────

/** RUNBOOK action mapping per spec classification table */
const RUNBOOK_ACTIONS: Readonly<Record<DriftClassification, string>> = {
  STABLE: 'NONE',
  INFO: 'LOG',
  WARNING: 'SURVEILLANCE',
  CRITICAL: 'ESCALATE'
} as const;

/**
 * Map classification to RUNBOOK recommendation.
 * INV-E-09: Strict RUNBOOK mapping.
 * INV-E-04: No auto-blocking (recommendations are advisory only).
 *
 * @param classification - Drift classification level
 * @returns RUNBOOK action string
 */
export function getRecommendation(classification: DriftClassification): string {
  return RUNBOOK_ACTIONS[classification];
}

/**
 * Get escalation target based on classification.
 * INV-E-05: Mandatory human escalation.
 *
 * @param classification - Drift classification level
 * @returns Escalation target (always human)
 */
export function getEscalationTarget(classification: DriftClassification): string {
  if (classification === 'CRITICAL') return 'ARCHITECTE';
  if (classification === 'WARNING') return 'ARCHITECTE';
  return 'NONE';
}

// ─────────────────────────────────────────────────────────────
// HUMAN JUSTIFICATION VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * Check whether a score requires human justification.
 * INV-E-07: Any score >= WARNING (score >= 2) MUST include human justification.
 *
 * @param score - Computed drift score
 * @returns true if human justification is required
 */
export function requiresHumanJustification(score: number): boolean {
  return score >= 2;
}
