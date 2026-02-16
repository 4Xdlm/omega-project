/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AUTHENTICITY SCORER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: authenticity/authenticity-scorer.ts
 * Version: 1.0.0 (Sprint 11)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-AUTH-01, ART-AUTH-02
 *
 * Combine CALC (15 patterns) + LLM (adversarial judge) pour score d'authenticité.
 * Pondération : CALC 60% + LLM 40%, ou CALC 100% si LLM indisponible.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { computeIASmellScore } from './ia-smell-patterns.js';
import { judgeFraudScore } from './adversarial-judge.js';
import type { SovereignProvider } from '../types.js';
import type { SemanticCache } from '../semantic/semantic-cache.js';

export interface AuthenticityResult {
  readonly calc_score: number; // score 15 patterns [0-100]
  readonly fraud_score: number | null; // LLM [0-100] ou null
  readonly combined_score: number; // pondéré (CALC 60% + LLM 40%, ou CALC 100% si LLM null)
  readonly pattern_hits: readonly string[]; // IDs des patterns détectés
}

/**
 * Score l'authenticité d'une prose (humain vs IA).
 * ART-AUTH-01: CALC 15 patterns déterministes.
 * ART-AUTH-02: LLM cached et reproductible.
 *
 * @param prose - Texte à analyser
 * @param provider - SovereignProvider LLM
 * @param cache - SemanticCache
 * @returns AuthenticityResult avec scores CALC, LLM, et combiné
 */
export async function scoreAuthenticity(
  prose: string,
  provider: SovereignProvider,
  cache: SemanticCache,
): Promise<AuthenticityResult> {
  // CALC score (15 patterns, déterministe)
  const calcResult = computeIASmellScore(prose);

  // LLM adversarial judge (cached, peut retourner null si indispo)
  const fraudResult = await judgeFraudScore(prose, provider, cache);

  // Combined score
  let combined_score: number;
  if (fraudResult.fraud_score !== null) {
    // CALC 60% + LLM 40%
    combined_score = Math.round(calcResult.score * 0.6 + fraudResult.fraud_score * 0.4);
  } else {
    // LLM indisponible → CALC 100%
    combined_score = calcResult.score;
  }

  return {
    calc_score: calcResult.score,
    fraud_score: fraudResult.fraud_score,
    combined_score,
    pattern_hits: calcResult.pattern_hits,
  };
}
