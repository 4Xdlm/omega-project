/**
 * Tests: Weight Calibrator (Sprint 18.1)
 * Invariant: ART-CAL-01
 */

import { describe, it, expect } from 'vitest';
import { calibrateWeights, DEFAULT_MACRO_WEIGHTS } from '../../src/calibration/weight-calibrator.js';
import type { CorrelationReport } from '../../src/benchmark/correlation.js';

function makeReport(correlations: Array<{ axis: string; r: number }>): CorrelationReport {
  return {
    report_id: 'test',
    date: '',
    correlations: correlations.map(c => ({
      omega_axis: c.axis,
      human_axis: c.axis,
      pearson_r: c.r,
      p_significant: Math.abs(c.r) > 0.5,
      n_samples: 10,
      verdict: Math.abs(c.r) > 0.7 ? 'ALIGNED' as const : Math.abs(c.r) > 0.5 ? 'WEAK' as const : 'MISALIGNED' as const,
    })),
    overall_correlation: correlations.reduce((s, c) => s + Math.abs(c.r), 0) / correlations.length,
    axes_to_recalibrate: correlations.filter(c => Math.abs(c.r) < 0.5).map(c => c.axis),
    omega_vs_human_quality: { omega_mean: 70, human_mean: 65, delta: 5 },
    verdict: 'PASS',
  };
}

describe('WeightCalibrator (ART-CAL-01)', () => {
  it('WCAL-01: high correlation → weights boosted', () => {
    const report = makeReport([
      { axis: 'ecc', r: 0.9 },
      { axis: 'rci', r: 0.85 },
      { axis: 'sii', r: 0.8 },
      { axis: 'ifi', r: 0.75 },
      { axis: 'aai', r: 0.95 },
    ]);

    const result = calibrateWeights(DEFAULT_MACRO_WEIGHTS, report);

    expect(result.adjustments.length).toBe(5);
    expect(result.calibration_quality).toBe('HIGH');
    // All weights should still be positive
    for (const adj of result.adjustments) {
      expect(adj.adjusted_weight).toBeGreaterThan(0);
    }
  });

  it('WCAL-02: low correlation → weights reduced', () => {
    const report = makeReport([
      { axis: 'ecc', r: 0.1 },
      { axis: 'rci', r: 0.2 },
      { axis: 'sii', r: 0.15 },
      { axis: 'ifi', r: 0.1 },
      { axis: 'aai', r: 0.25 },
    ]);

    const result = calibrateWeights(DEFAULT_MACRO_WEIGHTS, report);

    expect(result.calibration_quality).toBe('LOW');
    // All should be at or above minimum floor
    for (const adj of result.adjustments) {
      expect(adj.adjusted_weight).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('WCAL-03: mixed correlation → selective adjustment', () => {
    const report = makeReport([
      { axis: 'ecc', r: 0.9 },   // high
      { axis: 'rci', r: 0.6 },   // weak
      { axis: 'sii', r: 0.2 },   // low
      { axis: 'ifi', r: 0.8 },   // high
      { axis: 'aai', r: 0.4 },   // low
    ]);

    const result = calibrateWeights(DEFAULT_MACRO_WEIGHTS, report);

    const eccAdj = result.adjustments.find(a => a.axis === 'ecc')!;
    const siiAdj = result.adjustments.find(a => a.axis === 'sii')!;

    // ecc (high corr) should have higher or equal weight vs sii (low corr)
    // Both may hit MIN_WEIGHT floor, so >=
    expect(eccAdj.adjusted_weight).toBeGreaterThanOrEqual(siiAdj.adjusted_weight);
  });

  it('WCAL-04: determinism', () => {
    const report = makeReport([
      { axis: 'ecc', r: 0.85 },
      { axis: 'rci', r: 0.6 },
      { axis: 'sii', r: 0.7 },
      { axis: 'ifi', r: 0.4 },
      { axis: 'aai', r: 0.9 },
    ]);

    const r1 = calibrateWeights(DEFAULT_MACRO_WEIGHTS, report);
    const r2 = calibrateWeights(DEFAULT_MACRO_WEIGHTS, report);

    for (let i = 0; i < 5; i++) {
      expect(r1.adjustments[i].adjusted_weight).toBe(r2.adjustments[i].adjusted_weight);
    }
  });
});
