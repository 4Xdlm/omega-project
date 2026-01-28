/**
 * OMEGA Truth Gate Proof Manifest Tests v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * Tests F6-INV-01 to F6-INV-05
 */

import { describe, it, expect } from 'vitest';
import {
  createProofManifest,
  computeProofHash,
  computeInputHash,
  verifyProofManifest,
  manifestsMatch,
  serializeManifest,
  deserializeManifest,
  summarizeManifest,
  hasViolations,
  getViolationCount,
  GATE_VERSION,
} from '../../src/gates/proof-manifest';
import { createVerdictResult } from '../../src/gates/verdict-engine';
import { createFact } from '../../src/gates/fact-extractor';
import { classifyFact } from '../../src/gates/fact-classifier';
import { createViolation } from '../../src/gates/canon-matcher';
import { Verdict, ViolationCode } from '../../src/gates/types';
import type { ChainHash } from '../../src/canon';
import type { VerdictResult, ClassifiedFact, ProofManifest } from '../../src/gates/types';

// Test helpers
function createTestFacts(count: number): ClassifiedFact[] {
  return Array.from({ length: count }, (_, i) =>
    classifyFact(createFact(`Entity${i}`, 'HAS_NAME', `Value${i}`, `text${i}`))
  );
}

function createTestVerdictPass(): VerdictResult {
  return createVerdictResult([], createTestFacts(3));
}

function createTestVerdictFail(): VerdictResult {
  const fact = classifyFact(createFact('Alice', 'HAS_NAME', 'Smith', 'text'));
  const violation = createViolation(
    ViolationCode.CONTRADICTORY_VALUE,
    fact,
    'Test violation'
  );
  return createVerdictResult([violation], [fact]);
}

const TEST_CANON_HASH = 'abc123def456789' as ChainHash;
const TEST_INPUT = 'Alice is a developer. Bob has a car.';

