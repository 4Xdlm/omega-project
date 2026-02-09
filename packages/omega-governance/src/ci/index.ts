/**
 * OMEGA Governance — CI Module Index
 * Phase F — Non-regression runtime barrel exports
 */

// CI types & config
export type { CIResult, CIReport, CISummary } from './types.js';
export { CI_EXIT_PASS, CI_EXIT_FAIL, CI_EXIT_USAGE, CI_EXIT_BASELINE_NOT_FOUND, CI_EXIT_IO, CI_EXIT_INVARIANT_BREACH } from './types.js';
export type { CIConfig } from './config.js';
export { DEFAULT_CI_CONFIG, createCIConfig } from './config.js';

// Baseline
export type { BaselineRegistry, BaselineEntry, BaselineManifest, BaselineIntentEntry, BaselineThresholds } from './baseline/types.js';
export { readRegistry, writeRegistry, findBaseline, listBaselines, baselineExists, validateBaselinePath } from './baseline/registry.js';
export { registerBaseline } from './baseline/register.js';
export { checkBaselineIntegrity, readBaselineManifest } from './baseline/checker.js';
export { generateBaselineCertificate, baselineCertificateToMarkdown } from './baseline/certificate.js';

// Replay
export type { ReplayResult, ReplayDifference, ReplayOptions } from './replay/types.js';
export { replayCompare } from './replay/engine.js';
export { compareDirectories, hashFileNormalized } from './replay/comparator.js';

// Gates
export type { GateId, GateVerdict, GateResult, GateCheck, GateContext } from './gates/types.js';
export { GATE_ORDER, GATE_DEFINITIONS } from './gates/types.js';
export { executeG0 } from './gates/g0-precheck.js';
export { executeG1 } from './gates/g1-replay.js';
export { executeG2 } from './gates/g2-compare.js';
export { executeG3 } from './gates/g3-drift.js';
export { executeG4 } from './gates/g4-bench.js';
export { executeG5 } from './gates/g5-certify.js';
export type { OrchestratorResult } from './gates/orchestrator.js';
export { executeGates } from './gates/orchestrator.js';

// Reporter
export type { ReportFormat, ReportOutput } from './reporter/types.js';
export { generateJSONReport } from './reporter/json-reporter.js';
export { generateMarkdownReport } from './reporter/markdown-reporter.js';
export { buildSummary, buildRecommendations } from './reporter/summary.js';

// Badge
export type { BadgeStatus, BadgeConfig, BadgeResult } from './badge/types.js';
export { generateBadge, generateUnknownBadge } from './badge/generator.js';
