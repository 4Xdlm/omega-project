/**
 * OMEGA Truth Gate Quarantine Tests v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * Tests F7-INV-01 to F7-INV-03
 */

import { describe, it, expect } from 'vitest';
import {
  createQuarantineResult,
  generateQuarantineId,
  validateQuarantineResult,
  isQuarantined,
  getQuarantineViolationCodes,
  getQuarantineViolationCount,
  summarizeQuarantine,
  canResolveQuarantine,
  buildQuarantineReason,
} from '../../src/gates/quarantine';
import { createProofManifest } from '../../src/gates/proof-manifest';
import { createVerdictResult } from '../../src/gates/verdict-engine';
import { createFact } from '../../src/gates/fact-extractor';
import { classifyFact } from '../../src/gates/fact-classifier';
import { createViolation } from '../../src/gates/canon-matcher';
import { Verdict, ViolationCode } from '../../src/gates/types';
import type { ChainHash } from '../../src/canon';
import type { ProofManifest, VerdictResult, ClassifiedFact, QuarantineResult } from '../../src/gates/types';

// Test helpers
const TEST_CANON_HASH = 'canon123456789abcdef' as ChainHash;
const TEST_INPUT_HASH = 'input123456789abcdef' as ChainHash;
const TEST_INPUT = 'Test input text';

function createTestFact(): ClassifiedFact {
  return classifyFact(createFact('Alice', 'HAS_NAME', 'Smith', 'Alice is Smith'));
}

function createTestViolation(code: string = ViolationCode.CONTRADICTORY_VALUE) {
  return createViolation(code as any, createTestFact(), `Test violation: ${code}`);
}

function createFailVerdict(violationCount: number = 1): VerdictResult {
  const violations = Array.from({ length: violationCount }, () => createTestViolation());
  return createVerdictResult(violations, [createTestFact()]);
}

function createPassVerdict(): VerdictResult {
  return createVerdictResult([], [createTestFact()]);
}

function createFailProof(violationCount: number = 1): ProofManifest {
  return createProofManifest(
    TEST_INPUT,
    createFailVerdict(violationCount),
    [createTestFact()],
    TEST_CANON_HASH
  );
}

function createPassProof(): ProofManifest {
  return createProofManifest(
    TEST_INPUT,
    createPassVerdict(),
    [createTestFact()],
    TEST_CANON_HASH
  );
}

