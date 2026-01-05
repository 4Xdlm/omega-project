/**
 * OMEGA RATE_LIMITER — Public API
 * Phase 16.3 — Request Throttling
 */

// Core class
export {
  RateLimiter,
  rateLimiter,
  checkLimit,
  consumeTokens,
  getLimiterStats,
  resetLimitKey,
} from './limiter.js';

// Types
export type {
  LimiterConfig,
  FixedWindowState,
  SlidingWindowState,
  TokenBucketState,
  LeakyBucketState,
  LimiterState,
  CheckResult,
  ConsumeResult,
  KeyInfo,
  LimiterStats,
  KeyStats,
  LimiterEvent,
  EventListener,
} from './types.js';

// Constants
export {
  Strategy,
  LimitResult,
  DEFAULT_LIMIT,
  DEFAULT_WINDOW_MS,
  DEFAULT_REFILL_RATE,
  DEFAULT_BUCKET_CAPACITY,
  WARNING_THRESHOLD,
  MAX_KEYS,
  CLEANUP_INTERVAL_MS,
  KEY_EXPIRATION_MS,
  DEFAULT_CONFIG,
  LIMITER_VERSION,
} from './constants.js';
