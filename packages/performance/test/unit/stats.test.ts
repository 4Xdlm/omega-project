/**
 * @fileoverview Tests for statistics utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  sum,
  mean,
  min,
  max,
  variance,
  stdDev,
  percentile,
  percentiles,
  median,
  calculateStats,
  removeOutliers,
  findOutliers,
  coefficientOfVariation,
  isSignificantlyDifferent,
} from '../../src/index.js';

describe('sum', () => {
  it('should calculate sum', () => {
    expect(sum([1, 2, 3, 4, 5])).toBe(15);
  });

  it('should return 0 for empty array', () => {
    expect(sum([])).toBe(0);
  });
});

describe('mean', () => {
  it('should calculate mean', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it('should return 0 for empty array', () => {
    expect(mean([])).toBe(0);
  });

  it('should handle single value', () => {
    expect(mean([42])).toBe(42);
  });
});

describe('min', () => {
  it('should find minimum', () => {
    expect(min([3, 1, 4, 1, 5])).toBe(1);
  });

  it('should return 0 for empty array', () => {
    expect(min([])).toBe(0);
  });
});

describe('max', () => {
  it('should find maximum', () => {
    expect(max([3, 1, 4, 1, 5])).toBe(5);
  });

  it('should return 0 for empty array', () => {
    expect(max([])).toBe(0);
  });
});

describe('variance', () => {
  it('should calculate variance', () => {
    const v = variance([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(v).toBeCloseTo(4.57, 1);
  });

  it('should return 0 for single value', () => {
    expect(variance([5])).toBe(0);
  });

  it('should return 0 for empty array', () => {
    expect(variance([])).toBe(0);
  });
});

describe('stdDev', () => {
  it('should calculate standard deviation', () => {
    const sd = stdDev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(sd).toBeCloseTo(2.14, 1);
  });

  it('should return 0 for uniform values', () => {
    expect(stdDev([5, 5, 5, 5])).toBe(0);
  });
});

describe('percentile', () => {
  it('should calculate p50 (median)', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
  });

  it('should calculate p0 (min)', () => {
    expect(percentile([1, 2, 3, 4, 5], 0)).toBe(1);
  });

  it('should calculate p100 (max)', () => {
    expect(percentile([1, 2, 3, 4, 5], 100)).toBe(5);
  });

  it('should interpolate between values', () => {
    const p25 = percentile([1, 2, 3, 4, 5], 25);
    expect(p25).toBe(2);
  });

  it('should throw for invalid percentile', () => {
    expect(() => percentile([1, 2, 3], -1)).toThrow();
    expect(() => percentile([1, 2, 3], 101)).toThrow();
  });

  it('should return 0 for empty array', () => {
    expect(percentile([], 50)).toBe(0);
  });
});

describe('percentiles', () => {
  it('should calculate all standard percentiles', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const p = percentiles(values);

    // Values are 1-100, so p50 should be around 50
    expect(p.p50).toBeGreaterThan(45);
    expect(p.p50).toBeLessThan(55);
    expect(p.p75).toBeGreaterThan(70);
    expect(p.p75).toBeLessThan(80);
    expect(p.p90).toBeGreaterThan(85);
    expect(p.p90).toBeLessThan(95);
    expect(p.p95).toBeGreaterThan(90);
    expect(p.p95).toBeLessThan(100);
    expect(p.p99).toBeGreaterThan(95);
    expect(p.p99).toBeLessThanOrEqual(100);
  });
});

describe('median', () => {
  it('should calculate median for odd count', () => {
    expect(median([1, 2, 3, 4, 5])).toBe(3);
  });

  it('should calculate median for even count', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe('calculateStats', () => {
  it('should calculate all statistics', () => {
    const stats = calculateStats([1, 2, 3, 4, 5]);

    expect(stats.count).toBe(5);
    expect(stats.sum).toBe(15);
    expect(stats.mean).toBe(3);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(5);
    expect(stats.stdDev).toBeGreaterThan(0);
    expect(stats.variance).toBeGreaterThan(0);
    expect(stats.percentiles.p50).toBe(3);
  });

  it('should handle empty array', () => {
    const stats = calculateStats([]);

    expect(stats.count).toBe(0);
    expect(stats.sum).toBe(0);
    expect(stats.mean).toBe(0);
  });
});

describe('removeOutliers', () => {
  it('should remove outliers', () => {
    const values = [1, 2, 3, 4, 5, 100]; // 100 is outlier
    const filtered = removeOutliers(values);

    expect(filtered).not.toContain(100);
    expect(filtered.length).toBeLessThan(values.length);
  });

  it('should keep all values if no outliers', () => {
    const values = [1, 2, 3, 4, 5];
    const filtered = removeOutliers(values);

    expect(filtered.length).toBe(5);
  });

  it('should return all values for small arrays', () => {
    const values = [1, 100];
    const filtered = removeOutliers(values);

    expect(filtered.length).toBe(2);
  });
});

describe('findOutliers', () => {
  it('should find outliers', () => {
    const values = [1, 2, 3, 4, 5, 100];
    const { outliers, inliers } = findOutliers(values);

    expect(outliers).toContain(100);
    expect(inliers).not.toContain(100);
    expect(outliers.length + inliers.length).toBe(values.length);
  });

  it('should return empty outliers for small arrays', () => {
    const values = [1, 2];
    const { outliers, inliers } = findOutliers(values);

    expect(outliers.length).toBe(0);
    expect(inliers.length).toBe(2);
  });
});

describe('coefficientOfVariation', () => {
  it('should calculate CV', () => {
    const cv = coefficientOfVariation([1, 2, 3, 4, 5]);
    expect(cv).toBeGreaterThan(0);
  });

  it('should return 0 for uniform values', () => {
    const cv = coefficientOfVariation([5, 5, 5, 5]);
    expect(cv).toBe(0);
  });

  it('should return 0 for zero mean', () => {
    const cv = coefficientOfVariation([-1, 0, 1]);
    expect(cv).toBe(0);
  });
});

describe('isSignificantlyDifferent', () => {
  it('should detect significant difference', () => {
    const sample1 = [1, 2, 3, 4, 5];
    const sample2 = [100, 101, 102, 103, 104];

    expect(isSignificantlyDifferent(sample1, sample2)).toBe(true);
  });

  it('should not detect difference for similar samples', () => {
    const sample1 = [1, 2, 3, 4, 5];
    const sample2 = [1.1, 2.1, 3.1, 4.1, 5.1];

    expect(isSignificantlyDifferent(sample1, sample2)).toBe(false);
  });

  it('should return false for small samples', () => {
    expect(isSignificantlyDifferent([1], [2])).toBe(false);
  });
});
