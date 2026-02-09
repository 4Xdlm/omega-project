import { describe, it, expect } from 'vitest';
import { analyzeTrends, analyzeByMonth } from '../../src/history/trend-analyzer.js';
import { createRuntimeEvent } from '../fixtures/helpers.js';

describe('Trend Analyzer', () => {
  it('returns zeros for empty events', () => {
    const result = analyzeTrends([], '2026-01');
    expect(result.run_count).toBe(0);
    expect(result.avg_forge_score).toBe(0);
    expect(result.success_rate).toBe(0);
  });

  it('computes average forge score', () => {
    const events = [
      createRuntimeEvent({ forge_score: 0.80, timestamp: '2026-01-01T00:00:00.000Z' }),
      createRuntimeEvent({ forge_score: 0.90, timestamp: '2026-01-02T00:00:00.000Z' }),
    ];
    const result = analyzeTrends(events, '2026-01');
    expect(result.avg_forge_score).toBeCloseTo(0.85, 4);
  });

  it('computes success rate', () => {
    const events = [
      createRuntimeEvent({ status: 'SUCCESS', timestamp: '2026-01-01T00:00:00.000Z' }),
      createRuntimeEvent({ status: 'SUCCESS', timestamp: '2026-01-02T00:00:00.000Z' }),
      createRuntimeEvent({ status: 'FAIL', timestamp: '2026-01-03T00:00:00.000Z' }),
    ];
    const result = analyzeTrends(events, '2026-01');
    expect(result.success_rate).toBeCloseTo(2 / 3, 4);
  });

  it('computes average duration', () => {
    const events = [
      createRuntimeEvent({ duration_ms: 1000, timestamp: '2026-01-01T00:00:00.000Z' }),
      createRuntimeEvent({ duration_ms: 2000, timestamp: '2026-01-02T00:00:00.000Z' }),
    ];
    const result = analyzeTrends(events, '2026-01');
    expect(result.avg_duration_ms).toBe(1500);
  });

  it('analyzeByMonth groups by month', () => {
    const events = [
      createRuntimeEvent({ timestamp: '2026-01-10T00:00:00.000Z', forge_score: 0.80 }),
      createRuntimeEvent({ timestamp: '2026-01-20T00:00:00.000Z', forge_score: 0.85 }),
      createRuntimeEvent({ timestamp: '2026-02-05T00:00:00.000Z', forge_score: 0.90 }),
    ];
    const trends = analyzeByMonth(events);
    expect(trends).toHaveLength(2);
    expect(trends[0].period).toBe('2026-01');
    expect(trends[0].run_count).toBe(2);
    expect(trends[1].period).toBe('2026-02');
    expect(trends[1].run_count).toBe(1);
  });

  it('trends are sorted by period', () => {
    const events = [
      createRuntimeEvent({ timestamp: '2026-03-01T00:00:00.000Z' }),
      createRuntimeEvent({ timestamp: '2026-01-01T00:00:00.000Z' }),
    ];
    const trends = analyzeByMonth(events);
    expect(trends[0].period).toBe('2026-01');
    expect(trends[1].period).toBe('2026-03');
  });
});
