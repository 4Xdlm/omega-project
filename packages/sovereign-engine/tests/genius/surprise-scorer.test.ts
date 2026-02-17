/**
 * GENIUS-02 — Surprise Scorer Tests
 * TEST-G02-S01 to TEST-G02-S07
 */
import { describe, it, expect } from 'vitest';
import { computeSurprise } from '../../src/genius/scorers/surprise-scorer.js';

// Rich vocabulary, varied ideas
const RICH_TEXT = `
La cathédrale dressait ses flèches gothiques contre un ciel d'ardoise. Marie contourna
le baptistère octogonal, ses doigts effleurant les gargouilles érodées. Un parfum d'encens
filtrait par le portail entrebâillé. À l'intérieur, les vitraux projetaient des losanges
pourpres sur les dalles de calcaire. Le bourdon résonna, grave, faisant trembler la poussière
en suspension dans les rais de lumière. Elle s'assit sur un banc vermoulu. L'acoustique
transformait chaque murmure en prière. Un moineau s'était posé sur l'autel, picorant
les miettes d'hostie oubliées. Dehors, le marché battait son plein : épices, cuir tanné,
savon à la lavande. Le contraste la saisit — sacré et profane mêlés dans la même rumeur.
`;

// Same idea repeated with synonyms (low semantic shift)
const REPETITIVE_IDEAS = `
La maison était grande. La demeure était immense. L'habitation était vaste. Le logis
était spacieux. La bâtisse était énorme. La résidence était considérable. Le domicile
était imposant. L'édifice était grandiose. La propriété était colossale. Le manoir
était monumental.
`;

// Lexical cluster injection
const CLUSTER_TEXT = `
Le rouge envahissait tout. Rouge sang, rouge braise, rouge colère, rouge passion.
Les murs rouges, le ciel rouge, la terre rouge. Partout le rouge, toujours le rouge,
encore le rouge. Rouge carmin, rouge vermillon, rouge écarlate. Le monde n'était plus
que rouge. Rouge incandescent, rouge furieux, rouge mourant. Rouge.
`;

describe('Surprise Scorer (S)', () => {
  // TEST-G02-S01: Rich vocab + varied ideas → S > 85
  it('TEST-G02-S01: rich varied text scores S > 85', () => {
    const result = computeSurprise(RICH_TEXT);
    expect(result.S).toBeGreaterThan(85);
    expect(result.ttr_normalized).toBeGreaterThan(40);
    expect(result.entropy_normalized).toBeGreaterThan(40);
  });

  // TEST-G02-S02: Synonyms but same idea repeated → S < 70
  it('TEST-G02-S02: repetitive ideas with synonyms scores S < 70', () => {
    const result = computeSurprise(REPETITIVE_IDEAS);
    expect(result.S).toBeLessThan(70);
  });

  // TEST-G02-S03: Lexical cluster injection → S drops (GENIUS-22)
  it('TEST-G02-S03: lexical cluster causes S drop', () => {
    const result = computeSurprise(CLUSTER_TEXT);
    expect(result.clustering_penalty).toBeGreaterThan(0);
    expect(result.S).toBeLessThan(computeSurprise(RICH_TEXT).S);
  });

  // TEST-G02-S04: S_shift_balance hors zone → warning
  it('TEST-G02-S04: shift balance diagnostic is reported', () => {
    const result = computeSurprise(RICH_TEXT);
    expect(result.diagnostics.S_shift_balance).toBeDefined();
    expect(typeof result.diagnostics.S_shift_balance).toBe('number');
  });

  // TEST-G02-S05: Same text, 2 runs → semantic_shift identical (GENIUS-28)
  it('TEST-G02-S05: deterministic — same text → same S', () => {
    const r1 = computeSurprise(RICH_TEXT);
    const r2 = computeSurprise(RICH_TEXT);
    expect(r1.S).toBe(r2.S);
    expect(r1.diagnostics.shift_moyen).toBe(r2.diagnostics.shift_moyen);
  });

  // TEST-G02-S06: S does not import SII.metaphor_novelty (tested in lint)
  it('TEST-G02-S06: output schema complete', () => {
    const result = computeSurprise(RICH_TEXT);
    expect(result).toHaveProperty('S');
    expect(result).toHaveProperty('ttr_normalized');
    expect(result).toHaveProperty('entropy_normalized');
    expect(result).toHaveProperty('semantic_shift_normalized');
    expect(result).toHaveProperty('clustering_penalty');
    expect(result).toHaveProperty('diagnostics');
    expect(result.diagnostics).toHaveProperty('ttr_raw');
    expect(result.diagnostics).toHaveProperty('entropy_raw');
    expect(result.diagnostics).toHaveProperty('shift_moyen');
  });

  // TEST-G02-S07: S does not use API embedding provider (tested in lint)
  it('TEST-G02-S07: S bounded [0, 100]', () => {
    const r1 = computeSurprise(RICH_TEXT);
    const r2 = computeSurprise(REPETITIVE_IDEAS);
    const r3 = computeSurprise(CLUSTER_TEXT);
    for (const r of [r1, r2, r3]) {
      expect(r.S).toBeGreaterThanOrEqual(0);
      expect(r.S).toBeLessThanOrEqual(100);
    }
  });

  it('empty text returns S=0', () => {
    const result = computeSurprise('');
    expect(result.S).toBe(0);
  });
});
