/**
 * OMEGA Governance — Certify Types
 * Phase D.2 — Types for certification
 */

import type { GovConfig } from '../core/config.js';

export type CertVerdict = 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL';

export interface Certificate {
  readonly run_id: string;
  readonly verdict: CertVerdict;
  readonly checks: readonly CertCheck[];
  readonly scores: CertScores;
  readonly config: GovConfig;
  readonly signature: string;
}

export interface CertCheck {
  readonly id: string;
  readonly name: string;
  readonly status: 'PASS' | 'WARN' | 'FAIL';
  readonly message?: string;
}

export interface CertScores {
  readonly forge_score: number;
  readonly emotion_score: number;
  readonly quality_score: number;
  readonly trajectory_compliance: number;
}
