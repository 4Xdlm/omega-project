/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — PHYSICS ACTIVATION GATE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: calibration/physics-activation.ts
 * Sprint: 18.2
 * Invariant: ART-CAL-02
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Progressive activation of physics_compliance axis.
 * Currently weight=0 (informational). This module decides when/how to activate.
 *
 * Activation levels:
 * - LEVEL_0: weight=0 (current default, informational only)
 * - LEVEL_1: weight=0.3 (mild influence on ECC)
 * - LEVEL_2: weight=0.7 (moderate influence)
 * - LEVEL_3: weight=1.0 (full integration)
 *
 * Decision based on correlation between physics_score and human perception.
 *
 * 100% CALC — deterministic.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ActivationLevel = 0 | 1 | 2 | 3;

export interface PhysicsActivationConfig {
  readonly level: ActivationLevel;
  readonly weight: number;
  readonly reason: string;
  readonly correlation_with_human: number;
  readonly min_runs_required: number;
  readonly runs_available: number;
}

export interface ActivationDecision {
  readonly recommended_level: ActivationLevel;
  readonly recommended_weight: number;
  readonly confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly reason: string;
  readonly safe_to_activate: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const LEVEL_WEIGHTS: Record<ActivationLevel, number> = {
  0: 0,
  1: 0.3,
  2: 0.7,
  3: 1.0,
};

const MIN_RUNS_FOR_ACTIVATION = 10;
const MIN_CORRELATION_L1 = 0.3;
const MIN_CORRELATION_L2 = 0.5;
const MIN_CORRELATION_L3 = 0.7;

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Decide what activation level is appropriate for physics_compliance.
 *
 * @param physicsScores - Array of physics scores from runs
 * @param humanScores - Array of corresponding human quality scores (1-10)
 * @returns ActivationDecision
 */
export function decidePhysicsActivation(
  physicsScores: readonly number[],
  humanScores: readonly number[],
): ActivationDecision {
  const n = Math.min(physicsScores.length, humanScores.length);

  // Not enough data
  if (n < MIN_RUNS_FOR_ACTIVATION) {
    return {
      recommended_level: 0,
      recommended_weight: 0,
      confidence: 'LOW',
      reason: `Insufficient data: ${n}/${MIN_RUNS_FOR_ACTIVATION} runs available`,
      safe_to_activate: false,
    };
  }

  // Compute Pearson correlation
  const r = pearsonR(physicsScores.slice(0, n), humanScores.slice(0, n));
  const absR = Math.abs(r);

  // Negative correlation → physics hurts quality → DO NOT ACTIVATE
  if (r < -0.1) {
    return {
      recommended_level: 0,
      recommended_weight: 0,
      confidence: 'HIGH',
      reason: `Negative correlation (r=${r.toFixed(3)}) — physics inversely related to quality`,
      safe_to_activate: false,
    };
  }

  // Determine level
  let level: ActivationLevel;
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW';

  if (absR >= MIN_CORRELATION_L3) {
    level = 3;
    confidence = 'HIGH';
  } else if (absR >= MIN_CORRELATION_L2) {
    level = 2;
    confidence = 'MEDIUM';
  } else if (absR >= MIN_CORRELATION_L1) {
    level = 1;
    confidence = 'MEDIUM';
  } else {
    level = 0;
    confidence = 'LOW';
  }

  return {
    recommended_level: level,
    recommended_weight: LEVEL_WEIGHTS[level],
    confidence,
    reason: `Correlation r=${r.toFixed(3)} → Level ${level} (weight=${LEVEL_WEIGHTS[level]})`,
    safe_to_activate: level > 0,
  };
}

/**
 * Get the weight for a given activation level.
 */
export function getPhysicsWeight(level: ActivationLevel): number {
  return LEVEL_WEIGHTS[level];
}

/**
 * Create a PhysicsActivationConfig from a decision.
 */
export function createActivationConfig(
  decision: ActivationDecision,
  runsAvailable: number,
): PhysicsActivationConfig {
  return {
    level: decision.recommended_level,
    weight: decision.recommended_weight,
    reason: decision.reason,
    correlation_with_human: 0, // filled by caller
    min_runs_required: MIN_RUNS_FOR_ACTIVATION,
    runs_available: runsAvailable,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL PEARSON (avoid circular dep with benchmark module)
// ═══════════════════════════════════════════════════════════════════════════════

function pearsonR(x: readonly number[], y: readonly number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denom = Math.sqrt(sumX2 * sumY2);
  return denom === 0 ? 0 : sumXY / denom;
}
