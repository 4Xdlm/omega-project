/**
 * OMEGA Style Emergence Engine -- Variant Selector
 * Phase C.3 -- Deterministic selection with tiebreak rules
 */

import type { VariantScore } from '../types.js';

export function selectVariant(scores: readonly VariantScore[]): { selected_id: string; reason: string } {
  if (scores.length === 0) {
    return { selected_id: '', reason: 'no variants to select from' };
  }

  if (scores.length === 1) {
    return { selected_id: scores[0].variant_id, reason: 'single variant (no competition)' };
  }

  const sorted = [...scores].sort((a, b) => {
    if (b.composite_score !== a.composite_score) {
      return b.composite_score - a.composite_score;
    }
    if (b.anti_ia_score !== a.anti_ia_score) {
      return b.anti_ia_score - a.anti_ia_score;
    }
    if (b.genome_compliance !== a.genome_compliance) {
      return b.genome_compliance - a.genome_compliance;
    }
    return a.variant_id.localeCompare(b.variant_id);
  });

  const winner = sorted[0];
  const runnerUp = sorted[1];

  let reason: string;
  if (winner.composite_score > runnerUp.composite_score) {
    reason = `highest composite_score (${winner.composite_score.toFixed(4)})`;
  } else if (winner.anti_ia_score > runnerUp.anti_ia_score) {
    reason = `tiebreak: highest anti_ia_score (${winner.anti_ia_score.toFixed(4)})`;
  } else if (winner.genome_compliance > runnerUp.genome_compliance) {
    reason = `tiebreak: highest genome_compliance (${winner.genome_compliance.toFixed(4)})`;
  } else {
    reason = `tiebreak: lexicographic variant_id (${winner.variant_id})`;
  }

  return { selected_id: winner.variant_id, reason };
}