describe('Proof Manifest — Phase F', () => {
  describe('F6-INV-01: proofHash does NOT include timestamp', () => {
    it('same input at different timestamps produces same proofHash', () => {
      const verdict = createTestVerdictPass();
      const facts = createTestFacts(3);

      const manifest1 = createProofManifest(
        TEST_INPUT,
        verdict,
        facts,
        TEST_CANON_HASH,
        '2024-01-01T00:00:00Z'
      );

      const manifest2 = createProofManifest(
        TEST_INPUT,
        verdict,
        facts,
        TEST_CANON_HASH,
        '2024-12-31T23:59:59Z'
      );

      expect(manifest1.proofHash).toBe(manifest2.proofHash);
      expect(manifest1.timestamp).not.toBe(manifest2.timestamp);
    });

    it('manifestsMatch returns true for different timestamps', () => {
      const verdict = createTestVerdictPass();
      const facts = createTestFacts(2);

      const manifest1 = createProofManifest(TEST_INPUT, verdict, facts, TEST_CANON_HASH, '2024-01-01T00:00:00Z');
      const manifest2 = createProofManifest(TEST_INPUT, verdict, facts, TEST_CANON_HASH, '2024-06-15T12:30:00Z');

      expect(manifestsMatch(manifest1, manifest2)).toBe(true);
    });

    it('proofHash changes with different input', () => {
      const verdict = createTestVerdictPass();
      const facts = createTestFacts(2);

      const manifest1 = createProofManifest('Input A', verdict, facts, TEST_CANON_HASH);
      const manifest2 = createProofManifest('Input B', verdict, facts, TEST_CANON_HASH);

      expect(manifest1.proofHash).not.toBe(manifest2.proofHash);
    });

    it('proofHash changes with different verdict', () => {
      const passVerdict = createTestVerdictPass();
      const failVerdict = createTestVerdictFail();
      const facts = createTestFacts(1);

      const manifest1 = createProofManifest(TEST_INPUT, passVerdict, facts, TEST_CANON_HASH);
      const manifest2 = createProofManifest(TEST_INPUT, failVerdict, facts, TEST_CANON_HASH);

      expect(manifest1.proofHash).not.toBe(manifest2.proofHash);
    });
  });

  describe('F6-INV-02: All inputs recorded', () => {
    it('manifest includes inputHash', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        createTestFacts(2),
        TEST_CANON_HASH
      );

      expect(manifest.inputHash).toBeDefined();
      expect(manifest.inputHash).toBe(computeInputHash(TEST_INPUT));
    });

    it('manifest includes verdict', () => {
      const verdict = createTestVerdictPass();
      const manifest = createProofManifest(TEST_INPUT, verdict, [], TEST_CANON_HASH);

      expect(manifest.verdict).toBeDefined();
      expect(manifest.verdict.verdict).toBe(verdict.verdict);
    });

    it('manifest includes all facts', () => {
      const facts = createTestFacts(5);
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        facts,
        TEST_CANON_HASH
      );

      expect(manifest.facts).toHaveLength(5);
      expect(manifest.facts.map(f => f.id)).toEqual(facts.map(f => f.id));
    });

    it('manifest includes canonStateHash', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        [],
        TEST_CANON_HASH
      );

      expect(manifest.canonStateHash).toBe(TEST_CANON_HASH);
    });

    it('manifest includes timestamp', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        [],
        TEST_CANON_HASH
      );

      expect(manifest.timestamp).toBeDefined();
      expect(typeof manifest.timestamp).toBe('string');
    });

    it('manifest includes gateVersion', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        [],
        TEST_CANON_HASH
      );

      expect(manifest.gateVersion).toBe(GATE_VERSION);
    });
  });

  describe('F6-INV-03: Hash is deterministic', () => {
    it('same inputs produce same proofHash', () => {
      const verdict = createTestVerdictPass();
      const facts = createTestFacts(3);
      const timestamp = '2024-01-01T00:00:00Z';

      const hash1 = computeProofHash(computeInputHash(TEST_INPUT), verdict, facts, TEST_CANON_HASH);
      const hash2 = computeProofHash(computeInputHash(TEST_INPUT), verdict, facts, TEST_CANON_HASH);

      expect(hash1).toBe(hash2);
    });

    it('deterministic across 100 runs', () => {
      const verdict = createTestVerdictPass();
      const facts = createTestFacts(5);
      const inputHash = computeInputHash(TEST_INPUT);

      const first = computeProofHash(inputHash, verdict, facts, TEST_CANON_HASH);
      for (let i = 0; i < 100; i++) {
        const hash = computeProofHash(inputHash, verdict, facts, TEST_CANON_HASH);
        expect(hash).toBe(first);
      }
    });

    it('proofHash is SHA256 hex string', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        createTestFacts(1),
        TEST_CANON_HASH
      );

      expect(manifest.proofHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('inputHash is SHA256 hex string', () => {
      const hash = computeInputHash(TEST_INPUT);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('F6-INV-04: Manifest is immutable after creation', () => {
    it('manifest object is frozen', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        createTestFacts(2),
        TEST_CANON_HASH
      );

      expect(Object.isFrozen(manifest)).toBe(true);
    });

    it('facts array is frozen', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        createTestFacts(2),
        TEST_CANON_HASH
      );

      expect(Object.isFrozen(manifest.facts)).toBe(true);
    });

    it('cannot modify manifest fields', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        [],
        TEST_CANON_HASH
      );

      expect(() => {
        (manifest as any).proofHash = 'modified';
      }).toThrow();
    });
  });

  describe('F6-INV-05: Version is tracked', () => {
    it('GATE_VERSION constant is defined', () => {
      expect(GATE_VERSION).toBeDefined();
      expect(typeof GATE_VERSION).toBe('string');
    });

    it('manifest includes gate version', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        [],
        TEST_CANON_HASH
      );

      expect(manifest.gateVersion).toBe(GATE_VERSION);
    });

    it('gate version follows semver format', () => {
      expect(GATE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('verifyProofManifest', () => {
    it('returns true for valid manifest', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        createTestFacts(2),
        TEST_CANON_HASH
      );

      expect(verifyProofManifest(manifest, TEST_INPUT)).toBe(true);
    });

    it('returns false for tampered input', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        [],
        TEST_CANON_HASH
      );

      expect(verifyProofManifest(manifest, 'Different input')).toBe(false);
    });

    it('returns false for tampered proofHash', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        [],
        TEST_CANON_HASH
      );

      const tampered = { ...manifest, proofHash: 'tamperedHash' as any };
      expect(verifyProofManifest(tampered, TEST_INPUT)).toBe(false);
    });
  });

  describe('Serialization', () => {
    it('serializeManifest produces valid JSON', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        createTestFacts(2),
        TEST_CANON_HASH
      );

      const json = serializeManifest(manifest);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('deserializeManifest restores manifest', () => {
      const original = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        createTestFacts(2),
        TEST_CANON_HASH,
        '2024-01-01T00:00:00Z'
      );

      const json = serializeManifest(original);
      const restored = deserializeManifest(json);

      expect(restored.proofHash).toBe(original.proofHash);
      expect(restored.inputHash).toBe(original.inputHash);
      expect(restored.timestamp).toBe(original.timestamp);
    });

    it('deserialized manifest is frozen', () => {
      const json = serializeManifest(createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        [],
        TEST_CANON_HASH
      ));

      const restored = deserializeManifest(json);
      expect(Object.isFrozen(restored)).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('summarizeManifest includes key information', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        createTestFacts(3),
        TEST_CANON_HASH
      );

      const summary = summarizeManifest(manifest);

      expect(summary).toContain('Proof Hash');
      expect(summary).toContain('Verdict');
      expect(summary).toContain('Facts: 3');
      expect(summary).toContain('Gate Version');
    });

    it('hasViolations returns false for PASS', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        [],
        TEST_CANON_HASH
      );

      expect(hasViolations(manifest)).toBe(false);
    });

    it('hasViolations returns true for FAIL', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictFail(),
        [],
        TEST_CANON_HASH
      );

      expect(hasViolations(manifest)).toBe(true);
    });

    it('getViolationCount returns correct count', () => {
      const passManifest = createProofManifest(TEST_INPUT, createTestVerdictPass(), [], TEST_CANON_HASH);
      const failManifest = createProofManifest(TEST_INPUT, createTestVerdictFail(), [], TEST_CANON_HASH);

      expect(getViolationCount(passManifest)).toBe(0);
      expect(getViolationCount(failManifest)).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty input text', () => {
      const manifest = createProofManifest(
        '',
        createTestVerdictPass(),
        [],
        TEST_CANON_HASH
      );

      expect(manifest.inputHash).toBeDefined();
      expect(verifyProofManifest(manifest, '')).toBe(true);
    });

    it('handles empty facts array', () => {
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        [],
        TEST_CANON_HASH
      );

      expect(manifest.facts).toHaveLength(0);
    });

    it('handles large facts array', () => {
      const facts = createTestFacts(1000);
      const manifest = createProofManifest(
        TEST_INPUT,
        createTestVerdictPass(),
        facts,
        TEST_CANON_HASH
      );

      expect(manifest.facts).toHaveLength(1000);
    });

    it('handles special characters in input', () => {
      const specialInput = 'Special: "quotes" & <tags> © ñ 日本語';
      const manifest = createProofManifest(
        specialInput,
        createTestVerdictPass(),
        [],
        TEST_CANON_HASH
      );

      expect(verifyProofManifest(manifest, specialInput)).toBe(true);
    });
  });
});
