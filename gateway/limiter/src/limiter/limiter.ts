/**
 * OMEGA RATE_LIMITER — Core Implementation
 * Phase 16.3 — Request Throttling
 * 
 * Multi-strategy rate limiting for request throttling.
 * 
 * INVARIANTS:
 * - INV-LIM-01: Request count never exceeds limit
 * - INV-LIM-02: Window reset at correct time
 * - INV-LIM-03: Tokens refill at correct rate
 * - INV-LIM-04: Per-key isolation
 * - INV-LIM-05: Deterministic allow/deny
 * - INV-LIM-06: Stats accurate
 */

import {
  Strategy,
  LimitResult,
  DEFAULT_CONFIG,
  LIMITER_VERSION,
} from './constants.js';

import type {
  LimiterConfig,
  FixedWindowState,
  SlidingWindowState,
  TokenBucketState,
  LeakyBucketState,
  CheckResult,
  ConsumeResult,
  KeyInfo,
  LimiterStats,
  KeyStats,
  EventListener,
  LimiterEvent,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * RATE_LIMITER — Request Throttling
 * 
 * Provides configurable rate limiting with multiple strategies.
 */
export class RateLimiter {
  private config: LimiterConfig;
  private startTime: number;
  
  // State storage per strategy
  private fixedWindows: Map<string, FixedWindowState>;
  private slidingWindows: Map<string, SlidingWindowState>;
  private tokenBuckets: Map<string, TokenBucketState>;
  private leakyBuckets: Map<string, LeakyBucketState>;
  
  // Statistics
  private stats: {
    totalChecks: number;
    totalAllowed: number;
    totalDenied: number;
    totalWarnings: number;
    peakKeys: number;
  };
  
  // Per-key stats
  private keyStats: Map<string, KeyStats>;
  
  // Event listeners
  private listeners: EventListener[];
  
  // Cleanup timer
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: Partial<LimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = Date.now();
    
    this.fixedWindows = new Map();
    this.slidingWindows = new Map();
    this.tokenBuckets = new Map();
    this.leakyBuckets = new Map();
    
    this.stats = {
      totalChecks: 0,
      totalAllowed: 0,
      totalDenied: 0,
      totalWarnings: 0,
      peakKeys: 0,
    };
    
    this.keyStats = new Map();
    this.listeners = [];
    
    if (this.config.enableCleanup) {
      this.startCleanup();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN CHECK METHOD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if a request is allowed
   * INV-LIM-01: Request count never exceeds limit
   * INV-LIM-05: Deterministic allow/deny
   */
  check(key: string): CheckResult {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    const now = Date.now();

    let result: CheckResult;

    switch (this.config.strategy) {
      case Strategy.FIXED_WINDOW:
        result = this.checkFixedWindow(key, now, timestamp, startTime);
        break;
      case Strategy.SLIDING_WINDOW:
        result = this.checkSlidingWindow(key, now, timestamp, startTime);
        break;
      case Strategy.TOKEN_BUCKET:
        result = this.checkTokenBucket(key, now, timestamp, startTime, 1);
        break;
      case Strategy.LEAKY_BUCKET:
        result = this.checkLeakyBucket(key, now, timestamp, startTime);
        break;
      default:
        result = this.checkSlidingWindow(key, now, timestamp, startTime);
    }

    // Update statistics
    this.updateStats(key, result);
    
    // Emit events
    this.emit('check', result);
    if (result.allowed) {
      this.emit(result.result === LimitResult.WARNING ? 'warning' : 'allow', result);
    } else {
      this.emit('deny', result);
    }

    return result;
  }

  /**
   * Consume multiple tokens (for token bucket)
   */
  consume(key: string, tokens: number = 1): ConsumeResult {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    const now = Date.now();

    if (this.config.strategy !== Strategy.TOKEN_BUCKET) {
      // For non-token-bucket strategies, just do regular check
      const baseResult = this.check(key);
      return {
        ...baseResult,
        consumed: baseResult.allowed ? 1 : 0,
        requested: tokens,
      };
    }

    const result = this.checkTokenBucket(key, now, timestamp, startTime, tokens);
    
    this.updateStats(key, result);
    this.emit('check', result);
    
    return {
      ...result,
      consumed: result.allowed ? tokens : 0,
      requested: tokens,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIXED WINDOW STRATEGY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fixed window rate limiting
   * INV-LIM-02: Window reset at correct time
   */
  private checkFixedWindow(
    key: string,
    now: number,
    timestamp: string,
    startTime: number
  ): CheckResult {
    let state = this.fixedWindows.get(key);

    // Initialize or reset window
    if (!state || now >= state.windowStart + this.config.windowMs) {
      state = { count: 0, windowStart: now };
      this.fixedWindows.set(key, state);
      this.updatePeakKeys();
    }

    const remaining = this.config.limit - state.count;
    const resetInMs = state.windowStart + this.config.windowMs - now;
    const resetAt = new Date(state.windowStart + this.config.windowMs).toISOString();

    // Check limit
    if (state.count >= this.config.limit) {
      return this.buildResult(
        false,
        LimitResult.DENIED,
        key,
        state.count,
        remaining,
        resetInMs,
        resetAt,
        timestamp,
        startTime
      );
    }

    // Increment and allow
    state.count++;

    // Check warning threshold
    const usageRatio = state.count / this.config.limit;
    const result = usageRatio >= this.config.warningThreshold
      ? LimitResult.WARNING
      : LimitResult.ALLOWED;

    return this.buildResult(
      true,
      result,
      key,
      state.count,
      this.config.limit - state.count,
      resetInMs,
      resetAt,
      timestamp,
      startTime
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDING WINDOW STRATEGY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Sliding window rate limiting
   * INV-LIM-02: Window reset at correct time
   */
  private checkSlidingWindow(
    key: string,
    now: number,
    timestamp: string,
    startTime: number
  ): CheckResult {
    let state = this.slidingWindows.get(key);

    if (!state) {
      state = { timestamps: [], lastAccess: now };
      this.slidingWindows.set(key, state);
      this.updatePeakKeys();
    }

    // Remove expired timestamps
    const windowStart = now - this.config.windowMs;
    state.timestamps = state.timestamps.filter(t => t > windowStart);
    state.lastAccess = now;

    const current = state.timestamps.length;
    const remaining = this.config.limit - current;
    const resetInMs = state.timestamps.length > 0
      ? state.timestamps[0] + this.config.windowMs - now
      : this.config.windowMs;
    const resetAt = new Date(now + resetInMs).toISOString();

    // Check limit
    if (current >= this.config.limit) {
      return this.buildResult(
        false,
        LimitResult.DENIED,
        key,
        current,
        0,
        resetInMs,
        resetAt,
        timestamp,
        startTime
      );
    }

    // Add timestamp and allow
    state.timestamps.push(now);

    // Check warning threshold
    const usageRatio = (current + 1) / this.config.limit;
    const result = usageRatio >= this.config.warningThreshold
      ? LimitResult.WARNING
      : LimitResult.ALLOWED;

    return this.buildResult(
      true,
      result,
      key,
      current + 1,
      this.config.limit - current - 1,
      resetInMs,
      resetAt,
      timestamp,
      startTime
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN BUCKET STRATEGY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Token bucket rate limiting
   * INV-LIM-03: Tokens refill at correct rate
   */
  private checkTokenBucket(
    key: string,
    now: number,
    timestamp: string,
    startTime: number,
    tokensRequested: number
  ): CheckResult {
    let state = this.tokenBuckets.get(key);

    if (!state) {
      state = { tokens: this.config.bucketCapacity, lastRefill: now };
      this.tokenBuckets.set(key, state);
      this.updatePeakKeys();
    }

    // Refill tokens
    const elapsed = now - state.lastRefill;
    const tokensToAdd = (elapsed / 1000) * this.config.refillRate;
    state.tokens = Math.min(this.config.bucketCapacity, state.tokens + tokensToAdd);
    state.lastRefill = now;

    const remaining = Math.floor(state.tokens);
    const timeToFullRefill = this.config.refillRate > 0 
      ? ((this.config.bucketCapacity - state.tokens) / this.config.refillRate) * 1000
      : Infinity;
    const resetAt = isFinite(timeToFullRefill) 
      ? new Date(now + timeToFullRefill).toISOString()
      : new Date(now + 86400000).toISOString(); // 24h fallback

    // Check if enough tokens
    if (state.tokens < tokensRequested) {
      const timeToEnough = ((tokensRequested - state.tokens) / this.config.refillRate) * 1000;
      return this.buildResult(
        false,
        LimitResult.DENIED,
        key,
        this.config.bucketCapacity - Math.floor(state.tokens),
        remaining,
        timeToEnough,
        resetAt,
        timestamp,
        startTime
      );
    }

    // Consume tokens
    state.tokens -= tokensRequested;

    // Check warning threshold
    const usageRatio = 1 - (state.tokens / this.config.bucketCapacity);
    const result = usageRatio >= this.config.warningThreshold
      ? LimitResult.WARNING
      : LimitResult.ALLOWED;

    return this.buildResult(
      true,
      result,
      key,
      this.config.bucketCapacity - Math.floor(state.tokens),
      Math.floor(state.tokens),
      timeToFullRefill,
      resetAt,
      timestamp,
      startTime
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAKY BUCKET STRATEGY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Leaky bucket rate limiting
   */
  private checkLeakyBucket(
    key: string,
    now: number,
    timestamp: string,
    startTime: number
  ): CheckResult {
    let state = this.leakyBuckets.get(key);

    if (!state) {
      state = { level: 0, lastLeak: now };
      this.leakyBuckets.set(key, state);
      this.updatePeakKeys();
    }

    // Leak water
    const elapsed = now - state.lastLeak;
    const leaked = (elapsed / 1000) * this.config.refillRate;
    state.level = Math.max(0, state.level - leaked);
    state.lastLeak = now;

    const remaining = Math.floor(this.config.bucketCapacity - state.level);
    const timeToEmpty = this.config.refillRate > 0 
      ? (state.level / this.config.refillRate) * 1000
      : Infinity;
    const resetAt = isFinite(timeToEmpty) 
      ? new Date(now + timeToEmpty).toISOString()
      : new Date(now + 86400000).toISOString(); // 24h fallback

    // Check if bucket is full
    if (state.level >= this.config.bucketCapacity) {
      return this.buildResult(
        false,
        LimitResult.DENIED,
        key,
        Math.ceil(state.level),
        0,
        timeToEmpty,
        resetAt,
        timestamp,
        startTime
      );
    }

    // Add to bucket
    state.level += 1;

    // Check warning threshold
    const usageRatio = state.level / this.config.bucketCapacity;
    const result = usageRatio >= this.config.warningThreshold
      ? LimitResult.WARNING
      : LimitResult.ALLOWED;

    return this.buildResult(
      true,
      result,
      key,
      Math.ceil(state.level),
      Math.floor(this.config.bucketCapacity - state.level),
      timeToEmpty,
      resetAt,
      timestamp,
      startTime
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // KEY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get information about a specific key
   * INV-LIM-04: Per-key isolation
   */
  getKeyInfo(key: string): KeyInfo | null {
    const now = Date.now();
    
    switch (this.config.strategy) {
      case Strategy.FIXED_WINDOW: {
        const state = this.fixedWindows.get(key);
        if (!state) return null;
        return {
          key,
          current: state.count,
          limit: this.config.limit,
          remaining: this.config.limit - state.count,
          resetInMs: state.windowStart + this.config.windowMs - now,
          lastAccess: new Date(state.windowStart).toISOString(),
          totalRequests: this.keyStats.get(key)?.totalChecks ?? 0,
          totalDenials: this.keyStats.get(key)?.totalDenied ?? 0,
        };
      }
      case Strategy.SLIDING_WINDOW: {
        const state = this.slidingWindows.get(key);
        if (!state) return null;
        const windowStart = now - this.config.windowMs;
        const validTimestamps = state.timestamps.filter(t => t > windowStart);
        return {
          key,
          current: validTimestamps.length,
          limit: this.config.limit,
          remaining: this.config.limit - validTimestamps.length,
          resetInMs: validTimestamps.length > 0
            ? validTimestamps[0] + this.config.windowMs - now
            : this.config.windowMs,
          lastAccess: new Date(state.lastAccess).toISOString(),
          totalRequests: this.keyStats.get(key)?.totalChecks ?? 0,
          totalDenials: this.keyStats.get(key)?.totalDenied ?? 0,
        };
      }
      case Strategy.TOKEN_BUCKET: {
        const state = this.tokenBuckets.get(key);
        if (!state) return null;
        return {
          key,
          current: this.config.bucketCapacity - Math.floor(state.tokens),
          limit: this.config.bucketCapacity,
          remaining: Math.floor(state.tokens),
          resetInMs: ((this.config.bucketCapacity - state.tokens) / this.config.refillRate) * 1000,
          lastAccess: new Date(state.lastRefill).toISOString(),
          totalRequests: this.keyStats.get(key)?.totalChecks ?? 0,
          totalDenials: this.keyStats.get(key)?.totalDenied ?? 0,
        };
      }
      case Strategy.LEAKY_BUCKET: {
        const state = this.leakyBuckets.get(key);
        if (!state) return null;
        return {
          key,
          current: Math.ceil(state.level),
          limit: this.config.bucketCapacity,
          remaining: Math.floor(this.config.bucketCapacity - state.level),
          resetInMs: (state.level / this.config.refillRate) * 1000,
          lastAccess: new Date(state.lastLeak).toISOString(),
          totalRequests: this.keyStats.get(key)?.totalChecks ?? 0,
          totalDenials: this.keyStats.get(key)?.totalDenied ?? 0,
        };
      }
    }
  }

  /**
   * Reset a specific key
   */
  resetKey(key: string): boolean {
    const deleted = this.fixedWindows.delete(key) ||
      this.slidingWindows.delete(key) ||
      this.tokenBuckets.delete(key) ||
      this.leakyBuckets.delete(key);
    
    if (deleted) {
      this.emit('reset', null);
    }
    
    return deleted;
  }

  /**
   * Get all tracked keys
   */
  getKeys(): string[] {
    const keys = new Set<string>();
    
    for (const key of this.fixedWindows.keys()) keys.add(key);
    for (const key of this.slidingWindows.keys()) keys.add(key);
    for (const key of this.tokenBuckets.keys()) keys.add(key);
    for (const key of this.leakyBuckets.keys()) keys.add(key);
    
    return Array.from(keys);
  }

  /**
   * Get count of active keys
   */
  get activeKeyCount(): number {
    switch (this.config.strategy) {
      case Strategy.FIXED_WINDOW:
        return this.fixedWindows.size;
      case Strategy.SLIDING_WINDOW:
        return this.slidingWindows.size;
      case Strategy.TOKEN_BUCKET:
        return this.tokenBuckets.size;
      case Strategy.LEAKY_BUCKET:
        return this.leakyBuckets.size;
      default:
        return 0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get rate limiter statistics
   * INV-LIM-06: Stats accurate
   */
  getStats(): LimiterStats {
    const timestamp = new Date().toISOString();
    const total = this.stats.totalChecks || 1; // Avoid division by zero

    return {
      timestamp,
      version: LIMITER_VERSION,
      uptimeMs: Date.now() - this.startTime,
      totalChecks: this.stats.totalChecks,
      totalAllowed: this.stats.totalAllowed,
      totalDenied: this.stats.totalDenied,
      totalWarnings: this.stats.totalWarnings,
      activeKeys: this.activeKeyCount,
      peakKeys: this.stats.peakKeys,
      allowRate: (this.stats.totalAllowed / total) * 100,
      denyRate: (this.stats.totalDenied / total) * 100,
      config: { ...this.config },
    };
  }

  /**
   * Get statistics for a specific key
   */
  getKeyStats(key: string): KeyStats | null {
    return this.keyStats.get(key) ?? null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add event listener
   */
  on(listener: EventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  off(listener: EventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP & LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clean up expired keys
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    // Clean sliding windows
    for (const [key, state] of this.slidingWindows) {
      if (now - state.lastAccess > this.config.keyExpirationMs) {
        this.slidingWindows.delete(key);
        cleaned++;
      }
    }

    // Clean fixed windows
    for (const [key, state] of this.fixedWindows) {
      if (now - state.windowStart > this.config.keyExpirationMs) {
        this.fixedWindows.delete(key);
        cleaned++;
      }
    }

    // Clean token buckets
    for (const [key, state] of this.tokenBuckets) {
      if (now - state.lastRefill > this.config.keyExpirationMs) {
        this.tokenBuckets.delete(key);
        cleaned++;
      }
    }

    // Clean leaky buckets
    for (const [key, state] of this.leakyBuckets) {
      if (now - state.lastLeak > this.config.keyExpirationMs) {
        this.leakyBuckets.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.emit('cleanup', null);
    }

    return cleaned;
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.fixedWindows.clear();
    this.slidingWindows.clear();
    this.tokenBuckets.clear();
    this.leakyBuckets.clear();
    this.keyStats.clear();
    this.stats = {
      totalChecks: 0,
      totalAllowed: 0,
      totalDenied: 0,
      totalWarnings: 0,
      peakKeys: 0,
    };
  }

  /**
   * Destroy the rate limiter
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.listeners = [];
    this.clear();
  }

  /**
   * Get current configuration
   */
  getConfig(): LimiterConfig {
    return { ...this.config };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private buildResult(
    allowed: boolean,
    result: LimitResult,
    key: string,
    current: number,
    remaining: number,
    resetInMs: number,
    resetAt: string,
    timestamp: string,
    startTime: number
  ): CheckResult {
    return {
      allowed,
      result,
      key,
      current,
      limit: this.config.limit,
      remaining: Math.max(0, remaining),
      resetInMs: Math.max(0, resetInMs),
      resetAt,
      timestamp,
      durationMs: performance.now() - startTime,
    };
  }

  private updateStats(key: string, result: CheckResult): void {
    if (!this.config.enableStats) return;

    this.stats.totalChecks++;
    
    if (result.allowed) {
      this.stats.totalAllowed++;
      if (result.result === LimitResult.WARNING) {
        this.stats.totalWarnings++;
      }
    } else {
      this.stats.totalDenied++;
    }

    // Update per-key stats
    let keyStats = this.keyStats.get(key);
    if (!keyStats) {
      keyStats = {
        key,
        totalChecks: 0,
        totalAllowed: 0,
        totalDenied: 0,
        firstSeen: result.timestamp,
        lastSeen: result.timestamp,
      };
      this.keyStats.set(key, keyStats);
    }

    keyStats.totalChecks++;
    keyStats.lastSeen = result.timestamp;
    if (result.allowed) {
      keyStats.totalAllowed++;
    } else {
      keyStats.totalDenied++;
    }
  }

  private updatePeakKeys(): void {
    const current = this.activeKeyCount;
    if (current > this.stats.peakKeys) {
      this.stats.peakKeys = current;
    }
  }

  private emit(event: LimiterEvent, data: CheckResult | null): void {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch {
        // Ignore listener errors
      }
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

/** Default rate limiter instance */
export const rateLimiter = new RateLimiter();

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Check rate limit using default instance */
export const checkLimit = (key: string): CheckResult => rateLimiter.check(key);

/** Consume tokens using default instance */
export const consumeTokens = (key: string, tokens?: number): ConsumeResult => 
  rateLimiter.consume(key, tokens);

/** Get stats using default instance */
export const getLimiterStats = (): LimiterStats => rateLimiter.getStats();

/** Reset a key using default instance */
export const resetLimitKey = (key: string): boolean => rateLimiter.resetKey(key);
