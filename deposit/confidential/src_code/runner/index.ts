/**
 * OMEGA Runner Module v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Public API for runner operations.
 *
 * SPEC: RUNNER_SPEC v1.2 §I
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  CliCommand,
  ParsedArgs,
  RunResult,
  BatchResult,
  VerifyResult,
  HashMismatch,
  CapsuleResult,
  PathValidation,
  IntentValidation,
} from './types';

export {
  ExitCode,
  EXIT_CODE_DESCRIPTIONS,
  FIXED_PATHS,
  RUN_FILES,
  HASHABLE_FILES,
  DEFAULT_PROFILE,
  isCliCommand,
  isExitCode,
  isSafePath,
  isAllowedWritePath,
  validatePath,
  generateRunId,
  extractIntentId,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// CLI PARSER
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  CliOptions,
  ParseResult,
} from './cli-parser';

export {
  parseArgs,
  parseCliOptions,
  createDefaultArgs,
  validateParsedArgs,
  formatUsage,
  formatHelp,
  formatCommandHelp,
} from './cli-parser';

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  IntentData,
  GenerationContract,
  TruthGateVerdict,
  TruthGateProof,
  DeliveryOutput,
  StageResult,
  PipelineOptions,
  PipelineContext,
} from './pipeline';

export {
  computeHash,
  computeChainHash,
  validateIntent,
  mockGenerate,
  mockTruthGate,
  mockDelivery,
  createContext,
  addFile,
  computeRunHash,
  executePipeline,
  getPipelineFiles,
} from './pipeline';

// ═══════════════════════════════════════════════════════════════════════════════
// RUN DIRECTORY
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  RunDirectory,
  RunFile,
  RunContents,
} from './run-directory';

export {
  getNextSequence,
  createRunPath,
  createRunDirectory,
  getRunDirectory,
  writeRunFile,
  readRunFile,
  runFileExists,
  listRunFiles,
  writeAllRunFiles,
  readHashesFile,
  readRunHash,
  computeFileHash,
  listIntentFiles,
  readIntentFile,
} from './run-directory';

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFIER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  verifyFileHash,
  verifyHashes,
  verifyRunHash,
  verifyRun,
  detectTampering,
  isRunIntact,
} from './verifier';

// ═══════════════════════════════════════════════════════════════════════════════
// CAPSULE
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  CapsuleOptions,
  CapsuleEntry,
} from './capsule';

export {
  DEFAULT_CAPSULE_OPTIONS,
  collectRunFiles,
  validateCapsuleFiles,
  createCapsuleBuffer,
  computeCapsuleHash,
  generateCapsulePath,
  writeCapsuleFile,
  createCapsule,
  createCapsuleInMemory,
  verifyCapsuleDeterminism,
} from './capsule';

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ReportFormat,
  ReportOptions,
  LogEntry,
} from './report';

export {
  DEFAULT_REPORT_OPTIONS,
  formatExitCode,
  formatTimestamp,
  truncateHash,
  generateRunReport,
  generateRunReportMarkdown,
  generateRunReportJson,
  generateRunReportText,
  generateBatchReport,
  generateBatchReportMarkdown,
  generateBatchReportJson,
  generateVerifyReport,
  generateVerifyReportMarkdown,
  generateVerifyReportJson,
  generateCapsuleReport,
  generateCapsuleReportMarkdown,
  generateCapsuleReportJson,
  writeReportToRun,
  readReportFromRun,
  formatLogEntry,
  appendLog,
  createLogEntryFromRun,
  createLogEntryFromVerify,
} from './report';
