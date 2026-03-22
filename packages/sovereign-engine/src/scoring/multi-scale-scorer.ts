/**
 * OMEGA Multi-Scale Scorer — Phase R-7 + P2
 * Date: 2026-03-22
 * Role: Multi-scale endurance scoring with GB V1.
 *
 * Architecture:
 *   1. Score LOCAL (500w) — GB model on 42 features (V3 + semantic)
 *   2. Score MESO (2000w) — same GB model, larger window
 *   3. Score SLOPE — endurance factor (trend across scales)
 *   4. Score FINAL — meta-regression: alpha*meso + beta*slope + gamma*delta + delta2*std + intercept
 *
 * Key insight: LLM prose collapses beyond 2000 words.
 * Texts < 2000 words are flagged as NON_VERIFIABLE.
 *
 * Coefficients learned on 571-work corpus (Ridge, seed=42).
 */

import { computeAllGBFeatures } from './gb-scorer.js';
import { scoreGB } from './gb-inference.js';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MultiScaleScore {
  /** GB score on 500-word windows (avg of 5) */
  score_local: number;
  /** GB score on 2000-word windows (avg of 5) */
  score_meso: number;
  /** Endurance slope (score trend across log-scales) */
  slope: number;
  /** Endurance delta (meso - local) */
  endurance_delta: number;
  /** Standard deviation of meso scores across windows */
  std_meso: number;
  /** Meta-regression final score */
  final_score: number;
  /** Verification flag */
  flag: 'VERIFIED' | 'NON_VERIFIABLE';
  /** Total word count */
  word_count: number;
}

// ═══════════════════════════════════════════════════════════════════════
// META-REGRESSION COEFFICIENTS (learned on 571-work corpus)
// ═══════════════════════════════════════════════════════════════════════

const META_COEFFICIENTS = {
  score_meso: 1.781702,
  slope: 1.667173,
  endurance_delta: -1.121767,
  std_meso: 0.496736,
  intercept: -3.163463,
};

/** Minimum word count for meso verification */
export const MIN_WORDS_FOR_VERIFICATION = 2000;

// ═══════════════════════════════════════════════════════════════════════
// SCORER
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute the multi-scale final score from pre-computed components.
 *
 * @param scoreMeso - GB score at 2000-word scale
 * @param slope - Endurance slope (log-scale regression)
 * @param enduranceDelta - score_meso - score_local
 * @param stdMeso - Standard deviation of meso window scores
 * @returns Meta-regression final score
 */
export function computeFinalScore(
  scoreMeso: number,
  slope: number,
  enduranceDelta: number,
  stdMeso: number,
): number {
  return (
    META_COEFFICIENTS.score_meso * scoreMeso +
    META_COEFFICIENTS.slope * slope +
    META_COEFFICIENTS.endurance_delta * enduranceDelta +
    META_COEFFICIENTS.std_meso * stdMeso +
    META_COEFFICIENTS.intercept
  );
}

/**
 * Build a complete multi-scale score from local and meso measurements.
 *
 * @param scoreLocal - Mean GB score on 500w windows
 * @param scoreMeso - Mean GB score on 2000w windows (null if text too short)
 * @param slope - Endurance slope (null if text too short for multi-scale)
 * @param stdMeso - Std of 2000w window scores (null if text too short)
 * @param wordCount - Total word count of the text
 * @returns Complete multi-scale score with verification flag
 */
export function buildMultiScaleScore(
  scoreLocal: number,
  scoreMeso: number | null,
  slope: number | null,
  stdMeso: number | null,
  wordCount: number,
): MultiScaleScore {
  const verified = wordCount >= MIN_WORDS_FOR_VERIFICATION && scoreMeso !== null;

  if (verified) {
    const meso = scoreMeso!;
    const sl = slope ?? 0;
    const delta = meso - scoreLocal;
    const std = stdMeso ?? 0;
    const finalScore = computeFinalScore(meso, sl, delta, std);

    return {
      score_local: scoreLocal,
      score_meso: meso,
      slope: sl,
      endurance_delta: delta,
      std_meso: std,
      final_score: finalScore,
      flag: 'VERIFIED',
      word_count: wordCount,
    };
  }

  // Non-verifiable: use local score only, no endurance proof
  return {
    score_local: scoreLocal,
    score_meso: scoreLocal, // fallback to local
    slope: 0,
    endurance_delta: 0,
    std_meso: 0,
    final_score: scoreLocal, // raw local, no meta-regression
    flag: 'NON_VERIFIABLE',
    word_count: wordCount,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// WINDOW EXTRACTION + SCORING (Phase P2)
// ═══════════════════════════════════════════════════════════════════════

function mean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function stdev(vals: number[]): number {
  if (vals.length < 2) return 0;
  const m = mean(vals);
  return Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / (vals.length - 1));
}

/**
 * Extract N evenly-spaced windows of windowSize words from text.
 * Returns null if text is shorter than windowSize.
 */
export function extractWindows(text: string, windowSize: number, nWindows: number = 5): string[] | null {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length < windowSize) return null;

  const positions = Array.from({ length: nWindows }, (_, i) => (i + 1) / (nWindows + 1));
  return positions.map(pos => {
    const center = Math.floor(words.length * pos);
    let start = Math.max(0, center - Math.floor(windowSize / 2));
    const end = Math.min(words.length, start + windowSize);
    if (end - start < windowSize) {
      start = Math.max(0, end - windowSize);
    }
    return words.slice(start, start + windowSize).join(' ');
  });
}

/**
 * Score a single text window with the GB V1 model.
 */
export function scoreWindow(text: string): number {
  const features = computeAllGBFeatures(text);
  return scoreGB(features);
}

/**
 * Compute the full multi-scale score from raw text.
 * Extracts 500w, 2000w, and optionally 5000w windows,
 * scores each with GB V1, then applies meta-regression.
 *
 * @param fullText - Complete text to analyze
 * @returns MultiScaleScore with all components
 */
export function computeMultiScaleScore(fullText: string): MultiScaleScore {
  const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;

  // Score local (500w)
  const w500 = extractWindows(fullText, 500, 5);
  const s500 = w500 ? w500.map(w => scoreWindow(w)) : [];
  const scoreLocal = mean(s500) || 0;

  // Score meso (2000w)
  const w2000 = extractWindows(fullText, 2000, 5);
  let scoreMeso: number | null = null;
  let stdMeso: number | null = null;
  if (w2000) {
    const s2000 = w2000.map(w => scoreWindow(w));
    scoreMeso = mean(s2000);
    stdMeso = stdev(s2000);
  }

  // Slope (multi-scale regression on log-scale)
  let slope: number | null = null;
  const points: Array<[number, number]> = [];
  if (s500.length > 0) points.push([Math.log(500), mean(s500)]);
  if (scoreMeso !== null) points.push([Math.log(2000), scoreMeso]);

  const w5000 = extractWindows(fullText, 5000, 5);
  if (w5000) {
    const s5000 = w5000.map(w => scoreWindow(w));
    points.push([Math.log(5000), mean(s5000)]);
  }

  if (points.length >= 2) {
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const xm = mean(xs);
    const ym = mean(ys);
    const num = xs.reduce((s, x, i) => s + (x - xm) * (ys[i] - ym), 0);
    const den = xs.reduce((s, x) => s + (x - xm) ** 2, 0);
    slope = den > 0 ? num / den : 0;
  }

  return buildMultiScaleScore(scoreLocal, scoreMeso, slope, stdMeso, wordCount);
}

export { META_COEFFICIENTS };
