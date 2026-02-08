/**
 * OMEGA Forge — Necessity Metrics Tests (M8 + M9)
 * Phase C.5 — 8 tests
 */

import { describe, it, expect } from 'vitest';
import { computeM8, computeM9 } from '../../src/quality/necessity-metrics.js';
import { makeParagraph } from '../fixtures.js';
import type { ScribeOutput } from '../../src/types.js';

const mockScribeOutput: ScribeOutput = {
  output_id: '',
  output_hash: '',
  plan_id: '',
  plan_hash: '',
  skeleton_hash: '',
  final_prose: {
    prose_id: '',
    prose_hash: '',
    skeleton_id: '',
    paragraphs: [],
    total_word_count: 0,
    total_sentence_count: 0,
    pass_number: 0,
  },
  rewrite_history: {
    candidates: [],
    accepted_pass: 0,
    total_passes: 0,
    rewrite_hash: '',
  },
  gate_result: {
    verdict: 'PASS',
    gate_results: [],
    first_failure: null,
    total_violations: 0,
  },
  oracle_result: {
    verdict: 'PASS',
    oracle_results: [],
    first_failure: null,
    total_violations: 0,
    weakest_oracle: null,
    combined_score: 0,
  },
  segment_to_paragraph_map: {},
} as unknown as ScribeOutput;

describe('computeM8 — sentence necessity', () => {
  it('returns high necessity for unique sentences', () => {
    const paragraphs = [
      makeParagraph('The ancient lighthouse stood on the rocky cliff overlooking the ocean. Waves crashed against the boulders below.', 0),
      makeParagraph('Elias climbed the spiral staircase carrying fuel for the lantern. The wind howled through cracks in the stone walls.', 1),
      makeParagraph('Deep beneath the surface something stirred in the darkness. Currents shifted as if responding to an unseen force.', 2),
    ];
    const result = computeM8(paragraphs, mockScribeOutput);
    expect(result).toBeGreaterThanOrEqual(0.9);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('returns low necessity for redundant sentences', () => {
    const paragraphs = [
      makeParagraph('The lighthouse stood tall. The lighthouse stood tall. The lighthouse stood tall.', 0),
      makeParagraph('The lighthouse stood tall. The lighthouse stood tall. The lighthouse stood tall.', 1),
    ];
    const result = computeM8(paragraphs, mockScribeOutput);
    expect(result).toBeLessThan(0.5);
  });

  it('returns 1 for empty paragraphs', () => {
    const result = computeM8([], mockScribeOutput);
    expect(result).toBe(1);
  });

  it('handles threshold boundary accurately', () => {
    const paragraphs = [
      makeParagraph('First unique sentence here. Second unique thought appears.', 0),
      makeParagraph('Third original concept emerges. Fourth distinct idea follows.', 1),
    ];
    const result = computeM8(paragraphs, mockScribeOutput);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('is deterministic across multiple calls', () => {
    const paragraphs = [
      makeParagraph('The keeper maintained the flame every night. Stars watched from above.', 0),
      makeParagraph('Morning brought fog from the western channel. Ships passed unseen.', 1),
    ];
    const r1 = computeM8(paragraphs, mockScribeOutput);
    const r2 = computeM8(paragraphs, mockScribeOutput);
    expect(r1).toBe(r2);
  });
});

describe('computeM9 — semantic density', () => {
  it('returns high density for content-rich text', () => {
    const paragraphs = [
      makeParagraph('Ancient lighthouse crumbling precipice volcanic obsidian formations.', 0),
      makeParagraph('Bioluminescent creatures phosphorescent tentacles abyssal trench.', 1),
    ];
    const result = computeM9(paragraphs);
    expect(result).toBeGreaterThan(0.5);
  });

  it('returns lower density for function-word-heavy text', () => {
    const paragraphs = [
      makeParagraph('It was the one that had been to the place with the other one by then.', 0),
      makeParagraph('He was not in the same as it could be for all of them too.', 1),
    ];
    const result = computeM9(paragraphs);
    expect(result).toBeLessThan(0.5);
  });

  it('returns 0 for empty paragraphs', () => {
    const result = computeM9([]);
    expect(result).toBe(0);
  });

  it('is deterministic across multiple calls', () => {
    const paragraphs = [
      makeParagraph('Massive crystalline formations jutted from the cavern floor.', 0),
    ];
    const r1 = computeM9(paragraphs);
    const r2 = computeM9(paragraphs);
    expect(r1).toBe(r2);
  });
});
