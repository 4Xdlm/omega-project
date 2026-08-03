/**
 * INV-TAIL-01..04 — famille TAIL canonique.
 * Fixe les CONVENTIONS (>30/>40 strict, ≥50/≥60/≥90 inclusif) pour que les
 * campagnes cessent de comparer des définitions différentes.
 */
import { describe, it, expect } from 'vitest';
import { measureTailRates, TAIL40_ENVELOPES } from '../src/variation/long-period-template.js';

/** Le splitter canonique exige terminateur + AMORCE (majuscule) : la première
 *  lettre doit être capitalisée, sinon deux phrases n'en font qu'une. */
function sentence(n: number): string {
  const body = Array.from({ length: n }, (_, i) => `mot${i % 7}`).join(' ');
  return `${body.charAt(0).toUpperCase()}${body.slice(1)}.`;
}

describe('INV-TAIL-01 — conventions de seuil exactes', () => {
  it('une phrase de 40 mots ne compte PAS dans tail40 (strictement >), une de 41 oui', () => {
    const r40 = measureTailRates(`${sentence(40)} ${sentence(10)}`);
    expect(r40.tail40).toBe(0);
    const r41 = measureTailRates(`${sentence(41)} ${sentence(10)}`);
    expect(r41.tail40).toBe(0.5);
  });

  it('une phrase de 50 mots COMPTE dans tail50 (inclusif ≥ — déf. loi de queue)', () => {
    const r = measureTailRates(`${sentence(50)} ${sentence(10)}`);
    expect(r.tail50).toBe(0.5);
    expect(r.tail40).toBe(0.5); // 50 > 40
  });
});

describe('INV-TAIL-02 — monotonie de la famille', () => {
  it('tail30 ≥ tail40 ≥ tail50 ≥ tail60 ≥ tail90, toujours', () => {
    const t = [35, 45, 55, 65, 95, 12, 8, 20].map(sentence).join(' ');
    const r = measureTailRates(t);
    expect(r.tail30).toBeGreaterThanOrEqual(r.tail40);
    expect(r.tail40).toBeGreaterThanOrEqual(r.tail50);
    expect(r.tail50).toBeGreaterThanOrEqual(r.tail60);
    expect(r.tail60).toBeGreaterThanOrEqual(r.tail90);
    expect(r.maxLen).toBe(95);
  });
});

describe('INV-TAIL-03 — texte vide', () => {
  it('rend des zéros, jamais NaN', () => {
    const r = measureTailRates('');
    expect(r.sentences).toBe(0);
    expect(r.tail40).toBe(0);
    expect(r.maxLen).toBe(0);
  });
});

describe('INV-TAIL-04 — enveloppes gelées cohérentes', () => {
  it('thriller élite < maîtres contemporains (marqueur de registre, AUC 0,90)', () => {
    expect(TAIL40_ENVELOPES.thrillerElite.median).toBeLessThan(TAIL40_ENVELOPES.masterContemp.median);
    expect(TAIL40_ENVELOPES.thrillerElite.q1).toBeLessThanOrEqual(TAIL40_ENVELOPES.thrillerElite.median);
    expect(TAIL40_ENVELOPES.thrillerElite.median).toBeLessThanOrEqual(TAIL40_ENVELOPES.thrillerElite.q3);
    expect(TAIL40_ENVELOPES.thrillerElite.q3).toBeLessThanOrEqual(TAIL40_ENVELOPES.thrillerElite.maxObserved);
  });
});
