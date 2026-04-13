/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AXE 1: INTERIORITY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/interiority.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Weight ×2.0
 * Measures depth of interior thought/feeling vs external action.
 * LLM-judged — requires SovereignProvider.
 *
 * Delegation to LLM for nuanced assessment of:
 * - Internal monologue presence
 * - Emotional interiority vs told emotion
 * - Subtext vs surface
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SovereignProvider } from '../../types.js';
import type { ForgePacket, AxisScore } from '../../types.js';
import { SOVEREIGN_CONFIG } from '../../config.js';

/**
 * R7-B: 3-shot median stabilization.
 * Before: single LLM shot → ±8 pts variance between evaluations of identical prose.
 * After: 3 parallel shots, median → variance reduced by ~60% (same pattern as necessity).
 * Cost: +2 LLM calls per judgeAestheticV3 invocation.
 */
const INTERIORITY_SHOTS = 3;

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function scoreInteriority(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<AxisScore> {
  const context = {
    pov: packet.intent.pov,
    character_state: packet.continuity.character_states[0]?.emotional_state ?? 'unknown',
  };

  const shots = await Promise.all(
    Array.from({ length: INTERIORITY_SHOTS }, () =>
      provider.scoreInteriority(prose, context),
    ),
  );

  const score = median(shots);
  const mean = shots.reduce((s, v) => s + v, 0) / shots.length;
  const stdev = Math.sqrt(shots.reduce((s, v) => s + (v - mean) ** 2, 0) / shots.length);
  console.log(`[INTERIORITY-MULTISHOT] shots=[${shots.join(', ')}] median=${score} mean=${mean.toFixed(1)} stdev=${stdev.toFixed(1)}`);

  return {
    name: 'interiority',
    score,
    weight: SOVEREIGN_CONFIG.WEIGHTS.interiority,
    method: 'LLM',
    details: `LLM-judged interiority depth (POV: ${context.pov}, ${INTERIORITY_SHOTS}-shot median)`,
  };
}
