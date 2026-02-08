/**
 * OMEGA Forge — Style Metrics (M6 + M7)
 * Phase C.5 — Style emergence + author fingerprint
 * Consumes C.3 detection results.
 */

import type { StyledOutput } from '../types.js';

/**
 * M6: Style emergence — 1 = fully emergent (not imposed)
 * Computed from C.3 IA detection and genre detection.
 * Lower IA score + lower genre specificity = more emergent.
 */
export function computeM6(styleOutput: StyledOutput): number {
  const iaScore = styleOutput.ia_detection.score;
  const genreSpec = styleOutput.genre_detection.specificity;

  const iaEmergence = 1 - iaScore;
  const genreEmergence = 1 - genreSpec;

  return (iaEmergence + genreEmergence) / 2;
}

/**
 * M7: Author fingerprint distance.
 * Measures how far the style is from generic/IA patterns.
 * Higher = more unique/human-like.
 */
export function computeM7(styleOutput: StyledOutput): number {
  const profile = styleOutput.global_profile;
  const dev = profile.genome_deviation;

  const burstiness = Math.abs(dev.burstiness_delta);
  const lexical = Math.abs(dev.lexical_richness_delta);
  const voiceStability = profile.coherence.voice_stability;

  const uniqueness = Math.min(1, (burstiness + lexical) / 2 + voiceStability * 0.5);
  return uniqueness;
}
