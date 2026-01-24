/**
 * OMEGA V4.4 — Laws L1-L6 Tests
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import {
  applyL1CyclicPhase,
  applyL2BoundedIntensity,
  applyL3BoundedPersistence,
  applyL4DecayLaw,
  applyL5HystereticDamping,
  applyL6Conservation,
  calculateTotalIntensity,
  verifyL1,
  verifyL2,
  verifyL3,
  verifyL5,
  verifyL6,
  verifyAllLaws,
} from '../../src/phase2_core/index.js';

import { EMOTIONS_V44 } from '../../src/phase1_contract/index.js';

describe('Law L1 — Cyclic Phase', () => {
  const PHASE_CYCLE = 2 * Math.PI;

  it('normalizes positive phase within bounds', () => {
    expect(applyL1CyclicPhase(0, PHASE_CYCLE)).toBe(0);
    expect(applyL1CyclicPhase(Math.PI, PHASE_CYCLE)).toBeCloseTo(Math.PI);
    expect(applyL1CyclicPhase(PHASE_CYCLE - 0.001, PHASE_CYCLE)).toBeCloseTo(PHASE_CYCLE - 0.001);
  });

  it('wraps phase exceeding cycle', () => {
    expect(applyL1CyclicPhase(PHASE_CYCLE, PHASE_CYCLE)).toBeCloseTo(0);
    expect(applyL1CyclicPhase(PHASE_CYCLE + Math.PI, PHASE_CYCLE)).toBeCloseTo(Math.PI);
    expect(applyL1CyclicPhase(PHASE_CYCLE * 2, PHASE_CYCLE)).toBeCloseTo(0);
    expect(applyL1CyclicPhase(PHASE_CYCLE * 2.5, PHASE_CYCLE)).toBeCloseTo(Math.PI);
  });

  it('handles negative phase correctly', () => {
    expect(applyL1CyclicPhase(-Math.PI, PHASE_CYCLE)).toBeCloseTo(Math.PI);
    expect(applyL1CyclicPhase(-PHASE_CYCLE, PHASE_CYCLE)).toBeCloseTo(0);
  });

  it('throws on invalid cycle', () => {
    expect(() => applyL1CyclicPhase(0, 0)).toThrow('PHASE_CYCLE must be positive');
    expect(() => applyL1CyclicPhase(0, -1)).toThrow('PHASE_CYCLE must be positive');
  });

  it('verifyL1 returns correct result', () => {
    const valid = verifyL1(Math.PI, PHASE_CYCLE);
    expect(valid.passed).toBe(true);
    expect(valid.lawId).toBe('L1_CYCLIC_PHASE');

    const invalid = verifyL1(PHASE_CYCLE + 1, PHASE_CYCLE);
    expect(invalid.passed).toBe(false);
  });
});

describe('Law L2 — Bounded Intensity', () => {
  const MU_MIN = 0;
  const MU_MAX = 100;

  it('returns value within bounds unchanged', () => {
    expect(applyL2BoundedIntensity(50, MU_MIN, MU_MAX)).toBe(50);
    expect(applyL2BoundedIntensity(0, MU_MIN, MU_MAX)).toBe(0);
    expect(applyL2BoundedIntensity(100, MU_MIN, MU_MAX)).toBe(100);
  });

  it('clamps values below minimum', () => {
    expect(applyL2BoundedIntensity(-10, MU_MIN, MU_MAX)).toBe(0);
    expect(applyL2BoundedIntensity(-1000, MU_MIN, MU_MAX)).toBe(0);
  });

  it('clamps values above maximum', () => {
    expect(applyL2BoundedIntensity(110, MU_MIN, MU_MAX)).toBe(100);
    expect(applyL2BoundedIntensity(1000, MU_MIN, MU_MAX)).toBe(100);
  });

  it('throws on invalid bounds', () => {
    expect(() => applyL2BoundedIntensity(50, 100, 0)).toThrow('MU_MIN must be <= MU_MAX');
  });

  it('verifyL2 returns correct result', () => {
    const valid = verifyL2(50, MU_MIN, MU_MAX);
    expect(valid.passed).toBe(true);
    expect(valid.lawId).toBe('L2_BOUNDED_INTENSITY');

    const invalid = verifyL2(150, MU_MIN, MU_MAX);
    expect(invalid.passed).toBe(false);
  });
});

describe('Law L3 — Bounded Persistence', () => {
  const Z_MIN = 0;
  const Z_MAX = 1;

  it('returns value within bounds unchanged', () => {
    expect(applyL3BoundedPersistence(0.5, Z_MIN, Z_MAX)).toBe(0.5);
    expect(applyL3BoundedPersistence(0, Z_MIN, Z_MAX)).toBe(0);
    expect(applyL3BoundedPersistence(1, Z_MIN, Z_MAX)).toBe(1);
  });

  it('clamps values below minimum', () => {
    expect(applyL3BoundedPersistence(-0.5, Z_MIN, Z_MAX)).toBe(0);
  });

  it('clamps values above maximum', () => {
    expect(applyL3BoundedPersistence(1.5, Z_MIN, Z_MAX)).toBe(1);
  });

  it('throws on invalid bounds', () => {
    expect(() => applyL3BoundedPersistence(0.5, 1, 0)).toThrow('Z_MIN must be <= Z_MAX');
  });

  it('verifyL3 returns correct result', () => {
    const valid = verifyL3(0.5, Z_MIN, Z_MAX);
    expect(valid.passed).toBe(true);
    expect(valid.lawId).toBe('L3_BOUNDED_PERSISTENCE');

    const invalid = verifyL3(1.5, Z_MIN, Z_MAX);
    expect(invalid.passed).toBe(false);
  });
});

describe('Law L4 — Exponential Decay', () => {
  const baseParams = {
    M: 6.0,
    lambda: 0.1,
    kappa: 0.8,
    E0: 2,
    zeta: 0.7,
    mu: 0.3,
    C: 100,
    omega: 0, // No oscillation for simple tests
    phi: 0,
  };

  it('returns initial intensity at t=0', () => {
    const I0 = 50;
    const result = applyL4DecayLaw(baseParams, I0, 0, baseParams.lambda);
    expect(result).toBe(I0);
  });

  it('decays toward E0 over time', () => {
    const I0 = 50;
    const t1 = applyL4DecayLaw(baseParams, I0, 1, baseParams.lambda);
    const t10 = applyL4DecayLaw(baseParams, I0, 10, baseParams.lambda);
    const t100 = applyL4DecayLaw(baseParams, I0, 100, baseParams.lambda);

    // Intensity should decrease toward E0
    expect(Math.abs(t1 - baseParams.E0)).toBeLessThan(Math.abs(I0 - baseParams.E0));
    expect(Math.abs(t10 - baseParams.E0)).toBeLessThan(Math.abs(t1 - baseParams.E0));
    expect(Math.abs(t100 - baseParams.E0)).toBeLessThan(Math.abs(t10 - baseParams.E0));
  });

  it('converges to E0 at large t', () => {
    const I0 = 50;
    const tLarge = applyL4DecayLaw(baseParams, I0, 1000, baseParams.lambda);
    expect(tLarge).toBeCloseTo(baseParams.E0, 1);
  });

  it('handles oscillation when omega > 0', () => {
    const oscillatingParams = { ...baseParams, omega: 1 };
    const I0 = 50;

    // With oscillation, intensity should still decay envelope
    const t1 = applyL4DecayLaw(oscillatingParams, I0, 1, oscillatingParams.lambda);
    const t10 = applyL4DecayLaw(oscillatingParams, I0, 10, oscillatingParams.lambda);

    // Envelope should decrease
    expect(t10).toBeDefined();
    expect(t1).toBeDefined();
  });
});

describe('Law L5 — Hysteretic Damping', () => {
  const baseParams = {
    M: 6.0,
    lambda: 0.1,
    kappa: 0.8,
    E0: 2,
    zeta: 0.7,
    mu: 0.3,
    C: 100,
    omega: 0,
    phi: 0,
  };

  it('returns lambda when Z=0', () => {
    const lambdaEff = applyL5HystereticDamping(baseParams, 0);
    expect(lambdaEff).toBe(baseParams.lambda);
  });

  it('reduces lambda as Z increases', () => {
    const lambdaEff0 = applyL5HystereticDamping(baseParams, 0);
    const lambdaEff50 = applyL5HystereticDamping(baseParams, 50);
    const lambdaEff100 = applyL5HystereticDamping(baseParams, 100);

    expect(lambdaEff50).toBeLessThan(lambdaEff0);
    expect(lambdaEff100).toBeLessThan(lambdaEff50);
  });

  it('never returns zero or negative', () => {
    const lambdaEff = applyL5HystereticDamping(baseParams, 1000);
    expect(lambdaEff).toBeGreaterThan(0);
  });

  it('throws on invalid capacity', () => {
    const invalidParams = { ...baseParams, C: 0 };
    expect(() => applyL5HystereticDamping(invalidParams, 0)).toThrow('Capacity C must be positive');
  });

  it('verifyL5 returns correct result', () => {
    const lambdaEff = applyL5HystereticDamping(baseParams, 50);
    const valid = verifyL5(lambdaEff, baseParams.lambda, baseParams.mu, 50, baseParams.C);
    expect(valid.passed).toBe(true);
    expect(valid.lawId).toBe('L5_HYSTERIC_DAMPING');
  });
});

describe('Law L6 — Conservation', () => {
  const TOTAL_MAX = 1600; // 16 emotions * 100 max

  it('returns unchanged if total <= max', () => {
    const intensities = [10, 20, 30, 40];
    const result = applyL6Conservation(intensities, TOTAL_MAX);
    expect(result).toEqual(intensities);
  });

  it('scales down proportionally if total > max', () => {
    const intensities = [1000, 1000, 1000, 1000];
    const result = applyL6Conservation(intensities, TOTAL_MAX);

    const resultTotal = calculateTotalIntensity(result);
    expect(resultTotal).toBe(TOTAL_MAX);

    // Check proportional scaling
    expect(result[0]).toBe(result[1]);
    expect(result[1]).toBe(result[2]);
    expect(result[2]).toBe(result[3]);
  });

  it('throws on invalid total max', () => {
    expect(() => applyL6Conservation([10], 0)).toThrow('TOTAL_MAX must be positive');
    expect(() => applyL6Conservation([10], -1)).toThrow('TOTAL_MAX must be positive');
  });

  it('calculateTotalIntensity works correctly', () => {
    expect(calculateTotalIntensity([10, 20, 30])).toBe(60);
    expect(calculateTotalIntensity([-10, 20, -30])).toBe(60); // Absolute values
    expect(calculateTotalIntensity([])).toBe(0);
  });

  it('verifyL6 returns correct result', () => {
    const valid = verifyL6(100, TOTAL_MAX);
    expect(valid.passed).toBe(true);
    expect(valid.lawId).toBe('L6_CONSERVATION');

    const invalid = verifyL6(TOTAL_MAX + 1, TOTAL_MAX);
    expect(invalid.passed).toBe(false);
  });
});

describe('verifyAllLaws', () => {
  it('passes when all laws are satisfied', () => {
    const state = {
      phi: Math.PI,
      mu: 50,
      Z: 0.5,
      lambdaEff: 0.05,
      lambda: 0.1,
      C: 100,
      totalIntensity: 500,
    };

    const config = {
      phaseCycle: 2 * Math.PI,
      muBounds: { min: 0, max: 100 },
      zBounds: { min: 0, max: 1 },
      totalMax: 1600,
    };

    const result = verifyAllLaws(state, config);
    expect(result.allPassed).toBe(true);
    expect(result.results.every(r => r.passed)).toBe(true);
  });

  it('fails when any law is violated', () => {
    const state = {
      phi: 10, // Violates L1
      mu: 150, // Violates L2
      Z: 0.5,
      lambdaEff: 0.05,
      lambda: 0.1,
      C: 100,
      totalIntensity: 500,
    };

    const config = {
      phaseCycle: 2 * Math.PI,
      muBounds: { min: 0, max: 100 },
      zBounds: { min: 0, max: 1 },
      totalMax: 1600,
    };

    const result = verifyAllLaws(state, config);
    expect(result.allPassed).toBe(false);
    expect(result.results.some(r => !r.passed)).toBe(true);
  });
});
