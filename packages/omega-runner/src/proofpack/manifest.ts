/**
 * OMEGA Runner — Manifest Generation
 * Phase D.1 — Deterministic manifest for ProofPack
 */

import type { ArtifactEntry, Manifest, StageId } from '../types.js';
import type { VersionMap } from '../version.js';
import { canonicalJSON } from './canonical.js';
import { hashString } from './hash.js';

/** Build a manifest from run artifacts */
export function buildManifest(
  runId: string,
  seed: string,
  versions: VersionMap,
  artifacts: readonly ArtifactEntry[],
  merkleRoot: string,
  intentHash: string,
  finalHash: string,
  verdict: string,
  stagesCompleted: readonly StageId[],
): Manifest {
  // Sort artifacts by path for determinism
  const sorted = [...artifacts].sort((a, b) => a.path.localeCompare(b.path));

  return {
    run_id: runId,
    seed,
    versions,
    artifacts: sorted,
    merkle_root: merkleRoot,
    intent_hash: intentHash,
    final_hash: finalHash,
    verdict,
    stages_completed: stagesCompleted,
  };
}

/** Hash a manifest (INV-RUN-02) */
export function hashManifest(manifest: Manifest): string {
  const json = canonicalJSON(manifest);
  return hashString(json);
}

/** Validate manifest structure */
export function validateManifest(manifest: Manifest): boolean {
  if (!manifest.run_id || manifest.run_id.length !== 16) return false;
  if (!manifest.merkle_root || manifest.merkle_root.length !== 64) return false;
  if (!manifest.intent_hash || manifest.intent_hash.length !== 64) return false;
  if (!manifest.final_hash || manifest.final_hash.length !== 64) return false;
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) return false;
  if (!Array.isArray(manifest.stages_completed) || manifest.stages_completed.length === 0) return false;
  return true;
}
