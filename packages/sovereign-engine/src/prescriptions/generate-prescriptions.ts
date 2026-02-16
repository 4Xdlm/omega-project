/**
 * OMEGA Sovereign — Generate Prescriptions
 * Consomme PhysicsAuditResult, TellingResult, AuthenticityResult.
 * ZÉRO appel omega-forge. Déterministe : même audit → mêmes prescriptions → même hash.
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { Prescription, PrescriptionsDelta } from './types.js';
import type { PhysicsAuditResult } from '../oracle/physics-audit.js';
import type { TellingResult } from '../silence/show-dont-tell.js';
import type { AuthenticityResult } from '../authenticity/authenticity-scorer.js';

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

/**
 * Generate prescriptions from TellingResult (Show Don't Tell violations).
 * Sprint 11.5 — ART-SDT-02.
 *
 * @param tellingResult - Result from detectTelling()
 * @returns Array of telling prescriptions
 */
export function generateTellingPrescriptions(tellingResult: TellingResult): Prescription[] {
  if (!tellingResult || tellingResult.violations.length === 0) {
    return [];
  }

  return tellingResult.worst_violations.map((violation, index) => ({
    prescription_id: `SDT_${violation.pattern_id}_${violation.sentence_index}`,
    segment_index: violation.sentence_index,
    severity: violation.severity,
    type: 'telling' as const,
    diagnosis: `Telling violation: "${violation.sentence.slice(0, 50)}..."`,
    action: `Replace telling with showing: ${violation.suggested_show}`,
    expected_gain: 15 + index * 2, // Gains décroissants 15, 17, 19...
  }));
}

/**
 * Generate prescriptions from AuthenticityResult (IA smell patterns).
 * Sprint 11.5 — ART-AUTH-01.
 *
 * @param authResult - Result from scoreAuthenticity()
 * @returns Array of authenticity prescriptions
 */
export function generateAuthenticityPrescriptions(authResult: AuthenticityResult): Prescription[] {
  if (!authResult || authResult.pattern_hits.length === 0) {
    return [];
  }

  // Severity based on combined_score: <40 = critical, <70 = high, else medium
  const severity: 'critical' | 'high' | 'medium' =
    authResult.combined_score < 40 ? 'critical' : authResult.combined_score < 70 ? 'high' : 'medium';

  return authResult.pattern_hits.slice(0, 3).map((pattern_id, index) => ({
    prescription_id: `AUTH_${pattern_id}_${index}`,
    segment_index: 0, // Global to prose, not segment-specific
    severity,
    type: 'ia_smell' as const,
    diagnosis: `IA smell pattern detected: ${pattern_id}`,
    action: 'Break symmetry, add micro-ruptures, reduce perfect transitions, concretize',
    expected_gain: 10 + index * 2, // Gains décroissants 10, 12, 14
  }));
}
