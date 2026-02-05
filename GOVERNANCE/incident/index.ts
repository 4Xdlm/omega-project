/**
 * PHASE J — INCIDENT & ROLLBACK MODULE
 * Specification: INCIDENT_PROCESS.md
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * FINAL PHASE — EXCELLENCE ABSOLUE REQUISE
 *
 * INV-J-01: Incident classification valid
 * INV-J-02: Timestamp required (within 15 min)
 * INV-J-03: Evidence preservation
 * INV-J-04: Mandatory post-mortem for MEDIUM+
 * INV-J-05: Silence = violation
 * INV-J-06: Rollback requires human decision
 * INV-J-07: Rollback target must be verified stable
 * INV-J-08: No blame in post-mortem
 * INV-J-09: SLA compliance tracked
 * INV-J-10: NON-ACTUATING (report only)
 */

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type {
  // Incident types
  IncidentSeverity,
  IncidentSource,
  IncidentStatus,
  IncidentEvent,
  TimelineEntry,

  // Post-mortem types
  PostMortem,
  RootCauseCategory,
  ResolutionType,
  PreventiveAction,

  // Rollback types
  RollbackStatus,
  VerificationStatus,
  RollbackPlan,

  // Rule types
  IncidentRuleCode,
  IncidentRuleViolation,

  // Validation types
  IncidentValidationResult,

  // Report types
  IncidentSummary,
  IncidentReport,

  // Pipeline types
  IncidentPipelineArgs
} from './types.js';

export {
  // Severity constants
  INCIDENT_SEVERITIES,
  SEVERITY_SLA_HOURS,
  SEVERITY_DESCRIPTIONS,

  // Source constants
  INCIDENT_SOURCES,

  // Status constants
  INCIDENT_STATUSES,

  // Rollback constants
  ROLLBACK_STATUSES,
  VERIFICATION_STATUSES,

  // Rule constants
  INCIDENT_RULES,
  INCIDENT_RULE_NAMES,

  // Root cause constants
  ROOT_CAUSE_CATEGORIES,
  RESOLUTION_TYPES,

  // Invariant names
  INVARIANT_NAMES
} from './types.js';

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

export {
  // ID generation
  generateIncidentEventId,
  generateIncidentId,
  generatePostMortemId,
  generateRollbackId,
  generateIncidentReportId,

  // SLA computation
  computeSLADeadline,
  checkSLACompliance,
  checkImmediateLogging,

  // Validation
  validateIncidentEvent,
  validatePostMortem,
  validateRollbackPlan,

  // Utilities
  computeWindow,
  computeContentHash,
  requiresPostMortem
} from './incident_utils.js';

// ─────────────────────────────────────────────────────────────
// VALIDATORS
// ─────────────────────────────────────────────────────────────

export {
  // Rule validators (INC-001 to INC-005)
  validateINC001,
  validateINC002,
  validateINC003,
  validateINC004,
  validateINC005,
  validateAllRules,

  // Rollback validators (INV-J-06, INV-J-07)
  validateRollback,
  isRollbackSafe,
  validateRollbackPostExecution,
  type RollbackValidation
} from './validators/index.js';

// ─────────────────────────────────────────────────────────────
// POST-MORTEM GENERATOR
// ─────────────────────────────────────────────────────────────

export {
  generatePostMortem,
  generateBlameFreeStatement,
  createPostMortemTemplate,
  isPostMortemComplete,
  generateActionId,
  createPreventiveAction,
  type PostMortemGenerationOptions
} from './postmortem_generator.js';

// ─────────────────────────────────────────────────────────────
// REPORT BUILDER
// ─────────────────────────────────────────────────────────────

export {
  buildIncidentReport,
  computeReportHash,
  isHealthyReport,
  GENERATOR as INCIDENT_REPORT_GENERATOR
} from './incident_report.js';

// ─────────────────────────────────────────────────────────────
// PIPELINE
// ─────────────────────────────────────────────────────────────

export {
  runIncidentPipeline,
  validateIncidentWithContext,
  verifyPipelineDeterminism,
  requiresImmediateAttention,
  getIncidentsNeedingPostMortem,
  getRollbacksNeedingVerification,
  computeIncidentChainHash,
  type IncidentPipelineResult
} from './incident_pipeline.js';
