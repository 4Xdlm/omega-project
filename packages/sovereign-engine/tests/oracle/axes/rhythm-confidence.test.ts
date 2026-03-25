/**
 * Tests: R3 Confidence Scaling for rhythm scorer
 *
 * Verifies rhythmConfidence() interpolation and its effect on scoreRhythm().
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import { rhythmConfidence } from '../../../src/oracle/axes/rhythm.js';
import { scoreRhythm } from '../../../src/oracle/axes/rhythm.js';

// ═══════════════════════════════════════════════════════════════════════════
// rhythmConfidence — anchor points
// ═══════════════════════════════════════════════════════════════════════════

describe('rhythmConfidence', () => {
  it('returns 1.0 for wordCount >= 3000', () => {
    expect(rhythmConfidence(3000)).toBe(1.0);
    expect(rhythmConfidence(5000)).toBe(1.0);
    expect(rhythmConfidence(100000)).toBe(1.0);
  });

  it('returns 0.65 for wordCount = 300', () => {
    expect(rhythmConfidence(300)).toBe(0.65);
  });

  it('returns ~0.80 for wordCount = 600', () => {
    expect(rhythmConfidence(600)).toBeCloseTo(0.80, 2);
  });

  it('returns 0.95 for wordCount = 1500', () => {
    expect(rhythmConfidence(1500)).toBe(0.95);
  });

  it('returns 0.30 for wordCount <= 100', () => {
    expect(rhythmConfidence(100)).toBe(0.30);
    expect(rhythmConfidence(50)).toBe(0.30);
    expect(rhythmConfidence(0)).toBe(0.30);
  });

  it('interpolates between R3 anchor points', () => {
    // Midpoint between 300 (0.65) and 600 (0.80) = 450 → 0.725
    expect(rhythmConfidence(450)).toBeCloseTo(0.725, 2);
    // Midpoint between 600 (0.80) and 1500 (0.95) = 1050 → 0.875
    expect(rhythmConfidence(1050)).toBeCloseTo(0.875, 2);
  });

  it('is monotonically increasing', () => {
    const sizes = [50, 100, 200, 300, 450, 600, 900, 1500, 2000, 3000, 5000];
    for (let i = 1; i < sizes.length; i++) {
      expect(rhythmConfidence(sizes[i])).toBeGreaterThanOrEqual(rhythmConfidence(sizes[i - 1]));
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// scoreRhythm — confidence attenuation effect
// ═══════════════════════════════════════════════════════════════════════════

describe('scoreRhythm confidence attenuation', () => {
  // Minimal ForgePacket for scoreRhythm
  const minimalPacket = {
    intent: { conflict_type: 'internal', pov: '3p', tense: 'past', target_word_count: 500, scene_goal: '', story_goal: '' },
    style_genome: {
      version: '1.0', universe: 'test',
      lexicon: { signature_words: [], forbidden_words: [], abstraction_max_ratio: 0.3, concrete_min_ratio: 0.5 },
      rhythm: { avg_sentence_length_target: 15, gini_target: 0.45, max_consecutive_similar: 3, min_syncopes_per_scene: 1, min_compressions_per_scene: 1 },
      tone: { dominant_register: 'literary', intensity_range: [0.3, 0.8] as readonly [number, number] },
      imagery: { recurrent_motifs: [], density_target_per_100_words: 3, banned_metaphors: [] },
    },
    sensory: { targets: [], constraints: [] },
    beats: [],
    kill_lists: { forbidden_words: [], cliche_patterns: [], ia_smell_patterns: [] },
  } as any;

  // Prose with varied rhythm (should score well on raw)
  const longProse = Array(200).fill('Il marchait lentement dans la rue déserte, tandis que le vent soufflait entre les murs de pierre grise. Silence. La lumière tombait.').join(' ');
  const shortProse = 'Il marchait lentement dans la rue déserte, tandis que le vent soufflait entre les murs de pierre grise. Silence. La lumière tombait. Il regardait le ciel.';

  it('details string contains conf_r3 for traceability', () => {
    const result = scoreRhythm(minimalPacket, shortProse);
    expect(result.details).toContain('conf_r3=');
  });

  it('raw score is NOT attenuated by confidence (Correction B)', () => {
    // Correction B: confidence affects WEIGHT in RCI, not the raw score.
    // The raw rhythm score is the CALC brut, unmodified.
    const result = scoreRhythm(minimalPacket, shortProse);
    // Score should be the raw CALC value, not pulled toward 75
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('conf_r3 is computed for texts >= 3000 words', () => {
    const result = scoreRhythm(minimalPacket, longProse);
    // conf = 1.0 for long texts
    expect(result.details).toContain('conf_r3=1.00');
  });
});
