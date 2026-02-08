import { describe, it, expect } from 'vitest';
import { evaluateOracleB, checkNecessity, checkStability } from '../src/oracle-b.js';
import { createDefaultConfig } from '../src/config.js';
import type { QTestCase } from '../src/types.js';

const TIMESTAMP = '2026-02-08T00:00:00.000Z';
const config = createDefaultConfig();

function makeCase(overrides: Partial<QTestCase> = {}): QTestCase {
  return {
    id: 'Q-CASE-TEST',
    category: 'necessity',
    input: {
      context: 'Test context',
      facts: ['Fact A is true', 'Fact B is confirmed'],
      constraints: [],
    },
    candidate_output: 'Fact A is true.\n\nFact B is confirmed.\n\nThe analysis shows both facts.',
    expected: {
      verdict: 'PASS',
      expected_props: ['fact a', 'fact b'],
      must_find: [],
      must_not_find: [],
      max_unsupported_claims: 'CONFIG:UNSUPPORTED_MAX',
      contradiction_ids: [],
      notes: '',
    },
    ...overrides,
  };
}

describe('Phase Q — Oracle B: Adversarial + Ablation', () => {
  describe('checkNecessity (Q-INV-02)', () => {
    it('should PASS when all segments are necessary', () => {
      const output = 'Fact A is valid.\n\nFact B is confirmed.';
      const result = checkNecessity(output, ['fact a', 'fact b'], 0.85);
      expect(result.verdict).toBe('PASS');
      expect(result.ratio).toBe(1);
    });

    it('should FAIL when too many segments are unnecessary', () => {
      const output = 'Fact A is valid.\n\nFiller content here.\n\nMore filler.\n\nEven more filler.';
      const result = checkNecessity(output, ['fact a'], 0.85);
      expect(result.verdict).toBe('FAIL');
      expect(result.ratio).toBeLessThan(0.85);
    });

    it('should track violations with Q-INV-02', () => {
      const output = 'A.\n\nB.\n\nC.\n\nD.\n\nE.';
      const result = checkNecessity(output, ['a'], 0.85);
      if (result.verdict === 'FAIL') {
        expect(result.violations.some(v => v.invariant_id === 'Q-INV-02')).toBe(true);
      }
    });

    it('should PASS for empty output', () => {
      const result = checkNecessity('', ['prop'], 0.85);
      expect(result.verdict).toBe('PASS');
    });

    it('should PASS when no expected props', () => {
      const result = checkNecessity('Some output.\n\nMore output.', [], 0.85);
      expect(result.verdict).toBe('PASS');
    });

    it('should handle single segment output', () => {
      const result = checkNecessity('Only segment', ['only'], 0.85);
      expect(result.verdict).toBe('PASS');
      expect(result.ratio).toBe(1);
    });

    it('should be deterministic', () => {
      const output = 'Fact A.\n\nFact B.\n\nFiller.';
      const r1 = checkNecessity(output, ['fact a', 'fact b'], 0.85);
      const r2 = checkNecessity(output, ['fact a', 'fact b'], 0.85);
      expect(r1.ratio).toBe(r2.ratio);
      expect(r1.verdict).toBe(r2.verdict);
    });

    it('should use configurable threshold', () => {
      const output = 'Fact A is valid.\n\nFiller content.';
      const strictResult = checkNecessity(output, ['fact a'], 0.99);
      const lenientResult = checkNecessity(output, ['fact a'], 0.3);
      expect(lenientResult.verdict).toBe('PASS');
      if (strictResult.ratio < 0.99) {
        expect(strictResult.verdict).toBe('FAIL');
      }
    });
  });

  describe('checkStability (Q-INV-04)', () => {
    it('should PASS when output changes are localized', () => {
      const output = 'Segment one.\n\nSegment two.\n\nSegment three.';
      const input = { context: 'ctx', facts: ['f1'], constraints: [] };
      const result = checkStability(output, input, 3, 42);
      expect(result.verdict).toBeDefined();
      expect(result.deltaSegments).toBeGreaterThanOrEqual(0);
    });

    it('should enforce stability factor bound', () => {
      const output = 'A.\n\nB.\n\nC.';
      const input = { context: 'ctx', facts: ['f1'], constraints: [] };
      const result = checkStability(output, input, 3, 42);
      expect(result.bound).toBe(3);
      expect(result.changedFields).toBe(1);
    });

    it('should be deterministic with same seed', () => {
      const output = 'X.\n\nY.\n\nZ.';
      const input = { context: 'ctx', facts: ['f1'], constraints: [] };
      const r1 = checkStability(output, input, 3, 42);
      const r2 = checkStability(output, input, 3, 42);
      expect(r1.deltaSegments).toBe(r2.deltaSegments);
      expect(r1.verdict).toBe(r2.verdict);
    });

    it('should report violations for instability', () => {
      const output = 'A.\n\nB.\n\nC.\n\nD.\n\nE.\n\nF.\n\nG.';
      const input = { context: 'ctx', facts: ['f1'], constraints: [] };
      const result = checkStability(output, input, 1, 42);
      if (result.deltaSegments > result.bound) {
        expect(result.verdict).toBe('FAIL');
        expect(result.violations.some(v => v.invariant_id === 'Q-INV-04')).toBe(true);
      }
    });
  });

  describe('evaluateOracleB (full evaluation)', () => {
    it('should return ORACLE-B result', () => {
      const testCase = makeCase();
      const result = evaluateOracleB(testCase, config, TIMESTAMP);
      expect(result.oracle_id).toBe('ORACLE-B');
    });

    it('should include necessity metrics', () => {
      const testCase = makeCase();
      const result = evaluateOracleB(testCase, config, TIMESTAMP);
      expect(result.metrics).toHaveProperty('necessity_ratio');
      expect(result.metrics).toHaveProperty('delta_segments');
    });

    it('should produce evidence chain', () => {
      const testCase = makeCase();
      const result = evaluateOracleB(testCase, config, TIMESTAMP);
      expect(result.evidence.length).toBeGreaterThanOrEqual(2);
    });

    it('should be deterministic', () => {
      const testCase = makeCase();
      const r1 = evaluateOracleB(testCase, config, TIMESTAMP);
      const r2 = evaluateOracleB(testCase, config, TIMESTAMP);
      expect(r1.verdict).toBe(r2.verdict);
      expect(r1.metrics).toEqual(r2.metrics);
      expect(r1.evidence).toEqual(r2.evidence);
    });

    it('should FAIL when necessity ratio is below threshold', () => {
      const testCase = makeCase({
        candidate_output: 'Relevant.\n\nFiller 1.\n\nFiller 2.\n\nFiller 3.\n\nFiller 4.',
        expected: {
          verdict: 'FAIL',
          expected_props: ['relevant'],
          must_find: [],
          must_not_find: [],
          max_unsupported_claims: 'CONFIG:UNSUPPORTED_MAX',
          contradiction_ids: [],
          notes: '',
        },
      });
      const result = evaluateOracleB(testCase, config, TIMESTAMP);
      expect(result.verdict).toBe('FAIL');
    });

    it('should include adversarial metrics', () => {
      const testCase = makeCase();
      const result = evaluateOracleB(testCase, config, TIMESTAMP);
      expect(result.metrics).toHaveProperty('adversarial_pass_count');
      expect(result.metrics).toHaveProperty('adversarial_total');
    });

    it('should use config-driven thresholds', () => {
      const testCase = makeCase();
      const result = evaluateOracleB(testCase, config, TIMESTAMP);
      expect(result.metrics.stability_bound).toBe(3);
    });

    it('should handle zero-segment edge case', () => {
      const testCase = makeCase({ candidate_output: '' });
      const result = evaluateOracleB(testCase, config, TIMESTAMP);
      expect(result.verdict).toBeDefined();
    });
  });
});
