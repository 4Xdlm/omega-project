/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — TEMPORAL PACING AXIS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/temporal-pacing.ts
 * Sprint: 16.3
 * Invariant: ART-TEMP-03
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Measures how well prose respects temporal contract.
 * Combines dilatation/compression scoring + foreshadowing detection.
 * Poids: 1.0 — Méthode: CALC — Macro-axe: ECC
 *
 * Score = temporal_composite × 0.7 + foreshadowing_completion × 30
 * If no temporal_contract → neutral score 75
 * Clamp [0, 100]
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, AxisScore } from '../../types.js';
import type { TemporalContract } from '../../temporal/temporal-contract.js';
import { scoreTemporalPacing } from '../../temporal/temporal-scoring.js';
import { detectForeshadowing } from '../../temporal/foreshadowing-compiler.js';

/**
 * Score temporal pacing.
 *
 * If ForgePacket has temporal_contract → full scoring.
 * If no temporal_contract → neutral 75 (no penalty, no reward).
 */
export function scoreTemporalPacingAxis(
  packet: ForgePacket,
  prose: string,
): AxisScore {
  // Check if temporal_contract exists
  const contract = (packet as Record<string, unknown>).temporal_contract as TemporalContract | undefined;

  if (!contract) {
    return {
      name: 'temporal_pacing',
      score: 75,
      weight: 1.0,
      method: 'CALC',
      details: 'No temporal_contract — neutral score',
    };
  }

  // Score dilatation/compression
  const temporalResult = scoreTemporalPacing(prose, contract);

  // Score foreshadowing
  const foreshadowResult = detectForeshadowing(prose, contract);

  // Composite: 70% temporal + 30% foreshadowing
  const foreshadowScore = foreshadowResult.completion_rate * 100;
  const rawScore = temporalResult.composite * 0.7 + foreshadowScore * 0.3;
  const score = Math.max(0, Math.min(100, rawScore));

  const details = [
    `dilatation=${temporalResult.dilatation_score}`,
    `compression=${temporalResult.compression_score}`,
    `balance=${temporalResult.pacing_balance}`,
    `foreshadow=${foreshadowScore.toFixed(0)}% (${foreshadowResult.hooks_planted}/${foreshadowResult.total_hooks} planted, ${foreshadowResult.hooks_resolved}/${foreshadowResult.total_hooks} resolved)`,
  ].join(', ');

  return {
    name: 'temporal_pacing',
    score,
    weight: 1.0,
    method: 'CALC',
    details,
  };
}
