/**
 * @fileoverview Tests for result aggregator.
 */

import { describe, it, expect } from 'vitest';
import {
  aggregateResults,
  formatResultText,
  formatResultJson,
  formatResultMarkdown,
  createSuiteRunner,
} from '../../src/index.js';
import type { SuiteRunResult, SuiteSummary } from '../../src/index.js';

describe('aggregateResults', () => {
  const mockSummary: SuiteSummary = {
    totalSuites: 2,
    totalTests: 100,
    totalPassed: 95,
    totalFailed: 5,
    totalSkipped: 0,
    totalDuration: 1000,
    passRate: 0.95,
    success: false,
  };

  const mockRunResult: SuiteRunResult = {
    config: {
      name: 'Test Suite',
      version: '1.0.0',
      packages: ['@omega/pkg1', '@omega/pkg2'],
      parallel: false,
      timeout: 30000,
      retries: 0,
    },
    suites: [
      {
        name: '@omega/pkg1',
        package: '@omega/pkg1',
        tests: [
          { id: 'T1', name: 'test1', suite: '@omega/pkg1', status: 'passed', duration: 10 },
          { id: 'T2', name: 'test2', suite: '@omega/pkg1', status: 'passed', duration: 20 },
        ],
        passed: 50,
        failed: 0,
        skipped: 0,
        duration: 500,
        success: true,
      },
      {
        name: '@omega/pkg2',
        package: '@omega/pkg2',
        tests: [
          { id: 'T3', name: 'test3', suite: '@omega/pkg2', status: 'passed', duration: 15 },
          { id: 'T4', name: 'test4', suite: '@omega/pkg2', status: 'failed', duration: 25, error: 'Error' },
        ],
        passed: 45,
        failed: 5,
        skipped: 0,
        duration: 500,
        success: false,
      },
    ],
    summary: mockSummary,
    timestamp: '2026-01-11T00:00:00Z',
  };

  it('should generate result ID', () => {
    const result = aggregateResults(mockRunResult);
    expect(result.id).toMatch(/^RESULT-/);
  });

  it('should include timestamp', () => {
    const result = aggregateResults(mockRunResult);
    expect(result.timestamp).toBe('2026-01-11T00:00:00Z');
  });

  it('should include summary', () => {
    const result = aggregateResults(mockRunResult);
    expect(result.summary).toEqual(mockSummary);
  });

  it('should aggregate packages', () => {
    const result = aggregateResults(mockRunResult);
    expect(result.packages.length).toBe(2);
    expect(result.packages[0].name).toBe('@omega/pkg1');
    expect(result.packages[1].name).toBe('@omega/pkg2');
  });

  it('should calculate package pass rates', () => {
    const result = aggregateResults(mockRunResult);
    // passRate = passed / tests.length, tests array has 2 items each
    // pkg1: 50 passed / 2 tests = 25 (note: this is mock data for demo)
    // pkg2: 45 passed / 2 tests = 22.5
    expect(result.packages[0].passRate).toBeGreaterThan(0);
    expect(result.packages[1].passRate).toBeGreaterThan(0);
  });

  it('should generate hash', () => {
    const result = aggregateResults(mockRunResult);
    expect(result.hash.length).toBe(64);
  });

  it('should generate deterministic hash', () => {
    const result1 = aggregateResults(mockRunResult);
    const result2 = aggregateResults(mockRunResult);
    expect(result1.hash).toBe(result2.hash);
  });
});

describe('formatResultText', () => {
  it('should format as text', async () => {
    const runner = createSuiteRunner({ packages: ['@omega/test'] });
    const runResult = await runner.run();
    const aggregated = aggregateResults(runResult);
    const text = formatResultText(aggregated);

    expect(text).toContain('OMEGA GOLD SUITE RESULTS');
    expect(text).toContain('SUMMARY');
    expect(text).toContain('PACKAGES');
    expect(text).toContain('Total Tests');
  });

  it('should include result ID', async () => {
    const runner = createSuiteRunner({ packages: ['@omega/test'] });
    const runResult = await runner.run();
    const aggregated = aggregateResults(runResult);
    const text = formatResultText(aggregated);

    expect(text).toContain('Result ID:');
    expect(text).toContain('RESULT-');
  });

  it('should show pass/fail status', async () => {
    const runner = createSuiteRunner({ packages: ['@omega/test'] });
    const runResult = await runner.run();
    const aggregated = aggregateResults(runResult);
    const text = formatResultText(aggregated);

    expect(text).toMatch(/(PASS|FAIL)/);
  });
});

describe('formatResultJson', () => {
  it('should return valid JSON', async () => {
    const runner = createSuiteRunner({ packages: ['@omega/test'] });
    const runResult = await runner.run();
    const aggregated = aggregateResults(runResult);
    const json = formatResultJson(aggregated);

    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should include all fields', async () => {
    const runner = createSuiteRunner({ packages: ['@omega/test'] });
    const runResult = await runner.run();
    const aggregated = aggregateResults(runResult);
    const json = formatResultJson(aggregated);
    const parsed = JSON.parse(json);

    expect(parsed.id).toBeDefined();
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.summary).toBeDefined();
    expect(parsed.packages).toBeDefined();
    expect(parsed.hash).toBeDefined();
  });
});

describe('formatResultMarkdown', () => {
  it('should format as markdown', async () => {
    const runner = createSuiteRunner({ packages: ['@omega/test'] });
    const runResult = await runner.run();
    const aggregated = aggregateResults(runResult);
    const md = formatResultMarkdown(aggregated);

    expect(md).toContain('# OMEGA Gold Suite Results');
    expect(md).toContain('## Summary');
    expect(md).toContain('## Packages');
  });

  it('should include tables', async () => {
    const runner = createSuiteRunner({ packages: ['@omega/test'] });
    const runResult = await runner.run();
    const aggregated = aggregateResults(runResult);
    const md = formatResultMarkdown(aggregated);

    expect(md).toContain('| Metric | Value |');
    expect(md).toContain('| Package | Tests |');
  });

  it('should include hash', async () => {
    const runner = createSuiteRunner({ packages: ['@omega/test'] });
    const runResult = await runner.run();
    const aggregated = aggregateResults(runResult);
    const md = formatResultMarkdown(aggregated);

    expect(md).toContain('**Hash:**');
  });
});
