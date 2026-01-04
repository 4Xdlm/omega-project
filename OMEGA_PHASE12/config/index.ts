// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA PROJECT — CONFIG MODULE PUBLIC EXPORTS
// Phase 12 — Industrial Deployment
// ═══════════════════════════════════════════════════════════════════════════════

// Schema exports
export {
  validateOmegaConfig,
  REQUIRED_FIELDS,
  VALID_VALUES,
  type OmegaConfig,
  type OmegaRole,
  type OmegaEnvironment,
  type OmegaLogLevel,
  type ConfigValidationResult,
} from "./omega.config.schema.js";

// Loader exports
export {
  loadOmegaConfig,
  loadOmegaConfigFromString,
  validateConfig,
  isConfigError,
  OmegaConfigError,
  CONFIG_ERROR_CODES,
  type ConfigErrorCode,
} from "./omega.config.loader.js";

// Safe Mode exports
export {
  SafeModeController,
  createSafeModeController,
  validateRefusalLog,
  HITL_ACTIONS,
  FORBIDDEN_ACTIONS,
  type HITLAction,
  type ForbiddenAction,
  type CriticalAction,
  type ActionStatus,
  type ActionCheckResult,
  type RefusalLogEntry,
} from "./safe_mode.js";
