/**
 * OMEGA V4.4 — Phase 6: CLI Pipeline Runner
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Pipeline: Phase 2 → Phase 3 → Phase 4 → Phase 5
 *
 * Commands:
 * - run: Execute pipeline on input
 * - verify: Compare output hashes
 * - clean: Remove output artifacts
 */

import { randomUUID } from 'node:crypto';
import { CoreEngine } from '../phase2_core/index.js';
import { hashObject } from '../phase2_core/hash.js';
import { Snapshot } from '../phase3_snapshot/index.js';
import type { SnapshotMeta } from '../phase3_snapshot/index.js';
import { Sentinel } from '../phase4_sentinel/index.js';
import { Mycelium } from '../phase5_mycelium/index.js';

import type {
  CLIRunInput,
  PipelineResult,
  PipelineRunOutput,
  PipelineMetadata,
  VerificationResult,
  VerificationDifference,
  HashManifest,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const VERSION = '4.4.0';

// ═══════════════════════════════════════════════════════════════════════════
// OMEGA CLI CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * OMEGA CLI - Pipeline Runner
 *
 * DETERMINISTIC: Same inputs = Same outputs = Same hash
 */
export class OmegaCLI {
  private readonly coreEngine: CoreEngine;
  private readonly sentinel: Sentinel;
  private readonly mycelium: Mycelium;

  constructor() {
    this.coreEngine = new CoreEngine();
    this.sentinel = new Sentinel();
    this.mycelium = new Mycelium();
  }

  /**
   * Run pipeline on inputs
   *
   * Pipeline: Phase 2 → Phase 3 → Phase 4 → Phase 5
   * Returns deterministic output with global hash
   */
  run(inputs: readonly CLIRunInput[]): PipelineRunOutput {
    const startTime = Date.now();
    const runId = randomUUID();

    // Execute pipeline for each input
    const results: PipelineResult[] = [];
    const snapshots: Snapshot[] = [];
    let validCount = 0;
    let invalidCount = 0;

    const meta: SnapshotMeta = {
      source: 'cli-pipeline',
      contractVersion: VERSION,
      coreVersion: VERSION,
    };

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      if (!input) continue;

      // Phase 2: Core computation
      const coreOutput = this.coreEngine.compute({
        text: input.text,
        timestamp: input.timestamp,
        sourceId: input.sourceId,
      });

      // Phase 3: Create snapshot
      const snapshot = Snapshot.create(coreOutput, {
        ...meta,
        prevSnapshotId: snapshots[snapshots.length - 1]?.snapshotId,
        sequence: i,
      });
      snapshots.push(snapshot);

      // Phase 4: Sentinel validation
      const validation = this.sentinel.decide({
        input: { text: input.text, timestamp: input.timestamp, sourceId: input.sourceId },
        coreOutput,
        snapshot,
      });

      if (validation.decision === 'ALLOW') {
        validCount++;
      } else {
        invalidCount++;
      }

      results.push({
        coreOutput,
        snapshot,
        validation,
      });
    }

    // Phase 5: Generate DNA from all snapshots
    const sourceText = inputs.map(i => i.text).join(' ');
    const dna = this.mycelium.compute(snapshots, sourceText);

    // Calculate global hash
    const globalHash = this.calculateGlobalHash(results, dna);

    // Calculate duration
    const durationMs = Date.now() - startTime;

    // Build metadata
    const metadata: PipelineMetadata = {
      runId,
      timestamp: startTime,
      inputCount: inputs.length,
      validCount,
      invalidCount,
      durationMs,
      version: VERSION,
    };

    return {
      results,
      dna,
      globalHash,
      metadata,
    };
  }

  /**
   * Verify output against baseline
   *
   * Compares global hashes for determinism verification
   */
  verify(baseline: PipelineRunOutput, current: PipelineRunOutput): VerificationResult {
    const differences: VerificationDifference[] = [];

    // Compare result counts
    if (baseline.results.length !== current.results.length) {
      differences.push({
        field: 'results.length',
        baseline: baseline.results.length,
        current: current.results.length,
      });
    }

    // Compare individual result hashes
    const minLength = Math.min(baseline.results.length, current.results.length);
    for (let i = 0; i < minLength; i++) {
      const baselineResult = baseline.results[i];
      const currentResult = current.results[i];

      if (baselineResult && currentResult) {
        if (baselineResult.coreOutput.computeHash !== currentResult.coreOutput.computeHash) {
          differences.push({
            field: `results[${i}].coreOutput.computeHash`,
            baseline: baselineResult.coreOutput.computeHash,
            current: currentResult.coreOutput.computeHash,
          });
        }

        if (baselineResult.snapshot.contentHash !== currentResult.snapshot.contentHash) {
          differences.push({
            field: `results[${i}].snapshot.contentHash`,
            baseline: baselineResult.snapshot.contentHash,
            current: currentResult.snapshot.contentHash,
          });
        }
      }
    }

    // Compare DNA hash
    if (baseline.dna.dnaHash !== current.dna.dnaHash) {
      differences.push({
        field: 'dna.dnaHash',
        baseline: baseline.dna.dnaHash,
        current: current.dna.dnaHash,
      });
    }

    return {
      matches: baseline.globalHash === current.globalHash,
      baselineHash: baseline.globalHash,
      currentHash: current.globalHash,
      differences,
    };
  }

  /**
   * Generate hash manifest from output
   *
   * For auditing and verification purposes
   */
  generateManifest(output: PipelineRunOutput): HashManifest {
    return {
      globalHash: output.globalHash,
      coreHashes: output.results.map(r => r.coreOutput.computeHash),
      snapshotHashes: output.results.map(r => r.snapshot.contentHash),
      dnaHash: output.dna.dnaHash,
      version: VERSION,
      timestamp: output.metadata.timestamp,
    };
  }

  /**
   * Calculate global hash from all pipeline outputs
   *
   * DETERMINISTIC: Same inputs produce same hash
   */
  private calculateGlobalHash(
    results: readonly PipelineResult[],
    dna: PipelineRunOutput['dna']
  ): string {
    // Hash all deterministic content
    const content = {
      coreHashes: results.map(r => r.coreOutput.computeHash),
      snapshotHashes: results.map(r => r.snapshot.contentHash),
      validationVerdicts: results.map(r => r.validation.verdict),
      dnaHash: dna.dnaHash,
      version: VERSION,
    };

    return hashObject(content);
  }

  /**
   * Re-run pipeline and verify determinism
   *
   * Runs same inputs twice and compares outputs
   */
  verifyDeterminism(inputs: readonly CLIRunInput[]): boolean {
    const run1 = this.run(inputs);
    const run2 = this.run(inputs);

    return run1.globalHash === run2.globalHash;
  }

  /**
   * Get version
   */
  getVersion(): string {
    return VERSION;
  }
}
