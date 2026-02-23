/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — P7 INEVITABILITY TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { analyzeInevitability, type InevitabilityAnalysis } from '../src/phonetic/inevitability-analyzer.js';

function inev(text: string): InevitabilityAnalysis {
  return analyzeInevitability(text);
}

describe('P7 — inevitability-analyzer', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // LEXICAL COHESION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Lexical Cohesion', () => {

    it('single sentence → cohesion = 0 (no prior context)', () => {
      const r = inev('Le soleil brillait sur la colline.');
      expect(r.sentenceCount).toBe(1);
      expect(r.meanCohesion).toBe(0);
    });

    it('repeated vocabulary across sentences → high cohesion', () => {
      const r = inev(
        'Le chat dormait sur le toit. Le chat ronronnait sur le toit chaud. Le chat rêvait sur le toit brûlant.'
      );
      expect(r.meanCohesion).toBeGreaterThan(0.3);
    });

    it('completely disjoint sentences → low cohesion', () => {
      const r = inev(
        'Le soleil brillait. La montagne tremblait. Un poisson nageait.'
      );
      expect(r.meanCohesion).toBeLessThan(0.15);
    });

    it('cohesion curve has sentenceCount entries', () => {
      const r = inev(
        'Le matin arriva. Le soleil monta. Les oiseaux chantèrent.'
      );
      expect(r.cohesionCurve.length).toBe(r.sentenceCount);
    });

    it('first sentence cohesion is always 0', () => {
      const r = inev(
        'Le chat dormait. Le chien courait. Le soleil brillait.'
      );
      expect(r.cohesionCurve[0]).toBe(0);
    });

    it('cohesion values are between 0 and 1', () => {
      const r = inev(
        'Le chat dormait sur le toit. Le chat ronronnait doucement. Le toit brillait sous le soleil.'
      );
      for (const c of r.cohesionCurve) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    });

    it('cohesive prose scores higher than scattered prose', () => {
      const cohesive = inev(
        'La lumière tombait sur la rivière. La rivière reflétait la lumière dorée. ' +
        'Cette lumière dorée baignait les berges de la rivière.'
      );
      const scattered = inev(
        'Le chat dormait sur le toit. Un avion traversait le ciel bleu. ' +
        'La recette demandait trois œufs frais.'
      );
      expect(cohesive.meanCohesion).toBeGreaterThan(scattered.meanCohesion);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // THEMATIC THREADING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Thematic Threading', () => {

    it('consecutive sentences sharing words → threading > 0', () => {
      const r = inev(
        'Le jardin était paisible. Le jardin embaumait la rose.'
      );
      expect(r.meanThreading).toBeGreaterThan(0);
    });

    it('no shared words between consecutive sentences → threading = 0', () => {
      const r = inev(
        'Le soleil brillait. Un poisson nageait. La montagne tremblait.'
      );
      expect(r.meanThreading).toBe(0);
    });

    it('threading curve has sentenceCount-1 entries', () => {
      const r = inev(
        'Phrase une. Phrase deux. Phrase trois. Phrase quatre.'
      );
      expect(r.threadingCurve.length).toBe(r.sentenceCount - 1);
    });

    it('threading values are between 0 and 1', () => {
      const r = inev(
        'Le chat dormait sur le toit brûlant. Le toit brillait sous le soleil ardent. ' +
        'Le soleil déclinait lentement vers les collines lointaines.'
      );
      for (const t of r.threadingCurve) {
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(1);
      }
    });

    it('sustained theme has higher threading than topic-jumping', () => {
      const sustained = inev(
        'La forêt était sombre. Les arbres de la forêt cachaient le ciel. ' +
        'Dans cette forêt sombre les ombres dansaient entre les arbres.'
      );
      const jumping = inev(
        'Le chat dormait tranquillement. Un avion traversait le ciel. ' +
        'La recette demandait trois œufs frais.'
      );
      expect(sustained.meanThreading).toBeGreaterThan(jumping.meanThreading);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERGENCE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Convergence', () => {

    it('same vocabulary in both halves → high convergence', () => {
      const r = inev(
        'Le chat dormait sur le toit. Le toit protégeait le chat. ' +
        'Le chat aimait le toit. Le toit abritait le chat endormi.'
      );
      expect(r.convergence).toBeGreaterThan(0.25);
    });

    it('different vocabulary in each half → low convergence', () => {
      const r = inev(
        'Le soleil brillait sur la montagne. La montagne dominait la vallée. ' +
        'Un poisson nageait dans la rivière. La rivière serpentait entre les rochers.'
      );
      expect(r.convergence).toBeLessThan(
        inev(
          'Le chat dormait sur le toit. Le toit protégeait le chat. ' +
          'Le chat aimait le toit. Le toit abritait le chat.'
        ).convergence
      );
    });

    it('convergence is between 0 and 1', () => {
      const r = inev(
        'Le matin arriva lentement. Le soleil monta doucement. ' +
        'Les oiseaux chantèrent joyeusement. La journée commença paisiblement.'
      );
      expect(r.convergence).toBeGreaterThanOrEqual(0);
      expect(r.convergence).toBeLessThanOrEqual(1);
    });

    it('single sentence → convergence = 0', () => {
      const r = inev('Le soleil brillait.');
      expect(r.convergence).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ECHO DENSITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Echo Density', () => {

    it('first and last sentence share words → echo > 0', () => {
      const r = inev(
        'Le chat dormait sur le toit. Le chien courait dans la rue. ' +
        'Le chat revenait sur le toit.'
      );
      expect(r.echoDensity).toBeGreaterThan(0);
    });

    it('first and last sentence share no words → echo = 0', () => {
      const r = inev(
        'Le soleil brillait fort. La montagne tremblait violemment. ' +
        'Un poisson nageait tranquillement.'
      );
      expect(r.echoDensity).toBe(0);
    });

    it('echo density is between 0 and 1', () => {
      const r = inev(
        'Le chat dormait paisiblement. Le chien courait joyeusement. ' +
        'Le chat ronronnait doucement.'
      );
      expect(r.echoDensity).toBeGreaterThanOrEqual(0);
      expect(r.echoDensity).toBeLessThanOrEqual(1);
    });

    it('single sentence → echo = 0', () => {
      const r = inev('Le soleil brillait.');
      expect(r.echoDensity).toBe(0);
    });

    it('circular text (same first/last) → high echo', () => {
      const r = inev(
        'Le vieux jardin dormait sous la neige. La ville bourdonnait au loin. ' +
        'Le vieux jardin dormait sous la neige.'
      );
      expect(r.echoDensity).toBeGreaterThan(0.5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COHESION TREND
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cohesion Trend', () => {

    it('building cohesion → positive trend', () => {
      // Each sentence introduces more callbacks
      const r = inev(
        'Le jardin était vaste. Le jardin abritait des roses. ' +
        'Les roses du jardin embaumaient. Les roses parfumées du vaste jardin resplendissaient.'
      );
      expect(r.cohesionTrend).toBeGreaterThan(0);
    });

    it('single sentence → trend = 0', () => {
      const r = inev('Le soleil brillait.');
      expect(r.cohesionTrend).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPOSITE SCORE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Composite Score (DIAGNOSTIC ONLY)', () => {

    it('score is between 0 and 100', () => {
      const r = inev(
        'Le chat dormait. Le chien courait. Le soleil brillait. La nuit tombait.'
      );
      expect(r.inevitabilityScore).toBeGreaterThanOrEqual(0);
      expect(r.inevitabilityScore).toBeLessThanOrEqual(100);
    });

    it('cohesive text scores higher than scattered text', () => {
      const cohesive = inev(
        'La lumière tombait sur la rivière. La rivière reflétait cette lumière. ' +
        'Cette lumière dorée baignait les berges. Les berges de la rivière brillaient.'
      );
      const scattered = inev(
        'Le chat dormait. Un avion volait. La recette demandait du sel. Mars est rouge.'
      );
      expect(cohesive.inevitabilityScore).toBeGreaterThan(scattered.inevitabilityScore);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {

    it('empty string → all zeros', () => {
      const r = inev('');
      expect(r.sentenceCount).toBe(0);
      expect(r.inevitabilityScore).toBe(0);
    });

    it('punctuation only → all zeros', () => {
      const r = inev('... !!! ???');
      expect(r.sentenceCount).toBe(0);
    });

    it('two sentences minimum for meaningful analysis', () => {
      const r = inev('Le soleil brillait. La lune montait.');
      expect(r.sentenceCount).toBe(2);
      expect(r.threadingCurve.length).toBe(1);
    });

    it('handles accented text', () => {
      const r = inev('La forêt était épaisse. Les âmes erraient dans la forêt épaisse.');
      expect(r.sentenceCount).toBe(2);
      expect(r.meanCohesion).toBeGreaterThan(0);
    });

    it('long text does not crash', () => {
      const para =
        'Le soleil brillait sur la colline. La colline dominait la vallée. ' +
        'La vallée abritait un village. Le village dormait sous le soleil. ';
      const longText = para.repeat(50);
      const r = inev(longText);
      expect(r.sentenceCount).toBeGreaterThan(100);
      expect(r.meanCohesion).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINISM
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Determinism', () => {

    it('same input → identical output', () => {
      const text =
        'Le vieux quartier sommeillait. Les volets clos gardaient leur secret. ' +
        'Le quartier retenait son souffle dans la chaleur.';
      const r1 = inev(text);
      const r2 = inev(text);

      expect(r1.meanCohesion).toBe(r2.meanCohesion);
      expect(r1.meanThreading).toBe(r2.meanThreading);
      expect(r1.convergence).toBe(r2.convergence);
      expect(r1.echoDensity).toBe(r2.echoDensity);
      expect(r1.cohesionTrend).toBe(r2.cohesionTrend);
      expect(r1.inevitabilityScore).toBe(r2.inevitabilityScore);
      expect(r1.cohesionCurve).toEqual(r2.cohesionCurve);
      expect(r1.threadingCurve).toEqual(r2.threadingCurve);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LITERARY BENCHMARKS (diagnostic)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Literary Benchmarks (diagnostic)', () => {

    it('Modiano-style circular prose → echo > 0', () => {
      const r = inev(
        'Il marchait dans la rue déserte. Les réverbères jetaient des ombres longues. ' +
        'Les façades semblaient le regarder. Il continuait de marcher dans la rue déserte.'
      );
      expect(r.echoDensity).toBeGreaterThan(0);
    });

    it('well-structured prose: convergence > 0.15', () => {
      const r = inev(
        'La lumière déclinait sur les collines. Les collines projetaient des ombres longues. ' +
        'Les ombres envahissaient la vallée. La vallée sombrait dans la lumière déclinante.'
      );
      expect(r.convergence).toBeGreaterThan(0.15);
    });

    it('AI scattered prose: lower cohesion than literary', () => {
      const literary = inev(
        'La forêt était sombre. Les arbres de la forêt cachaient le ciel sombre. ' +
        'Dans cette forêt les ombres dansaient parmi les arbres.'
      );
      const ai = inev(
        'Il est important de noter ceci. Cependant il faut considérer cela. ' +
        'En conclusion nous pouvons affirmer autre chose.'
      );
      expect(literary.meanCohesion).toBeGreaterThan(ai.meanCohesion);
    });
  });
});
