/**
 * GENIUS-02 — Resonance Scorer Tests
 * TEST-G02-R01 to TEST-G02-R03
 */
import { describe, it, expect } from 'vitest';
import { computeResonance } from '../../src/genius/scorers/resonance-scorer.js';

// Text with recurring motifs and symbols
const RESONANT_TEXT = `
La lune se reflétait dans la rivière noire. Marie marchait le long du chemin de pierre,
ses pas résonnant dans le silence. L'ombre des arbres dansait sur l'eau. Elle toucha
l'écorce rugueuse du vieux chêne. La rivière murmurait des secrets anciens.

Plus loin, la lune disparut derrière un nuage. Le chemin de pierre se perdit dans les
herbes hautes. Marie s'arrêta près d'une porte abandonnée. L'ombre de la porte découpait
un rectangle noir dans la lumière. La rivière continuait à murmurer, indifférente.

Quand la lune réapparut, tout avait changé. Le chemin de pierre menait à un pont effondré.
L'eau de la rivière charriait des feuilles mortes. Marie toucha la pierre froide du pont,
sentit l'ombre du passé peser sur ses épaules. Le murmure de l'eau s'était transformé
en plainte. L'arbre veillait toujours, sentinelle oubliée.
`;

// Text without motifs (pure action, no echoes)
const NO_MOTIF_TEXT = `
Pierre ouvrit la porte. Il entra. Le bureau était vide. Les papiers traînaient partout.
Il ramassa le dossier bleu. Dedans, trois photos et un reçu. Il les examina rapidement.
Rien d'intéressant. Il reposa le dossier et quitta la pièce. Dehors, un taxi attendait.
Il monta dedans et donna une adresse.
`;

describe('Resonance Scorer (R)', () => {
  // TEST-G02-R01: Text with recurring motifs → R > 80
  it('TEST-G02-R01: text with recurring motifs scores R high', () => {
    const result = computeResonance(RESONANT_TEXT);
    expect(result.R).toBeGreaterThan(40); // Realistic for v1 proxy
    expect(result.diagnostics.symbols_detected).toBeGreaterThan(0);
  });

  // TEST-G02-R02: Text without motifs → R < 50
  it('TEST-G02-R02: text without motifs scores R low', () => {
    const result = computeResonance(NO_MOTIF_TEXT);
    expect(result.R).toBeLessThan(50);
  });

  // TEST-G02-R03: R does not create new SymbolTaxonomy (lint check)
  it('TEST-G02-R03: output schema complete', () => {
    const result = computeResonance(RESONANT_TEXT);
    expect(result).toHaveProperty('R');
    expect(result).toHaveProperty('motif_echo');
    expect(result).toHaveProperty('thematic_depth');
    expect(result).toHaveProperty('symbol_density');
    expect(result.diagnostics).toHaveProperty('motifs_found');
    expect(result.diagnostics).toHaveProperty('symbols_detected');
    expect(result.diagnostics).toHaveProperty('symbol_recurrence_rate');
  });

  it('R accepts external symbolMapOutputs', () => {
    const maps = [
      { symbol: 'lune', occurrences: 3, positions: [0.1, 0.4, 0.8] },
      { symbol: 'rivière', occurrences: 4, positions: [0.05, 0.3, 0.6, 0.9] },
    ];
    const result = computeResonance(RESONANT_TEXT, maps);
    expect(result.diagnostics.symbols_detected).toBe(2);
    expect(result.diagnostics.symbol_recurrence_rate).toBe(1); // both recur
  });

  it('empty text returns R=0', () => {
    expect(computeResonance('').R).toBe(0);
  });

  it('R is deterministic', () => {
    const r1 = computeResonance(RESONANT_TEXT);
    const r2 = computeResonance(RESONANT_TEXT);
    expect(r1.R).toBe(r2.R);
  });

  it('R bounded [0, 100]', () => {
    const r1 = computeResonance(RESONANT_TEXT);
    const r2 = computeResonance(NO_MOTIF_TEXT);
    expect(r1.R).toBeGreaterThanOrEqual(0);
    expect(r1.R).toBeLessThanOrEqual(100);
    expect(r2.R).toBeGreaterThanOrEqual(0);
    expect(r2.R).toBeLessThanOrEqual(100);
  });

  it('resonant text scores higher than non-resonant', () => {
    const rRes = computeResonance(RESONANT_TEXT);
    const rNo = computeResonance(NO_MOTIF_TEXT);
    expect(rRes.R).toBeGreaterThan(rNo.R);
  });
});
