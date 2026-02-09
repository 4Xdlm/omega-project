/**
 * OMEGA Governance — Drift Types
 * Phase D.2 — Types for drift detection and classification
 */

import type { GovConfig } from '../core/config.js';

export type DriftLevel =
  | 'NO_DRIFT'
  | 'SOFT_DRIFT'
  | 'HARD_DRIFT'
  | 'CRITICAL_DRIFT';

export type DriftType =
  | 'FUNCTIONAL'
  | 'QUALITATIVE'
  | 'STRUCTURAL';

export interface DriftReport {
  readonly baseline: string;
  readonly candidate: string;
  readonly level: DriftLevel;
  readonly types: readonly DriftType[];
  readonly details: readonly DriftDetail[];
  readonly verdict: string;
  readonly config: GovConfig;
}

export interface DriftDetail {
  readonly type: DriftType;
  readonly path: string;
  readonly baseline_value: string;
  readonly candidate_value: string;
  readonly delta?: number;
  readonly rule: string;
}

export interface DriftAlert {
  readonly level: DriftLevel;
  readonly type: DriftType;
  readonly message: string;
  readonly detail: DriftDetail;
}

/** Drift classification rule */
export interface DriftRule {
  readonly id: string;
  readonly type: DriftType;
  readonly description: string;
  readonly evaluate: (baseline: string, candidate: string) => DriftDetail | null;
}
