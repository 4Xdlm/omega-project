/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — nPVI RHYTHM CALCULATOR V2 (P2)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: phonetic/npvi-calculator.ts
 * Phase: P2 (depends on P0 + P1)
 * Invariant: ART-PHON-P2
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Computes rhythm metrics from prosodic segment series:
 *
 *   1. nPVI (normalized Pairwise Variability Index)
 *      — Classic + weighted (syllabic mass from P0)
 *   2. VarcoΔS (coefficient of variation of segment durations)
 *   3. Gini coefficient of segment lengths
 *   4. Autocorrelation lag-1 (swing vs monotony vs chaos)
 *   5. Spectral peak via FFT (periodic patterns ABAB etc.)
 *   6. Cadence detection: arc, majeure, free, monotone, chaotic
 *
 * All metrics are CALC — deterministic — zero LLM.
 *
 * VALIDITY CLAIMS:
 *   nPVI: originalDomain="speech timing", appliedDomain="syllable proxy"
 *   Gini: originalDomain="inequality statistics", appliedDomain="segment length distribution"
 *   Autocorrelation: originalDomain="signal processing", appliedDomain="rhythmic alternation"
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { segmentProse, type SegmentationResult } from './prosodic-segmenter.js';
import { DEFAULT_WEIGHT_CONFIG, type SyllableWeightConfig } from './syllable-counter-fr.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RhythmV2Analysis {
  // ─── Variance ───
  /** Classic nPVI on raw syllable counts */
  readonly npvi_raw: number;
  /** nPVI on weighted syllabic mass */
  readonly npvi_weighted: number;
  /** Coefficient of variation of segment syllable counts (%) */
  readonly varco_segments: number;
  /** Gini coefficient of segment lengths (0=equal, 1=max inequality) */
  readonly gini_segments: number;

  // ─── Dynamics ───
  /** Autocorrelation at lag 1: negative=swing, ~0=random, positive=clusters */
  readonly autocorr_lag1: number;
  /** Dominant spectral period (null if no significant peak) */
  readonly spectral_peak: number | null;
  /** Spectral magnitude of dominant peak (0-1 normalized) */
  readonly spectral_magnitude: number;

  // ─── Cadence ───
  /** Correlation with ascending ramp (majeure) */
  readonly cadence_majeure: number;
  /** Correlation with bell curve (arc) */
  readonly cadence_arc: number;
  /** Correlation with descending ramp */
  readonly cadence_descendante: number;

  // ─── Respiration ───
  /** Mean syllables per segment */
  readonly mean_segment_syllables: number;
  /** Max segment syllables */
  readonly max_segment_syllables: number;
  /** Min segment syllables */
  readonly min_segment_syllables: number;

  // ─── Meta ───
  /** Detected rhythm profile */
  readonly rhythm_profile: RhythmProfile;
  /** Number of segments analyzed */
  readonly segment_count: number;
  /** Composite rhythm score (0-100) */
  readonly rhythm_score: number;
}

export type RhythmProfile =
  | 'structured_swing'      // High nPVI + negative autocorr = deliberate alternation
  | 'cadence_progressive'   // High majeure correlation = building momentum
  | 'arc'                   // High arc correlation = rise and fall
  | 'free_expressive'       // Moderate nPVI + low autocorr = natural variety
  | 'monotone'              // Low nPVI + low Gini = flat
  | 'chaotic';              // Very high nPVI + no pattern = disjointed

// ═══════════════════════════════════════════════════════════════════════════════
// CORE METRICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute nPVI (normalized Pairwise Variability Index).
 * Formula: nPVI = 100 × (1/(n-1)) × Σ |d[k] - d[k+1]| / ((d[k] + d[k+1]) / 2)
 *
 * Higher = more rhythmic variation.
 * French prose typically: 40-65
 */
export function computeNPVI(series: readonly number[]): number {
  if (series.length < 2) return 0;

  let sum = 0;
  for (let k = 0; k < series.length - 1; k++) {
    const avg = (series[k] + series[k + 1]) / 2;
    if (avg === 0) continue;
    sum += Math.abs(series[k] - series[k + 1]) / avg;
  }

  return 100 * sum / (series.length - 1);
}

/**
 * Compute VarcoΔS: coefficient of variation (%).
 * Formula: 100 × stddev / mean
 */
export function computeVarco(series: readonly number[]): number {
  if (series.length < 2) return 0;

  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  if (mean === 0) return 0;

  const variance = series.reduce((sum, x) => sum + (x - mean) ** 2, 0) / series.length;
  const stddev = Math.sqrt(variance);

  return 100 * stddev / mean;
}

/**
 * Compute Gini coefficient.
 * Measures inequality of distribution.
 * 0 = perfectly equal, 1 = maximum inequality.
 * Target FR: 0.15-0.40 (to be calibrated)
 */
