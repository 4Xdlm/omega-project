/**
 * OMEGA GATEWAY — Constants
 * Phase 17 — Unified Security Gateway Facade
 * 
 * Single entry point orchestrating: RATE_LIMITER → SENTINEL → QUARANTINE
 */

// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY STATUS
// ═══════════════════════════════════════════════════════════════════════════════

/** Final gateway decision */
export enum GatewayStatus {
  /** Request allowed through */
  ALLOWED = 'ALLOWED',
  /** Request rate limited */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Request blocked by security */
  BLOCKED = 'BLOCKED',
  /** Data quarantined for review */
  QUARANTINED = 'QUARANTINED',
  /** Gateway error occurred */
  ERROR = 'ERROR',
}

/** Processing stage */
export enum GatewayStage {
  /** Rate limiting check */
  RATE_LIMIT = 'RATE_LIMIT',
  /** Security validation */
  VALIDATION = 'VALIDATION',
  /** Quarantine decision */
  QUARANTINE = 'QUARANTINE',
  /** Final output */
  OUTPUT = 'OUTPUT',
}

/** Threat severity levels */
export enum ThreatSeverity {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/** Threat categories */
export enum ThreatCategory {
  NONE = 'NONE',
  XSS = 'XSS',
  SQL_INJECTION = 'SQL_INJECTION',
  PATH_TRAVERSAL = 'PATH_TRAVERSAL',
  COMMAND_INJECTION = 'COMMAND_INJECTION',
  RATE_ABUSE = 'RATE_ABUSE',
  UNKNOWN = 'UNKNOWN',
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Default rate limit (requests per window) */
export const DEFAULT_RATE_LIMIT = 100;

/** Default rate limit window (milliseconds) */
export const DEFAULT_RATE_WINDOW_MS = 60000;

/** Default quarantine TTL (milliseconds) */
export const DEFAULT_QUARANTINE_TTL_MS = 3600000; // 1 hour

/** Auto-quarantine threshold */
export const AUTO_QUARANTINE_SEVERITY = ThreatSeverity.HIGH;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_CONFIG = {
  /** Enable rate limiting */
  rateLimitEnabled: true,
  /** Rate limit per key */
  rateLimit: DEFAULT_RATE_LIMIT,
  /** Rate window in ms */
  rateWindowMs: DEFAULT_RATE_WINDOW_MS,
  /** Enable security validation */
  validationEnabled: true,
  /** Enable auto-quarantine */
  quarantineEnabled: true,
  /** Quarantine TTL */
  quarantineTtlMs: DEFAULT_QUARANTINE_TTL_MS,
  /** Minimum severity to quarantine */
  quarantineThreshold: AUTO_QUARANTINE_SEVERITY,
  /** Strict mode (block on any threat) */
  strictMode: false,
  /** Enable detailed reporting */
  detailedReports: true,
} as const;

/** Gateway version */
export const GATEWAY_VERSION = '3.17.0';
