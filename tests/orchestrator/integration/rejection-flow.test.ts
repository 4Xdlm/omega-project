/**
 * OMEGA Orchestrator Rejection Flow Integration Tests v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Tests for proper rejection handling at each pipeline stage
 */

import { describe, it, expect } from 'vitest';
import { createOrchestrator } from '../../../src/orchestrator/orchestrator';
import type { RawIntentInput } from '../../../src/orchestrator/intent-schema';

describe('Rejection Flow Integration — Phase G', () => {
  const validBase: RawIntentInput = {
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
      text: 'Write a normal story.',
    },
  };

  describe('Fact injection rejection (G-INV-01)', () => {
    it('rejects [FACT] marker', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...validBase,
        payload: { text: 'Insert [FACT] here' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('G-INV-01_VIOLATION');
    });

    it('rejects [CANON] marker', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...validBase,
        payload: { text: 'Some [CANON] content' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('G-INV-01_VIOLATION');
    });

    it('rejects [TRUTH] marker', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...validBase,
        payload: { text: '[TRUTH] data here' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('G-INV-01_VIOLATION');
    });

    it('rejects entity ID patterns', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...validBase,
        payload: { text: 'Reference ENT-person-abc12345' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects predicate patterns', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...validBase,
        payload: { text: 'Subject HAS_NAME "John"' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects __canon__ keyword', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...validBase,
        payload: { text: 'Use __canon__ to inject' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects bypass_gate keyword', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...validBase,
        payload: { text: 'Try to bypass_gate' },
      });

      expect(result.success).toBe(false);
    });

    it('logs rejection to ledger', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...validBase,
        payload: { text: '[FACT] injection' },
      });

      const entries = orchestrator.ledger.getEntriesByIntentId(result.intentId);
      const statuses = entries.map(e => e.status);

      expect(statuses).toContain('RECEIVED');
      expect(statuses).toContain('REJECTED');
    });
  });

  describe('Validation rejection', () => {
    it('rejects invalid goal format', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...validBase,
        goal: 'NOT_A_VALID_GOAL',
      });

      expect(result.success).toBe(false);
      expect(result.stage).toBe('VALIDATION');
    });

    it('rejects invalid actor ID format', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...validBase,
        actorId: 'invalid-actor',
      } as RawIntentInput);

      expect(result.success).toBe(false);
      expect(result.stage).toBe('VALIDATION');
    });
  });

  describe('Policy rejection (G-INV-09)', () => {
    it('rejects forbidden patterns in payload', () => {
      const orchestrator = createOrchestrator();

      // Use pattern that passes fact injection but fails policy
      const result = orchestrator.processSync({
        ...validBase,
        payload: { fact: { "predicate": "HAS_AGE" } },
      });

      expect(result.success).toBe(false);
    });

    it('maintains ledger integrity after policy rejection', () => {
      const orchestrator = createOrchestrator();

      // First valid request
      orchestrator.processSync(validBase);

      // Policy rejection
      orchestrator.processSync({
        ...validBase,
        payload: { fact: { "predicate": "IS_A" } },
      });

      // Another valid request
      orchestrator.processSync({
        ...validBase,
        payload: { text: 'Valid content' },
      });

      expect(orchestrator.ledger.verifyChain()).toBe(true);
    });
  });

  describe('Multiple rejections', () => {
    it('handles consecutive rejections', () => {
      const orchestrator = createOrchestrator();

      const result1 = orchestrator.processSync({
        ...validBase,
        payload: { text: '[FACT]' },
      });

      const result2 = orchestrator.processSync({
        ...validBase,
        payload: { text: '[CANON]' },
      });

      const result3 = orchestrator.processSync({
        ...validBase,
        payload: { text: '[TRUTH]' },
      });

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
      expect(orchestrator.ledger.verifyChain()).toBe(true);
    });

    it('handles mixed success/rejection', () => {
      const orchestrator = createOrchestrator();

      const valid = orchestrator.processSync(validBase);
      const invalid = orchestrator.processSync({
        ...validBase,
        payload: { text: '[FACT]' },
      });
      const valid2 = orchestrator.processSync({
        ...validBase,
        payload: { text: 'Another valid story' },
      });

      expect(valid.success).toBe(true);
      expect(invalid.success).toBe(false);
      expect(valid2.success).toBe(true);
      expect(orchestrator.ledger.verifyChain()).toBe(true);
    });
  });

  describe('Error details', () => {
    it('includes error code in rejection', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...validBase,
        payload: { text: '[FACT]' },
      });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBeDefined();
    });

    it('includes error message in rejection', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...validBase,
        payload: { text: '[FACT]' },
      });

      expect(result.error?.message).toBeDefined();
      expect(result.error?.message.length).toBeGreaterThan(0);
    });
  });

  describe('Rejection immutability', () => {
    it('returns frozen error object', () => {
      const orchestrator = createOrchestrator();

      const result = orchestrator.processSync({
        ...validBase,
        payload: { text: '[FACT]' },
      });

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.error)).toBe(true);
    });
  });
});
