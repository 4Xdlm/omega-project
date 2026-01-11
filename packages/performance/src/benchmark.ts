/**
 * @fileoverview OMEGA Performance - Benchmark Utilities
 * @module @omega/performance/benchmark
 *
 * Function benchmarking utilities.
 */

import type { BenchmarkResult, BenchmarkOptions, BenchmarkComparison } from './types.js';
import { now } from './timer.js';
import { mean, min, max, stdDev, percentiles } from './stats.js';

// ═══════════════════════════════════════════════════════════════════════════════
// BENCHMARK FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default benchmark options.
 */
const DEFAULT_OPTIONS: Required<BenchmarkOptions> = {
  iterations: 1000,
  warmupIterations: 100,
  name: 'benchmark',
};

/**
 * Benchmark a synchronous function.
 */
export function benchmark(fn: () => void, options: BenchmarkOptions = {}): BenchmarkResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Warmup
  for (let i = 0; i < opts.warmupIterations; i++) {
    fn();
  }

  // Collect measurements
  const durations: number[] = [];

  for (let i = 0; i < opts.iterations; i++) {
    const start = now();
    fn();
    durations.push(now() - start);
  }

  return createResult(opts.name, durations);
}

/**
 * Benchmark an async function.
 */
export async function benchmarkAsync(
  fn: () => Promise<void>,
  options: BenchmarkOptions = {}
): Promise<BenchmarkResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Warmup
  for (let i = 0; i < opts.warmupIterations; i++) {
    await fn();
  }

  // Collect measurements
  const durations: number[] = [];

  for (let i = 0; i < opts.iterations; i++) {
    const start = now();
    await fn();
    durations.push(now() - start);
  }

  return createResult(opts.name, durations);
}

/**
 * Create benchmark result from durations.
 */
function createResult(name: string, durations: number[]): BenchmarkResult {
  const totalTime = durations.reduce((a, b) => a + b, 0);
  const meanTime = mean(durations);

  return {
    name,
    iterations: durations.length,
    totalTime,
    meanTime,
    minTime: min(durations),
    maxTime: max(durations),
    stdDev: stdDev(durations),
    opsPerSecond: meanTime > 0 ? 1000 / meanTime : 0,
    percentiles: percentiles(durations),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compare two benchmark results.
 */
export function compare(
  baseline: BenchmarkResult,
  current: BenchmarkResult
): BenchmarkComparison {
  const speedup = baseline.meanTime / current.meanTime;
  const percentChange = ((baseline.meanTime - current.meanTime) / baseline.meanTime) * 100;

  return {
    baseline,
    current,
    speedup,
    slower: speedup < 1,
    percentChange,
  };
}

/**
 * Format benchmark result as string.
 */
export function formatResult(result: BenchmarkResult): string {
  const lines: string[] = [];

  lines.push(`Benchmark: ${result.name}`);
  lines.push(`  Iterations: ${result.iterations}`);
  lines.push(`  Mean: ${result.meanTime.toFixed(4)}ms`);
  lines.push(`  Min: ${result.minTime.toFixed(4)}ms`);
  lines.push(`  Max: ${result.maxTime.toFixed(4)}ms`);
  lines.push(`  StdDev: ${result.stdDev.toFixed(4)}ms`);
  lines.push(`  Ops/sec: ${result.opsPerSecond.toFixed(2)}`);
  lines.push(`  P50: ${result.percentiles.p50.toFixed(4)}ms`);
  lines.push(`  P95: ${result.percentiles.p95.toFixed(4)}ms`);
  lines.push(`  P99: ${result.percentiles.p99.toFixed(4)}ms`);

  return lines.join('\n');
}

/**
 * Format comparison as string.
 */
export function formatComparison(comparison: BenchmarkComparison): string {
  const lines: string[] = [];

  lines.push(`Comparison: ${comparison.baseline.name} vs ${comparison.current.name}`);
  lines.push(`  Baseline: ${comparison.baseline.meanTime.toFixed(4)}ms`);
  lines.push(`  Current: ${comparison.current.meanTime.toFixed(4)}ms`);
  lines.push(
    `  Change: ${comparison.percentChange > 0 ? '-' : '+'}${Math.abs(comparison.percentChange).toFixed(2)}%`
  );
  lines.push(`  Speedup: ${comparison.speedup.toFixed(2)}x`);
  lines.push(`  Status: ${comparison.slower ? 'SLOWER' : 'FASTER'}`);

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BENCHMARK SUITE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Benchmark suite for running multiple benchmarks.
 */
export class BenchmarkSuite {
  private readonly name: string;
  private readonly results: Map<string, BenchmarkResult> = new Map();
  private readonly options: Required<BenchmarkOptions>;

  constructor(name: string, options: BenchmarkOptions = {}) {
    this.name = name;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Add a synchronous benchmark.
   */
  add(name: string, fn: () => void): this {
    const result = benchmark(fn, { ...this.options, name });
    this.results.set(name, result);
    return this;
  }

  /**
   * Add an async benchmark.
   */
  async addAsync(name: string, fn: () => Promise<void>): Promise<this> {
    const result = await benchmarkAsync(fn, { ...this.options, name });
    this.results.set(name, result);
    return this;
  }

  /**
   * Get results.
   */
  getResults(): Map<string, BenchmarkResult> {
    return new Map(this.results);
  }

  /**
   * Get fastest benchmark.
   */
  getFastest(): BenchmarkResult | undefined {
    let fastest: BenchmarkResult | undefined;

    for (const result of this.results.values()) {
      if (!fastest || result.meanTime < fastest.meanTime) {
        fastest = result;
      }
    }

    return fastest;
  }

  /**
   * Get slowest benchmark.
   */
  getSlowest(): BenchmarkResult | undefined {
    let slowest: BenchmarkResult | undefined;

    for (const result of this.results.values()) {
      if (!slowest || result.meanTime > slowest.meanTime) {
        slowest = result;
      }
    }

    return slowest;
  }

  /**
   * Format suite as string.
   */
  format(): string {
    const lines: string[] = [];

    lines.push(`Suite: ${this.name}`);
    lines.push('='.repeat(40));

    for (const result of this.results.values()) {
      lines.push('');
      lines.push(formatResult(result));
    }

    const fastest = this.getFastest();
    if (fastest) {
      lines.push('');
      lines.push(`Fastest: ${fastest.name} (${fastest.meanTime.toFixed(4)}ms)`);
    }

    return lines.join('\n');
  }
}
