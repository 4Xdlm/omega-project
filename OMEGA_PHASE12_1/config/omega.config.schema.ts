// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA PROJECT — CONFIGURATION SCHEMA
// Phase 12 — Industrial Deployment
// Standard: NASA-Grade L4 / DO-178C Level A
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS COVERED:
// - INV-CFG-01: Validation stricte au démarrage
// - INV-CFG-02: Config invalide = refus démarrage
// - INV-CFG-03: Zéro valeur par défaut implicite
// - INV-CFG-04: Config Object.freeze()
// - INV-SAFE-01: SAFE MODE true par défaut
//
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Role levels for OMEGA governance
 * Maps to Phase 11 INV-GOV-01
 */
export type OmegaRole = "USER" | "AUDITOR" | "ADMIN" | "ARCHITECT";

/**
 * Environment types - explicit, no implicit defaults
 */
export type OmegaEnvironment = "dev" | "staging" | "prod";

/**
 * Log levels for audit trail
 */
export type OmegaLogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * Main configuration structure
 * ALL fields are REQUIRED - no implicit defaults (INV-CFG-03)
 */
export interface OmegaConfig {
  /** Version string, must match semver pattern */
  readonly version: string;
  
  /** Deployment environment */
  readonly environment: OmegaEnvironment;
  
  /** SAFE MODE - MUST be true by default (INV-SAFE-01) */
  readonly safe_mode: boolean;
  
  /** Audit configuration */
  readonly audit: {
    /** Enable forensic export capability */
    readonly enable_forensic_export: boolean;
    /** Logging level */
    readonly log_level: OmegaLogLevel;
    /** Retain logs for N days */
    readonly retention_days: number;
  };
  
  /** Operational limits */
  readonly limits: {
    /** Maximum input size in bytes */
    readonly max_input_bytes: number;
    /** Maximum execution time in milliseconds */
    readonly max_run_ms: number;
    /** Maximum concurrent operations */
    readonly max_concurrent_ops: number;
  };
  
  /** Deployment metadata */
  readonly deployment: {
    /** Deployment timestamp ISO 8601 */
    readonly deployed_at: string;
    /** Deployer identifier */
    readonly deployed_by: string;
    /** Git commit hash */
    readonly commit_hash: string;
  };
}

/**
 * Validation result - explicit success or failure with errors
 * Supports INV-HARD-04 (explicit states)
 */
export type ConfigValidationResult =
  | { readonly ok: true; readonly config: OmegaConfig }
  | { readonly ok: false; readonly errors: readonly string[] };

/**
 * Deep freeze an object recursively
 * Supports INV-CFG-04 (immutability)
 */
function deepFreeze<T extends object>(obj: T): Readonly<T> {
  const propNames = Object.getOwnPropertyNames(obj) as (keyof T)[];
  
  for (const name of propNames) {
    const value = obj[name];
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value as object);
    }
  }
  
  return Object.freeze(obj);
}

/**
 * Check if value is a non-null object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check if string matches semver pattern (simplified)
 */
function isSemver(value: string): boolean {
  return /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(value);
}

/**
 * Check if string is valid ISO 8601 date
 */
function isISO8601(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes("T");
}

/**
 * Check if string is valid SHA-1 or SHA-256 hash
 */
function isGitHash(value: string): boolean {
  return /^[a-f0-9]{7,64}$/i.test(value);
}

/**
 * Validate OMEGA configuration
 * 
 * This function performs STRICT validation with NO implicit defaults.
 * Any missing or invalid field results in validation failure.
 * 
 * @param raw - Raw configuration object (typically parsed from JSON)
 * @returns ConfigValidationResult with frozen config or error list
 * 
 * INVARIANTS:
 * - INV-CFG-01: All fields validated
 * - INV-CFG-02: Returns ok:false on any invalid field
 * - INV-CFG-03: No default values applied
 * - INV-CFG-04: Returns frozen object on success
 * - INV-SAFE-01: Rejects if safe_mode !== true
 */
