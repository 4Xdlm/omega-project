/**
 * OMEGA GATEWAY — Types
 * Phase 17 — Unified Security Gateway Facade
 */

import {
  GatewayStatus,
  GatewayStage,
  ThreatSeverity,
  ThreatCategory,
} from './constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gateway configuration
 */
export interface GatewayConfig {
  /** Enable rate limiting */
  rateLimitEnabled: boolean;
  /** Rate limit per key */
  rateLimit: number;
  /** Rate window in ms */
  rateWindowMs: number;
  /** Enable security validation */
  validationEnabled: boolean;
  /** Enable auto-quarantine */
  quarantineEnabled: boolean;
  /** Quarantine TTL */
  quarantineTtlMs: number;
  /** Minimum severity to quarantine */
  quarantineThreshold: ThreatSeverity;
  /** Strict mode (block on any threat) */
  strictMode: boolean;
  /** Enable detailed reporting */
  detailedReports: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Request context for gateway processing
 */
export interface GatewayContext {
  /** Unique request ID */
  requestId: string;
  /** Client identifier for rate limiting */
  clientId: string;
  /** Request timestamp */
  timestamp: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gateway input
 */
export interface GatewayInput {
  /** Data to process */
  data: unknown;
  /** Input type hint */
  type?: 'text' | 'json' | 'binary' | 'unknown';
  /** Source identifier */
  source?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THREATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detected threat
 */
export interface Threat {
  /** Threat category */
  category: ThreatCategory;
  /** Severity level */
  severity: ThreatSeverity;
  /** Pattern that matched */
  pattern?: string;
  /** Location in input */
  location?: string;
  /** Description */
  description: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rate limit stage report
 */
export interface RateLimitReport {
  /** Stage identifier */
  stage: GatewayStage.RATE_LIMIT;
  /** Whether request was allowed */
  allowed: boolean;
  /** Current request count */
  currentCount: number;
  /** Limit */
  limit: number;
  /** Remaining requests */
  remaining: number;
  /** Window reset time */
  resetAt: string;
  /** Processing time (ms) */
  durationMs: number;
}

/**
 * Validation stage report
 */
export interface ValidationReport {
  /** Stage identifier */
  stage: GatewayStage.VALIDATION;
  /** Whether input passed validation */
  passed: boolean;
  /** Detected threats */
  threats: Threat[];
  /** Highest severity found */
  maxSeverity: ThreatSeverity;
  /** Number of patterns checked */
  patternsChecked: number;
  /** Processing time (ms) */
  durationMs: number;
}

/**
 * Quarantine stage report
 */
export interface QuarantineReport {
  /** Stage identifier */
  stage: GatewayStage.QUARANTINE;
  /** Whether data was quarantined */
  quarantined: boolean;
  /** Quarantine ID (if quarantined) */
  quarantineId?: string;
  /** Reason for quarantine */
  reason?: string;
  /** Expiry time */
  expiresAt?: string;
  /** Processing time (ms) */
  durationMs: number;
}

/**
 * Combined stage report */
export type StageReport = RateLimitReport | ValidationReport | QuarantineReport;

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gateway processing result
 */
export interface GatewayResult {
  /** Final status */
  status: GatewayStatus;
  /** Request allowed through */
  allowed: boolean;
  /** Original input (if allowed) */
  data?: unknown;
  /** Request context */
  context: GatewayContext;
  /** Processing stages completed */
  stagesCompleted: GatewayStage[];
  /** Stage that caused rejection (if any) */
  rejectedAt?: GatewayStage;
  /** Detailed reports per stage */
  reports: {
    rateLimit?: RateLimitReport;
    validation?: ValidationReport;
    quarantine?: QuarantineReport;
  };
  /** All detected threats */
  threats: Threat[];
  /** Total processing time (ms) */
  totalDurationMs: number;
  /** Timestamp */
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gateway metrics
 */
export interface GatewayMetrics {
  /** Timestamp */
  timestamp: string;
  /** Version */
  version: string;
  /** Uptime in ms */
  uptimeMs: number;
  /** Total requests processed */
  totalRequests: number;
  /** Requests allowed */
  allowed: number;
  /** Requests rate limited */
  rateLimited: number;
  /** Requests blocked */
  blocked: number;
  /** Requests quarantined */
  quarantined: number;
  /** Errors */
  errors: number;
  /** Allow rate (percentage) */
  allowRate: number;
  /** Block rate (percentage) */
  blockRate: number;
  /** Average processing time (ms) */
  avgDurationMs: number;
  /** Threats by category */
  threatsByCategory: Record<ThreatCategory, number>;
  /** Current config */
  config: GatewayConfig;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook called before processing
 */
export type BeforeHook = (
  input: GatewayInput,
  context: GatewayContext
) => Promise<void> | void;

/**
 * Hook called after processing
 */
export type AfterHook = (
  result: GatewayResult
) => Promise<void> | void;

/**
 * Hook called on error
 */
export type ErrorHook = (
  error: Error,
  context: GatewayContext
) => Promise<void> | void;
