/**
 * @fileoverview CLASSIFIER rules tests.
 * Target: 40 tests
 */

import { describe, it, expect } from 'vitest';
import {
  sortRulesByPriority,
  isValidRule,
  createMatchAllRule,
  createSourceRule,
  createVerdictRule,
  createAndRule,
  createOrRule,
  createNotRule,
  createDefaultRules,
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

describe('CLASSIFIER Rules', () => {
  describe('sortRulesByPriority', () => {
    it('sorts rules by priority descending', () => {
      const rules: ClassificationRule[] = [
        createMatchAllRule('low', 'ACCEPT', 10),
        createMatchAllRule('high', 'ACCEPT', 100),
        createMatchAllRule('mid', 'ACCEPT', 50),
      ];
      const sorted = sortRulesByPriority(rules);
      expect(sorted[0]?.priority).toBe(100);
      expect(sorted[1]?.priority).toBe(50);
      expect(sorted[2]?.priority).toBe(10);
    });

    it('maintains order for same priority', () => {
      const rules: ClassificationRule[] = [
        createMatchAllRule('first', 'ACCEPT', 50),
        createMatchAllRule('second', 'ACCEPT', 50),
      ];
      const sorted = sortRulesByPriority(rules);
      expect(sorted).toHaveLength(2);
    });

    it('handles empty array', () => {
      expect(sortRulesByPriority([])).toEqual([]);
    });

    it('handles single rule', () => {
      const rules = [createMatchAllRule('only', 'ACCEPT', 50)];
      const sorted = sortRulesByPriority(rules);
      expect(sorted).toHaveLength(1);
    });

    it('does not modify original array', () => {
      const rules: ClassificationRule[] = [
        createMatchAllRule('low', 'ACCEPT', 10),
        createMatchAllRule('high', 'ACCEPT', 100),
      ];
      sortRulesByPriority(rules);
      expect(rules[0]?.priority).toBe(10);
    });
  });

  describe('isValidRule', () => {
    it('returns true for valid rule', () => {
      expect(isValidRule(createMatchAllRule('test', 'ACCEPT'))).toBe(true);
    });

    it('returns false for null', () => {
      expect(isValidRule(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValidRule(undefined)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isValidRule('string')).toBe(false);
      expect(isValidRule(123)).toBe(false);
    });

    it('returns false for missing id', () => {
      const rule = { ...createMatchAllRule('test', 'ACCEPT'), id: undefined };
      expect(isValidRule(rule)).toBe(false);
    });

    it('returns false for empty id', () => {
      const rule = { ...createMatchAllRule('test', 'ACCEPT'), id: '' };
      expect(isValidRule(rule)).toBe(false);
    });

    it('returns false for non-finite priority', () => {
      const rule = { ...createMatchAllRule('test', 'ACCEPT'), priority: NaN };
      expect(isValidRule(rule)).toBe(false);
    });

    it('returns false for non-function condition', () => {
      const rule = { ...createMatchAllRule('test', 'ACCEPT'), condition: 'not a function' };
      expect(isValidRule(rule)).toBe(false);
    });

    it('returns false for invalid action', () => {
      const rule = { ...createMatchAllRule('test', 'ACCEPT'), action: 'INVALID' };
      expect(isValidRule(rule)).toBe(false);
    });

    it('returns false for negative weight', () => {
      const rule = { ...createMatchAllRule('test', 'ACCEPT'), weight: -1 };
      expect(isValidRule(rule)).toBe(false);
    });

    it('returns false for weight > 1', () => {
      const rule = { ...createMatchAllRule('test', 'ACCEPT'), weight: 2 };
      expect(isValidRule(rule)).toBe(false);
    });
  });

  describe('createAndRule', () => {
    it('matches when all conditions match', () => {
      const rule = createAndRule(
        'and-rule',
        [
          (e) => e.verdict.source === 'ORACLE',
          (e) => e.verdict.verdict === 'ACCEPT',
        ],
        'ACCEPT'
      );
      const event = createTestEvent({
        verdict: {
          ...createTestEvent().verdict,
          source: 'ORACLE',
          verdict: 'ACCEPT',
        },
      });
      expect(rule.condition(event)).toBe(true);
    });

    it('does not match when one condition fails', () => {
      const rule = createAndRule(
        'and-rule',
        [
          (e) => e.verdict.source === 'ORACLE',
          (e) => e.verdict.verdict === 'REJECT',
        ],
        'ACCEPT'
      );
      const event = createTestEvent({
        verdict: {
          ...createTestEvent().verdict,
          source: 'ORACLE',
          verdict: 'ACCEPT',
        },
      });
      expect(rule.condition(event)).toBe(false);
    });

    it('handles empty conditions array', () => {
      const rule = createAndRule('empty', [], 'ACCEPT');
      expect(rule.condition(createTestEvent())).toBe(true);
    });

    it('handles single condition', () => {
      const rule = createAndRule(
        'single',
        [(e) => e.verdict.source === 'ORACLE'],
        'ACCEPT'
      );
      expect(rule.condition(createTestEvent())).toBe(true);
    });
  });

  describe('createOrRule', () => {
    it('matches when any condition matches', () => {
      const rule = createOrRule(
        'or-rule',
        [
          (e) => e.verdict.source === 'ORACLE',
          (e) => e.verdict.verdict === 'REJECT',
        ],
        'ACCEPT'
      );
      const event = createTestEvent({
        verdict: {
          ...createTestEvent().verdict,
          source: 'ORACLE',
          verdict: 'ACCEPT',
        },
      });
      expect(rule.condition(event)).toBe(true);
    });

    it('does not match when no conditions match', () => {
      const rule = createOrRule(
        'or-rule',
        [
          (e) => e.verdict.source === 'DECISION_ENGINE',
          (e) => e.verdict.verdict === 'REJECT',
        ],
        'ACCEPT'
      );
      const event = createTestEvent({
        verdict: {
          ...createTestEvent().verdict,
          source: 'ORACLE',
          verdict: 'ACCEPT',
        },
      });
      expect(rule.condition(event)).toBe(false);
    });

    it('handles empty conditions array', () => {
      const rule = createOrRule('empty', [], 'ACCEPT');
      expect(rule.condition(createTestEvent())).toBe(false);
    });

    it('handles single condition', () => {
      const rule = createOrRule(
        'single',
        [(e) => e.verdict.source === 'ORACLE'],
        'ACCEPT'
      );
      expect(rule.condition(createTestEvent())).toBe(true);
    });
  });

  describe('createNotRule', () => {
    it('inverts matching condition', () => {
      const rule = createNotRule(
        'not-rule',
        (e) => e.verdict.source === 'DECISION_ENGINE',
        'ACCEPT'
      );
      expect(rule.condition(createTestEvent())).toBe(true);
    });

    it('inverts non-matching condition', () => {
      const rule = createNotRule(
        'not-rule',
        (e) => e.verdict.source === 'ORACLE',
        'ACCEPT'
      );
      expect(rule.condition(createTestEvent())).toBe(false);
    });
  });

  describe('createDefaultRules', () => {
    it('creates non-empty rule set', () => {
      const rules = createDefaultRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('all rules are valid', () => {
      const rules = createDefaultRules();
      for (const rule of rules) {
        expect(isValidRule(rule)).toBe(true);
      }
    });

    it('rules are properly prioritized', () => {
      const rules = createDefaultRules();
      const sorted = sortRulesByPriority(rules);
      expect(sorted[0]?.priority).toBeGreaterThanOrEqual(sorted[sorted.length - 1]?.priority ?? 0);
    });

    it('includes REJECT blocking rule', () => {
      const rules = createDefaultRules();
      const rejectRule = rules.find(r => r.id.includes('reject'));
      expect(rejectRule).toBeDefined();
      expect(rejectRule?.action).toBe('BLOCK');
    });

    it('includes CONDITIONAL alert rule', () => {
      const rules = createDefaultRules();
      const conditionalRule = rules.find(r => r.id.includes('conditional'));
      expect(conditionalRule).toBeDefined();
      expect(conditionalRule?.action).toBe('ALERT');
    });

    it('includes ACCEPT accept rule', () => {
      const rules = createDefaultRules();
      const acceptRule = rules.find(r => r.id.includes('accept') && r.action === 'ACCEPT');
      expect(acceptRule).toBeDefined();
    });

    it('includes fallback rule', () => {
      const rules = createDefaultRules();
      const fallback = rules.find(r => r.id.includes('fallback'));
      expect(fallback).toBeDefined();
    });
  });

  describe('Complex rule combinations', () => {
    it('AND with OR nested', () => {
      const rule = createAndRule(
        'complex',
        [
          (e) => e.verdict.source === 'ORACLE',
          (e) => e.verdict.verdict === 'ACCEPT' || e.verdict.verdict === 'CONDITIONAL',
        ],
        'ACCEPT'
      );
      expect(rule.condition(createTestEvent())).toBe(true);
    });

    it('NOT with AND nested', () => {
      const isReject = (e: RuntimeEvent) =>
        e.verdict.source === 'ORACLE' && e.verdict.verdict === 'REJECT';
      const rule = createNotRule('not-reject', isReject, 'ACCEPT');
      expect(rule.condition(createTestEvent())).toBe(true);
    });

    it('multiple OR conditions', () => {
      const rule = createOrRule(
        'multi-or',
        [
          (e) => e.verdict.verdict === 'ACCEPT',
          (e) => e.verdict.verdict === 'CONDITIONAL',
          (e) => e.verdict.source === 'DECISION_ENGINE',
        ],
        'ALERT'
      );
      expect(rule.condition(createTestEvent())).toBe(true);
    });
  });
});
