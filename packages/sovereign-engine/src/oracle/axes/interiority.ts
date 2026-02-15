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

export async function scoreInteriority(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<AxisScore> {
  const context = {
    pov: packet.intent.pov,
    character_state: packet.continuity.character_states[0]?.emotional_state ?? 'unknown',
  };

  const score = await provider.scoreInteriority(prose, context);

  return {
    name: 'interiority',
    score,
    weight: SOVEREIGN_CONFIG.WEIGHTS.interiority,
    method: 'LLM',
    details: `LLM-judged interiority depth (POV: ${context.pov})`,
  };
}
