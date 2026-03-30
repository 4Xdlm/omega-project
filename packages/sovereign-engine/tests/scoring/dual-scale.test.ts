import { describe, it, expect } from 'vitest';
import { computeDualScale, resetArcBuffer } from '../../src/scoring/dual-scale.js';

describe('Dual Scale LOCAL+ARC', () => {
  it('first brick: arc = local', () => {
    resetArcBuffer();
    const result = computeDualScale(90);
    expect(result.local_score).toBe(90);
    expect(result.arc_score).toBe(90);
    expect(result.dual_score).toBeCloseTo(90, 0);
    expect(result.arc_window_size).toBe(1);
  });

  it('multiple bricks: arc averages', () => {
    resetArcBuffer();
    computeDualScale(80);
    computeDualScale(90);
    const result = computeDualScale(100);
    expect(result.arc_score).toBe(90); // (80+90+100)/3
    expect(result.arc_window_size).toBe(3);
  });

  it('arc window caps at 5', () => {
    resetArcBuffer();
    for (let i = 0; i < 7; i++) computeDualScale(80);
    const result = computeDualScale(100);
    expect(result.arc_window_size).toBe(5); // only last 5
  });

  it('dual score is weighted combination', () => {
    resetArcBuffer();
    const result = computeDualScale(100);
    // 0.43 * 100 + 0.57 * 100 = 100
    expect(result.dual_score).toBeCloseTo(100, 0);
  });
});
