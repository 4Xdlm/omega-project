/**
 * Tests: Benchmark Correlation (Sprint 17.3)
 * Invariant: ART-BENCH-03
 */

import { describe, it, expect } from 'vitest';
import {
  pearsonCorrelation,
  computeCorrelationReport,
  AXIS_MAPPING,
} from '../../src/benchmark/correlation.js';
import type { HumanEvaluation } from '../../src/benchmark/protocol.js';

describe('PearsonCorrelation (ART-BENCH-03)', () => {
  it('PEARSON-01: perfect positive correlation = 1.0', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];

    const r = pearsonCorrelation(x, y);
    expect(r).toBeCloseTo(1.0, 5);
  });

  it('PEARSON-02: perfect negative correlation = -1.0', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 8, 6, 4, 2];

    const r = pearsonCorrelation(x, y);
    expect(r).toBeCloseTo(-1.0, 5);
  });

  it('PEARSON-03: no correlation ≈ 0', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [5, 1, 4, 2, 3];

    const r = pearsonCorrelation(x, y);
    expect(Math.abs(r)).toBeLessThan(0.5);
  });

  it('PEARSON-04: insufficient data → 0', () => {
    const r = pearsonCorrelation([1, 2], [3, 4]);
    expect(r).toBe(0);
  });

  it('PEARSON-05: determinism', () => {
    const x = [10, 20, 30, 40, 50];
    const y = [12, 18, 33, 37, 52];

    const r1 = pearsonCorrelation(x, y);
    const r2 = pearsonCorrelation(x, y);
    expect(r1).toBe(r2);
  });
});

describe('CorrelationReport (ART-BENCH-03)', () => {
  // Mock data: 5 samples with OMEGA scores and human evaluations
  const mockOmegaScores = new Map<string, Record<string, number>>([
    ['S1', { ecc: 85, rci: 70, ifi: 80, sii: 75, aai: 90, composite: 80 }],
    ['S2', { ecc: 60, rci: 55, ifi: 65, sii: 50, aai: 70, composite: 60 }],
    ['S3', { ecc: 95, rci: 90, ifi: 85, sii: 80, aai: 95, composite: 89 }],
    ['S4', { ecc: 40, rci: 45, ifi: 50, sii: 40, aai: 55, composite: 46 }],
    ['S5', { ecc: 75, rci: 80, ifi: 70, sii: 65, aai: 80, composite: 74 }],
  ]);

  const mockHumanEvals: HumanEvaluation[] = [
    { sample_id: 'S1', evaluator_id: 'E1', timestamp: '', emotion_impact: 8, rhythm_musicality: 7, sensory_immersion: 8, originality: 7, authenticity: 9, overall_quality: 8, would_read_more: true },
    { sample_id: 'S2', evaluator_id: 'E1', timestamp: '', emotion_impact: 5, rhythm_musicality: 5, sensory_immersion: 6, originality: 5, authenticity: 6, overall_quality: 5, would_read_more: false },
    { sample_id: 'S3', evaluator_id: 'E1', timestamp: '', emotion_impact: 9, rhythm_musicality: 9, sensory_immersion: 8, originality: 8, authenticity: 10, overall_quality: 9, would_read_more: true },
    { sample_id: 'S4', evaluator_id: 'E1', timestamp: '', emotion_impact: 3, rhythm_musicality: 4, sensory_immersion: 5, originality: 4, authenticity: 5, overall_quality: 4, would_read_more: false },
    { sample_id: 'S5', evaluator_id: 'E1', timestamp: '', emotion_impact: 7, rhythm_musicality: 8, sensory_immersion: 7, originality: 6, authenticity: 8, overall_quality: 7, would_read_more: true },
  ];

  it('CORR-01: report with correlated data → high correlation', () => {
    const report = computeCorrelationReport(mockOmegaScores, mockHumanEvals);

    expect(report.correlations.length).toBe(5); // 5 axis mappings
    expect(report.overall_correlation).toBeGreaterThan(0.5);
    expect(report.verdict).toBe('PASS');
  });

  it('CORR-02: each axis has proper structure', () => {
    const report = computeCorrelationReport(mockOmegaScores, mockHumanEvals);

    for (const corr of report.correlations) {
      expect(corr.omega_axis).toBeDefined();
      expect(corr.human_axis).toBeDefined();
      expect(corr.pearson_r).toBeGreaterThanOrEqual(-1);
      expect(corr.pearson_r).toBeLessThanOrEqual(1);
      expect(corr.n_samples).toBe(5);
      expect(['ALIGNED', 'WEAK', 'MISALIGNED']).toContain(corr.verdict);
    }
  });

  it('CORR-03: omega vs human quality comparison', () => {
    const report = computeCorrelationReport(mockOmegaScores, mockHumanEvals);

    expect(report.omega_vs_human_quality.omega_mean).toBeGreaterThan(0);
    expect(report.omega_vs_human_quality.human_mean).toBeGreaterThan(0);
    expect(typeof report.omega_vs_human_quality.delta).toBe('number');
  });

  it('CORR-04: AXIS_MAPPING has 5 entries', () => {
    expect(AXIS_MAPPING.length).toBe(5);
  });

  it('CORR-05: determinism', () => {
    const r1 = computeCorrelationReport(mockOmegaScores, mockHumanEvals);
    const r2 = computeCorrelationReport(mockOmegaScores, mockHumanEvals);

    expect(r1.overall_correlation).toBe(r2.overall_correlation);
    expect(r1.verdict).toBe(r2.verdict);
    for (let i = 0; i < 5; i++) {
      expect(r1.correlations[i].pearson_r).toBe(r2.correlations[i].pearson_r);
    }
  });
});
