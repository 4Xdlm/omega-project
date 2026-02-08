/**
 * OMEGA Forge — Law 6: Affective Synthesis
 * Phase C.5 — A + B -> C if Phi_A + Phi_B > Threshold_Sigma
 * M_Sigma = sqrt(M1^2 + M2^2) + beta
 */

import type { LawVerification } from '../types.js';

/** Compute synthesis mass: M_Sigma = sqrt(M1^2 + M2^2) + beta */
export function computeSynthesisMass(M1: number, M2: number, beta: number): number {
  return Math.sqrt(M1 * M1 + M2 * M2) + beta;
}

/** Check if synthesis is possible: Phi_A + Phi_B > threshold */
export function checkSynthesis(
  phi_A: number,
  phi_B: number,
  threshold: number,
): { readonly compliant: boolean; readonly total_flux: number } {
  const total = phi_A + phi_B;
  return { compliant: total > threshold, total_flux: total };
}

/**
 * Detect emotional synthesis: when two strong emotions combine
 * into a third. E.g., fear + anger -> contempt.
 * Returns pairs of emotions that could be synthesizing.
 */
export function detectSynthesis(
  emotions: readonly { readonly emotion: string; readonly intensity: number }[],
  threshold: number,
): readonly { readonly a: string; readonly b: string; readonly combined_intensity: number }[] {
  const results: { readonly a: string; readonly b: string; readonly combined_intensity: number }[] = [];
  for (let i = 0; i < emotions.length; i++) {
    for (let j = i + 1; j < emotions.length; j++) {
      const combined = emotions[i].intensity + emotions[j].intensity;
      if (combined > threshold) {
        results.push({
          a: emotions[i].emotion,
          b: emotions[j].emotion,
          combined_intensity: combined,
        });
      }
    }
  }
  return results;
}

/** Verify Law 6 for a specific synthesis event */
export function verifyLaw6(
  phi_A: number,
  phi_B: number,
  M1: number,
  M2: number,
  beta: number,
  threshold: number,
  fromIndex: number,
  toIndex: number,
): LawVerification {
  const totalFlux = phi_A + phi_B;
  const compliant = totalFlux > threshold;
  const synthMass = computeSynthesisMass(M1, M2, beta);
  return {
    law: 'L6',
    paragraph_indices: [fromIndex, toIndex],
    compliant,
    measured_value: totalFlux,
    threshold,
    detail: compliant
      ? `Synthesis flux ${totalFlux.toFixed(3)} > threshold ${threshold}, M_sigma=${synthMass.toFixed(3)}`
      : `Synthesis flux ${totalFlux.toFixed(3)} <= threshold ${threshold} — insufficient for fusion`,
  };
}
