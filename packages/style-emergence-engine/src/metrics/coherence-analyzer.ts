/**
 * OMEGA Style Emergence Engine -- Coherence Analyzer
 * Phase C.3 -- Inter-paragraph style drift measurement
 */

import type { StyledParagraph, CoherenceProfile } from '../types.js';

function paragraphMetricVector(para: StyledParagraph): number[] {
  const profile = para.style_profile;
  return [
    profile.cadence.avg_sentence_length,
    profile.cadence.coefficient_of_variation,
    profile.lexical.type_token_ratio,
    profile.lexical.rare_word_ratio,
    profile.syntactic.diversity_index,
    profile.density.description_density,
  ];
}

function vectorDelta(a: number[], b: number[]): number {
  let sumSq = 0;
  for (let i = 0; i < a.length; i++) {
    const maxVal = Math.max(Math.abs(a[i]), Math.abs(b[i]), 1);
    const normalizedDiff = (a[i] - b[i]) / maxVal;
    sumSq += normalizedDiff ** 2;
  }
  return Math.sqrt(sumSq / a.length);
}

export function analyzeCoherence(paragraphs: readonly StyledParagraph[]): CoherenceProfile {
  if (paragraphs.length <= 1) {
    return {
      style_drift: 0,
      max_local_drift: 0,
      voice_stability: 1,
      outlier_paragraphs: [],
    };
  }

  const vectors = paragraphs.map(paragraphMetricVector);
  const deltas: number[] = [];

  for (let i = 1; i < vectors.length; i++) {
    deltas.push(vectorDelta(vectors[i - 1], vectors[i]));
  }

  const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const variance = deltas.reduce((acc, d) => acc + (d - meanDelta) ** 2, 0) / deltas.length;
  const stddev = Math.sqrt(variance);

  const maxDelta = Math.max(...deltas);
  const threshold = meanDelta + 2 * stddev;

  const outliers: string[] = [];
  for (let i = 0; i < deltas.length; i++) {
    if (deltas[i] > threshold && deltas[i] > 0) {
      outliers.push(paragraphs[i + 1].paragraph_id);
    }
  }

  const normalizedDrift = Math.min(1, stddev);
  const stability = 1 - normalizedDrift;

  return {
    style_drift: stddev,
    max_local_drift: maxDelta,
    voice_stability: stability,
    outlier_paragraphs: outliers,
  };
}
