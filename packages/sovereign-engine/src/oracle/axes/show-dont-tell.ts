/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — SHOW DON'T TELL AXIS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/show-dont-tell.ts
 * Version: 1.0.0 (Sprint 11)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SDT-02
 *
 * Axe show_dont_tell : évalue le ratio showing vs telling.
 * Poids : 3.0 (pénalisation forte du telling)
 * Méthode : HYBRID (CALC patterns par défaut, LLM OFF sauf feature flag)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, SovereignProvider, AxisScore } from '../../types.js';
import { detectTelling } from '../../silence/show-dont-tell.js';

/**
 * Score l'axe show_dont_tell.
 * ART-SDT-02: Intégré dans l'oracle avec poids ×3.0.
 *
 * @param packet - ForgePacket avec contraintes
 * @param prose - Prose à évaluer
 * @param provider - SovereignProvider (unused, CALC only for now)
 * @returns AxisScore [0-100], poids 3.0, méthode HYBRID
 */
export async function scoreShowDontTell(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<AxisScore> {
  // Détection CALC (déterministe)
  const result = detectTelling(prose);

  return {
    axis_id: 'show_dont_tell',
    score: result.score, // 0-100, 100 = excellent showing
    weight: 3.0, // Poids élevé (pénalisation forte)
    method: 'HYBRID', // CALC pour l'instant, LLM OFF (feature flag futur)
    details: {
      violations_count: result.violations.length,
      show_ratio: result.show_ratio,
      worst_violations: result.worst_violations.map((v) => v.pattern_id),
    },
  };
}
