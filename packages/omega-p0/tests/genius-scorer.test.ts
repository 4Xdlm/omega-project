/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — P8 GENIUS COMPOSITE SCORER TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { scoreGenius, type GeniusAnalysis } from '../src/phonetic/genius-scorer.js';
import { analyzeDensity } from '../src/phonetic/semantic-density.js';
import { analyzeSurprise } from '../src/phonetic/surprise-analyzer.js';

function genius(text: string): GeniusAnalysis {
  return scoreGenius(text);
}

describe('P8 — genius-scorer', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPOSITE SCORE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Composite Score', () => {

    it('score is between 0 and 100', () => {
      const r = genius('La lumière dorée du soir tombait doucement sur les toits anciens de la ville.');
      expect(r.geniusScore).toBeGreaterThanOrEqual(0);
      expect(r.geniusScore).toBeLessThanOrEqual(100);
    });

    it('literary prose scores higher than verbose AI prose', () => {
      const literary = genius(
        'Le crépuscule mordoré enveloppait les collines lointaines. ' +
        'Les peupliers frissonnaient sous la brise marine parfumée. ' +
        'Un chien aboyait dans la ruelle déserte du vieux quartier. ' +
        'La rivière charriait des branches mortes entre les rochers moussus.'
      );
      const verbose = genius(
        'Il est important de noter que dans le contexte actuel de la situation présente ' +
        'il convient de prendre en considération le fait que les éléments qui sont à notre disposition ' +
        'nous permettent de constater que les choses se déroulent de manière satisfaisante dans le cadre ' +
        'de cette situation qui est la situation actuelle.'
      );
      expect(literary.geniusScore).toBeGreaterThan(verbose.geniusScore);
    });

    it('single word → low but valid score', () => {
      const r = genius('soleil');
      expect(r.geniusScore).toBeGreaterThanOrEqual(0);
      expect(r.geniusScore).toBeLessThanOrEqual(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AXIS BREAKDOWN
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Axis Breakdown', () => {

    it('all 5 axes are present', () => {
      const r = genius('La lumière tombait sur les toits de la ville endormie.');
      expect(r.axes.density).toBeDefined();
      expect(r.axes.surprise).toBeDefined();
      expect(r.axes.inevitability).toBeDefined();
      expect(r.axes.resonance).toBeDefined();
      expect(r.axes.voice).toBeDefined();
    });

    it('each axis has score, weight, contribution, confidence', () => {
      const r = genius('Le chat dormait sur le toit brûlant.');
      for (const axis of Object.values(r.axes)) {
        expect(axis.score).toBeGreaterThanOrEqual(0);
        expect(axis.score).toBeLessThanOrEqual(100);
        expect(axis.weight).toBeGreaterThan(0);
        expect(axis.weight).toBeLessThanOrEqual(1);
        expect(axis.contribution).toBeGreaterThanOrEqual(0);
        expect(axis.confidence).toBeGreaterThan(0);
        expect(axis.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('weights sum to 1.0', () => {
      const r = genius('Le soleil brillait.');
      const totalWeight =
        r.axes.density.weight +
        r.axes.surprise.weight +
        r.axes.inevitability.weight +
        r.axes.resonance.weight +
        r.axes.voice.weight;
      expect(totalWeight).toBeCloseTo(1.0, 5);
    });

    it('each axis score is between 0 and 100', () => {
      const r = genius(
        'Le vieux quartier sommeillait dans la chaleur épaisse de juillet ' +
        'tandis que les volets clos gardaient leur secret.'
      );
      expect(r.axes.density.score).toBeGreaterThanOrEqual(0);
      expect(r.axes.density.score).toBeLessThanOrEqual(100);
      expect(r.axes.surprise.score).toBeGreaterThanOrEqual(0);
      expect(r.axes.surprise.score).toBeLessThanOrEqual(100);
      expect(r.axes.inevitability.score).toBeGreaterThanOrEqual(0);
      expect(r.axes.inevitability.score).toBeLessThanOrEqual(100);
      expect(r.axes.resonance.score).toBeGreaterThanOrEqual(0);
      expect(r.axes.resonance.score).toBeLessThanOrEqual(100);
      expect(r.axes.voice.score).toBeGreaterThanOrEqual(0);
      expect(r.axes.voice.score).toBeLessThanOrEqual(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FLOOR / CEILING / SPREAD
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Floor / Ceiling / Spread', () => {

    it('floor ≤ ceiling', () => {
      const r = genius('La lumière dorée tombait sur les toits anciens de la ville.');
      expect(r.floorScore).toBeLessThanOrEqual(r.ceilingScore);
    });

    it('spread = ceiling - floor', () => {
      const r = genius('Le vent soufflait entre les collines boisées du vallon paisible.');
      expect(r.spread).toBe(r.ceilingScore - r.floorScore);
    });

    it('spread ≥ 0', () => {
      const r = genius('Un mot.');
      expect(r.spread).toBeGreaterThanOrEqual(0);
    });

    it('floor and ceiling are within 0-100', () => {
      const r = genius(
        'Le crépuscule envahissait les ruelles sombres du quartier ancien.'
      );
      expect(r.floorScore).toBeGreaterThanOrEqual(0);
      expect(r.ceilingScore).toBeLessThanOrEqual(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANTI-CORRELATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Anti-Correlation', () => {

    it('penalty is non-negative', () => {
      const r = genius('La lumière dorée du soir tombait sur les toits.');
      expect(r.antiCorrelationPenalty).toBeGreaterThanOrEqual(0);
    });

    it('penalty is bounded', () => {
      const r = genius('Le chat dormait.');
      expect(r.antiCorrelationPenalty).toBeLessThanOrEqual(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RAW SUB-ANALYSES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Raw Sub-Analyses', () => {

    it('all 6 raw analyses are populated', () => {
      const r = genius('La lumière tombait sur les toits de Paris.');
      expect(r.raw.density).toBeDefined();
      expect(r.raw.density.totalWords).toBeGreaterThan(0);
      expect(r.raw.surprise).toBeDefined();
      expect(r.raw.surprise.totalTokens).toBeGreaterThan(0);
      expect(r.raw.inevitability).toBeDefined();
      expect(r.raw.rhythm).toBeDefined();
      expect(r.raw.euphony).toBeDefined();
      expect(r.raw.calques).toBeDefined();
    });

    it('raw density matches standalone P5', () => {
      const text = 'Le crépuscule envahissait les ruelles étroites.';
      const r = genius(text);
      // densityScore should match standalone analyzer
      const standalone = analyzeDensity(text);
      expect(r.raw.density.lexicalDensity).toBe(standalone.lexicalDensity);
    });

    it('raw surprise matches standalone P6', () => {
      const text = 'Le crépuscule envahissait les ruelles étroites.';
      const r = genius(text);
      const standalone = analyzeSurprise(text);
      expect(r.raw.surprise.shannonEntropy).toBe(standalone.shannonEntropy);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESONANCE (nPVI mapping)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Resonance Normalization', () => {

    it('literary French prose → resonance > 30', () => {
      const r = genius(
        'Le crépuscule mordoré enveloppait les collines lointaines. ' +
        'Les peupliers frissonnaient sous la brise marine parfumée. ' +
        'Un chien aboyait dans la ruelle déserte du vieux quartier.'
      );
      expect(r.axes.resonance.score).toBeGreaterThan(30);
    });

    it('monotone text → lower resonance', () => {
      // All 2-syllable words → flat rhythm → nPVI low
      const monotone = genius('papa mama papa mama papa mama papa mama');
      const varied = genius(
        'Le crépuscule envahissait les ruelles étroites du vieux quartier silencieux.'
      );
      // Varied should have better resonance (closer to ideal nPVI)
      expect(varied.axes.resonance.score).toBeGreaterThanOrEqual(monotone.axes.resonance.score);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE (euphony × anti-calque)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Voice Normalization', () => {

    it('clean French prose → voice > 50', () => {
      const r = genius(
        'Le crépuscule mordoré enveloppait les collines lointaines. ' +
        'La rivière charriait des reflets orangés entre les rochers moussus.'
      );
      expect(r.axes.voice.score).toBeGreaterThan(50);
    });

    it('calque-heavy text → lower voice than clean text', () => {
      const clean = genius(
        'La lumière dorée tombait sur les toits anciens de la vieille ville paisible.'
      );
      const calqued = genius(
        'Elle a réalisé que le problème était définitivement basé sur une approche sophistiquée.'
      );
      expect(clean.axes.voice.score).toBeGreaterThanOrEqual(calqued.axes.voice.score);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {

    it('empty string → score 0', () => {
      const r = genius('');
      expect(r.geniusScore).toBe(0);
    });

    it('very long text does not crash', () => {
      const sentence = 'La lumière dorée tombait sur les toits anciens. ';
      const longText = sentence.repeat(100);
      const r = genius(longText);
      expect(r.geniusScore).toBeGreaterThanOrEqual(0);
      expect(r.geniusScore).toBeLessThanOrEqual(100);
    });

    it('punctuation only → score 0', () => {
      const r = genius('... !!! ???');
      expect(r.geniusScore).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINISM
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Determinism', () => {

    it('same input → identical GENIUS score', () => {
      const text =
        'Le vieux quartier sommeillait dans la chaleur épaisse de juillet. ' +
        'Les volets clos gardaient leur secret. ' +
        'Un chat dormait sur le rebord de la fenêtre.';
      const r1 = genius(text);
      const r2 = genius(text);

      expect(r1.geniusScore).toBe(r2.geniusScore);
      expect(r1.axes.density.score).toBe(r2.axes.density.score);
      expect(r1.axes.surprise.score).toBe(r2.axes.surprise.score);
      expect(r1.axes.inevitability.score).toBe(r2.axes.inevitability.score);
      expect(r1.axes.resonance.score).toBe(r2.axes.resonance.score);
      expect(r1.axes.voice.score).toBe(r2.axes.voice.score);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LITERARY COMPARISON (diagnostic — not gates)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Literary vs AI Comparison (diagnostic)', () => {

    it('Modiano-style prose outscores generic AI prose across most axes', () => {
      const modiano = genius(
        'Il marchait dans la rue déserte. Les réverbères jetaient des ombres longues sur le trottoir. ' +
        'Les façades semblaient le regarder avec indifférence. ' +
        'Il continuait de marcher sans but dans cette rue déserte.'
      );
      const ai = genius(
        'Il est important de noter que dans le contexte actuel il convient de considérer ' +
        'que les éléments à notre disposition nous permettent de constater que la situation ' +
        'se déroule de manière satisfaisante dans le cadre actuel.'
      );

      // Literary should win on density and surprise at minimum
      expect(modiano.axes.density.score).toBeGreaterThan(ai.axes.density.score);
      expect(modiano.axes.surprise.score).toBeGreaterThanOrEqual(ai.axes.surprise.score);
    });

    it('varied literary prose has higher GENIUS than monotone prose', () => {
      const varied = genius(
        'Le crépuscule mordoré enveloppait les collines lointaines. ' +
        'Les peupliers frissonnaient sous la brise marine. ' +
        'Un chien aboyait dans la ruelle déserte du vieux quartier. ' +
        'La rivière charriait des branches mortes entre les rochers moussus.'
      );
      const monotone = genius(
        'Le chat dort. Le chat mange. Le chat court. Le chat dort. ' +
        'Le chat mange. Le chat court. Le chat dort. Le chat mange.'
      );
      expect(varied.geniusScore).toBeGreaterThan(monotone.geniusScore);
    });
  });
});
