/**
 * OMEGA Orchestrator Generation Contract Tests v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Tests for G5 generation contract
 */

import { describe, it, expect } from 'vitest';
import {
  createGenerationContract,
  validateContract,
  isContractExpired,
  canExecuteContract,
  updateContractStatus,
  markContractExecuting,
  markContractCompleted,
  markContractFailed,
  markContractRejected,
  computeDeterministicSeed,
  isContractId,
  DEFAULT_CONTRACT_TTL_MS,
  type GenerationContract,
  type SealedContract,
} from '../../src/orchestrator/generation-contract';
import { createIntent, type RawIntentInput } from '../../src/orchestrator/intent-schema';
import type { PolicyId, IntentId, ChainHash } from '../../src/orchestrator/types';

describe('Generation Contract — Phase G', () => {
  const validRawIntent: RawIntentInput = {
    actorId: 'ACT-user-12345678',
    goal: 'DRAFT',
    constraints: {
      maxLength: 1000,
      format: 'TEXT_ONLY',
      allowFacts: false,
    },
    tone: {
      tone: 'NEUTRAL',
      intensity: 'MEDIUM',
    },
    forbidden: {
      patterns: [],
      vocabularies: [],
      structures: [],
    },
    payload: {
      text: 'Write a story about adventure.',
    },
  };

  const testPolicyId = 'POL-v1-abcd1234' as PolicyId;

  function createValidIntent(overrides?: Partial<RawIntentInput>) {
    return createIntent({ ...validRawIntent, ...overrides });
  }

  describe('isContractId', () => {
    it('accepts valid contract ID', () => {
      expect(isContractId('CON-1234567890abcdef')).toBe(true);
      expect(isContractId('CON-abcdef0123456789')).toBe(true);
    });

    it('rejects invalid contract ID', () => {
      expect(isContractId('CON-123')).toBe(false); // Too short
      expect(isContractId('CON-12345678901234567')).toBe(false); // Too long
      expect(isContractId('XXX-1234567890abcdef')).toBe(false); // Wrong prefix
      expect(isContractId('CON-ZZZZZZZZZZZZZZZZ')).toBe(false); // Non-hex
      expect(isContractId(123)).toBe(false);
      expect(isContractId(null)).toBe(false);
    });
  });

  describe('computeDeterministicSeed (G-INV-04)', () => {
    it('returns a number', () => {
      const intent = createValidIntent();
      const seed = computeDeterministicSeed(intent);

      expect(typeof seed).toBe('number');
      expect(Number.isInteger(seed)).toBe(true);
    });

    it('is deterministic for same intent', () => {
      const intent = createValidIntent();
      const seed1 = computeDeterministicSeed(intent);
      const seed2 = computeDeterministicSeed(intent);

      expect(seed1).toBe(seed2);
    });

    it('differs for different intents', () => {
      const intent1 = createValidIntent({ payload: { text: 'Story A' } });
      const intent2 = createValidIntent({ payload: { text: 'Story B' } });

      const seed1 = computeDeterministicSeed(intent1);
      const seed2 = computeDeterministicSeed(intent2);

      expect(seed1).not.toBe(seed2);
    });

    it('produces 32-bit unsigned integer', () => {
      const intent = createValidIntent();
      const seed = computeDeterministicSeed(intent);

      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xFFFFFFFF);
    });
  });

  describe('createGenerationContract', () => {
    it('creates valid contract', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({
        intent,
        policyId: testPolicyId,
      });

      expect(isContractId(contract.contractId)).toBe(true);
      expect(contract.intentId).toBe(intent.intentId);
      expect(contract.actorId).toBe(intent.actorId);
      expect(contract.policyId).toBe(testPolicyId);
      expect(contract.mode).toBe('MOCK_ONLY');
      expect(contract.status).toBe('PENDING');
      expect(typeof contract.seed).toBe('number');
      expect(contract.chainHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('enforces MOCK_ONLY mode (G-INV-10)', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({
        intent,
        policyId: testPolicyId,
      });

      expect(contract.mode).toBe('MOCK_ONLY');
    });

    it('rejects intent with allowFacts=true (G-INV-01)', () => {
      const intentWithFacts = createIntent({
        ...validRawIntent,
        constraints: {
          maxLength: 1000,
          format: 'TEXT_ONLY',
          allowFacts: true, // Violation
        },
      });

      expect(() =>
        createGenerationContract({
          intent: intentWithFacts,
          policyId: testPolicyId,
        })
      ).toThrow('G-INV-01');
    });

    it('sets deterministic seed (G-INV-04)', () => {
      const intent = createValidIntent();
      const contract1 = createGenerationContract({ intent, policyId: testPolicyId });
      const contract2 = createGenerationContract({ intent, policyId: testPolicyId });

      expect(contract1.seed).toBe(contract2.seed);
    });

    it('extracts prompt from text field', () => {
      const intent = createValidIntent({
        payload: { text: 'My custom prompt' },
      });
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      expect(contract.params.prompt).toBe('My custom prompt');
    });

    it('extracts prompt from prompt field', () => {
      const intent = createValidIntent({
        payload: { prompt: 'Another prompt' },
      });
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      expect(contract.params.prompt).toBe('Another prompt');
    });

    it('extracts prompt from content field', () => {
      const intent = createValidIntent({
        payload: { content: 'Content prompt' },
      });
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      expect(contract.params.prompt).toBe('Content prompt');
    });

    it('sets timestamps correctly', () => {
      const intent = createValidIntent();
      const before = new Date();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });
      const after = new Date();

      const createdAt = new Date(contract.createdAt);
      const expiresAt = new Date(contract.expiresAt);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(expiresAt.getTime() - createdAt.getTime()).toBe(DEFAULT_CONTRACT_TTL_MS);
    });

    it('accepts custom TTL', () => {
      const intent = createValidIntent();
      const ttlMs = 60000; // 1 minute
      const contract = createGenerationContract({
        intent,
        policyId: testPolicyId,
        ttlMs,
      });

      const createdAt = new Date(contract.createdAt);
      const expiresAt = new Date(contract.expiresAt);

      expect(expiresAt.getTime() - createdAt.getTime()).toBe(ttlMs);
    });

    it('includes previous chain hash', () => {
      const intent = createValidIntent();
      const previousHash = 'a'.repeat(64) as ChainHash;

      const contract = createGenerationContract({
        intent,
        policyId: testPolicyId,
        previousChainHash: previousHash,
      });

      // Chain hash should differ when previous is included
      const contractWithout = createGenerationContract({
        intent,
        policyId: testPolicyId,
      });

      expect(contract.chainHash).not.toBe(contractWithout.chainHash);
    });

    it('returns frozen contract', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      expect(Object.isFrozen(contract)).toBe(true);
      expect(Object.isFrozen(contract.params)).toBe(true);
    });
  });

  describe('validateContract', () => {
    it('returns true for valid contract', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      expect(validateContract(contract)).toBe(true);
    });

    it('returns false for invalid contract ID', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      const invalid = { ...contract, contractId: 'INVALID' };

      expect(validateContract(invalid as GenerationContract)).toBe(false);
    });

    it('returns false for non-MOCK_ONLY mode', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      const invalid = { ...contract, mode: 'LIVE' };

      expect(validateContract(invalid as GenerationContract)).toBe(false);
    });

    it('returns false for invalid chain hash', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      const invalid = { ...contract, chainHash: 'invalid' };

      expect(validateContract(invalid as GenerationContract)).toBe(false);
    });

    it('returns false for invalid status', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      const invalid = { ...contract, status: 'UNKNOWN' };

      expect(validateContract(invalid as GenerationContract)).toBe(false);
    });

    it('returns false for invalid timestamps', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      const invalid = { ...contract, createdAt: 'not-a-date' };

      expect(validateContract(invalid as GenerationContract)).toBe(false);
    });
  });

  describe('isContractExpired', () => {
    it('returns false for non-expired contract', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      expect(isContractExpired(contract)).toBe(false);
    });

    it('returns true for expired contract', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({
        intent,
        policyId: testPolicyId,
        ttlMs: 1, // Expires immediately
      });

      // Wait a bit and check
      const futureDate = new Date(Date.now() + 100);
      expect(isContractExpired(contract, futureDate)).toBe(true);
    });

    it('accepts custom now parameter', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      const farFuture = new Date(Date.now() + 10 * DEFAULT_CONTRACT_TTL_MS);
      expect(isContractExpired(contract, farFuture)).toBe(true);
    });
  });

  describe('canExecuteContract', () => {
    it('returns true for pending non-expired contract', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      expect(canExecuteContract(contract)).toBe(true);
    });

    it('returns false for non-pending contract', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });
      const executing = markContractExecuting(contract);

      expect(canExecuteContract(executing)).toBe(false);
    });

    it('returns false for expired contract', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({
        intent,
        policyId: testPolicyId,
        ttlMs: -1000, // Already expired
      });

      expect(canExecuteContract(contract)).toBe(false);
    });
  });

  describe('updateContractStatus', () => {
    it('creates new contract with updated status', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      const updated = updateContractStatus(contract, 'EXECUTING');

      expect(updated.status).toBe('EXECUTING');
      expect(updated.contractId).toBe(contract.contractId);
      expect(updated).not.toBe(contract); // New object
    });

    it('returns frozen object', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      const updated = updateContractStatus(contract, 'COMPLETED');

      expect(Object.isFrozen(updated)).toBe(true);
    });
  });

  describe('markContractExecuting', () => {
    it('marks pending contract as executing', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      const executing = markContractExecuting(contract);

      expect(executing.status).toBe('EXECUTING');
    });

    it('throws for non-pending contract', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });
      const executing = markContractExecuting(contract);

      expect(() => markContractExecuting(executing)).toThrow('Cannot execute');
    });
  });

  describe('markContractCompleted', () => {
    it('marks executing contract as completed', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });
      const executing = markContractExecuting(contract);

      const completed = markContractCompleted(executing);

      expect(completed.status).toBe('COMPLETED');
    });

    it('throws for non-executing contract', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      expect(() => markContractCompleted(contract)).toThrow('Cannot complete');
    });
  });

  describe('markContractFailed', () => {
    it('marks executing contract as failed', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });
      const executing = markContractExecuting(contract);

      const failed = markContractFailed(executing);

      expect(failed.status).toBe('FAILED');
    });

    it('throws for non-executing contract', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      expect(() => markContractFailed(contract)).toThrow('Cannot fail');
    });
  });

  describe('markContractRejected', () => {
    it('marks any contract as rejected', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      const rejected = markContractRejected(contract);

      expect(rejected.status).toBe('REJECTED');
    });

    it('can reject executing contract', () => {
      const intent = createValidIntent();
      const contract = createGenerationContract({ intent, policyId: testPolicyId });
      const executing = markContractExecuting(contract);

      const rejected = markContractRejected(executing);

      expect(rejected.status).toBe('REJECTED');
    });
  });

  describe('Generation params extraction', () => {
    it('extracts maxLength from constraints', () => {
      const intent = createValidIntent({
        constraints: { maxLength: 5000, format: 'TEXT_ONLY', allowFacts: false },
      });
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      expect(contract.params.maxLength).toBe(5000);
    });

    it('extracts tone from intent', () => {
      const intent = createValidIntent({
        tone: { tone: 'NARRATIVE', intensity: 'HIGH' },
      });
      const contract = createGenerationContract({ intent, policyId: testPolicyId });

      expect(contract.params.tone.tone).toBe('NARRATIVE');
      expect(contract.params.tone.intensity).toBe('HIGH');
    });
  });

  describe('Contract ID determinism', () => {
    it('same intent + policy = same contract ID', () => {
      const intent = createValidIntent();

      const contract1 = createGenerationContract({ intent, policyId: testPolicyId });
      const contract2 = createGenerationContract({ intent, policyId: testPolicyId });

      expect(contract1.contractId).toBe(contract2.contractId);
    });

    it('different policy = different contract ID', () => {
      const intent = createValidIntent();
      const policy1 = 'POL-v1-11111111' as PolicyId;
      const policy2 = 'POL-v1-22222222' as PolicyId;

      const contract1 = createGenerationContract({ intent, policyId: policy1 });
      const contract2 = createGenerationContract({ intent, policyId: policy2 });

      expect(contract1.contractId).not.toBe(contract2.contractId);
    });
  });
});
