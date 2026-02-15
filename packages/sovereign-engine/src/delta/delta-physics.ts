/**
 * OMEGA Sovereign — Delta Physics
 * CONSOMME PhysicsAuditResult. ZÉRO appel omega-forge.
 * Déterministe : même audit → même delta → même hash.
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { PhysicsDelta } from '../types.js';
import type { PhysicsAuditResult } from '../oracle/physics-audit.js';

/**
 * Build PhysicsDelta from PhysicsAuditResult.
 * If audit disabled or undefined → returns disabled delta with stable hash.
 */
export function buildPhysicsDelta(audit: PhysicsAuditResult | undefined): PhysicsDelta {
  if (!audit || audit.audit_id === 'disabled') {
    const disabled: Omit<PhysicsDelta, 'delta_hash'> = {
      enabled: false,
      physics_score: 0,
      trajectory_compliance: { cosine_avg: 0, euclidean_avg: 0 },
      violations: { dead_zones_count: 0, forced_transitions_count: 0, feasibility_failures_count: 0 },
    };
    return { ...disabled, delta_hash: sha256(canonicalize(disabled)) };
  }

  const data: Omit<PhysicsDelta, 'delta_hash'> = {
    enabled: true,
    physics_score: audit.physics_score,
    trajectory_compliance: {
      cosine_avg: Number.isFinite(audit.trajectory_analysis.deviations.average_cosine)
        ? audit.trajectory_analysis.deviations.average_cosine : 0,
      euclidean_avg: Number.isFinite(audit.trajectory_analysis.deviations.average_euclidean)
        ? audit.trajectory_analysis.deviations.average_euclidean : 0,
    },
    violations: {
      dead_zones_count: audit.dead_zones.length,
      forced_transitions_count: audit.forced_transitions,
      feasibility_failures_count: audit.feasibility_failures,
    },
  };

  return { ...data, delta_hash: sha256(canonicalize(data)) };
}
