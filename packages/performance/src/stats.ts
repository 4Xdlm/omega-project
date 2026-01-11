/**
 * @fileoverview OMEGA Performance - Statistics Utilities
 * @module @omega/performance/stats
 *
 * Statistical analysis utilities.
 */

import type { Statistics, BenchmarkPercentiles } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// BASIC STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate sum of values.
 */
export function sum(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Calculate mean of values.
 */
export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

/**
 * Calculate minimum value.
 */
export function min(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return Math.min(...values);
}

/**
 * Calculate maximum value.
 */
export function max(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}

/**
 * Calculate variance of values.
 */
export function variance(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const squaredDiffs = values.map((v) => (v - m) ** 2);
  return sum(squaredDiffs) / (values.length - 1);
}

/**
 * Calculate standard deviation of values.
 */
export function stdDev(values: readonly number[]): number {
  return Math.sqrt(variance(values));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERCENTILES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate a specific percentile.
 */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  if (p < 0 || p > 100) {
    throw new Error('Percentile must be between 0 and 100');
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate standard percentiles.
 */
export function percentiles(values: readonly number[]): BenchmarkPercentiles {
  return {
    p50: percentile(values, 50),
    p75: percentile(values, 75),
    p90: percentile(values, 90),
    p95: percentile(values, 95),
    p99: percentile(values, 99),
  };
}

/**
 * Calculate median (p50).
 */
export function median(values: readonly number[]): number {
  return percentile(values, 50);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate all statistics for a series of values.
 */
export function calculateStats(values: readonly number[]): Statistics {
  if (values.length === 0) {
    return {
      count: 0,
      sum: 0,
      mean: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      variance: 0,
      percentiles: { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
    };
  }

  const v = variance(values);

  return {
    count: values.length,
    sum: sum(values),
    mean: mean(values),
    min: min(values),
    max: max(values),
    stdDev: Math.sqrt(v),
    variance: v,
    percentiles: percentiles(values),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTLIER DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Remove outliers using IQR method.
 */
export function removeOutliers(values: readonly number[], multiplier: number = 1.5): number[] {
  if (values.length < 4) return [...values];

  const q1 = percentile(values, 25);
  const q3 = percentile(values, 75);
  const iqr = q3 - q1;

  const lower = q1 - multiplier * iqr;
  const upper = q3 + multiplier * iqr;

  return values.filter((v) => v >= lower && v <= upper);
}

/**
 * Identify outliers using IQR method.
 */
export function findOutliers(
  values: readonly number[],
  multiplier: number = 1.5
): { outliers: number[]; inliers: number[] } {
  if (values.length < 4) {
    return { outliers: [], inliers: [...values] };
  }

  const q1 = percentile(values, 25);
  const q3 = percentile(values, 75);
  const iqr = q3 - q1;

  const lower = q1 - multiplier * iqr;
  const upper = q3 + multiplier * iqr;

  const outliers: number[] = [];
  const inliers: number[] = [];

  for (const v of values) {
    if (v < lower || v > upper) {
      outliers.push(v);
    } else {
      inliers.push(v);
    }
  }

  return { outliers, inliers };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate coefficient of variation (CV).
 */
export function coefficientOfVariation(values: readonly number[]): number {
  const m = mean(values);
  if (m === 0) return 0;
  return (stdDev(values) / m) * 100;
}

/**
 * Check if two samples are significantly different (simple t-test approximation).
 */
export function isSignificantlyDifferent(
  sample1: readonly number[],
  sample2: readonly number[],
  _threshold: number = 0.05
): boolean {
  if (sample1.length < 2 || sample2.length < 2) return false;

  const m1 = mean(sample1);
  const m2 = mean(sample2);
  const s1 = stdDev(sample1);
  const s2 = stdDev(sample2);

  // Pooled standard error
  const se = Math.sqrt((s1 ** 2 / sample1.length) + (s2 ** 2 / sample2.length));

  if (se === 0) return m1 !== m2;

  // t-statistic
  const t = Math.abs(m1 - m2) / se;

  // Very rough approximation: t > 2 usually means p < 0.05 for reasonable n
  return t > 2;
}
