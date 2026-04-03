import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetArc,
  setClosureTarget,
  pushScoreAndComputeArc,
  computeArcFromScores,
  computeProgression,
  computeTensionVariance,
  computeClosureSignal,
  getArcState,
  W_PROGRESSION,
  W_TENSION_VARIANCE,
  W_CLOSURE,
} from '../../src/scoring/arc-scorer.js';

describe('ARC Scorer — P2-00', () => {
  beforeEach(() => {
    resetArc();
  });

  // ── Weights ──
  describe('weights', () => {
    it('weights sum to 1.0', () => {
      expect(W_PROGRESSION + W_TENSION_VARIANCE + W_CLOSURE).toBeCloseTo(1.0, 10);
    });

    it('progression = 0.40, tension = 0.35, closure = 0.25', () => {
      expect(W_PROGRESSION).toBe(0.40);
      expect(W_TENSION_VARIANCE).toBe(0.35);
      expect(W_CLOSURE).toBe(0.25);
    });
  });

  // ── Progression ──
  describe('computeProgression', () => {
    it('single score → neutral (50)', () => {
      expect(computeProgression([85])).toBe(50.0);
    });

    it('empty array → neutral (50)', () => {
      expect(computeProgression([])).toBe(50.0);
    });

    it('ascending scores → above 50', () => {
      const result = computeProgression([80, 83, 86, 89, 92]);
      expect(result).toBeGreaterThan(50);
    });

    it('descending scores → below 50', () => {
      const result = computeProgression([92, 89, 86, 83, 80]);
      expect(result).toBeLessThan(50);
    });

    it('flat scores → exactly 50', () => {
      const result = computeProgression([85, 85, 85, 85, 85]);
      expect(result).toBe(50.0);
    });

    it('strong ascent → near 100', () => {
      const result = computeProgression([60, 70, 80, 90, 100]);
      expect(result).toBeGreaterThan(90);
    });

    it('bounded [0, 100]', () => {
      const extreme = computeProgression([0, 0, 0, 100, 100]);
      expect(extreme).toBeGreaterThanOrEqual(0);
      expect(extreme).toBeLessThanOrEqual(100);
    });
  });

  // ── Tension Variance ──
  describe('computeTensionVariance', () => {
    it('single score → neutral (50)', () => {
      expect(computeTensionVariance([85])).toBe(50.0);
    });

    it('identical scores → high (very stable)', () => {
      const result = computeTensionVariance([85, 85, 85, 85]);
      expect(result).toBeGreaterThan(80);
    });

    it('slight variation → moderately high (stable)', () => {
      // Scores [84, 86, 85, 87, 83] → mean=85, stdev≈1.41, cv≈0.017 → stable
      const result = computeTensionVariance([84, 86, 85, 87, 83]);
      expect(result).toBeGreaterThan(60);
    });

    it('extreme variation → low (chaotic/instable)', () => {
      const result = computeTensionVariance([50, 100, 50, 100, 50]);
      // stdev≈25, mean=70, cv≈0.36 → chaotic → low stability score
      expect(result).toBeLessThan(10);
    });

    it('bounded [0, 100]', () => {
      const r1 = computeTensionVariance([0, 100, 0, 100]);
      expect(r1).toBeGreaterThanOrEqual(0);
      expect(r1).toBeLessThanOrEqual(100);
      const r2 = computeTensionVariance([85, 85, 85]);
      expect(r2).toBeGreaterThanOrEqual(0);
      expect(r2).toBeLessThanOrEqual(100);
    });
  });

  // ── Closure Signal ──
  describe('computeClosureSignal', () => {
    it('empty array → 0', () => {
      expect(computeClosureSignal([], 88)).toBe(0);
    });

    it('last score = target → ~85', () => {
      const result = computeClosureSignal([80, 85, 88], 88);
      expect(result).toBeCloseTo(85, 0);
    });

    it('last score > target → above 85, capped at 100', () => {
      const result = computeClosureSignal([80, 85, 95], 88);
      expect(result).toBeGreaterThan(85);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('last score far below target → near 0', () => {
      const result = computeClosureSignal([80, 75, 70], 88);
      expect(result).toBeLessThan(20);
    });

    it('bounded [0, 100]', () => {
      const r1 = computeClosureSignal([100], 88);
      expect(r1).toBeLessThanOrEqual(100);
      const r2 = computeClosureSignal([0], 88);
      expect(r2).toBeGreaterThanOrEqual(0);
    });
  });

  // ── pushScoreAndComputeArc (stateful) ──
  describe('pushScoreAndComputeArc', () => {
    it('first push returns valid ArcScore', () => {
      const arc = pushScoreAndComputeArc(85);
      expect(arc.progression).toBe(50.0); // single score → neutral
      expect(arc.tension_variance).toBe(50.0); // single score → neutral
      expect(arc.closure_signal).toBeGreaterThan(0);
      expect(arc.arc_composite).toBeGreaterThan(0);
      expect(arc.arc_composite).toBeLessThanOrEqual(100);
    });

    it('multiple pushes accumulate state', () => {
      pushScoreAndComputeArc(80);
      pushScoreAndComputeArc(85);
      const arc = pushScoreAndComputeArc(90);
      expect(getArcState().scores).toHaveLength(3);
      // Ascending → progression > 50
      expect(arc.progression).toBeGreaterThan(50);
    });

    it('composite = weighted sum of sub-scores', () => {
      pushScoreAndComputeArc(80);
      pushScoreAndComputeArc(85);
      const arc = pushScoreAndComputeArc(90);
      const expected =
        W_PROGRESSION * arc.progression +
        W_TENSION_VARIANCE * arc.tension_variance +
        W_CLOSURE * arc.closure_signal;
      expect(arc.arc_composite).toBeCloseTo(expected, 1);
    });

    it('reset clears state', () => {
      pushScoreAndComputeArc(80);
      pushScoreAndComputeArc(85);
      resetArc();
      expect(getArcState().scores).toHaveLength(0);
    });
  });

  // ── setClosureTarget ──
  describe('setClosureTarget', () => {
    it('changes closure target', () => {
      setClosureTarget(93); // STRATOSPHERIQUE
      expect(getArcState().closure_target).toBe(93);
    });

    it('rejects out-of-bounds targets', () => {
      expect(() => setClosureTarget(-1)).toThrow();
      expect(() => setClosureTarget(101)).toThrow();
    });
  });

  // ── computeArcFromScores (stateless) ──
  describe('computeArcFromScores', () => {
    it('produces same result as stateful version', () => {
      const scores = [80, 83, 86, 89, 92];
      resetArc();
      let lastArc;
      for (const s of scores) {
        lastArc = pushScoreAndComputeArc(s);
      }
      const stateless = computeArcFromScores(scores, 88);
      expect(stateless.arc_composite).toBeCloseTo(lastArc!.arc_composite, 1);
      expect(stateless.progression).toBeCloseTo(lastArc!.progression, 1);
    });

    it('does not modify internal state', () => {
      resetArc();
      computeArcFromScores([80, 85, 90], 88);
      expect(getArcState().scores).toHaveLength(0);
    });
  });

  // ── Golden Run sanity check ──
  describe('Golden Run patterns', () => {
    it('ascending curve with strong closure → high ARC', () => {
      // Simulates "Le Gardien"-like quality arc
      const arc = computeArcFromScores([82, 85, 87, 89, 91], 88);
      expect(arc.arc_composite).toBeGreaterThan(65);
      expect(arc.progression).toBeGreaterThan(60);
      expect(arc.closure_signal).toBeGreaterThan(80);
    });

    it('flat mediocre → moderate ARC (stable but far from target)', () => {
      const arc = computeArcFromScores([75, 75, 75, 75, 75], 88);
      // Stable (high tension_variance) + neutral progression + bad closure
      // → composite mid-range, not excellent
      expect(arc.arc_composite).toBeLessThan(60);
      expect(arc.closure_signal).toBeLessThan(30);
      expect(arc.tension_variance).toBeGreaterThan(80); // very stable
    });

    it('chaotic scores → low stability (tension_variance)', () => {
      const arc = computeArcFromScores([60, 95, 55, 100, 50], 88);
      // Chaotic = unstable → very low stability score
      expect(arc.tension_variance).toBeLessThan(10);
    });
  });
});
