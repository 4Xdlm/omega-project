/**
 * OMEGA QUARANTINE_V2 — Constants
 * Phase 16.2 — Isolation Chamber
 * 
 * Defines quarantine states, reasons, and configuration.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// QUARANTINE STATUS
// ═══════════════════════════════════════════════════════════════════════════════

/** Status of a quarantined item */
export enum QuarantineStatus {
  /** Item is actively quarantined */
  QUARANTINED = 'QUARANTINED',
  /** Item has been released (validated safe) */
  RELEASED = 'RELEASED',
  /** Item has been permanently deleted */
  PURGED = 'PURGED',
  /** Item has expired (TTL exceeded) */
  EXPIRED = 'EXPIRED',
}

/** Reason for quarantine */
export enum QuarantineReason {
  /** Flagged by SENTINEL */
  SENTINEL_BLOCK = 'SENTINEL_BLOCK',
  /** Payload too large */
  OVERSIZED_PAYLOAD = 'OVERSIZED_PAYLOAD',
  /** Malicious pattern detected */
  MALICIOUS_PATTERN = 'MALICIOUS_PATTERN',
  /** XSS pattern detected */
  XSS_PATTERN = 'XSS_PATTERN',
  /** SQL injection detected */
  SQL_INJECTION = 'SQL_INJECTION',
  /** Structure violation */
  STRUCTURE_VIOLATION = 'STRUCTURE_VIOLATION',
  /** Manual quarantine by user */
  MANUAL = 'MANUAL',
  /** Validation failure */
  VALIDATION_FAILURE = 'VALIDATION_FAILURE',
  /** Suspicious activity */
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  /** Data corruption detected */
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  /** Unknown/unspecified */
  UNKNOWN = 'UNKNOWN',
}

/** Severity level */
export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Default TTL in milliseconds (7 days) */
export const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Maximum items in quarantine */
export const MAX_QUARANTINE_SIZE = 10_000;

/** Maximum payload size for quarantined items (10MB) */
export const MAX_QUARANTINE_PAYLOAD = 10 * 1024 * 1024;

/** Default configuration */
export const DEFAULT_CONFIG = {
  /** Time to live in milliseconds */
  ttlMs: DEFAULT_TTL_MS,
  /** Maximum items allowed */
  maxItems: MAX_QUARANTINE_SIZE,
  /** Maximum payload size per item */
  maxPayloadSize: MAX_QUARANTINE_PAYLOAD,
  /** Auto-purge expired items */
  autoPurge: true,
  /** Purge interval in milliseconds (1 hour) */
  purgeIntervalMs: 60 * 60 * 1000,
  /** Require reason for release */
  requireReleaseReason: true,
  /** Log all operations */
  enableAuditLog: true,
} as const;

/** QUARANTINE version */
export const QUARANTINE_VERSION = '3.16.2';
