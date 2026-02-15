/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AXE 5: ANTI-CLICHÉ
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/anti-cliche.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Weight ×1.0
 * Scans prose against kill lists. Zero tolerance.
 * 100% CALC — 0 token — fully deterministic.
 *
 * SCORING:
 * - 0 matches → 100
 * - 1-2 matches → 80
 * - 3-5 matches → 50
 * - 6+ matches → 0
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, AxisScore } from '../../types.js';
import { computeClicheDelta } from '../../delta/delta-cliche.js';
import { SOVEREIGN_CONFIG } from '../../config.js';

export function scoreAntiCliche(packet: ForgePacket, prose: string): AxisScore {
  const clicheDelta = computeClicheDelta(packet, prose);

  // Graduated scoring: different penalty per category
  // Clichés = severe (15 pts each), AI patterns = moderate (12 pts), filter words = mild (5 pts)
  const clicheCount = clicheDelta.matches.filter((m) => m.category === 'cliche').length;
  const aiCount = clicheDelta.ai_pattern_matches;
  const filterCount = clicheDelta.filter_word_matches;

  const penalty = (clicheCount * 15) + (aiCount * 12) + (filterCount * 3);
  let score = Math.max(0, 100 - penalty);

  const details = `Total matches: ${clicheDelta.total_matches} (clichés: ${clicheCount}×15=${clicheCount * 15}, AI: ${aiCount}×12=${aiCount * 12}, filter: ${filterCount}×3=${filterCount * 3}, penalty: -${penalty})`;

  return {
    name: 'anti_cliche',
    score,
    weight: SOVEREIGN_CONFIG.WEIGHTS.anti_cliche,
    method: 'CALC',
    details,
  };
}
