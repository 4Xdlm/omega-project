/**
 * OMEGA Runner — Types
 * Phase D.1 — Core type definitions
 */

import type { CreationResult } from '@omega/creation-pipeline';
import type { ForgeResult } from '@omega/omega-forge';
import type { LogEntry } from './logger/index.js';

// Re-export upstream types
export type { IntentPack, CreationResult } from '@omega/creation-pipeline';
export type { ForgeResult, ForgeReport } from '@omega/omega-forge';

/** Exit codes */
export const EXIT_SUCCESS = 0;
export const EXIT_GENERIC_ERROR = 1;
export const EXIT_USAGE_ERROR = 2;
export const EXIT_DETERMINISM_VIOLATION = 3;
export const EXIT_IO_ERROR = 4;
export const EXIT_INVARIANT_BREACH = 5;
export const EXIT_VERIFY_FAIL = 6;

/** CLI Command names */
export type CliCommand = 'run-create' | 'run-forge' | 'run-full' | 'run-report' | 'verify' | 'help' | 'version';

/** Parsed CLI arguments */
export interface ParsedArgs {
  readonly command: CliCommand;
  readonly intent?: string;
  readonly input?: string;
  readonly out?: string;
  readonly dir?: string;
  readonly seed?: string;
  readonly strict?: boolean;
  readonly format?: 'md' | 'json';
}

/** Run configuration */
export interface RunConfig {
  readonly seed: string;
  readonly outDir: string;
  readonly timestamp: string;
}

/** Stage identifier for ProofPack */
export type StageId = '00-intent' | '10-genesis' | '20-scribe' | '30-style' | '40-creation' | '50-forge';

/** ProofPack artifact entry */
export interface ArtifactEntry {
  readonly stage: StageId;
  readonly filename: string;
  readonly path: string;
  readonly sha256: string;
  readonly size: number;
}

/** Manifest structure */
export interface Manifest {
  readonly run_id: string;
  readonly seed: string;
  readonly versions: import('./version.js').VersionMap;
  readonly artifacts: readonly ArtifactEntry[];
  readonly merkle_root: string;
  readonly intent_hash: string;
  readonly final_hash: string;
  readonly verdict: string;
  readonly stages_completed: readonly StageId[];
}

/** Merkle tree node */
export interface MerkleNode {
  readonly hash: string;
  readonly left?: MerkleNode;
  readonly right?: MerkleNode;
  readonly label?: string;
}

/** Merkle tree structure */
export interface MerkleTree {
  readonly root: MerkleNode;
  readonly leaves: readonly MerkleNode[];
  readonly root_hash: string;
}

/** Run result (orchestrator output) */
export interface CreateRunResult {
  readonly run_id: string;
  readonly creation: CreationResult;
  readonly stages_completed: readonly StageId[];
  readonly log: readonly LogEntry[];
}

export interface ForgeRunResult {
  readonly run_id: string;
  readonly forge: ForgeResult;
  readonly stages_completed: readonly StageId[];
  readonly log: readonly LogEntry[];
}

export interface FullRunResult {
  readonly run_id: string;
  readonly creation: CreationResult;
  readonly forge: ForgeResult;
  readonly stages_completed: readonly StageId[];
  readonly log: readonly LogEntry[];
}

/** Verification result */
export interface VerifyResult {
  readonly run_id: string;
  readonly valid: boolean;
  readonly checks: readonly VerifyCheck[];
  readonly manifest_hash: string;
}

export interface VerifyCheck {
  readonly artifact: string;
  readonly expected_hash: string;
  readonly actual_hash: string;
  readonly valid: boolean;
}

/** Invariant result */
export interface InvariantResult {
  readonly id: string;
  readonly status: 'PASS' | 'FAIL' | 'SKIP';
  readonly message?: string;
  readonly evidence?: string;
}

/** Consolidated report */
export interface ConsolidatedReport {
  readonly run_id: string;
  readonly verdict: string;
  readonly creation_verdict?: string;
  readonly forge_verdict?: string;
  readonly stages: readonly StageId[];
  readonly invariants: readonly InvariantResult[];
  readonly manifest_hash: string;
  readonly merkle_root: string;
}
