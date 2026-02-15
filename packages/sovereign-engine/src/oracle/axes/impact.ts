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

  const score = await provider.scoreImpact(opening, closing, context);

  return {
    name: 'impact',
    score,
    weight: SOVEREIGN_CONFIG.WEIGHTS.impact,
    method: 'LLM',
    details: `LLM-judged opening/closing impact`,
  };
}
