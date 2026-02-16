/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AUTHENTICITY AXIS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/authenticity.ts
 * Version: 1.0.0 (Sprint 11)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-AUTH-01
 *
 * Axe authenticity : détecte les "IA smells" (humain vs IA).
 * Poids : 2.0
 * Méthode : HYBRID (CALC 15 patterns + LLM adversarial cached)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, SovereignProvider, AxisScore } from '../../types.js';
import { scoreAuthenticity } from '../../authenticity/authenticity-scorer.js';
import { SemanticCache } from '../../semantic/semantic-cache.js';

// Cache global pour adversarial judge (réutilisé du Sprint 9)
const globalCache = new SemanticCache();

/**
 * Score l'axe authenticity (humain vs IA).
 * ART-AUTH-01: CALC 15 patterns + LLM adversarial.
 *
 * @param packet - ForgePacket avec contraintes
 * @param prose - Prose à évaluer
 * @param provider - SovereignProvider pour LLM adversarial
 * @returns AxisScore [0-100], poids 2.0, méthode HYBRID
 */
export async function scoreAuthenticityAxis(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<AxisScore> {
  // Combinaison CALC + LLM
  const result = await scoreAuthenticity(prose, provider, globalCache);

  return {
    axis_id: 'authenticity',
    score: result.combined_score, // 0-100, 100 = très authentique (humain)
    weight: 2.0,
    method: 'HYBRID', // CALC 60% + LLM 40%
    details: {
      calc_score: result.calc_score,
      fraud_score: result.fraud_score,
      pattern_hits: result.pattern_hits,
    },
  };
}
