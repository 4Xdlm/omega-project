/**
 * OMEGA Style Emergence Engine -- Variant Scorer
 * Phase C.3 -- Score variants by genome compliance + anti-detection
 */

import type { StyleGenomeInput } from '@omega/genesis-planner';
import type { StyleVariant, VariantScore, EConfig } from '../types.js';

export function scoreVariant(
  variant: StyleVariant,
  genome: StyleGenomeInput,
  config: EConfig,
): VariantScore {
  const dev = variant.style_profile.genome_deviation;
  const genomeCompliance = Math.max(0, 1 - dev.max_deviation);

  const antiIa = Math.max(0, 1 - variant.ia_score);

  const antiGenre = Math.max(0, 1 - variant.genre_specificity);

  const maxExpectedBanality = 5;
  const antiBanality = Math.max(0, 1 - (variant.banality_count / maxExpectedBanality));

  const cadenceTarget = genome.target_burstiness;
  const cadenceActual = variant.style_profile.cadence.coefficient_of_variation;
  const cadenceScore = Math.max(0, 1 - Math.abs(cadenceActual - cadenceTarget));

  const lexicalTarget = genome.target_lexical_richness;
  const lexicalActual = variant.style_profile.lexical.type_token_ratio;
  const lexicalScore = Math.max(0, 1 - Math.abs(lexicalActual - lexicalTarget));

  const wGenome = config.SCORE_WEIGHT_GENOME.value as number;
  const wAntiIa = config.SCORE_WEIGHT_ANTI_IA.value as number;
  const wAntiGenre = config.SCORE_WEIGHT_ANTI_GENRE.value as number;
  const wAntiBanality = config.SCORE_WEIGHT_ANTI_BANALITY.value as number;

  const composite = wGenome * genomeCompliance
    + wAntiIa * antiIa
    + wAntiGenre * antiGenre
    + wAntiBanality * antiBanality;

  return {
    variant_id: variant.variant_id,
    genome_compliance: genomeCompliance,
    anti_ia_score: antiIa,
    anti_genre_score: antiGenre,
    anti_banality_score: antiBanality,
    cadence_score: cadenceScore,
    lexical_score: lexicalScore,
    composite_score: composite,
  };
}
