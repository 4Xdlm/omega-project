/**
 * OMEGA Forge — Law 4: Organic Decay (V4.4 CORE)
 * Phase C.5 — I(t) = E0 + (I0 - E0) * e^(-lambda_eff * t) * cos(omega * t + phi)
 * lambda_eff = lambda_base * (1 - mu * Z(t)/C)
 * Regimes: underdamped (zeta<1), critical (zeta=1), overdamped (zeta>1)
 */

import type { EmotionPhysics, OrganicDecayAnalysis } from '../types.js';

/** Compute effective lambda with fatigue (hysteresis) */
export function computeLambdaEff(
  lambda_base: number,
  mu: number,
  Z: number,
  C: number,
): number {
  if (C === 0) return lambda_base;
  return lambda_base * (1 - mu * Z / C);
}

/** Detect damping regime from zeta */
export function detectZetaRegime(zeta: number): 'underdamped' | 'critical' | 'overdamped' {
  if (zeta < 0.99) return 'underdamped';
  if (zeta <= 1.01) return 'critical';
  return 'overdamped';
}

/**
 * Full V4.4 organic decay formula:
 * I(t) = E0 + (I0 - E0) * e^(-lambda_eff * t) * cos(omega * t + phi)
 *
 * For overdamped (zeta > 1): cos term is replaced by 1 (no oscillation)
 * For critical (zeta = 1): cos term is replaced by 1
 */
export function theoreticalDecay(
  I0: number,
  E0: number,
  lambda_base: number,
  mu: number,
  Z: number,
  C: number,
  zeta: number,
  omega: number,
  phi: number,
  t: number,
): number {
  const lambda_eff = computeLambdaEff(lambda_base, mu, Z, C);
  const amplitude = (I0 - E0) * Math.exp(-lambda_eff * t);

  const regime = detectZetaRegime(zeta);
  if (regime === 'underdamped') {
    return E0 + amplitude * Math.cos(omega * t + phi);
  }
  return E0 + amplitude;
}

/**
 * Compute natural frequency omega from zeta and lambda.
 * omega_n = lambda / zeta (for underdamped systems)
 * omega_d = omega_n * sqrt(1 - zeta^2)
 */
export function computeOmega(lambda: number, zeta: number): number {
  if (zeta >= 1) return 0;
  const omega_n = lambda / zeta;
  return omega_n * Math.sqrt(1 - zeta * zeta);
}

/** Analyze organic decay for a segment of paragraphs */
export function analyzeDecaySegment(
  actual: readonly number[],
  params: EmotionPhysics,
  Z_values: readonly number[],
  C: number,
): OrganicDecayAnalysis {
  if (actual.length === 0) {
    return {
      segment_start: 0,
      segment_end: 0,
      expected_curve: [],
      actual_curve: [],
      deviation: 0,
      zeta_regime: detectZetaRegime(params.zeta),
      compliant: true,
    };
  }

  const I0 = actual[0];
  const E0 = params.E0;
  const omega = computeOmega(params.lambda, params.zeta);
  const phi = 0;

  const expected: number[] = [];
  let sumSquaredError = 0;

  for (let t = 0; t < actual.length; t++) {
    const Z = t < Z_values.length ? Z_values[t] : 0;
    const theoretical = theoreticalDecay(
      I0, E0, params.lambda, params.mu, Z, C,
      params.zeta, omega, phi, t,
    );
    expected.push(theoretical);
    const error = actual[t] - theoretical;
    sumSquaredError += error * error;
  }

  const mse = actual.length > 0 ? sumSquaredError / actual.length : 0;

  return {
    segment_start: 0,
    segment_end: actual.length - 1,
    expected_curve: expected,
    actual_curve: [...actual],
    deviation: mse,
    zeta_regime: detectZetaRegime(params.zeta),
    compliant: mse <= 0.1,
  };
}
