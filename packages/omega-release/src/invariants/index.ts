/**
 * OMEGA Release — Invariants Index
 * Phase G.0
 */

export type { InvariantResult, InvariantContext, InvariantStatus } from './types.js';
export {
  invVersionCoherence,
  invSemVerValidity,
  invVersionMonotonicity,
  invChangelogConsistency,
  invArtifactIntegrity,
  invSelfTestGate,
  invChecksumDeterminism,
  invPlatformCoverage,
  invBuildDeterminism,
  invManifestIntegrity,
  runAllInvariants,
} from './release-invariants.js';
