/**
 * OMEGA RATE_LIMITER — Sliding Window Tests
 * Phase 16.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, Strategy, LimitResult } from '../src/limiter/index.js';

describe('RATE_LIMITER Sliding Window Strategy', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      strategy: Strategy.SLIDING_WINDOW,
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

    it('slides window correctly', async () => {
      // Make 3 requests
      limiter.check('user1');
      limiter.check('user1');
      limiter.check('user1');
      
      // Wait 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Make 2 more requests
      limiter.check('user1');
      limiter.check('user1');
      
      // At limit now
      expect(limiter.check('user1').allowed).toBe(false);
      
      // Wait for first 3 to expire
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should allow again
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
    });

    it('remaining is accurate', () => {
      const r1 = limiter.check('user1');
      const r2 = limiter.check('user1');
      
      expect(r1.remaining).toBe(4);
      expect(r2.remaining).toBe(3);
    });
  });

  describe('sliding behavior', () => {
    it('old requests expire individually', async () => {
      const limiter100ms = new RateLimiter({
        strategy: Strategy.SLIDING_WINDOW,
        limit: 3,
        windowMs: 100,
        enableCleanup: false,
      });

      limiter100ms.check('user1');
      await new Promise(resolve => setTimeout(resolve, 30));
      limiter100ms.check('user1');
      await new Promise(resolve => setTimeout(resolve, 30));
      limiter100ms.check('user1');
      
      // At limit
      expect(limiter100ms.check('user1').allowed).toBe(false);
      
      // Wait for first to expire
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should allow one more
      expect(limiter100ms.check('user1').allowed).toBe(true);
    });
  });

  describe('per-key isolation', () => {
    it('tracks keys independently', () => {
      for (let i = 0; i < 5; i++) {
        limiter.check('user1');
      }
      
      expect(limiter.check('user1').allowed).toBe(false);
      expect(limiter.check('user2').allowed).toBe(true);
    });

    it('getKeyInfo shows sliding window state', () => {
      limiter.check('user1');
      limiter.check('user1');
      
      const info = limiter.getKeyInfo('user1');
      expect(info?.current).toBe(2);
    });
  });

  describe('warning threshold', () => {
    it('warns at threshold', () => {
      const limiter10 = new RateLimiter({
        strategy: Strategy.SLIDING_WINDOW,
        limit: 10,
        windowMs: 1000,
        warningThreshold: 0.8,
        enableCleanup: false,
      });

      for (let i = 0; i < 7; i++) {
        limiter10.check('user1');
      }

      const result = limiter10.check('user1');
      expect(result.result).toBe(LimitResult.WARNING);
    });
  });

  describe('edge cases', () => {
    it('handles rapid requests', () => {
      for (let i = 0; i < 100; i++) {
        const result = limiter.check('rapid');
        if (i < 5) {
          expect(result.allowed).toBe(true);
        } else {
          expect(result.allowed).toBe(false);
        }
      }
    });

    it('handles many keys', () => {
      for (let i = 0; i < 100; i++) {
        const result = limiter.check(`user${i}`);
        expect(result.allowed).toBe(true);
      }
      expect(limiter.activeKeyCount).toBe(100);
    });
  });
});
