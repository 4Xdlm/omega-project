/**
 * @fileoverview Tests for benchmark utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  benchmark,
  benchmarkAsync,
  compare,
  formatResult,
  formatComparison,
  BenchmarkSuite,
  sleep,
} from '../../src/index.js';

describe('benchmark', () => {
  it('should benchmark sync function', () => {
    const result = benchmark(
      () => {
        let sum = 0;
        for (let i = 0; i < 100; i++) sum += i;
      },
      { iterations: 100, warmupIterations: 10, name: 'sum' }
    );

    expect(result.name).toBe('sum');
    expect(result.iterations).toBe(100);
    expect(result.meanTime).toBeGreaterThan(0);
    expect(result.minTime).toBeLessThanOrEqual(result.meanTime);
    expect(result.maxTime).toBeGreaterThanOrEqual(result.meanTime);
    expect(result.opsPerSecond).toBeGreaterThan(0);
  });

  it('should calculate percentiles', () => {
    const result = benchmark(() => {}, { iterations: 100, warmupIterations: 10 });

    expect(result.percentiles.p50).toBeGreaterThanOrEqual(0);
    expect(result.percentiles.p95).toBeGreaterThanOrEqual(result.percentiles.p50);
    expect(result.percentiles.p99).toBeGreaterThanOrEqual(result.percentiles.p95);
  });
});

describe('benchmarkAsync', () => {
  it('should benchmark async function', async () => {
    const result = await benchmarkAsync(
      async () => {
        await sleep(1);
      },
      { iterations: 10, warmupIterations: 2, name: 'async' }
    );

    expect(result.name).toBe('async');
    expect(result.iterations).toBe(10);
    expect(result.meanTime).toBeGreaterThanOrEqual(1);
  });
});

describe('compare', () => {
  it('should compare two benchmarks', () => {
    const baseline = benchmark(() => {
      for (let i = 0; i < 1000; i++);
    }, { iterations: 50, warmupIterations: 10, name: 'baseline' });

    const current = benchmark(() => {
      for (let i = 0; i < 100; i++);
    }, { iterations: 50, warmupIterations: 10, name: 'current' });

    const comparison = compare(baseline, current);

    expect(comparison.baseline).toBe(baseline);
    expect(comparison.current).toBe(current);
    expect(comparison.speedup).toBeGreaterThan(0);
    expect(typeof comparison.slower).toBe('boolean');
    expect(typeof comparison.percentChange).toBe('number');
  });
});

describe('formatResult', () => {
  it('should format benchmark result', () => {
    const result = benchmark(() => {}, { iterations: 10, warmupIterations: 5, name: 'test' });
    const formatted = formatResult(result);

    expect(formatted).toContain('Benchmark: test');
    expect(formatted).toContain('Iterations: 10');
    expect(formatted).toContain('Mean:');
    expect(formatted).toContain('Min:');
    expect(formatted).toContain('Max:');
    expect(formatted).toContain('P50:');
    expect(formatted).toContain('P95:');
  });
});

describe('formatComparison', () => {
  it('should format comparison', () => {
    const baseline = benchmark(() => {}, { iterations: 10, warmupIterations: 5, name: 'baseline' });
    const current = benchmark(() => {}, { iterations: 10, warmupIterations: 5, name: 'current' });
    const comparison = compare(baseline, current);
    const formatted = formatComparison(comparison);

    expect(formatted).toContain('Comparison:');
    expect(formatted).toContain('Baseline:');
    expect(formatted).toContain('Current:');
    expect(formatted).toContain('Change:');
    expect(formatted).toContain('Speedup:');
    expect(formatted).toContain('Status:');
  });
});

describe('BenchmarkSuite', () => {
  it('should run multiple benchmarks', () => {
    const suite = new BenchmarkSuite('test-suite', { iterations: 10, warmupIterations: 5 });

    suite.add('fast', () => {});
    suite.add('slow', () => {
      for (let i = 0; i < 1000; i++);
    });

    const results = suite.getResults();
    expect(results.size).toBe(2);
    expect(results.has('fast')).toBe(true);
    expect(results.has('slow')).toBe(true);
  });

  it('should find fastest benchmark', () => {
    const suite = new BenchmarkSuite('test', { iterations: 10, warmupIterations: 5 });

    suite.add('fast', () => {});
    suite.add('slow', () => {
      for (let i = 0; i < 10000; i++);
    });

    const fastest = suite.getFastest();
    expect(fastest?.name).toBe('fast');
  });

  it('should find slowest benchmark', () => {
    const suite = new BenchmarkSuite('test', { iterations: 10, warmupIterations: 5 });

    suite.add('fast', () => {});
    suite.add('slow', () => {
      for (let i = 0; i < 10000; i++);
    });

    const slowest = suite.getSlowest();
    expect(slowest?.name).toBe('slow');
  });

  it('should format suite', () => {
    const suite = new BenchmarkSuite('test', { iterations: 10, warmupIterations: 5 });
    suite.add('test1', () => {});

    const formatted = suite.format();
    expect(formatted).toContain('Suite: test');
    expect(formatted).toContain('test1');
    expect(formatted).toContain('Fastest:');
  });

  it('should add async benchmarks', async () => {
    const suite = new BenchmarkSuite('async-suite', { iterations: 5, warmupIterations: 2 });
    await suite.addAsync('async-test', async () => {
      await sleep(1);
    });

    const results = suite.getResults();
    expect(results.has('async-test')).toBe(true);
  });
});