describe('Quarantine — Phase F', () => {
  describe('F7-INV-01: No output text on FAIL', () => {
    it('quarantine result does not contain original text', () => {
      const proof = createFailProof();
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);

      // Result should not have the original text, only its hash
      expect(result.originalInputHash).toBe(TEST_INPUT_HASH);
      expect((result as any).originalText).toBeUndefined();
      expect((result as any).text).toBeUndefined();
      expect((result as any).output).toBeUndefined();
    });

    it('isQuarantined always returns true for quarantine result', () => {
      const proof = createFailProof();
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);

      expect(isQuarantined(result)).toBe(true);
    });

    it('quarantine stores only hash, not content', () => {
      const proof = createFailProof();
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);

      // Check that the result only stores hashes
      expect(typeof result.originalInputHash).toBe('string');
      expect(result.proof.inputHash).toBeDefined();
      expect(JSON.stringify(result)).not.toContain(TEST_INPUT);
    });
  });

  describe('F7-INV-02: All violations recorded', () => {
    it('proof manifest contains all violations', () => {
      const proof = createFailProof(3);
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);

      expect(result.proof.verdict.violations).toHaveLength(3);
    });

    it('violations are accessible from quarantine result', () => {
      const violations = [
        createTestViolation(ViolationCode.CONTRADICTORY_VALUE),
        createTestViolation(ViolationCode.FORBIDDEN_PREDICATE),
      ];
      const verdict = createVerdictResult(violations, [createTestFact()]);
      const proof = createProofManifest(TEST_INPUT, verdict, [], TEST_CANON_HASH);
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);

      expect(getQuarantineViolationCount(result)).toBe(2);
      expect(getQuarantineViolationCodes(result)).toContain(ViolationCode.CONTRADICTORY_VALUE);
      expect(getQuarantineViolationCodes(result)).toContain(ViolationCode.FORBIDDEN_PREDICATE);
    });

    it('cannot quarantine with no violations', () => {
      const verdict = createVerdictResult([], [createTestFact()]);
      // Manually create a FAIL verdict with no violations (invalid state)
      const badVerdict = { ...verdict, verdict: Verdict.FAIL, violations: [] };
      const proof = createProofManifest(TEST_INPUT, badVerdict as any, [], TEST_CANON_HASH);

      expect(() => createQuarantineResult(proof, TEST_INPUT_HASH)).toThrow();
    });
  });

  describe('F7-INV-03: Proof manifest required', () => {
    it('throws if proof is null', () => {
      expect(() => createQuarantineResult(null as any, TEST_INPUT_HASH)).toThrow('INV-F7-03');
    });

    it('throws if proof is undefined', () => {
      expect(() => createQuarantineResult(undefined as any, TEST_INPUT_HASH)).toThrow('INV-F7-03');
    });

    it('quarantine result contains proof', () => {
      const proof = createFailProof();
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);

      expect(result.proof).toBeDefined();
      expect(result.proof.proofHash).toBe(proof.proofHash);
    });

    it('validateQuarantineResult returns false if no proof', () => {
      const result = { id: 'Q-test', originalInputHash: TEST_INPUT_HASH } as any;
      expect(validateQuarantineResult(result)).toBe(false);
    });
  });

  describe('generateQuarantineId', () => {
    it('generates deterministic ID', () => {
      const proof = createFailProof();
      const id1 = generateQuarantineId(proof);
      const id2 = generateQuarantineId(proof);

      expect(id1).toBe(id2);
    });

    it('different proofs generate different IDs', () => {
      const proof1 = createFailProof(1);
      const proof2 = createProofManifest(
        'Different input',
        createFailVerdict(1),
        [],
        TEST_CANON_HASH
      );

      const id1 = generateQuarantineId(proof1);
      const id2 = generateQuarantineId(proof2);

      expect(id1).not.toBe(id2);
    });

    it('ID starts with Q- prefix', () => {
      const proof = createFailProof();
      const id = generateQuarantineId(proof);

      expect(id.startsWith('Q-')).toBe(true);
    });

    it('ID is 18 characters (Q- + 16 hex)', () => {
      const proof = createFailProof();
      const id = generateQuarantineId(proof);

      expect(id.length).toBe(18);
    });
  });

  describe('createQuarantineResult', () => {
    it('creates valid quarantine result', () => {
      const proof = createFailProof();
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);

      expect(result.id).toBeDefined();
      expect(result.proof).toBeDefined();
      expect(result.reason).toBeDefined();
      expect(result.originalInputHash).toBe(TEST_INPUT_HASH);
      expect(result.quarantinedAt).toBeDefined();
    });

    it('throws for PASS verdict', () => {
      const proof = createPassProof();

      expect(() => createQuarantineResult(proof, TEST_INPUT_HASH)).toThrow('PASS');
    });

    it('uses provided timestamp', () => {
      const proof = createFailProof();
      const timestamp = '2024-01-01T00:00:00Z';
      const result = createQuarantineResult(proof, TEST_INPUT_HASH, timestamp);

      expect(result.quarantinedAt).toBe(timestamp);
    });

    it('generates timestamp if not provided', () => {
      const proof = createFailProof();
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);

      expect(result.quarantinedAt).toBeDefined();
      expect(new Date(result.quarantinedAt).getTime()).not.toBeNaN();
    });

    it('result is frozen', () => {
      const proof = createFailProof();
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);

      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('buildQuarantineReason', () => {
    it('builds reason for single violation', () => {
      const proof = createFailProof(1);
      const reason = buildQuarantineReason(proof);

      expect(reason).toContain('Violation');
      expect(reason).toContain(ViolationCode.CONTRADICTORY_VALUE);
    });

    it('builds reason for multiple violations', () => {
      const violations = [
        createTestViolation(ViolationCode.CONTRADICTORY_VALUE),
        createTestViolation(ViolationCode.FORBIDDEN_PREDICATE),
        createTestViolation(ViolationCode.UNKNOWN_ENTITY),
      ];
      const verdict = createVerdictResult(violations, []);
      const proof = createProofManifest(TEST_INPUT, verdict, [], TEST_CANON_HASH);
      const reason = buildQuarantineReason(proof);

      expect(reason).toContain('3 violations');
    });
  });

  describe('validateQuarantineResult', () => {
    it('returns true for valid result', () => {
      const proof = createFailProof();
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);

      expect(validateQuarantineResult(result)).toBe(true);
    });

    it('returns false for missing id', () => {
      const proof = createFailProof();
      const result = { ...createQuarantineResult(proof, TEST_INPUT_HASH), id: undefined };

      expect(validateQuarantineResult(result as any)).toBe(false);
    });

    it('returns false for PASS verdict in proof', () => {
      const proof = createPassProof();
      const fakeResult = {
        id: 'Q-fake',
        proof,
        reason: 'Fake',
        originalInputHash: TEST_INPUT_HASH,
        quarantinedAt: new Date().toISOString(),
      };

      expect(validateQuarantineResult(fakeResult as any)).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('getQuarantineViolationCodes returns unique codes', () => {
      const violations = [
        createTestViolation(ViolationCode.CONTRADICTORY_VALUE),
        createTestViolation(ViolationCode.CONTRADICTORY_VALUE),
        createTestViolation(ViolationCode.FORBIDDEN_PREDICATE),
      ];
      const verdict = createVerdictResult(violations, []);
      const proof = createProofManifest(TEST_INPUT, verdict, [], TEST_CANON_HASH);
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);

      const codes = getQuarantineViolationCodes(result);
      expect(codes).toHaveLength(2);
    });

    it('summarizeQuarantine includes key info', () => {
      const proof = createFailProof(2);
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);
      const summary = summarizeQuarantine(result);

      expect(summary).toContain('Quarantine Result');
      expect(summary).toContain(result.id);
      expect(summary).toContain('Violations: 2');
    });

    it('canResolveQuarantine returns false', () => {
      const proof = createFailProof();
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);

      expect(canResolveQuarantine(result)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles many violations', () => {
      const proof = createFailProof(100);
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);

      expect(getQuarantineViolationCount(result)).toBe(100);
      expect(validateQuarantineResult(result)).toBe(true);
    });

    it('handles mixed violation codes', () => {
      const violations = Object.values(ViolationCode).map(code =>
        createTestViolation(code)
      );
      const verdict = createVerdictResult(violations, []);
      const proof = createProofManifest(TEST_INPUT, verdict, [], TEST_CANON_HASH);
      const result = createQuarantineResult(proof, TEST_INPUT_HASH);

      expect(getQuarantineViolationCodes(result)).toHaveLength(6); // All 6 codes
    });
  });
});
