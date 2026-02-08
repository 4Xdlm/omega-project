import { describe, it, expect } from 'vitest';
import { evaluateAll } from '../src/evaluator.js';
import { generateReport, renderReportJSON, verifyReportHash } from '../src/report.js';
import { createDefaultConfig, hashConfig } from '../src/config.js';
import { sha256 } from '@omega/canon-kernel';
import type { QTestCase } from '../src/types.js';

const TIMESTAMP = '2026-02-08T00:00:00.000Z';
const config = createDefaultConfig();

const testCases: QTestCase[] = [
  {
    id: 'Q-CASE-DET-001',
    category: 'precision',
    input: { context: 'Determinism test', facts: ['Fact A is true'], constraints: [] },
    candidate_output: 'Fact A is true.',
    expected: {
      verdict: 'PASS',
      expected_props: ['fact a'],
      must_find: [],
      must_not_find: [],
      max_unsupported_claims: 'CONFIG:UNSUPPORTED_MAX',
      contradiction_ids: [],
      notes: 'Determinism test case 1',
    },
  },
  {
    id: 'Q-CASE-DET-002',
    category: 'necessity',
    input: { context: 'Determinism test', facts: ['Fact B confirmed'], constraints: [] },
    candidate_output: 'Fact B confirmed.\n\nAdditional analysis.',
    expected: {
      verdict: 'PASS',
      expected_props: ['fact b'],
      must_find: [],
      must_not_find: [],
      max_unsupported_claims: 'CONFIG:UNSUPPORTED_MAX',
      contradiction_ids: [],
      notes: 'Determinism test case 2',
    },
  },
];

describe('Phase Q — Determinism Verification', () => {
  it('should produce identical JSON report across two runs', () => {
    const results1 = evaluateAll(testCases, config, [], [], TIMESTAMP);
    const report1 = generateReport(results1, config, 'det-testset', TIMESTAMP);
    const json1 = renderReportJSON(report1);

    const results2 = evaluateAll(testCases, config, [], [], TIMESTAMP);
    const report2 = generateReport(results2, config, 'det-testset', TIMESTAMP);
    const json2 = renderReportJSON(report2);

    expect(json1).toBe(json2);
  });

  it('should produce identical report_hash across two runs', () => {
    const results1 = evaluateAll(testCases, config, [], [], TIMESTAMP);
    const report1 = generateReport(results1, config, 'det-testset', TIMESTAMP);

    const results2 = evaluateAll(testCases, config, [], [], TIMESTAMP);
    const report2 = generateReport(results2, config, 'det-testset', TIMESTAMP);

    expect(report1.report_hash).toBe(report2.report_hash);
  });

  it('should have matching report_hash for rendered JSON', () => {
    const results = evaluateAll(testCases, config, [], [], TIMESTAMP);
    const report = generateReport(results, config, 'det-testset', TIMESTAMP);
    expect(verifyReportHash(report)).toBe(true);
  });

  it('should produce identical evidence chain hashes', () => {
    const results1 = evaluateAll(testCases, config, [], [], TIMESTAMP);
    const results2 = evaluateAll(testCases, config, [], [], TIMESTAMP);

    for (let i = 0; i < results1.length; i++) {
      expect(results1[i]!.evidence_chain.chain_hash).toBe(results2[i]!.evidence_chain.chain_hash);
    }
  });

  it('should produce identical config hash', () => {
    const hash1 = hashConfig(config);
    const hash2 = hashConfig(config);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });
});
