/**
 * OMEGA Runner — Public API
 * Phase D.1 — X4 Runner Global
 */

// Types
export type {
  IntentPack, CreationResult, ForgeResult, ForgeReport,
  CliCommand, ParsedArgs, RunConfig, StageId,
  ArtifactEntry, Manifest, MerkleNode, MerkleTree,
  CreateRunResult, ForgeRunResult, FullRunResult,
  VerifyResult, VerifyCheck, InvariantResult, ConsolidatedReport,
} from './types.js';

export {
  EXIT_SUCCESS, EXIT_GENERIC_ERROR, EXIT_USAGE_ERROR,
  EXIT_DETERMINISM_VIOLATION, EXIT_IO_ERROR,
  EXIT_INVARIANT_BREACH, EXIT_VERIFY_FAIL,
} from './types.js';

// Version
export { RUNNER_VERSION, getVersionMap } from './version.js';

// Config
export { createDefaultRunnerConfigs } from './config.js';

// Logger
export { createLogger } from './logger/index.js';
export type { Logger, LogLevel, LogEntry } from './logger/index.js';

// Orchestrators
export { orchestrateCreate } from './orchestrator/runCreate.js';
export { orchestrateForge } from './orchestrator/runForge.js';
export { orchestrateFull } from './orchestrator/runFull.js';
export { buildConsolidatedReport, buildMarkdownReport, buildReportFromManifest } from './orchestrator/runReport.js';

// ProofPack
export { canonicalJSON, canonicalPath, canonicalBytes } from './proofpack/canonical.js';
export { hashString, hashObject, hashFileContent, generateRunId } from './proofpack/hash.js';
export { buildMerkleTree, verifyMerkleRoot, serializeMerkleTree } from './proofpack/merkle.js';
export { buildManifest, hashManifest, validateManifest } from './proofpack/manifest.js';
export { writeProofPack } from './proofpack/write.js';
export { verifyProofPack } from './proofpack/verify.js';

// Invariants
export {
  checkRunIdStable, checkManifestHash, checkNoPhantomFiles,
  checkArtifactHashed, checkOrderIndependent, checkReportDerived,
  checkStageComplete, checkSeedDefault, checkCrlfImmune,
  checkNoUndeclaredDeps, checkMerkleValid, checkVerifyIdempotent,
  checkAllInvariants,
} from './invariants/index.js';

// CLI
export { parseArgs, validateArgs, getHelpText } from './cli/parser.js';
