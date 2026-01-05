/**
 * OMEGA RATE_LIMITER — Constants
 * Phase 16.3 — Request Throttling
 * 
 * Defines limits, strategies, and configuration.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING STRATEGIES
// ═══════════════════════════════════════════════════════════════════════════════

/** Rate limiting algorithm */
export enum Strategy {
  /** Fixed time window */
  FIXED_WINDOW = 'FIXED_WINDOW',
  /** Sliding time window */
  SLIDING_WINDOW = 'SLIDING_WINDOW',
  /** Token bucket */
  TOKEN_BUCKET = 'TOKEN_BUCKET',
  /** Leaky bucket */
  LEAKY_BUCKET = 'LEAKY_BUCKET',
}

/** Result of rate limit check */
export enum LimitResult {
  /** Request allowed */
  ALLOWED = 'ALLOWED',
  /** Request denied (rate limited) */
  DENIED = 'DENIED',
  /** Request allowed but near limit (warning) */
  WARNING = 'WARNING',
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

/** Default requests per window */
export const DEFAULT_LIMIT = 100;

/** Default window size in milliseconds (1 minute) */
export const DEFAULT_WINDOW_MS = 60 * 1000;

/** Default token refill rate (tokens per second) */
export const DEFAULT_REFILL_RATE = 10;

/** Default bucket capacity */
export const DEFAULT_BUCKET_CAPACITY = 100;

/** Warning threshold percentage (80%) */
export const WARNING_THRESHOLD = 0.8;

/** Maximum keys to track */
export const MAX_KEYS = 100_000;

/** Key cleanup interval (5 minutes) */
export const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/** Key expiration time (10 minutes of inactivity) */
export const KEY_EXPIRATION_MS = 10 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Default rate limiter configuration */
export const DEFAULT_CONFIG = {
  /** Rate limiting strategy */
  strategy: Strategy.SLIDING_WINDOW,
  /** Maximum requests per window */
  limit: DEFAULT_LIMIT,
  /** Window size in milliseconds */
  windowMs: DEFAULT_WINDOW_MS,
  /** Token refill rate (for token bucket) */
  refillRate: DEFAULT_REFILL_RATE,
  /** Bucket capacity (for token bucket) */
  bucketCapacity: DEFAULT_BUCKET_CAPACITY,
  /** Warning threshold (0-1) */
  warningThreshold: WARNING_THRESHOLD,
  /** Maximum keys to track */
  maxKeys: MAX_KEYS,
  /** Enable auto cleanup */
  enableCleanup: true,
  /** Cleanup interval */
  cleanupIntervalMs: CLEANUP_INTERVAL_MS,
  /** Key expiration time */
  keyExpirationMs: KEY_EXPIRATION_MS,
  /** Enable statistics */
  enableStats: true,
} as const;

/** RATE_LIMITER version */
export const LIMITER_VERSION = '3.16.3';
