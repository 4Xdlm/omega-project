/**
 * OMEGA Forge — Law 1: Emotional Inertia
 * Phase C.5 — |F| > M x R -> transition authorized
 * If narrative force is insufficient, transition is FORCED.
 */

import type { OmegaState, LawVerification, Beat } from '../types.js';

/** Check if force exceeds inertia threshold: |F| > M * R */
export function checkInertia(
  force: number,
  mass: number,
  resistance: number,
): { readonly compliant: boolean; readonly ratio: number } {
  const threshold = mass * resistance;
  if (threshold === 0) return { compliant: true, ratio: Infinity };
  const ratio = force / threshold;
  return { compliant: ratio > 1, ratio };
}

/**
 * Estimate narrative force from a beat and a transition.
 * Force is proportional to:
 * - Beat intensity (pivot beats have higher force)
 * - Information revealed (more info = more force)
 * - Magnitude of emotional change
 */
export function estimateNarrativeForce(
  beat: Beat | null,
  transition: { readonly from: OmegaState; readonly to: OmegaState },
): number {
  const deltaY = Math.abs(transition.to.Y - transition.from.Y);
  const deltaX = Math.abs(transition.to.X - transition.from.X);
  const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  if (!beat) {
    return magnitude * 0.3;
  }

  let beatForce = 1.0;
  if (beat.pivot) beatForce *= 2.0;
  beatForce += beat.information_revealed.length * 0.5;
  beatForce += Math.abs(beat.tension_delta) * 0.5;

  return beatForce * (1 + magnitude * 0.1);
}

/** Compute resistance from state change */
export function computeResistance(
  from: OmegaState,
  to: OmegaState,
): number {
  const deltaY = Math.abs(to.Y - from.Y);
  const deltaX = Math.abs(to.X - from.X);
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY) * 0.1 + 0.1;
}

/** Verify Law 1 for a single transition */
export function verifyLaw1(
  force: number,
  mass: number,
  resistance: number,
  fromIndex: number,
  toIndex: number,
): LawVerification {
  const threshold = mass * resistance;
  const compliant = force > threshold || threshold === 0;
  return {
    law: 'L1',
    paragraph_indices: [fromIndex, toIndex],
    compliant,
    measured_value: force,
    threshold,
    detail: compliant
      ? `Force ${force.toFixed(3)} > threshold ${threshold.toFixed(3)}`
      : `Force ${force.toFixed(3)} <= threshold ${threshold.toFixed(3)} — FORCED transition`,
  };
}
