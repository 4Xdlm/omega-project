/**
 * PHASE G — MISUSE CONTROL MODULE
 * Public exports for Phase G Misuse Detection system.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type {
  // Case codes
  MisuseCaseCode,
  MisuseSeverity,
  AutoAction,
  DetectionMethod,
  RecommendedActionType,

  // Input types
  MisuseInputEvent,
  OverrideRecord,
  DecisionRecord,
  LogChainEntry,
  EventRegistry,
  ThresholdHistoryEntry,
  MisuseObservationSources,

  // Pattern types
  MisusePattern,

  // Evidence types
  MisuseEvidence,
  RecommendedAction,

  // Result types
  MisuseEvent,
  MisuseSummary,
  MisuseReport,

  // Pipeline types
  MisuseDetectorFn,
  MisusePipelineArgs,

  // Validation
  ValidationResult
} from './types.js';

export {
  // Constants
  MISUSE_CASE_CODES,
  MISUSE_CASE_NAMES,
  MISUSE_SEVERITIES,
  CASE_SEVERITY_MAP,
  DETECTION_METHODS,
  AUTO_ACTION_NONE,
  PROMPT_INJECTION_PATTERNS
} from './types.js';

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

export {
  generateMisuseEventId,
  generateMisuseReportId,
  validateMisuseEvent,
  validateMisuseReport,
  computeContentHash,
  verifyHashChain,
  findHashChainBreaks,
  computeWindow,
  getHighestSeverity,
  requiresEscalation
} from './misuse_utils.js';

// ─────────────────────────────────────────────────────────────
// DETECTORS
// ─────────────────────────────────────────────────────────────

export {
  detectPromptInjection,
  detectThresholdGaming,
  detectOverrideAbuse,
  detectLogTampering,
  detectReplayAttack
} from './detectors/index.js';

// ─────────────────────────────────────────────────────────────
// REPORT BUILDER
// ─────────────────────────────────────────────────────────────

export {
  buildMisuseReport,
  computeSummary,
  determineEscalation,
  GENERATOR
} from './misuse_report.js';

// ─────────────────────────────────────────────────────────────
// PIPELINE
// ─────────────────────────────────────────────────────────────

export {
  runMisusePipeline,
  runMisusePipelineWithDetectors,
  ALL_DETECTORS
} from './misuse_pipeline.js';
