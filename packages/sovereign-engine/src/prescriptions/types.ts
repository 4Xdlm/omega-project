/**
 * OMEGA Sovereign — Prescriptions Types
 * Sprint 3.3 — Prescriptions chirurgicales déterministes
 */

/**
 * Prescription chirurgicale issue du PhysicsAudit.
 * Action corrective précise avec localisation segment.
 */
export interface Prescription {
  readonly prescription_id: string;
  readonly segment_index: number;
  readonly severity: 'critical' | 'high' | 'medium';
  readonly type: 'dead_zone' | 'forced_transition' | 'feasibility' | 'trajectory' | 'telling' | 'ia_smell';
  readonly diagnosis: string;
  readonly action: string;
  readonly expected_gain: number; // 0-100
}

/**
 * Delta des prescriptions pour DeltaReport.
 * Résumé top-K des prescriptions les plus critiques.
 */
export interface PrescriptionsDelta {
  readonly enabled: boolean;
  readonly count: number;
  readonly severity_histogram: {
    readonly critical: number;
    readonly high: number;
    readonly medium: number;
  };
  readonly delta_hash: string;
}
