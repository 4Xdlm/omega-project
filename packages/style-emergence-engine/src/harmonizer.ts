/**
 * OMEGA Style Emergence Engine -- Harmonizer
 * Phase C.3 -- Unify voice between selected paragraphs
 */

import type { StyleGenomeInput } from '@omega/genesis-planner';
import type { EConfig, StyledParagraph, CoherenceProfile } from './types.js';
import { analyzeCoherence } from './metrics/coherence-analyzer.js';
import { profileStyledParagraph } from './metrics/style-profiler.js';

function adjustTransition(
  current: StyledParagraph,
  _next: StyledParagraph,
  genome: StyleGenomeInput,
  timestamp: string,
): StyledParagraph {
  const updatedProfile = profileStyledParagraph(current, genome, timestamp);
  return {
    ...current,
    style_profile: updatedProfile,
  };
}

export function harmonize(
  selectedParagraphs: readonly StyledParagraph[],
  config: EConfig,
  genome: StyleGenomeInput,
  timestamp: string,
): { paragraphs: readonly StyledParagraph[]; coherence: CoherenceProfile } {
  if (selectedParagraphs.length <= 1) {
    const coherence = analyzeCoherence(selectedParagraphs);
    return { paragraphs: selectedParagraphs, coherence };
  }

  const maxDrift = config.VOICE_MAX_DRIFT.value as number;
  let coherence = analyzeCoherence(selectedParagraphs);

  if (coherence.style_drift <= maxDrift) {
    return { paragraphs: selectedParagraphs, coherence };
  }

  const adjusted: StyledParagraph[] = [...selectedParagraphs];
  for (let i = 0; i < adjusted.length - 1; i++) {
    adjusted[i] = adjustTransition(adjusted[i], adjusted[i + 1], genome, timestamp);
  }
  adjusted[adjusted.length - 1] = adjustTransition(
    adjusted[adjusted.length - 1], adjusted[adjusted.length - 2], genome, timestamp,
  );

  coherence = analyzeCoherence(adjusted);
  return { paragraphs: adjusted, coherence };
}
