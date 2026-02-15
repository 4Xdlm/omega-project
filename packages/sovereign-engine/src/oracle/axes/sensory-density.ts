/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AXE 3: SENSORY DENSITY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/sensory-density.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Weight ×1.5
 * Measures sensory richness and specificity.
 * HYBRID: CALC baseline + LLM quality assessment.
 *
 * CALC: Count sensory markers from lexicon
 * LLM: Judge quality and specificity of sensory details
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SovereignProvider } from '../../types.js';
import type { ForgePacket, AxisScore } from '../../types.js';
import { computeStyleDelta } from '../../delta/delta-style.js';
import { SOVEREIGN_CONFIG } from '../../config.js';

export async function scoreSensoryDensity(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<AxisScore> {
  const styleDelta = computeStyleDelta(packet, prose);

  const calcScore = Math.min(
    100,
    (styleDelta.sensory_density_actual / SOVEREIGN_CONFIG.SENSORY_DENSITY_OPTIMAL) * 100,
  );

  const sensoryCounts: Record<string, number> = {
    sight: 0,
    sound: 0,
    touch: 0,
    smell: 0,
    taste: 0,
    proprioception: 0,
    interoception: 0,
  };

  const llmScore = await provider.scoreSensoryDensity(prose, sensoryCounts);

  const hybridScore = calcScore * 0.5 + llmScore * 0.5;

  return {
    name: 'sensory_density',
    score: hybridScore,
    weight: SOVEREIGN_CONFIG.WEIGHTS.sensory_density,
    method: 'HYBRID',
    details: `CALC: ${calcScore.toFixed(0)}, LLM: ${llmScore.toFixed(0)}, density: ${styleDelta.sensory_density_actual.toFixed(1)}/100w`,
  };
}
