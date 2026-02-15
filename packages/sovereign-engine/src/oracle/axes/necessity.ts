/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AXE 4: NECESSITY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/necessity.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Weight ×1.0
 * Measures economy: every sentence justified, no filler.
 * LLM-judged — requires SovereignProvider.
 *
 * Delegation to LLM for assessment of:
 * - Sentence-level necessity
 * - Redundancy detection
 * - Beat coverage completeness
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SovereignProvider } from '../../types.js';
import type { ForgePacket, AxisScore } from '../../types.js';
import { SOVEREIGN_CONFIG } from '../../config.js';

export async function scoreNecessity(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<AxisScore> {
  const beatCount = packet.beats.length;
  const beatActions = packet.beats.map((b) => b.action).join('; ');
  const sceneGoal = packet.intent.scene_goal;
  const conflictType = packet.intent.conflict_type;

  const score = await provider.scoreNecessity(
    prose,
    beatCount,
    beatActions,
    sceneGoal,
    conflictType,
  );

  return {
    name: 'necessity',
    score,
    weight: SOVEREIGN_CONFIG.WEIGHTS.necessity,
    method: 'LLM',
    details: `LLM-judged necessity (${beatCount} beats, goal: ${sceneGoal})`,
  };
}
