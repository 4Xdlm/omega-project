/**
 * @fileoverview CLASSIFIER scoring tests.
 * INV-CLASSIFIER-03: Score normalized [0, 1]
 * Target: 40 tests
 */

import { describe, it, expect } from 'vitest';
import {
  computeScoreBreakdown,
  normalizeScore,
  computeFinalScore,
  classificationFromScore,
  getBaseScore,
  createMatchAllRule,
} from '../../src/classifier/index.js';
import type { RuntimeEvent, ClassificationRule } from '../../src/types/index.js';

function createTestEvent(): RuntimeEvent {
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
  };
}

describe('CLASSIFIER Scoring', () => {
  describe('normalizeScore', () => {
    it('returns score unchanged if in range', () => {
      expect(normalizeScore(0.5)).toBe(0.5);
    });

    it('clamps negative scores to 0', () => {
      expect(normalizeScore(-0.5)).toBe(0);
    });

    it('clamps scores > 1 to 1', () => {
      expect(normalizeScore(1.5)).toBe(1);
    });

    it('returns 0 for 0', () => {
      expect(normalizeScore(0)).toBe(0);
    });

    it('returns 1 for 1', () => {
      expect(normalizeScore(1)).toBe(1);
    });

    it('handles NaN', () => {
      expect(normalizeScore(NaN)).toBe(0.5);
    });

    it('handles Infinity', () => {
      expect(normalizeScore(Infinity)).toBe(0.5);
    });

    it('handles -Infinity', () => {
      expect(normalizeScore(-Infinity)).toBe(0.5);
    });

    it('handles very small positive number', () => {
      expect(normalizeScore(0.0001)).toBe(0.0001);
    });

    it('handles very small negative number', () => {
      expect(normalizeScore(-0.0001)).toBe(0);
    });
  });

  describe('computeFinalScore', () => {
    it('returns 0.5 for no matched rules', () => {
      expect(computeFinalScore([])).toBe(0.5);
    });

    it('returns 1 for ACCEPT rule', () => {
      const rules = [createMatchAllRule('accept', 'ACCEPT', 0, 1.0)];
      expect(computeFinalScore(rules)).toBe(1);
    });

    it('returns 0 for BLOCK rule', () => {
      const rules = [createMatchAllRule('block', 'BLOCK', 0, 1.0)];
      expect(computeFinalScore(rules)).toBe(0);
    });

    it('returns 0.5 for ALERT rule', () => {
      const rules = [createMatchAllRule('alert', 'ALERT', 0, 1.0)];
      expect(computeFinalScore(rules)).toBe(0.5);
    });

    it('computes weighted average for multiple rules', () => {
      const rules = [
        createMatchAllRule('accept', 'ACCEPT', 0, 1.0),
        createMatchAllRule('block', 'BLOCK', 0, 1.0),
      ];
      expect(computeFinalScore(rules)).toBe(0.5);
    });

    it('respects weights', () => {
      const rules = [
        createMatchAllRule('accept', 'ACCEPT', 0, 0.8),
        createMatchAllRule('block', 'BLOCK', 0, 0.2),
      ];
      // (1 * 0.8 + 0 * 0.2) / (0.8 + 0.2) = 0.8
      expect(computeFinalScore(rules)).toBe(0.8);
    });

    it('handles zero total weight', () => {
      const rules = [createMatchAllRule('zero', 'ACCEPT', 0, 0)];
      expect(computeFinalScore(rules)).toBe(0.5);
    });
  });

  describe('classificationFromScore', () => {
    it('returns ACCEPT for score >= 0.7', () => {
      expect(classificationFromScore(0.7)).toBe('ACCEPT');
      expect(classificationFromScore(0.8)).toBe('ACCEPT');
      expect(classificationFromScore(1.0)).toBe('ACCEPT');
    });

    it('returns ALERT for score >= 0.3 and < 0.7', () => {
      expect(classificationFromScore(0.3)).toBe('ALERT');
      expect(classificationFromScore(0.5)).toBe('ALERT');
      expect(classificationFromScore(0.69)).toBe('ALERT');
    });

    it('returns BLOCK for score < 0.3', () => {
      expect(classificationFromScore(0.0)).toBe('BLOCK');
      expect(classificationFromScore(0.1)).toBe('BLOCK');
      expect(classificationFromScore(0.29)).toBe('BLOCK');
    });

    it('handles boundary at 0.7', () => {
      expect(classificationFromScore(0.699)).toBe('ALERT');
      expect(classificationFromScore(0.700)).toBe('ACCEPT');
    });

    it('handles boundary at 0.3', () => {
      expect(classificationFromScore(0.299)).toBe('BLOCK');
      expect(classificationFromScore(0.300)).toBe('ALERT');
    });

    it('normalizes out-of-range scores', () => {
      expect(classificationFromScore(-1)).toBe('BLOCK');
      expect(classificationFromScore(2)).toBe('ACCEPT');
    });
  });

  describe('getBaseScore', () => {
    it('returns 1 for ACCEPT', () => {
      expect(getBaseScore('ACCEPT')).toBe(1);
    });

    it('returns 0.5 for ALERT', () => {
      expect(getBaseScore('ALERT')).toBe(0.5);
    });

    it('returns 0 for BLOCK', () => {
      expect(getBaseScore('BLOCK')).toBe(0);
    });
  });

  describe('computeScoreBreakdown', () => {
    it('returns breakdown for no rules', () => {
      const breakdown = computeScoreBreakdown(createTestEvent(), []);
      expect(breakdown.finalScore).toBe(0.5);
      expect(breakdown.ruleScores).toEqual([]);
    });

    it('returns breakdown for single matching rule', () => {
      const rules = [createMatchAllRule('accept', 'ACCEPT', 0, 1.0)];
      const breakdown = computeScoreBreakdown(createTestEvent(), rules);
      expect(breakdown.ruleScores).toHaveLength(1);
      expect(breakdown.ruleScores[0]?.matched).toBe(true);
    });

    it('tracks non-matching rules', () => {
      const rules: ClassificationRule[] = [{
        id: 'no-match',
        priority: 0,
        condition: () => false,
        action: 'ACCEPT',
        weight: 1.0,
      }];
      const breakdown = computeScoreBreakdown(createTestEvent(), rules);
      expect(breakdown.ruleScores[0]?.matched).toBe(false);
    });

    it('computes weighted score correctly', () => {
      const rules = [
        createMatchAllRule('accept', 'ACCEPT', 0, 0.5),
        createMatchAllRule('block', 'BLOCK', 0, 0.5),
      ];
      const breakdown = computeScoreBreakdown(createTestEvent(), rules);
      expect(breakdown.weightedScore).toBe(0.5);
    });

    it('includes rule contributions', () => {
      const rules = [createMatchAllRule('test', 'ACCEPT', 0, 0.8)];
      const breakdown = computeScoreBreakdown(createTestEvent(), rules);
      expect(breakdown.ruleScores[0]?.contribution).toBe(0.8);
    });

    it('finalScore is normalized', () => {
      const rules = [createMatchAllRule('accept', 'ACCEPT', 0, 1.0)];
      const breakdown = computeScoreBreakdown(createTestEvent(), rules);
      expect(breakdown.finalScore).toBeGreaterThanOrEqual(0);
      expect(breakdown.finalScore).toBeLessThanOrEqual(1);
    });
  });

  describe('INV-CLASSIFIER-03: Score normalized [0, 1]', () => {
    it('score is never negative', () => {
      for (let i = -10; i <= 10; i++) {
        expect(normalizeScore(i)).toBeGreaterThanOrEqual(0);
      }
    });

    it('score is never > 1', () => {
      for (let i = -10; i <= 10; i++) {
        expect(normalizeScore(i)).toBeLessThanOrEqual(1);
      }
    });

    it('computeFinalScore is normalized', () => {
      const testCases = [
        [],
        [createMatchAllRule('a', 'ACCEPT', 0, 1)],
        [createMatchAllRule('a', 'BLOCK', 0, 1)],
        [
          createMatchAllRule('a', 'ACCEPT', 0, 0.9),
          createMatchAllRule('b', 'BLOCK', 0, 0.1),
        ],
      ];

      for (const rules of testCases) {
        const score = computeFinalScore(rules);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });

    it('handles extreme weight combinations', () => {
      const rules = [
        createMatchAllRule('a', 'ACCEPT', 0, 0.999),
        createMatchAllRule('b', 'BLOCK', 0, 0.001),
      ];
      const score = computeFinalScore(rules);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });
});
