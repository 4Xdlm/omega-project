// tests/oracle/calc-judges/show-tell-detector.test.ts
// INV-SDT-PROXY-01 + INV-SOMA-01 — 8 tests CALC deterministes
// W1 — Phase T

import { describe, it, expect } from 'vitest';
import { calculateShowTellScore } from '../../../src/oracle/calc-judges/show-tell-detector.js';

describe('show-tell-detector — INV-SDT-PROXY-01 + INV-SOMA-01', () => {

  // Test 1: prose propre → aucun pattern detecte
  it('prose clean → score = 1.0, zero violations', () => {
    const result = calculateShowTellScore(
      'Le vent traversait la rue étroite. Les pavés luisaient sous la pluie.',
    );
    expect(result.score).toBe(1.0);
    expect(result.violations_sdt).toBe(0);
    expect(result.violations_soma).toBe(0);
  });

  // Test 2: label emotionnel explicite (INV-SDT-PROXY-01 pattern 1)
  it('label émotionnel explicite → violations_sdt ≥ 1', () => {
    const result = calculateShowTellScore('Il était terrifié par le bruit.');
    expect(result.violations_sdt).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThan(1.0);
  });

  // Test 3: ordre interdit label→sensation (INV-SDT-PROXY-01 pattern 2)
  it('ordre interdit label→sensation → violations_sdt ≥ 1', () => {
    const result = calculateShowTellScore(
      'La peur envahit ses pensées, ses mains se crispèrent.',
    );
    expect(result.violations_sdt).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThan(1.0);
  });

  // Test 4: anatomie generique (INV-SOMA-01)
  it('anatomie générique → violations_soma ≥ 1', () => {
    const result = calculateShowTellScore(
      'Son cœur battait à tout rompre dans sa poitrine.',
    );
    expect(result.violations_soma).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThan(1.0);
  });

  // Test 5: multi-violations — formule penalty coherente
  // Prose choisie: label (0.15) + anatomie (0.10), SANS forbidden_order (0.20)
  it('multi-violations → penalty = violations_sdt * 0.15 + violations_soma * 0.10', () => {
    const result = calculateShowTellScore(
      'Elle était triste. Son cœur s\'emballa.',
    );
    const expectedPenalty = result.violations_sdt * 0.15 + result.violations_soma * 0.10;
    expect(result.penalty_total).toBeCloseTo(expectedPenalty, 5);
  });

  // Test 6: score clamp minimum 0
  it('score clamped à 0 minimum (jamais négatif)', () => {
    const prose = [
      'Il était terrifié.',
      'Il semblait effrayé.',
      'Il paraissait furieux.',
      'Il était angoissé.',
      'Il semblait désespéré.',
      'Il était anxieux.',
      'Il paraissait soulagé.',
      'Son cœur s\'emballa.',
      'Ses mains tremblaient.',
      'Ses jambes flageolaient.',
    ].join(' ');
    const result = calculateShowTellScore(prose);
    expect(result.score).toBe(0);
    expect(result.penalty_total).toBeGreaterThan(1.0);
  });

  // Test 7: string vide → baseline neutre
  it('string vide → score = 1.0', () => {
    const result = calculateShowTellScore('');
    expect(result.score).toBe(1.0);
    expect(result.violations_sdt).toBe(0);
    expect(result.violations_soma).toBe(0);
  });

  // Test 8: accumulation monotone → penalite cumulative
  it('accumulation monotone → pénalité cumulative, score < 0.60', () => {
    const prose = 'Il était terrifié. Il semblait furieux. Il paraissait anxieux.';
    const result = calculateShowTellScore(prose);
    expect(result.violations_sdt).toBeGreaterThanOrEqual(3);
    expect(result.score).toBeLessThan(0.60);
  });
});
