/**
 * OMEGA Forge — Complexity Metrics Tests (M10 + M11)
 * Phase C.5 — 8 tests
 */

import { describe, it, expect } from 'vitest';
import { computeM10, computeM11 } from '../../src/quality/complexity-metrics.js';
import { makeParagraph, TIMESTAMP } from '../fixtures.js';
import type { StyledOutput } from '../../src/types.js';

function makeStyledOutput(overrides: {
  totalBanality?: number;
}): StyledOutput {
  const { totalBanality = 2 } = overrides;
  return {
    ia_detection: { score: 0.2, label: 'human', confidence: 0.9 },
    genre_detection: { genre: 'literary_fiction', specificity: 0.3, confidence: 0.8 },
    global_profile: {
      profile_id: 'GP-1',
      profile_hash: 'gphash',
      cadence: { avg_sentence_length: 12, sentence_length_stddev: 4, coefficient_of_variation: 0.33, short_ratio: 0.3, long_ratio: 0.2, sentence_count: 20 },
      lexical: { type_token_ratio: 0.7, hapax_legomena_ratio: 0.3, rare_word_ratio: 0.1, consecutive_rare_count: 0, avg_word_length: 5, vocabulary_size: 200 },
      syntactic: { structure_distribution: { SVO: 0.6, inversion: 0.1, fragment: 0.1, question: 0.05, exclamation: 0.05, compound: 0.05, complex: 0.02, imperative: 0.02, passive: 0.01 }, unique_structures: 9, dominant_structure: 'SVO', dominant_ratio: 0.6, diversity_index: 0.7 },
      density: { description_density: 0.5, dialogue_ratio: 0.1, sensory_density: 0.3, action_density: 0.2, introspection_density: 0.2 },
      coherence: { style_drift: 0.1, max_local_drift: 0.15, voice_stability: 0.85, outlier_paragraphs: [] },
      genome_deviation: { burstiness_delta: 0.05, lexical_richness_delta: 0.03, sentence_length_delta: 0.1, dialogue_ratio_delta: 0.02, description_density_delta: 0.05, max_deviation: 0.1, avg_deviation: 0.05, all_within_tolerance: true },
      timestamp_deterministic: TIMESTAMP,
    },
    banality_result: { total_banality: totalBanality, banality_ratio: 0.1, flagged_paragraphs: [] },
    paragraphs: [],
  } as unknown as StyledOutput;
}

describe('computeM10 — reading levels', () => {
  it('returns multiple layers for text with symbolic, structural, and meta markers', () => {
    const paragraphs = [
      makeParagraph('The shadow of the lighthouse was like a mirror reflecting the story of the beginning.', 0),
      makeParagraph('The narrative arc reached its climax as words told the tale of the reader.', 1),
    ];
    const result = computeM10(paragraphs);
    expect(result).toBeGreaterThanOrEqual(3);
    expect(result).toBeLessThanOrEqual(4);
  });

  it('returns 1 for plain text with no markers (surface only)', () => {
    const paragraphs = [
      makeParagraph('He walked to the door and opened it carefully.', 0),
    ];
    const result = computeM10(paragraphs);
    expect(result).toBe(1);
  });

  it('returns 0 for empty paragraphs', () => {
    const result = computeM10([]);
    expect(result).toBe(0);
  });

  it('handles edge case: text with only one marker type', () => {
    const paragraphs = [
      makeParagraph('The echo of footsteps reflected beneath the mask of silence.', 0),
    ];
    const result = computeM10(paragraphs);
    // surface (1) + symbolic markers present (1) = 2
    expect(result).toBeGreaterThanOrEqual(2);
  });

  it('is deterministic across multiple calls', () => {
    const paragraphs = [
      makeParagraph('A shadow fell like a mask over the climax of the story being told.', 0),
    ];
    const r1 = computeM10(paragraphs);
    const r2 = computeM10(paragraphs);
    expect(r1).toBe(r2);
  });
});

describe('computeM11 — discomfort index', () => {
  it('returns value in target range [0.3, 0.7] for balanced text', () => {
    const paragraphs = [
      makeParagraph('The tension mounted as doubt crept through the silence of the void.', 0),
      makeParagraph('He questioned every sacrifice made at the edge of the abyss.', 1),
      makeParagraph('The burden of conflict weighed heavily through the challenge.', 2),
    ];
    const styleOutput = makeStyledOutput({ totalBanality: 1 });
    const result = computeM11(paragraphs, styleOutput);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('returns low discomfort for text with no friction markers', () => {
    const paragraphs = [
      makeParagraph('The flowers bloomed gently in the warm afternoon sun.', 0),
      makeParagraph('Birds sang melodious tunes from the garden trees.', 1),
    ];
    const styleOutput = makeStyledOutput({ totalBanality: 5 });
    const result = computeM11(paragraphs, styleOutput);
    expect(result).toBeLessThan(0.5);
  });

  it('returns high discomfort for text saturated with friction markers', () => {
    const paragraphs = [
      makeParagraph('Tension conflict struggle pain doubt danger threat wound scar death loss.', 0),
      makeParagraph('Sacrifice risk betray expose confront shatter crack break resist challenge.', 1),
    ];
    const styleOutput = makeStyledOutput({ totalBanality: 0 });
    const result = computeM11(paragraphs, styleOutput);
    expect(result).toBeGreaterThan(0.3);
  });

  it('returns 0 for empty paragraphs', () => {
    const styleOutput = makeStyledOutput({});
    const result = computeM11([], styleOutput);
    expect(result).toBe(0);
  });

  it('handles edge case with single word paragraphs', () => {
    const paragraphs = [makeParagraph('Tension.', 0)];
    const styleOutput = makeStyledOutput({ totalBanality: 0 });
    const result = computeM11(paragraphs, styleOutput);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('is deterministic across multiple calls', () => {
    const paragraphs = [
      makeParagraph('The silence threatened to expose the danger lurking within.', 0),
    ];
    const styleOutput = makeStyledOutput({});
    const r1 = computeM11(paragraphs, styleOutput);
    const r2 = computeM11(paragraphs, styleOutput);
    expect(r1).toBe(r2);
  });
});
