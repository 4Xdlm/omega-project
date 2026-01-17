/**
 * Phase 5.2 Performance Benchmark Test
 * Run with: npx vitest run tests/benchmark.test.ts
 */

import { describe, it, expect } from "vitest";
import { SearchEngine, createSearchEngine } from "../src/engine";
import { QueryParser, createQueryParser } from "../src/query-parser";

// ═══════════════════════════════════════════════════════════════════════════════
// BENCHMARK INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

interface BenchmarkResult {
  name: string;
  iterations: number;
  meanMs: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
}

function runBenchmark(
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
  const meanMs = times.reduce((a, b) => a + b, 0) / iterations;
  const minMs = times[0];
  const maxMs = times[times.length - 1];
  const p95Index = Math.floor(iterations * 0.95);
  const p95Ms = times[p95Index];

  return { name, iterations, meanMs, p95Ms, minMs, maxMs };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST DATA
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
// BENCHMARK TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Phase 5.2 Performance Benchmark", () => {
  const results: BenchmarkResult[] = [];

  const engine = createSearchEngine({
    stemming: true,
    stopWords: ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
                'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
                'should', 'may', 'might', 'must', 'shall', 'can', 'of', 'to', 'in',
                'for', 'on', 'with', 'at', 'by', 'from', 'up', 'about', 'into',
                'over', 'after', 'and', 'or', 'but', 'if', 'then', 'else'],
  });
  const parser = createQueryParser();

  // Index documents for search benchmarks
  for (let i = 0; i < 100; i++) {
    engine.index({
      id: `doc-${i}`,
      content: `Document ${i}: ${SAMPLE_TEXT_MEDIUM} unique${i} special${i % 10}`,
      title: `Title ${i}`,
    });
  }

  describe("Tokenize", () => {
    it("tokenize(short)", () => {
      const result = runBenchmark("tokenize(short)", () => engine.tokenize(SAMPLE_TEXT_SHORT), 10000);
      results.push(result);
      console.log(`tokenize(short): mean=${result.meanMs.toFixed(4)}ms, p95=${result.p95Ms.toFixed(4)}ms`);
      expect(result.meanMs).toBeLessThan(1); // Sanity check
    });

    it("tokenize(medium)", () => {
      const result = runBenchmark("tokenize(medium)", () => engine.tokenize(SAMPLE_TEXT_MEDIUM), 5000);
      results.push(result);
      console.log(`tokenize(medium): mean=${result.meanMs.toFixed(4)}ms, p95=${result.p95Ms.toFixed(4)}ms`);
      expect(result.meanMs).toBeLessThan(5);
    });

    it("tokenize(long)", () => {
      const result = runBenchmark("tokenize(long)", () => engine.tokenize(SAMPLE_TEXT_LONG), 1000);
      results.push(result);
      console.log(`tokenize(long): mean=${result.meanMs.toFixed(4)}ms, p95=${result.p95Ms.toFixed(4)}ms`);
      expect(result.meanMs).toBeLessThan(50);
    });
  });

  describe("QueryParser", () => {
    SAMPLE_QUERIES.forEach((query, i) => {
      it(`parse(query${i + 1})`, () => {
        const result = runBenchmark(`parse(query${i + 1})`, () => parser.parse(query), 5000);
        results.push(result);
        console.log(`parse(query${i + 1}): mean=${result.meanMs.toFixed(4)}ms, p95=${result.p95Ms.toFixed(4)}ms`);
        expect(result.meanMs).toBeLessThan(1);
      });
    });
  });

  describe("Search", () => {
    it("search(simple)", () => {
      const result = runBenchmark("search(simple)", () => engine.search({ text: "lorem ipsum" }), 2000);
      results.push(result);
      console.log(`search(simple): mean=${result.meanMs.toFixed(4)}ms, p95=${result.p95Ms.toFixed(4)}ms`);
      expect(result.meanMs).toBeLessThan(10);
    });

    it("search(multi-term)", () => {
      const result = runBenchmark("search(multi-term)", () => engine.search({ text: "document special unique" }), 2000);
      results.push(result);
      console.log(`search(multi-term): mean=${result.meanMs.toFixed(4)}ms, p95=${result.p95Ms.toFixed(4)}ms`);
      expect(result.meanMs).toBeLessThan(10);
    });

    it("search(fuzzy)", () => {
      const result = runBenchmark("search(fuzzy)", () => engine.search({ text: "documant", fuzzy: true }), 500);
      results.push(result);
      console.log(`search(fuzzy): mean=${result.meanMs.toFixed(4)}ms, p95=${result.p95Ms.toFixed(4)}ms`);
      expect(result.meanMs).toBeLessThan(50);
    });
  });

  it("SUMMARY", () => {
    console.log("\n═══════════════════════════════════════════════════════════════════════════════");
    console.log("PHASE 5.2 BASELINE RESULTS");
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("| Benchmark                           | Mean (ms)   | P95 (ms)    |");
    console.log("|-------------------------------------|-------------|-------------|");
    for (const r of results) {
      console.log(`| ${r.name.padEnd(35)} | ${r.meanMs.toFixed(4).padStart(11)} | ${r.p95Ms.toFixed(4).padStart(11)} |`);
    }
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");
    expect(results.length).toBeGreaterThan(0);
  });
});
