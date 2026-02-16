/**
 * Tests: Show Don't Tell Detector
 * Invariant: ART-SDT-01 (Telling détecté à 80%+ précision avec 30+ patterns FR)
 */

import { describe, it, expect } from 'vitest';
import { detectTelling } from '../../src/silence/show-dont-tell.js';
import { TELLING_PATTERNS_FR } from '../../src/silence/telling-patterns.js';

describe('Show Don\'t Tell Detector (ART-SDT-01)', () => {
  it('SDT-01: "Il était triste" → violation critical détectée', () => {
    const prose = 'Il était triste. Il regarda par la fenêtre.';
    const result = detectTelling(prose);

    expect(result.violations.length).toBeGreaterThan(0);
    const criticals = result.violations.filter((v) => v.severity === 'critical');
    expect(criticals.length).toBeGreaterThan(0);

    // Verify the violation is on the correct sentence
    const violation = result.violations.find((v) => v.sentence.includes('était triste'));
    expect(violation).toBeDefined();
    expect(violation?.pattern_id).toBe('ETAT_TRISTE');
    expect(violation?.severity).toBe('critical');
  });

  it('SDT-02: "Ses épaules s\'affaissèrent" → AUCUNE violation (showing)', () => {
    const prose = 'Ses épaules s\'affaissèrent. Son regard tomba vers le sol. Un soupir s\'échappa de ses lèvres.';
    const result = detectTelling(prose);

    // Pure showing: aucune violation
    expect(result.violations.length).toBe(0);
    expect(result.show_ratio).toBe(1.0); // 100% showing
    expect(result.score).toBe(100); // Score maximal
  });

  it('SDT-03: "Il était médecin" → PAS de violation (false positive guard)', () => {
    const prose = 'Il était médecin depuis vingt ans. Elle était debout près de la porte. Il était midi.';
    const result = detectTelling(prose);

    // False positive guards doivent filtrer ces cas
    expect(result.violations.length).toBe(0);
    expect(result.score).toBe(100);
  });

  it('SDT-04: show_ratio calculé correctement sur prose mixte', () => {
    // Prose avec 2 violations (telling) + 2 phrases showing
    const prose =
      'Il était furieux. Ses poings se serrèrent. ' +
      'Elle éprouvait de la tristesse. Ses yeux se remplirent de larmes.';
    const result = detectTelling(prose);

    // 2 violations détectées
    expect(result.violations.length).toBe(2);
    expect(result.telling_count).toBe(2);

    // Violations critiques détectées
    const criticals = result.violations.filter((v) => v.severity === 'critical');
    expect(criticals.length).toBeGreaterThan(0);

    // Score doit être réduit (présence de telling)
    expect(result.score).toBeLessThan(100);
    expect(result.score).toBeGreaterThan(0);

    // Worst violations doit être rempli
    expect(result.worst_violations.length).toBeGreaterThan(0);
  });

  it('SDT-05: ≥ 30 patterns chargés et fonctionnels (ART-SDT-01)', () => {
    // Vérifier que 30+ patterns sont définis
    expect(TELLING_PATTERNS_FR.length).toBeGreaterThanOrEqual(30);

    // Vérifier que chaque pattern a les champs requis
    for (const pattern of TELLING_PATTERNS_FR) {
      expect(pattern.id).toBeDefined();
      expect(pattern.regex).toBeInstanceOf(RegExp);
      expect(pattern.severity).toMatch(/^(critical|high|medium)$/);
      expect(pattern.weight).toBeGreaterThan(0);
      expect(pattern.suggested_show).toBeDefined();
      expect(Array.isArray(pattern.false_positive_guards)).toBe(true);
    }

    // Vérifier que les patterns détectent correctement (smoke test sur 3 exemples)
    const test1 = detectTelling('Il était triste.');
    expect(test1.violations.length).toBeGreaterThan(0);

    const test2 = detectTelling('Il sentait la peur monter en lui.');
    expect(test2.violations.length).toBeGreaterThan(0);

    const test3 = detectTelling('La colère l\'envahit soudainement.');
    expect(test3.violations.length).toBeGreaterThan(0);
  });
});
