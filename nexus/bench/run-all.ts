#!/usr/bin/env npx tsx

/**
 * Benchmark Runner
 * Standard: NASA-Grade L4
 *
 * CRITICAL (VERROU 2):
 * - Run with: npm run bench
 * - NEVER in CI
 * - NEVER timing assertions
 */

import { runAtlasBenchmarks } from './atlas.bench.js';
import { runRawBenchmarks } from './raw.bench.js';
import { runProofBenchmarks } from './proof.bench.js';
import {
  formatResults,
  formatSuiteHeader,
  saveResults,
  loadResults,
  compareSuites,
  formatComparison,
  type BenchmarkSuite,
  type BenchmarkResult,
} from './utils.js';

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              OMEGA BENCHMARK SUITE                          ║');
  console.log('║              Standard: NASA-Grade L4                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const allResults: BenchmarkResult[] = [];

  // Run Atlas benchmarks
  console.log('Running Atlas benchmarks...');
  const atlasSuite = await runAtlasBenchmarks();
  console.log(formatSuiteHeader(atlasSuite.name));
  console.log(formatResults(atlasSuite.results));
  allResults.push(...atlasSuite.results);

  // Run Raw benchmarks
  console.log('Running Raw Storage benchmarks...');
  const rawSuite = await runRawBenchmarks();
  console.log(formatSuiteHeader(rawSuite.name));
  console.log(formatResults(rawSuite.results));
  allResults.push(...rawSuite.results);

  // Run Proof benchmarks
  console.log('Running Proof Utils benchmarks...');
  const proofSuite = await runProofBenchmarks();
  console.log(formatSuiteHeader(proofSuite.name));
  console.log(formatResults(proofSuite.results));
  allResults.push(...proofSuite.results);

  // Create combined suite
  const combinedSuite: BenchmarkSuite = {
    name: 'OMEGA Complete Benchmark Suite',
    results: allResults,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
  };

  // Save results
  const outputFile = process.argv[2] || 'bench-results/latest.json';
  saveResults(combinedSuite, outputFile);
  console.log(`\n✅ Results saved to: ${outputFile}`);

  // Compare with baseline if exists
  const baselineFile = 'bench-results/baseline.json';
  const baseline = loadResults(baselineFile);

  if (baseline) {
    console.log('\n' + '─'.repeat(60));
    const comparison = compareSuites(baseline, combinedSuite);
    console.log(formatComparison(comparison));
  } else {
    console.log('\nℹ️  No baseline found. Run `npm run bench:baseline` to create one.');
  }

  console.log('\n' + '─'.repeat(60));
  console.log('📊 Benchmark Summary:');
  console.log(`   Total benchmarks: ${allResults.length}`);
  console.log(`   Timestamp: ${combinedSuite.timestamp}`);
  console.log(`   Version: ${combinedSuite.version}`);
  console.log('');
}

main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
