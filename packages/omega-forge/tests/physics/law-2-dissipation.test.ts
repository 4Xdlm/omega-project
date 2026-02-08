/**
 * OMEGA Forge — Law 2: Simple Dissipation Tests
 * Phase C.5 — I(t) = I0 * e^(-lambda * t)
 * 8 tests
 */

import { describe, it, expect } from 'vitest';
import {
  simpleDissipation,
  verifyLaw2,
} from '../../src/physics/law-2-dissipation.js';

describe('law-2-dissipation', () => {
  it('t=0 returns I0', () => {
    const result = simpleDissipation(5, 0.2, 0);
    expect(result).toBeCloseTo(5, 10);
  });

  it('high lambda causes fast decay', () => {
    const highLambda = simpleDissipation(10, 2.0, 5);
    const lowLambda = simpleDissipation(10, 0.1, 5);
    expect(highLambda).toBeLessThan(lowLambda);
  });

  it('low lambda causes slow decay', () => {
    const result = simpleDissipation(10, 0.01, 1);
    // e^(-0.01) ~ 0.99 => 10 * 0.99 ~ 9.9
    expect(result).toBeGreaterThan(9.5);
  });

  it('convergence to 0 for large t', () => {
    const result = simpleDissipation(10, 0.5, 100);
    expect(result).toBeCloseTo(0, 5);
  });

  it('verifyLaw2: tolerance met when actual matches expected', () => {
    const I0 = 10;
    const lambda = 0.2;
    const t = 3;
    const expected = simpleDissipation(I0, lambda, t);
    const ver = verifyLaw2(expected, I0, lambda, t, 0.01, 0, 3);
    expect(ver.compliant).toBe(true);
    expect(ver.law).toBe('L2');
  });

  it('verifyLaw2: tolerance violated when actual differs from expected', () => {
    const I0 = 10;
    const lambda = 0.2;
    const t = 3;
    const expected = simpleDissipation(I0, lambda, t);
    // actual is 2.0 higher than expected
    const ver = verifyLaw2(expected + 2.0, I0, lambda, t, 0.01, 0, 3);
    expect(ver.compliant).toBe(false);
  });

  it('edge: large t yields near-zero intensity', () => {
    const result = simpleDissipation(1000, 1.0, 50);
    expect(result).toBeCloseTo(0, 10);
  });

  it('determinism: same inputs produce identical outputs', () => {
    const r1 = simpleDissipation(8, 0.15, 4);
    const r2 = simpleDissipation(8, 0.15, 4);
    expect(r1).toBe(r2);

    const v1 = verifyLaw2(r1, 8, 0.15, 4, 0.01, 0, 4);
    const v2 = verifyLaw2(r2, 8, 0.15, 4, 0.01, 0, 4);
    expect(v1.compliant).toBe(v2.compliant);
    expect(v1.measured_value).toBe(v2.measured_value);
  });
});
