/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AXE 7: SIGNATURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/signature.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Weight ×1.0
 * Measures conformity to style genome: signature words, forbidden words, abstraction ratio.
 * 100% CALC — 0 token — fully deterministic.
 *
 * SCORING (max 100):
 * - Signature hit rate ≥30% → 40 pts (linear)
 * - No forbidden words → 30 pts (penalty per violation)
 * - Abstraction ratio ≤ target → 30 pts (linear penalty)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, AxisScore } from '../../types.js';
import { computeStyleDelta } from '../../delta/delta-style.js';
import { SOVEREIGN_CONFIG } from '../../config.js';

export function scoreSignature(packet: ForgePacket, prose: string): AxisScore {
  const styleDelta = computeStyleDelta(packet, prose);

  let score = 0;

  const signatureHitRate = styleDelta.signature_hit_rate;
  const minHitRate = SOVEREIGN_CONFIG.SIGNATURE_HIT_RATE_MIN;

  if (signatureHitRate >= minHitRate) {
    score += 40;
  } else {
    score += 40 * (signatureHitRate / minHitRate);
  }

  const forbiddenCount = countForbiddenWords(prose.toLowerCase(), packet.style_genome.lexicon.forbidden_words);
  const forbiddenPenalty = Math.min(30, forbiddenCount * 5);
  score += 30 - forbiddenPenalty;

  const abstractionRatio = styleDelta.abstraction_ratio_actual;
  const abstractionTarget = styleDelta.abstraction_ratio_target;

  if (abstractionRatio <= abstractionTarget) {
    score += 30;
  } else {
    const excess = abstractionRatio - abstractionTarget;
    const penalty = Math.min(30, excess * 100);
    score += 30 - penalty;
  }

  score = Math.max(0, Math.min(100, score));

  const details = `Signature hit rate: ${(signatureHitRate * 100).toFixed(0)}%, forbidden: ${forbiddenCount}, abstraction: ${(abstractionRatio * 100).toFixed(0)}% (target: ${(abstractionTarget * 100).toFixed(0)}%)`;

  return {
    name: 'signature',
    score,
    weight: SOVEREIGN_CONFIG.WEIGHTS.signature,
    method: 'CALC',
    details,
  };
}

function countForbiddenWords(prose: string, forbiddenWords: readonly string[]): number {
  let count = 0;
  for (const word of forbiddenWords) {
    const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, 'g');
    const matches = prose.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}
