/**
 * OMEGA Forge — Law 1: Emotional Inertia Tests
 * Phase C.5 — |F| > M * R transition authorization
 * 10 tests
 */

import { describe, it, expect } from 'vitest';
import {
  checkInertia,
  estimateNarrativeForce,
  computeResistance,
  verifyLaw1,
} from '../../src/physics/law-1-inertia.js';
import { makeOmega } from '../fixtures.js';
import type { Beat } from '../../src/types.js';

function makeBeat(overrides: Partial<Beat> = {}): Beat {
  return {
    beat_id: 'B1',
    action: 'discovers truth',
    intention: 'reveal',
    pivot: false,
    tension_delta: 0,
    information_revealed: [],
    information_withheld: [],
    ...overrides,
  } as Beat;
}

describe('law-1-inertia', () => {
  it('checkInertia: compliant when force > M*R', () => {
    const result = checkInertia(10, 2, 3);
    // threshold = 2*3 = 6, force=10 > 6
    expect(result.compliant).toBe(true);
    expect(result.ratio).toBeGreaterThan(1);
  });

  it('checkInertia: non-compliant when force < M*R', () => {
    const result = checkInertia(3, 2, 3);
    // threshold = 6, force=3 < 6
    expect(result.compliant).toBe(false);
    expect(result.ratio).toBeLessThan(1);
  });

  it('checkInertia: threshold exact (force == M*R) is non-compliant (ratio=1 not >1)', () => {
    const result = checkInertia(6, 2, 3);
    // threshold = 6, force=6, ratio=1, compliant requires ratio > 1
    expect(result.compliant).toBe(false);
    expect(result.ratio).toBeCloseTo(1, 10);
  });

  it('estimateNarrativeForce: pivot beat has higher force', () => {
    const from = makeOmega(0, 10, 5);
    const to = makeOmega(5, 50, 10);
    const pivotBeat = makeBeat({
      pivot: true,
      tension_delta: 1,
      information_revealed: ['secret'],
    });
    const force = estimateNarrativeForce(pivotBeat, { from, to });
    expect(force).toBeGreaterThan(0);
    // Pivot beat should produce more force than a non-pivot beat
    const normalBeat = makeBeat({ pivot: false, tension_delta: 0 });
    const normalForce = estimateNarrativeForce(normalBeat, { from, to });
    expect(force).toBeGreaterThan(normalForce);
  });

  it('estimateNarrativeForce: dialogue beat (non-pivot) produces force', () => {
    const from = makeOmega(0, 20, 5);
    const to = makeOmega(2, 30, 8);
    const beat = makeBeat({
      action: 'dialogue exchange',
      intention: 'inform',
      pivot: false,
      tension_delta: 1,
      information_revealed: ['secret'],
    });
    const force = estimateNarrativeForce(beat, { from, to });
    expect(force).toBeGreaterThan(0);
  });

  it('estimateNarrativeForce: null beat returns reduced force', () => {
    const from = makeOmega(0, 10, 5);
    const to = makeOmega(3, 40, 10);
    const forceNoBeat = estimateNarrativeForce(null, { from, to });
    const beat = makeBeat({ pivot: true, tension_delta: 1, information_revealed: ['secret'] });
    const forceBeat = estimateNarrativeForce(beat, { from, to });
    expect(forceNoBeat).toBeGreaterThan(0);
    expect(forceBeat).toBeGreaterThan(forceNoBeat);
  });

  it('computeResistance: zero change gives minimal resistance', () => {
    const same = makeOmega(5, 50, 10);
    const resistance = computeResistance(same, same);
    // resistance = sqrt(0)*0.1 + 0.1 = 0.1
    expect(resistance).toBeCloseTo(0.1, 10);
  });

  it('computeResistance: high mass (large delta) gives higher resistance', () => {
    const from = makeOmega(0, 0, 0);
    const to = makeOmega(10, 100, 50);
    const resistance = computeResistance(from, to);
    expect(resistance).toBeGreaterThan(0.1);
  });

  it('verifyLaw1: ratio is computed correctly', () => {
    const ver = verifyLaw1(10, 2, 3, 0, 1);
    // threshold = 6, force=10, compliant=true
    expect(ver.law).toBe('L1');
    expect(ver.compliant).toBe(true);
    expect(ver.measured_value).toBe(10);
    expect(ver.threshold).toBe(6);
    expect(ver.paragraph_indices).toEqual([0, 1]);
  });

  it('determinism: same inputs produce identical outputs', () => {
    const from = makeOmega(1, 20, 5);
    const to = makeOmega(4, 60, 15);
    const beat = makeBeat({ pivot: true, tension_delta: 1, information_revealed: ['info'] });

    const f1 = estimateNarrativeForce(beat, { from, to });
    const f2 = estimateNarrativeForce(beat, { from, to });
    expect(f1).toBe(f2);

    const r1 = computeResistance(from, to);
    const r2 = computeResistance(from, to);
    expect(r1).toBe(r2);

    const c1 = checkInertia(f1, 5, r1);
    const c2 = checkInertia(f2, 5, r2);
    expect(c1.compliant).toBe(c2.compliant);
    expect(c1.ratio).toBe(c2.ratio);
  });
});
