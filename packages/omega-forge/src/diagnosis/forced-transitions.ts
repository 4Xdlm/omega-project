/**
 * OMEGA Forge — Forced Transition Detection
 * Phase C.5 — Transitions without sufficient narrative force
 */

import type { EmotionTransition } from '../types.js';

/** Filter transitions that were forced (L1 violated) */
export function detectForcedTransitions(
  transitions: readonly EmotionTransition[],
): readonly EmotionTransition[] {
  return transitions.filter((t) => t.forced_transition);
}

/** Filter transitions with feasibility failure (L3 violated) */
export function detectFeasibilityFailures(
  transitions: readonly EmotionTransition[],
): readonly EmotionTransition[] {
  return transitions.filter((t) => t.feasibility_fail);
}

/** Compute forced transition ratio */
export function forcedTransitionRatio(
  transitions: readonly EmotionTransition[],
): number {
  if (transitions.length === 0) return 0;
  const forced = transitions.filter((t) => t.forced_transition).length;
  return forced / transitions.length;
}
