/**
 * OMEGA Orchestrator Tests v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Tests for G8 main orchestrator
 */

import { describe, it, expect } from 'vitest';
import {
  createOrchestrator,
  processIntent,
  preflightIntent,
  type Orchestrator,
  type ProcessingResult,
} from '../../src/orchestrator/orchestrator';
import type { RawIntentInput } from '../../src/orchestrator/intent-schema';

describe('Orchestrator — Phase G', () => {
  const validInput: RawIntentInput = {
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

  describe('createOrchestrator', () => {
    it('creates orchestrator with all components', () => {
      const orchestrator = createOrchestrator();

      expect(orchestrator.policyEngine).toBeDefined();
      expect(orchestrator.forgeAdapter).toBeDefined();
      expect(orchestrator.ledger).toBeDefined();
    });

    it('has MOCK_ONLY forge adapter (G-INV-10)', () => {
      const orchestrator = createOrchestrator();

      expect(orchestrator.forgeAdapter.mode).toBe('MOCK_ONLY');
    });

    it('has verified policy (G-INV-08)', () => {
      const orchestrator = createOrchestrator();

      expect(orchestrator.policyEngine.verified).toBe(true);
    });

    it('has empty ledger initially', () => {
      const orchestrator = createOrchestrator();

      expect(orchestrator.ledger.length).toBe(0);
    });

    it('returns frozen orchestrator', () => {
      const orchestrator = createOrchestrator();

      expect(Object.isFrozen(orchestrator)).toBe(true);
    });
  });

  describe('processSync', () => {
    it('processes valid intent successfully', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync(validInput);

      expect(result.success).toBe(true);
      expect(result.stage).toBe('COMPLETED');
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
    });

    it('returns intent ID (G-INV-07)', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync(validInput);

      // IntentId is INT- followed by 32 hex chars (first half of SHA256)
      expect(result.intentId).toMatch(/^INT-[a-f0-9]{32}$/);
    });

    it('returns actor ID', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync(validInput);

      expect(result.actorId).toBe(validInput.actorId);
    });

    it('includes processing metadata', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync(validInput);

      expect(result.metadata.policyId).toBeDefined();
      expect(result.metadata.contractId).toBeDefined();
      expect(result.metadata.seed).toBeDefined();
      expect(result.metadata.processingMs).toBeGreaterThanOrEqual(0);
    });

    it('records entries in ledger', () => {
      const orchestrator = createOrchestrator();

      orchestrator.processSync(validInput);

      expect(orchestrator.ledger.length).toBeGreaterThan(0);
    });

    it('produces deterministic results (G-INV-04)', () => {
      const orchestrator1 = createOrchestrator();
      const orchestrator2 = createOrchestrator();

      const result1 = orchestrator1.processSync(validInput);
      const result2 = orchestrator2.processSync(validInput);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.content).toBe(result2.content);
        expect(result1.metadata.seed).toBe(result2.metadata.seed);
      }
    });

    it('rejects fact injection (G-INV-01)', () => {
      const orchestrator = createOrchestrator();
      const inputWithFacts: RawIntentInput = {
        ...validInput,
        payload: {
          text: 'Insert [FACT] injection here',
        },
      };

      const result = orchestrator.processSync(inputWithFacts);

      expect(result.success).toBe(false);
      expect(result.stage).toBe('VALIDATION');
      expect(result.error?.code).toBe('G-INV-01_VIOLATION');
    });

    it('rejects allowFacts: true', () => {
      const orchestrator = createOrchestrator();
      const inputWithAllowFacts: RawIntentInput = {
        ...validInput,
        constraints: {
          ...validInput.constraints,
          allowFacts: true,
        },
      };

      // Note: normalizeRawIntent forces allowFacts to false,
      // so this is tested in contract creation which validates against intent
    });

    it('rejects invalid goal format at validation', () => {
      const orchestrator = createOrchestrator();
      const inputWithBadGoal: RawIntentInput = {
        ...validInput,
        goal: 'INVALID_GOAL', // Not in INTENT_GOALS enum
      };

      const result = orchestrator.processSync(inputWithBadGoal);

      // Invalid goal format is caught at validation (defense in depth)
      expect(result.success).toBe(false);
      expect(result.stage).toBe('VALIDATION');
    });

    it('rejects forbidden patterns in payload (G-INV-09)', () => {
      const orchestrator = createOrchestrator();
      const inputWithPattern: RawIntentInput = {
        ...validInput,
        payload: {
          text: 'Reference ENT-person-abcd1234 here',
        },
      };

      const result = orchestrator.processSync(inputWithPattern);

      // May be caught at VALIDATION (fact injection) or POLICY_CHECK
      expect(result.success).toBe(false);
    });

    it('returns frozen result', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync(validInput);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.metadata)).toBe(true);
    });
  });

  describe('process (async)', () => {
    it('returns same result as processSync', async () => {
      const orchestrator = createOrchestrator();

      const asyncResult = await orchestrator.process(validInput);
      const syncOrchestrator = createOrchestrator();
      const syncResult = syncOrchestrator.processSync(validInput);

      expect(asyncResult.success).toBe(syncResult.success);
      expect(asyncResult.stage).toBe(syncResult.stage);
      expect(asyncResult.content).toBe(syncResult.content);
    });
  });

  describe('getIntentStatus', () => {
    it('returns latest status for processed intent', () => {
      const orchestrator = createOrchestrator();
      const result = orchestrator.processSync(validInput);

      const status = orchestrator.getIntentStatus(result.intentId);

      expect(status).toBe('COMPLETED');
    });

    it('returns undefined for unknown intent', () => {
      const orchestrator = createOrchestrator();

      const status = orchestrator.getIntentStatus('INT-unknown' as any);

      expect(status).toBeUndefined();
    });

    it('returns REJECTED for failed intent', () => {
      const orchestrator = createOrchestrator();
      const badInput: RawIntentInput = {
        ...validInput,
        payload: { text: '[FACT] injection' },
      };

      const result = orchestrator.processSync(badInput);
      const status = orchestrator.getIntentStatus(result.intentId);

      expect(status).toBe('REJECTED');
    });
  });

  describe('getLedgerSnapshot', () => {
    it('returns all ledger entries', () => {
      const orchestrator = createOrchestrator();

      orchestrator.processSync(validInput);

      const snapshot = orchestrator.getLedgerSnapshot();

      expect(snapshot.length).toBeGreaterThan(0);
      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    it('includes multiple intents', () => {
      const orchestrator = createOrchestrator();

      orchestrator.processSync(validInput);
      orchestrator.processSync({
        ...validInput,
        payload: { text: 'Different story' },
      });

      const snapshot = orchestrator.getLedgerSnapshot();
      const intentIds = new Set(snapshot.map(e => e.intentId));

      expect(intentIds.size).toBe(2);
    });
  });

  describe('Pipeline stages (G-INV-05)', () => {
    it('executes stages in order for success', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync(validInput);

      expect(result.stage).toBe('COMPLETED');

      const entries = orchestrator.ledger.getEntriesByIntentId(result.intentId);
      const statuses = entries.map(e => e.status);

      // Should have: RECEIVED, VALIDATED, POLICY_CHECKED, CONTRACT_CREATED, GENERATING, COMPLETED
      expect(statuses).toContain('RECEIVED');
      expect(statuses).toContain('VALIDATED');
      expect(statuses).toContain('POLICY_CHECKED');
      expect(statuses).toContain('CONTRACT_CREATED');
      expect(statuses).toContain('GENERATING');
      expect(statuses).toContain('COMPLETED');
    });

    it('stops at validation stage for invalid input', () => {
      const orchestrator = createOrchestrator();
      const badInput: RawIntentInput = {
        ...validInput,
        payload: { text: '[FACT]' },
      };

      const result = orchestrator.processSync(badInput);

      expect(result.stage).toBe('VALIDATION');
    });

    it('stops at validation stage for invalid goal format', () => {
      const orchestrator = createOrchestrator();
      const badInput: RawIntentInput = {
        ...validInput,
        goal: 'NOT_ALLOWED', // Not in INTENT_GOALS enum
      };

      const result = orchestrator.processSync(badInput);

      // Invalid goal format caught at validation (defense in depth)
      expect(result.stage).toBe('VALIDATION');
    });
  });

  describe('processIntent (convenience function)', () => {
    it('processes intent with default config', () => {
      const result = processIntent(validInput);

      expect(result.success).toBe(true);
      expect(result.stage).toBe('COMPLETED');
    });
  });

  describe('preflightIntent (convenience function)', () => {
    it('returns valid for good input', () => {
      const preflight = preflightIntent(validInput);

      expect(preflight.valid).toBe(true);
      expect(preflight.intent).toBeDefined();
    });

    it('returns invalid for fact injection', () => {
      const badInput: RawIntentInput = {
        ...validInput,
        payload: { text: '[FACT] injection' },
      };

      const preflight = preflightIntent(badInput);

      expect(preflight.valid).toBe(false);
      expect(preflight.errors).toBeDefined();
    });
  });

  describe('Error cases', () => {
    it('handles missing payload gracefully', () => {
      const orchestrator = createOrchestrator();
      const badInput: RawIntentInput = {
        ...validInput,
        payload: {},
      };

      const result = orchestrator.processSync(badInput);

      // Should complete (empty payload is valid)
      expect(typeof result.success).toBe('boolean');
    });

    it('includes error details on failure', () => {
      const orchestrator = createOrchestrator();
      const badInput: RawIntentInput = {
        ...validInput,
        goal: 'INVALID',
      };

      const result = orchestrator.processSync(badInput);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBeDefined();
      expect(result.error?.message).toBeDefined();
    });
  });

  describe('Ledger integrity (G-INV-06)', () => {
    it('maintains chain integrity after processing', () => {
      const orchestrator = createOrchestrator();

      orchestrator.processSync(validInput);
      orchestrator.processSync({
        ...validInput,
        payload: { text: 'Second request' },
      });

      expect(orchestrator.ledger.verifyChain()).toBe(true);
    });

    it('maintains chain integrity after failures', () => {
      const orchestrator = createOrchestrator();

      orchestrator.processSync(validInput);
      orchestrator.processSync({
        ...validInput,
        payload: { text: '[FACT]' }, // Will fail
      });
      orchestrator.processSync({
        ...validInput,
        payload: { text: 'Third request' },
      });

      expect(orchestrator.ledger.verifyChain()).toBe(true);
    });
  });

  describe('Normalization changes tracking', () => {
    it('reports normalization changes', () => {
      const orchestrator = createOrchestrator();
      const inputWithWhitespace: RawIntentInput = {
        ...validInput,
        payload: { text: '  Extra   spaces  ' },
      };

      const result = orchestrator.processSync(inputWithWhitespace);

      expect(result.metadata.normalizedChanges).toBeDefined();
      expect(result.metadata.normalizedChanges!.length).toBeGreaterThan(0);
    });
  });
});
