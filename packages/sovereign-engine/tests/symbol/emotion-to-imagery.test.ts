/**
 * Tests pour emotion-to-imagery (100% CALC, déterministe)
 */

import { describe, it, expect } from 'vitest';
import { computeImagerySeed } from '../../src/symbol/emotion-to-imagery.js';
import type { EmotionQuartile } from '../../src/types.js';

describe('computeImagerySeed', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // MAPPING VALENCE/AROUSAL → IMAGERY
  // ═══════════════════════════════════════════════════════════════════════════

  it('valence négative + arousal élevé → obscurité + mécanique', () => {
    const quartile: EmotionQuartile = {
      quartile: 'Q1',
      target_14d: {},
      valence: -0.5,
      arousal: 0.7,
      dominant: 'fear',
      narrative_instruction: 'test',
    };

    const seed = computeImagerySeed(quartile);

    expect(seed.imagery_modes).toEqual(['obscurité', 'mécanique']);
  });

  it('valence négative + arousal bas → souterrain + minéral', () => {
    const quartile: EmotionQuartile = {
      quartile: 'Q1',
      target_14d: {},
      valence: -0.5,
      arousal: 0.3,
      dominant: 'sadness',
      narrative_instruction: 'test',
    };

    const seed = computeImagerySeed(quartile);

    expect(seed.imagery_modes).toEqual(['souterrain', 'minéral']);
  });

  it('valence positive + arousal élevé → lumière + aérien', () => {
    const quartile: EmotionQuartile = {
      quartile: 'Q1',
      target_14d: {},
      valence: 0.5,
      arousal: 0.7,
      dominant: 'joy',
      narrative_instruction: 'test',
    };

    const seed = computeImagerySeed(quartile);

    expect(seed.imagery_modes).toEqual(['lumière', 'aérien']);
  });

  it('valence positive + arousal bas → végétal + chaleur', () => {
    const quartile: EmotionQuartile = {
      quartile: 'Q1',
      target_14d: {},
      valence: 0.5,
      arousal: 0.3,
      dominant: 'trust',
      narrative_instruction: 'test',
    };

    const seed = computeImagerySeed(quartile);

    expect(seed.imagery_modes).toEqual(['végétal', 'chaleur']);
  });

  it('valence neutre + arousal élevé → mécanique + liquide', () => {
    const quartile: EmotionQuartile = {
      quartile: 'Q1',
      target_14d: {},
      valence: 0.1,
      arousal: 0.7,
      dominant: 'surprise',
      narrative_instruction: 'test',
    };

    const seed = computeImagerySeed(quartile);

    expect(seed.imagery_modes).toEqual(['mécanique', 'liquide']);
  });

  it('valence neutre + arousal bas → organique + minéral', () => {
    const quartile: EmotionQuartile = {
      quartile: 'Q1',
      target_14d: {},
      valence: 0.0,
      arousal: 0.4,
      dominant: 'anticipation',
      narrative_instruction: 'test',
    };

    const seed = computeImagerySeed(quartile);

    expect(seed.imagery_modes).toEqual(['organique', 'minéral']);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MAPPING AROUSAL → SYNTAX
  // ═══════════════════════════════════════════════════════════════════════════

  it('arousal > 0.7 → short_ratio 0.6, fragmenté', () => {
    const quartile: EmotionQuartile = {
      quartile: 'Q1',
      target_14d: {},
      valence: 0,
      arousal: 0.8,
      dominant: 'anger',
      narrative_instruction: 'test',
    };

    const seed = computeImagerySeed(quartile);

    expect(seed.syntax_profile.short_ratio).toBe(0.6);
    expect(seed.syntax_profile.avg_len_target).toBe(8);
    expect(seed.syntax_profile.punctuation_style).toBe('fragmenté');
  });

  it('arousal 0.5 → short_ratio 0.3, standard', () => {
    const quartile: EmotionQuartile = {
      quartile: 'Q1',
      target_14d: {},
      valence: 0,
      arousal: 0.5,
      dominant: 'fear',
      narrative_instruction: 'test',
    };

    const seed = computeImagerySeed(quartile);

    expect(seed.syntax_profile.short_ratio).toBe(0.3);
    expect(seed.syntax_profile.avg_len_target).toBe(15);
    expect(seed.syntax_profile.punctuation_style).toBe('standard');
  });

  it('arousal 0.2 → short_ratio 0.1, dense', () => {
    const quartile: EmotionQuartile = {
      quartile: 'Q1',
      target_14d: {},
      valence: 0,
      arousal: 0.2,
      dominant: 'sadness',
      narrative_instruction: 'test',
    };

    const seed = computeImagerySeed(quartile);

    expect(seed.syntax_profile.short_ratio).toBe(0.1);
    expect(seed.syntax_profile.avg_len_target).toBe(22);
    expect(seed.syntax_profile.punctuation_style).toBe('dense');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MAPPING DOMINANT → INTERIORITY
  // ═══════════════════════════════════════════════════════════════════════════

  it('sadness → interiority 0.8', () => {
    const quartile: EmotionQuartile = {
      quartile: 'Q1',
      target_14d: {},
      valence: -0.4,
      arousal: 0.3,
      dominant: 'sadness',
      narrative_instruction: 'test',
    };

    const seed = computeImagerySeed(quartile);

    expect(seed.interiority_ratio).toBe(0.8);
  });

  it('anger → interiority 0.3', () => {
    const quartile: EmotionQuartile = {
      quartile: 'Q1',
      target_14d: {},
      valence: -0.3,
      arousal: 0.7,
      dominant: 'anger',
      narrative_instruction: 'test',
    };

    const seed = computeImagerySeed(quartile);

    expect(seed.interiority_ratio).toBe(0.3);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DÉTERMINISME
  // ═══════════════════════════════════════════════════════════════════════════

  it('DÉTERMINISME — même input 3 fois → même output', () => {
    const quartile: EmotionQuartile = {
      quartile: 'Q1',
      target_14d: {},
      valence: -0.5,
      arousal: 0.6,
      dominant: 'fear',
      narrative_instruction: 'test',
    };

    const seed1 = computeImagerySeed(quartile);
    const seed2 = computeImagerySeed(quartile);
    const seed3 = computeImagerySeed(quartile);

    expect(seed1).toEqual(seed2);
    expect(seed2).toEqual(seed3);
    expect(seed1.imagery_modes).toEqual(seed2.imagery_modes);
    expect(seed1.syntax_profile).toEqual(seed2.syntax_profile);
    expect(seed1.interiority_ratio).toBe(seed2.interiority_ratio);
  });
});
