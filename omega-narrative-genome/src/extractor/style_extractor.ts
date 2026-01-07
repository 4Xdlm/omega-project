/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NARRATIVE GENOME — STYLE EXTRACTOR
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { StyleAxis } from "../types";

/**
 * Clamp une valeur dans [0,1]
 */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Extrait l'axe stylistique depuis les données OMEGA
 * 
 * NOTE: Cette implémentation est un PLACEHOLDER.
 * L'intégration réelle avec STYLE_LIVING_SIGNATURE/VOICE viendra plus tard.
 */
export function extractStyleAxis(
  styleData: unknown,
  _seed: number
): StyleAxis {
  const data = styleData as Record<string, number> | undefined;
  
  return {
    burstiness: clamp01(data?.burstiness ?? 0.5),
    perplexity: clamp01(data?.perplexity ?? 0.5),
    humanTouch: clamp01(data?.humanTouch ?? 0.5),
    lexicalRichness: clamp01(data?.lexicalRichness ?? 0.5),
    averageSentenceLength: clamp01(data?.averageSentenceLength ?? 0.5),
    dialogueRatio: clamp01(data?.dialogueRatio ?? 0.3),
  };
}
