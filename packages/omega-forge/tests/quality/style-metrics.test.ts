/**
 * OMEGA Forge — Style Metrics Tests (M6 + M7)
 * Phase C.5 — 8 tests
 */

import { describe, it, expect } from 'vitest';
import { computeM6, computeM7 } from '../../src/quality/style-metrics.js';
import { TIMESTAMP } from '../fixtures.js';
import type { StyledOutput } from '../../src/types.js';

function makeStyledOutput(overrides: {
  iaScore?: number;
  genreSpecificity?: number;
  burstinessDelta?: number;
  lexicalDelta?: number;
  voiceStability?: number;
}): StyledOutput {
  const {
    iaScore = 0.2,
    genreSpecificity = 0.3,
    burstinessDelta = 0.1,
    lexicalDelta = 0.1,
    voiceStability = 0.85,
  } = overrides;

  return {
    ia_detection: { score: iaScore, label: iaScore > 0.5 ? 'IA' : 'human', confidence: 0.9 },
    genre_detection: { genre: 'literary_fiction', specificity: genreSpecificity, confidence: 0.8 },
    global_profile: {
      profile_id: 'GP-1',
      profile_hash: 'gphash',
      cadence: { avg_sentence_length: 12, sentence_length_stddev: 4, coefficient_of_variation: 0.33, short_ratio: 0.3, long_ratio: 0.2, sentence_count: 20 },
      lexical: { type_token_ratio: 0.7, hapax_legomena_ratio: 0.3, rare_word_ratio: 0.1, consecutive_rare_count: 0, avg_word_length: 5, vocabulary_size: 200 },
      syntactic: { structure_distribution: { SVO: 0.6, inversion: 0.1, fragment: 0.1, question: 0.05, exclamation: 0.05, compound: 0.05, complex: 0.02, imperative: 0.02, passive: 0.01 }, unique_structures: 9, dominant_structure: 'SVO', dominant_ratio: 0.6, diversity_index: 0.7 },
      density: { description_density: 0.5, dialogue_ratio: 0.1, sensory_density: 0.3, action_density: 0.2, introspection_density: 0.2 },
      coherence: { style_drift: 0.1, max_local_drift: 0.15, voice_stability: voiceStability, outlier_paragraphs: [] },
      genome_deviation: { burstiness_delta: burstinessDelta, lexical_richness_delta: lexicalDelta, sentence_length_delta: 0.1, dialogue_ratio_delta: 0.02, description_density_delta: 0.05, max_deviation: 0.1, avg_deviation: 0.05, all_within_tolerance: true },
      timestamp_deterministic: TIMESTAMP,
    },
    banality_result: { total_banality: 2, banality_ratio: 0.1, flagged_paragraphs: [] },
    paragraphs: [],
  } as unknown as StyledOutput;
}

describe('computeM6 — style emergence', () => {
  it('returns high emergence for low IA and low genre specificity', () => {
    const output = makeStyledOutput({ iaScore: 0.1, genreSpecificity: 0.1 });
    const result = computeM6(output);
    expect(result).toBeGreaterThanOrEqual(0.8);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('returns low emergence for high IA score (imposed style)', () => {
    const output = makeStyledOutput({ iaScore: 0.9, genreSpecificity: 0.8 });
    const result = computeM6(output);
    expect(result).toBeLessThan(0.3);
  });

  it('handles edge case where both scores are 0', () => {
    const output = makeStyledOutput({ iaScore: 0, genreSpecificity: 0 });
    const result = computeM6(output);
    expect(result).toBe(1);
  });

  it('is deterministic across multiple calls', () => {
    const output = makeStyledOutput({ iaScore: 0.4, genreSpecificity: 0.5 });
    const r1 = computeM6(output);
    const r2 = computeM6(output);
    expect(r1).toBe(r2);
  });
});

describe('computeM7 — author fingerprint', () => {
  it('returns high uniqueness for distinctive style', () => {
    const output = makeStyledOutput({ burstinessDelta: 0.5, lexicalDelta: 0.5, voiceStability: 0.9 });
    const result = computeM7(output);
    expect(result).toBeGreaterThan(0.5);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('returns lower uniqueness for generic style', () => {
    const output = makeStyledOutput({ burstinessDelta: 0.0, lexicalDelta: 0.0, voiceStability: 0.1 });
    const result = computeM7(output);
    expect(result).toBeLessThan(0.5);
  });

  it('handles no profile deviation (no profile = zero deltas)', () => {
    const output = makeStyledOutput({ burstinessDelta: 0, lexicalDelta: 0, voiceStability: 0 });
    const result = computeM7(output);
    expect(result).toBe(0);
  });

  it('integration: M6 and M7 are independent metrics', () => {
    const output = makeStyledOutput({ iaScore: 0.1, genreSpecificity: 0.1, burstinessDelta: 0.3, lexicalDelta: 0.3, voiceStability: 0.8 });
    const m6 = computeM6(output);
    const m7 = computeM7(output);
    expect(typeof m6).toBe('number');
    expect(typeof m7).toBe('number');
    expect(m6).not.toBe(m7);
  });
});
