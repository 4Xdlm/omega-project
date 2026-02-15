/**
 * OMEGA Sovereign — Physics Compliance Axis
 * Roadmap Sprint 3.4 — INFORMATIF (poids=0 dans ECC)
 *
 * Converts PhysicsAuditResult → AxisScore (0-100).
 * Weight = 0 until calibration proves correlation.
 */

import type { AxisScore } from '../../types.js';
import type { PhysicsAuditResult } from '../physics-audit.js';

/**
 * Score physics compliance from audit result.
 * Simply wraps physics_score as an AxisScore.
 * Returns 50 (neutral) if audit disabled or undefined.
 */
export function scorePhysicsCompliance(
  auditResult: PhysicsAuditResult | undefined,
): AxisScore {
  if (!auditResult || auditResult.audit_id === 'disabled') {
    return {
      name: 'physics_compliance',
      score: 50, // Neutral when disabled
      weight: 0,     // INFORMATIF — does NOT affect composite
      method: 'CALC',
      details: 'Physics audit disabled',
    };
  }

  return {
    name: 'physics_compliance',
    score: auditResult.physics_score,
    weight: 0,     // INFORMATIF — poids=0 jusqu'à calibration
    method: 'CALC',
    details: `Physics score: ${auditResult.physics_score.toFixed(1)} (informatif, weight=0)`,
  };
}
