/**
 * Benchmark Utilities
 * Standard: NASA-Grade L4
 *
 * CRITICAL (VERROU 2 & 3):
 * - Benchmarks = separate command `npm run bench`
 * - NEVER timing assertions
 * - NEVER in CI
 * - PerfNowFn INJECTABLE
 */

import * as fs from 'fs';
import * as path from 'path';
import { createPerfNow, type PerfNowFn } from '../shared/performance/index.js';

// ============================================================================
// Types
// ============================================================================

export interface BenchmarkResult {
  name: string;
  iterations: number;
  mean_ms: number;
  min_ms: number;
  max_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  timestamp: string;
  version: string;
  platform: string;
  node: string;
}

export interface BenchmarkOptions {
  perfNow?: PerfNowFn;
  iterations?: number;
  warmup?: number;
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  timestamp: string;
  version: string;
}

// ============================================================================
// Benchmark Function
// ============================================================================

/**
 * Run a benchmark function multiple times and collect statistics
 * CRITICAL: No timing assertions - just measure and log
 */
export async function benchmark(
  name: string,
  fn: () => void | Promise<void>,
  options: BenchmarkOptions = {}
): Promise<BenchmarkResult> {
  const perfNow = options.perfNow || createPerfNow();
  const iterations = options.iterations || 100;
  const warmup = options.warmup || 10;

  // Warmup runs (not measured)
  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  // Measured runs
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = perfNow();
    await fn();
    const duration = perfNow() - start;
    durations.push(duration);
  }

  // Sort for percentiles
  durations.sort((a, b) => a - b);

  const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
  const min = durations[0];
  const max = durations[durations.length - 1];
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];

  return {
    name,
    iterations,
    mean_ms: mean,
    min_ms: min,
    max_ms: max,
    p50_ms: p50,
    p95_ms: p95,
    p99_ms: p99,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    platform: process.platform,
    node: process.version,
  };
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format benchmark results for console output
 */
export function formatResults(results: BenchmarkResult[]): string {
  const lines: string[] = [];

  for (const result of results) {
    lines.push(`  ${result.name}:`);
    lines.push(`    mean: ${result.mean_ms.toFixed(2)}ms`);
    lines.push(`    p50:  ${result.p50_ms.toFixed(2)}ms`);
    lines.push(`    p95:  ${result.p95_ms.toFixed(2)}ms`);
    lines.push(`    p99:  ${result.p99_ms.toFixed(2)}ms`);
    lines.push(`    min:  ${result.min_ms.toFixed(2)}ms`);
    lines.push(`    max:  ${result.max_ms.toFixed(2)}ms`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format suite header
 */
export function formatSuiteHeader(name: string): string {
  const border = '═'.repeat(name.length + 4);
  return `╔${border}╗\n║  ${name}  ║\n╚${border}╝`;
}

// ============================================================================
// File I/O
// ============================================================================

/**
 * Save benchmark results as JSON
 */
export function saveResults(suite: BenchmarkSuite, filepath: string): void {
  // Ensure directory exists
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filepath, JSON.stringify(suite, null, 2), 'utf8');
}

/**
 * Load benchmark results from JSON
 */
export function loadResults(filepath: string): BenchmarkSuite | null {
  if (!fs.existsSync(filepath)) {
    return null;
  }

  const content = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(content) as BenchmarkSuite;
}

// ============================================================================
// Comparison
// ============================================================================

export interface ComparisonResult {
  name: string;
  baseline_p95_ms: number;
  current_p95_ms: number;
  delta_ms: number;
  delta_pct: number;
  status: 'faster' | 'slower' | 'same';
}

/**
 * Compare two benchmark suites
 */
export function compareSuites(
  baseline: BenchmarkSuite,
  current: BenchmarkSuite
): ComparisonResult[] {
  const results: ComparisonResult[] = [];

  for (const currentResult of current.results) {
    const baselineResult = baseline.results.find(
      (r) => r.name === currentResult.name
    );

    if (!baselineResult) {
      continue;
    }

    const delta = currentResult.p95_ms - baselineResult.p95_ms;
    const deltaPct = (delta / baselineResult.p95_ms) * 100;

    let status: 'faster' | 'slower' | 'same';
    if (deltaPct < -5) {
      status = 'faster';
    } else if (deltaPct > 5) {
      status = 'slower';
    } else {
      status = 'same';
    }

    results.push({
      name: currentResult.name,
      baseline_p95_ms: baselineResult.p95_ms,
      current_p95_ms: currentResult.p95_ms,
      delta_ms: delta,
      delta_pct: deltaPct,
      status,
    });
  }

  return results;
}

/**
 * Format comparison results
 */
export function formatComparison(results: ComparisonResult[]): string {
  const lines: string[] = [];
  lines.push('Comparison with baseline:');
  lines.push('');

  for (const result of results) {
    const indicator =
      result.status === 'faster' ? '✅' : result.status === 'slower' ? '⚠️' : '➖';
    const sign = result.delta_ms >= 0 ? '+' : '';
    lines.push(
      `  ${indicator} ${result.name}: ${result.current_p95_ms.toFixed(2)}ms (${sign}${result.delta_pct.toFixed(1)}%)`
    );
  }

  return lines.join('\n');
}
