import { describe, it, expect } from 'vitest';
import { evaluateOracleA, checkPrecision, checkPatterns, checkContradictions } from '../src/oracle-a.js';
import { createDefaultConfig } from '../src/config.js';
import type { QTestCase, QOracleRule } from '../src/types.js';

const TIMESTAMP = '2026-02-08T00:00:00.000Z';
const config = createDefaultConfig();
const rules: QOracleRule[] = [];

function makeCase(overrides: Partial<QTestCase> = {}): QTestCase {
  return {
    id: 'Q-CASE-TEST',
    category: 'precision',
    input: {
      context: 'Test context',
      facts: ['The sky is blue', 'Water is wet'],
      constraints: [],
    },
    candidate_output: 'The sky is blue. Water is wet.',
    expected: {
      verdict: 'PASS',
      expected_props: [],
      must_find: [],
      must_not_find: [],
      max_unsupported_claims: 'CONFIG:UNSUPPORTED_MAX',
      contradiction_ids: [],
      notes: '',
    },
    ...overrides,
  };
}

describe('Phase Q — Oracle A: Symbolic Rules', () => {
  describe('checkPrecision (Q-INV-01)', () => {
    it('should PASS when all claims are supported by facts', () => {
      const result = checkPrecision('The sky is blue.', ['The sky is blue'], rules, 0);
      expect(result.verdict).toBe('PASS');
      expect(result.unsupportedCount).toBe(0);
    });

    it('should FAIL when unsupported claims exceed threshold', () => {
      const result = checkPrecision('The sky is green. Mars is flat.', ['The sky is blue'], rules, 0);
      expect(result.verdict).toBe('FAIL');
      expect(result.unsupportedCount).toBeGreaterThan(0);
    });

    it('should PASS when unsupported count is at threshold', () => {
      const result = checkPrecision('The sky is green.', ['The sky is blue'], rules, 1);
      expect(result.verdict).toBe('PASS');
    });

    it('should handle empty candidate output', () => {
      const result = checkPrecision('', ['fact1'], rules, 0);
      expect(result.verdict).toBe('PASS');
      expect(result.unsupportedCount).toBe(0);
    });

    it('should handle empty facts list', () => {
      const result = checkPrecision('Some claim.', [], rules, 0);
      expect(result.verdict).toBe('FAIL');
    });

    it('should match case-insensitively', () => {
      const result = checkPrecision('THE SKY IS BLUE.', ['the sky is blue'], rules, 0);
      expect(result.verdict).toBe('PASS');
    });

    it('should produce violations with Q-INV-01 reference', () => {
      const result = checkPrecision('Mars has purple oceans.', ['The sky is blue'], rules, 0);
      expect(result.violations.some(v => v.invariant_id === 'Q-INV-01')).toBe(true);
    });
  });

  describe('checkPatterns', () => {
    it('should PASS when all must_find patterns are present', () => {
      const result = checkPatterns('The system is valid and correct.', ['valid', 'correct'], []);
      expect(result.verdict).toBe('PASS');
      expect(result.missing).toHaveLength(0);
    });

    it('should FAIL when a must_find pattern is missing', () => {
      const result = checkPatterns('The system is valid.', ['valid', 'correct'], []);
      expect(result.verdict).toBe('FAIL');
      expect(result.missing).toContain('correct');
    });

    it('should FAIL when a must_not_find pattern is present', () => {
      const result = checkPatterns('The system has an error.', [], ['error']);
      expect(result.verdict).toBe('FAIL');
      expect(result.forbidden).toContain('error');
    });

    it('should PASS when no must_not_find patterns are present', () => {
      const result = checkPatterns('The system is valid.', [], ['error', 'failure']);
      expect(result.verdict).toBe('PASS');
    });

    it('should match patterns case-insensitively', () => {
      const result = checkPatterns('VALID system', ['valid'], []);
      expect(result.verdict).toBe('PASS');
    });
  });

  describe('checkContradictions (Q-INV-03)', () => {
    it('should PASS when no contradictions exist', () => {
      const result = checkContradictions('The value is always true.', []);
      expect(result.verdict).toBe('PASS');
    });

    it('should FAIL when contradictions are found', () => {
      const result = checkContradictions(
        'The value is always present. The value is never present.',
        ['always-never']
      );
      expect(result.verdict).toBe('FAIL');
      expect(result.contradictionsFound).toHaveLength(1);
    });

    it('should detect true/false contradiction', () => {
      const result = checkContradictions(
        'The result is true. The result is false.',
        ['true-false']
      );
      expect(result.verdict).toBe('FAIL');
    });

    it('should PASS when only one side of contradiction pair exists', () => {
      const result = checkContradictions(
        'The value is always present.',
        ['always-never']
      );
      expect(result.verdict).toBe('PASS');
    });
  });

  describe('evaluateOracleA (full evaluation)', () => {
    it('should PASS for well-formed output matching facts', () => {
      const testCase = makeCase();
      const result = evaluateOracleA(testCase, config, rules, TIMESTAMP);
      expect(result.oracle_id).toBe('ORACLE-A');
      expect(result.verdict).toBe('PASS');
    });

    it('should FAIL when precision check fails', () => {
      const testCase = makeCase({
        candidate_output: 'The sky is red. Mars has oceans.',
      });
      const result = evaluateOracleA(testCase, config, rules, TIMESTAMP);
      expect(result.verdict).toBe('FAIL');
    });

    it('should FAIL when must_find patterns are missing', () => {
      const testCase = makeCase({
        expected: {
          verdict: 'FAIL',
          expected_props: [],
          must_find: ['nonexistent_term'],
          must_not_find: [],
          max_unsupported_claims: 'CONFIG:UNSUPPORTED_MAX',
          contradiction_ids: [],
          notes: '',
        },
      });
      const result = evaluateOracleA(testCase, config, rules, TIMESTAMP);
      expect(result.verdict).toBe('FAIL');
    });

    it('should produce evidence chain with 3 steps', () => {
      const testCase = makeCase();
      const result = evaluateOracleA(testCase, config, rules, TIMESTAMP);
      expect(result.evidence).toHaveLength(3);
      expect(result.evidence[0]!.step).toBe('oracle-a:precision-check');
      expect(result.evidence[1]!.step).toBe('oracle-a:pattern-check');
      expect(result.evidence[2]!.step).toBe('oracle-a:contradiction-check');
    });

    it('should resolve CONFIG references for max_unsupported_claims', () => {
      const testCase = makeCase();
      const result = evaluateOracleA(testCase, config, rules, TIMESTAMP);
      expect(result.metrics.unsupported_claims).toBeDefined();
    });

    it('should handle numeric max_unsupported_claims', () => {
      const testCase = makeCase({
        expected: {
          verdict: 'PASS',
          expected_props: [],
          must_find: [],
          must_not_find: [],
          max_unsupported_claims: '5',
          contradiction_ids: [],
          notes: '',
        },
      });
      const result = evaluateOracleA(testCase, config, rules, TIMESTAMP);
      expect(result.verdict).toBe('PASS');
    });

    it('should include metrics for all check types', () => {
      const testCase = makeCase();
      const result = evaluateOracleA(testCase, config, rules, TIMESTAMP);
      expect(result.metrics).toHaveProperty('unsupported_claims');
      expect(result.metrics).toHaveProperty('missing_patterns');
      expect(result.metrics).toHaveProperty('forbidden_patterns');
      expect(result.metrics).toHaveProperty('contradictions_found');
    });

    it('should be deterministic across runs', () => {
      const testCase = makeCase();
      const r1 = evaluateOracleA(testCase, config, rules, TIMESTAMP);
      const r2 = evaluateOracleA(testCase, config, rules, TIMESTAMP);
      expect(r1.verdict).toBe(r2.verdict);
      expect(r1.evidence).toEqual(r2.evidence);
    });
  });
});
