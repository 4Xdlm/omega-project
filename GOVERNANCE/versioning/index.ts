/**
 * PHASE I — VERSIONING & COMPATIBILITY MODULE
 * Public exports for Phase I Versioning system.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type {
  // Version types
  SemanticVersion,
  BumpType,
  CompatibilityType,
  CompatibilityStatus,
  BreakingChangeType,
  BreakingChange,
  Deprecation,
  MigrationEffort,
  MigrationPath,

  // Event types
  VersionContractEvent,

  // Rule types
  VersionRuleCode,
  VersionRuleViolation,

  // Validation types
  VersionValidationResult,

  // Matrix types
  CompatibilityCellStatus,
  CompatibilityMatrixEntry,
  CompatibilityMatrix,

  // Report types
  VersionSummary,
  VersionReport,

  // Pipeline types
  VersionPipelineArgs
} from './types.js';

export {
  // Constants
  BUMP_TYPES,
  COMPATIBILITY_TYPES,
  BREAKING_CHANGE_TYPES,
  MIGRATION_EFFORTS,
  VERSION_RULES,
  VERSION_RULE_NAMES,
  COMPATIBILITY_CELL_STATUSES,
  INVARIANT_NAMES
} from './types.js';

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

export {
  // Semver parsing
  parseSemver,
  formatSemver,
  isValidSemver,

  // Version comparison
  compareSemver,
  compareVersionStrings,

  // Bump detection
  detectBumpType,
  isDowngrade,

  // ID generation
  generateVersionEventId,
  generateVersionReportId,

  // Validation
  validateVersionEvent,

  // Window computation
  computeWindow,

  // Hash computation
  computeContentHash
} from './version_utils.js';

// ─────────────────────────────────────────────────────────────
// VALIDATORS
// ─────────────────────────────────────────────────────────────

export {
  // Rule validation
  validateVER001,
  validateVER002,
  validateVER003,
  validateVER004,
  validateVER005,
  validateAllRules,

  // Compatibility
  determineCompatibility,
  buildCompatibilityMatrix,
  getCompatibilityEntry,
  isUpgradePathAvailable
} from './validators/index.js';

// ─────────────────────────────────────────────────────────────
// REPORT BUILDER
// ─────────────────────────────────────────────────────────────

export {
  buildVersionReport,
  computeSummary,
  determineEscalation,
  GENERATOR
} from './version_report.js';

// ─────────────────────────────────────────────────────────────
// PIPELINE
// ─────────────────────────────────────────────────────────────

export {
  runVersionPipeline,
  validateSingleVersionEvent,
  validateVersionTransition
} from './version_pipeline.js';
