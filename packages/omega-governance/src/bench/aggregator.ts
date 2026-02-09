/**
 * OMEGA Governance — Bench Aggregator
 * Phase D.2 — Aggregate metrics from multiple benchmark runs
 *
 * INV-GOV-08: All scores come from ProofPack (via BenchRunResult), never computed locally.
 */

import type { BenchRunResult, BenchAggregation } from './types.js';

/** Aggregate results for a single intent across multiple runs */
export function aggregateResults(results: readonly BenchRunResult[]): BenchAggregation {
  if (results.length === 0) {
    throw new Error('Cannot aggregate zero results');
  }

  const intentName = results[0].intent_name;
  const scores = results.map((r) => r.forge_score);
  const durations = results.map((r) => r.duration_ms);

  const avg = mean(scores);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const variance = computeVariance(scores);
  const avgDuration = mean(durations);

  return {
    intent_name: intentName,
    run_count: results.length,
    avg_forge_score: avg,
    min_forge_score: minScore,
    max_forge_score: maxScore,
    variance,
    avg_duration_ms: avgDuration,
  };
}

/** Aggregate results grouped by intent name */
export function aggregateByIntent(
  results: readonly BenchRunResult[],
): readonly BenchAggregation[] {
  const grouped = new Map<string, BenchRunResult[]>();
  for (const r of results) {
    const existing = grouped.get(r.intent_name) ?? [];
    existing.push(r);
    grouped.set(r.intent_name, existing);
  }

  const aggregations: BenchAggregation[] = [];
  for (const [, group] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    aggregations.push(aggregateResults(group));
  }
  return aggregations;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function computeVariance(values: readonly number[]): number {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const sumSquaredDiffs = values.reduce((sum, v) => sum + (v - avg) ** 2, 0);
  return sumSquaredDiffs / values.length;
}
