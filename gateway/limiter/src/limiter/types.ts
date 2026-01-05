/**
 * OMEGA RATE_LIMITER — Types
 * Phase 16.3 — Request Throttling
 * 
 * Type definitions for rate limiting system.
 */

import { Strategy, LimitResult } from './constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rate limiter configuration
 */
export interface LimiterConfig {
  /** Rate limiting strategy */
  strategy: Strategy;
  /** Maximum requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Token refill rate (tokens per second) */
  refillRate: number;
  /** Bucket capacity (for token bucket) */
  bucketCapacity: number;
  /** Warning threshold (0-1) */
  warningThreshold: number;
  /** Maximum keys to track */
  maxKeys: number;
  /** Enable auto cleanup */
  enableCleanup: boolean;
  /** Cleanup interval in milliseconds */
  cleanupIntervalMs: number;
  /** Key expiration time in milliseconds */
  keyExpirationMs: number;
  /** Enable statistics tracking */
  enableStats: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMIT STATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fixed window state
 */
export interface FixedWindowState {
  /** Request count in current window */
  count: number;
  /** Window start timestamp */
  windowStart: number;
}

/**
 * Sliding window state
 */
export interface SlidingWindowState {
  /** Timestamps of requests */
  timestamps: number[];
  /** Last access time */
  lastAccess: number;
}

/**
 * Token bucket state
 */
export interface TokenBucketState {
  /** Current token count */
  tokens: number;
  /** Last refill timestamp */
  lastRefill: number;
}

/**
 * Leaky bucket state
 */
export interface LeakyBucketState {
  /** Current water level */
  level: number;
  /** Last leak timestamp */
  lastLeak: number;
}

/**
 * Union of all state types
 */
export type LimiterState = 
  | FixedWindowState 
  | SlidingWindowState 
  | TokenBucketState 
  | LeakyBucketState;

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK RESULT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of rate limit check
 */
export interface CheckResult {
  /** Whether request is allowed */
  allowed: boolean;
  /** Result category */
  result: LimitResult;
  /** Key that was checked */
  key: string;
  /** Current request count / tokens used */
  current: number;
  /** Maximum limit */
  limit: number;
  /** Remaining requests / tokens */
  remaining: number;
  /** Time until reset in milliseconds */
  resetInMs: number;
  /** Reset timestamp (ISO string) */
  resetAt: string;
  /** Timestamp of this check */
  timestamp: string;
  /** Check duration in milliseconds */
  durationMs: number;
}

/**
 * Result of consume operation (for token bucket)
 */
export interface ConsumeResult extends CheckResult {
  /** Tokens consumed */
  consumed: number;
  /** Tokens requested */
  requested: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEY INFO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Information about a tracked key
 */
export interface KeyInfo {
  /** The key */
  key: string;
  /** Current state */
  current: number;
  /** Maximum limit */
  limit: number;
  /** Remaining capacity */
  remaining: number;
  /** Time until reset */
  resetInMs: number;
  /** Last access timestamp */
  lastAccess: string;
  /** Total requests for this key */
  totalRequests: number;
  /** Total denials for this key */
  totalDenials: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rate limiter statistics
 */
export interface LimiterStats {
  /** Report timestamp */
  timestamp: string;
  /** Version */
  version: string;
  /** Uptime in milliseconds */
  uptimeMs: number;
  /** Total checks performed */
  totalChecks: number;
  /** Total allowed requests */
  totalAllowed: number;
  /** Total denied requests */
  totalDenied: number;
  /** Total warnings issued */
  totalWarnings: number;
  /** Current tracked keys count */
  activeKeys: number;
  /** Peak tracked keys count */
  peakKeys: number;
  /** Allow rate (percentage) */
  allowRate: number;
  /** Deny rate (percentage) */
  denyRate: number;
  /** Current configuration */
  config: LimiterConfig;
}

/**
 * Per-key statistics
 */
export interface KeyStats {
  /** The key */
  key: string;
  /** Total checks for this key */
  totalChecks: number;
  /** Total allowed for this key */
  totalAllowed: number;
  /** Total denied for this key */
  totalDenied: number;
  /** First seen timestamp */
  firstSeen: string;
  /** Last seen timestamp */
  lastSeen: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Event types */
export type LimiterEvent = 
  | 'check' 
  | 'allow' 
  | 'deny' 
  | 'warning' 
  | 'cleanup' 
  | 'reset';

/**
 * Event listener callback
 */
export type EventListener = (event: LimiterEvent, data: CheckResult | null) => void;
