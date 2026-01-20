/**
 * Benchmark Utils Tests
 * Standard: NASA-Grade L4
 *
 * Tests for benchmark infrastructure with injectable PerfNowFn.
 */

import { describe, test, expect } from 'vitest';
import {
  benchmark,
  formatResults,
  compareSuites,
  formatComparison,
  type BenchmarkSuite,
} from '../../nexus/bench/utils';

// ============================================================
// Benchmark Function Tests
// ============================================================

describe('Benchmark utils', () => {
  test('benchmark with mock perfNow', async () => {
    let time = 0;
    const mockPerfNow = () => {
      const current = time;
      time += 10; // Simulate 10ms per call (start + end = 2 calls)
      return current;
    };

    const result = await benchmark(
      'test-bench',
      () => {
        // Empty function - time advances on perfNow calls
      },
      {
        perfNow: mockPerfNow,
        iterations: 5,
        warmup: 0,
      }
    );

    expect(result.name).toBe('test-bench');
    expect(result.iterations).toBe(5);
    // Each iteration: start=time, end=time+10, duration=10
    expect(result.mean_ms).toBe(10);
    expect(result.min_ms).toBe(10);
    expect(result.max_ms).toBe(10);
  });

  test('benchmark calculates percentiles correctly', async () => {
    let callCount = 0;
    const durations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    let durationIndex = 0;

    const mockPerfNow = () => {
      callCount++;
      if (callCount % 2 === 1) {
        // Start call
        return 0;
      } else {
        // End call - return duration
        return durations[durationIndex++ % durations.length];
      }
    };

    const result = await benchmark(
      'percentile-test',
      () => {},
      {
        perfNow: mockPerfNow,
        iterations: 10,
        warmup: 0,
      }
    );

    expect(result.iterations).toBe(10);
    expect(result.min_ms).toBe(10);
    expect(result.max_ms).toBe(100);
    // p50 = durations[floor(10 * 0.5)] = durations[5] = 60 (sorted array)
    expect(result.p50_ms).toBe(60);
  });

  test('formatResults creates readable output', () => {
    const results = [
      {
        name: 'test',
        iterations: 100,
        mean_ms: 123.45,
        min_ms: 100,
        max_ms: 150,
        p50_ms: 120,
        p95_ms: 145,
        p99_ms: 149,
        timestamp: '2026-01-20T00:00:00Z',
        version: '5.4.1',
        platform: 'linux',
        node: 'v20.0.0',
      },
    ];

    const output = formatResults(results);
    expect(output).toContain('test:');
    expect(output).toContain('mean: 123.45ms');
    expect(output).toContain('p95:  145.00ms');
    expect(output).toContain('p99:  149.00ms');
  });
});

// ============================================================
// Comparison Tests
// ============================================================

describe('Benchmark comparison', () => {
  test('compareSuites detects faster performance', () => {
    const baseline: BenchmarkSuite = {
      name: 'baseline',
      timestamp: '2026-01-19T00:00:00Z',
      version: '5.4.0',
      results: [
        {
          name: 'operation',
          iterations: 100,
          mean_ms: 100,
          min_ms: 90,
          max_ms: 110,
          p50_ms: 100,
          p95_ms: 100,
          p99_ms: 105,
          timestamp: '2026-01-19T00:00:00Z',
          version: '5.4.0',
          platform: 'linux',
          node: 'v20.0.0',
        },
      ],
    };

    const current: BenchmarkSuite = {
      name: 'current',
      timestamp: '2026-01-20T00:00:00Z',
      version: '5.4.1',
      results: [
        {
          name: 'operation',
          iterations: 100,
          mean_ms: 80,
          min_ms: 70,
          max_ms: 90,
          p50_ms: 80,
          p95_ms: 80, // 20% faster
          p99_ms: 85,
          timestamp: '2026-01-20T00:00:00Z',
          version: '5.4.1',
          platform: 'linux',
          node: 'v20.0.0',
        },
      ],
    };

    const comparison = compareSuites(baseline, current);
    expect(comparison).toHaveLength(1);
    expect(comparison[0].status).toBe('faster');
    expect(comparison[0].delta_pct).toBe(-20);
  });

  test('compareSuites detects slower performance', () => {
    const baseline: BenchmarkSuite = {
      name: 'baseline',
      timestamp: '2026-01-19T00:00:00Z',
      version: '5.4.0',
      results: [
        {
          name: 'operation',
          iterations: 100,
          mean_ms: 100,
          min_ms: 90,
          max_ms: 110,
          p50_ms: 100,
          p95_ms: 100,
          p99_ms: 105,
          timestamp: '2026-01-19T00:00:00Z',
          version: '5.4.0',
          platform: 'linux',
          node: 'v20.0.0',
        },
      ],
    };

    const current: BenchmarkSuite = {
      name: 'current',
      timestamp: '2026-01-20T00:00:00Z',
      version: '5.4.1',
      results: [
        {
          name: 'operation',
          iterations: 100,
          mean_ms: 120,
          min_ms: 110,
          max_ms: 130,
          p50_ms: 120,
          p95_ms: 120, // 20% slower
          p99_ms: 125,
          timestamp: '2026-01-20T00:00:00Z',
          version: '5.4.1',
          platform: 'linux',
          node: 'v20.0.0',
        },
      ],
    };

    const comparison = compareSuites(baseline, current);
    expect(comparison).toHaveLength(1);
    expect(comparison[0].status).toBe('slower');
    expect(comparison[0].delta_pct).toBe(20);
  });

  test('formatComparison shows indicators', () => {
    const results = [
      {
        name: 'fast-op',
        baseline_p95_ms: 100,
        current_p95_ms: 80,
        delta_ms: -20,
        delta_pct: -20,
        status: 'faster' as const,
      },
      {
        name: 'slow-op',
        baseline_p95_ms: 100,
        current_p95_ms: 120,
        delta_ms: 20,
        delta_pct: 20,
        status: 'slower' as const,
      },
    ];

    const output = formatComparison(results);
    expect(output).toContain('✅ fast-op');
    expect(output).toContain('⚠️ slow-op');
    expect(output).toContain('-20.0%');
    expect(output).toContain('+20.0%');
  });
});
