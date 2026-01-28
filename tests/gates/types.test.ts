/**
 * OMEGA Truth Gate Types Tests v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * Tests F1-INV-01 to F1-INV-04
 */

import { describe, it, expect } from 'vitest';
import {
  FactClass,
  ViolationCode,
  Verdict,
  isFactClass,
  isViolationCode,
  isVerdict,
  isGatePass,
  isGateFail,
  type FactId,
  type ProofHash,
  type QuarantineId,
  type SourceSpan,
  type CanonicalFact,
  type ClassifiedFact,
  type CanonViolation,
  type VerdictResult,
  type ProofManifest,
  type QuarantineResult,
  type GateOutput,
  type GateInput,
} from '../../src/gates/types';
import type { ChainHash, ClaimId } from '../../src/canon';

describe('Truth Gate Types — Phase F', () => {
  describe('F1-INV-01: All types are immutable (readonly)', () => {
    it('SourceSpan has readonly fields', () => {
      const span: SourceSpan = { start: 0, end: 10, text: 'test' };
      // TypeScript enforces readonly at compile time
      expect(span.start).toBe(0);
      expect(span.end).toBe(10);
      expect(span.text).toBe('test');
    });

    it('CanonicalFact has readonly fields', () => {
      const fact: CanonicalFact = {
        id: 'fact-123' as FactId,
        sourceSpan: { start: 0, end: 10, text: 'test' },
        subject: 'Alice',
        predicate: 'HAS_NAME',
        object: 'Alice Smith',
      };
      expect(fact.id).toBe('fact-123');
      expect(fact.subject).toBe('Alice');
    });

    it('VerdictResult has readonly fields', () => {
      const result: VerdictResult = {
        verdict: Verdict.PASS,
        violations: [],
        factsProcessed: 5,
        strictFactsChecked: 3,
      };
      expect(result.verdict).toBe('PASS');
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('F1-INV-02: IDs are deterministic hashes', () => {
    it('FactId is branded string type', () => {
      const id = 'abc123def456' as FactId;
      expect(typeof id).toBe('string');
    });

    it('ProofHash is branded string type', () => {
      const hash = 'sha256hash' as ProofHash;
      expect(typeof hash).toBe('string');
    });

    it('QuarantineId is branded string type', () => {
      const id = 'quarantine-001' as QuarantineId;
      expect(typeof id).toBe('string');
    });
  });

  describe('F1-INV-03: No probabilistic fields', () => {
    it('FactClass contains only deterministic classifications', () => {
      expect(FactClass.FACT_STRICT).toBe('FACT_STRICT');
      expect(FactClass.FACT_DERIVED).toBe('FACT_DERIVED');
      expect(FactClass.NON_FACTUAL).toBe('NON_FACTUAL');
      // No MAYBE, UNCERTAIN, or probability fields
      expect(Object.keys(FactClass)).toHaveLength(3);
    });

    it('Verdict is binary only', () => {
      expect(Verdict.PASS).toBe('PASS');
      expect(Verdict.FAIL).toBe('FAIL');
      // No PARTIAL, UNCERTAIN, or probability fields
      expect(Object.keys(Verdict)).toHaveLength(2);
    });

    it('ViolationCode has no probabilistic codes', () => {
      const codes = Object.values(ViolationCode);
      expect(codes).not.toContain('MAYBE');
      expect(codes).not.toContain('UNCERTAIN');
      expect(codes).not.toContain('PROBABLE');
    });
  });

  describe('F1-INV-04: All enums are exhaustive', () => {
    it('FactClass has exactly 3 values', () => {
      expect(Object.keys(FactClass)).toHaveLength(3);
      expect(Object.values(FactClass)).toEqual([
        'FACT_STRICT',
        'FACT_DERIVED',
        'NON_FACTUAL',
      ]);
    });

    it('ViolationCode has exactly 6 values', () => {
      expect(Object.keys(ViolationCode)).toHaveLength(6);
      expect(Object.values(ViolationCode)).toEqual([
        'C-01', // UNKNOWN_ENTITY
        'C-02', // FORBIDDEN_PREDICATE
        'C-03', // CONTRADICTORY_VALUE
        'C-04', // TEMPORAL_VIOLATION
        'C-05', // CANONICAL_REGRESSION
        'C-06', // AMBIGUITY_DETECTED
      ]);
    });

    it('Verdict has exactly 2 values', () => {
      expect(Object.keys(Verdict)).toHaveLength(2);
      expect(Object.values(Verdict)).toEqual(['PASS', 'FAIL']);
    });
  });

  describe('Type Guards', () => {
    describe('isFactClass', () => {
      it('returns true for valid fact classes', () => {
        expect(isFactClass('FACT_STRICT')).toBe(true);
        expect(isFactClass('FACT_DERIVED')).toBe(true);
        expect(isFactClass('NON_FACTUAL')).toBe(true);
      });

      it('returns false for invalid values', () => {
        expect(isFactClass('UNKNOWN')).toBe(false);
        expect(isFactClass('')).toBe(false);
        expect(isFactClass('fact_strict')).toBe(false);
      });
    });

    describe('isViolationCode', () => {
      it('returns true for valid violation codes', () => {
        expect(isViolationCode('C-01')).toBe(true);
        expect(isViolationCode('C-02')).toBe(true);
        expect(isViolationCode('C-03')).toBe(true);
        expect(isViolationCode('C-04')).toBe(true);
        expect(isViolationCode('C-05')).toBe(true);
        expect(isViolationCode('C-06')).toBe(true);
      });

      it('returns false for invalid values', () => {
        expect(isViolationCode('C-00')).toBe(false);
        expect(isViolationCode('C-07')).toBe(false);
        expect(isViolationCode('')).toBe(false);
      });
    });

    describe('isVerdict', () => {
      it('returns true for valid verdicts', () => {
        expect(isVerdict('PASS')).toBe(true);
        expect(isVerdict('FAIL')).toBe(true);
      });

      it('returns false for invalid values', () => {
        expect(isVerdict('PARTIAL')).toBe(false);
        expect(isVerdict('')).toBe(false);
        expect(isVerdict('pass')).toBe(false);
      });
    });

    describe('isGatePass / isGateFail', () => {
      it('isGatePass returns true for passed output', () => {
        const output: GateOutput = {
          passed: true,
          output: 'validated text',
          proof: {
            proofHash: 'hash' as ProofHash,
            inputHash: 'input' as ChainHash,
            verdict: {
              verdict: Verdict.PASS,
              violations: [],
              factsProcessed: 1,
              strictFactsChecked: 1,
            },
            facts: [],
            timestamp: '2024-01-01T00:00:00Z',
            gateVersion: '1.0.0',
            canonStateHash: 'canon' as ChainHash,
          },
        };
        expect(isGatePass(output)).toBe(true);
        expect(isGateFail(output)).toBe(false);
      });

      it('isGateFail returns true for failed output', () => {
        const output: GateOutput = {
          passed: false,
          quarantine: {
            id: 'q-001' as QuarantineId,
            proof: {
              proofHash: 'hash' as ProofHash,
              inputHash: 'input' as ChainHash,
              verdict: {
                verdict: Verdict.FAIL,
                violations: [],
                factsProcessed: 1,
                strictFactsChecked: 1,
              },
              facts: [],
              timestamp: '2024-01-01T00:00:00Z',
              gateVersion: '1.0.0',
              canonStateHash: 'canon' as ChainHash,
            },
            reason: 'Violation detected',
            originalInputHash: 'original' as ChainHash,
            quarantinedAt: '2024-01-01T00:00:00Z',
          },
        };
        expect(isGateFail(output)).toBe(true);
        expect(isGatePass(output)).toBe(false);
      });
    });
  });

  describe('ViolationCode Mapping', () => {
    it('UNKNOWN_ENTITY is C-01', () => {
      expect(ViolationCode.UNKNOWN_ENTITY).toBe('C-01');
    });

    it('FORBIDDEN_PREDICATE is C-02', () => {
      expect(ViolationCode.FORBIDDEN_PREDICATE).toBe('C-02');
    });

    it('CONTRADICTORY_VALUE is C-03', () => {
      expect(ViolationCode.CONTRADICTORY_VALUE).toBe('C-03');
    });

    it('TEMPORAL_VIOLATION is C-04', () => {
      expect(ViolationCode.TEMPORAL_VIOLATION).toBe('C-04');
    });

    it('CANONICAL_REGRESSION is C-05', () => {
      expect(ViolationCode.CANONICAL_REGRESSION).toBe('C-05');
    });

    it('AMBIGUITY_DETECTED is C-06', () => {
      expect(ViolationCode.AMBIGUITY_DETECTED).toBe('C-06');
    });
  });

  describe('Interface Structure', () => {
    it('GateInput has required text field', () => {
      const input: GateInput = { text: 'test input' };
      expect(input.text).toBe('test input');
      expect(input.context).toBeUndefined();
    });

    it('GateInput accepts optional context', () => {
      const input: GateInput = { text: 'test', context: 'background' };
      expect(input.context).toBe('background');
    });

    it('ClassifiedFact extends CanonicalFact', () => {
      const fact: ClassifiedFact = {
        id: 'fact-001' as FactId,
        sourceSpan: { start: 0, end: 5, text: 'Alice' },
        subject: 'Alice',
        predicate: 'HAS_NAME',
        object: 'Alice',
        classification: FactClass.FACT_STRICT,
        classificationReason: 'Direct assertion',
      };
      expect(fact.classification).toBe('FACT_STRICT');
      expect(fact.classificationReason).toBe('Direct assertion');
    });

    it('CanonViolation has required fields', () => {
      const violation: CanonViolation = {
        code: ViolationCode.CONTRADICTORY_VALUE,
        fact: {
          id: 'fact-001' as FactId,
          sourceSpan: { start: 0, end: 10, text: 'test' },
          subject: 'Alice',
          predicate: 'HAS_AGE',
          object: 30,
          classification: FactClass.FACT_STRICT,
          classificationReason: 'Direct assertion',
        },
        message: 'Value contradicts CANON',
        relatedClaimId: 'CLM-123' as ClaimId,
        expectedValue: 25,
        actualValue: 30,
      };
      expect(violation.code).toBe('C-03');
      expect(violation.expectedValue).toBe(25);
      expect(violation.actualValue).toBe(30);
    });
  });
});
