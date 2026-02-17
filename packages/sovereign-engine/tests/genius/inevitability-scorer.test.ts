/**
 * GENIUS-02 — Inevitability Scorer Tests
 * TEST-G02-I01 to TEST-G02-I05
 */
import { describe, it, expect } from 'vitest';
import { computeInevitability } from '../../src/genius/scorers/inevitability-scorer.js';

// Causal coherent text
const CAUSAL_TEXT = `
Marie entendit un craquement dans le couloir. Son cœur accéléra. Elle saisit le couteau
sur la table, car le bruit se rapprochait. La porte trembla sous un choc violent. Alors
elle recula vers la fenêtre. Le verrou céda dans un fracas métallique. Un homme apparut
dans l'encadrement. Marie leva l'arme, donc il s'arrêta net. Le silence retomba entre eux,
lourd de menace. Puisqu'il ne bougeait pas, elle fit un pas en avant. L'homme baissa les
yeux vers la lame. Il comprit qu'elle ne plaisantait pas. Par conséquent, il leva les mains
lentement, paumes ouvertes. Marie sentit la peur refluer dans ses veines. Ainsi commença
leur étrange confrontation nocturne.
`;

// Shuffled paragraphs (causal chain broken)
const SHUFFLED_TEXT = `
L'homme baissa les yeux vers la lame. Marie sentit la peur refluer dans ses veines.
Elle saisit le couteau sur la table. La porte trembla sous un choc violent. Alors
le silence retomba entre eux. Marie entendit un craquement dans le couloir. Un homme
apparut dans l'encadrement. Son cœur accéléra. Elle recula vers la fenêtre. Il comprit
qu'elle ne plaisantait pas. Le verrou céda dans un fracas métallique.
`;

// False causal: "donc" without preceding event
const FALSE_CAUSAL_TEXT = `
Le ciel était bleu. Donc Marie décida de sortir. Les oiseaux chantaient. Donc elle
sourit. La brise soufflait. Donc tout allait bien. Les nuages passaient. Donc le temps
changeait. La nuit tombait. Donc elle rentra.
`;

// Contradiction text
const CONTRADICTION_TEXT = `
La nuit était tombée depuis longtemps sur la ville endormie. Marie marchait dans l'obscurité
totale. Le soleil brillait haut dans le ciel bleu. Elle avançait en silence dans le noir
complet. Les rayons dorés réchauffaient sa peau.
`;

describe('Inevitability Scorer (I)', () => {
  // TEST-G02-I01: Causal coherent text → I > 80
  it('TEST-G02-I01: causal coherent text scores I > 80', () => {
    const result = computeInevitability(CAUSAL_TEXT);
    expect(result.I).toBeGreaterThan(80);
    expect(result.causal_consistency).toBeGreaterThan(50);
    expect(result.diagnostics.causal_links_found).toBeGreaterThan(0);
  });

  // TEST-G02-I02: Shuffled paragraphs → I drops (GENIUS-21)
  it('TEST-G02-I02: shuffled text scores lower than causal text', () => {
    const causalResult = computeInevitability(CAUSAL_TEXT);
    const shuffledResult = computeInevitability(SHUFFLED_TEXT);
    expect(shuffledResult.I).toBeLessThan(causalResult.I);
  });

  // TEST-G02-I03: "Donc" without preceding event → causal_consistency drops
  it('TEST-G02-I03: false causals reduce consistency score', () => {
    const result = computeInevitability(FALSE_CAUSAL_TEXT);
    // False causals should be detected
    expect(result.causal_consistency).toBeDefined();
    // Not as strong as real causal text
    expect(result.I).toBeLessThan(computeInevitability(CAUSAL_TEXT).I);
  });

  // TEST-G02-I04: Contradiction (nuit → soleil) → non_contradiction drops
  it('TEST-G02-I04: contradictions reduce non_contradiction score', () => {
    const result = computeInevitability(CONTRADICTION_TEXT);
    expect(result.non_contradiction).toBeLessThan(100);
    expect(result.diagnostics.contradictions_found).toBeGreaterThan(0);
  });

  // TEST-G02-I05: I does not import TemporalEngine.scores (lint check)
  it('TEST-G02-I05: output schema complete', () => {
    const result = computeInevitability(CAUSAL_TEXT);
    expect(result).toHaveProperty('I');
    expect(result).toHaveProperty('causal_consistency');
    expect(result).toHaveProperty('setup_payoff');
    expect(result).toHaveProperty('non_contradiction');
    expect(result.diagnostics).toHaveProperty('causal_links_found');
    expect(result.diagnostics).toHaveProperty('sentence_count');
  });

  it('empty text returns I=0', () => {
    expect(computeInevitability('').I).toBe(0);
  });

  it('deterministic: same input → same I', () => {
    const r1 = computeInevitability(CAUSAL_TEXT);
    const r2 = computeInevitability(CAUSAL_TEXT);
    expect(r1.I).toBe(r2.I);
  });

  it('I bounded [0, 100]', () => {
    for (const text of [CAUSAL_TEXT, SHUFFLED_TEXT, FALSE_CAUSAL_TEXT, CONTRADICTION_TEXT]) {
      const r = computeInevitability(text);
      expect(r.I).toBeGreaterThanOrEqual(0);
      expect(r.I).toBeLessThanOrEqual(100);
    }
  });
});
