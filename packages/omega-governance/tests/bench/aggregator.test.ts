import { describe, it, expect } from 'vitest';
import { aggregateResults, aggregateByIntent } from '../../src/bench/aggregator.js';
import type { BenchRunResult } from '../../src/bench/types.js';

function makeResult(name: string, score: number, duration: number): BenchRunResult {
  return {
    intent_name: name,
    run_id: `run_${score}`,
    forge_score: score,
    emotion_score: 0.80,
    quality_score: 0.75,
    duration_ms: duration,
    verdict: 'PASS',
  };
}

describe('Bench Aggregator', () => {
  it('aggregates single result', () => {
    const agg = aggregateResults([makeResult('test', 0.85, 1000)]);
    expect(agg.intent_name).toBe('test');
    expect(agg.run_count).toBe(1);
    expect(agg.avg_forge_score).toBe(0.85);
    expect(agg.variance).toBe(0);
  });

  it('aggregates multiple results correctly', () => {
    const results = [makeResult('test', 0.80, 1000), makeResult('test', 0.90, 2000)];
    const agg = aggregateResults(results);
    expect(agg.run_count).toBe(2);
    expect(agg.avg_forge_score).toBeCloseTo(0.85, 4);
    expect(agg.min_forge_score).toBe(0.80);
    expect(agg.max_forge_score).toBe(0.90);
    expect(agg.avg_duration_ms).toBe(1500);
  });

  it('computes variance correctly', () => {
    const results = [makeResult('test', 0.80, 1000), makeResult('test', 0.90, 1000)];
    const agg = aggregateResults(results);
    expect(agg.variance).toBeGreaterThan(0);
    expect(agg.variance).toBeCloseTo(0.0025, 4);
  });

  it('throws on empty results', () => {
    expect(() => aggregateResults([])).toThrow('Cannot aggregate zero results');
  });

  it('aggregateByIntent groups correctly', () => {
    const results = [
      makeResult('intent_a', 0.80, 1000),
      makeResult('intent_b', 0.70, 1500),
      makeResult('intent_a', 0.85, 1200),
    ];
    const aggs = aggregateByIntent(results);
    expect(aggs).toHaveLength(2);
    expect(aggs[0].intent_name).toBe('intent_a');
    expect(aggs[0].run_count).toBe(2);
    expect(aggs[1].intent_name).toBe('intent_b');
    expect(aggs[1].run_count).toBe(1);
  });

  it('aggregateByIntent sorts by intent name', () => {
    const results = [makeResult('z_intent', 0.80, 1000), makeResult('a_intent', 0.70, 1000)];
    const aggs = aggregateByIntent(results);
    expect(aggs[0].intent_name).toBe('a_intent');
    expect(aggs[1].intent_name).toBe('z_intent');
  });

  it('zero variance for identical scores', () => {
    const results = [makeResult('test', 0.85, 1000), makeResult('test', 0.85, 1200)];
    const agg = aggregateResults(results);
    expect(agg.variance).toBe(0);
  });

  it('min and max are correct', () => {
    const results = [makeResult('test', 0.60, 1000), makeResult('test', 0.95, 1000), makeResult('test', 0.80, 1000)];
    const agg = aggregateResults(results);
    expect(agg.min_forge_score).toBe(0.60);
    expect(agg.max_forge_score).toBe(0.95);
  });
});
