/**
 * OMEGA Governance — Gates Types
 * Phase F — Types for CI gates G0-G5
 *
 * INV-F-04: Gates execute sequentially G0→G5, fail-fast.
 */

export type GateId = 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5';

export type GateVerdict = 'PASS' | 'FAIL' | 'SKIPPED';

export interface GateResult {
  readonly gate: GateId;
  readonly name: string;
  readonly verdict: GateVerdict;
  readonly duration_ms: number;
  readonly details: readonly string[];
  readonly checks: readonly GateCheck[];
}

export interface GateCheck {
  readonly id: string;
  readonly status: 'PASS' | 'FAIL';
  readonly message: string;
}

export interface GateContext {
  readonly baselineDir: string;
  readonly candidateDir: string;
  readonly baselinesDir: string;
  readonly baselineVersion: string;
  readonly seed: string;
}

/** All gates in order */
export const GATE_ORDER: readonly GateId[] = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5'];

/** Gate definitions */
export const GATE_DEFINITIONS: Readonly<Record<GateId, string>> = {
  G0: 'Pre-check: Verify baseline exists and is intact',
  G1: 'Replay: Verify deterministic replay',
  G2: 'Compare: Compare baseline vs candidate',
  G3: 'Drift: Detect and classify drift',
  G4: 'Bench: Benchmark against thresholds',
  G5: 'Certify: Certify the candidate run',
};
