/**
 * OMEGA Forge — Law 3: Emotional Feasibility
 * Phase C.5 — F <= threshold -> forced/dissonant emotion
 * No transition without sufficient narrative energy.
 */

import type { OmegaState, LawVerification, Beat } from '../types.js';
import { estimateNarrativeForce } from './law-1-inertia.js';

/** Minimum force required for a feasible transition */
export function feasibilityThreshold(
  from: OmegaState,
  to: OmegaState,
): number {
  const deltaY = Math.abs(to.Y - from.Y);
  const deltaX = Math.abs(to.X - from.X);
  return (deltaX + deltaY) * 0.05 + 0.1;
}

/** Check if a transition is feasible (has enough narrative energy) */
export function checkFeasibility(
  force: number,
  from: OmegaState,
  to: OmegaState,
): { readonly compliant: boolean; readonly ratio: number } {
  const threshold = feasibilityThreshold(from, to);
  if (threshold === 0) return { compliant: true, ratio: Infinity };
  const ratio = force / threshold;
  return { compliant: ratio >= 1, ratio };
}

/** Verify Law 3 for a single transition */
export function verifyLaw3(
  beat: Beat | null,
  from: OmegaState,
  to: OmegaState,
  fromIndex: number,
  toIndex: number,
): LawVerification {
  const force = estimateNarrativeForce(beat, { from, to });
  const threshold = feasibilityThreshold(from, to);
  const compliant = force >= threshold;
  return {
    law: 'L3',
    paragraph_indices: [fromIndex, toIndex],
    compliant,
    measured_value: force,
    threshold,
    detail: compliant
      ? `Narrative energy ${force.toFixed(3)} >= feasibility threshold ${threshold.toFixed(3)}`
      : `Narrative energy ${force.toFixed(3)} < feasibility threshold ${threshold.toFixed(3)} — dissonant transition`,
  };
}
