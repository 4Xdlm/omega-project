/**
 * Canonicalizer - Removes volatile fields from test output
 *
 * Volatile fields (duration, timestamp, seed) cause hash variance
 * between runs even when tests are functionally identical.
 * This module strips them to produce deterministic output.
 */

import type { CanonicalTestResult, CanonicalTestReport } from './types.js';

/**
 * Canonicalize vitest JSON output to deterministic format.
 * Removes: duration, startTime, endTime, seed, timestamps
 * Sorts: results by file > suite > name
 */
export function canonicalizeVitestJson(raw: any): CanonicalTestReport {
  const results: CanonicalTestResult[] = [];

  // Handle vitest JSON reporter format
  const testResults = raw.testResults || [];

  for (const file of testResults) {
    // Normalize path separators
    const filePath = (file.name || file.filename || '').replace(/\\/g, '/');

    const assertionResults = file.assertionResults || [];

    for (const test of assertionResults) {
      results.push({
        file: filePath,
        suite: Array.isArray(test.ancestorTitles) ? test.ancestorTitles.join(' > ') : '',
        name: test.title || test.name || '',
        status: mapStatus(test.status),
      });
    }
  }

  // Sort deterministically: file > suite > name
  results.sort((a, b) => {
    const fileCompare = a.file.localeCompare(b.file);
    if (fileCompare !== 0) return fileCompare;
    const suiteCompare = a.suite.localeCompare(b.suite);
    if (suiteCompare !== 0) return suiteCompare;
    return a.name.localeCompare(b.name);
  });

  return {
    version: '1.0.0',
    totalTests: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    skipped: results.filter(r => r.status === 'skip').length,
    results,
  };
}

function mapStatus(status: string): 'pass' | 'fail' | 'skip' {
  switch (status?.toLowerCase()) {
    case 'passed':
    case 'pass':
      return 'pass';
    case 'failed':
    case 'fail':
      return 'fail';
    case 'skipped':
    case 'skip':
    case 'pending':
    case 'todo':
      return 'skip';
    default:
      return 'skip';
  }
}

/**
 * Serialize canonical report to deterministic JSON string.
 * Keys are naturally sorted by structure (no need for explicit sort).
 */
export function serializeCanonical(report: CanonicalTestReport): string {
  return JSON.stringify(report, null, 2) + '\n';
}
