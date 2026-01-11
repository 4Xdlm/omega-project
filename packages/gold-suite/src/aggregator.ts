/**
 * @fileoverview OMEGA Gold Suite - Result Aggregator
 * @module @omega/gold-suite/aggregator
 *
 * Aggregates and formats test results.
 */

import { sha256 } from '@omega/orchestrator-core';
import type { SuiteRunResult, SuiteSummary, SuiteResult } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Aggregate result for reporting.
 */
export interface AggregatedResult {
  readonly id: string;
  readonly timestamp: string;
  readonly summary: SuiteSummary;
  readonly packages: readonly PackageResult[];
  readonly hash: string;
}

/**
 * Package-level result.
 */
export interface PackageResult {
  readonly name: string;
  readonly tests: number;
  readonly passed: number;
  readonly failed: number;
  readonly duration: number;
  readonly passRate: number;
}

/**
 * Aggregate suite run results.
 */
export function aggregateResults(run: SuiteRunResult): AggregatedResult {
  const id = generateResultId();
  const packages = run.suites.map(aggregateSuite);
  const hash = computeResultHash(run);

  return {
    id,
    timestamp: run.timestamp,
    summary: run.summary,
    packages,
    hash,
  };
}

/**
 * Aggregate a single suite.
 */
function aggregateSuite(suite: SuiteResult): PackageResult {
  const tests = suite.tests.length;
  const passRate = tests > 0 ? suite.passed / tests : 0;

  return {
    name: suite.name,
    tests,
    passed: suite.passed,
    failed: suite.failed,
    duration: suite.duration,
    passRate,
  };
}

/**
 * Generate result ID.
 */
function generateResultId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `RESULT-${timestamp}-${random}`.toUpperCase();
}

/**
 * Compute result hash.
 */
function computeResultHash(run: SuiteRunResult): string {
  const data = JSON.stringify({
    timestamp: run.timestamp,
    summary: run.summary,
    suiteCount: run.suites.length,
  });
  return sha256(data);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format result as text.
 */
export function formatResultText(result: AggregatedResult): string {
  const lines: string[] = [];

  lines.push('═'.repeat(60));
  lines.push('OMEGA GOLD SUITE RESULTS');
  lines.push('═'.repeat(60));
  lines.push('');
  lines.push(`Result ID: ${result.id}`);
  lines.push(`Timestamp: ${result.timestamp}`);
  lines.push(`Hash: ${result.hash.slice(0, 16)}...`);
  lines.push('');
  lines.push('SUMMARY');
  lines.push('-'.repeat(40));
  lines.push(`Total Suites: ${result.summary.totalSuites}`);
  lines.push(`Total Tests: ${result.summary.totalTests}`);
  lines.push(`Passed: ${result.summary.totalPassed}`);
  lines.push(`Failed: ${result.summary.totalFailed}`);
  lines.push(`Skipped: ${result.summary.totalSkipped}`);
  lines.push(`Pass Rate: ${(result.summary.passRate * 100).toFixed(1)}%`);
  lines.push(`Duration: ${result.summary.totalDuration}ms`);
  lines.push(`Status: ${result.summary.success ? 'SUCCESS' : 'FAILED'}`);
  lines.push('');
  lines.push('PACKAGES');
  lines.push('-'.repeat(40));

  for (const pkg of result.packages) {
    const status = pkg.failed === 0 ? 'PASS' : 'FAIL';
    const rate = (pkg.passRate * 100).toFixed(0);
    lines.push(`${pkg.name}: ${pkg.passed}/${pkg.tests} (${rate}%) [${status}]`);
  }

  return lines.join('\n');
}

/**
 * Format result as JSON.
 */
export function formatResultJson(result: AggregatedResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Format result as markdown.
 */
export function formatResultMarkdown(result: AggregatedResult): string {
  const lines: string[] = [];

  lines.push('# OMEGA Gold Suite Results');
  lines.push('');
  lines.push(`**Result ID:** ${result.id}`);
  lines.push(`**Timestamp:** ${result.timestamp}`);
  lines.push(`**Hash:** \`${result.hash.slice(0, 16)}...\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Suites | ${result.summary.totalSuites} |`);
  lines.push(`| Total Tests | ${result.summary.totalTests} |`);
  lines.push(`| Passed | ${result.summary.totalPassed} |`);
  lines.push(`| Failed | ${result.summary.totalFailed} |`);
  lines.push(`| Skipped | ${result.summary.totalSkipped} |`);
  lines.push(`| Pass Rate | ${(result.summary.passRate * 100).toFixed(1)}% |`);
  lines.push(`| Duration | ${result.summary.totalDuration}ms |`);
  lines.push(`| Status | ${result.summary.success ? 'SUCCESS' : 'FAILED'} |`);
  lines.push('');
  lines.push('## Packages');
  lines.push('');
  lines.push('| Package | Tests | Passed | Failed | Rate | Status |');
  lines.push('|---------|-------|--------|--------|------|--------|');

  for (const pkg of result.packages) {
    const status = pkg.failed === 0 ? 'PASS' : 'FAIL';
    const rate = `${(pkg.passRate * 100).toFixed(0)}%`;
    lines.push(`| ${pkg.name} | ${pkg.tests} | ${pkg.passed} | ${pkg.failed} | ${rate} | ${status} |`);
  }

  return lines.join('\n');
}
