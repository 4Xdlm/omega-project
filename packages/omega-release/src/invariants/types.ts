/**
 * OMEGA Release — Invariant Types
 * Phase G.0 — Release invariant verification
 */

export type InvariantStatus = 'PASS' | 'FAIL' | 'SKIP';

export interface InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly status: InvariantStatus;
  readonly message: string;
  readonly duration_ms: number;
}

export interface InvariantContext {
  readonly projectRoot: string;
  readonly version: string;
  readonly packageJsonVersion?: string;
  readonly artifacts?: readonly { filename: string; sha256: string }[];
  readonly selfTestVerdict?: 'PASS' | 'FAIL';
  readonly changelogContent?: string;
}
