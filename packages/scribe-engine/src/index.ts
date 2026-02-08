/**
 * OMEGA Scribe Engine -- Public API
 * Phase C.2 -- Governed Writing Engine
 * @module @omega/scribe-engine
 */

// Types
export type {
  SVerdict, SInvariantId, GateId, OracleId,
  SegmentType, Segment,
  SkeletonDoc,
  ProseParagraph, ProseDoc,
  GateViolation, GateResult, GateChainResult,
  OracleResult, OracleChainResult,
  RewriteCandidate, RewriteHistory,
  ScribeOutput,
  SConfigSymbol, SConfig,
  SEvidenceStep, SEvidenceChain,
  ScribeMetrics, ScribeReport,
} from './types.js';

// Re-exported genesis-planner types
export type {
  GenesisPlan, Arc, Scene, Beat, Seed, SubtextLayer,
  Canon, CanonEntry, Constraints, StyleGenomeInput, EmotionTarget,
  GConfig, GConfigSymbol, GVerdict,
} from './types.js';

// Config
export { createDefaultSConfig, resolveSConfigRef, validateSConfig } from './config.js';

// Normalizer
export { normalizeLF, normalizeWhitespace, normalizeJSON, normalize } from './normalizer.js';

// Pipeline modules
export { segmentPlan } from './segmenter.js';
export { buildSkeleton } from './skeleton.js';
export { weave } from './weaver.js';
export { addSensoryLayer } from './sensory.js';
export { rewriteLoop } from './rewriter.js';

// Gates
export { runTruthGate } from './gates/truth-gate.js';
export { runNecessityGate } from './gates/necessity-gate.js';
export { runBanalityGate } from './gates/banality-gate.js';
export { runStyleGate } from './gates/style-gate.js';
export { runEmotionGate } from './gates/emotion-gate.js';
export { runDiscomfortGate } from './gates/discomfort-gate.js';
export { runQualityGate } from './gates/quality-gate.js';

// Oracles
export { runOracleTruth } from './oracles/oracle-truth.js';
export { runOracleNecessity } from './oracles/oracle-necessity.js';
export { runOracleStyle } from './oracles/oracle-style.js';
export { runOracleEmotion } from './oracles/oracle-emotion.js';
export { runOracleBanality } from './oracles/oracle-banality.js';
export { runOracleCrossref } from './oracles/oracle-crossref.js';

// Evidence
export { createSEvidenceChainBuilder, verifySEvidenceChain } from './evidence.js';
export type { SEvidenceChainBuilder } from './evidence.js';

// Report
export { generateScribeReport, scribeReportToMarkdown } from './report.js';

// Engine
export { runScribe } from './engine.js';
