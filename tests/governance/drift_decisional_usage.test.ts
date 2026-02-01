/**
 * DECISIONAL + USAGE DRIFT TESTS
 * Phase E.2 — TDD strict: tests BEFORE implementation
 *
 * Tests decisional drift (verdict distribution) and usage drift (sequence patterns)
 */

import { describe, it, expect } from 'vitest';
import { analyzeDecisionalDrift } from '../../src/governance/drift/decisional';
import { analyzeUsageDrift } from '../../src/governance/drift/usage';

// ─────────────────────────────────────────────────────────────
// DECISIONAL DRIFT TESTS
// ─────────────────────────────────────────────────────────────

describe('governance/drift/decisional', () => {
  describe('new verdict category detection', () => {
    it('detects new verdict category not in baseline', () => {
      const baseline = { PASS: 10, FAIL: 2, SKIP: 1, WARN: 0 };
      const current = { PASS: 8, FAIL: 3, SKIP: 1, WARN: 2 };

      const res = analyzeDecisionalDrift({
        baselineDistribution: baseline,
        currentDistribution: current,
        policy: { decisional: { allowNewCategories: false } }
      });

      expect(res.length).toBeGreaterThan(0);
      expect(res[0].kind).toBe('pattern');
      expect(res[0].summary).toContain('new verdict category');
    });

    it('does not report drift when verdict distributions match policy', () => {
      const baseline = { PASS: 10, FAIL: 2, SKIP: 1, WARN: 0 };
      const current = { PASS: 12, FAIL: 1, SKIP: 2, WARN: 0 };

      const res = analyzeDecisionalDrift({
        baselineDistribution: baseline,
        currentDistribution: current,
        policy: { decisional: { allowNewCategories: false } }
      });

      expect(res.length).toBe(0);
    });

    it('allows new categories when policy permits', () => {
      const baseline = { PASS: 10, FAIL: 2 };
      const current = { PASS: 8, FAIL: 3, SKIP: 5 };

      const res = analyzeDecisionalDrift({
        baselineDistribution: baseline,
        currentDistribution: current,
        policy: { decisional: { allowNewCategories: true } }
      });

      expect(res.length).toBe(0);
    });

    it('ignores zero-count categories in current', () => {
      const baseline = { PASS: 10, FAIL: 2 };
      const current = { PASS: 8, FAIL: 3, SKIP: 0, WARN: 0 };

      const res = analyzeDecisionalDrift({
        baselineDistribution: baseline,
        currentDistribution: current,
        policy: { decisional: { allowNewCategories: false } }
      });

      expect(res.length).toBe(0);
    });

    it('reports multiple new categories', () => {
      const baseline = { PASS: 10 };
      const current = { PASS: 8, FAIL: 3, SKIP: 2, WARN: 1 };

      const res = analyzeDecisionalDrift({
        baselineDistribution: baseline,
        currentDistribution: current,
        policy: { decisional: { allowNewCategories: false } }
      });

      expect(res.length).toBe(1);
      expect(res[0].details?.new_categories).toContain('FAIL');
      expect(res[0].details?.new_categories).toContain('SKIP');
      expect(res[0].details?.new_categories).toContain('WARN');
    });
  });

  describe('distribution shift detection', () => {
    it('detects significant shift in verdict ratios', () => {
      const baseline = { PASS: 90, FAIL: 10 };
      const current = { PASS: 50, FAIL: 50 };

      const res = analyzeDecisionalDrift({
        baselineDistribution: baseline,
        currentDistribution: current,
        policy: {
          decisional: {
            allowNewCategories: false,
            maxRatioShift: 0.2
          }
        }
      });

      expect(res.some(r => r.summary.includes('ratio shift'))).toBe(true);
    });

    it('ignores minor ratio shifts within threshold', () => {
      const baseline = { PASS: 90, FAIL: 10 };
      const current = { PASS: 85, FAIL: 15 };

      const res = analyzeDecisionalDrift({
        baselineDistribution: baseline,
        currentDistribution: current,
        policy: {
          decisional: {
            allowNewCategories: false,
            maxRatioShift: 0.2
          }
        }
      });

      expect(res.filter(r => r.summary.includes('ratio shift')).length).toBe(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// USAGE DRIFT TESTS
// ─────────────────────────────────────────────────────────────

describe('governance/drift/usage', () => {
  describe('excessive repetition detection', () => {
    it('detects excessive repetition pattern', () => {
      const sequences = [['PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS']];

      const res = analyzeUsageDrift({
        sequences,
        policy: { usage: { maxRepetitions: 3, knownMisusePatterns: [] } }
      });

      expect(res.length).toBeGreaterThan(0);
      expect(res[0].kind).toBe('usage_signature');
    });

    it('does not report when repetitions within threshold', () => {
      const sequences = [['PASS', 'PASS', 'FAIL', 'PASS']];

      const res = analyzeUsageDrift({
        sequences,
        policy: { usage: { maxRepetitions: 3, knownMisusePatterns: [] } }
      });

      expect(res.length).toBe(0);
    });

    it('detects repetitions at exact threshold boundary', () => {
      const sequences = [['PASS', 'PASS', 'PASS', 'PASS']]; // 4 repetitions

      const res = analyzeUsageDrift({
        sequences,
        policy: { usage: { maxRepetitions: 3, knownMisusePatterns: [] } }
      });

      expect(res.length).toBeGreaterThan(0);
    });

    it('analyzes multiple sequences independently', () => {
      const sequences = [
        ['PASS', 'FAIL', 'PASS'],
        ['SKIP', 'SKIP', 'SKIP', 'SKIP', 'SKIP']
      ];

      const res = analyzeUsageDrift({
        sequences,
        policy: { usage: { maxRepetitions: 3, knownMisusePatterns: [] } }
      });

      expect(res.length).toBe(1); // Only second sequence triggers
    });
  });

  describe('known misuse pattern detection', () => {
    it('detects known misuse pattern', () => {
      const sequences = [['SKIP', 'SKIP', 'SKIP', 'PASS']];

      const res = analyzeUsageDrift({
        sequences,
        policy: { usage: { maxRepetitions: 10, knownMisusePatterns: ['SKIP:3+'] } }
      });

      expect(res.length).toBeGreaterThan(0);
    });

    it('does not report when pattern count below threshold', () => {
      const sequences = [['SKIP', 'SKIP', 'PASS']];

      const res = analyzeUsageDrift({
        sequences,
        policy: { usage: { maxRepetitions: 10, knownMisusePatterns: ['SKIP:3+'] } }
      });

      expect(res.length).toBe(0);
    });

    it('detects multiple misuse patterns', () => {
      const sequences = [['SKIP', 'SKIP', 'SKIP', 'FAIL', 'FAIL', 'FAIL']];

      const res = analyzeUsageDrift({
        sequences,
        policy: {
          usage: {
            maxRepetitions: 10,
            knownMisusePatterns: ['SKIP:3+', 'FAIL:3+']
          }
        }
      });

      expect(res.length).toBe(2);
    });

    it('handles empty sequences', () => {
      const sequences: string[][] = [[]];

      const res = analyzeUsageDrift({
        sequences,
        policy: { usage: { maxRepetitions: 3, knownMisusePatterns: [] } }
      });

      expect(res.length).toBe(0);
    });
  });

  describe('observation structure', () => {
    it('includes details in observations', () => {
      const sequences = [['PASS', 'PASS', 'PASS', 'PASS', 'PASS']];

      const res = analyzeUsageDrift({
        sequences,
        policy: { usage: { maxRepetitions: 2, knownMisusePatterns: [] } }
      });

      expect(res[0].details).toBeDefined();
      expect(res[0].details?.max_repetitions).toBe(5);
      expect(res[0].details?.threshold).toBe(2);
    });
  });
});
