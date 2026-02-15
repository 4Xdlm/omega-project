/**
 * OMEGA Sovereign — Generate Prescriptions
 * Consomme PhysicsAuditResult. ZÉRO appel omega-forge.
 * Déterministe : même audit → mêmes prescriptions → même hash.
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { Prescription, PrescriptionsDelta } from './types.js';
import type { PhysicsAuditResult } from '../oracle/physics-audit.js';

/**
 * Build prescriptions from PhysicsAuditResult.
 * If audit disabled or undefined → returns empty array.
 * Top-K prescriptions triées par sévérité + expected_gain.
 */
export function generatePrescriptions(
  audit: PhysicsAuditResult | undefined,
  topK: number,
): Prescription[] {
  if (!audit || audit.audit_id === 'disabled') {
    return [];
  }

  // Audit has prescriptions field already computed by physics-audit
  // We just filter top-K by severity (critical > high > medium)
  // then by expected_gain descending
  const prescriptions = [...audit.prescriptions];

  prescriptions.sort((a, b) => {
    const severityOrder = { critical: 3, high: 2, medium: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.expected_gain - a.expected_gain;
  });

  return prescriptions.slice(0, topK);
}

/**
 * Build PrescriptionsDelta from prescriptions list.
 * Used in delta-report for 6th dimension.
 */
export function buildPrescriptionsDelta(
  prescriptions: Prescription[],
): PrescriptionsDelta {
  if (prescriptions.length === 0) {
    const disabled: Omit<PrescriptionsDelta, 'delta_hash'> = {
      enabled: false,
      count: 0,
      severity_histogram: { critical: 0, high: 0, medium: 0 },
    };
    return { ...disabled, delta_hash: sha256(canonicalize(disabled)) };
  }

  const histogram = prescriptions.reduce(
    (acc, p) => {
      acc[p.severity]++;
      return acc;
    },
    { critical: 0, high: 0, medium: 0 } as { critical: number; high: number; medium: number },
  );

  const data: Omit<PrescriptionsDelta, 'delta_hash'> = {
    enabled: true,
    count: prescriptions.length,
    severity_histogram: histogram,
  };

  return { ...data, delta_hash: sha256(canonicalize(data)) };
}
