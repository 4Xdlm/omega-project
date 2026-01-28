/**
 * OMEGA Orchestrator Full Pipeline Integration Tests v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * End-to-end pipeline tests
 */

import { describe, it, expect } from 'vitest';
import { createOrchestrator, type Orchestrator } from '../../../src/orchestrator/orchestrator';
import type { RawIntentInput } from '../../../src/orchestrator/intent-schema';

describe('Full Pipeline Integration — Phase G', () => {
  const baseInput: RawIntentInput = {
    actorId: 'ACT-user-12345678',
    goal: 'DRAFT',
    constraints: {
      maxLength: 2000,
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
      text: 'Write a compelling story about a brave explorer.',
    },
  };

  describe('Happy path', () => {
    it('processes valid intent through all stages', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync(baseInput);

      expect(result.success).toBe(true);
      expect(result.stage).toBe('COMPLETED');
      expect(result.content).toBeDefined();
      expect(result.content!.length).toBeGreaterThan(0);
    });

    it('records complete audit trail in ledger', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync(baseInput);
      const entries = orchestrator.ledger.getEntriesByIntentId(result.intentId);

      // Should have all stages recorded
      const statuses = entries.map(e => e.status);
      expect(statuses).toContain('RECEIVED');
      expect(statuses).toContain('VALIDATED');
      expect(statuses).toContain('POLICY_CHECKED');
      expect(statuses).toContain('CONTRACT_CREATED');
      expect(statuses).toContain('GENERATING');
      expect(statuses).toContain('COMPLETED');
    });

    it('maintains ledger chain integrity (G-INV-06)', () => {
      const orchestrator = createOrchestrator();

      orchestrator.processSync(baseInput);
      orchestrator.processSync({ ...baseInput, payload: { text: 'Second story' } });
      orchestrator.processSync({ ...baseInput, payload: { text: 'Third story' } });

      expect(orchestrator.ledger.verifyChain()).toBe(true);
    });

    it('produces deterministic output (G-INV-04)', () => {
      const orch1 = createOrchestrator();
      const orch2 = createOrchestrator();

      const result1 = orch1.processSync(baseInput);
      const result2 = orch2.processSync(baseInput);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.content).toBe(result2.content);
      expect(result1.metadata.seed).toBe(result2.metadata.seed);
    });
  });

  describe('Multiple actors', () => {
    it('processes intents from different actors', () => {
      const orchestrator = createOrchestrator();

      const result1 = orchestrator.processSync({
        ...baseInput,
        actorId: 'ACT-user-11111111',
        payload: { text: 'Story from actor 1' },
      });

      const result2 = orchestrator.processSync({
        ...baseInput,
        actorId: 'ACT-user-22222222',
        payload: { text: 'Story from actor 2' },
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.actorId).toBe('ACT-user-11111111');
      expect(result2.actorId).toBe('ACT-user-22222222');
    });

    it('isolates ledger entries by actor', () => {
      const orchestrator = createOrchestrator();

      orchestrator.processSync({
        ...baseInput,
        actorId: 'ACT-user-11111111',
        payload: { text: 'Story 1' },
      });

      orchestrator.processSync({
        ...baseInput,
        actorId: 'ACT-user-22222222',
        payload: { text: 'Story 2' },
      });

      const actor1Entries = orchestrator.ledger.getEntriesByActorId('ACT-user-11111111' as any);
      const actor2Entries = orchestrator.ledger.getEntriesByActorId('ACT-user-22222222' as any);

      expect(actor1Entries.length).toBeGreaterThan(0);
      expect(actor2Entries.length).toBeGreaterThan(0);
      expect(actor1Entries.every(e => e.actorId === 'ACT-user-11111111')).toBe(true);
      expect(actor2Entries.every(e => e.actorId === 'ACT-user-22222222')).toBe(true);
    });
  });

  describe('Different goals', () => {
    it('processes DRAFT goal', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...baseInput,
        goal: 'DRAFT',
      });

      expect(result.success).toBe(true);
    });

    it('processes REWRITE goal', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...baseInput,
        goal: 'REWRITE',
      });

      expect(result.success).toBe(true);
    });

    it('processes SUMMARIZE goal', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...baseInput,
        goal: 'SUMMARIZE',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Different tones', () => {
    it('processes NEUTRAL tone', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...baseInput,
        tone: { tone: 'NEUTRAL', intensity: 'MEDIUM' },
      });

      expect(result.success).toBe(true);
    });

    it('processes NARRATIVE tone', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...baseInput,
        tone: { tone: 'NARRATIVE', intensity: 'HIGH' },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Metadata tracking', () => {
    it('includes policy ID in metadata', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync(baseInput);

      expect(result.metadata.policyId).toBeDefined();
      expect(result.metadata.policyId).toMatch(/^POL-v\d+-[a-f0-9]{8}$/);
    });

    it('includes contract ID in metadata', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync(baseInput);

      expect(result.metadata.contractId).toBeDefined();
      expect(result.metadata.contractId).toMatch(/^CON-[a-f0-9]{16}$/);
    });

    it('includes seed in metadata', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync(baseInput);

      expect(result.metadata.seed).toBeDefined();
      expect(typeof result.metadata.seed).toBe('number');
    });

    it('includes processing time', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync(baseInput);

      expect(result.metadata.processingMs).toBeDefined();
      expect(result.metadata.processingMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Async processing', () => {
    it('processes async and returns same result', async () => {
      const orchestrator = createOrchestrator();

      const asyncResult = await orchestrator.process(baseInput);
      const syncOrch = createOrchestrator();
      const syncResult = syncOrch.processSync(baseInput);

      expect(asyncResult.success).toBe(syncResult.success);
      expect(asyncResult.content).toBe(syncResult.content);
    });
  });

  describe('Ledger snapshot', () => {
    it('captures complete state', () => {
      const orchestrator = createOrchestrator();

      orchestrator.processSync(baseInput);
      orchestrator.processSync({ ...baseInput, payload: { text: 'Another story' } });

      const snapshot = orchestrator.getLedgerSnapshot();

      expect(snapshot.length).toBeGreaterThan(0);
      expect(Object.isFrozen(snapshot)).toBe(true);
    });
  });
});
