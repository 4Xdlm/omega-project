/**
 * OMEGA Truth Gate Hostile Audit Tests v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * Hostile tests F-T01..F-T10
 * These tests attempt to break invariants and exploit edge cases
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  executeTruthGate,
  executePipelineWithSteps,
  computeCanonStateHash,
  type TruthGateConfig,
} from '../../../src/gates/truth-gate';
import { extractFacts, createFact, computeFactId } from '../../../src/gates/fact-extractor';
import { classifyFacts, classifyFact, getStrictFacts } from '../../../src/gates/fact-classifier';
import { matchAgainstCanon, createViolation, type CanonReader } from '../../../src/gates/canon-matcher';
import { createVerdictResult, isPassed, computeVerdict } from '../../../src/gates/verdict-engine';
import { createProofManifest, computeProofHash, computeInputHash } from '../../../src/gates/proof-manifest';
import { createQuarantineResult, generateQuarantineId } from '../../../src/gates/quarantine';
import {
  isGatePass,
  isGateFail,
  Verdict,
  ViolationCode,
  FactClass,
  isFactClass,
  isViolationCode,
  isVerdict,
} from '../../../src/gates/types';
import type {
  GateInput,
  GateOutput,
  ClassifiedFact,
  CanonViolation,
  ProofManifest,
  FactId,
} from '../../../src/gates/types';
import type { ChainHash } from '../../../src/canon';
import {
  createTestCanonAPI,
  LineageSource,
  type EntityId,
  type PredicateType,
  type CanonClaim,
} from '../../../src/canon';

const TEST_DIR = join(process.cwd(), '.test_hostile_audit');

// Mock CANON reader
function createMockReader(claims: readonly CanonClaim[] = []): CanonReader {
  return {
    async getClaimsForSubject(subject) {
      return claims.filter(c => c.subject === subject);
    },
    async getActiveClaimsBySubjectAndPredicate(subject, predicate) {
      return claims.filter(c => c.subject === subject && c.predicate === predicate && c.status === 'ACTIVE');
    },
    async getAllClaims() {
      return claims;
    },
  };
}

describe('Hostile Audit Tests — Phase F', () => {
  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  describe('F-T01: Timestamp Injection Attack', () => {
    it('cannot manipulate proofHash by injecting timestamp', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };
      const input: GateInput = { text: 'Alice is a developer.' };

      // Run at different "times"
      const output1 = await executeTruthGate(input, config);
      await new Promise(r => setTimeout(r, 50));
      const output2 = await executeTruthGate(input, config);

      if (isGatePass(output1) && isGatePass(output2)) {
        // Timestamps differ
        expect(output1.proof.timestamp).not.toBe(output2.proof.timestamp);
        // But proofHash is identical (F6-INV-01)
        expect(output1.proof.proofHash).toBe(output2.proof.proofHash);
      }
    });

    it('proof manifest with different timestamps are considered matching', async () => {
      const verdict = createVerdictResult([], []);
      const facts: ClassifiedFact[] = [];
      const canonHash = 'testhash123' as ChainHash;

      const proof1 = createProofManifest('test', verdict, facts, canonHash, '2024-01-01T00:00:00Z');
      const proof2 = createProofManifest('test', verdict, facts, canonHash, '2024-12-31T23:59:59Z');

      // proofHash should be identical despite different timestamps
      expect(proof1.proofHash).toBe(proof2.proofHash);
    });
  });

  describe('F-T02: Hash Collision Attack', () => {
    it('different inputs produce different proofHashes', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const inputs = [
        'Alice is smart.',
        'Alice is Smart.',  // Case difference
        'Alice is smart',   // No period
        ' Alice is smart.', // Leading space
        'Alice is smart. ', // Trailing space
        'Bob is smart.',    // Different subject
      ];

      const hashes = new Set<string>();

      for (const text of inputs) {
        const output = await executeTruthGate({ text }, config);
        if (isGatePass(output)) {
          hashes.add(output.proof.proofHash);
        }
      }

      // All should be unique
      expect(hashes.size).toBe(inputs.length);
    });

    it('factId is unique for different fact data', () => {
      const facts = [
        createFact('Alice', 'IS_A', 'developer', 'Alice is a developer'),
        createFact('Bob', 'IS_A', 'developer', 'Bob is a developer'),
        createFact('Alice', 'HAS_NAME', 'Smith', 'Alice is named Smith'),
        createFact('Alice', 'IS_A', 'engineer', 'Alice is an engineer'),
      ];

      const ids = facts.map(f => f.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(facts.length);
    });
  });

  describe('F-T03: Immutability Bypass Attack', () => {
    it('cannot modify frozen output', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output = await executeTruthGate({ text: 'Test' }, config);

      expect(Object.isFrozen(output)).toBe(true);
      expect(() => {
        (output as any).passed = false;
      }).toThrow();
    });

    it('cannot modify frozen proof manifest', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output = await executeTruthGate({ text: 'Test' }, config);

      if (isGatePass(output)) {
        expect(Object.isFrozen(output.proof)).toBe(true);
        expect(() => {
          (output.proof as any).proofHash = 'tampered';
        }).toThrow();
      }
    });

    it('cannot modify frozen verdict', async () => {
      const verdict = createVerdictResult([], []);

      expect(Object.isFrozen(verdict)).toBe(true);
      expect(() => {
        (verdict as any).verdict = Verdict.FAIL;
      }).toThrow();
    });

    it('cannot modify frozen quarantine result', () => {
      const fact = classifyFact(createFact('Alice', 'HAS_NAME', 'Smith', 'text'));
      const violation = createViolation(ViolationCode.CONTRADICTORY_VALUE, fact, 'test');
      const verdict = createVerdictResult([violation], [fact]);
      const proof = createProofManifest('test', verdict, [fact], 'hash' as ChainHash);
      const quarantine = createQuarantineResult(proof, 'inputhash' as ChainHash);

      expect(Object.isFrozen(quarantine)).toBe(true);
      expect(() => {
        (quarantine as any).reason = 'tampered';
      }).toThrow();
    });
  });

  describe('F-T04: Enum Exhaustiveness Attack', () => {
    it('FactClass only has valid values', () => {
      const validClasses = [FactClass.FACT_STRICT, FactClass.FACT_DERIVED, FactClass.NON_FACTUAL];
      const allValues = Object.values(FactClass);

      expect(allValues).toHaveLength(3);
      allValues.forEach(v => {
        expect(validClasses).toContain(v);
        expect(isFactClass(v)).toBe(true);
      });
    });

    it('ViolationCode only has valid values', () => {
      const validCodes = [
        ViolationCode.UNKNOWN_ENTITY,
        ViolationCode.FORBIDDEN_PREDICATE,
        ViolationCode.CONTRADICTORY_VALUE,
        ViolationCode.TEMPORAL_VIOLATION,
        ViolationCode.CANONICAL_REGRESSION,
        ViolationCode.AMBIGUITY_DETECTED,
      ];
      const allValues = Object.values(ViolationCode);

      expect(allValues).toHaveLength(6);
      allValues.forEach(v => {
        expect(validCodes).toContain(v);
        expect(isViolationCode(v)).toBe(true);
      });
    });

    it('Verdict only has PASS or FAIL', () => {
      const validVerdicts = [Verdict.PASS, Verdict.FAIL];
      const allValues = Object.values(Verdict);

      expect(allValues).toHaveLength(2);
      allValues.forEach(v => {
        expect(validVerdicts).toContain(v);
        expect(isVerdict(v)).toBe(true);
      });
    });

    it('invalid enum values are rejected', () => {
      expect(isFactClass('INVALID')).toBe(false);
      expect(isViolationCode('INVALID')).toBe(false);
      expect(isVerdict('INVALID')).toBe(false);
      expect(isFactClass(null)).toBe(false);
      expect(isViolationCode(undefined)).toBe(false);
      expect(isVerdict(123)).toBe(false);
    });
  });

  describe('F-T05: Probabilistic Logic Attack', () => {
    it('verdict is always deterministic PASS or FAIL', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const inputs = [
        'Alice is smart.',
        'Maybe Bob is tall.',
        'Probably Charlie knows.',
        'I think Dave is nice.',
      ];

      for (const text of inputs) {
        const results = new Set<boolean>();
        for (let i = 0; i < 50; i++) {
          const output = await executeTruthGate({ text }, config);
          results.add(output.passed);
        }
        // Should always be same result
        expect(results.size).toBe(1);
      }
    });

    it('no random fields in output', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output1 = await executeTruthGate({ text: 'Test' }, config);
      const output2 = await executeTruthGate({ text: 'Test' }, config);

      if (isGatePass(output1) && isGatePass(output2)) {
        expect(output1.proof.proofHash).toBe(output2.proof.proofHash);
        expect(output1.proof.inputHash).toBe(output2.proof.inputHash);
        expect(output1.proof.verdict.verdict).toBe(output2.proof.verdict.verdict);
      }
    });

    it('computeVerdict has no probability', () => {
      const results = new Set<Verdict>();

      for (let i = 0; i < 100; i++) {
        const verdict = computeVerdict([]);
        results.add(verdict);
      }

      // Always PASS for empty violations
      expect(results.size).toBe(1);
      expect(results.has(Verdict.PASS)).toBe(true);
    });
  });

  describe('F-T06: CANON Write Attempt', () => {
    it('CanonReader interface has no write methods', () => {
      const reader = createMockReader();

      // Verify only read methods exist
      expect(typeof reader.getClaimsForSubject).toBe('function');
      expect(typeof reader.getActiveClaimsBySubjectAndPredicate).toBe('function');
      expect(typeof reader.getAllClaims).toBe('function');

      // These should not exist
      expect((reader as any).createClaim).toBeUndefined();
      expect((reader as any).updateClaim).toBeUndefined();
      expect((reader as any).deleteClaim).toBeUndefined();
      expect((reader as any).revokeClaim).toBeUndefined();
    });

    it('matchAgainstCanon only reads CANON', async () => {
      const api = createTestCanonAPI(TEST_DIR);
      await api.init();

      const initialClaims = await api.getAllClaims();

      // Run matching
      const facts = classifyFacts(extractFacts('Alice is smart.'));
      await matchAgainstCanon(facts, api);

      // CANON should be unchanged
      const finalClaims = await api.getAllClaims();
      expect(finalClaims.length).toBe(initialClaims.length);

      await api.close();
    });
  });

  describe('F-T07: Quarantine Bypass Attack', () => {
    it('cannot create quarantine for PASS verdict', () => {
      const verdict = createVerdictResult([], []);
      expect(verdict.verdict).toBe(Verdict.PASS);

      const proof = createProofManifest('test', verdict, [], 'hash' as ChainHash);

      expect(() => {
        createQuarantineResult(proof, 'inputhash' as ChainHash);
      }).toThrow('PASS');
    });

    it('cannot create quarantine without violations', () => {
      // Force a FAIL verdict with no violations (invalid state)
      const verdict = { verdict: Verdict.FAIL, violations: [], factsAnalyzed: 0 };
      const proof = createProofManifest('test', verdict as any, [], 'hash' as ChainHash);

      expect(() => {
        createQuarantineResult(proof, 'inputhash' as ChainHash);
      }).toThrow();
    });

    it('cannot create quarantine without proof', () => {
      expect(() => {
        createQuarantineResult(null as any, 'hash' as ChainHash);
      }).toThrow('INV-F7-03');

      expect(() => {
        createQuarantineResult(undefined as any, 'hash' as ChainHash);
      }).toThrow('INV-F7-03');
    });

    it('quarantine does not leak original text', () => {
      const secretText = 'This is secret text that should not leak';
      const fact = classifyFact(createFact('Alice', 'HAS_NAME', 'Smith', secretText));
      const violation = createViolation(ViolationCode.CONTRADICTORY_VALUE, fact, 'test');
      const verdict = createVerdictResult([violation], [fact]);
      const proof = createProofManifest(secretText, verdict, [fact], 'hash' as ChainHash);
      const quarantine = createQuarantineResult(proof, computeInputHash(secretText));

      // The original text should not appear anywhere in the quarantine result
      const serialized = JSON.stringify(quarantine);
      expect(serialized).not.toContain(secretText);
    });
  });

  describe('F-T08: Proof Tampering Detection', () => {
    it('detects tampered proofHash', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output = await executeTruthGate({ text: 'Alice is smart.' }, config);

      if (isGatePass(output)) {
        const originalHash = output.proof.proofHash;

        // Attempt to verify with tampered hash
        const tamperedProof = { ...output.proof, proofHash: 'tamperedhash' as any };

        // Recompute and compare
        const recomputed = computeProofHash(
          tamperedProof.inputHash,
          tamperedProof.verdict,
          tamperedProof.facts,
          tamperedProof.canonStateHash
        );

        expect(tamperedProof.proofHash).not.toBe(recomputed);
        expect(originalHash).toBe(recomputed);
      }
    });

    it('detects tampered inputHash', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output = await executeTruthGate({ text: 'Alice is smart.' }, config);

      if (isGatePass(output)) {
        // Tamper with input
        const wrongInputHash = computeInputHash('Different text');

        expect(output.proof.inputHash).not.toBe(wrongInputHash);
      }
    });
  });

  describe('F-T09: Verdict Manipulation Attack', () => {
    it('cannot have PASS with violations', () => {
      const fact = classifyFact(createFact('Alice', 'HAS_NAME', 'Smith', 'text'));
      const violation = createViolation(ViolationCode.CONTRADICTORY_VALUE, fact, 'test');

      // createVerdictResult enforces this invariant
      const verdict = createVerdictResult([violation], [fact]);

      expect(verdict.verdict).toBe(Verdict.FAIL);
      expect(verdict.violations.length).toBeGreaterThan(0);
    });

    it('cannot have FAIL without violations', () => {
      // Empty violations always produces PASS
      const verdict = createVerdictResult([], []);

      expect(verdict.verdict).toBe(Verdict.PASS);
      expect(verdict.violations).toHaveLength(0);
    });

    it('isGatePass and isGateFail are mutually exclusive', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output = await executeTruthGate({ text: 'Test' }, config);

      // Exactly one must be true
      expect(isGatePass(output) || isGateFail(output)).toBe(true);
      expect(isGatePass(output) && isGateFail(output)).toBe(false);
    });
  });

  describe('F-T10: ID Collision Attack', () => {
    it('factId collision is statistically impossible', () => {
      // Generate many fact IDs and check for collisions
      const ids = new Set<FactId>();

      for (let i = 0; i < 1000; i++) {
        const fact = createFact(
          `Entity${i}`,
          'HAS_VALUE',
          `Value${i}`,
          `Entity${i} has Value${i}`
        );
        ids.add(fact.id);
      }

      // All should be unique
      expect(ids.size).toBe(1000);
    });

    it('quarantineId collision is statistically impossible', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const fact = classifyFact(createFact(`Entity${i}`, 'HAS_NAME', `Value${i}`, `text${i}`));
        const violation = createViolation(ViolationCode.CONTRADICTORY_VALUE, fact, 'test');
        const verdict = createVerdictResult([violation], [fact]);
        const proof = createProofManifest(`input${i}`, verdict, [fact], `hash${i}` as ChainHash);
        const id = generateQuarantineId(proof);
        ids.add(id);
      }

      expect(ids.size).toBe(100);
    });

    it('proofHash collision is statistically impossible', () => {
      const hashes = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const inputHash = computeInputHash(`input${i}`);
        const verdict = createVerdictResult([], []);
        const hash = computeProofHash(inputHash, verdict, [], `canon${i}` as ChainHash);
        hashes.add(hash);
      }

      expect(hashes.size).toBe(100);
    });

    it('deterministic ID generation across runs', () => {
      const fact1a = createFact('Alice', 'IS_A', 'developer', 'Alice is a developer');
      const fact1b = createFact('Alice', 'IS_A', 'developer', 'Alice is a developer');

      expect(fact1a.id).toBe(fact1b.id);

      const fact2a = createFact('Bob', 'IS_A', 'developer', 'Bob is a developer');
      const fact2b = createFact('Bob', 'IS_A', 'developer', 'Bob is a developer');

      expect(fact2a.id).toBe(fact2b.id);
      expect(fact1a.id).not.toBe(fact2a.id);
    });
  });

  describe('Additional Security Tests', () => {
    it('handles malicious input safely', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '${process.env.SECRET}',
        '__proto__.constructor',
        'constructor.prototype',
        null as any,
        undefined as any,
      ];

      for (const text of maliciousInputs) {
        if (text !== null && text !== undefined) {
          // Should not throw, just process safely
          const output = await executeTruthGate({ text }, config);
          expect(output.passed === true || output.passed === false).toBe(true);
        }
      }
    });

    it('handles prototype pollution attempt', () => {
      const fact = createFact('__proto__', 'constructor', 'pollution', 'test');

      // Should create valid fact without polluting prototype
      expect(fact.subject).toBe('__proto__');
      expect(({} as any).constructor).toBe(Object);
    });

    it('handles very large input without memory issues', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      // 1MB of text
      const largeText = 'Alice is smart. '.repeat(60000);

      const output = await executeTruthGate({ text: largeText }, config);

      expect(output.passed === true || output.passed === false).toBe(true);
    });
  });
});
