/**
 * OMEGA RATE_LIMITER — Fixed Window Tests
 * Phase 16.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, Strategy, LimitResult } from '../src/limiter/index.js';

describe('RATE_LIMITER Fixed Window Strategy', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      strategy: Strategy.FIXED_WINDOW,
      limit: 5,
      windowMs: 1000,
      enableCleanup: false,
    });
  });

  describe('basic rate limiting', () => {
    it('allows requests under limit', () => {
      for (let i = 0; i < 5; i++) {
        const result = limiter.check('user1');
        expect(result.allowed).toBe(true);
      }
    });

    it('denies requests over limit', () => {
      for (let i = 0; i < 5; i++) {
        limiter.check('user1');
      }
      const result = limiter.check('user1');
      expect(result.allowed).toBe(false);
      expect(result.result).toBe(LimitResult.DENIED);
    });

    it('resets after window expires', async () => {
      for (let i = 0; i < 5; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1').allowed).toBe(false);
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(limiter.check('user1').allowed).toBe(true);
    });
  });

  describe('result structure', () => {
    it('includes all required fields', () => {
      const result = limiter.check('user1');
      
      expect(result.allowed).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.key).toBe('user1');
      expect(result.current).toBeDefined();
      expect(result.limit).toBe(5);
      expect(result.remaining).toBeDefined();
      expect(result.resetInMs).toBeDefined();
      expect(result.resetAt).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.durationMs).toBeDefined();
    });

    it('remaining decreases with each request', () => {
      const r1 = limiter.check('user1');
      const r2 = limiter.check('user1');
      const r3 = limiter.check('user1');
      
      expect(r1.remaining).toBe(4);
      expect(r2.remaining).toBe(3);
      expect(r3.remaining).toBe(2);
    });

    it('current increases with each request', () => {
      const r1 = limiter.check('user1');
      const r2 = limiter.check('user1');
      
      expect(r1.current).toBe(1);
      expect(r2.current).toBe(2);
    });
  });

  describe('warning threshold', () => {
    it('returns WARNING when near limit', () => {
      const limiterWithThreshold = new RateLimiter({
        strategy: Strategy.FIXED_WINDOW,
        limit: 10,
        windowMs: 1000,
        warningThreshold: 0.8,
        enableCleanup: false,
      });

      // First 7 should be ALLOWED
      for (let i = 0; i < 7; i++) {
        const result = limiterWithThreshold.check('user1');
        expect(result.result).toBe(LimitResult.ALLOWED);
      }

      // 8th should be WARNING (80%)
      const result = limiterWithThreshold.check('user1');
      expect(result.result).toBe(LimitResult.WARNING);
      expect(result.allowed).toBe(true);
    });
  });

  describe('per-key isolation', () => {
    it('tracks keys independently', () => {
      for (let i = 0; i < 5; i++) {
        limiter.check('user1');
      }
      
      // user1 is at limit
      expect(limiter.check('user1').allowed).toBe(false);
      
      // user2 should still work
      expect(limiter.check('user2').allowed).toBe(true);
    });

    it('getKeyInfo returns correct data', () => {
      limiter.check('user1');
      limiter.check('user1');
      
      const info = limiter.getKeyInfo('user1');
      expect(info).not.toBeNull();
      expect(info?.current).toBe(2);
      expect(info?.remaining).toBe(3);
    });
  });

  describe('reset key', () => {
    it('resets a specific key', () => {
      for (let i = 0; i < 5; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1').allowed).toBe(false);
      
      limiter.resetKey('user1');
      
      expect(limiter.check('user1').allowed).toBe(true);
    });

    it('returns false for nonexistent key', () => {
      expect(limiter.resetKey('nonexistent')).toBe(false);
    });
  });
});
