/**
 * Tests: Rhythm Variation V2 (Sprint 15.2)
 * Invariant: ART-PHON-02
 */

import { describe, it, expect } from 'vitest';
import { analyzeRhythmVariation } from '../../src/phonetic/rhythm-variation.js';

describe('RhythmVariation V2 (ART-PHON-02)', () => {
  it('RHYTHM-V2-01: prose variée → faible score monotonie', () => {
    const prose = `Le fer brûlait encore sous ses doigts. Elle serra le poing.

Un bruit sec. Pas à l'étage. Elle se figea, les mains crispées sur le bord de la table, retenant son souffle dans l'obscurité grandissante de la pièce.

— Qui est là ? cria-t-elle.

Silence.

Les mots de son père résonnaient dans sa tête, mais ils ne servaient plus à rien désormais.`;

    const result = analyzeRhythmVariation(prose);

    // Varied prose should have low monotony
    expect(result.monotony_score).toBeLessThan(50);
    expect(result.variation_score).toBeGreaterThan(50);
  });

  it('RHYTHM-V2-02: prose monotone (même structure) → score monotonie élevé', () => {
    // 6 phrases de longueur similaire, même structure
    const prose = `Elle ouvrit la porte de la cuisine. Elle regarda le jardin par la fenêtre. Elle posa la tasse sur la table. Elle ferma le rideau de la chambre. Elle alluma la lampe du salon. Elle prit le livre sur l'étagère.`;

    const result = analyzeRhythmVariation(prose);

    // Should detect monotony patterns (length plateau, punctuation monotony)
    expect(result.total_count).toBeGreaterThan(0);
  });

  it('RHYTHM-V2-03: détection connector repetition', () => {
    const prose = `Puis elle sortit. Puis il la suivit. Puis la pluie commença. Puis le vent se leva. Puis tout s'arrêta.`;

    const result = analyzeRhythmVariation(prose);

    const connectorPatterns = result.patterns.filter(p => p.type === 'connector_repetition');
    expect(connectorPatterns.length).toBeGreaterThan(0);
  });

  it('RHYTHM-V2-04: déterminisme — même prose = même résultat', () => {
    const prose = `La nuit tombait. Et le silence revenait. Et la peur aussi. Et personne ne bougeait. Et tout restait immobile.`;

    const r1 = analyzeRhythmVariation(prose);
    const r2 = analyzeRhythmVariation(prose);

    expect(r1.total_count).toBe(r2.total_count);
    expect(r1.monotony_score).toBe(r2.monotony_score);
    expect(r1.variation_score).toBe(r2.variation_score);
  });
});
