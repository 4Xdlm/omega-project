import { describe, it, expect } from 'vitest';
import { generateReport, renderReportJSON, renderReportMarkdown, verifyReportHash } from '../src/report.js';
import { evaluateAll } from '../src/evaluator.js';
import { createDefaultConfig } from '../src/config.js';
import type { QTestCase } from '../src/types.js';

const TIMESTAMP = '2026-02-08T00:00:00.000Z';
const config = createDefaultConfig();

const testCase: QTestCase = {
  id: 'Q-CASE-0001',
  category: 'precision',
  input: { context: 'Test', facts: ['The sky is blue'], constraints: [] },
  candidate_output: 'The sky is blue.',
  expected: {
    verdict: 'PASS',
    expected_props: ['sky'],
    must_find: [],
    must_not_find: [],
    max_unsupported_claims: 'CONFIG:UNSUPPORTED_MAX',
    contradiction_ids: [],
    notes: '',
  },
};

describe('Phase Q — Report Generator', () => {
  it('should generate a valid report', () => {
    const results = evaluateAll([testCase], config, [], [], TIMESTAMP);
    const report = generateReport(results, config, 'testset-hash', TIMESTAMP);
    expect(report.version).toBe('1.0.0');
    expect(report.phase).toBe('Q');
    expect(report.report_hash).toHaveLength(64);
  });

  it('should produce deterministic report_hash', () => {
    const results = evaluateAll([testCase], config, [], [], TIMESTAMP);
    const r1 = generateReport(results, config, 'testset-hash', TIMESTAMP);
    const r2 = generateReport(results, config, 'testset-hash', TIMESTAMP);
    expect(r1.report_hash).toBe(r2.report_hash);
  });

  it('should render valid JSON', () => {
    const results = evaluateAll([testCase], config, [], [], TIMESTAMP);
    const report = generateReport(results, config, 'testset-hash', TIMESTAMP);
    const json = renderReportJSON(report);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should render JSON with sorted keys', () => {
    const results = evaluateAll([testCase], config, [], [], TIMESTAMP);
    const report = generateReport(results, config, 'testset-hash', TIMESTAMP);
    const json = renderReportJSON(report);
    expect(json.indexOf('"case_results"')).toBeLessThan(json.indexOf('"config_hash"'));
  });

  it('should render Markdown with required sections', () => {
    const results = evaluateAll([testCase], config, [], [], TIMESTAMP);
    const report = generateReport(results, config, 'testset-hash', TIMESTAMP);
    const md = renderReportMarkdown(report);
    expect(md).toContain('Phase Q');
    expect(md).toContain('Summary');
    expect(md).toContain('By Category');
    expect(md).toContain('Case Results');
  });

  it('should use injected timestamp', () => {
    const results = evaluateAll([testCase], config, [], [], TIMESTAMP);
    const report = generateReport(results, config, 'testset-hash', TIMESTAMP);
    expect(report.timestamp_deterministic).toBe(TIMESTAMP);
  });

  it('should include config_hash and testset_hash', () => {
    const results = evaluateAll([testCase], config, [], [], TIMESTAMP);
    const report = generateReport(results, config, 'my-testset-hash', TIMESTAMP);
    expect(report.config_hash).toHaveLength(64);
    expect(report.testset_hash).toBe('my-testset-hash');
  });

  it('should verify report hash successfully', () => {
    const results = evaluateAll([testCase], config, [], [], TIMESTAMP);
    const report = generateReport(results, config, 'testset-hash', TIMESTAMP);
    expect(verifyReportHash(report)).toBe(true);
  });

  it('should fail verification for tampered report', () => {
    const results = evaluateAll([testCase], config, [], [], TIMESTAMP);
    const report = generateReport(results, config, 'testset-hash', TIMESTAMP);
    const tampered = { ...report, report_hash: 'a'.repeat(64) };
    expect(verifyReportHash(tampered)).toBe(false);
  });
});
