/**
 * OMEGA Forge — Omega State Tests
 * Phase C.5 — R14 <-> Omega(X,Y,Z) conversion
 * 10 tests
 */

import { describe, it, expect } from 'vitest';
import {
  toOmegaState,
  fromOmegaState,
  isValidOmega,
  neutralOmega,
} from '../../src/physics/omega-state.js';
import { CANONICAL_TABLE, makeState14D, makeOmega } from '../fixtures.js';

const C = 100;

describe('omega-state', () => {
  it('neutral state maps to neutral omega (near zero X, low Y)', () => {
    const state = makeState14D('joy', 0);
    const omega = toOmegaState(state, CANONICAL_TABLE, C);
    expect(omega.X).toBeCloseTo(0, 5);
    expect(omega.Y).toBeCloseTo(0, 5);
    expect(omega.Z).toBeCloseTo(0, 5);
  });

  it('high joy produces positive X', () => {
    const state = makeState14D('joy', 1);
    const omega = toOmegaState(state, CANONICAL_TABLE, C);
    expect(omega.X).toBeGreaterThan(0);
  });

  it('fear produces negative X', () => {
    const state = makeState14D('fear', 1);
    const omega = toOmegaState(state, CANONICAL_TABLE, C);
    expect(omega.X).toBeLessThan(0);
  });

  it('isValidOmega: valid bounds pass', () => {
    const omega = makeOmega(5, 50, 30);
    expect(isValidOmega(omega, C)).toBe(true);
  });

  it('isValidOmega: X>10 is invalid', () => {
    const omega = makeOmega(11, 50, 30);
    expect(isValidOmega(omega, C)).toBe(false);
  });

  it('roundtrip: toOmegaState then fromOmegaState is approximate', () => {
    const original = makeState14D('joy', 0.8);
    const omega = toOmegaState(original, CANONICAL_TABLE, C);
    const reconstructed = fromOmegaState(omega, CANONICAL_TABLE, C);
    // Lossy conversion — but joy should remain the dominant positive emotion
    expect(reconstructed['joy']).toBeGreaterThan(0);
    // Valence should have same sign direction
    expect(omega.X).toBeGreaterThan(0);
  });

  it('saturation Z clamped to C', () => {
    // love has M=9, highest mass — with intensity 1, Z should be capped at C
    const state = makeState14D('love', 1);
    const omega = toOmegaState(state, CANONICAL_TABLE, C);
    expect(omega.Z).toBeLessThanOrEqual(C);
    expect(omega.Z).toBeGreaterThanOrEqual(0);
  });

  it('neutralOmega returns zero state', () => {
    const n = neutralOmega();
    expect(n.X).toBe(0);
    expect(n.Y).toBe(0);
    expect(n.Z).toBe(0);
  });

  it('extreme intensity maps to bounded omega', () => {
    const state = makeState14D('anger', 1);
    const omega = toOmegaState(state, CANONICAL_TABLE, C);
    expect(omega.X).toBeGreaterThanOrEqual(-10);
    expect(omega.X).toBeLessThanOrEqual(10);
    expect(omega.Y).toBeGreaterThanOrEqual(0);
    expect(omega.Y).toBeLessThanOrEqual(100);
    expect(omega.Z).toBeGreaterThanOrEqual(0);
    expect(omega.Z).toBeLessThanOrEqual(C);
  });

  it('determinism: same inputs produce identical outputs', () => {
    const state = makeState14D('fear', 0.7);
    const o1 = toOmegaState(state, CANONICAL_TABLE, C);
    const o2 = toOmegaState(state, CANONICAL_TABLE, C);
    expect(o1.X).toBe(o2.X);
    expect(o1.Y).toBe(o2.Y);
    expect(o1.Z).toBe(o2.Z);

    const r1 = fromOmegaState(o1, CANONICAL_TABLE, C);
    const r2 = fromOmegaState(o2, CANONICAL_TABLE, C);
    expect(r1['fear']).toBe(r2['fear']);
  });
});
