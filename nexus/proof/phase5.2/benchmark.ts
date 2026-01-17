/**
 * Phase 5.2 Performance Benchmark
 * Deterministic micro-benchmark for measuring optimization gains.
 *
 * Usage: npx tsx nexus/proof/phase5.2/benchmark.ts
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BENCHMARK INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  meanMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
}

function benchmark(
  name: string,
  fn: () => void,
  iterations: number = 1000,
  warmup: number = 100
): BenchmarkResult {
  // Warmup
  for (let i = 0; i < warmup; i++) {
    fn();
  }

  // Measure
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  // Calculate stats
  times.sort((a, b) => a - b);
  const totalMs = times.reduce((a, b) => a + b, 0);
  const meanMs = totalMs / iterations;
  const minMs = times[0];
  const maxMs = times[times.length - 1];
  const p95Index = Math.floor(iterations * 0.95);
  const p95Ms = times[p95Index];

  return { name, iterations, totalMs, meanMs, minMs, maxMs, p95Ms };
}

function formatResult(result: BenchmarkResult): string {
  return `| ${result.name.padEnd(35)} | ${result.iterations.toString().padStart(6)} | ${result.meanMs.toFixed(4).padStart(10)} | ${result.p95Ms.toFixed(4).padStart(10)} | ${result.minMs.toFixed(4).padStart(10)} | ${result.maxMs.toFixed(4).padStart(10)} |`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST DATA (STABLE, REPRODUCIBLE)
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_TEXT_SHORT = "The quick brown fox jumps over the lazy dog.";
const SAMPLE_TEXT_MEDIUM = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore
eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.
`.trim();

const SAMPLE_TEXT_LONG = Array(20).fill(SAMPLE_TEXT_MEDIUM).join("\n\n");

const SAMPLE_QUERIES = [
  "hello world",
  "title:test AND content:example",
  '"exact phrase" OR wildcard*',
  "complex AND (nested OR query) NOT excluded~2",
  "field:value^2.0 fuzzy~1 [range TO *]",
];

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT TARGETS
// ═══════════════════════════════════════════════════════════════════════════════

import { SearchEngine, createSearchEngine } from "../../../packages/search/src/engine";
import { QueryParser, createQueryParser } from "../../../packages/search/src/query-parser";

// ═══════════════════════════════════════════════════════════════════════════════
// BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

async function runBenchmarks(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  // Create instances
  const engine = createSearchEngine({
    stemming: true,
    stopWords: ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
                'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
                'should', 'may', 'might', 'must', 'shall', 'can', 'of', 'to', 'in',
                'for', 'on', 'with', 'at', 'by', 'from', 'up', 'about', 'into',
                'over', 'after', 'and', 'or', 'but', 'if', 'then', 'else'],
  });
  const parser = createQueryParser();

  // ─────────────────────────────────────────────────────────────────────────────
  // TARGET 1: SearchEngine.tokenize()
  // ─────────────────────────────────────────────────────────────────────────────

  results.push(benchmark(
    "tokenize(short)",
    () => engine.tokenize(SAMPLE_TEXT_SHORT),
    10000
  ));

  results.push(benchmark(
    "tokenize(medium)",
    () => engine.tokenize(SAMPLE_TEXT_MEDIUM),
    5000
  ));

  results.push(benchmark(
    "tokenize(long)",
    () => engine.tokenize(SAMPLE_TEXT_LONG),
    1000
  ));

  // ─────────────────────────────────────────────────────────────────────────────
  // TARGET 2: QueryParser.parse()
  // ─────────────────────────────────────────────────────────────────────────────

  for (let i = 0; i < SAMPLE_QUERIES.length; i++) {
    results.push(benchmark(
      `parse(query${i + 1})`,
      () => parser.parse(SAMPLE_QUERIES[i]),
      5000
    ));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TARGET 3: SearchEngine.search() (with indexed data)
  // ─────────────────────────────────────────────────────────────────────────────

  // Index some documents first
  for (let i = 0; i < 100; i++) {
    engine.index({
      id: `doc-${i}`,
      content: `Document ${i}: ${SAMPLE_TEXT_MEDIUM} unique${i} special${i % 10}`,
      title: `Title ${i}`,
    });
  }

  results.push(benchmark(
    "search(simple)",
    () => engine.search({ text: "lorem ipsum" }),
    2000
  ));

  results.push(benchmark(
    "search(multi-term)",
    () => engine.search({ text: "document special unique" }),
    2000
  ));

  results.push(benchmark(
    "search(fuzzy)",
    () => engine.search({ text: "documant", fuzzy: true }),
    500
  ));

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("PHASE 5.2 PERFORMANCE BENCHMARK");
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Node: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log("");

  console.log("Running benchmarks...");
  console.log("");

  const results = await runBenchmarks();

  console.log("| Benchmark                           |  Iters |   Mean (ms) |    P95 (ms) |    Min (ms) |    Max (ms) |");
  console.log("|-------------------------------------|--------|-------------|-------------|-------------|-------------|");

  for (const result of results) {
    console.log(formatResult(result));
  }

  console.log("");
  console.log("═══════════════════════════════════════════════════════════════════════════════");

  // Output for PERF_BASELINE.md
  console.log("\n## RAW DATA (for PERF_BASELINE.md)\n");
  for (const result of results) {
    console.log(`- ${result.name}: mean=${result.meanMs.toFixed(4)}ms, p95=${result.p95Ms.toFixed(4)}ms`);
  }
}

main().catch(console.error);
