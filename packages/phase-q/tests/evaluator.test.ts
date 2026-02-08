import { describe, it, expect } from 'vitest';
import {
  parseTestset,
  evaluateCase,
  evaluateAll,
  aggregateScores,
  computeMinVerdict,
} from '../src/evaluator.js';
import { createDefaultConfig } from '../src/config.js';
import type { QTestCase, QOracleRule, QBaseline } from '../src/types.js';

const TIMESTAMP = '2026-02-08T00:00:00.000Z';
const config = createDefaultConfig();
const rules: QOracleRule[] = [];
const baselines: QBaseline[] = [];

const validCase: QTestCase = {
  id: 'Q-CASE-0001',
  category: 'precision',
  input: {
    context: 'Test context',
    facts: ['The sky is blue'],
    constraints: [],
  },
  candidate_output: 'The sky is blue.',
  expected: {
    verdict: 'PASS',
    expected_props: ['sky'],
    must_find: [],
    must_not_find: [],
    max_unsupported_claims: 'CONFIG:UNSUPPORTED_MAX',
    contradiction_ids: [],
    notes: 'Basic precision test',
  },
};

describe('Phase Q — Evaluator Pipeline', () => {
  describe('parseTestset', () => {
    it('should parse valid NDJSON into test cases', () => {
      const ndjson = JSON.stringify(validCase);
      const cases = parseTestset(ndjson);
      expect(cases).toHaveLength(1);
      expect(cases[0]!.id).toBe('Q-CASE-0001');
    });

    it('should parse multiple NDJSON lines', () => {
      const line1 = JSON.stringify(validCase);
      const line2 = JSON.stringify({ ...validCase, id: 'Q-CASE-0002' });
      const ndjson = `${line1}\n${line2}`;
      const cases = parseTestset(ndjson);
      expect(cases).toHaveLength(2);
    });

    it('should skip empty lines', () => {
      const ndjson = `${JSON.stringify(validCase)}\n\n${JSON.stringify({ ...validCase, id: 'Q-CASE-0002' })}`;
      const cases = parseTestset(ndjson);
      expect(cases).toHaveLength(2);
    });

    it('should throw on invalid JSON', () => {
      expect(() => parseTestset('{invalid json}')).toThrow();
    });

    it('should throw on missing required fields', () => {
      expect(() => parseTestset('{"partial": true}')).toThrow();
    });
  });

  describe('computeMinVerdict', () => {
    it('should return PASS when all oracles PASS', () => {
      expect(computeMinVerdict('PASS', 'PASS', 'PASS')).toBe('PASS');
    });

    it('should return FAIL when Oracle-A fails', () => {
      expect(computeMinVerdict('FAIL', 'PASS', 'PASS')).toBe('FAIL');
    });

    it('should return FAIL when Oracle-B fails', () => {
      expect(computeMinVerdict('PASS', 'FAIL', 'PASS')).toBe('FAIL');
    });

    it('should return FAIL when Oracle-C fails', () => {
      expect(computeMinVerdict('PASS', 'PASS', 'FAIL')).toBe('FAIL');
    });

    it('should return FAIL when all oracles fail', () => {
      expect(computeMinVerdict('FAIL', 'FAIL', 'FAIL')).toBe('FAIL');
    });
  });

  describe('evaluateCase', () => {
    it('should evaluate through all three oracles', () => {
      const result = evaluateCase(validCase, config, rules, baselines, TIMESTAMP);
      expect(result.case_id).toBe('Q-CASE-0001');
      expect(result.oracle_a).toBeDefined();
      expect(result.oracle_b).toBeDefined();
      expect(result.oracle_c).toBeDefined();
    });

    it('should produce a deterministic result_hash', () => {
      const r1 = evaluateCase(validCase, config, rules, baselines, TIMESTAMP);
      const r2 = evaluateCase(validCase, config, rules, baselines, TIMESTAMP);
      expect(r1.result_hash).toBe(r2.result_hash);
    });

    it('should have a 64-char result_hash', () => {
      const result = evaluateCase(validCase, config, rules, baselines, TIMESTAMP);
      expect(result.result_hash).toHaveLength(64);
    });

    it('should include evidence chain', () => {
      const result = evaluateCase(validCase, config, rules, baselines, TIMESTAMP);
      expect(result.evidence_chain.steps.length).toBeGreaterThan(0);
    });

    it('should compute final verdict as MIN of all oracles', () => {
      const result = evaluateCase(validCase, config, rules, baselines, TIMESTAMP);
      expect(result.final_verdict).toBeDefined();
    });
  });

  describe('evaluateAll', () => {
    it('should evaluate all test cases', () => {
      const results = evaluateAll([validCase, { ...validCase, id: 'Q-CASE-0002' }], config, rules, baselines, TIMESTAMP);
      expect(results).toHaveLength(2);
    });

    it('should handle empty testset', () => {
      const results = evaluateAll([], config, rules, baselines, TIMESTAMP);
      expect(results).toHaveLength(0);
    });
  });

  describe('aggregateScores', () => {
    it('should compute correct totals', () => {
      const results = evaluateAll([validCase], config, rules, baselines, TIMESTAMP);
      const scores = aggregateScores(results);
      expect(scores.total_cases).toBe(1);
      expect(scores.passed + scores.failed).toBe(1);
    });

    it('should compute pass rate', () => {
      const results = evaluateAll([validCase], config, rules, baselines, TIMESTAMP);
      const scores = aggregateScores(results);
      expect(scores.pass_rate).toBeGreaterThanOrEqual(0);
      expect(scores.pass_rate).toBeLessThanOrEqual(1);
    });

    it('should break down by category', () => {
      const results = evaluateAll([validCase], config, rules, baselines, TIMESTAMP);
      const scores = aggregateScores(results);
      expect(scores.by_category.precision).toBeDefined();
      expect(scores.by_category.precision.total).toBe(1);
    });

    it('should track invariant violations', () => {
      const results = evaluateAll([validCase], config, rules, baselines, TIMESTAMP);
      const scores = aggregateScores(results);
      expect(scores.by_invariant['Q-INV-01']).toBeDefined();
      expect(scores.by_invariant['Q-INV-06']).toBeDefined();
    });

    it('should handle empty results', () => {
      const scores = aggregateScores([]);
      expect(scores.total_cases).toBe(0);
      expect(scores.pass_rate).toBe(0);
    });
  });
});
