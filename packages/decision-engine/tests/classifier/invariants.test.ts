/**
 * @fileoverview CLASSIFIER invariant tests.
 * Tests for INV-CLASSIFIER-01 through INV-CLASSIFIER-05
 * Target: 20 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createClassifier,
  DefaultClassifier,
  createMatchAllRule,
  createDefaultRules,
  normalizeScore,
} from '../../src/classifier/index.js';
import type { RuntimeEvent } from '../../src/types/index.js';

function createTestEvent(overrides: Partial<RuntimeEvent> = {}): RuntimeEvent {
  return {
    id: 'evt-001',
    timestamp: 1000,
    type: 'VERDICT_OBSERVED',
    verdict: {
      id: 'v-001',
      timestamp: 999,
      source: 'ORACLE',
      verdict: 'ACCEPT',
      payload: {},
      hash: 'hash123',
    },
    metadata: {
      observedAt: 1000,
      hash: 'event-hash',
    },
    ...overrides,
  };
}

describe('CLASSIFIER Invariants', () => {
  describe('INV-CLASSIFIER-01: Determinism (same event → same result)', () => {
    it('produces identical result for same event', () => {
      const classifier = createClassifier({ rules: createDefaultRules() });
      const event = createTestEvent();

      const result1 = classifier.classify(event);
      const result2 = classifier.classify(event);

      expect(result1.classification).toBe(result2.classification);
      expect(result1.score).toBe(result2.score);
      expect(result1.matchedRules).toEqual(result2.matchedRules);
    });

    it('produces same result across 100 calls', () => {
      const classifier = createClassifier({ rules: createDefaultRules() });
      const event = createTestEvent();
      const firstResult = classifier.classify(event);

      for (let i = 0; i < 100; i++) {
        const result = classifier.classify(event);
        expect(result.classification).toBe(firstResult.classification);
        expect(result.score).toBe(firstResult.score);
      }
    });

    it('deterministic with different event IDs but same content', () => {
      const classifier = createClassifier({ rules: createDefaultRules() });
      const event1 = createTestEvent({ id: 'event-1' });
      const event2 = createTestEvent({ id: 'event-2' });

      const result1 = classifier.classify(event1);
      const result2 = classifier.classify(event2);

      expect(result1.classification).toBe(result2.classification);
      expect(result1.score).toBe(result2.score);
    });

    it('deterministic with frozen clock', () => {
      const classifier = createClassifier({
        clock: () => 5000,
        rules: createDefaultRules(),
      });
      const event = createTestEvent();

      const result1 = classifier.classify(event);
      const result2 = classifier.classify(event);

      expect(result1.timestamp).toBe(5000);
      expect(result2.timestamp).toBe(5000);
    });
  });

  describe('INV-CLASSIFIER-02: Rules ordered by priority (desc)', () => {
    it('maintains priority order after adding rules', () => {
      const classifier = createClassifier();
      classifier.addRule(createMatchAllRule('low', 'ACCEPT', 10));
      classifier.addRule(createMatchAllRule('high', 'ACCEPT', 100));
      classifier.addRule(createMatchAllRule('mid', 'ACCEPT', 50));

      const rules = classifier.getRules();
      expect(rules[0]?.priority).toBe(100);
      expect(rules[1]?.priority).toBe(50);
      expect(rules[2]?.priority).toBe(10);
    });

    it('highest priority rule determines classification', () => {
      const classifier = createClassifier();
      classifier.addRule(createMatchAllRule('low', 'BLOCK', 10));
      classifier.addRule(createMatchAllRule('high', 'ACCEPT', 100));

      const result = classifier.classify(createTestEvent());
      expect(result.classification).toBe('ACCEPT');
    });

    it('maintains order after removal', () => {
      const classifier = createClassifier();
      classifier.addRule(createMatchAllRule('a', 'ACCEPT', 100));
      classifier.addRule(createMatchAllRule('b', 'ACCEPT', 50));
      classifier.addRule(createMatchAllRule('c', 'ACCEPT', 10));
      classifier.removeRule('b');

      const rules = classifier.getRules();
      expect(rules[0]?.id).toBe('a');
      expect(rules[1]?.id).toBe('c');
    });
  });

  describe('INV-CLASSIFIER-03: Score normalized [0, 1]', () => {
    it('score is within valid range', () => {
      const classifier = createClassifier({ rules: createDefaultRules() });
      const events = [
        createTestEvent({ verdict: { ...createTestEvent().verdict, verdict: 'ACCEPT' } }),
        createTestEvent({ verdict: { ...createTestEvent().verdict, verdict: 'REJECT' } }),
        createTestEvent({ verdict: { ...createTestEvent().verdict, verdict: 'CONDITIONAL' } }),
      ];

      for (const event of events) {
        const result = classifier.classify(event);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      }
    });

    it('normalizeScore enforces bounds', () => {
      expect(normalizeScore(-100)).toBe(0);
      expect(normalizeScore(100)).toBe(1);
      expect(normalizeScore(NaN)).toBe(0.5);
    });

    it('score is 0.5 with no matching rules', () => {
      const classifier = createClassifier();
      classifier.addRule({
        id: 'no-match',
        priority: 100,
        condition: () => false,
        action: 'ACCEPT',
        weight: 1,
      });
      const result = classifier.classify(createTestEvent());
      expect(result.score).toBe(0.5);
    });
  });

  describe('INV-CLASSIFIER-04: Performance <50ms per event', () => {
    it('single classification under 50ms', () => {
      const classifier = createClassifier({ rules: createDefaultRules() });
      const event = createTestEvent();

      const start = performance.now();
      classifier.classify(event);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('performance maintained with 100 rules', () => {
      const classifier = createClassifier();
      for (let i = 0; i < 100; i++) {
        classifier.addRule(createMatchAllRule(`rule-${i}`, 'ACCEPT', i));
      }

      const event = createTestEvent();
      const start = performance.now();
      classifier.classify(event);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });

  describe('INV-CLASSIFIER-05: No event left unclassified', () => {
    it('always returns a classification', () => {
      const classifier = createClassifier();
      const result = classifier.classify(createTestEvent());
      expect(result.classification).toBeDefined();
      expect(['ACCEPT', 'ALERT', 'BLOCK']).toContain(result.classification);
    });

    it('uses default classification when no rules match', () => {
      const classifier = createClassifier({ defaultClassification: 'BLOCK' });
      classifier.addRule({
        id: 'no-match',
        priority: 100,
        condition: () => false,
        action: 'ACCEPT',
        weight: 1,
      });
      const result = classifier.classify(createTestEvent());
      expect(result.classification).toBe('BLOCK');
    });

    it('classifies even with throwing rule', () => {
      const classifier = createClassifier({ defaultClassification: 'ALERT' });
      classifier.addRule({
        id: 'throws',
        priority: 100,
        condition: () => { throw new Error(); },
        action: 'ACCEPT',
        weight: 1,
      });
      const result = classifier.classify(createTestEvent());
      expect(result.classification).toBeDefined();
    });

    it('result always has all required fields', () => {
      const classifier = createClassifier({ rules: createDefaultRules() });
      const result = classifier.classify(createTestEvent());

      expect(result.event).toBeDefined();
      expect(result.classification).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.matchedRules).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });
});
