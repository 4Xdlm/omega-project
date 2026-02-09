/**
 * OMEGA Governance — Threshold Checker
 * Phase D.2 — Verify benchmark results against configured thresholds
 */

import type { GovConfig } from '../core/config.js';
import type { BenchAggregation, BenchThresholds, ThresholdCheck, BenchReport } from './types.js';

/** Check a single aggregation against thresholds */
export function checkThresholds(
  aggregation: BenchAggregation,
  thresholds: BenchThresholds,
  config: GovConfig,
): readonly ThresholdCheck[] {
  const checks: ThresholdCheck[] = [];

  checks.push({
    check: `${aggregation.intent_name}:min_forge_score`,
    status: aggregation.min_forge_score >= thresholds.min_forge_score ? 'PASS' : 'FAIL',
    value: aggregation.min_forge_score,
    threshold: thresholds.min_forge_score,
    message: `Min forge score ${aggregation.min_forge_score.toFixed(4)} vs threshold ${thresholds.min_forge_score}`,
  });

  checks.push({
    check: `${aggregation.intent_name}:max_duration`,
    status: aggregation.avg_duration_ms <= thresholds.max_duration_ms ? 'PASS' : 'FAIL',
    value: aggregation.avg_duration_ms,
    threshold: thresholds.max_duration_ms,
    message: `Avg duration ${aggregation.avg_duration_ms.toFixed(0)}ms vs threshold ${thresholds.max_duration_ms}ms`,
  });

  checks.push({
    check: `${aggregation.intent_name}:variance`,
    status: aggregation.variance <= config.BENCH_MAX_VARIANCE ? 'PASS' : 'FAIL',
    value: aggregation.variance,
    threshold: config.BENCH_MAX_VARIANCE,
    message: `Variance ${aggregation.variance.toFixed(6)} vs BENCH_MAX_VARIANCE ${config.BENCH_MAX_VARIANCE}`,
  });

  return checks;
}

/** Build a complete benchmark report */
export function buildBenchReport(
  suiteName: string,
  aggregations: readonly BenchAggregation[],
  thresholds: BenchThresholds,
  config: GovConfig,
): BenchReport {
  const allChecks: ThresholdCheck[] = [];
  for (const agg of aggregations) {
    allChecks.push(...checkThresholds(agg, thresholds, config));
  }

  const totalRuns = aggregations.reduce((sum, a) => sum + a.run_count, 0);
  const overallPass = allChecks.every((c) => c.status === 'PASS');

  return {
    suite_name: suiteName,
    total_runs: totalRuns,
    aggregations,
    threshold_checks: allChecks,
    overall_pass: overallPass,
    config,
  };
}
