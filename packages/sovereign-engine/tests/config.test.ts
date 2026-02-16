/**
 * Tests for SOVEREIGN_CONFIG — verify critical constants
 */

import { describe, it, expect } from 'vitest';
import { SOVEREIGN_CONFIG } from '../src/config.js';

describe('SOVEREIGN_CONFIG', () => {
  it('SOVEREIGN_THRESHOLD = 92 (non-negotiable)', () => {
    expect(SOVEREIGN_CONFIG.SOVEREIGN_THRESHOLD).toBe(92);
  });

  it('EMOTION_WEIGHT_PCT = 63.3%', () => {
    expect(SOVEREIGN_CONFIG.EMOTION_WEIGHT_PCT).toBeCloseTo(63.3, 1);
  });

  it('MAX_CORRECTION_PASSES = 2', () => {
    expect(SOVEREIGN_CONFIG.MAX_CORRECTION_PASSES).toBe(2);
  });

  it('GINI_OPTIMAL = 0.45', () => {
    expect(SOVEREIGN_CONFIG.GINI_OPTIMAL).toBe(0.45);
  });

  it('AXIS_FLOOR = 50', () => {
    expect(SOVEREIGN_CONFIG.AXIS_FLOOR).toBe(50);
  });

  it('REJECT_BELOW = 60', () => {
    expect(SOVEREIGN_CONFIG.REJECT_BELOW).toBe(60);
  });

  it('poids émotionnels totalisent 9.5 / 15.0', () => {
    const emotionWeight =
      SOVEREIGN_CONFIG.WEIGHTS.interiority +
      SOVEREIGN_CONFIG.WEIGHTS.tension_14d +
      SOVEREIGN_CONFIG.WEIGHTS.emotion_coherence +
      SOVEREIGN_CONFIG.WEIGHTS.impact;

    expect(emotionWeight).toBe(9.5);
  });

  it('poids totaux = 15.0', () => {
    const totalWeight = Object.values(SOVEREIGN_CONFIG.WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(totalWeight).toBe(15.0);
  });
});

describe('SOVEREIGN_CONFIG — MACRO v3', () => {
  it('MACRO_WEIGHTS sum = 1.0', () => {
    const sum =
      SOVEREIGN_CONFIG.MACRO_WEIGHTS.ecc +
      SOVEREIGN_CONFIG.MACRO_WEIGHTS.rci +
      SOVEREIGN_CONFIG.MACRO_WEIGHTS.sii +
      SOVEREIGN_CONFIG.MACRO_WEIGHTS.ifi +
      SOVEREIGN_CONFIG.MACRO_WEIGHTS.aai; // Sprint 11
    expect(sum).toBe(1.0);
  });

  it('MACRO_AXIS_FLOOR = 85', () => {
    expect(SOVEREIGN_CONFIG.MACRO_AXIS_FLOOR).toBe(85);
  });

  it('ECC_FLOOR = 88', () => {
    expect(SOVEREIGN_CONFIG.ECC_FLOOR).toBe(88);
  });

  it('ECC_MAX_TOTAL_BONUS = 3 (anti-gaming cap)', () => {
    expect(SOVEREIGN_CONFIG.ECC_MAX_TOTAL_BONUS).toBe(3);
  });

  it('CORPOREAL_MARKERS contient 31 éléments (FR PREMIUM)', () => {
    expect(SOVEREIGN_CONFIG.CORPOREAL_MARKERS).toHaveLength(31);
  });

  it('SYMBOL_MAX_REGEN = 2', () => {
    expect(SOVEREIGN_CONFIG.SYMBOL_MAX_REGEN).toBe(2);
  });

  it('MACRO_WEIGHTS.ecc = 0.33 (33% emotion, Sprint 11 adjusted)', () => {
    expect(SOVEREIGN_CONFIG.MACRO_WEIGHTS.ecc).toBe(0.33);
  });

  it('ZONES.GREEN défini correctement', () => {
    expect(SOVEREIGN_CONFIG.ZONES.GREEN.min_composite).toBe(92);
    expect(SOVEREIGN_CONFIG.ZONES.GREEN.min_axis).toBe(85);
    expect(SOVEREIGN_CONFIG.ZONES.GREEN.min_ecc).toBe(88);
  });

  it('ZONES.YELLOW défini correctement', () => {
    expect(SOVEREIGN_CONFIG.ZONES.YELLOW.min_composite).toBe(85);
    expect(SOVEREIGN_CONFIG.ZONES.YELLOW.min_axis).toBe(75);
  });

  it('RCI_PERFECT_PENALTY = -5', () => {
    expect(SOVEREIGN_CONFIG.RCI_PERFECT_PENALTY).toBe(-5);
  });
});
