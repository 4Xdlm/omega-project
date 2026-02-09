/**
 * OMEGA Runner — Invariants Index
 * Phase D.1 — Export all invariant functions
 */

export {
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

export { checkAllInvariants } from './run-invariants.js';