export function computeGini(series: readonly number[]): number {
  const n = series.length;
  if (n < 2) return 0;

  const sorted = [...series].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return 0;

  let sumAbsDiff = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumAbsDiff += Math.abs(sorted[i] - sorted[j]);
    }
  }

  return sumAbsDiff / (2 * n * n * mean);
}

/**
 * Compute autocorrelation at lag k.
 * Negative = alternation (swing), ~0 = random, Positive = clustering (monotone).
 */
export function computeAutocorrelation(series: readonly number[], lag: number): number {
  const n = series.length;
  if (n < lag + 2) return 0;

  const mean = series.reduce((a, b) => a + b, 0) / n;
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    denominator += (series[i] - mean) ** 2;
  }

  if (denominator === 0) return 0;

  for (let i = 0; i < n - lag; i++) {
    numerator += (series[i] - mean) * (series[i + lag] - mean);
  }

  return numerator / denominator;
}

/**
 * Simple DFT to detect periodic patterns.
 * Returns dominant period and its normalized magnitude.
 *
 * For rhythm: period=2 means ABAB alternation,
 * period=3 means ABCABC, etc.
 */
export function computeSpectralPeak(
  series: readonly number[],
): { period: number | null; magnitude: number } {
  const n = series.length;
  if (n < 4) return { period: null, magnitude: 0 };

  const mean = series.reduce((a, b) => a + b, 0) / n;
  const centered = series.map(x => x - mean);

  let maxMag = 0;
  let maxFreqIdx = 0;

  // Check frequencies from 1 to n/2
  const halfN = Math.floor(n / 2);
  for (let k = 1; k <= halfN; k++) {
    let re = 0;
    let im = 0;
    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n;
      re += centered[t] * Math.cos(angle);
      im -= centered[t] * Math.sin(angle);
    }
    const mag = Math.sqrt(re * re + im * im) / n;
    if (mag > maxMag) {
      maxMag = mag;
      maxFreqIdx = k;
    }
  }

  // Normalize magnitude by signal energy
  const energy = Math.sqrt(centered.reduce((s, x) => s + x * x, 0) / n);
  const normalizedMag = energy > 0 ? maxMag / energy : 0;

  // Significance threshold: must be at least 0.3 normalized
  if (normalizedMag < 0.3) {
    return { period: null, magnitude: normalizedMag };
  }

  const period = n / maxFreqIdx;
  return { period, magnitude: normalizedMag };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CADENCE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute Pearson correlation between two series.
 */
function pearsonCorrelation(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;

  const meanA = a.slice(0, n).reduce((s, x) => s + x, 0) / n;
  const meanB = b.slice(0, n).reduce((s, x) => s + x, 0) / n;

  let num = 0;
  let denA = 0;
  let denB = 0;

  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }

  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

/**
 * Generate reference cadence patterns for correlation.
 */
function generateBellCurve(n: number): readonly number[] {
  // Gaussian bell centered at n/2
  const center = (n - 1) / 2;
  const sigma = n / 4;
  return Array.from({ length: n }, (_, i) =>
    Math.exp(-0.5 * ((i - center) / sigma) ** 2),
  );
}

function generateAscendingRamp(n: number): readonly number[] {
  return Array.from({ length: n }, (_, i) => i / (n - 1));
}

