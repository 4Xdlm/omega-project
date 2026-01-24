/**
 * OMEGA V4.4 — Phase 6: CLI Types
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Pipeline: Phase 2 → Phase 3 → Phase 4 → Phase 5
 * Deterministic output with global hash
 */

import type { Snapshot } from '../phase3_snapshot/index.js';
import type { SentinelDecision } from '../phase4_sentinel/index.js';
import type { MyceliumDNA } from '../phase5_mycelium/index.js';
import type { CoreComputeOutput } from '../phase2_core/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CLI run input
 */
export interface CLIRunInput {
  readonly text: string;
  readonly timestamp: number;
  readonly sourceId: string;
}

/**
 * CLI configuration
 */
export interface CLIConfig {
  readonly outputDir: string;
  readonly inputFile?: string;
  readonly configFile?: string;
  readonly verbose?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Single pipeline execution result
 */
export interface PipelineResult {
  // Phase 2: Core computation
  readonly coreOutput: CoreComputeOutput;

  // Phase 3: Snapshot
  readonly snapshot: Snapshot;

  // Phase 4: Sentinel validation
  readonly validation: SentinelDecision;
}

/**
 * Complete pipeline run output
 */
export interface PipelineRunOutput {
  // Pipeline results (one per input)
  readonly results: readonly PipelineResult[];

  // Phase 5: Mycelium DNA (computed from all snapshots)
  readonly dna: MyceliumDNA;

  // Global hash (deterministic fingerprint of entire run)
  readonly globalHash: string;

  // Metadata
  readonly metadata: PipelineMetadata;
}

/**
 * Pipeline metadata
 */
export interface PipelineMetadata {
  readonly runId: string;
  readonly timestamp: number;
  readonly inputCount: number;
  readonly validCount: number;
  readonly invalidCount: number;
  readonly durationMs: number;
  readonly version: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verification result
 */
export interface VerificationResult {
  readonly matches: boolean;
  readonly baselineHash: string;
  readonly currentHash: string;
  readonly differences: readonly VerificationDifference[];
}

/**
 * Verification difference
 */
export interface VerificationDifference {
  readonly field: string;
  readonly baseline: unknown;
  readonly current: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
// ARTIFACT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Output artifacts
 */
export interface OutputArtifacts {
  readonly runOutput: string;        // run-output.json
  readonly hashManifest: string;     // hash-manifest.json
  readonly snapshotsDir: string;     // snapshots/
  readonly dnaOutput: string;        // dna.json
}

/**
 * Hash manifest
 */
export interface HashManifest {
  readonly globalHash: string;
  readonly coreHashes: readonly string[];
  readonly snapshotHashes: readonly string[];
  readonly dnaHash: string;
  readonly version: string;
  readonly timestamp: number;
}
