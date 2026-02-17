/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — EUPHONY BASIC AXIS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/euphony-basic.ts
 * Sprint: 15.3
 * Invariant: ART-PHON-03
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Penalizes cacophonies, rewards rhythm variation.
 * Combines cacophony-detector + rhythm-variation.
 * Poids: 1.0 — Méthode: CALC — Macro-axe: RCI
 *
 * Score = (100 - cacophony_severity × 0.5) × 0.6 + variation_score × 0.4
 * Clamp [0, 100]
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, AxisScore } from '../../types.js';
import { detectCacophony } from '../../phonetic/cacophony-detector.js';
import { analyzeRhythmVariation } from '../../phonetic/rhythm-variation.js';

/**
 * Score euphony basic.
 *
 * 60% cacophony penalty: fewer cacophonies = higher score
 * 40% rhythm variation reward: more variation = higher score
 *
 * Clamp [0, 100].
 */
export function scoreEuphonyBasic(
  packet: ForgePacket,
  prose: string,
): AxisScore {
  const cacophony = detectCacophony(prose);
  const rhythmVar = analyzeRhythmVariation(prose);

  // Cacophony component: start at 100, subtract severity
  const cacophonyComponent = Math.max(0, 100 - cacophony.severity_score * 0.5);

  // Variation component: directly from analyzer
  const variationComponent = rhythmVar.variation_score;

  // Weighted blend
  const rawScore = cacophonyComponent * 0.6 + variationComponent * 0.4;
  const score = Math.max(0, Math.min(100, rawScore));

  const details = [
    `cacophonies=${cacophony.total_count}`,
    `severity=${cacophony.severity_score.toFixed(1)}`,
    `monotony_patterns=${rhythmVar.total_count}`,
    `variation=${rhythmVar.variation_score.toFixed(1)}`,
  ].join(', ');

  return {
    name: 'euphony_basic',
    score,
    weight: 1.0,
    method: 'CALC',
    details,
  };
}
