/**
 * OMEGA Runner — Run Invariants
 * Phase D.1 — Execute all INV-RUN-01..12 checks
 */

import type { InvariantResult, Manifest } from '../types.js';
import { canonicalJSON } from '../proofpack/canonical.js';
import { verifyProofPack } from '../proofpack/verify.js';
import {
  checkRunIdStable,
  checkManifestHash,
  checkNoPhantomFiles,
  checkArtifactHashed,
  checkOrderIndependent,
  checkReportDerived,
  checkStageComplete,
  checkSeedDefault,
  checkCrlfImmune,
  checkNoUndeclaredDeps,
  checkMerkleValid,
  checkVerifyIdempotent,
} from './checker.js';

/** Run all invariant checks for a completed run */
export function checkAllInvariants(
  manifest: Manifest,
  manifestHash: string,
  intentCanonical: string,
  reportJson: string,
  runDir: string,
  actualFiles: readonly string[],
  expectedStages: readonly string[],
  seed: string | undefined,
): readonly InvariantResult[] {
  const results: InvariantResult[] = [];

  // INV-RUN-01: RUN_ID_STABLE
  results.push(checkRunIdStable(
    intentCanonical,
    manifest.seed,
    manifest.versions as unknown as Record<string, string>,
    manifest.run_id,
  ));

  // INV-RUN-02: MANIFEST_HASH
  results.push(checkManifestHash(manifest, manifestHash));

  // INV-RUN-03: NO_PHANTOM_FILES
  results.push(checkNoPhantomFiles(manifest.artifacts, actualFiles));

  // INV-RUN-04: ARTIFACT_HASHED
  results.push(checkArtifactHashed(manifest.artifacts));

  // INV-RUN-05: ORDER_INDEPENDENT
  const leaves = manifest.artifacts.map((a) => ({ hash: a.sha256, label: a.path }));
  results.push(checkOrderIndependent(leaves, manifest.merkle_root));

  // INV-RUN-06: REPORT_DERIVED
  results.push(checkReportDerived(reportJson, manifest));

  // INV-RUN-07: STAGE_COMPLETE
  results.push(checkStageComplete(
    expectedStages,
    manifest.stages_completed as unknown as string[],
  ));

  // INV-RUN-08: SEED_DEFAULT
  results.push(checkSeedDefault(seed, manifest.seed));

  // INV-RUN-09: CRLF_IMMUNE
  const sampleContent = canonicalJSON(manifest);
  results.push(checkCrlfImmune(sampleContent, sampleContent.replace(/\n/g, '\r\n')));

  // INV-RUN-10: NO_UNDECLARED_DEPS
  results.push(checkNoUndeclaredDeps());

  // INV-RUN-11: MERKLE_VALID
  results.push(checkMerkleValid(leaves, manifest.merkle_root));

  // INV-RUN-12: VERIFY_IDEMPOTENT
  const v1 = verifyProofPack(runDir);
  const v2 = verifyProofPack(runDir);
  results.push(checkVerifyIdempotent(v1, v2));

  return results;
}
