/**
 * PHASE H — HUMAN OVERRIDE MODULE
 * Public exports for Phase H Human Override system.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type {
  // Override types
  OverrideType,
  OverrideStatus,
  ApprovalMethod,
  OverrideRuleCode,

  // Structure types
  OverrideScope,
  OverrideJustification,
  OverrideApproval,
  OverrideValidity,
  ManifestRef,

  // Event and report types
  OverrideEvent,
  OverrideReport,
  OverrideSummary,

  // Validation types
  ConditionValidation,
  OverrideValidationResult,

  // Pipeline types
  OverridePipelineArgs
} from './types.js';

export {
  // Constants
  OVERRIDE_TYPES,
  OVERRIDE_MAX_DAYS,
  OVERRIDE_STATUSES,
  APPROVAL_METHODS,
  CONDITION_NAMES,
  OVERRIDE_RULES,
  OVERRIDE_RULE_NAMES
} from './types.js';

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

export {
  // ID generation
  generateOverrideEventId,
  generateOverrideId,
  generateOverrideReportId,

  // Hash computation
  computeContentHash,
  computeOverrideHash,
  verifyOverrideHash,

  // Condition validation
  validateCondition1,
  validateCondition2,
  validateCondition3,
  validateCondition4,
  validateCondition5,
  validateOverrideConditions,

  // Status helpers
  getOverrideStatus,
  isExpiringSoon,

  // Window computation
  computeWindow
} from './override_utils.js';

// ─────────────────────────────────────────────────────────────
// VALIDATORS
// ─────────────────────────────────────────────────────────────

export {
  // Cascade detection
  isCascadeOverride,
  validateNoCascade,
  findCascadeViolations,

  // Rule validation
  validateOVR001,
  validateOVR002,
  validateOVR003,
  validateOVR004,
  validateOVR005,
  validateAllRules
} from './validators/index.js';

export type { RuleViolation } from './validators/index.js';

// ─────────────────────────────────────────────────────────────
// REPORT BUILDER
// ─────────────────────────────────────────────────────────────

export {
  buildOverrideReport,
  computeSummary,
  determineEscalation,
  GENERATOR
} from './override_report.js';

// ─────────────────────────────────────────────────────────────
// PIPELINE
// ─────────────────────────────────────────────────────────────

export {
  runOverridePipeline,
  validateSingleOverride
} from './override_pipeline.js';
