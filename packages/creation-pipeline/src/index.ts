/**
 * OMEGA Creation Pipeline — Public API
 * Phase C.4 — E2E Orchestration + Proof-Pack + CLI
 */

// Types
export type {
  // Core
  C4Verdict, C4InvariantId, UnifiedGateId,
  IntentPack, IntentPackMetadata,
  ValidationResult, ValidationError,
  // Pipeline
  PipelineStageId, StageResult, PipelineTrace,
  // Gates
  UnifiedGateViolation, UnifiedGateResult, UnifiedGateChainResult,
  // Evidence
  MerkleNode, MerkleTree, ParagraphTrace, E2EEvidenceChain,
  // Proof-pack
  ProofPackManifest, ProofPackFile, ProofPack, VerificationResult,
  // Adversarial
  FuzzCategory, FuzzedIntentPack, ChaosResult, ChaosReport,
  // Output
  CreationResult,
  // Config
  C4ConfigSymbol, C4Config,
  // Report
  CreationMetrics, CreationReport,
  // CLI
  CLIArgs, CLIOutput,
} from './types.js';

// Re-exported types from C.1/C.2/C.3
export type {
  Intent, Canon, CanonEntry, Constraints, StyleGenomeInput, EmotionTarget,
  GenesisPlan, Arc, Scene, Beat, Seed, SubtextLayer,
  GConfig, GVerdict, GInvariantId,
  ScribeOutput, ProseDoc, ProseParagraph,
  SConfig, SVerdict, SInvariantId,
  StyledOutput, StyledParagraph, StyleProfile,
  EConfig, EVerdict, EInvariantId,
  StyleReport, ScribeReport, GenesisReport,
} from './types.js';

// Config
export { createDefaultC4Config, resolveC4ConfigRef, validateC4Config } from './config.js';

// Normalizer
export { normalizeLF, normalizeWhitespace, normalizeJSON, normalize } from './normalizer.js';

// IntentPack
export { validateIntentPack, normalizeIntentPack, hashIntentPack } from './intent-pack.js';

// Pipeline stages
export { stageValidate } from './pipeline/stage-validate.js';
export { stageGenesis } from './pipeline/stage-genesis.js';
export { stageScribe } from './pipeline/stage-scribe.js';
export { stageStyle } from './pipeline/stage-style.js';
export { stageUnifiedGates } from './pipeline/stage-gates.js';
export { stageEvidence } from './pipeline/stage-evidence.js';
export { stageReport } from './pipeline/stage-report.js';
export { stageProofPack } from './pipeline/stage-proofpack.js';

// Gates
export { runUnifiedTruthGate } from './gates/unified-truth-gate.js';
export { runUnifiedNecessityGate } from './gates/unified-necessity-gate.js';
export { runUnifiedCrossrefGate } from './gates/unified-crossref-gate.js';
export { runUnifiedBanalityGate } from './gates/unified-banality-gate.js';
export { runUnifiedStyleGate } from './gates/unified-style-gate.js';
export { runUnifiedEmotionGate } from './gates/unified-emotion-gate.js';
export { runUnifiedDiscomfortGate } from './gates/unified-discomfort-gate.js';
export { runUnifiedQualityGate } from './gates/unified-quality-gate.js';

// Evidence
export { buildMerkleTree, verifyMerkleTree, getMerklePath } from './evidence/merkle-tree.js';
export { traceParagraph, traceAllParagraphs } from './evidence/paragraph-trace.js';
export { buildE2EEvidenceChain, verifyE2EEvidenceChain } from './evidence/evidence-chain.js';

// Adversarial
export { generateFuzzedPacks } from './adversarial/fuzz-generator.js';
export { runChaos } from './adversarial/chaos-runner.js';

// Proof-pack
export { assembleProofPack, verifyProofPack } from './proof-pack.js';

// Report
export { creationReportToMarkdown } from './report.js';

// CLI
export { parseCLIArgs, validateCLIArgs, formatCLIOutput } from './cli.js';

// Engine
export { runCreation } from './engine.js';
