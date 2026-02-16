/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — RE-SCORE GUARD
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: polish/re-score-guard.ts
 * Version: 1.0.0 (Sprint 10 Commit 10.3)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-POL-01
 *
 * Purpose: Verification guard for prose modifications.
 * Ensures that corrections NEVER degrade the prose quality.
 *
 * Rule: A correction that improves one axis but destroys another = REJECTED.
 *
 * Algorithm:
 * 1. Score original_prose on ALL axes (V3 complete)
 * 2. Score modified_prose on ALL axes
 * 3. Check TWO conditions:
 *    a. composite_after > composite_before + min_improvement
 *    b. ALL axes in modified >= AXIS_FLOOR (50)
 * 4. Both conditions must be true → accepted
 *
 * Invariant ART-POL-01: Correction accepted ONLY if improvement without degradation.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, SovereignProvider, SScore } from '../types.js';
import { judgeAesthetic } from '../oracle/aesthetic-oracle.js';
import { SOVEREIGN_CONFIG } from '../config.js';
import { DEFAULT_MIN_IMPROVEMENT } from './sentence-surgeon.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of re-score guard verification.
 *
 * @param accepted True if correction meets ALL criteria
 * @param score_before Composite score of original prose
 * @param score_after Composite score of modified prose
 * @param details Human-readable explanation of decision
 */
export interface ReScoreGuardResult {
  readonly accepted: boolean;
  readonly score_before: number;
  readonly score_after: number;
  readonly details: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify that a prose modification is acceptable.
 *
 * Scores both original and modified prose on ALL axes (V3 complete),
 * then checks TWO conditions:
 * 1. Composite improvement ≥ min_improvement (default: 2.0 points)
 * 2. NO axis falls below AXIS_FLOOR (50 points)
 *
 * BOTH conditions must be true for acceptance.
 *
 * Invariant ART-POL-01: A correction that improves one axis but degrades
 * another is REJECTED. Zero-tolerance policy on quality degradation.
 *
 * @param original_prose Original prose before modification
 * @param modified_prose Modified prose after correction
 * @param packet ForgePacket containing constraints and context
 * @param provider SovereignProvider for LLM scoring
 * @returns ReScoreGuardResult with acceptance decision and details
 */
export async function reScoreGuard(
  original_prose: string,
  modified_prose: string,
  packet: ForgePacket,
  provider: SovereignProvider,
): Promise<ReScoreGuardResult> {
  // Score original prose on ALL axes
  const score_original: SScore = await judgeAesthetic(
    packet,
    original_prose,
    provider,
  );

  // Score modified prose on ALL axes
  const score_modified: SScore = await judgeAesthetic(
    packet,
    modified_prose,
    provider,
  );

  const composite_before = score_original.composite;
  const composite_after = score_modified.composite;
  const delta_composite = composite_after - composite_before;

  // Condition 1: Composite improvement ≥ min_improvement
  const condition_improvement = delta_composite >= DEFAULT_MIN_IMPROVEMENT;

  // Condition 2: ALL axes ≥ AXIS_FLOOR
  const axes_modified = score_modified.axes;
  const axes_below_floor: string[] = [];

  // Check each axis against floor
  const axis_names = [
    'interiority',
    'tension_14d',
    'sensory_density',
    'necessity',
    'anti_cliche',
    'rhythm',
    'signature',
    'impact',
    'emotion_coherence',
  ] as const;

  for (const axis_name of axis_names) {
    const axis = axes_modified[axis_name];
    if (axis.score < SOVEREIGN_CONFIG.AXIS_FLOOR) {
      axes_below_floor.push(`${axis_name}=${axis.score.toFixed(1)}`);
    }
  }

  const condition_floor = axes_below_floor.length === 0;

  // Decision: BOTH conditions must be true
  const accepted = condition_improvement && condition_floor;

  // Build detailed explanation
  let details = `Composite: ${composite_before.toFixed(2)} → ${composite_after.toFixed(2)} (Δ ${delta_composite >= 0 ? '+' : ''}${delta_composite.toFixed(2)})`;

  if (!condition_improvement) {
    details += ` | REJECT: delta < ${DEFAULT_MIN_IMPROVEMENT}`;
  }

  if (!condition_floor) {
    details += ` | REJECT: axes below floor (${SOVEREIGN_CONFIG.AXIS_FLOOR}): ${axes_below_floor.join(', ')}`;
  }

  if (accepted) {
    details += ' | ACCEPTED: improvement + all axes above floor';
  }

  return {
    accepted,
    score_before: composite_before,
    score_after: composite_after,
    details,
  };
}
