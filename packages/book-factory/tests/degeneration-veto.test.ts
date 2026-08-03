/**
 * INV-DEGEN-01..06 — veto d'effondrement de génération.
 * Fixtures dérivées du CAS RÉEL de juin (BOOK_FULL_1776125356560/chapter_01 :
 * 593 × « Elle est la fissure. »), pas d'exemples synthétiques inventés.
 * Seuils : dérivés de 41 romans publiés (voir en-tête du module).
 */
import { describe, it, expect } from 'vitest';
import { measureDegeneration, DEGEN_THRESHOLDS } from '../src/scribe/degeneration-veto.js';
import { checkEligibility } from '../src/scribe/scribe-gate.js';

/** n phrases toutes distinctes (paire unique du produit 10×10 — la normalisation
 *  supprime les CHIFFRES, donc l'unicité doit venir de MOTS ; bug de fixture
 *  trouvé par ce test : « numero 12 » → « numero » = doublons involontaires). */
function distinctSentences(n: number): string {
  const A = ['vent', 'quai', 'porte', 'ombre', 'sel', 'verre', 'nuit', 'pluie', 'mur', 'feu'];
  const B = ['gris', 'clos', 'froid', 'nu', 'las', 'dur', 'plein', 'sourd', 'noir', 'blanc'];
  if (n > 100) throw new Error('fixture limitee a 100 phrases uniques');
  return Array.from(
    { length: n },
    (_, i) => `Le ${A[i % 10]} ${B[Math.floor(i / 10) % 10]} restait la sans bouger.`,
  ).join(' ');
}

describe('INV-DEGEN-01 — le cas de juin est détecté', () => {
  it('593 phrases identiques consécutives → GENERATION_COLLAPSE', () => {
    const collapse = Array.from({ length: 100 }, () => 'Elle est la fissure.').join(' ');
    const r = measureDegeneration(`${distinctSentences(30)} ${collapse}`);
    expect(r.verdict).toBe('GENERATION_COLLAPSE');
    expect(r.maxConsecutiveRun).toBeGreaterThanOrEqual(100);
    expect(r.dominantSentence).toBe('elle est la fissure');
  });

  it('les phrases COURTES (2-4 mots) sont bien comptées — angle mort du capteur existant', () => {
    // « Elle marche. » = 2 mots : measureRepetition (≥5 mots) ne le voit pas.
    const t = `${distinctSentences(25)} ${Array.from({ length: 30 }, () => 'Elle marche.').join(' ')}`;
    const r = measureDegeneration(t);
    expect(r.verdict).toBe('GENERATION_COLLAPSE');
  });
});

describe('INV-DEGEN-02 — la prose publiée ne déclenche jamais le veto', () => {
  it('texte sain : CLEAN', () => {
    const r = measureDegeneration(distinctSentences(60));
    expect(r.verdict).toBe('CLEAN');
    expect(r.duplicateRatio).toBe(0);
  });

  it('une répétition stylistique de 3 (max publié observé) ne vetote PAS', () => {
    // runMax=3 observé chez des romanciers publiés — un auteur peut le faire.
    const t = `${distinctSentences(50)} Il attendait encore. Il attendait encore. Il attendait encore.`;
    const r = measureDegeneration(t);
    expect(r.maxConsecutiveRun).toBe(3);
    expect(r.verdict).not.toBe('GENERATION_COLLAPSE');
  });
});

describe('INV-DEGEN-03 — zone WATCH entre le max publié et le veto', () => {
  it('runMax = 4 → WATCH (au-delà du publié, sous le veto)', () => {
    const t = `${distinctSentences(60)} ${Array.from({ length: 4 }, () => 'Il attendait encore la fin.').join(' ')}`;
    const r = measureDegeneration(t);
    expect(r.maxConsecutiveRun).toBe(4);
    expect(r.verdict).toBe('WATCH');
  });
});

describe('INV-DEGEN-04 — jamais de veto sur un fragment', () => {
  it('moins de 20 phrases : CLEAN par construction', () => {
    const r = measureDegeneration('Oui. Oui. Oui. Oui. Oui.');
    expect(r.verdict).toBe('CLEAN');
  });
});

describe('INV-DEGEN-05 — seuils gelés et ordonnés', () => {
  it('veto strictement au-dessus du max publié (marge de sécurité)', () => {
    expect(DEGEN_THRESHOLDS.vetoRun).toBeGreaterThan(DEGEN_THRESHOLDS.publishedMaxRun);
    expect(DEGEN_THRESHOLDS.vetoDupRatio).toBeGreaterThan(DEGEN_THRESHOLDS.publishedMaxDupRatio * 4);
    expect(DEGEN_THRESHOLDS.watchRun).toBeLessThan(DEGEN_THRESHOLDS.vetoRun);
    expect(DEGEN_THRESHOLDS.watchDupRatio).toBeLessThan(DEGEN_THRESHOLDS.vetoDupRatio);
  });
});

describe('INV-DEGEN-06 — câblé dans le gate comme veto dur', () => {
  it('un candidat effondré est inéligible, code GENERATION_COLLAPSE', () => {
    const collapse = `${distinctSentences(25)} ${Array.from({ length: 40 }, () => 'La maison la regarde.').join(' ')}`;
    const e = checkEligibility(collapse);
    expect(e.eligible).toBe(false);
    expect(e.vetos.some((v) => v.code === 'GENERATION_COLLAPSE')).toBe(true);
  });

  it('le veto reste actif même avec strictLang desactivé (non rétrogradable)', () => {
    const collapse = `${distinctSentences(25)} ${Array.from({ length: 40 }, () => 'La maison la regarde.').join(' ')}`;
    const e = checkEligibility(collapse, { strictLang: false });
    expect(e.eligible).toBe(false);
  });
});
