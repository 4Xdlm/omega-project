/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — R6 CALC SCORER — TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests unitaires pour le scorer CALC du R6 Rejection Gate.
 * Vérifie : routing linguistique, calcul Ridge, guards NaN, prose courte.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  routeLang,
  computeRidgeScore,
  scoreForR6Gate,
} from '../../src/gate/r6-calc-scorer.js';
import {
  COEFFICIENTS_V3_4,
  type LangModel,
} from '../../src/scoring/dispatcher/coefficients-v3-4.js';
import {
  DISPATCHER_FEATURE_NAMES,
  type DispatcherFeatureName,
} from '../../src/scoring/dispatcher/features-provenance.js';

// ──────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ──────────────────────────────────────────────────────────────────────────────

/** Prose française suffisamment longue pour le scoring CALC. */
const SAMPLE_PROSE_FR =
  'Le soleil déclinait sur les toits de la ville, projetant des ombres longues ' +
  'et dorées sur les pavés humides. Marie marchait sans se presser, les mains ' +
  'enfoncées dans les poches de son manteau. Elle pensait à cette lettre, celle ' +
  'qu\'elle n\'avait jamais envoyée, celle qui dormait encore dans le tiroir de ' +
  'sa commode. Les mots lui revenaient par fragments : « Je ne sais pas comment ' +
  'te dire que je pars, mais je pars. » Chaque syllabe portait le poids d\'une ' +
  'décision mûrie pendant des mois. Le vent soufflait, froid et insistant, comme ' +
  'pour lui rappeler que l\'hiver approchait. Elle s\'arrêta devant la boulangerie, ' +
  'hésita, puis poussa la porte. L\'odeur du pain chaud l\'enveloppa aussitôt, ' +
  'chaude et réconfortante. Elle commanda un café, s\'assit près de la fenêtre, ' +
  'et regarda les passants. Chacun portait son propre fardeau, invisible mais ' +
  'réel. Elle sortit un carnet, griffonna quelques lignes, puis referma le ' +
  'carnet d\'un geste brusque. Non. Pas aujourd\'hui. Demain peut-être, ou ' +
  'jamais. La nuit tomba doucement, comme un rideau de velours, et les lampadaires ' +
  's\'allumèrent un à un, traçant des chemins de lumière dans l\'obscurité naissante.';

const SAMPLE_PROSE_EN =
  'The old lighthouse stood at the edge of the cliff, its paint peeling and its ' +
  'light long extinguished. Sarah climbed the narrow path, her boots crunching on ' +
  'loose gravel. She had come here every summer as a child, but now the place felt ' +
  'different, smaller somehow, as though time had compressed the landscape. Inside, ' +
  'the spiral staircase groaned under her weight. She counted the steps — forty-seven, ' +
  'same as always. At the top, she found what she was looking for: the logbook, ' +
  'leather-bound and weathered, still sitting on the shelf where her grandfather ' +
  'had left it. She opened it carefully, and the smell of old paper filled the room. ' +
  'His handwriting was precise, meticulous, recording every storm, every ship, every ' +
  'dawn. She ran her fingers over the last entry, dated June 14th, 1987. "Clear skies. ' +
  'Calm seas. The gulls are quiet today." She closed the book and looked out through ' +
  'the cracked window. The sea was grey and restless, waves breaking white against ' +
  'the rocks below. She thought about permanence, about what endures and what fades.';

const SHORT_PROSE = 'Too short.';

// ──────────────────────────────────────────────────────────────────────────────
// ROUTING LINGUISTIQUE
// ──────────────────────────────────────────────────────────────────────────────

