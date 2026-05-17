/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — METAPHOR NOVELTY AXIS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/metaphor-novelty.ts
 * Version: 1.0.0 (Sprint 12)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-META-03
 *
 * Axe metaphor_novelty (×1.5 weight).
 * Méthode: HYBRID (blacklist CALC + LLM novelty detection).
 * Cache obligatoire pour détection LLM.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, SovereignProvider, AxisScore } from '../../types.js';
import { SemanticCache } from '../../semantic/semantic-cache.js';
import { detectMetaphors } from '../../metaphor/metaphor-detector.js';
import { scoreMetaphorNovelty } from '../../metaphor/novelty-scorer.js';
import { DEAD_METAPHORS_FR } from '../../metaphor/dead-metaphor-blacklist.js';

// Global cache instance for metaphor detection (reuse semantic cache)
const globalCache = new SemanticCache(3600); // 1 hour TTL

/**
 * Score metaphor novelty axis.
 * ART-META-03: LLM-judged metaphor novelty with cache.
 *
 * Poids: 1.5
 * Méthode: HYBRID (CALC blacklist + LLM detection)
 *
 * @param packet - ForgePacket (not used, for signature consistency)
 * @param prose - Text to analyze
 * @param provider - SovereignProvider LLM
 * @returns AxisScore for metaphor_novelty
 */
export async function scoreMetaphorNoveltyAxis(
  _packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<AxisScore> {
  // Detect metaphors via LLM (cached, fail-closed)
  const metaphors = await detectMetaphors(prose, provider, globalCache);

  // Score novelty
  const result = await scoreMetaphorNovelty(metaphors, DEAD_METAPHORS_FR);

  return {
    name: 'metaphor_novelty',

    score: result.final_score,
    weight: 1.0, // SII-FIX-01: actual weight in computeSII() is 1.0 (was 1.5 pre-fix)
    method: 'HYBRID',
    // P3.1.6.C reverted (2026-05-17) — cohérence shape details:object avec authenticity.ts. TS2322 acceptée — voir NCR_AXIS_SCORE_DETAILS_TYPE_DRIFT.
    // @ts-expect-error — runtime shape objet, type déclaré string. Redesign futur.
    details: {
      dead_count: result.dead_count,
      total_metaphors: result.total_metaphors,
      dead_ratio: result.dead_ratio,
      avg_novelty: result.avg_novelty,
    },
  };
}
