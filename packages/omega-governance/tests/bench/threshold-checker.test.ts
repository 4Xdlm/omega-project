import { describe, it, expect } from 'vitest';
import { checkThresholds, buildBenchReport } from '../../src/bench/threshold-checker.js';
import { DEFAULT_GOV_CONFIG } from '../../src/core/config.js';
import type { BenchAggregation, BenchThresholds } from '../../src/bench/types.js';

const defaultThresholds: BenchThresholds = {
  min_forge_score: 0.70,
  max_duration_ms: 5000,
  max_variance: 0.01,
};

function makeAgg(overrides: Partial<BenchAggregation> = {}): BenchAggregation {
  return {
    intent_name: 'test_intent',
    run_count: 3,
    avg_forge_score: 0.85,
    min_forge_score: 0.80,
    max_forge_score: 0.90,
    variance: 0.001,
    avg_duration_ms: 1500,
    ...overrides,
  };
}

describe('Threshold Checker', () => {
  it('all checks PASS for good aggregation', () => {
    const checks = checkThresholds(makeAgg(), defaultThresholds, DEFAULT_GOV_CONFIG);
    expect(checks.every((c) => c.status === 'PASS')).toBe(true);
  });

  it('FAIL for low min_forge_score', () => {
    const checks = checkThresholds(makeAgg({ min_forge_score: 0.50 }), defaultThresholds, DEFAULT_GOV_CONFIG);
    const scoreCheck = checks.find((c) => c.check.includes('min_forge_score'));
    expect(scoreCheck!.status).toBe('FAIL');
  });

  it('FAIL for high duration', () => {
    const checks = checkThresholds(makeAgg({ avg_duration_ms: 10000 }), defaultThresholds, DEFAULT_GOV_CONFIG);
    const durationCheck = checks.find((c) => c.check.includes('max_duration'));
    expect(durationCheck!.status).toBe('FAIL');
  });

  it('FAIL for high variance', () => {
    const checks = checkThresholds(makeAgg({ variance: 0.05 }), defaultThresholds, DEFAULT_GOV_CONFIG);
    const varianceCheck = checks.find((c) => c.check.includes('variance'));
    expect(varianceCheck!.status).toBe('FAIL');
  });

  it('buildBenchReport overall_pass=true when all pass', () => {
    const report = buildBenchReport('suite', [makeAgg()], defaultThresholds, DEFAULT_GOV_CONFIG);
    expect(report.overall_pass).toBe(true);
    expect(report.suite_name).toBe('suite');
  });

  it('buildBenchReport overall_pass=false when any fail', () => {
    const report = buildBenchReport('suite', [makeAgg({ min_forge_score: 0.30 })], defaultThresholds, DEFAULT_GOV_CONFIG);
    expect(report.overall_pass).toBe(false);
  });
});
