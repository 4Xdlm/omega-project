/**
 * OMEGA Style Emergence Engine -- Tournament Runner
 * Phase C.3 -- Run full tournament across all paragraphs
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { ProseParagraph } from '@omega/scribe-engine';
import type { StyleGenomeInput, Constraints } from '@omega/genesis-planner';
import type { EConfig, TournamentResult, TournamentRound } from '../types.js';
import { generateVariants } from './variant-generator.js';
import { scoreVariant } from './variant-scorer.js';
import { selectVariant } from './variant-selector.js';

export function runTournament(
  paragraphs: readonly ProseParagraph[],
  genome: StyleGenomeInput,
  _constraints: Constraints,
  config: EConfig,
  timestamp: string,
): TournamentResult {
  const variantsPerParagraph = config.TOURNAMENT_VARIANTS_PER_PARAGRAPH.value as number;
  const rounds: TournamentRound[] = [];
  let totalVariantsGenerated = 0;
  let totalComposite = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const baseSeed = i * 104729;

    const variants = generateVariants(para, genome, variantsPerParagraph, baseSeed, timestamp);
    totalVariantsGenerated += variants.length;

    const scores = variants.map((v) => scoreVariant(v, genome, config));
    const { selected_id, reason } = selectVariant(scores);

    const selectedScore = scores.find((s) => s.variant_id === selected_id);
    if (selectedScore) {
      totalComposite += selectedScore.composite_score;
    }

    rounds.push({
      paragraph_id: para.paragraph_id,
      variants,
      scores,
      selected_variant_id: selected_id,
      selection_reason: reason,
    });
  }

  const avgComposite = rounds.length > 0 ? totalComposite / rounds.length : 0;

  const tournamentContent = canonicalize({
    rounds: rounds.map((r) => ({
      paragraph_id: r.paragraph_id,
      selected_variant_id: r.selected_variant_id,
      scores: r.scores,
    })),
  });
  const tournamentHash = sha256(tournamentContent);
  const tournamentId = `ETOURN-${tournamentHash.slice(0, 16)}`;

  return {
    tournament_id: tournamentId,
    tournament_hash: tournamentHash,
    rounds,
    total_variants_generated: totalVariantsGenerated,
    total_rounds: rounds.length,
    avg_composite_score: avgComposite,
  };
}