describe('routeLang', () => {
  it('routes "fr" to fr', () => {
    expect(routeLang('fr')).toBe('fr');
  });

  it('routes "en" to en', () => {
    expect(routeLang('en')).toBe('en');
  });

  it('routes "fra" to fr', () => {
    expect(routeLang('fra')).toBe('fr');
  });

  it('routes "eng" to en', () => {
    expect(routeLang('eng')).toBe('en');
  });

  it('routes "french" to fr (case insensitive)', () => {
    expect(routeLang('French')).toBe('fr');
  });

  it('routes "english" to en (case insensitive)', () => {
    expect(routeLang('ENGLISH')).toBe('en');
  });

  it('routes unknown languages to fallback', () => {
    expect(routeLang('es')).toBe('fallback');
    expect(routeLang('de')).toBe('fallback');
    expect(routeLang('')).toBe('fallback');
  });

  it('handles whitespace', () => {
    expect(routeLang('  fr  ')).toBe('fr');
    expect(routeLang(' en ')).toBe('en');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// RIDGE SCORING
// ──────────────────────────────────────────────────────────────────────────────

describe('computeRidgeScore', () => {
  it('returns intercept when all features are at mean', () => {
    const model = COEFFICIENTS_V3_4.fr as LangModel;
    const atMean: Record<string, number> = {};
    for (const name of DISPATCHER_FEATURE_NAMES) {
      const stats = model.features[name];
      atMean[name] = stats.mean;
    }

    const score = computeRidgeScore(
      model,
      atMean as Record<DispatcherFeatureName, number>,
    );
    expect(score).toBeCloseTo(model.intercept, 4);
  });

  it('returns intercept + coef when feature is 1 std above mean', () => {
    const model = COEFFICIENTS_V3_4.fr as LangModel;
    const features: Record<string, number> = {};

    // Set all features at mean except f24c which is 1 std above
    for (const name of DISPATCHER_FEATURE_NAMES) {
      const stats = model.features[name];
      features[name] = stats.mean;
    }
    features.f24c_contrast_delta =
      (model.features.f24c_contrast_delta as { mean: number; std: number; coef: number }).mean +
      (model.features.f24c_contrast_delta as { mean: number; std: number; coef: number }).std;

    const score = computeRidgeScore(
      model,
      features as Record<DispatcherFeatureName, number>,
    );
    const expected = model.intercept +
      (model.features.f24c_contrast_delta as { coef: number }).coef;
    expect(score).toBeCloseTo(expected, 4);
  });

  it('returns NaN if any feature is NaN', () => {
    const model = COEFFICIENTS_V3_4.fr as LangModel;
    const features: Record<string, number> = {};
    for (const name of DISPATCHER_FEATURE_NAMES) {
      features[name] = (model.features[name] as { mean: number }).mean;
    }
    features.f33b_commas_count = NaN;

    const score = computeRidgeScore(
      model,
      features as Record<DispatcherFeatureName, number>,
    );
    expect(score).toBeNaN();
  });

  it('returns NaN if any feature is Infinity', () => {
    const model = COEFFICIENTS_V3_4.fr as LangModel;
    const features: Record<string, number> = {};
    for (const name of DISPATCHER_FEATURE_NAMES) {
      features[name] = (model.features[name] as { mean: number }).mean;
    }
    features.f1a_rhythm_variance = Infinity;

    const score = computeRidgeScore(
      model,
      features as Record<DispatcherFeatureName, number>,
    );
    expect(score).toBeNaN();
  });

  it('produces different scores for FR and EN models', () => {
    const featuresFR: Record<string, number> = {};
    const featuresEN: Record<string, number> = {};
    for (const name of DISPATCHER_FEATURE_NAMES) {
      // Use FR means as raw features for both models
      featuresFR[name] = (COEFFICIENTS_V3_4.fr.features[name] as { mean: number }).mean;
      featuresEN[name] = (COEFFICIENTS_V3_4.fr.features[name] as { mean: number }).mean;
    }

    const scoreFR = computeRidgeScore(
      COEFFICIENTS_V3_4.fr as LangModel,
      featuresFR as Record<DispatcherFeatureName, number>,
    );
    const scoreEN = computeRidgeScore(
      COEFFICIENTS_V3_4.en as LangModel,
      featuresEN as Record<DispatcherFeatureName, number>,
    );

    // FR model at FR means = intercept, EN model at FR means ≠ intercept
    expect(scoreFR).toBeCloseTo(COEFFICIENTS_V3_4.fr.intercept, 4);
    expect(scoreEN).not.toBeCloseTo(COEFFICIENTS_V3_4.en.intercept, 1);
  });

  it('score is bounded for typical z-scores [-2, +2]', () => {
    const model = COEFFICIENTS_V3_4.fr as LangModel;
    // All features at +2 std
    const featuresHigh: Record<string, number> = {};
    for (const name of DISPATCHER_FEATURE_NAMES) {
      const stats = model.features[name] as { mean: number; std: number };
      featuresHigh[name] = stats.mean + 2 * stats.std;
    }
    const scoreHigh = computeRidgeScore(
      model,
      featuresHigh as Record<DispatcherFeatureName, number>,
    );

    // All features at -2 std
    const featuresLow: Record<string, number> = {};
    for (const name of DISPATCHER_FEATURE_NAMES) {
      const stats = model.features[name] as { mean: number; std: number };
      featuresLow[name] = stats.mean - 2 * stats.std;
    }
    const scoreLow = computeRidgeScore(
      model,
      featuresLow as Record<DispatcherFeatureName, number>,
    );

    // Scores should be within reasonable tier ordinal range
    expect(scoreHigh).toBeGreaterThan(1.0);
    expect(scoreHigh).toBeLessThan(7.5);
    expect(scoreLow).toBeGreaterThan(0.0);
    expect(scoreLow).toBeLessThan(7.5);
    expect(scoreHigh).toBeGreaterThan(scoreLow);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SCORE FOR R6 GATE
// ──────────────────────────────────────────────────────────────────────────────

describe('scoreForR6Gate', () => {
  it('returns a finite score for valid FR prose', () => {
    const result = scoreForR6Gate(SAMPLE_PROSE_FR, 'fr');
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.langRoute).toBe('fr');
    expect(result.skipReason).toBeUndefined();
    expect(result.modelVersion).toBe('3.4');
    expect(result.calibrationId).toContain('V3_4');
  });

  it('returns a finite score for valid EN prose', () => {
    const result = scoreForR6Gate(SAMPLE_PROSE_EN, 'en');
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.langRoute).toBe('en');
    expect(result.skipReason).toBeUndefined();
  });

  it('returns NaN + prose_too_short for short prose', () => {
    const result = scoreForR6Gate(SHORT_PROSE, 'fr');
    expect(result.score).toBeNaN();
    expect(result.skipReason).toBe('prose_too_short');
  });

  it('returns NaN + prose_too_short for empty string', () => {
    const result = scoreForR6Gate('', 'fr');
    expect(result.score).toBeNaN();
    expect(result.skipReason).toBe('prose_too_short');
  });

  it('respects custom minProseLength', () => {
    // Prose is ~150 chars, default min is 200
    const shortish = 'A'.repeat(150);
    const resultDefault = scoreForR6Gate(shortish, 'en', 200);
    expect(resultDefault.skipReason).toBe('prose_too_short');

    const resultCustom = scoreForR6Gate(shortish, 'en', 100);
    // With min=100, prose is long enough but features may be weird
    expect(resultCustom.skipReason).not.toBe('prose_too_short');
  });

  it('uses fallback model for unknown language', () => {
    const result = scoreForR6Gate(SAMPLE_PROSE_FR, 'es');
    expect(result.langRoute).toBe('fallback');
    // Score may or may not be finite depending on features, but routing is correct
  });

  it('all 5 features are present in result', () => {
    const result = scoreForR6Gate(SAMPLE_PROSE_FR, 'fr');
    for (const name of DISPATCHER_FEATURE_NAMES) {
      expect(name in result.features).toBe(true);
    }
  });

  it('score is deterministic for same input', () => {
    const result1 = scoreForR6Gate(SAMPLE_PROSE_FR, 'fr');
    const result2 = scoreForR6Gate(SAMPLE_PROSE_FR, 'fr');
    expect(result1.score).toBe(result2.score);
    expect(result1.features).toEqual(result2.features);
  });

  it('FR and EN scores differ for same prose', () => {
    const resultFR = scoreForR6Gate(SAMPLE_PROSE_FR, 'fr');
    const resultEN = scoreForR6Gate(SAMPLE_PROSE_FR, 'en');
    // Same prose, different models → different scores
    if (Number.isFinite(resultFR.score) && Number.isFinite(resultEN.score)) {
      expect(resultFR.score).not.toEqual(resultEN.score);
    }
  });
});
