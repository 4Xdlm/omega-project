/**
 * Tests — R6 COMPOSITE SELECTION (V4.4->R6 bridge, shadow).
 * Verifie : ponderation constitutionnelle, normalisation CALC, garde de poids,
 * detection de divergence style-only vs composite, determinisme, tie-break.
 */
import { describe, it, expect } from 'vitest';
import {
  CONSTITUTION_WEIGHTS,
  CALC_TIER_MIN,
  CALC_TIER_MAX,
  normalizeCalcScore,
  assertValidWeights,
  computeComposite,
  selectWithDivergence,
  type CandidateScores,
} from '../../src/gate/emotional/composite-selection.js';

describe('CONSTITUTION_WEIGHTS', () => {
  it('vaut 60/25/15 et somme a 1', () => {
    expect(CONSTITUTION_WEIGHTS).toEqual({ emotion: 0.6, logic: 0.25, style: 0.15 });
    expect(() => assertValidWeights(CONSTITUTION_WEIGHTS)).not.toThrow();
  });
});

describe('assertValidWeights', () => {
  it('rejette une somme != 1', () => {
    expect(() => assertValidWeights({ emotion: 0.6, logic: 0.25, style: 0.2 })).toThrow(/somme/);
  });
  it('rejette un poids negatif', () => {
    expect(() => assertValidWeights({ emotion: 1.1, logic: -0.1, style: 0 })).toThrow(/negatif/);
  });
});

describe('normalizeCalcScore', () => {
  it('mappe les bornes tier vers [0,1]', () => {
    expect(normalizeCalcScore(CALC_TIER_MIN)).toBe(0);
    expect(normalizeCalcScore(CALC_TIER_MAX)).toBe(1);
    expect(normalizeCalcScore((CALC_TIER_MIN + CALC_TIER_MAX) / 2)).toBeCloseTo(0.5, 10);
  });
  it('clampe hors bornes et gere NaN', () => {
    expect(normalizeCalcScore(0)).toBe(0);
    expect(normalizeCalcScore(99)).toBe(1);
    expect(normalizeCalcScore(NaN)).toBe(0);
  });
});

describe('computeComposite', () => {
  it('applique la ponderation 60/25/15', () => {
    const s: CandidateScores = { id: 'a', emotion01: 1, logic01: 0, style01: 0 };
    expect(computeComposite(s)).toBeCloseTo(0.6, 10);
    expect(computeComposite({ id: 'b', emotion01: 0, logic01: 1, style01: 0 })).toBeCloseTo(0.25, 10);
    expect(computeComposite({ id: 'c', emotion01: 0, logic01: 0, style01: 1 })).toBeCloseTo(0.15, 10);
  });
  it('clampe les entrees hors [0,1]', () => {
    expect(computeComposite({ id: 'x', emotion01: 5, logic01: -3, style01: 2 })).toBeCloseTo(0.75, 10);
  });
});

describe('selectWithDivergence', () => {
  it('leve si aucun candidat', () => {
    expect(() => selectWithDivergence([])).toThrow(/aucun candidat/);
  });

  it('un seul candidat = pas de divergence', () => {
    const r = selectWithDivergence([{ id: 'solo', emotion01: 0.2, logic01: 0.2, style01: 0.9 }]);
    expect(r.styleOnlyPickId).toBe('solo');
    expect(r.compositePickId).toBe('solo');
    expect(r.diverged).toBe(false);
  });

  it('DETECTE une divergence : style prefere A, composite prefere B (emotion superieure)', () => {
    // A : style tres haut, emotion basse. B : style plus bas, emotion tres haute.
    const candidates: CandidateScores[] = [
      { id: 'A', emotion01: 0.20, logic01: 0.50, style01: 1.00 },
      { id: 'B', emotion01: 0.95, logic01: 0.60, style01: 0.55 },
    ];
    const r = selectWithDivergence(candidates);
    expect(r.styleOnlyPickId).toBe('A');     // argmax style
    expect(r.compositePickId).toBe('B');     // 0.6*0.95+... > 0.6*0.20+...
    expect(r.diverged).toBe(true);
    expect(r.rankedByComposite[0]?.id).toBe('B');
    expect(r.rankingByStyle[0]).toBe('A');
  });

  it('pas de divergence quand le meme jet gagne sur les deux', () => {
    const r = selectWithDivergence([
      { id: 'A', emotion01: 0.9, logic01: 0.9, style01: 0.9 },
      { id: 'B', emotion01: 0.2, logic01: 0.2, style01: 0.2 },
    ]);
    expect(r.styleOnlyPickId).toBe('A');
    expect(r.compositePickId).toBe('A');
    expect(r.diverged).toBe(false);
  });

  it('tie-break deterministe par id (plus petit id gagne a egalite)', () => {
    const r = selectWithDivergence([
      { id: 'b', emotion01: 0.5, logic01: 0.5, style01: 0.5 },
      { id: 'a', emotion01: 0.5, logic01: 0.5, style01: 0.5 },
    ]);
    expect(r.compositePickId).toBe('a');
    expect(r.styleOnlyPickId).toBe('a');
  });

  it('est deterministe (meme entree -> meme sortie)', () => {
    const c: CandidateScores[] = [
      { id: 'A', emotion01: 0.3, logic01: 0.7, style01: 0.8 },
      { id: 'B', emotion01: 0.8, logic01: 0.4, style01: 0.6 },
      { id: 'C', emotion01: 0.5, logic01: 0.5, style01: 0.5 },
    ];
    expect(selectWithDivergence(c)).toEqual(selectWithDivergence(c));
  });
});
