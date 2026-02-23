/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — P6 LEXICAL SURPRISE TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { analyzeSurprise, type SurpriseAnalysis } from '../src/phonetic/surprise-analyzer.js';

function surprise(text: string): SurpriseAnalysis {
  return analyzeSurprise(text);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHANNON ENTROPY
// ═══════════════════════════════════════════════════════════════════════════════

describe('P6 — surprise-analyzer', () => {

  describe('Shannon Entropy', () => {

    it('single repeated word → entropy = 0', () => {
      const r = surprise('chat chat chat chat chat');
      expect(r.shannonEntropy).toBe(0);
      expect(r.normalizedEntropy).toBe(0);
    });

    it('all unique words → high normalized entropy', () => {
      const r = surprise('soleil montagne rivière forêt océan prairie falaise');
      expect(r.normalizedEntropy).toBeGreaterThan(0.9);
    });

    it('entropy increases with vocabulary diversity', () => {
      const low = surprise('le chat le chat le chat le chat');
      const high = surprise('le chat noir mange la souris blanche vite');
      expect(high.shannonEntropy).toBeGreaterThan(low.shannonEntropy);
    });

    it('normalized entropy is between 0 and 1', () => {
      const r = surprise('La lumière dorée tombait sur les toits de Paris.');
      expect(r.normalizedEntropy).toBeGreaterThanOrEqual(0);
      expect(r.normalizedEntropy).toBeLessThanOrEqual(1);
    });

    it('entropy is non-negative', () => {
      const r = surprise('quelques mots au hasard');
      expect(r.shannonEntropy).toBeGreaterThanOrEqual(0);
    });

    it('vocabularySize = number of unique tokens', () => {
      // "le chat noir le chat blanc" → le(×2), chat(×2), noir, blanc = 4 unique
      const r = surprise('le chat noir le chat blanc');
      expect(r.vocabularySize).toBe(4);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BIGRAM SURPRISE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Bigram Surprise', () => {

    it('repeated bigram → low surprise', () => {
      // "le chat le chat le chat" → bigram "le→chat" and "chat→le" repeat
      const r = surprise('le chat le chat le chat le chat');
      expect(r.meanBigramSurprise).toBeLessThan(3);
    });

    it('all unique bigrams → higher surprise', () => {
      const r = surprise('soleil levant brise marine falaise abrupte forêt profonde');
      expect(r.meanBigramSurprise).toBeGreaterThan(2);
    });

    it('surprising text has higher bigram surprise than predictable text', () => {
      const predictable = surprise(
        'le chat mange le chat dort le chat joue le chat court le chat saute le chat boit'
      );
      const surprising = surprise(
        'le crépuscule envahissait les ruelles tandis que la brise apportait une odeur saline inattendue'
      );
      expect(surprising.meanBigramSurprise).toBeGreaterThan(predictable.meanBigramSurprise);
    });

    it('bigramSurprises length = totalTokens - 1', () => {
      const r = surprise('un deux trois quatre cinq');
      expect(r.bigramSurprises.length).toBe(r.totalTokens - 1);
    });

    it('all bigram surprise values are non-negative', () => {
      const r = surprise('La lumière déclinait sur les collines lointaines.');
      for (const s of r.bigramSurprises) {
        expect(s).toBeGreaterThanOrEqual(0);
      }
    });

    it('max bigram surprise ≥ mean bigram surprise', () => {
      const r = surprise('Le vieux quartier sommeillait dans la chaleur épaisse de juillet.');
      expect(r.maxBigramSurprise).toBeGreaterThanOrEqual(r.meanBigramSurprise);
    });

    it('std deviation is non-negative', () => {
      const r = surprise('Les feuilles tombaient doucement sur le sol humide.');
      expect(r.bigramSurpriseStd).toBeGreaterThanOrEqual(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HAPAX LEGOMENA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hapax Legomena', () => {

    it('all unique words → hapaxRatio = 1.0', () => {
      const r = surprise('soleil montagne rivière forêt océan');
      expect(r.hapaxRatio).toBe(1);
      expect(r.hapaxCount).toBe(5);
    });

    it('all repeated words → hapaxRatio = 0', () => {
      const r = surprise('chat chat chat chat');
      expect(r.hapaxRatio).toBe(0);
      expect(r.hapaxCount).toBe(0);
    });

    it('literary prose has higher hapax ratio than repetitive prose', () => {
      const literary = surprise(
        'Le crépuscule mordoré enveloppait les collines lointaines tandis que les peupliers frissonnaient.'
      );
      const repetitive = surprise(
        'le grand jour le grand soir le grand matin le grand temps le grand ciel le grand vent'
      );
      expect(literary.hapaxRatio).toBeGreaterThan(repetitive.hapaxRatio);
    });

    it('hapaxRatio is between 0 and 1', () => {
      const r = surprise('La lumière dorée tombait sur les toits anciens de la vieille ville.');
      expect(r.hapaxRatio).toBeGreaterThanOrEqual(0);
      expect(r.hapaxRatio).toBeLessThanOrEqual(1);
    });

    it('dis legomena count is correct', () => {
      // "le chat noir le chat blanc" → le(×2)=dis, chat(×2)=dis, noir(×1)=hapax, blanc(×1)=hapax
      const r = surprise('le chat noir le chat blanc');
      expect(r.disCount).toBe(2); // le, chat
      expect(r.hapaxCount).toBe(2); // noir, blanc
    });

    it('hapaxCount + disCount ≤ vocabularySize', () => {
      const r = surprise('La lumière dorée du soir tombait doucement sur les toits de la ville endormie.');
      expect(r.hapaxCount + r.disCount).toBeLessThanOrEqual(r.vocabularySize);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NOVELTY CURVE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Novelty Curve', () => {

    it('short text → empty novelty curve', () => {
      const r = surprise('quelques mots');
      expect(r.noveltyCurve.length).toBe(0);
      expect(r.meanNovelty).toBe(0);
    });

    it('long diverse text → non-empty novelty curve', () => {
      const text =
        'Le crépuscule envahissait les ruelles sombres de la vieille ville. ' +
        'Les réverbères jetaient une lumière jaune sur les façades grises. ' +
        'Un chien aboyait au loin. La rivière charriait des reflets orangés. ' +
        'Le vent murmurait dans les feuilles mortes des platanes centenaires.';
      const r = surprise(text);
      expect(r.noveltyCurve.length).toBeGreaterThan(0);
    });

    it('all novelty values are between 0 and 1', () => {
      const text =
        'Le soleil descendait lentement derrière les collines boisées. ' +
        'Les oiseaux chantaient leur dernier refrain avant la nuit tombante. ' +
        'La rivière serpentait entre les prairies verdoyantes du vallon paisible. ' +
        'Un brouillard léger montait des marécages proches envahissant les sentiers.';
      const r = surprise(text);
      for (const n of r.noveltyCurve) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(1);
      }
    });

    it('repetitive text → lower mean novelty than diverse text', () => {
      const repetitive =
        'le chat mange le chat dort le chat court le chat joue ' +
        'le chat mange le chat dort le chat court le chat joue ' +
        'le chat mange le chat dort le chat court le chat joue';
      const diverse =
        'Le crépuscule mordoré enveloppait les collines lointaines. ' +
        'Les peupliers frissonnaient sous la brise marine parfumée. ' +
        'Un chien aboyait dans la ruelle déserte du vieux quartier. ' +
        'La rivière charriait des branches mortes entre les rochers moussus.';

      const rRep = surprise(repetitive);
      const rDiv = surprise(diverse);

      if (rRep.noveltyCurve.length > 0 && rDiv.noveltyCurve.length > 0) {
        expect(rDiv.meanNovelty).toBeGreaterThan(rRep.meanNovelty);
      }
    });

    it('novelty spikes are valid indices into novelty curve', () => {
      const text =
        'Le matin calme précédait une journée terrible et sanglante. ' +
        'Les soldats avançaient dans la boue épaisse des tranchées profondes. ' +
        'Le ciel lourd pesait sur les épaules fatiguées des combattants épuisés. ' +
        'Un obus siffla puis explosa dans un fracas assourdissant de métal tordu.';
      const r = surprise(text);
      for (const idx of r.noveltySpikes) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(r.noveltyCurve.length);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPOSITE SCORE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Composite Surprise Score (DIAGNOSTIC ONLY)', () => {

    it('score is between 0 and 100', () => {
      const r = surprise('La lumière dorée tombait sur les toits de la ville.');
      expect(r.surpriseScore).toBeGreaterThanOrEqual(0);
      expect(r.surpriseScore).toBeLessThanOrEqual(100);
    });

    it('diverse text scores higher than repetitive text', () => {
      const diverse = surprise(
        'Le crépuscule envahissait les ruelles étroites du vieux quartier silencieux.'
      );
      const repetitive = surprise(
        'le chat le chat le chat le chat le chat le chat le chat le chat'
      );
      expect(diverse.surpriseScore).toBeGreaterThan(repetitive.surpriseScore);
    });

    it('single repeated word → very low score', () => {
      const r = surprise('chat chat chat chat chat chat chat');
      expect(r.surpriseScore).toBeLessThan(20);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {

    it('empty string → all zeros', () => {
      const r = surprise('');
      expect(r.totalTokens).toBe(0);
      expect(r.shannonEntropy).toBe(0);
      expect(r.surpriseScore).toBe(0);
    });

    it('single word', () => {
      const r = surprise('soleil');
      expect(r.totalTokens).toBe(1);
      expect(r.vocabularySize).toBe(1);
      expect(r.bigramSurprises.length).toBe(0);
    });

    it('two words', () => {
      const r = surprise('soleil montagne');
      expect(r.totalTokens).toBe(2);
      expect(r.bigramSurprises.length).toBe(1);
    });

    it('punctuation only → zeros', () => {
      const r = surprise('... !!! ???');
      expect(r.totalTokens).toBe(0);
    });

    it('accented characters handled', () => {
      const r = surprise('éléphant âme île ôter résumé naïf');
      expect(r.totalTokens).toBe(6);
      expect(r.vocabularySize).toBe(6);
    });

    it('very long text does not crash', () => {
      const sentence = 'La lumière dorée tombait sur les toits anciens de la ville. ';
      const longText = sentence.repeat(200);
      const r = surprise(longText);
      expect(r.totalTokens).toBeGreaterThan(1000);
      expect(r.shannonEntropy).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINISM
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Determinism', () => {

    it('same input → identical output (all fields)', () => {
      const text = 'Le vieux quartier sommeillait dans la chaleur épaisse de juillet tandis que les volets clos gardaient leur secret.';
      const r1 = surprise(text);
      const r2 = surprise(text);

      expect(r1.shannonEntropy).toBe(r2.shannonEntropy);
      expect(r1.normalizedEntropy).toBe(r2.normalizedEntropy);
      expect(r1.meanBigramSurprise).toBe(r2.meanBigramSurprise);
      expect(r1.hapaxRatio).toBe(r2.hapaxRatio);
      expect(r1.meanNovelty).toBe(r2.meanNovelty);
      expect(r1.surpriseScore).toBe(r2.surpriseScore);
      expect(r1.bigramSurprises).toEqual(r2.bigramSurprises);
      expect(r1.noveltyCurve).toEqual(r2.noveltyCurve);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LITERARY BENCHMARKS (diagnostic)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Literary Benchmarks (diagnostic)', () => {

    it('literary prose: normalized entropy ≥ 0.85', () => {
      const r = surprise(
        'Le crépuscule mordoré enveloppait les collines lointaines. ' +
        'Les peupliers frissonnaient sous la brise marine. ' +
        'Un chien aboyait dans la ruelle déserte.'
      );
      expect(r.normalizedEntropy).toBeGreaterThanOrEqual(0.85);
    });

    it('AI verbose prose: lower entropy than literary', () => {
      const literary = surprise(
        'Le crépuscule mordoré enveloppait les collines. Les peupliers frissonnaient. ' +
        'La rivière charriait des reflets orangés. Le vent murmurait dans les feuilles.'
      );
      const ai = surprise(
        'Il est important de noter que dans le cadre de cette situation il est clair ' +
        'que la situation est telle que la situation se présente dans le contexte actuel.'
      );
      expect(literary.normalizedEntropy).toBeGreaterThan(ai.normalizedEntropy);
    });
  });
});