function generateDescendingRamp(n: number): readonly number[] {
  return Array.from({ length: n }, (_, i) => 1 - i / (n - 1));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RHYTHM PROFILE CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

function classifyProfile(
  npvi: number,
  gini: number,
  autocorr: number,
  cadMaj: number,
  cadArc: number,
): RhythmProfile {
  // Monotone: low variation everywhere
  if (npvi < 25 && gini < 0.15) return 'monotone';

  // Chaotic: very high variation with no structure
  if (npvi > 80 && Math.abs(autocorr) < 0.2 && Math.abs(cadMaj) < 0.3 && Math.abs(cadArc) < 0.3) {
    return 'chaotic';
  }

  // Structured swing: deliberate alternation
  if (npvi > 40 && autocorr < -0.3) return 'structured_swing';

  // Cadence progressive: building momentum
  if (cadMaj > 0.5) return 'cadence_progressive';

  // Arc: rise and fall
  if (cadArc > 0.5) return 'arc';

  // Default: free expressive
  return 'free_expressive';
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE SCORE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute composite rhythm score (0-100).
 *
 * Good rhythm = moderate variation + some structure + no monotony.
 * This is a PRELIMINARY scoring function — weights are SYMBOLS
 * to be calibrated via corpus (SESSION N+2).
 */
function computeCompositeScore(
  npvi: number,
  gini: number,
  autocorr: number,
  profile: RhythmProfile,
): number {
  // nPVI contribution: sweet spot 35-65, penalize extremes
  let npviScore: number;
  if (npvi >= 35 && npvi <= 65) {
    npviScore = 30; // full credit
  } else if (npvi < 35) {
    npviScore = 30 * (npvi / 35); // linear ramp up
  } else {
    npviScore = 30 * Math.max(0, 1 - (npvi - 65) / 40); // decay after 65
  }

  // Gini contribution: sweet spot 0.15-0.40
  let giniScore: number;
  if (gini >= 0.15 && gini <= 0.40) {
    giniScore = 25;
  } else if (gini < 0.15) {
    giniScore = 25 * (gini / 0.15);
  } else {
    giniScore = 25 * Math.max(0, 1 - (gini - 0.40) / 0.30);
  }

  // Structure contribution: some autocorrelation pattern is good
  const structureScore = Math.abs(autocorr) > 0.15 ? 20 : 10;

  // Profile bonus
  const profileScores: Record<RhythmProfile, number> = {
    structured_swing: 25,
    cadence_progressive: 22,
    arc: 23,
    free_expressive: 20,
    monotone: 15,
    chaotic: 18,
  };
  const profileScore = profileScores[profile];

  return Math.min(100, Math.round(npviScore + giniScore + structureScore + profileScore));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze rhythm of French prose.
 *
 * Pipeline: text → P1 segmenter → P0 syllable counts → nPVI + metrics
 *
 * @param text - French prose to analyze
 * @param config - Syllable weight configuration
 * @returns RhythmV2Analysis
 */
export function analyzeRhythm(
  text: string,
  config: SyllableWeightConfig = DEFAULT_WEIGHT_CONFIG,
): RhythmV2Analysis {
  const segResult = segmentProse(text, config);

  return analyzeRhythmFromSegments(segResult);
}

/**
 * Analyze rhythm from pre-computed segmentation.
 * Useful when segmentation is already done (avoid double computation).
 */
export function analyzeRhythmFromSegments(
  segResult: SegmentationResult,
): RhythmV2Analysis {
  const rawSeries = segResult.syllableSeries;
  const weightedSeries = segResult.weightedSeries;

  // ─── Handle degenerate cases ───
  if (rawSeries.length < 2) {
    return {
      npvi_raw: 0,
      npvi_weighted: 0,
      varco_segments: 0,
      gini_segments: 0,
      autocorr_lag1: 0,
      spectral_peak: null,
      spectral_magnitude: 0,
      cadence_majeure: 0,
      cadence_arc: 0,
      cadence_descendante: 0,
      mean_segment_syllables: rawSeries.length === 1 ? rawSeries[0] : 0,
      max_segment_syllables: rawSeries.length === 1 ? rawSeries[0] : 0,
      min_segment_syllables: rawSeries.length === 1 ? rawSeries[0] : 0,
      rhythm_profile: 'monotone',
      segment_count: rawSeries.length,
      rhythm_score: 0,
    };
  }

  // ─── Core metrics ───
  const npvi_raw = computeNPVI(rawSeries);
  const npvi_weighted = computeNPVI(weightedSeries);
  const varco_segments = computeVarco(rawSeries);
  const gini_segments = computeGini(rawSeries);
  const autocorr_lag1 = computeAutocorrelation(rawSeries, 1);
  const { period: spectral_peak, magnitude: spectral_magnitude } = computeSpectralPeak(rawSeries);

  // ─── Cadence ───
  const n = rawSeries.length;
  const cadence_majeure = pearsonCorrelation(rawSeries, generateAscendingRamp(n));
  const cadence_arc = pearsonCorrelation(rawSeries, generateBellCurve(n));
  const cadence_descendante = pearsonCorrelation(rawSeries, generateDescendingRamp(n));

  // ─── Respiration ───
  const mean_segment_syllables = rawSeries.reduce((a, b) => a + b, 0) / rawSeries.length;
  const max_segment_syllables = Math.max(...rawSeries);
  const min_segment_syllables = Math.min(...rawSeries);

  // ─── Profile ───
  const rhythm_profile = classifyProfile(
    npvi_raw, gini_segments, autocorr_lag1, cadence_majeure, cadence_arc,
  );

  // ─── Score ───
  const rhythm_score = computeCompositeScore(
    npvi_raw, gini_segments, autocorr_lag1, rhythm_profile,
  );

  return {
    npvi_raw,
    npvi_weighted,
    varco_segments,
    gini_segments,
    autocorr_lag1,
    spectral_peak,
    spectral_magnitude,
    cadence_majeure,
    cadence_arc,
    cadence_descendante,
    mean_segment_syllables,
    max_segment_syllables,
    min_segment_syllables,
    rhythm_profile,
    segment_count: rawSeries.length,
    rhythm_score,
  };
}
