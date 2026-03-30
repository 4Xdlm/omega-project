import { describe, it, expect } from 'vitest';
import { computeCIL37 } from '../../src/scoring/ci-l37.js';

describe('CI_L37 — Causal Index (L37)', () => {
  it('returns 0 for empty text', () => {
    const result = computeCIL37('');
    expect(result.ci_l37).toBe(0);
  });

  it('returns higher score for subordination-rich prose', () => {
    const simple = 'Le chat dort. Le chien court. Il fait beau. La nuit tombe.';
    const complex = 'Le chat, qui dormait depuis des heures sur le rebord de la fenetre que la pluie battait sans relache, ouvrit un oeil lorsque le tonnerre gronda, tandis que le vent soufflait a travers les volets mal joints qui claquaient dans la nuit.';

    const simpleResult = computeCIL37(simple);
    const complexResult = computeCIL37(complex);

    expect(complexResult.ci_l37).toBeGreaterThan(simpleResult.ci_l37);
  });

  it('returns a score in [0, 100]', () => {
    const text = 'La nuit tombait sur la ville, qui semblait retenir son souffle, tandis que les derniers passants pressaient le pas dans les ruelles sombres.';
    const result = computeCIL37(text);
    expect(result.ci_l37).toBeGreaterThanOrEqual(0);
    expect(result.ci_l37).toBeLessThanOrEqual(100);
  });

  it('provides raw feature values', () => {
    const text = 'Il marchait dans la rue qui longeait le fleuve dont les eaux sombres refletaient les lumieres.';
    const result = computeCIL37(text);
    expect(result.sub_per_sentence).toBeGreaterThanOrEqual(0);
    expect(result.f26b_long_sent_rate).toBeGreaterThanOrEqual(0);
    expect(result.sub_normalized).toBeGreaterThanOrEqual(0);
    expect(result.sub_normalized).toBeLessThanOrEqual(1);
  });
});
