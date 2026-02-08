import { describe, it, expect } from 'vitest';
import { evaluateOracleC, checkFormat, checkBaselines } from '../src/oracle-c.js';
import { createDefaultConfig } from '../src/config.js';
import type { QTestCase, QBaseline } from '../src/types.js';

const TIMESTAMP = '2026-02-08T00:00:00.000Z';
const config = createDefaultConfig();

function makeCase(overrides: Partial<QTestCase> = {}): QTestCase {
  return {
    id: 'Q-CASE-TEST',
    category: 'cross-ref',
    input: {
      context: 'Test context',
      facts: ['Fact one'],
      constraints: [],
    },
    candidate_output: 'Fact one is confirmed.',
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

describe('Phase Q — Oracle C: Cross-Reference', () => {
  describe('checkFormat (Q-INV-05)', () => {
    it('should PASS for LF-only output', () => {
      const result = checkFormat('Line one\nLine two');
      expect(result.verdict).toBe('PASS');
    });

    it('should FAIL for CRLF output', () => {
      const result = checkFormat('Line one\r\nLine two');
      expect(result.verdict).toBe('FAIL');
      expect(result.violations.some(v => v.invariant_id === 'Q-INV-05')).toBe(true);
    });

    it('should FAIL for CR-only output', () => {
      const result = checkFormat('Line one\rLine two');
      expect(result.verdict).toBe('FAIL');
    });

    it('should PASS for plain text without issues', () => {
      const result = checkFormat('Simple text');
      expect(result.verdict).toBe('PASS');
    });

    it('should detect trailing whitespace on lines', () => {
      const result = checkFormat('Line one   \nLine two');
      expect(result.verdict).toBe('FAIL');
    });
  });

  describe('checkBaselines', () => {
    it('should PASS when no baselines exist', () => {
      const result = checkBaselines('Q-CASE-0001', 'somehash', []);
      expect(result.verdict).toBe('PASS');
    });

    it('should PASS when hash matches baseline', () => {
      const baselines: QBaseline[] = [
        { id: 'Q-CASE-0001', expected_hash: 'abc123', description: 'test baseline' },
      ];
      const result = checkBaselines('Q-CASE-0001', 'abc123', baselines);
      expect(result.verdict).toBe('PASS');
      expect(result.crossRefResults[0]!.matched).toBe(true);
    });

    it('should FAIL when hash does not match baseline', () => {
      const baselines: QBaseline[] = [
        { id: 'Q-CASE-0001', expected_hash: 'abc123', description: 'test baseline' },
      ];
      const result = checkBaselines('Q-CASE-0001', 'xyz789', baselines);
      expect(result.verdict).toBe('FAIL');
      expect(result.crossRefResults[0]!.matched).toBe(false);
    });

    it('should handle multiple baselines', () => {
      const baselines: QBaseline[] = [
        { id: 'Q-CASE-0001', expected_hash: 'abc', description: 'baseline 1' },
        { id: 'Q-CASE-0001', expected_hash: 'def', description: 'baseline 2' },
      ];
      const result = checkBaselines('Q-CASE-0001', 'abc', baselines);
      expect(result.crossRefResults).toHaveLength(2);
    });
  });

  describe('evaluateOracleC (full evaluation)', () => {
    it('should return ORACLE-C result', () => {
      const testCase = makeCase();
      const result = evaluateOracleC(testCase, config, [], TIMESTAMP);
      expect(result.oracle_id).toBe('ORACLE-C');
    });

    it('should PASS for clean output with no baselines', () => {
      const testCase = makeCase();
      const result = evaluateOracleC(testCase, config, [], TIMESTAMP);
      expect(result.verdict).toBe('PASS');
    });

    it('should produce evidence chain', () => {
      const testCase = makeCase();
      const result = evaluateOracleC(testCase, config, [], TIMESTAMP);
      expect(result.evidence.length).toBeGreaterThanOrEqual(2);
    });

    it('should include format and baseline metrics', () => {
      const testCase = makeCase();
      const result = evaluateOracleC(testCase, config, [], TIMESTAMP);
      expect(result.metrics).toHaveProperty('format_violations');
      expect(result.metrics).toHaveProperty('baseline_matches');
    });

    it('should be deterministic', () => {
      const testCase = makeCase();
      const r1 = evaluateOracleC(testCase, config, [], TIMESTAMP);
      const r2 = evaluateOracleC(testCase, config, [], TIMESTAMP);
      expect(r1.verdict).toBe(r2.verdict);
      expect(r1.metrics).toEqual(r2.metrics);
    });
  });
});
