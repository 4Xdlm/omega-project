/**
 * OMEGA Forge — Law 3: Emotional Feasibility Tests
 * Phase C.5 — F <= threshold -> forced/dissonant emotion
 * 8 tests
 */

import { describe, it, expect } from 'vitest';
import {
  feasibilityThreshold,
  checkFeasibility,
  verifyLaw3,
} from '../../src/physics/law-3-feasibility.js';
import { makeOmega } from '../fixtures.js';
import type { Beat } from '../../src/types.js';

function makeBeat(overrides: Partial<Beat> = {}): Beat {
  return {
    beat_id: 'B1',
    action: 'discovers truth',
    intention: 'reveal',
    pivot: true,
    tension_delta: 1,
    information_revealed: ['secret'],
    information_withheld: [],
    ...overrides,
  } as Beat;
}

describe('law-3-feasibility', () => {
  it('checkFeasibility: sufficient energy is compliant', () => {
    const from = makeOmega(0, 10, 5);
    const to = makeOmega(1, 15, 6);
    // Small transition -> low threshold, force should be sufficient
    const force = 5;
    const result = checkFeasibility(force, from, to);
    expect(result.compliant).toBe(true);
    expect(result.ratio).toBeGreaterThanOrEqual(1);
  });

  it('checkFeasibility: insufficient energy is non-compliant', () => {
    const from = makeOmega(0, 10, 5);
    const to = makeOmega(8, 90, 50);
    // Large transition -> high threshold, tiny force
    const force = 0.01;
    const result = checkFeasibility(force, from, to);
    expect(result.compliant).toBe(false);
    expect(result.ratio).toBeLessThan(1);
  });

  it('feasibilityThreshold: computed from state delta', () => {
    const from = makeOmega(0, 0, 0);
    const to = makeOmega(10, 100, 50);
    const threshold = feasibilityThreshold(from, to);
    // (|10-0| + |100-0|) * 0.05 + 0.1 = 110*0.05 + 0.1 = 5.6
    expect(threshold).toBeCloseTo(5.6, 5);
  });

  it('checkFeasibility: zero force fails against non-zero threshold', () => {
    const from = makeOmega(0, 10, 5);
    const to = makeOmega(2, 30, 10);
    const result = checkFeasibility(0, from, to);
    expect(result.compliant).toBe(false);
  });

  it('checkFeasibility: high force passes easily', () => {
    const from = makeOmega(0, 10, 5);
    const to = makeOmega(2, 30, 10);
    const result = checkFeasibility(100, from, to);
    expect(result.compliant).toBe(true);
  });

  it('verifyLaw3: with beat produces LawVerification', () => {
    const from = makeOmega(0, 10, 5);
    const to = makeOmega(1, 15, 6);
    const beat = makeBeat();
    const ver = verifyLaw3(beat, from, to, 0, 1);
    expect(ver.law).toBe('L3');
    expect(typeof ver.compliant).toBe('boolean');
    expect(ver.paragraph_indices).toEqual([0, 1]);
  });

  it('edge: same state -> minimal threshold (0.1)', () => {
    const same = makeOmega(5, 50, 10);
    const threshold = feasibilityThreshold(same, same);
    // (0+0)*0.05 + 0.1 = 0.1
    expect(threshold).toBeCloseTo(0.1, 10);
  });

  it('determinism: same inputs produce identical outputs', () => {
    const from = makeOmega(1, 20, 5);
    const to = makeOmega(4, 60, 15);
    const beat = makeBeat();

    const t1 = feasibilityThreshold(from, to);
    const t2 = feasibilityThreshold(from, to);
    expect(t1).toBe(t2);

    const c1 = checkFeasibility(3, from, to);
    const c2 = checkFeasibility(3, from, to);
    expect(c1.compliant).toBe(c2.compliant);
    expect(c1.ratio).toBe(c2.ratio);

    const v1 = verifyLaw3(beat, from, to, 0, 1);
    const v2 = verifyLaw3(beat, from, to, 0, 1);
    expect(v1.compliant).toBe(v2.compliant);
    expect(v1.measured_value).toBe(v2.measured_value);
  });
});
