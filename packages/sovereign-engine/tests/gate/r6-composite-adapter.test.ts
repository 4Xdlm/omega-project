/**
 * Tests — R6 COMPOSITE ADAPTER (V4.4->R6 bridge, shadow).
 * Verifie : normalisation des axes bruts, construction du log shadow, divergence.
 */
import { describe, it, expect } from 'vitest';
import {
  toCandidateScores,
  computeShadowDivergence,
  type RawAxisScores,
} from '../../src/gate/emotional/r6-composite-adapter.js';

describe('toCandidateScores', () => {
  it('normalise emotion/coherence [0,100]->[0,1] et calcScore tier->[0,1]', () => {
    const c = toCandidateScores({ id: '0', emotionScore: 80, coherenceScore: 50, calcScore: 4.0 });
    expect(c.emotion01).toBeCloseTo(0.8, 10);
    expect(c.logic01).toBeCloseTo(0.5, 10);
    expect(c.style01).toBeCloseTo(0.5, 10); // (4.0-1.5)/(6.5-1.5)
  });
  it('clampe / gere NaN', () => {
    const c = toCandidateScores({ id: 'x', emotionScore: 300, coherenceScore: -20, calcScore: NaN });
    expect(c.emotion01).toBe(1);
    expect(c.logic01).toBe(0);
    expect(c.style01).toBe(0);
  });
});

describe('computeShadowDivergence', () => {
  it('produit un log shadow coherent et detecte la divergence', () => {
    // A : style tres haut, emotion basse. B : emotion tres haute, style moyen.
    const attempts: RawAxisScores[] = [
      { id: 'A', emotionScore: 20, coherenceScore: 50, calcScore: 6.4 }, // style ~0.98
      { id: 'B', emotionScore: 95, coherenceScore: 60, calcScore: 4.3 }, // style ~0.56
    ];
    const { report, log } = computeShadowDivergence(attempts);
    expect(log.composite_enabled).toBe(true);
    expect(log.style_only_pick_id).toBe('A');
    expect(log.composite_pick_id).toBe('B');
    expect(log.diverged).toBe(true);
    expect(report.diverged).toBe(true);
    expect(log.composite_ranking[0]).toBe('B');
    expect(log.style_ranking[0]).toBe('A');
    expect(log.composite_weights).toEqual({ emotion: 0.6, logic: 0.25, style: 0.15 });
  });

  it('pas de divergence si le meme jet domine partout', () => {
    const { log } = computeShadowDivergence([
      { id: 'A', emotionScore: 90, coherenceScore: 90, calcScore: 6.0 },
      { id: 'B', emotionScore: 30, coherenceScore: 30, calcScore: 3.0 },
    ]);
    expect(log.diverged).toBe(false);
    expect(log.style_only_pick_id).toBe('A');
    expect(log.composite_pick_id).toBe('A');
  });

  it('leve si aucune tentative', () => {
    expect(() => computeShadowDivergence([])).toThrow(/aucun candidat/);
  });
});
