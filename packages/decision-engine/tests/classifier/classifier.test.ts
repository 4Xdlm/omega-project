/**
 * @fileoverview CLASSIFIER unit tests.
 * Target: 80 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createClassifier,
  DefaultClassifier,
  createDefaultRules,
  createMatchAllRule,
  createSourceRule,
  createVerdictRule,
} from '../../src/classifier/index.js';
import type { RuntimeEvent, ClassificationRule } from '../../src/types/index.js';

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

function createTestRule(overrides: Partial<ClassificationRule> = {}): ClassificationRule {
  return {
    id: 'rule-001',
    priority: 50,
    condition: () => true,
    action: 'ACCEPT',
    weight: 1.0,
    ...overrides,
  };
}

describe('CLASSIFIER', () => {
  describe('createClassifier', () => {
    it('creates a classifier instance', () => {
      const classifier = createClassifier();
      expect(classifier).toBeDefined();
    });

    it('creates classifier with custom clock', () => {
      let time = 5000;
      const classifier = createClassifier({ clock: () => time++ });
      classifier.addRule(createMatchAllRule('default', 'ACCEPT'));
      const result = classifier.classify(createTestEvent());
      expect(result.timestamp).toBe(5000);
    });

    it('creates classifier with default classification', () => {
      const classifier = createClassifier({ defaultClassification: 'BLOCK' });
      const result = classifier.classify(createTestEvent());
      expect(result.classification).toBe('BLOCK');
    });

    it('creates classifier with initial rules', () => {
      const rules = [createTestRule({ id: 'initial' })];
      const classifier = createClassifier({ rules });
      expect(classifier.getRules()).toHaveLength(1);
    });
  });

  describe('DefaultClassifier', () => {
    let classifier: DefaultClassifier;

    beforeEach(() => {
      classifier = new DefaultClassifier();
    });

    describe('classify', () => {
      it('classifies event with no rules as default', () => {
        const result = classifier.classify(createTestEvent());
        expect(result.classification).toBe('ALERT');
      });

      it('classifies event matching ACCEPT rule', () => {
        classifier.addRule(createMatchAllRule('accept', 'ACCEPT'));
        const result = classifier.classify(createTestEvent());
        expect(result.classification).toBe('ACCEPT');
      });

      it('classifies event matching ALERT rule', () => {
        classifier.addRule(createMatchAllRule('alert', 'ALERT'));
        const result = classifier.classify(createTestEvent());
        expect(result.classification).toBe('ALERT');
      });

      it('classifies event matching BLOCK rule', () => {
        classifier.addRule(createMatchAllRule('block', 'BLOCK'));
        const result = classifier.classify(createTestEvent());
        expect(result.classification).toBe('BLOCK');
      });

      it('uses highest priority rule for classification', () => {
        classifier.addRule(createTestRule({ id: 'low', priority: 10, action: 'BLOCK' }));
        classifier.addRule(createTestRule({ id: 'high', priority: 100, action: 'ACCEPT' }));
        const result = classifier.classify(createTestEvent());
        expect(result.classification).toBe('ACCEPT');
      });

      it('includes matched rule IDs', () => {
        classifier.addRule(createTestRule({ id: 'rule1' }));
        classifier.addRule(createTestRule({ id: 'rule2' }));
        const result = classifier.classify(createTestEvent());
        expect(result.matchedRules).toContain('rule1');
        expect(result.matchedRules).toContain('rule2');
      });

      it('includes reasoning', () => {
        classifier.addRule(createTestRule({ id: 'test-rule' }));
        const result = classifier.classify(createTestEvent());
        expect(result.reasoning).toContain('test-rule');
      });

      it('includes timestamp', () => {
        classifier.addRule(createMatchAllRule('default', 'ACCEPT'));
        const result = classifier.classify(createTestEvent());
        expect(result.timestamp).toBeDefined();
        expect(result.timestamp).toBeGreaterThan(0);
      });

      it('includes original event in result', () => {
        classifier.addRule(createMatchAllRule('default', 'ACCEPT'));
        const event = createTestEvent({ id: 'specific-event' });
        const result = classifier.classify(event);
        expect(result.event.id).toBe('specific-event');
      });

      it('computes score between 0 and 1', () => {
        classifier.addRule(createTestRule({ weight: 0.5 }));
        const result = classifier.classify(createTestEvent());
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });

      it('handles rule that does not match', () => {
        classifier.addRule(createTestRule({
          id: 'no-match',
          condition: () => false,
        }));
        const result = classifier.classify(createTestEvent());
        expect(result.matchedRules).not.toContain('no-match');
      });

      it('handles mix of matching and non-matching rules', () => {
        classifier.addRule(createTestRule({ id: 'matches', condition: () => true }));
        classifier.addRule(createTestRule({ id: 'no-match', condition: () => false }));
        const result = classifier.classify(createTestEvent());
        expect(result.matchedRules).toContain('matches');
        expect(result.matchedRules).not.toContain('no-match');
      });

      it('handles rule condition throwing error', () => {
        classifier.addRule(createTestRule({
          id: 'throws',
          condition: () => { throw new Error('test'); },
        }));
        classifier.addRule(createMatchAllRule('fallback', 'ACCEPT'));
        const result = classifier.classify(createTestEvent());
        expect(result.matchedRules).not.toContain('throws');
      });
    });

    describe('addRule', () => {
      it('adds a valid rule', () => {
        classifier.addRule(createTestRule());
        expect(classifier.getRules()).toHaveLength(1);
      });

      it('maintains priority order', () => {
        classifier.addRule(createTestRule({ id: 'low', priority: 10 }));
        classifier.addRule(createTestRule({ id: 'high', priority: 100 }));
        classifier.addRule(createTestRule({ id: 'mid', priority: 50 }));
        const rules = classifier.getRules();
        expect(rules[0]?.id).toBe('high');
        expect(rules[1]?.id).toBe('mid');
        expect(rules[2]?.id).toBe('low');
      });

      it('throws on duplicate ID', () => {
        classifier.addRule(createTestRule({ id: 'dup' }));
        expect(() => classifier.addRule(createTestRule({ id: 'dup' }))).toThrow();
      });

      it('throws on invalid rule - missing id', () => {
        expect(() => classifier.addRule({ ...createTestRule(), id: '' })).toThrow();
      });

      it('throws on invalid rule - invalid priority', () => {
        expect(() => classifier.addRule({
          ...createTestRule(),
          priority: NaN,
        })).toThrow();
      });

      it('throws on invalid rule - invalid action', () => {
        expect(() => classifier.addRule({
          ...createTestRule(),
          action: 'INVALID' as 'ACCEPT',
        })).toThrow();
      });

      it('throws on invalid rule - weight > 1', () => {
        expect(() => classifier.addRule({
          ...createTestRule(),
          weight: 1.5,
        })).toThrow();
      });

      it('throws on invalid rule - negative weight', () => {
        expect(() => classifier.addRule({
          ...createTestRule(),
          weight: -0.5,
        })).toThrow();
      });
    });

    describe('removeRule', () => {
      it('removes existing rule', () => {
        classifier.addRule(createTestRule({ id: 'to-remove' }));
        const removed = classifier.removeRule('to-remove');
        expect(removed).toBe(true);
        expect(classifier.getRules()).toHaveLength(0);
      });

      it('returns false for non-existent rule', () => {
        const removed = classifier.removeRule('does-not-exist');
        expect(removed).toBe(false);
      });

      it('maintains order after removal', () => {
        classifier.addRule(createTestRule({ id: 'a', priority: 30 }));
        classifier.addRule(createTestRule({ id: 'b', priority: 20 }));
        classifier.addRule(createTestRule({ id: 'c', priority: 10 }));
        classifier.removeRule('b');
        const rules = classifier.getRules();
        expect(rules[0]?.id).toBe('a');
        expect(rules[1]?.id).toBe('c');
      });
    });

    describe('getRules', () => {
      it('returns empty array initially', () => {
        expect(classifier.getRules()).toEqual([]);
      });

      it('returns rules in priority order', () => {
        classifier.addRule(createTestRule({ id: 'low', priority: 1 }));
        classifier.addRule(createTestRule({ id: 'high', priority: 100 }));
        const rules = classifier.getRules();
        expect(rules[0]?.priority).toBeGreaterThan(rules[1]?.priority ?? 0);
      });

      it('returns frozen array', () => {
        classifier.addRule(createTestRule());
        const rules = classifier.getRules();
        expect(Object.isFrozen(rules)).toBe(true);
      });
    });

    describe('clearRules', () => {
      it('removes all rules', () => {
        classifier.addRule(createTestRule({ id: 'a' }));
        classifier.addRule(createTestRule({ id: 'b' }));
        classifier.clearRules();
        expect(classifier.getRules()).toHaveLength(0);
      });

      it('allows adding rules after clear', () => {
        classifier.addRule(createTestRule({ id: 'before' }));
        classifier.clearRules();
        classifier.addRule(createTestRule({ id: 'after' }));
        expect(classifier.getRules()).toHaveLength(1);
        expect(classifier.getRules()[0]?.id).toBe('after');
      });
    });
  });

  describe('Rule factories', () => {
    describe('createMatchAllRule', () => {
      it('creates rule that matches all events', () => {
        const rule = createMatchAllRule('all', 'ACCEPT');
        expect(rule.condition(createTestEvent())).toBe(true);
      });

      it('uses specified action', () => {
        const rule = createMatchAllRule('all', 'BLOCK');
        expect(rule.action).toBe('BLOCK');
      });

      it('uses default priority', () => {
        const rule = createMatchAllRule('all', 'ACCEPT');
        expect(rule.priority).toBe(0);
      });

      it('accepts custom priority', () => {
        const rule = createMatchAllRule('all', 'ACCEPT', 100);
        expect(rule.priority).toBe(100);
      });

      it('accepts custom weight', () => {
        const rule = createMatchAllRule('all', 'ACCEPT', 0, 0.5);
        expect(rule.weight).toBe(0.5);
      });
    });

    describe('createSourceRule', () => {
      it('matches ORACLE source', () => {
        const rule = createSourceRule('oracle', 'ORACLE', 'ACCEPT');
        const event = createTestEvent({
          verdict: { ...createTestEvent().verdict, source: 'ORACLE' },
        });
        expect(rule.condition(event)).toBe(true);
      });

      it('does not match wrong source', () => {
        const rule = createSourceRule('oracle', 'ORACLE', 'ACCEPT');
        const event = createTestEvent({
          verdict: { ...createTestEvent().verdict, source: 'DECISION_ENGINE' },
        });
        expect(rule.condition(event)).toBe(false);
      });

      it('matches DECISION_ENGINE source', () => {
        const rule = createSourceRule('de', 'DECISION_ENGINE', 'ACCEPT');
        const event = createTestEvent({
          verdict: { ...createTestEvent().verdict, source: 'DECISION_ENGINE' },
        });
        expect(rule.condition(event)).toBe(true);
      });
    });

    describe('createVerdictRule', () => {
      it('matches ACCEPT verdict', () => {
        const rule = createVerdictRule('accept', 'ACCEPT', 'ACCEPT');
        const event = createTestEvent({
          verdict: { ...createTestEvent().verdict, verdict: 'ACCEPT' },
        });
        expect(rule.condition(event)).toBe(true);
      });

      it('matches REJECT verdict', () => {
        const rule = createVerdictRule('reject', 'REJECT', 'BLOCK');
        const event = createTestEvent({
          verdict: { ...createTestEvent().verdict, verdict: 'REJECT' },
        });
        expect(rule.condition(event)).toBe(true);
      });

      it('matches CONDITIONAL verdict', () => {
        const rule = createVerdictRule('cond', 'CONDITIONAL', 'ALERT');
        const event = createTestEvent({
          verdict: { ...createTestEvent().verdict, verdict: 'CONDITIONAL' },
        });
        expect(rule.condition(event)).toBe(true);
      });

      it('does not match wrong verdict', () => {
        const rule = createVerdictRule('accept', 'ACCEPT', 'ACCEPT');
        const event = createTestEvent({
          verdict: { ...createTestEvent().verdict, verdict: 'REJECT' },
        });
        expect(rule.condition(event)).toBe(false);
      });
    });

    describe('createDefaultRules', () => {
      it('creates standard rule set', () => {
        const rules = createDefaultRules();
        expect(rules.length).toBeGreaterThan(0);
      });

      it('includes REJECT → BLOCK rule', () => {
        const rules = createDefaultRules();
        const classifier = createClassifier({ rules });
        const event = createTestEvent({
          verdict: { ...createTestEvent().verdict, verdict: 'REJECT' },
        });
        const result = classifier.classify(event);
        expect(result.classification).toBe('BLOCK');
      });

      it('includes CONDITIONAL → ALERT rule', () => {
        const rules = createDefaultRules();
        const classifier = createClassifier({ rules });
        const event = createTestEvent({
          verdict: { ...createTestEvent().verdict, verdict: 'CONDITIONAL' },
        });
        const result = classifier.classify(event);
        expect(result.classification).toBe('ALERT');
      });

      it('includes ACCEPT → ACCEPT rule', () => {
        const rules = createDefaultRules();
        const classifier = createClassifier({ rules });
        const event = createTestEvent({
          verdict: { ...createTestEvent().verdict, verdict: 'ACCEPT' },
        });
        const result = classifier.classify(event);
        expect(result.classification).toBe('ACCEPT');
      });
    });
  });

  describe('Edge cases', () => {
    it('handles event with minimal data', () => {
      const classifier = createClassifier();
      classifier.addRule(createMatchAllRule('all', 'ACCEPT'));
      const event = createTestEvent();
      const result = classifier.classify(event);
      expect(result).toBeDefined();
    });

    it('handles many rules', () => {
      const classifier = createClassifier();
      for (let i = 0; i < 100; i++) {
        classifier.addRule(createTestRule({ id: `rule-${i}`, priority: i }));
      }
      const result = classifier.classify(createTestEvent());
      expect(result.matchedRules.length).toBe(100);
    });

    it('handles rules with same priority', () => {
      const classifier = createClassifier();
      classifier.addRule(createTestRule({ id: 'a', priority: 50 }));
      classifier.addRule(createTestRule({ id: 'b', priority: 50 }));
      const rules = classifier.getRules();
      expect(rules).toHaveLength(2);
    });

    it('handles zero-weight rules', () => {
      const classifier = createClassifier();
      classifier.addRule(createTestRule({ id: 'zero', weight: 0 }));
      const result = classifier.classify(createTestEvent());
      expect(result).toBeDefined();
    });
  });
});
