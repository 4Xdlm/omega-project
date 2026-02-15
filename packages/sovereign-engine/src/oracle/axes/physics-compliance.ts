/**
 * OMEGA Sovereign — Physics Compliance Axis
 * Roadmap Sprint 3.4 + 4.2 — Weight configurable (default 0)
 *
 * Converts PhysicsAuditResult → AxisScore (0-100).
 * Weight reads from SOVEREIGN_CONFIG.PHYSICS_COMPLIANCE_WEIGHT.
 * Default = 0 (INFORMATIF), can be activated after LIVE calibration.
 */

import type { AxisScore } from '../../types.js';
import type { PhysicsAuditResult } from '../physics-audit.js';
import { SOVEREIGN_CONFIG } from '../../config.js';

/**
 * Score physics compliance from audit result.
 * Simply wraps physics_score as an AxisScore.
 * Returns 50 (neutral) if audit disabled or undefined.
 * Weight is configurable via PHYSICS_COMPLIANCE_WEIGHT config.
 */
export function scorePhysicsCompliance(
  auditResult: PhysicsAuditResult | undefined,
): AxisScore {
  const weight = SOVEREIGN_CONFIG.PHYSICS_COMPLIANCE_WEIGHT; // 0 by default

  if (!auditResult || auditResult.audit_id === 'disabled') {
    return {
      name: 'physics_compliance',
      score: 50, // Neutral when disabled
      weight,
      method: 'CALC',
      details: 'Physics audit disabled or unavailable',
    };
  }

  const details =
    weight === 0
      ? `Physics score: ${auditResult.physics_score.toFixed(1)} (informatif, weight=0)`
      : `Physics score: ${auditResult.physics_score.toFixed(1)} (weight=${weight})`;

  return {
    name: 'physics_compliance',
    score: auditResult.physics_score,
    weight,
    method: 'CALC',
    details,
  };
}
