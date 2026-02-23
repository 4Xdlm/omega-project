/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — nPVI RHYTHM CALCULATOR TESTS (P2)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  computeNPVI,
  computeVarco,
  computeGini,
  computeAutocorrelation,
  computeSpectralPeak,
  analyzeRhythm,
  analyzeRhythmFromSegments,
  type RhythmV2Analysis,
} from '../src/phonetic/npvi-calculator.js';
import { segmentProse } from '../src/phonetic/prosodic-segmenter.js';

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT: nPVI
// ═══════════════════════════════════════════════════════════════════════════════

describe('P2 — npvi-calculator', () => {

  describe('computeNPVI', () => {
    it('returns 0 for single element', () => {
      expect(computeNPVI([5])).toBe(0);
    });

    it('returns 0 for empty array', () => {
      expect(computeNPVI([])).toBe(0);
    });

    it('returns 0 for identical values', () => {
      expect(computeNPVI([4, 4, 4, 4])).toBe(0);
    });

    it('computes correctly for known series [2, 4]', () => {
      // |2-4| / ((2+4)/2) = 2/3 ≈ 0.6667
      // nPVI = 100 * (1/1) * 0.6667 = 66.67
      const result = computeNPVI([2, 4]);
      expect(result).toBeCloseTo(66.67, 1);
    });

    it('computes correctly for [2, 4, 2, 4] (alternating)', () => {
      // Each pair: |2-4|/3 = 0.6667, 3 pairs
      // nPVI = 100 * (1/3) * (0.6667*3) = 66.67
      const result = computeNPVI([2, 4, 2, 4]);
      expect(result).toBeCloseTo(66.67, 1);
    });

    it('higher variation → higher nPVI', () => {
      const low = computeNPVI([3, 4, 3, 4]);
      const high = computeNPVI([2, 6, 2, 6]);
      expect(high).toBeGreaterThan(low);
    });

    it('is always non-negative', () => {
      const series = [1, 5, 2, 8, 3, 7];
      expect(computeNPVI(series)).toBeGreaterThanOrEqual(0);
    });

    it('handles zeros gracefully', () => {
      // If avg=0, that pair is skipped
      expect(() => computeNPVI([0, 0, 5])).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIT: VarcoΔS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('computeVarco', () => {
    it('returns 0 for identical values', () => {
      expect(computeVarco([4, 4, 4, 4])).toBe(0);
    });

    it('returns 0 for single element', () => {
      expect(computeVarco([5])).toBe(0);
    });

    it('computes correct value for [2, 4]', () => {
      // mean=3, stddev=1, varco=100*1/3=33.33
      const result = computeVarco([2, 4]);
      expect(result).toBeCloseTo(33.33, 1);
    });

    it('higher variation → higher varco', () => {
      const low = computeVarco([3, 4, 3, 4]);
      const high = computeVarco([1, 7, 1, 7]);
      expect(high).toBeGreaterThan(low);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIT: Gini
  // ═══════════════════════════════════════════════════════════════════════════

  describe('computeGini', () => {
    it('returns 0 for identical values', () => {
      expect(computeGini([5, 5, 5, 5])).toBeCloseTo(0, 5);
    });

    it('returns 0 for single element', () => {
      expect(computeGini([5])).toBe(0);
    });

    it('is between 0 and 1', () => {
      const result = computeGini([1, 2, 3, 10, 20]);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('higher inequality → higher Gini', () => {
      const equal = computeGini([5, 5, 5, 5]);
      const unequal = computeGini([1, 1, 1, 20]);
      expect(unequal).toBeGreaterThan(equal);
    });

    it('computes correctly for [1, 3]', () => {
      // |1-1|+|1-3|+|3-1|+|3-3| = 0+2+2+0 = 4
      // Gini = 4 / (2*4*2) = 4/16 = 0.25
      expect(computeGini([1, 3])).toBeCloseTo(0.25, 5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIT: Autocorrelation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('computeAutocorrelation', () => {
    it('returns 0 for constant series', () => {
      expect(computeAutocorrelation([3, 3, 3, 3], 1)).toBe(0);
    });

    it('alternating series → negative autocorrelation', () => {
      const result = computeAutocorrelation([2, 6, 2, 6, 2, 6], 1);
      expect(result).toBeLessThan(0);
    });

    it('ascending series → positive autocorrelation', () => {
      const result = computeAutocorrelation([1, 2, 3, 4, 5, 6, 7, 8], 1);
      expect(result).toBeGreaterThan(0);
    });

    it('result is between -1 and 1', () => {
      const result = computeAutocorrelation([1, 5, 2, 8, 3, 7, 4], 1);
      expect(result).toBeGreaterThanOrEqual(-1);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('returns 0 for too-short series', () => {
      expect(computeAutocorrelation([5], 1)).toBe(0);
      expect(computeAutocorrelation([5, 3], 1)).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIT: Spectral Peak
  // ═══════════════════════════════════════════════════════════════════════════

  describe('computeSpectralPeak', () => {
    it('returns null for short series', () => {
      const { period } = computeSpectralPeak([2, 4, 2]);
      expect(period).toBeNull();
    });

    it('detects period 2 for ABAB pattern', () => {
      const { period, magnitude } = computeSpectralPeak([2, 6, 2, 6, 2, 6, 2, 6]);
      expect(period).toBe(2);
      expect(magnitude).toBeGreaterThan(0.3);
    });

    it('returns null/low magnitude for random-like series', () => {
      const { magnitude } = computeSpectralPeak([3, 4, 3, 5, 4, 3]);
      // Low variation = low spectral peak
      expect(magnitude).toBeLessThan(0.5);
    });

    it('detects period 3 for ABCABC pattern', () => {
      const { period } = computeSpectralPeak([2, 4, 6, 2, 4, 6, 2, 4, 6]);
      expect(period).toBeCloseTo(3, 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRATION: analyzeRhythm with real French prose
  // ═══════════════════════════════════════════════════════════════════════════

  describe('analyzeRhythm — full pipeline', () => {
    it('returns all fields for basic prose', () => {
      const r = analyzeRhythm(
        'Le vent soufflait dans les arbres, la pluie tombait doucement; ' +
        'il marchait lentement sur le chemin.',
      );
      expect(r.npvi_raw).toBeGreaterThanOrEqual(0);
      expect(r.npvi_weighted).toBeGreaterThanOrEqual(0);
      expect(r.varco_segments).toBeGreaterThanOrEqual(0);
      expect(r.gini_segments).toBeGreaterThanOrEqual(0);
      expect(r.gini_segments).toBeLessThanOrEqual(1);
      expect(r.autocorr_lag1).toBeGreaterThanOrEqual(-1);
      expect(r.autocorr_lag1).toBeLessThanOrEqual(1);
      expect(r.segment_count).toBeGreaterThanOrEqual(2);
      expect(r.rhythm_score).toBeGreaterThanOrEqual(0);
      expect(r.rhythm_score).toBeLessThanOrEqual(100);
      expect(r.rhythm_profile).toBeTruthy();
    });

    it('monotone prose → low nPVI', () => {
      // All segments ~same length
      const r = analyzeRhythm(
        'Il marchait, il parlait, il dormait, il mangeait, il marchait.',
      );
      expect(r.npvi_raw).toBeLessThan(40);
    });

    it('varied prose → higher nPVI', () => {
      const r = analyzeRhythm(
        'Silence. La lumière du matin entrait par les hautes fenêtres du salon, ' +
        'projetant sur le parquet des rectangles dorés; il restait là.',
      );
      expect(r.npvi_raw).toBeGreaterThan(20);
    });

    it('Modiano-style long sentence produces valid analysis', () => {
      const text = 'Il se souvenait de cette rue où il avait marché autrefois, ' +
        'lorsque la ville était encore silencieuse, ' +
        'et que les façades des immeubles gardaient quelque chose ' +
        'qui ressemblait à un secret.';
      const r = analyzeRhythm(text);
      expect(r.segment_count).toBeGreaterThanOrEqual(3);
      expect(r.rhythm_score).toBeGreaterThan(0);
      expect(r.mean_segment_syllables).toBeGreaterThan(0);
    });

    it('Flaubert periodic sentence', () => {
      const text = 'Elle rêvait aux pays chauds où les lendemains de noce ' +
        'se passent dans des hamacs, devant des golfes bleus; ' +
        'mais elle songeait aussi que tout cela finirait bien, ' +
        'car le temps efface les peines comme il efface les joies.';
      const r = analyzeRhythm(text);
      expect(r.segment_count).toBeGreaterThanOrEqual(4);
      expect(r.rhythm_profile).toBeTruthy();
    });

    it('single word → degenerate but valid', () => {
      const r = analyzeRhythm('Silence.');
      expect(r.npvi_raw).toBe(0);
      expect(r.segment_count).toBe(1);
      expect(r.rhythm_profile).toBe('monotone');
      expect(r.rhythm_score).toBe(0);
    });

    it('empty text → zero everything', () => {
      const r = analyzeRhythm('');
      expect(r.npvi_raw).toBe(0);
      expect(r.segment_count).toBe(0);
      expect(r.rhythm_score).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // analyzeRhythmFromSegments
  // ═══════════════════════════════════════════════════════════════════════════

  describe('analyzeRhythmFromSegments', () => {
    it('produces same result as analyzeRhythm', () => {
      const text = 'La nuit descendait sur la ville, tandis que les lumières ' +
        'commençaient à briller; il marchait sans but.';
      const seg = segmentProse(text);
      const r1 = analyzeRhythm(text);
      const r2 = analyzeRhythmFromSegments(seg);

      expect(r1.npvi_raw).toBe(r2.npvi_raw);
      expect(r1.npvi_weighted).toBe(r2.npvi_weighted);
      expect(r1.gini_segments).toBe(r2.gini_segments);
      expect(r1.rhythm_score).toBe(r2.rhythm_score);
      expect(r1.rhythm_profile).toBe(r2.rhythm_profile);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RHYTHM PROFILE CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rhythm profile classification', () => {
    it('constant segments → monotone', () => {
      // Force constant via direct nPVI computation path
      const r = analyzeRhythm(
        'Il dort, il dort, il dort, il dort, il dort, il dort.',
      );
      expect(r.rhythm_profile).toBe('monotone');
    });

    it('profile is always a valid enum value', () => {
      const validProfiles = new Set([
        'structured_swing', 'cadence_progressive', 'arc',
        'free_expressive', 'monotone', 'chaotic',
      ]);
      const texts = [
        'Le vent soufflait, la pluie tombait.',
        'Il marchait lentement dans la nuit profonde, tandis que les étoiles brillaient.',
        'Silence. La lumière. Un pas. Le mur. La porte.',
      ];
      for (const text of texts) {
        const r = analyzeRhythm(text);
        expect(validProfiles.has(r.rhythm_profile)).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPOSITE SCORE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Composite rhythm score', () => {
    it('score is between 0 and 100', () => {
      const texts = [
        'Le vent soufflait dans les arbres, la pluie tombait; il marchait.',
        'Il se souvenait de cette rue où il avait marché autrefois.',
        'Silence.',
        '',
      ];
      for (const text of texts) {
        const r = analyzeRhythm(text);
        expect(r.rhythm_score).toBeGreaterThanOrEqual(0);
        expect(r.rhythm_score).toBeLessThanOrEqual(100);
      }
    });

    it('monotone text scores lower than varied text', () => {
      const mono = analyzeRhythm(
        'Il dort, il dort, il dort, il dort, il dort.',
      );
      const varied = analyzeRhythm(
        'Le silence. La lumière du matin entrait par les fenêtres hautes du salon, ' +
        'projetant sur le parquet des rectangles dorés ' +
        'qui ressemblaient à des cartes de pays imaginaires; ' +
        'il restait là, debout, sans bouger.',
      );
      expect(varied.rhythm_score).toBeGreaterThan(mono.rhythm_score);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINISM
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Determinism', () => {
    it('same input → identical output (all fields)', () => {
      const text = 'La lumière déclinait lorsque la tempête éclata, ' +
        'brisant le silence qui régnait depuis des heures; ' +
        'il se leva et marcha vers la fenêtre.';

      const r1 = analyzeRhythm(text);
      const r2 = analyzeRhythm(text);

      expect(r1.npvi_raw).toBe(r2.npvi_raw);
      expect(r1.npvi_weighted).toBe(r2.npvi_weighted);
      expect(r1.varco_segments).toBe(r2.varco_segments);
      expect(r1.gini_segments).toBe(r2.gini_segments);
      expect(r1.autocorr_lag1).toBe(r2.autocorr_lag1);
      expect(r1.spectral_peak).toBe(r2.spectral_peak);
      expect(r1.spectral_magnitude).toBe(r2.spectral_magnitude);
      expect(r1.cadence_majeure).toBe(r2.cadence_majeure);
      expect(r1.cadence_arc).toBe(r2.cadence_arc);
      expect(r1.cadence_descendante).toBe(r2.cadence_descendante);
      expect(r1.rhythm_profile).toBe(r2.rhythm_profile);
      expect(r1.rhythm_score).toBe(r2.rhythm_score);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESPIRATION METRICS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Respiration metrics', () => {
    it('mean, min, max are consistent', () => {
      const r = analyzeRhythm(
        'Le vent soufflait, les arbres pliaient; ' +
        'la nuit descendait lentement sur la ville endormie.',
      );
      expect(r.min_segment_syllables).toBeLessThanOrEqual(r.mean_segment_syllables);
      expect(r.max_segment_syllables).toBeGreaterThanOrEqual(r.mean_segment_syllables);
      expect(r.min_segment_syllables).toBeGreaterThan(0);
    });

    it('max ≥ min always', () => {
      const r = analyzeRhythm('Silence, lumière; il marchait dans la nuit.');
      expect(r.max_segment_syllables).toBeGreaterThanOrEqual(r.min_segment_syllables);
    });
  });
});