export function validateOmegaConfig(raw: unknown): ConfigValidationResult {
  const errors: string[] = [];
  
  // Root level validation
  if (!isObject(raw)) {
    return { ok: false, errors: ["CONFIG_ROOT: must be a non-null object"] };
  }
  
  const obj = raw as Record<string, unknown>;
  
  // ─────────────────────────────────────────────────────────────────────────
  // VERSION validation
  // ─────────────────────────────────────────────────────────────────────────
  if (typeof obj.version !== "string") {
    errors.push("version: required string");
  } else if (!obj.version.trim()) {
    errors.push("version: cannot be empty");
  } else if (!isSemver(obj.version)) {
    errors.push("version: must match semver pattern (e.g., v1.0.0 or 1.0.0-beta)");
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // ENVIRONMENT validation
  // ─────────────────────────────────────────────────────────────────────────
  const validEnvs: OmegaEnvironment[] = ["dev", "staging", "prod"];
  if (typeof obj.environment !== "string") {
    errors.push("environment: required string");
  } else if (!validEnvs.includes(obj.environment as OmegaEnvironment)) {
    errors.push(`environment: must be one of [${validEnvs.join(", ")}]`);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // SAFE_MODE validation (INV-SAFE-01: MUST be true)
  // ─────────────────────────────────────────────────────────────────────────
  if (typeof obj.safe_mode !== "boolean") {
    errors.push("safe_mode: required boolean");
  } else if (obj.safe_mode !== true) {
    errors.push("safe_mode: MUST be true (INV-SAFE-01 - SAFE MODE mandatory in Phase 12)");
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // AUDIT validation
  // ─────────────────────────────────────────────────────────────────────────
  if (!isObject(obj.audit)) {
    errors.push("audit: required object");
  } else {
    const audit = obj.audit as Record<string, unknown>;
    
    if (typeof audit.enable_forensic_export !== "boolean") {
      errors.push("audit.enable_forensic_export: required boolean");
    }
    
    const validLogLevels: OmegaLogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR"];
    if (typeof audit.log_level !== "string") {
      errors.push("audit.log_level: required string");
    } else if (!validLogLevels.includes(audit.log_level as OmegaLogLevel)) {
      errors.push(`audit.log_level: must be one of [${validLogLevels.join(", ")}]`);
    }
    
    if (typeof audit.retention_days !== "number") {
      errors.push("audit.retention_days: required number");
    } else if (!Number.isInteger(audit.retention_days) || audit.retention_days < 1) {
      errors.push("audit.retention_days: must be positive integer >= 1");
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // LIMITS validation
  // ─────────────────────────────────────────────────────────────────────────
  if (!isObject(obj.limits)) {
    errors.push("limits: required object");
  } else {
    const limits = obj.limits as Record<string, unknown>;
    
    if (typeof limits.max_input_bytes !== "number") {
      errors.push("limits.max_input_bytes: required number");
    } else if (!Number.isInteger(limits.max_input_bytes) || limits.max_input_bytes <= 0) {
      errors.push("limits.max_input_bytes: must be positive integer > 0");
    }
    
    if (typeof limits.max_run_ms !== "number") {
      errors.push("limits.max_run_ms: required number");
    } else if (!Number.isInteger(limits.max_run_ms) || limits.max_run_ms < 100) {
      errors.push("limits.max_run_ms: must be integer >= 100");
    }
    
    if (typeof limits.max_concurrent_ops !== "number") {
      errors.push("limits.max_concurrent_ops: required number");
    } else if (!Number.isInteger(limits.max_concurrent_ops) || limits.max_concurrent_ops < 1) {
      errors.push("limits.max_concurrent_ops: must be positive integer >= 1");
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // DEPLOYMENT validation
  // ─────────────────────────────────────────────────────────────────────────
  if (!isObject(obj.deployment)) {
    errors.push("deployment: required object");
  } else {
    const deployment = obj.deployment as Record<string, unknown>;
    
    if (typeof deployment.deployed_at !== "string") {
      errors.push("deployment.deployed_at: required string");
    } else if (!isISO8601(deployment.deployed_at)) {
      errors.push("deployment.deployed_at: must be valid ISO 8601 datetime");
    }
    
    if (typeof deployment.deployed_by !== "string") {
      errors.push("deployment.deployed_by: required string");
    } else if (!deployment.deployed_by.trim()) {
      errors.push("deployment.deployed_by: cannot be empty");
    }
    
    if (typeof deployment.commit_hash !== "string") {
      errors.push("deployment.commit_hash: required string");
    } else if (!isGitHash(deployment.commit_hash)) {
      errors.push("deployment.commit_hash: must be valid git hash (7-64 hex chars)");
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Return result
  // ─────────────────────────────────────────────────────────────────────────
  if (errors.length > 0) {
    return { ok: false, errors: Object.freeze(errors) };
  }
  
  // Build validated config object
  const audit = obj.audit as Record<string, unknown>;
  const limits = obj.limits as Record<string, unknown>;
  const deployment = obj.deployment as Record<string, unknown>;
  
  const config: OmegaConfig = deepFreeze({
    version: obj.version as string,
    environment: obj.environment as OmegaEnvironment,
    safe_mode: obj.safe_mode as boolean,
    audit: {
      enable_forensic_export: audit.enable_forensic_export as boolean,
      log_level: audit.log_level as OmegaLogLevel,
      retention_days: audit.retention_days as number,
    },
    limits: {
      max_input_bytes: limits.max_input_bytes as number,
      max_run_ms: limits.max_run_ms as number,
      max_concurrent_ops: limits.max_concurrent_ops as number,
    },
    deployment: {
      deployed_at: deployment.deployed_at as string,
      deployed_by: deployment.deployed_by as string,
      commit_hash: deployment.commit_hash as string,
    },
  });
  
  return { ok: true, config };
}

/**
 * List of all required fields for documentation/audit
 */
export const REQUIRED_FIELDS = Object.freeze([
  "version",
  "environment",
  "safe_mode",
  "audit.enable_forensic_export",
  "audit.log_level",
  "audit.retention_days",
  "limits.max_input_bytes",
  "limits.max_run_ms",
  "limits.max_concurrent_ops",
  "deployment.deployed_at",
  "deployment.deployed_by",
  "deployment.commit_hash",
] as const);

/**
 * Valid values for constrained fields
 */
export const VALID_VALUES = Object.freeze({
  environment: ["dev", "staging", "prod"] as const,
  log_level: ["DEBUG", "INFO", "WARN", "ERROR"] as const,
  safe_mode: [true] as const, // Only true is valid in Phase 12
});
