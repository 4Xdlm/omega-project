/**
 * OMEGA Feature Normalizer
 * Phase R6 — Normalizes raw feature values to 0-100 scale.
 *
 * Uses baselines from R1 cv_matrix (181 works, 10 standard windows).
 * P10/P90 approximated via Gaussian: P10 = mean - 1.28*stdev, P90 = mean + 1.28*stdev.
 * @approximation — true percentiles would require loading 181 individual JSONs.
 */

import { readFileSync } from 'fs';

interface BaselineEntry {
  mean: number;
  stdev: number;
  p10: number;
  p90: number;
}

const STANDARD_WINDOWS = [30, 150, 300, 600, 1000, 1500, 2500, 5000, 10000, 20000];
const Z_10 = 1.2816; // z-score for 10th/90th percentile (normal distribution)
const MIN_SAMPLES = 50; // minimum n_samples to trust the baseline

/**
 * Finds bracketing standard windows and interpolation factor.
 */
function bracketWindows(wordCount: number): { lo: number; hi: number; t: number } {
  if (wordCount <= STANDARD_WINDOWS[0]) {
    return { lo: STANDARD_WINDOWS[0], hi: STANDARD_WINDOWS[0], t: 0 };
  }
  const last = STANDARD_WINDOWS[STANDARD_WINDOWS.length - 1];
  if (wordCount >= last) {
    return { lo: last, hi: last, t: 0 };
  }
  for (let i = 0; i < STANDARD_WINDOWS.length - 1; i++) {
    if (wordCount >= STANDARD_WINDOWS[i] && wordCount < STANDARD_WINDOWS[i + 1]) {
      const lo = STANDARD_WINDOWS[i];
      const hi = STANDARD_WINDOWS[i + 1];
      return { lo, hi, t: (wordCount - lo) / (hi - lo) };
    }
  }
  return { lo: last, hi: last, t: 0 };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class FeatureNormalizer {
  /**
   * feature -> windowSize -> BaselineEntry
   */
  private baselines: Map<string, Map<number, BaselineEntry>> = new Map();

  constructor(metrologyPath: string) {
    const raw = readFileSync(metrologyPath, 'utf-8')
      .replace(/Infinity/g, '999999')
      .replace(/NaN/g, 'null');
    const data = JSON.parse(raw) as Record<string, unknown>;
    const cvMatrix = data['cv_matrix'] as Record<string, Record<string, {
      mean: number; stdev: number; cv: number; n_samples: number;
    }>>;

    for (const [feat, byWs] of Object.entries(cvMatrix)) {
      const featMap = new Map<number, BaselineEntry>();

      for (const ws of STANDARD_WINDOWS) {
        const entry = byWs[String(ws)];
        if (!entry || entry.n_samples < MIN_SAMPLES) continue;

        const m = entry.mean;
        const s = entry.stdev;
        featMap.set(ws, {
          mean: m,
          stdev: s,
          p10: m - Z_10 * s,
          p90: m + Z_10 * s,
        });
      }

      if (featMap.size > 0) {
        this.baselines.set(feat, featMap);
      }
    }
  }

  /**
   * Returns the baseline (P10, P90) for a feature at a given word count.
   * Interpolates between bracketing standard windows.
   * Returns null if no baseline exists.
   */
  getBaseline(feature: string, wordCount: number): { p10: number; p90: number } | null {
    const featMap = this.baselines.get(feature);
    if (!featMap) return null;

    const { lo, hi, t } = bracketWindows(wordCount);
    const bLo = featMap.get(lo);
    const bHi = featMap.get(hi);

    if (!bLo) return null;
    if (!bHi || lo === hi) return { p10: bLo.p10, p90: bLo.p90 };

    return {
      p10: lerp(bLo.p10, bHi.p10, t),
      p90: lerp(bLo.p90, bHi.p90, t),
    };
  }

  /**
   * Normalizes a feature value to 0-100 scale using corpus baselines.
   * Returns the raw value if no baseline exists.
   *
   * @approximation — P10/P90 derived from Gaussian assumption on cv_matrix.
   */
  normalize(feature: string, value: number, wordCount: number): number {
    const baseline = this.getBaseline(feature, wordCount);
    if (!baseline) return value;

    const { p10, p90 } = baseline;
    const range = p90 - p10;

    if (range <= 0) return 50; // degenerate case

    const normalized = ((value - p10) / range) * 100;
    return Math.max(0, Math.min(100, normalized));
  }

  /**
   * Normalizes all features in a Record.
   * Features without baselines are passed through unchanged.
   */
  normalizeAll(features: Record<string, number>, wordCount: number): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [feat, val] of Object.entries(features)) {
      if (this.baselines.has(feat)) {
        result[feat] = this.normalize(feat, val, wordCount);
      } else {
        result[feat] = val;
      }
    }
    return result;
  }

  /**
   * Returns number of features that have baselines.
   */
  getBaselineCount(): number {
    return this.baselines.size;
  }

  /**
   * Returns whether a feature has a baseline for normalization.
   */
  hasBaseline(feature: string): boolean {
    return this.baselines.has(feature);
  }
}
