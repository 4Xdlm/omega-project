/**
 * OMEGA Truth Gate Verdict Engine Tests v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * Tests F5-INV-01 to F5-INV-03
 */

import { describe, it, expect } from 'vitest';
import {
  computeVerdict,
  createVerdictResult,
  validateVerdictResult,
  isPassed,
  isFailed,
  summarizeVerdict,
  getViolationCodes,
  countViolationsByCode,
} from '../../src/gates/verdict-engine';
import { createFact } from '../../src/gates/fact-extractor';
import { classifyFact } from '../../src/gates/fact-classifier';
import { createViolation } from '../../src/gates/canon-matcher';
import { Verdict, ViolationCode, FactClass } from '../../src/gates/types';
import type { CanonViolation, VerdictResult, ClassifiedFact } from '../../src/gates/types';

// Helper to create test violation
function createTestViolation(code: string = ViolationCode.CONTRADICTORY_VALUE): CanonViolation {
  const fact = classifyFact(createFact('Alice', 'HAS_NAME', 'Smith', 'Alice is Smith'));
  return createViolation(
    code as any,
    fact,
    `Test violation: ${code}`,
    undefined,
    'expected',
    'actual'
  );
}

// Helper to create test facts
function createTestFacts(count: number): ClassifiedFact[] {
  return Array.from({ length: count }, (_, i) =>
    classifyFact(createFact(`Entity${i}`, 'HAS_NAME', `Name${i}`, `Entity${i} is Name${i}`))
  );
}

