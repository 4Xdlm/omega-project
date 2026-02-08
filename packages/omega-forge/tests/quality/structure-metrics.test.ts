/**
 * OMEGA Forge — Structure Metrics Tests (M3 + M4 + M5)
 * Phase C.5 — 8 tests
 */

import { describe, it, expect } from 'vitest';
import { computeM3, computeM4, computeM5 } from '../../src/quality/structure-metrics.js';
import { makeParagraph } from '../fixtures.js';
import type { GenesisPlan } from '../../src/types.js';

const mockPlan: GenesisPlan = {
  plan_id: 'P1',
  plan_hash: 'h1',
  version: '1.0.0',
  intent_hash: '',
  canon_hash: '',
  constraints_hash: '',
  genome_hash: '',
  emotion_hash: '',
  arcs: [
    {
      arc_id: 'ARC-1',
      theme: 'isolation fear',
      progression: 'ascending',
      scenes: [],
      justification: 'test',
    },
  ],
  seed_registry: [],
  tension_curve: [],
  emotion_trajectory: [],
  scene_count: 0,
  beat_count: 0,
  estimated_word_count: 0,
};

describe('computeM3 — coherence span', () => {
  it('returns a coherent span when paragraphs share keywords', () => {
    const paragraphs = [
      makeParagraph('The lighthouse stood against the storm and the wind howled.', 0),
      makeParagraph('Against the storm the lighthouse keeper watched the horizon.', 1),
      makeParagraph('The lighthouse beam cut through the storm and darkness.', 2),
    ];
    const result = computeM3(paragraphs);
    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe('number');
  });

  it('returns word count for a single paragraph', () => {
    const paragraphs = [makeParagraph('A single paragraph with several words in it.', 0)];
    const result = computeM3(paragraphs);
    expect(result).toBe(paragraphs[0].word_count);
  });

  it('is deterministic across multiple calls', () => {
    const paragraphs = [
      makeParagraph('The storm raged on the dark ocean waves.', 0),
      makeParagraph('Dark ocean waves crashed against the rocky shore.', 1),
    ];
    const r1 = computeM3(paragraphs);
    const r2 = computeM3(paragraphs);
    expect(r1).toBe(r2);
  });
});

describe('computeM4 — arc maintenance', () => {
  it('counts arcs whose themes appear in text', () => {
    const paragraphs = [
      makeParagraph('The isolation was complete and fear crept in slowly.', 0),
      makeParagraph('Fear of the unknown consumed the keeper.', 1),
    ];
    const result = computeM4(paragraphs, mockPlan);
    expect(result).toBe(1);
  });

  it('returns 0 when plan has no arcs', () => {
    const emptyPlan: GenesisPlan = { ...mockPlan, arcs: [] };
    const paragraphs = [makeParagraph('Some text here about isolation.', 0)];
    const result = computeM4(paragraphs, emptyPlan);
    expect(result).toBe(0);
  });
});

describe('computeM5 — memory integrity', () => {
  it('returns high integrity when coherence is maintained', () => {
    const paragraphs = [
      makeParagraph('The lighthouse keeper watched the dark ocean waves breaking.', 0),
      makeParagraph('Dark ocean waves carried secrets from the depths below.', 1),
      makeParagraph('From the depths below came sounds that chilled the keeper.', 2),
      makeParagraph('The keeper listened to the sounds from the dark ocean.', 3),
    ];
    const result = computeM5(paragraphs);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('handles degradation when second half loses coherence', () => {
    const paragraphs = [
      makeParagraph('The lighthouse keeper maintained the light every night.', 0),
      makeParagraph('Every night the lighthouse keeper would climb the stairs.', 1),
      makeParagraph('Completely different topic about cooking recipes and spices.', 2),
      makeParagraph('Basketball tournament results from the weekend games.', 3),
    ];
    const result = computeM5(paragraphs);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('handles edge case with two or fewer paragraphs', () => {
    const paragraphs = [
      makeParagraph('Just one paragraph.', 0),
      makeParagraph('And another one.', 1),
    ];
    const result = computeM5(paragraphs);
    expect(result).toBe(1);
  });

  it('is deterministic across multiple calls', () => {
    const paragraphs = [
      makeParagraph('The ocean stretched far and wide across the horizon.', 0),
      makeParagraph('Across the horizon the ocean met the darkening sky.', 1),
      makeParagraph('The darkening sky promised another storm was coming.', 2),
      makeParagraph('Another storm was coming and the keeper prepared.', 3),
    ];
    const r1 = computeM5(paragraphs);
    const r2 = computeM5(paragraphs);
    expect(r1).toBe(r2);
  });
});
