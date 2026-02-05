/**
 * PHASE F — NON-REGRESSION MODULE
 * Public exports for Phase F Non-Regression system.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type {
  // Status codes
  RegressionStatus,
  WaiverStatus,
  SealStatus,
  RegressionType,
  RegressionSeverity,

  // Baseline types
  BaselineTestResults,
  SealedBaseline,
  CandidateVersion,

  // Waiver types
  RegressionWaiver,
  WaiverRegistryState,

  // Result types
  RegressionFinding,
  RegressionCheckResult,
  RegressionSummary,
  RegressionMatrix,

  // Pipeline types
  RegressionPipelineArgs,
  RegressionCheckerFn,

  // Validation
  ValidationResult
} from './types.js';

export {
  // Constants
  REGRESSION_STATUSES,
  WAIVER_STATUSES,
  SEAL_STATUSES,
  REGRESSION_TYPES,
  REGRESSION_TYPE_NAMES,
  REGRESSION_SEVERITIES
} from './types.js';

// ─────────────────────────────────────────────────────────────
// BASELINE REGISTRY
// ─────────────────────────────────────────────────────────────

export type { BaselineRegistry } from './baseline_registry.js';

export {
  createBaselineRegistry,
  getActiveBaselines,
  findBaselineByVersion,
  findBaselineByCommit,
  findBaselineByTag,
  validateBaseline,
  isBaselineApplicable,
  compareBaselines,
  getRegistryStats
} from './baseline_registry.js';

// ─────────────────────────────────────────────────────────────
// WAIVER REGISTRY
// ─────────────────────────────────────────────────────────────

export {
  createWaiverRegistry,
  getActiveWaivers,
  findWaiversForBaseline,
  isGapWaived,
  isRegressionTypeWaived,
  determineWaiverStatus,
  validateWaiver,
  generateWaiverId,
  getWaiverStats
} from './waiver_registry.js';

// ─────────────────────────────────────────────────────────────
// REGRESSION RUNNER
// ─────────────────────────────────────────────────────────────

export {
  runRegressionCheck,
  detectTestCountRegression,
  detectFailureIncrease,
  detectAssertionDecrease,
  detectOutputMismatch,
  detectDurationRegression,
  determineStatus,
  generateCheckId,
  generateFindingId
} from './regression_runner.js';

// ─────────────────────────────────────────────────────────────
// MATRIX BUILDER
// ─────────────────────────────────────────────────────────────

export {
  buildRegressionMatrix,
  computeSummary,
  determineOverallStatus,
  requiresHumanDecision,
  generateEventId,
  validateMatrix,
  GENERATOR
} from './matrix_builder.js';

// ─────────────────────────────────────────────────────────────
// PIPELINE
// ─────────────────────────────────────────────────────────────

export {
  runRegressionPipeline,
  runRegressionPipelineWithChecker,
  filterApplicableBaselines,
  matchWaivers
} from './regression_pipeline.js';
