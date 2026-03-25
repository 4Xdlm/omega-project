/**
 * OMEGA — ForgePacket to SceneBrief converter
 *
 * Converts a ForgePacket into a dramatic SceneBrief for the chunked generator.
 * Output is pure dramatic language — no JSON, no IDs, no system identifiers.
 *
 * INV-CDE-01: Output ≤ 150 tokens
 * INV-PROMPT-01: No open_threads, charStates, or system IDs
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type { ForgePacket } from '../types.js';

/**
 * Convert a ForgePacket into a dramatic SceneBrief string.
 *
 * Extracts:
 * - intent.scene_goal + intent.story_goal
 * - beats (max 4 actions)
 * - emotion Q1 dominant + Q4 dominant for tone arc
 *
 * @returns Dramatic prose brief, ≤ 150 tokens (INV-CDE-01)
 */
export function forgePacketToSceneBrief(packet: ForgePacket): string {
  const parts: string[] = [];

  // Scene goal — the dramatic situation
  if (packet.intent.scene_goal) {
    parts.push(packet.intent.scene_goal);
  }

  // Story goal — wider narrative context (1 line)
  if (packet.intent.story_goal) {
    parts.push(packet.intent.story_goal);
  }

  // Beats — max 4 actions, dramatic language only
  if (packet.beats && packet.beats.length > 0) {
    const beatActions = packet.beats
      .slice(0, 4)
      .map(b => b.action)
      .filter(a => a && a.length > 0);
    if (beatActions.length > 0) {
      parts.push(beatActions.join(' '));
    }
  }

  // Emotional arc — Q1 dominant → Q4 dominant
  if (packet.emotion_contract?.curve_quartiles) {
    const q1 = packet.emotion_contract.curve_quartiles[0];
    const q4 = packet.emotion_contract.curve_quartiles[3];
    if (q1?.dominant && q4?.dominant) {
      parts.push(`Le ton initial est ${q1.dominant} ; la scène finit dans ${q4.dominant}.`);
    }
  }

  let brief = parts.join('\n');

  // INV-CDE-01: Enforce ≤ 150 tokens (~600 chars as rough proxy)
  if (brief.length > 600) {
    brief = brief.slice(0, 597) + '...';
  }

  return brief;
}
