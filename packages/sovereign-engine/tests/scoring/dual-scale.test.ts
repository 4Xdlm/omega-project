import { describe, it, expect, beforeEach } from 'vitest';
import { computeDualScale, resetArcBuffer } from '../../src/scoring/dual-scale.js';

describe('Dual Scale LOCAL+ARC', () => {
  beforeEach(() => {
    resetArcBuffer();
  });

  it('first brick: arc_detail is defined', () => {
    const result = computeDualScale(90);
    expect(result.local_score).toBe(90);
    expect(result.arc_detail).toBeDefined();
    expect(result.arc_detail!.arc_composite).toBeGreaterThan(0);
  });

  it('dual_score is weighted combination of local and arc', () => {
    const result = computeDualScale(90);
    const expected = 0.43 * 90 + 0.57 * result.arc_score;
    expect(result.dual_score).toBeCloseTo(expected, 1);
  });

  it('multiple bricks: arc changes with progression', () => {
    computeDualScale(80);
    computeDualScale(85);
    const result = computeDualScale(90);
    // Ascending → progression > 50, so arc_composite reflects this
    expect(result.arc_detail!.progression).toBeGreaterThan(50);
  });

  it('uniform scores: dual_score close to local', () => {
    resetArcBuffer();
    const result = computeDualScale(100);
    // Single score: arc neutral-ish, closure depends on target (88 default)
    expect(result.local_score).toBe(100);
    expect(result.dual_score).toBeGreaterThan(50);
  });

  it('arc_detail contains all 3 sub-scores', () => {
    computeDualScale(80);
    const result = computeDualScale(90);
    expect(result.arc_detail).toHaveProperty('progression');
    expect(result.arc_detail).toHaveProperty('tension_variance');
    expect(result.arc_detail).toHaveProperty('closure_signal');
    expect(result.arc_detail).toHaveProperty('arc_composite');
  });

  it('resetArcBuffer clears state', () => {
    computeDualScale(80);
    computeDualScale(90);
    resetArcBuffer();
    const result = computeDualScale(85);
    // After reset, first score → progression=50 (neutral)
    expect(result.arc_detail!.progression).toBe(50);
  });
});
