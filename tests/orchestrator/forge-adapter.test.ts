/**
 * OMEGA Orchestrator Forge Adapter Tests v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Tests for G6 forge adapter
 */

import { describe, it, expect } from 'vitest';
import {
  createForgeAdapter,
  verifyDeterministicResult,
  isMockGenerated,
  type ForgeAdapter,
  type ForgeResult,
  type ForgeResponse,
} from '../../src/orchestrator/forge-adapter';
import {
  createGenerationContract,
  markContractExecuting,
  type GenerationContract,
} from '../../src/orchestrator/generation-contract';
import { createIntent, type RawIntentInput } from '../../src/orchestrator/intent-schema';
import type { PolicyId } from '../../src/orchestrator/types';

describe('Forge Adapter — Phase G', () => {
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

  function createValidContract(overrides?: Partial<RawIntentInput>): GenerationContract {
    const intent = createIntent({ ...validRawIntent, ...overrides });
    return createGenerationContract({ intent, policyId: testPolicyId });
  }

  describe('createForgeAdapter', () => {
    it('creates adapter with MOCK_ONLY mode (G-INV-10)', () => {
      const adapter = createForgeAdapter();

      expect(adapter.mode).toBe('MOCK_ONLY');
    });

    it('returns frozen adapter', () => {
      const adapter = createForgeAdapter();

      expect(Object.isFrozen(adapter)).toBe(true);
    });
  });

  describe('executeSync', () => {
    it('executes valid contract successfully', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();

      const response = adapter.executeSync(contract);

      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.result.contractId).toBe(contract.contractId);
        expect(typeof response.result.content).toBe('string');
        expect(response.result.mockGenerated).toBe(true);
        expect(response.contract.status).toBe('COMPLETED');
      }
    });

    it('generates deterministic content (G-INV-04)', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();

      const response1 = adapter.executeSync(contract);

      // Create new contract with same intent (same seed)
      const contract2 = createValidContract();
      const response2 = adapter.executeSync(contract2);

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
      if (response1.success && response2.success) {
        expect(response1.result.content).toBe(response2.result.content);
        expect(response1.result.seed).toBe(response2.result.seed);
      }
    });

    it('generates different content for different inputs', () => {
      const adapter = createForgeAdapter();
      const contract1 = createValidContract({ payload: { text: 'Story A' } });
      const contract2 = createValidContract({ payload: { text: 'Story B' } });

      const response1 = adapter.executeSync(contract1);
      const response2 = adapter.executeSync(contract2);

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
      if (response1.success && response2.success) {
        expect(response1.result.content).not.toBe(response2.result.content);
      }
    });

    it('rejects non-executable contract', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();
      const executing = markContractExecuting(contract);

      const response = adapter.executeSync(executing);

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('CONTRACT_NOT_EXECUTABLE');
      }
    });

    it('rejects expired contract', () => {
      const adapter = createForgeAdapter();
      const intent = createIntent(validRawIntent);
      const contract = createGenerationContract({
        intent,
        policyId: testPolicyId,
        ttlMs: -1000, // Already expired
      });

      const response = adapter.executeSync(contract);

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.message).toContain('expired');
      }
    });

    it('rejects non-MOCK_ONLY mode (G-INV-10)', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();

      // Tamper with mode (simulating invalid contract)
      const tamperedContract = { ...contract, mode: 'LIVE' } as GenerationContract;

      const response = adapter.executeSync(tamperedContract);

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('G-INV-10_VIOLATION');
      }
    });

    it('respects maxLength constraint', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract({
        constraints: { maxLength: 100, format: 'TEXT_ONLY', allowFacts: false },
      });

      const response = adapter.executeSync(contract);

      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.result.content.length).toBeLessThanOrEqual(100);
      }
    });

    it('includes metadata in result', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();

      const response = adapter.executeSync(contract);

      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.result.metadata.tokenCount).toBeGreaterThan(0);
        expect(response.result.metadata.processingMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('returns frozen result', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();

      const response = adapter.executeSync(contract);

      expect(Object.isFrozen(response)).toBe(true);
      if (response.success) {
        expect(Object.isFrozen(response.result)).toBe(true);
        expect(Object.isFrozen(response.result.metadata)).toBe(true);
      }
    });

    it('updates contract status to COMPLETED on success', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();

      const response = adapter.executeSync(contract);

      expect(response.success).toBe(true);
      expect(response.contract.status).toBe('COMPLETED');
    });

    it('updates contract status to REJECTED for non-executable contract', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();
      const executing = markContractExecuting(contract);

      const response = adapter.executeSync(executing);

      expect(response.success).toBe(false);
      expect(response.contract.status).toBe('REJECTED');
    });
  });

  describe('execute (async)', () => {
    it('returns same result as executeSync', async () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();

      const asyncResponse = await adapter.execute(contract);

      // Create new contract with same intent for sync comparison
      const contract2 = createValidContract();
      const syncResponse = adapter.executeSync(contract2);

      expect(asyncResponse.success).toBe(syncResponse.success);
      if (asyncResponse.success && syncResponse.success) {
        expect(asyncResponse.result.content).toBe(syncResponse.result.content);
      }
    });

    it('handles async execution', async () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();

      const response = await adapter.execute(contract);

      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.result.mockGenerated).toBe(true);
      }
    });
  });

  describe('verifyDeterministicResult', () => {
    it('returns true for valid deterministic result', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();

      const response = adapter.executeSync(contract);

      expect(response.success).toBe(true);
      if (response.success) {
        const isValid = verifyDeterministicResult(
          response.result,
          contract.params.prompt,
          contract.params.maxLength
        );
        expect(isValid).toBe(true);
      }
    });

    it('returns false for tampered result', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();

      const response = adapter.executeSync(contract);

      expect(response.success).toBe(true);
      if (response.success) {
        // Tamper with content
        const tamperedResult = {
          ...response.result,
          content: 'Tampered content',
        };

        const isValid = verifyDeterministicResult(
          tamperedResult,
          contract.params.prompt,
          contract.params.maxLength
        );
        expect(isValid).toBe(false);
      }
    });
  });

  describe('isMockGenerated', () => {
    it('returns true for mock-generated result', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();

      const response = adapter.executeSync(contract);

      expect(response.success).toBe(true);
      if (response.success) {
        expect(isMockGenerated(response.result)).toBe(true);
      }
    });

    it('returns false if mockGenerated flag is false', () => {
      const fakeResult: ForgeResult = {
        contractId: 'CON-1234567890abcdef',
        content: 'Some content',
        generatedAt: new Date().toISOString(),
        seed: 12345,
        mockGenerated: false,
        metadata: { tokenCount: 10, processingMs: 5 },
      };

      expect(isMockGenerated(fakeResult)).toBe(false);
    });
  });

  describe('G-INV-11: No network calls', () => {
    it('generates content without network', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();

      // This should complete synchronously without network
      const start = Date.now();
      const response = adapter.executeSync(contract);
      const elapsed = Date.now() - start;

      expect(response.success).toBe(true);
      // Should be very fast (no network latency)
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Content generation', () => {
    it('includes content ID hash', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();

      const response = adapter.executeSync(contract);

      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.result.content).toContain('Mock Content ID:');
      }
    });

    it('references original prompt', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract({
        payload: { text: 'Unique test prompt 12345' },
      });

      const response = adapter.executeSync(contract);

      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.result.content).toContain('Unique test prompt');
      }
    });

    it('handles long prompts gracefully', () => {
      const adapter = createForgeAdapter();
      const longPrompt = 'A'.repeat(500);
      const contract = createValidContract({
        payload: { text: longPrompt },
      });

      const response = adapter.executeSync(contract);

      expect(response.success).toBe(true);
      if (response.success) {
        // Should truncate prompt in output
        expect(response.result.content).toContain('...');
      }
    });
  });

  describe('Token count estimation', () => {
    it('estimates tokens based on content length', () => {
      const adapter = createForgeAdapter();
      const contract = createValidContract();

      const response = adapter.executeSync(contract);

      expect(response.success).toBe(true);
      if (response.success) {
        // Rough check: ~4 chars per token
        const expectedTokens = Math.ceil(response.result.content.length / 4);
        expect(response.result.metadata.tokenCount).toBe(expectedTokens);
      }
    });
  });

  describe('Error handling', () => {
    it('includes error code in failure response', () => {
      const adapter = createForgeAdapter();
      // Use expired contract to trigger error
      const intent = createIntent(validRawIntent);
      const contract = createGenerationContract({
        intent,
        policyId: testPolicyId,
        ttlMs: -1000, // Already expired
      });

      const response = adapter.executeSync(contract);

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBeDefined();
        expect(response.error.contractId).toBe(contract.contractId);
      }
    });
  });
});
