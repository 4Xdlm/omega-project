/**
 * OMEGA Governance — Public API
 * Phase D.2 — @omega/governance exports
 */

// Core types
export type {
  StageId, ArtifactEntry, VersionMap, Manifest,
  SerializedMerkleTree, MerkleLeaf, MerkleNodeSerialized,
  ForgeMetrics, ForgeReport, GovInvariantResult,
  ProofPackData, FileStat,
} from './core/types.js';
export {
  ALL_STAGES,
  EXIT_SUCCESS, EXIT_GENERIC_ERROR, EXIT_USAGE_ERROR,
  EXIT_PROOFPACK_INVALID, EXIT_IO_ERROR, EXIT_INVARIANT_BREACH,
  EXIT_DRIFT_DETECTED, EXIT_CERTIFICATION_FAIL,
} from './core/types.js';

// Config
export type { GovConfig } from './core/config.js';
export { DEFAULT_GOV_CONFIG, createConfig, validateConfig } from './core/config.js';

// Reader
export {
  readManifest, readManifestHash, readMerkleTree,
  readForgeReport, readProofPack, readArtifact, collectFileStats,
} from './core/reader.js';

// Validator
export type { ValidationCheck, ValidationResult } from './core/validator.js';
export {
  validateManifestHash, validateMerkleRoot,
  validateArtifactHashes, validateLeafCount, validateProofPack,
} from './core/validator.js';

// Compare
export type {
  CompareResult, CompareSummary, ArtifactDiff,
  ArtifactDiffStatus, ScoreComparison,
} from './compare/types.js';
export { diffArtifacts, countDiffsByStatus } from './compare/artifact-differ.js';
export { diffScores, hasSignificantScoreDelta } from './compare/score-differ.js';
export { compareRuns, compareMultipleRuns } from './compare/run-differ.js';
export { buildCompareReport, buildCompareMarkdown } from './compare/report-builder.js';

// Drift
export type {
  DriftLevel, DriftType, DriftReport, DriftDetail,
  DriftAlert, DriftRule,
} from './drift/types.js';
export { classifyNumericDrift, classifyHashDrift, classifyStructuralDrift, maxDriftLevel } from './drift/rules.js';
export { classifyOverallDrift } from './drift/classifier.js';
export { detectDrift } from './drift/detector.js';
export { generateAlerts, formatAlertsText } from './drift/alerter.js';

// Bench
export type {
  BenchSuite, BenchIntent, BenchThresholds,
  BenchRunResult, BenchAggregation, BenchReport, ThresholdCheck,
} from './bench/types.js';
export { loadSuite, loadIntent } from './bench/suite-loader.js';
export { extractBenchResult, extractBenchResults } from './bench/suite-runner.js';
export { aggregateResults, aggregateByIntent } from './bench/aggregator.js';
export { checkThresholds, buildBenchReport } from './bench/threshold-checker.js';
export { buildBenchMarkdown } from './bench/report-builder.js';

// Certify
export type { CertVerdict, Certificate, CertCheck, CertScores } from './certify/types.js';
export { runCertChecks } from './certify/checks.js';
export { certifyRun } from './certify/certifier.js';
export { certificateToJSON, certificateToMarkdown } from './certify/template.js';

// History
export type { RuntimeEvent, HistoryQuery, TrendAnalysis } from './history/types.js';
export { validateEvent, parseEventLine } from './history/event-schema.js';
export { createEventId, appendEvent, readEvents, verifyLogIntegrity } from './history/logger.js';
export { queryEvents, countByStatus, getUniqueRunIds } from './history/query-engine.js';
export { analyzeTrends, analyzeByMonth } from './history/trend-analyzer.js';

// Invariants
export {
  checkReadOnly, checkHashTrust, checkCompareSymmetric,
  checkDriftExplicit, checkBenchDeterministic, checkCertStable,
  checkLogAppendOnly, checkReportDerived, checkAvailableInvariants,
} from './invariants/index.js';

// CLI
export { parseGovArgs, getGovHelpText } from './cli/parser.js';
export type { GovCommand, GovParsedArgs } from './cli/parser.js';

// Phase F — CI Module
export {
  // Types & config
  CI_EXIT_PASS, CI_EXIT_FAIL, CI_EXIT_USAGE,
  CI_EXIT_BASELINE_NOT_FOUND, CI_EXIT_IO, CI_EXIT_INVARIANT_BREACH,
  DEFAULT_CI_CONFIG, createCIConfig,
  // Baseline
  readRegistry, writeRegistry, findBaseline, listBaselines,
  baselineExists, validateBaselinePath, registerBaseline,
  checkBaselineIntegrity, readBaselineManifest,
  generateBaselineCertificate, baselineCertificateToMarkdown,
  // Replay
  replayCompare, compareDirectories, hashFileNormalized,
  // Gates
  GATE_ORDER, GATE_DEFINITIONS,
  executeG0, executeG1, executeG2, executeG3, executeG4, executeG5,
  executeGates,
  // Reporter
  generateJSONReport, generateMarkdownReport,
  buildSummary, buildRecommendations,
  // Badge
  generateBadge, generateUnknownBadge,
} from './ci/index.js';

export type {
  CIResult, CIReport, CISummary, CIConfig,
  BaselineRegistry, BaselineEntry, BaselineManifest, BaselineIntentEntry, BaselineThresholds,
  ReplayResult, ReplayDifference, ReplayOptions,
  GateId, GateVerdict, GateResult, GateCheck, GateContext,
  OrchestratorResult,
  ReportFormat, ReportOutput,
  BadgeStatus, BadgeConfig, BadgeResult,
} from './ci/index.js';

// Phase F — CI Invariants
export {
  checkBaselineImmutable, checkReplaySameSeed, checkReplayByteIdentical,
  checkGatesSequential, checkThresholdsFromConfig, checkCertificateIncludesGates,
  checkReportPureFunction, checkBaselineRegisteredImmutable,
  checkBadgeReflectsVerdict, checkCIDeterministic,
  checkAvailableCIInvariants,
} from './invariants/ci-invariants.js';
