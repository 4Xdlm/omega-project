/**
 * GENIUS-02 — Density Scorer Tests
 * TEST-G02-D01 to TEST-G02-D04
 */
import { describe, it, expect } from 'vitest';
import { computeDensity } from '../../src/genius/scorers/density-scorer.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST TEXTS
// ═══════════════════════════════════════════════════════════════════════════════

// Dense text: action-packed, sensory, zero filler
const DENSE_TEXT = `
Marie saisit la poignée rouillée. Le métal glacé mordit sa paume. Elle poussa. La porte
grinça sur ses gonds, libérant une bouffée d'air humide chargé de moisissure. Ses yeux
s'adaptèrent à l'obscurité. Le sol de pierre luisait sous une pellicule d'eau noire.
Un rat détala entre les caisses empilées. Marie serra les dents, avança. Ses semelles
claquèrent sur le béton. Au fond du couloir, une ampoule nue pendait au bout d'un fil.
Elle grésillait, projetant des ombres nerveuses sur les murs lépreux. Marie tendit la main,
toucha la surface froide. Rugueux. Humide. Vivant, presque. Un frisson remonta le long
de son bras. Elle inspira l'air lourd, goûta le sel et la rouille sur sa langue.
`;

// Verbose text: full of stopwords, filler, no action
const VERBOSE_TEXT = `
Il y avait dans cette situation quelque chose qui était très difficile à comprendre pour
tout le monde. En effet, il est vrai que les choses étaient ce qu'elles étaient et que
personne ne pouvait rien y faire. C'est donc avec beaucoup de patience que tous les gens
qui étaient là ont décidé de faire ce qui devait être fait. Il faut aussi dire que ce
n'était pas la première fois que ce genre de chose arrivait dans ce type de circonstances.
On peut donc en conclure que la situation était tout à fait normale et qu'il n'y avait
vraiment rien de particulier à signaler dans tout cela. D'ailleurs, il est bien connu que
ce genre de situations est assez fréquent et qu'il ne faut pas s'en inquiéter plus que cela.
`;

// Repetitive syntactic pattern: 3+ consecutive same opening
const REPEAT_PATTERN_TEXT = `
Elle marchait dans le couloir sombre. Elle sentait le froid monter de ses pieds.
Elle entendait le silence peser sur ses épaules. Elle voyait la lumière filtrer par la fissure.
Elle toucha le mur et sa main se referma. La porte s'ouvrit devant elle. Un courant d'air
froid caressa son visage.
`;

describe('Density Scorer (D)', () => {
  // TEST-G02-D01: Dense text → D > 90
  it('TEST-G02-D01: dense text scores D > 90', () => {
    const result = computeDensity(DENSE_TEXT);
    expect(result.D).toBeGreaterThan(90);
    expect(result.compression_proxy).toBeGreaterThan(50);
    expect(result.sentence_utility_ratio).toBeGreaterThan(50);
  });

  // TEST-G02-D02: Verbose text (80% stopwords) → D < 50
  it('TEST-G02-D02: verbose text scores D < 50', () => {
    const result = computeDensity(VERBOSE_TEXT);
    expect(result.D).toBeLessThan(50);
    expect(result.diagnostics.stopword_ratio).toBeGreaterThan(0.4);
  });

  // TEST-G02-D03: 3+ consecutive same structure → verbiage_penalty activated
  it('TEST-G02-D03: repeated syntactic patterns trigger verbiage penalty', () => {
    const result = computeDensity(REPEAT_PATTERN_TEXT);
    expect(result.verbiage_penalty).toBeGreaterThan(0);
    expect(result.diagnostics.repeat_pattern_count).toBeGreaterThan(0);
  });

  // TEST-G02-D04: D does NOT import SII (lint check — structural, tested in anti-doublon)
  it('TEST-G02-D04: D returns all required fields', () => {
    const result = computeDensity(DENSE_TEXT);
    expect(result).toHaveProperty('D');
    expect(result).toHaveProperty('compression_proxy');
    expect(result).toHaveProperty('sentence_utility_ratio');
    expect(result).toHaveProperty('verbiage_penalty');
    expect(result).toHaveProperty('diagnostics');
    expect(result.diagnostics).toHaveProperty('stopword_ratio');
    expect(result.diagnostics).toHaveProperty('content_word_count');
    expect(result.diagnostics).toHaveProperty('total_word_count');
    expect(result.diagnostics).toHaveProperty('sentence_count');
  });

  it('empty text returns D=0', () => {
    const result = computeDensity('');
    expect(result.D).toBe(0);
  });

  it('D is deterministic', () => {
    const r1 = computeDensity(DENSE_TEXT);
    const r2 = computeDensity(DENSE_TEXT);
    expect(r1.D).toBe(r2.D);
  });

  it('D is bounded [0, 100]', () => {
    const r1 = computeDensity(DENSE_TEXT);
    const r2 = computeDensity(VERBOSE_TEXT);
    expect(r1.D).toBeGreaterThanOrEqual(0);
    expect(r1.D).toBeLessThanOrEqual(100);
    expect(r2.D).toBeGreaterThanOrEqual(0);
    expect(r2.D).toBeLessThanOrEqual(100);
  });
});
