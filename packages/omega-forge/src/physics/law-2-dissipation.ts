/**
 * OMEGA Forge — Law 2: Simple Dissipation
 * Phase C.5 — I(t) = I0 * e^(-lambda*t)
 * Simple case: M=1, kappa=1, E0=0, zeta>=1
 */

import type { LawVerification } from '../types.js';

/** Simple exponential decay: I(t) = I0 * e^(-lambda * t) */
export function simpleDissipation(
  I0: number,
  lambda: number,
  t: number,
): number {
  return I0 * Math.exp(-lambda * t);
}

/** Verify simple dissipation between two time steps */
export function verifyLaw2(
  actualIntensity: number,
  I0: number,
  lambda: number,
  t: number,
  tolerance: number,
  fromIndex: number,
  toIndex: number,
): LawVerification {
  const expected = simpleDissipation(I0, lambda, t);
  const deviation = Math.abs(actualIntensity - expected);
  const compliant = deviation <= tolerance;
  return {
    law: 'L2',
    paragraph_indices: [fromIndex, toIndex],
    compliant,
    measured_value: deviation,
    threshold: tolerance,
    detail: compliant
      ? `Dissipation deviation ${deviation.toFixed(4)} within tolerance ${tolerance}`
      : `Dissipation deviation ${deviation.toFixed(4)} exceeds tolerance ${tolerance}`,
  };
}