describe('Verdict Engine — Phase F', () => {
  describe('F5-INV-01: Verdict is binary (PASS or FAIL only)', () => {
    it('verdict is PASS for no violations', () => {
      const verdict = computeVerdict([]);
      expect(verdict).toBe(Verdict.PASS);
    });

    it('verdict is FAIL for one violation', () => {
      const violations = [createTestViolation()];
      const verdict = computeVerdict(violations);
      expect(verdict).toBe(Verdict.FAIL);
    });

    it('verdict is FAIL for multiple violations', () => {
      const violations = [
        createTestViolation(ViolationCode.CONTRADICTORY_VALUE),
        createTestViolation(ViolationCode.FORBIDDEN_PREDICATE),
        createTestViolation(ViolationCode.UNKNOWN_ENTITY),
      ];
      const verdict = computeVerdict(violations);
      expect(verdict).toBe(Verdict.FAIL);
    });

    it('no partial or intermediate verdict values', () => {
      const validVerdicts = [Verdict.PASS, Verdict.FAIL];
      const verdict1 = computeVerdict([]);
      const verdict2 = computeVerdict([createTestViolation()]);

      expect(validVerdicts).toContain(verdict1);
      expect(validVerdicts).toContain(verdict2);
    });
  });

  describe('F5-INV-02: PASS iff violations.length === 0', () => {
    it('PASS when violations array is empty', () => {
      const result = createVerdictResult([], createTestFacts(5));
      expect(result.verdict).toBe(Verdict.PASS);
      expect(result.violations).toHaveLength(0);
    });

    it('FAIL when violations array is non-empty', () => {
      const result = createVerdictResult([createTestViolation()], createTestFacts(5));
      expect(result.verdict).toBe(Verdict.FAIL);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('validateVerdictResult catches inconsistent PASS', () => {
      const badResult: VerdictResult = {
        verdict: Verdict.PASS,
        violations: [createTestViolation()], // Non-empty violations with PASS
        factsProcessed: 1,
        strictFactsChecked: 1,
      };

      expect(() => validateVerdictResult(badResult)).toThrow('INV-F5-02');
    });

    it('validateVerdictResult catches inconsistent FAIL', () => {
      const badResult: VerdictResult = {
        verdict: Verdict.FAIL,
        violations: [], // Empty violations with FAIL
        factsProcessed: 1,
        strictFactsChecked: 1,
      };

      expect(() => validateVerdictResult(badResult)).toThrow('INV-F5-02');
    });

    it('validateVerdictResult passes for consistent PASS', () => {
      const result = createVerdictResult([], createTestFacts(3));
      expect(validateVerdictResult(result)).toBe(true);
    });

    it('validateVerdictResult passes for consistent FAIL', () => {
      const result = createVerdictResult([createTestViolation()], createTestFacts(3));
      expect(validateVerdictResult(result)).toBe(true);
    });
  });

  describe('F5-INV-03: Verdict is deterministic', () => {
    it('same violations produce same verdict', () => {
      const violations = [createTestViolation()];
      const verdict1 = computeVerdict(violations);
      const verdict2 = computeVerdict(violations);
      expect(verdict1).toBe(verdict2);
    });

    it('verdict deterministic across 100 runs', () => {
      const violations = [
        createTestViolation(ViolationCode.CONTRADICTORY_VALUE),
        createTestViolation(ViolationCode.FORBIDDEN_PREDICATE),
      ];

      const first = computeVerdict(violations);
      for (let i = 0; i < 100; i++) {
        expect(computeVerdict(violations)).toBe(first);
      }
    });

    it('createVerdictResult deterministic across runs', () => {
      const violations = [createTestViolation()];
      const facts = createTestFacts(10);

      const first = createVerdictResult(violations, facts);
      for (let i = 0; i < 50; i++) {
        const result = createVerdictResult(violations, facts);
        expect(result.verdict).toBe(first.verdict);
        expect(result.factsProcessed).toBe(first.factsProcessed);
        expect(result.strictFactsChecked).toBe(first.strictFactsChecked);
      }
    });

    it('order of violations does not affect verdict', () => {
      const v1 = createTestViolation(ViolationCode.CONTRADICTORY_VALUE);
      const v2 = createTestViolation(ViolationCode.FORBIDDEN_PREDICATE);

      const verdict1 = computeVerdict([v1, v2]);
      const verdict2 = computeVerdict([v2, v1]);
      expect(verdict1).toBe(verdict2);
    });
  });

  describe('createVerdictResult', () => {
    it('includes all required fields', () => {
      const violations = [createTestViolation()];
      const facts = createTestFacts(5);
      const result = createVerdictResult(violations, facts);

      expect(result.verdict).toBeDefined();
      expect(result.violations).toBeDefined();
      expect(result.factsProcessed).toBeDefined();
      expect(result.strictFactsChecked).toBeDefined();
    });

    it('counts facts correctly', () => {
      const facts = createTestFacts(10);
      const result = createVerdictResult([], facts);

      expect(result.factsProcessed).toBe(10);
    });

    it('counts strict facts correctly', () => {
      // All facts from createTestFacts are FACT_STRICT (HAS_NAME predicate)
      const facts = createTestFacts(5);
      const result = createVerdictResult([], facts);

      expect(result.strictFactsChecked).toBe(5);
    });

    it('violations array is frozen', () => {
      const violations = [createTestViolation()];
      const result = createVerdictResult(violations, []);

      expect(Object.isFrozen(result.violations)).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    describe('isPassed / isFailed', () => {
      it('isPassed returns true for PASS verdict', () => {
        const result = createVerdictResult([], createTestFacts(1));
        expect(isPassed(result)).toBe(true);
        expect(isFailed(result)).toBe(false);
      });

      it('isFailed returns true for FAIL verdict', () => {
        const result = createVerdictResult([createTestViolation()], createTestFacts(1));
        expect(isFailed(result)).toBe(true);
        expect(isPassed(result)).toBe(false);
      });
    });

    describe('summarizeVerdict', () => {
      it('includes verdict in summary', () => {
        const result = createVerdictResult([], createTestFacts(3));
        const summary = summarizeVerdict(result);
        expect(summary).toContain('Verdict: PASS');
      });

      it('includes facts processed count', () => {
        const result = createVerdictResult([], createTestFacts(5));
        const summary = summarizeVerdict(result);
        expect(summary).toContain('Facts processed: 5');
      });

      it('includes violations when present', () => {
        const violations = [createTestViolation(ViolationCode.CONTRADICTORY_VALUE)];
        const result = createVerdictResult(violations, createTestFacts(1));
        const summary = summarizeVerdict(result);
        expect(summary).toContain('Violations:');
        expect(summary).toContain(ViolationCode.CONTRADICTORY_VALUE);
      });

      it('does not include violations section when none', () => {
        const result = createVerdictResult([], createTestFacts(1));
        const summary = summarizeVerdict(result);
        expect(summary).not.toContain('Violations:');
      });
    });

    describe('getViolationCodes', () => {
      it('returns unique codes', () => {
        const violations = [
          createTestViolation(ViolationCode.CONTRADICTORY_VALUE),
          createTestViolation(ViolationCode.CONTRADICTORY_VALUE),
          createTestViolation(ViolationCode.FORBIDDEN_PREDICATE),
        ];
        const result = createVerdictResult(violations, []);
        const codes = getViolationCodes(result);

        expect(codes).toHaveLength(2);
        expect(codes).toContain(ViolationCode.CONTRADICTORY_VALUE);
        expect(codes).toContain(ViolationCode.FORBIDDEN_PREDICATE);
      });

      it('returns empty array for no violations', () => {
        const result = createVerdictResult([], []);
        const codes = getViolationCodes(result);
        expect(codes).toHaveLength(0);
      });
    });

    describe('countViolationsByCode', () => {
      it('counts violations correctly', () => {
        const violations = [
          createTestViolation(ViolationCode.CONTRADICTORY_VALUE),
          createTestViolation(ViolationCode.CONTRADICTORY_VALUE),
          createTestViolation(ViolationCode.FORBIDDEN_PREDICATE),
        ];
        const result = createVerdictResult(violations, []);
        const counts = countViolationsByCode(result);

        expect(counts.get(ViolationCode.CONTRADICTORY_VALUE)).toBe(2);
        expect(counts.get(ViolationCode.FORBIDDEN_PREDICATE)).toBe(1);
      });

      it('returns empty map for no violations', () => {
        const result = createVerdictResult([], []);
        const counts = countViolationsByCode(result);
        expect(counts.size).toBe(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles large number of violations', () => {
      const violations = Array.from({ length: 1000 }, () => createTestViolation());
      const result = createVerdictResult(violations, createTestFacts(1000));

      expect(result.verdict).toBe(Verdict.FAIL);
      expect(result.violations).toHaveLength(1000);
      expect(validateVerdictResult(result)).toBe(true);
    });

    it('handles zero facts', () => {
      const result = createVerdictResult([], []);

      expect(result.verdict).toBe(Verdict.PASS);
      expect(result.factsProcessed).toBe(0);
      expect(result.strictFactsChecked).toBe(0);
      expect(validateVerdictResult(result)).toBe(true);
    });

    it('handles mixed fact classifications', () => {
      const facts = [
        classifyFact(createFact('A', 'HAS_NAME', 'V', 'text')), // FACT_STRICT
        classifyFact(createFact('B', 'IMPLIES', 'V', 'text')), // FACT_DERIVED
        classifyFact(createFact('C', 'UNKNOWN', 'V', 'maybe text')), // NON_FACTUAL
      ];
      const result = createVerdictResult([], facts);

      expect(result.factsProcessed).toBe(3);
      expect(result.strictFactsChecked).toBe(1);
    });
  });
});
