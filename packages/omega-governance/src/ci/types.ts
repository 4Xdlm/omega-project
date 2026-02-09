/**
 * OMEGA Governance — CI Types
 * Phase F — Non-regression runtime types
 */

import type { GateId, GateResult } from './gates/types.js';
import type { CIConfig } from './config.js';

export interface CIResult {
  readonly run_id: string;
  readonly baseline_version: string;
  readonly started_at: string;
  readonly completed_at: string;
  readonly duration_ms: number;
  readonly verdict: 'PASS' | 'FAIL';
  readonly gates: readonly GateResult[];
  readonly failed_gate?: GateId;
  readonly config: CIConfig;
}

export interface CIReport {
  readonly result: CIResult;
  readonly summary: CISummary;
  readonly recommendations: readonly string[];
}

export interface CISummary {
  readonly total_gates: number;
  readonly passed_gates: number;
  readonly failed_gates: number;
  readonly skipped_gates: number;
}

/** CI exit codes */
export const CI_EXIT_PASS = 0;
export const CI_EXIT_FAIL = 1;
export const CI_EXIT_USAGE = 2;
export const CI_EXIT_BASELINE_NOT_FOUND = 3;
export const CI_EXIT_IO = 4;
export const CI_EXIT_INVARIANT_BREACH = 5;
