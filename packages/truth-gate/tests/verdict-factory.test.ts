/**
 * OMEGA Truth Gate — Verdict Factory Tests
 *
 * Tests for verdict creation and hashing.
 */

import { describe, it, expect } from 'vitest';
import {
  createValidatorResult,
  createVerdictId,
  hashVerdict,
  computeFinalVerdict,
  createGateVerdict,
  createHashMismatchEvidence,
  createSchemaViolationEvidence,
  createPolicyViolationEvidence,
  createDriftEvidence,
  createToxicityEvidence,
  createMagicNumberEvidence,
  createProofCarryingVerdict,
} from '../src/gate/verdict-factory.js';
import type { ValidatorId, ValidatorResult, PolicyId, VerdictEvidence } from '../src/gate/types.js';

describe('Verdict Factory', () => {
  describe('createValidatorResult', () => {
    it('should create validator result with ALLOW verdict', () => {
      const result = createValidatorResult('V-TEST' as ValidatorId, 'ALLOW', [], 10);
      expect(result.validator_id).toBe('V-TEST');
      expect(result.verdict).toBe('ALLOW');
      expect(result.evidence).toEqual([]);
      expect(result.duration_ms).toBe(10);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should create validator result with DENY verdict', () => {
      const evidence: VerdictEvidence[] = [{ type: 'schema_violation', details: 'test' }];
      const result = createValidatorResult('V-TEST' as ValidatorId, 'DENY', evidence, 5);
      expect(result.verdict).toBe('DENY');
      expect(result.evidence).toHaveLength(1);
    });

    it('should create validator result with DEFER verdict', () => {
      const result = createValidatorResult('V-TEST' as ValidatorId, 'DEFER', [], 15);
      expect(result.verdict).toBe('DEFER');
    });

    it('should preserve evidence array immutably', () => {
      const evidence: VerdictEvidence[] = [{ type: 'hash_mismatch', details: 'test' }];
      const result = createValidatorResult('V-TEST' as ValidatorId, 'DENY', evidence, 5);
      expect(result.evidence).not.toBe(evidence);
      expect(result.evidence).toEqual(evidence);
    });
  });

  describe('createVerdictId', () => {
    it('should create deterministic verdict ID', () => {
      const results: ValidatorResult[] = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
      ];
      const id1 = createVerdictId('tx-1', 'P-TEST-v1' as PolicyId, results);
      const id2 = createVerdictId('tx-1', 'P-TEST-v1' as PolicyId, results);
      expect(id1).toBe(id2);
    });

    it('should produce different IDs for different tx_ids', () => {
      const results: ValidatorResult[] = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
      ];
      const id1 = createVerdictId('tx-1', 'P-TEST-v1' as PolicyId, results);
      const id2 = createVerdictId('tx-2', 'P-TEST-v1' as PolicyId, results);
      expect(id1).not.toBe(id2);
    });

    it('should produce different IDs for different policies', () => {
      const results: ValidatorResult[] = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
      ];
      const id1 = createVerdictId('tx-1', 'P-TEST-v1' as PolicyId, results);
      const id2 = createVerdictId('tx-1', 'P-TEST-v2' as PolicyId, results);
      expect(id1).not.toBe(id2);
    });

    it('should sort validator results for determinism', () => {
      const results1: ValidatorResult[] = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
        createValidatorResult('V-B' as ValidatorId, 'ALLOW', [], 2),
      ];
      const results2: ValidatorResult[] = [
        createValidatorResult('V-B' as ValidatorId, 'ALLOW', [], 2),
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
      ];
      const id1 = createVerdictId('tx-1', 'P-TEST-v1' as PolicyId, results1);
      const id2 = createVerdictId('tx-1', 'P-TEST-v1' as PolicyId, results2);
      expect(id1).toBe(id2);
    });
  });

  describe('hashVerdict', () => {
    it('should create deterministic hash', () => {
      const results: ValidatorResult[] = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
      ];
      const verdict = {
        verdict_id: 'vid-1' as any,
        tx_id: 'tx-1',
        final_verdict: 'ALLOW' as const,
        validator_results: results,
        policy_id: 'P-TEST-v1' as PolicyId,
        timestamp: 12345,
      };
      const hash1 = hashVerdict(verdict);
      const hash2 = hashVerdict(verdict);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different verdicts', () => {
      const results: ValidatorResult[] = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
      ];
      const verdict1 = {
        verdict_id: 'vid-1' as any,
        tx_id: 'tx-1',
        final_verdict: 'ALLOW' as const,
        validator_results: results,
        policy_id: 'P-TEST-v1' as PolicyId,
        timestamp: 12345,
      };
      const verdict2 = {
        ...verdict1,
        final_verdict: 'DENY' as const,
      };
      expect(hashVerdict(verdict1)).not.toBe(hashVerdict(verdict2));
    });
  });

  describe('computeFinalVerdict', () => {
    const rules = { deny_on_any_deny: true, defer_on_any_defer: true };

    it('should return ALLOW when all results are ALLOW', () => {
      const results: ValidatorResult[] = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
        createValidatorResult('V-B' as ValidatorId, 'ALLOW', [], 2),
      ];
      expect(computeFinalVerdict(results, rules)).toBe('ALLOW');
    });

    it('should return DENY when any result is DENY', () => {
      const results: ValidatorResult[] = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
        createValidatorResult('V-B' as ValidatorId, 'DENY', [], 2),
      ];
      expect(computeFinalVerdict(results, rules)).toBe('DENY');
    });

    it('should return DEFER when any result is DEFER (no DENY)', () => {
      const results: ValidatorResult[] = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
        createValidatorResult('V-B' as ValidatorId, 'DEFER', [], 2),
      ];
      expect(computeFinalVerdict(results, rules)).toBe('DEFER');
    });

    it('should return DENY for empty results', () => {
      expect(computeFinalVerdict([], rules)).toBe('DENY');
    });

    it('should respect deny_on_any_deny=false', () => {
      const results: ValidatorResult[] = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
        createValidatorResult('V-B' as ValidatorId, 'DENY', [], 2),
      ];
      const relaxedRules = { deny_on_any_deny: false, defer_on_any_defer: true };
      // Still DENY because not all ALLOW
      expect(computeFinalVerdict(results, relaxedRules)).toBe('DENY');
    });

    it('should respect defer_on_any_defer=false', () => {
      const results: ValidatorResult[] = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
        createValidatorResult('V-B' as ValidatorId, 'DEFER', [], 2),
      ];
      const relaxedRules = { deny_on_any_deny: true, defer_on_any_defer: false };
      // Not all ALLOW so DENY
      expect(computeFinalVerdict(results, relaxedRules)).toBe('DENY');
    });
  });

  describe('createGateVerdict', () => {
    it('should create complete gate verdict', () => {
      const results: ValidatorResult[] = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
      ];
      const rules = { deny_on_any_deny: true, defer_on_any_defer: true };
      const verdict = createGateVerdict('tx-1', results, 'P-TEST-v1' as PolicyId, rules);

      expect(verdict.tx_id).toBe('tx-1');
      expect(verdict.policy_id).toBe('P-TEST-v1');
      expect(verdict.final_verdict).toBe('ALLOW');
      expect(verdict.verdict_id).toBeDefined();
      expect(verdict.hash).toBeDefined();
      expect(verdict.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Evidence creation', () => {
    it('should create hash mismatch evidence', () => {
      const evidence = createHashMismatchEvidence('abc', 'xyz', 'tx.hash');
      expect(evidence.type).toBe('hash_mismatch');
      expect(evidence.expected).toBe('abc');
      expect(evidence.actual).toBe('xyz');
      expect(evidence.location).toBe('tx.hash');
    });

    it('should create schema violation evidence', () => {
      const evidence = createSchemaViolationEvidence('Invalid field', 'tx.ops[0]');
      expect(evidence.type).toBe('schema_violation');
      expect(evidence.details).toBe('Invalid field');
      expect(evidence.location).toBe('tx.ops[0]');
    });

    it('should create policy violation evidence', () => {
      const evidence = createPolicyViolationEvidence('Blocked pattern');
      expect(evidence.type).toBe('policy_violation');
    });

    it('should create drift evidence', () => {
      const evidence = createDriftEvidence('Drift detected', 'value1', 'value2');
      expect(evidence.type).toBe('drift_detected');
      expect(evidence.expected).toBe('value1');
      expect(evidence.actual).toBe('value2');
    });

    it('should create toxicity evidence', () => {
      const evidence = createToxicityEvidence('Toxic content', 'op.value');
      expect(evidence.type).toBe('toxicity_detected');
    });

    it('should create magic number evidence', () => {
      const evidence = createMagicNumberEvidence('Magic number', 'op.value', '42');
      expect(evidence.type).toBe('magic_number');
      expect(evidence.actual).toBe('42');
    });
  });

  describe('createProofCarryingVerdict', () => {
    it('should extend verdict with proof chain', () => {
      const results: ValidatorResult[] = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
      ];
      const rules = { deny_on_any_deny: true, defer_on_any_defer: true };
      const verdict = createGateVerdict('tx-1', results, 'P-TEST-v1' as PolicyId, rules);
      const proofChain = ['hash1', 'hash2'] as any[];

      const pcv = createProofCarryingVerdict(verdict, proofChain);

      expect(pcv.proof_chain).toEqual(proofChain);
      expect(pcv.merkle_root).toBeDefined();
      expect(pcv.validator_hashes.size).toBe(1);
      expect(pcv.validator_hashes.has('V-A' as ValidatorId)).toBe(true);
    });
  });
});
