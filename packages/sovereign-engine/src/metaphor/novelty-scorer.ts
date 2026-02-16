/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — METAPHOR NOVELTY SCORER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: metaphor/novelty-scorer.ts
 * Version: 1.0.0 (Sprint 12)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-META-02
 *
 * Score la nouveauté des métaphores détectées.
 * Formule: avg_novelty × (1 - dead_ratio)
 * Si aucune métaphore → score 70 (neutre, pas pénalisé).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { MetaphorHit } from './metaphor-detector.js';
import type { DeadMetaphor } from './dead-metaphor-blacklist.js';

export interface MetaphorNoveltyResult {
  readonly dead_count: number;
  readonly total_metaphors: number;
  readonly dead_ratio: number; // 0-1
  readonly avg_novelty: number; // 0-100
  readonly final_score: number; // 0-100 (100 = très original)
}

/**
 * Score la nouveauté des métaphores.
 * ART-META-02: Zéro dead metaphor dans prose finale (post-correction).
 *
 * Formule:
 * - final_score = avg_novelty × (1 - dead_ratio)
 * - Si aucune métaphore → score 70 (neutre, pas pénalisé)
 *
 * @param metaphors - Array de MetaphorHit détectées
 * @param blacklist - Blacklist de dead metaphors (pas utilisé directement ici, déjà vérifié dans detector)
 * @returns MetaphorNoveltyResult
 */
export async function scoreMetaphorNovelty(
  metaphors: MetaphorHit[],
  blacklist: DeadMetaphor[],
): Promise<MetaphorNoveltyResult> {
  // Si aucune métaphore → score neutre 70
  if (metaphors.length === 0) {
    return {
      dead_count: 0,
      total_metaphors: 0,
      dead_ratio: 0,
      avg_novelty: 70,
      final_score: 70,
    };
  }

  // Count dead metaphors
  const dead_count = metaphors.filter((m) => m.is_dead).length;
  const total_metaphors = metaphors.length;
  const dead_ratio = total_metaphors > 0 ? dead_count / total_metaphors : 0;

  // Average novelty score
  const total_novelty = metaphors.reduce((sum, m) => sum + m.novelty_score, 0);
  const avg_novelty = total_novelty / total_metaphors;

  // Final score: penalize dead metaphors
  const final_score = Math.max(0, Math.min(100, avg_novelty * (1 - dead_ratio)));

  return {
    dead_count,
    total_metaphors,
    dead_ratio,
    avg_novelty,
    final_score,
  };
}
