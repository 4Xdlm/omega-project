/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SEMANTIC ANALYZER AGGREGATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: src/semantic/semantic-aggregation.ts
 * Version: 1.0.0 (Sprint 9 Commit 9.2)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * N-samples median aggregation and variance tolerance checking.
 * ART-SEM-03 compliance.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SemanticEmotionResult } from './types.js';

/**
 * 14 Plutchik emotion keys for iteration.
 */
const EMOTION_14_KEYS: ReadonlyArray<keyof SemanticEmotionResult> = [
  'joy', 'trust', 'fear', 'surprise', 'sadness',
  'disgust', 'anger', 'anticipation', 'love', 'submission',
  'awe', 'disapproval', 'remorse', 'contempt',
] as const;

/**
 * Aggregates multiple samples using MEDIAN per dimension.
 * Reduces variance and improves robustness to outliers.
 *
 * ART-SEM-03: Median aggregation for N-samples.
 *
 * @param samples - Array of emotion results
 * @returns Aggregated result (median per dimension)
 */
export function aggregateSamples(samples: SemanticEmotionResult[]): SemanticEmotionResult {
  if (samples.length === 1) {
    return samples[0];
  }

  const result: Record<string, number> = {};

  for (const key of EMOTION_14_KEYS) {
    const values = samples.map(s => s[key]).sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);

    // Median calculation
    if (values.length % 2 === 0) {
      result[key] = (values[mid - 1] + values[mid]) / 2;
    } else {
      result[key] = values[mid];
    }
  }

  return result as SemanticEmotionResult;
}

/**
 * Checks variance tolerance across samples.
 * Warns if std deviation exceeds tolerance threshold.
 *
 * ART-SEM-03: Écart-type < variance_tolerance (WARNING if exceeded).
 *
 * @param samples - Array of emotion results
 * @param median - Median result
 * @param tolerance - Variance tolerance threshold (in percentage points)
 */
export function checkVarianceTolerance(
  samples: SemanticEmotionResult[],
  median: SemanticEmotionResult,
  tolerance: number,
): void {
  const violations: string[] = [];

  for (const key of EMOTION_14_KEYS) {
    const values = samples.map(s => s[key]);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance) * 100; // Convert to percentage points

    if (stdDev > tolerance) {
      violations.push(`${key}: σ=${stdDev.toFixed(2)}% (median=${(median[key] * 100).toFixed(1)}%)`);
    }
  }

  if (violations.length > 0) {
    console.warn(`[SEMANTIC] Variance tolerance exceeded (>${tolerance}%):\n${violations.join('\n')}`);
  }
}
