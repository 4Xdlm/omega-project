/**
 * OMEGA Governance — Trend Analyzer
 * Phase D.2 — Time-series analysis of governance events (RADICAL VARIANT)
 */

import type { RuntimeEvent, TrendAnalysis } from './types.js';

/** Analyze trends from a list of events */
export function analyzeTrends(events: readonly RuntimeEvent[], period: string): TrendAnalysis {
  if (events.length === 0) {
    return {
      period,
      run_count: 0,
      avg_forge_score: 0,
      score_variance: 0,
      avg_duration_ms: 0,
      success_rate: 0,
    };
  }

  const scores = events
    .filter((e) => e.forge_score !== undefined)
    .map((e) => e.forge_score as number);

  const durations = events.map((e) => e.duration_ms);
  const successCount = events.filter((e) => e.status === 'SUCCESS').length;

  return {
    period,
    run_count: events.length,
    avg_forge_score: scores.length > 0 ? mean(scores) : 0,
    score_variance: scores.length > 1 ? variance(scores) : 0,
    avg_duration_ms: mean(durations),
    success_rate: successCount / events.length,
  };
}

/** Group events by month and analyze each */
export function analyzeByMonth(events: readonly RuntimeEvent[]): readonly TrendAnalysis[] {
  const grouped = new Map<string, RuntimeEvent[]>();

  for (const event of events) {
    const month = event.timestamp.slice(0, 7);
    const existing = grouped.get(month) ?? [];
    existing.push(event);
    grouped.set(month, existing);
  }

  const results: TrendAnalysis[] = [];
  for (const [month, monthEvents] of [...grouped.entries()].sort()) {
    results.push(analyzeTrends(monthEvents, month));
  }
  return results;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function variance(values: readonly number[]): number {
  const avg = mean(values);
  return values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
}
