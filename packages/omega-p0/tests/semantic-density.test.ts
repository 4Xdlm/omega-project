/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — P5 SEMANTIC DENSITY TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { analyzeDensity, type DensityAnalysis } from '../src/phonetic/semantic-density.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function density(text: string): DensityAnalysis {
  return analyzeDensity(text);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEXICAL DENSITY (LD)
// ═══════════════════════════════════════════════════════════════════════════════

describe('P5 — semantic-density', () => {

  describe('Lexical Density (LD)', () => {

    it('pure function words → LD near 0', () => {
      // "il est dans le" = 4 function words
      const r = density('il est dans le');
      expect(r.lexicalDensity).toBeLessThan(20);
      expect(r.functionWords).toBeGreaterThanOrEqual(3);
    });

    it('pure content words → LD near 100', () => {
      // "soleil montagne rivière forêt" = 4 content words (nouns)
      const r = density('soleil montagne rivière forêt');
      expect(r.lexicalDensity).toBeGreaterThan(80);
      expect(r.contentWords).toBeGreaterThanOrEqual(3);
    });

    it('literary prose has higher LD than verbose prose', () => {
      // Dense Modiano-style
      const literary = density(
        'Le crépuscule envahissait les ruelles étroites du vieux quartier.'
      );
      // Verbose AI-style
      const verbose = density(
        'Il est important de noter que le fait de considérer que les choses sont comme elles sont dans le cadre de cette situation.'
      );
      expect(literary.lexicalDensity).toBeGreaterThan(verbose.lexicalDensity);
    });

    it('LD is between 0 and 100', () => {
      const r = density('La lumière dorée du soir tombait sur les toits de Paris.');
      expect(r.lexicalDensity).toBeGreaterThanOrEqual(0);
      expect(r.lexicalDensity).toBeLessThanOrEqual(100);
    });

    it('contentWords + functionWords = totalWords', () => {
      const r = density('Il regardait la mer depuis le balcon de sa chambre.');
      expect(r.contentWords + r.functionWords).toBe(r.totalWords);
    });

    it('detects auxiliaries as function words', () => {
      const r = density('il a été vu');
      // a, été, il = function; vu = content
      const funcWords = r.classification.filter(w => w.type === 'function');
      const funcLowers = funcWords.map(w => w.lower);
      expect(funcLowers).toContain('il');
      expect(funcLowers).toContain('a');
      expect(funcLowers).toContain('été');
    });

    it('detects prepositions as function words', () => {
      const r = density('dans le jardin avec les enfants pour la fête');
      const funcWords = r.classification.filter(w => w.type === 'function');
      const funcLowers = funcWords.map(w => w.lower);
      expect(funcLowers).toContain('dans');
      expect(funcLowers).toContain('avec');
      expect(funcLowers).toContain('pour');
    });

    it('detects conjunctions as function words', () => {
      const r = density('il marchait et parlait mais ne courait pas');
      const funcWords = r.classification.filter(w => w.type === 'function');
      const funcLowers = funcWords.map(w => w.lower);
      expect(funcLowers).toContain('et');
      expect(funcLowers).toContain('mais');
      expect(funcLowers).toContain('ne');
      expect(funcLowers).toContain('pas');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LEXICAL DIVERSITY (TTR + HD-D)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Lexical Diversity (TTR + HD-D)', () => {

    it('repetitive text → low TTR', () => {
      const r = density('le chat le chat le chat le chat le chat le chat');
      expect(r.ttrRaw).toBeLessThan(0.3);
    });

    it('all unique words → TTR = 1.0', () => {
      const r = density('soleil montagne rivière forêt océan');
      expect(r.ttrRaw).toBe(1);
    });

    it('HD-D is between 0 and 1', () => {
      const r = density('La lumière dorée du soir tombait doucement sur les toits anciens de la ville endormie.');
      expect(r.hdd).toBeGreaterThanOrEqual(0);
      expect(r.hdd).toBeLessThanOrEqual(1);
    });

    it('diverse text has higher HD-D than repetitive text', () => {
      const diverse = density(
        'Le crépuscule envahissait les ruelles sombres tandis que la brise marine apportait une odeur saline.'
      );
      const repetitive = density(
        'Le grand homme et le grand arbre et le grand ciel et le grand vent et le grand jour.'
      );
      expect(diverse.hdd).toBeGreaterThan(repetitive.hdd);
    });

    it('uniqueWords count is correct', () => {
      const r = density('le chat noir et le chat blanc');
      // le(×2), chat(×2), noir, et, blanc → 5 unique
      expect(r.uniqueWords).toBe(5);
    });

    it('HD-D is stable (deterministic)', () => {
      const text = 'La lumière déclinait sur les collines lointaines tandis que le vent murmurait dans les feuilles.';
      const r1 = density(text);
      const r2 = density(text);
      expect(r1.hdd).toBe(r2.hdd);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VERB-ADJECTIVE RATIO (VAR)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Verb-Adjective Ratio (VAR)', () => {

    it('verb-heavy text → VAR > 1', () => {
      const r = density('Il courait sautait grimpait rampait nageait.');
      expect(r.verbCount).toBeGreaterThan(0);
      expect(r.var).toBeGreaterThan(1);
    });

    it('adjective-heavy text → VAR < 1', () => {
      const r = density(
        'Le magnifique paysage tropical était comparable à un décor fantastique et merveilleux.'
      );
      expect(r.adjectiveCount).toBeGreaterThan(0);
      expect(r.var).toBeLessThanOrEqual(1);
    });

    it('no adjectives → VAR = Infinity', () => {
      const r = density('courir sauter grimper nager marcher');
      expect(r.adjectiveCount).toBe(0);
      expect(r.var).toBe(Infinity);
    });

    it('no verbs no adjectives → VAR = 0', () => {
      const r = density('le la les un une des');
      expect(r.var).toBe(0);
    });

    it('classifies common adjectives correctly', () => {
      const r = density('grand petit beau noir blanc rouge');
      const adjectives = r.classification.filter(w => w.subType === 'adjective');
      expect(adjectives.length).toBeGreaterThanOrEqual(4);
    });

    it('classifies -eux/-ible/-able as adjectives', () => {
      const r = density('merveilleux terrible impossible admirable');
      const adjectives = r.classification.filter(w => w.subType === 'adjective');
      expect(adjectives.length).toBeGreaterThanOrEqual(3);
    });

    it('classifies infinitives as verbs', () => {
      const r = density('marcher courir dormir voir');
      const verbs = r.classification.filter(w => w.subType === 'verb');
      expect(verbs.length).toBeGreaterThanOrEqual(3);
    });

    it('classifies participes passés as verbs', () => {
      const r = density('mangé fini vendu pris');
      const verbs = r.classification.filter(w => w.subType === 'verb');
      expect(verbs.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPOSITE SCORE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Composite Density Score (DIAGNOSTIC ONLY)', () => {

    it('score is between 0 and 100', () => {
      const r = density('La lumière dorée du soir tombait doucement sur les toits de la ville.');
      expect(r.densityScore).toBeGreaterThanOrEqual(0);
      expect(r.densityScore).toBeLessThanOrEqual(100);
    });

    it('dense literary prose scores higher than verbose prose', () => {
      const literary = density(
        'Le crépuscule envahissait les ruelles étroites du vieux quartier silencieux.'
      );
      const verbose = density(
        'Il est important de noter que le fait de considérer que les choses sont dans le cadre de cette situation comme elles sont.'
      );
      expect(literary.densityScore).toBeGreaterThan(verbose.densityScore);
    });

    it('pure function words → low score', () => {
      const r = density('il est dans le pour la avec les sur des');
      expect(r.densityScore).toBeLessThan(50);
      // LD should be very low even if HD-D is high (all unique function words)
      expect(r.lexicalDensity).toBeLessThan(20);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {

    it('empty string → all zeros', () => {
      const r = density('');
      expect(r.totalWords).toBe(0);
      expect(r.lexicalDensity).toBe(0);
      expect(r.hdd).toBe(0);
      expect(r.densityScore).toBe(0);
    });

    it('punctuation only → all zeros', () => {
      const r = density('... !!! ???');
      expect(r.totalWords).toBe(0);
    });

    it('single content word', () => {
      const r = density('soleil');
      expect(r.totalWords).toBe(1);
      expect(r.contentWords).toBe(1);
      expect(r.lexicalDensity).toBe(100);
    });

    it('single function word', () => {
      const r = density('le');
      expect(r.totalWords).toBe(1);
      expect(r.functionWords).toBe(1);
      expect(r.lexicalDensity).toBe(0);
    });

    it('handles accented characters', () => {
      const r = density('éléphant âme île ôter ùbac');
      expect(r.totalWords).toBe(5);
      expect(r.contentWords).toBeGreaterThanOrEqual(3);
    });

    it('handles apostrophes (l\', d\', n\')', () => {
      const r = density("l'homme n'a qu'une chance d'y arriver");
      expect(r.totalWords).toBeGreaterThan(3);
    });

    it('very long text does not crash', () => {
      const sentence = 'La lumière dorée tombait sur les toits anciens de la ville. ';
      const longText = sentence.repeat(100);
      const r = density(longText);
      expect(r.totalWords).toBeGreaterThan(500);
      expect(r.lexicalDensity).toBeGreaterThan(0);
      expect(r.hdd).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINISM
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Determinism', () => {

    it('same input → identical output (all fields)', () => {
      const text = 'Le vieux quartier sommeillait dans la chaleur épaisse de juillet tandis que les volets clos gardaient leur secret.';
      const r1 = density(text);
      const r2 = density(text);

      expect(r1.lexicalDensity).toBe(r2.lexicalDensity);
      expect(r1.contentWords).toBe(r2.contentWords);
      expect(r1.functionWords).toBe(r2.functionWords);
      expect(r1.ttrRaw).toBe(r2.ttrRaw);
      expect(r1.hdd).toBe(r2.hdd);
      expect(r1.var).toBe(r2.var);
      expect(r1.densityScore).toBe(r2.densityScore);
      expect(r1.verbCount).toBe(r2.verbCount);
      expect(r1.adjectiveCount).toBe(r2.adjectiveCount);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LITERARY BENCHMARKS (diagnostic — NOT calibrated gates)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Literary Benchmarks (diagnostic)', () => {

    it('Modiano-style prose: LD ≥ 45', () => {
      const r = density(
        'La rue était déserte. Les réverbères jetaient une lumière jaune sur les façades grises. ' +
        'Il marchait sans but, les mains dans les poches, essayant de retrouver un souvenir qui lui échappait.'
      );
      expect(r.lexicalDensity).toBeGreaterThanOrEqual(45);
    });

    it('Flaubert-style prose: LD ≥ 48', () => {
      const r = density(
        'Les collines boisées ondulaient à perte de vue. Le fleuve coulait en contrebas, ' +
        'charriant des branches mortes et des reflets cuivrés. Le silence pesait sur la campagne ' +
        'comme un couvercle de plomb.'
      );
      expect(r.lexicalDensity).toBeGreaterThanOrEqual(48);
    });

    it('verbose AI prose: LD < 48', () => {
      const r = density(
        'Il est important de souligner que dans le contexte actuel de la situation présente, ' +
        'il convient de prendre en considération le fait que les éléments qui sont à notre disposition ' +
        'nous permettent de constater que les choses se déroulent de manière satisfaisante.'
      );
      expect(r.lexicalDensity).toBeLessThan(48);
    });

    it('literary prose has higher diversity than AI prose', () => {
      const literary = density(
        'Le crépuscule mordoré enveloppait les collines. Les peupliers frissonnaient. ' +
        'Un chien aboyait au loin. La rivière charriait des reflets orangés.'
      );
      const ai = density(
        'Il est donc clair que cette situation est une situation dans laquelle on peut voir ' +
        'que la situation est ce que la situation est dans le contexte de cette situation.'
      );
      expect(literary.hdd).toBeGreaterThan(ai.hdd);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSIFICATION TRANSPARENCY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Classification Transparency', () => {

    it('classification array has same length as totalWords', () => {
      const r = density('La lumière tombait sur les toits.');
      expect(r.classification.length).toBe(r.totalWords);
    });

    it('each word has type and subType', () => {
      const r = density('Le soleil brillait magnifiquement.');
      for (const w of r.classification) {
        expect(['content', 'function']).toContain(w.type);
        expect(['verb', 'adjective', 'noun_adverb', 'function']).toContain(w.subType);
      }
    });

    it('function words have subType "function"', () => {
      const r = density('le la les dans pour avec');
      for (const w of r.classification) {
        if (w.type === 'function') {
          expect(w.subType).toBe('function');
        }
      }
    });
  });
});
