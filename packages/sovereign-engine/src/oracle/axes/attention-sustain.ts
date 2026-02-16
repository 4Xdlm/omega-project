/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — ATTENTION SUSTAIN AXIS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/attention-sustain.ts
 * Sprint: 14.3
 * Invariant: ART-PHANTOM-03
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Measures how well the prose sustains reader attention.
 * Score based on low_attention danger zones from PhantomRunner.
 * Poids: 1.0 — Méthode: CALC — Macro-axe: IFI
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, AxisScore } from '../../types.js';
import { runPhantom } from '../../phantom/phantom-runner.js';

/**
 * Score attention sustain.
 *
 * 100 if attention never < 0.3 for 5+ consecutive sentences
 *  80 if 1 low_attention danger zone
 *  60 if 2 danger zones
 *  40 if 3+ danger zones
 *
 * Clamp [0, 100].
 */
export function scoreAttentionSustain(
  packet: ForgePacket,
  prose: string,
): AxisScore {
  const trace = runPhantom(prose);
  const lowAttentionZones = trace.danger_zones.filter(z => z.type === 'low_attention');
  const zoneCount = lowAttentionZones.length;

  let score: number;
  if (zoneCount === 0) {
    score = 100;
  } else if (zoneCount === 1) {
    score = 80;
  } else if (zoneCount === 2) {
    score = 60;
  } else {
    score = Math.max(0, 40 - (zoneCount - 3) * 10);
  }

  score = Math.max(0, Math.min(100, score));

  const details = zoneCount === 0
    ? 'Attention sustained — no low_attention zones'
    : `${zoneCount} low_attention zone(s), attention_min=${trace.attention_min.toFixed(3)} at sentence ${trace.attention_min_index}`;

  return {
    name: 'attention_sustain',
    score,
    weight: 1.0,
    method: 'CALC',
    details,
  };
}
