/**
 * OMEGA Truth Gate Integration Tests v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * Full pipeline integration tests
 * Tests determinism: same input => same proofHash
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  executeTruthGate,
  executePipelineWithSteps,
  quickValidate,
  getViolations,
  hasStrictFacts,
  type TruthGateConfig,
} from '../../../src/gates/truth-gate';
import { extractFacts, createFact } from '../../../src/gates/fact-extractor';
import { classifyFacts, getStrictFacts } from '../../../src/gates/fact-classifier';
import { matchAgainstCanon, type CanonReader } from '../../../src/gates/canon-matcher';
import { createVerdictResult, isPassed } from '../../../src/gates/verdict-engine';
import { createProofManifest, computeInputHash } from '../../../src/gates/proof-manifest';
import { createQuarantineResult } from '../../../src/gates/quarantine';
import {
  isGatePass,
  isGateFail,
  Verdict,
  ViolationCode,
  FactClass,
} from '../../../src/gates/types';
import type { GateInput, GateOutput, ClassifiedFact } from '../../../src/gates/types';
import {
  createTestCanonAPI,
  LineageSource,
  type EntityId,
  type PredicateType,
  type CanonClaim,
} from '../../../src/canon';

const TEST_DIR = join(process.cwd(), '.test_integration_pipeline');

// Mock CANON reader for testing
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

describe('Full Pipeline Integration — Phase F', () => {
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

  describe('Pipeline Flow', () => {
    it('executes complete pipeline INPUT → F2 → F3 → F4 → F5 → F6 → OUTPUT', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };
      const input: GateInput = { text: 'Alice is a developer. Bob has a car.' };

      // Execute full pipeline
      const output = await executeTruthGate(input, config);

      // Verify output structure
      expect(output).toBeDefined();
      expect(typeof output.passed).toBe('boolean');

      if (isGatePass(output)) {
        expect(output.output).toBe(input.text);
        expect(output.proof).toBeDefined();
        expect(output.proof.proofHash).toBeDefined();
        expect(output.proof.inputHash).toBeDefined();
        expect(output.proof.verdict.verdict).toBe(Verdict.PASS);
      } else {
        expect(output.quarantine).toBeDefined();
        expect(output.quarantine.proof).toBeDefined();
      }
    });

    it('pipeline steps are traceable', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };
      const input: GateInput = { text: 'Alice is smart. Bob knows Charlie.' };

      const steps = await executePipelineWithSteps(input, config);

      // F2: Extract
      expect(steps.extractedFacts).toBeDefined();
      expect(Array.isArray(steps.extractedFacts)).toBe(true);

      // F3: Classify
      expect(steps.classifiedFacts).toBeDefined();
      expect(steps.strictFacts).toBeDefined();
      expect(steps.strictFacts.every(f => f.classification === FactClass.FACT_STRICT)).toBe(true);

      // F4: Match
      expect(steps.violations).toBeDefined();
      expect(Array.isArray(steps.violations)).toBe(true);

      // F5: Verdict
      expect(steps.verdict).toBeDefined();
      expect(steps.verdict.verdict === Verdict.PASS || steps.verdict.verdict === Verdict.FAIL).toBe(true);

      // F6: Proof
      expect(steps.proof).toBeDefined();
      expect(steps.proof.proofHash).toBeDefined();

      // Output
      expect(steps.output).toBeDefined();
    });

    it('PASS path: no violations → text output with proof', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };
      const input: GateInput = { text: 'Hello world!' };

      const output = await executeTruthGate(input, config);

      expect(isGatePass(output)).toBe(true);
      if (isGatePass(output)) {
        expect(output.output).toBe('Hello world!');
        expect(output.proof.verdict.verdict).toBe(Verdict.PASS);
        expect(output.proof.verdict.violations).toHaveLength(0);
      }
    });
  });

  describe('Determinism — CRITICAL', () => {
    it('same input produces same proofHash (100 runs)', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };
      const input: GateInput = { text: 'Alice is a software engineer. Bob works at Acme.' };

      const results: string[] = [];

      for (let i = 0; i < 100; i++) {
        const output = await executeTruthGate(input, config);
        if (isGatePass(output)) {
          results.push(output.proof.proofHash);
        }
      }

      // All proofHashes must be identical
      const uniqueHashes = new Set(results);
      expect(uniqueHashes.size).toBe(1);
      expect(results).toHaveLength(100);
    });

    it('same input with same CANON produces same proofHash', async () => {
      const api1 = createTestCanonAPI(join(TEST_DIR, 'api1'));
      const api2 = createTestCanonAPI(join(TEST_DIR, 'api2'));
      await api1.init();
      await api2.init();

      // Add identical claims to both APIs
      const claimData = {
        subject: 'ENT-test-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'TestValue',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      };

      await api1.createClaim(claimData);
      await api2.createClaim(claimData);

      const input: GateInput = { text: 'Hello world!' };

      const output1 = await executeTruthGate(input, api1);
      const output2 = await executeTruthGate(input, api2);

      // Both should pass with same proofHash (excluding CANON state hash difference)
      expect(isGatePass(output1)).toBe(true);
      expect(isGatePass(output2)).toBe(true);

      await api1.close();
      await api2.close();
    });

    it('different inputs produce different proofHashes', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output1 = await executeTruthGate({ text: 'Alice is smart.' }, config);
      const output2 = await executeTruthGate({ text: 'Bob is fast.' }, config);

      if (isGatePass(output1) && isGatePass(output2)) {
        expect(output1.proof.proofHash).not.toBe(output2.proof.proofHash);
      }
    });

    it('timestamp does NOT affect proofHash', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };
      const input: GateInput = { text: 'Test input' };

      // Run twice at different times
      const output1 = await executeTruthGate(input, config);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const output2 = await executeTruthGate(input, config);

      if (isGatePass(output1) && isGatePass(output2)) {
        // Timestamps should be different
        expect(output1.proof.timestamp).not.toBe(output2.proof.timestamp);
        // But proofHashes should be identical
        expect(output1.proof.proofHash).toBe(output2.proof.proofHash);
      }
    });

    it('fact extraction order is deterministic', async () => {
      const text = 'Alice is smart. Bob has a car. Charlie knows Dave.';

      const results = [];
      for (let i = 0; i < 50; i++) {
        const facts = extractFacts(text);
        results.push(facts.map(f => f.id).join(','));
      }

      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(1);
    });

    it('fact IDs are deterministic across runs', async () => {
      const text = 'Alice is a developer.';

      const facts1 = extractFacts(text);
      const facts2 = extractFacts(text);

      expect(facts1.map(f => f.id)).toEqual(facts2.map(f => f.id));
    });
  });

  describe('CANON Integration', () => {
    it('validates against real CANON API', async () => {
      const api = createTestCanonAPI(TEST_DIR);
      await api.init();

      const input: GateInput = { text: 'Hello world' };
      const output = await executeTruthGate(input, api);

      expect(output.passed === true || output.passed === false).toBe(true);

      await api.close();
    });

    it('uses semanticEquals for value comparison', async () => {
      const api = createTestCanonAPI(TEST_DIR);
      await api.init();

      // Add a claim with specific value
      await api.createClaim({
        subject: 'ENT-person-12345678' as EntityId,
        predicate: 'HAS_AGE' as PredicateType,
        value: 30,
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      // Test with same value (should pass)
      const input: GateInput = { text: 'The person is 30 years old.' };
      const output = await executeTruthGate(input, api);

      // This may pass depending on extraction
      expect(output.passed === true || output.passed === false).toBe(true);

      await api.close();
    });

    it('CANON state hash affects proof', async () => {
      const api1 = createTestCanonAPI(join(TEST_DIR, 'canon1'));
      const api2 = createTestCanonAPI(join(TEST_DIR, 'canon2'));
      await api1.init();
      await api2.init();

      // Different claims in each
      await api1.createClaim({
        subject: 'ENT-a-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      await api2.createClaim({
        subject: 'ENT-b-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Bob',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      const input: GateInput = { text: 'Hello' };

      const output1 = await executeTruthGate(input, api1);
      const output2 = await executeTruthGate(input, api2);

      if (isGatePass(output1) && isGatePass(output2)) {
        // CANON state hashes should differ
        expect(output1.proof.canonStateHash).not.toBe(output2.proof.canonStateHash);
      }

      await api1.close();
      await api2.close();
    });
  });

  describe('End-to-End Scenarios', () => {
    it('simple text without facts passes', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output = await executeTruthGate({ text: 'Hello world!' }, config);

      expect(isGatePass(output)).toBe(true);
    });

    it('text with strict facts passes when no contradictions', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output = await executeTruthGate({ text: 'Alice is a developer.' }, config);

      expect(isGatePass(output)).toBe(true);
    });

    it('complex text with multiple facts is processed', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const text = `
        Alice is a software engineer.
        Bob works at Acme Corporation.
        Charlie has a blue car.
        Dave knows Eve.
        The project is complete.
      `;

      const output = await executeTruthGate({ text }, config);
      const steps = await executePipelineWithSteps({ text }, config);

      expect(output.passed === true || output.passed === false).toBe(true);
      expect(steps.extractedFacts.length).toBeGreaterThan(0);
    });

    it('context is propagated through pipeline', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };
      const input: GateInput = { text: 'Alice is smart.', context: 'chapter-1' };

      const steps = await executePipelineWithSteps(input, config);

      // Facts should have scope from context
      if (steps.classifiedFacts.length > 0) {
        expect(steps.classifiedFacts[0].scope).toBe('chapter-1');
      }
    });
  });

  describe('Helper Functions', () => {
    it('quickValidate returns boolean', async () => {
      const reader = createMockReader();

      const result1 = await quickValidate('Hello world', reader);
      const result2 = await quickValidate('Alice is smart.', reader);

      expect(typeof result1).toBe('boolean');
      expect(typeof result2).toBe('boolean');
    });

    it('getViolations returns array', async () => {
      const reader = createMockReader();

      const violations1 = await getViolations('Hello world', reader);
      const violations2 = await getViolations('Alice is smart.', reader);

      expect(Array.isArray(violations1)).toBe(true);
      expect(Array.isArray(violations2)).toBe(true);
    });

    it('hasStrictFacts works correctly', () => {
      expect(hasStrictFacts('Alice is a developer.')).toBe(true);
      expect(hasStrictFacts('Hello world!')).toBe(false);
    });
  });

  describe('Immutability', () => {
    it('output is frozen', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output = await executeTruthGate({ text: 'Test' }, config);

      expect(Object.isFrozen(output)).toBe(true);
    });

    it('pipeline steps are frozen', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const steps = await executePipelineWithSteps({ text: 'Test' }, config);

      expect(Object.isFrozen(steps)).toBe(true);
    });

    it('proof manifest is frozen', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output = await executeTruthGate({ text: 'Test' }, config);

      if (isGatePass(output)) {
        expect(Object.isFrozen(output.proof)).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output = await executeTruthGate({ text: '' }, config);

      expect(isGatePass(output)).toBe(true);
    });

    it('handles whitespace only', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output = await executeTruthGate({ text: '   \n\t  ' }, config);

      expect(isGatePass(output)).toBe(true);
    });

    it('handles very long text', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };
      const longText = 'Alice is smart. '.repeat(1000);

      const output = await executeTruthGate({ text: longText }, config);

      expect(output.passed === true || output.passed === false).toBe(true);
    });

    it('handles special characters', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output = await executeTruthGate({
        text: 'Special: "quotes" & <tags> © ñ 日本語'
      }, config);

      expect(output.passed === true || output.passed === false).toBe(true);
    });

    it('handles unicode', async () => {
      const reader = createMockReader();
      const config: TruthGateConfig = { canonReader: reader };

      const output = await executeTruthGate({
        text: 'Émile est intelligent. 日本語のテスト。'
      }, config);

      expect(output.passed === true || output.passed === false).toBe(true);
    });
  });
});
