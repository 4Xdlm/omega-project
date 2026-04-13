/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AXE 8: IMPACT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/impact.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Weight ×2.0
 * Measures strength of opening and closing.
 * LLM-judged — requires SovereignProvider.
 *
 * Delegation to LLM for assessment of:
 * - Opening hook effectiveness
 * - Closing resonance
 * - Terminal emotional landing
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SovereignProvider } from '../../types.js';
import type { ForgePacket, AxisScore } from '../../types.js';
import { SOVEREIGN_CONFIG } from '../../config.js';

/**
 * R7-B: 3-shot median stabilization.
 * Before: single LLM shot → variance between duel scoring and final scoring.
 * After: 3 parallel shots, median → reduced stochastic noise.
 * Cost: +2 LLM calls per judgeAestheticV3 invocation.
 */
const IMPACT_SHOTS = 3;

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function scoreImpact(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<AxisScore> {
  const sentences = prose.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  if (sentences.length < 2) {
    return {
      name: 'impact',
      score: 50,
      weight: SOVEREIGN_CONFIG.WEIGHTS.impact,
      method: 'LLM',
      details: 'Too short to assess opening/closing',
    };
  }

  const opening = sentences.slice(0, 3).join('. ');
  const closing = sentences.slice(-3).join('. ');

  const context = {
    story_premise: packet.intent.story_goal,
  };

  const shots = await Promise.all(
    Array.from({ length: IMPACT_SHOTS }, () =>
      provider.scoreImpact(opening, closing, context),
    ),
  );

  const score = median(shots);
  const mean = shots.reduce((s, v) => s + v, 0) / shots.length;
  const stdev = Math.sqrt(shots.reduce((s, v) => s + (v - mean) ** 2, 0) / shots.length);
  console.log(`[IMPACT-MULTISHOT] shots=[${shots.join(', ')}] median=${score} mean=${mean.toFixed(1)} stdev=${stdev.toFixed(1)}`);

  return {
    name: 'impact',
    score,
    weight: SOVEREIGN_CONFIG.WEIGHTS.impact,
    method: 'LLM',
    details: `LLM-judged opening/closing impact (${IMPACT_SHOTS}-shot median)`,
  };
}
