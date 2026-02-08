/**
 * OMEGA Forge — Law 5: Flux Conservation
 * Phase C.5 — Delta_Phi_Total = Phi_Trans + Phi_Stock(Delta) + Phi_Diss
 * Energy accounting: emotional energy is transferred, stored, or dissipated.
 */

import type { FluxConservation, OmegaState, LawVerification } from '../types.js';

/**
 * Compute flux components for the entire text.
 * - Phi_transferred: sum of |delta_Y| across transitions (energy that moved)
 * - Phi_stored: sum of delta_Z across all states (energy stored as persistence)
 * - Phi_dissipated: sum of intensity loss not accounted for by transfer/storage
 */
export function computeFluxConservation(
  states: readonly OmegaState[],
  tolerance: number,
): FluxConservation {
  if (states.length < 2) {
    return {
      phi_transferred: 0,
      phi_stored: 0,
      phi_dissipated: 0,
      phi_total: 0,
      balance_error: 0,
      compliant: true,
    };
  }

  let phi_transferred = 0;
  let phi_stored = 0;
  let phi_dissipated = 0;

  for (let i = 1; i < states.length; i++) {
    const prev = states[i - 1];
    const curr = states[i];

    const deltaY = curr.Y - prev.Y;
    const deltaZ = curr.Z - prev.Z;

    if (deltaY > 0) {
      phi_transferred += deltaY;
    } else {
      const loss = Math.abs(deltaY);
      if (deltaZ > 0) {
        phi_stored += Math.min(deltaZ, loss);
        phi_dissipated += Math.max(0, loss - deltaZ);
      } else {
        phi_dissipated += loss;
      }
    }
  }

  const phi_total = phi_transferred + phi_stored + phi_dissipated;

  const totalInput = states.reduce((sum, s) => sum + Math.abs(s.Y), 0);
  const balance_error = totalInput > 0
    ? Math.abs(phi_transferred - phi_stored - phi_dissipated) / totalInput
    : 0;

  return {
    phi_transferred,
    phi_stored,
    phi_dissipated,
    phi_total,
    balance_error,
    compliant: balance_error <= tolerance,
  };
}

/** Verify Law 5 compliance */
export function verifyLaw5(
  states: readonly OmegaState[],
  tolerance: number,
): LawVerification {
  const flux = computeFluxConservation(states, tolerance);
  return {
    law: 'L5',
    paragraph_indices: [0, Math.max(0, states.length - 1)],
    compliant: flux.compliant,
    measured_value: flux.balance_error,
    threshold: tolerance,
    detail: flux.compliant
      ? `Flux balance error ${flux.balance_error.toFixed(4)} within tolerance ${tolerance}`
      : `Flux balance error ${flux.balance_error.toFixed(4)} exceeds tolerance ${tolerance}`,
  };
}
