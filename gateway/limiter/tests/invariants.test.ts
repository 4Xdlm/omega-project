/**
 * OMEGA RATE_LIMITER — Invariants Proof Tests
 * Phase 16.3
 * 
 * INVARIANTS:
 * - INV-LIM-01: Request count never exceeds limit
 * - INV-LIM-02: Window reset at correct time
 * - INV-LIM-03: Tokens refill at correct rate
 * - INV-LIM-04: Per-key isolation
 * - INV-LIM-05: Deterministic allow/deny
 * - INV-LIM-06: Stats accurate
 */

import { describe, it, expect } from 'vitest';
import { RateLimiter, Strategy, LIMITER_VERSION } from '../src/limiter/index.js';

describe('INVARIANTS RATE_LIMITER', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-LIM-01: Request count never exceeds limit
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-LIM-01: Request count never exceeds limit', () => {
    it('fixed window never allows more than limit', () => {
      const limiter = new RateLimiter({
        strategy: Strategy.FIXED_WINDOW,
        limit: 5,
        windowMs: 10000,
        enableCleanup: false,
      });

      let allowed = 0;
      for (let i = 0; i < 100; i++) {
        if (limiter.check('user1').allowed) {
          allowed++;
        }
      }

      expect(allowed).toBe(5);
      expect(allowed).toBeLessThanOrEqual(5);
    });

    it('sliding window never allows more than limit', () => {
      const limiter = new RateLimiter({
        strategy: Strategy.SLIDING_WINDOW,
        limit: 10,
        windowMs: 10000,
        enableCleanup: false,
      });

      let allowed = 0;
      for (let i = 0; i < 100; i++) {
        if (limiter.check('user1').allowed) {
          allowed++;
        }
      }

      expect(allowed).toBe(10);
    });

    it('token bucket never allows more than capacity', () => {
      const limiter = new RateLimiter({
        strategy: Strategy.TOKEN_BUCKET,
        bucketCapacity: 15,
        refillRate: 0, // No refill
        enableCleanup: false,
      });

      let allowed = 0;
      for (let i = 0; i < 100; i++) {
        if (limiter.check('user1').allowed) {
          allowed++;
        }
      }

      expect(allowed).toBe(15);
    });

    it('leaky bucket never allows more than capacity', () => {
      const limiter = new RateLimiter({
        strategy: Strategy.LEAKY_BUCKET,
        bucketCapacity: 20,
        refillRate: 0, // No leak
        enableCleanup: false,
      });

      let allowed = 0;
      for (let i = 0; i < 100; i++) {
        if (limiter.check('user1').allowed) {
          allowed++;
        }
      }

      expect(allowed).toBe(20);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-LIM-02: Window reset at correct time
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-LIM-02: Window reset at correct time', () => {
    it('fixed window resets after windowMs', async () => {
      const limiter = new RateLimiter({
        strategy: Strategy.FIXED_WINDOW,
        limit: 3,
        windowMs: 100,
        enableCleanup: false,
      });

      // Exhaust limit
      limiter.check('user1');
      limiter.check('user1');
      limiter.check('user1');
      expect(limiter.check('user1').allowed).toBe(false);

      // Wait for window reset
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should work again
      expect(limiter.check('user1').allowed).toBe(true);
    });

    it('sliding window slides correctly', async () => {
      const limiter = new RateLimiter({
        strategy: Strategy.SLIDING_WINDOW,
        limit: 2,
        windowMs: 100,
        enableCleanup: false,
      });

      limiter.check('user1'); // t=0
      await new Promise(resolve => setTimeout(resolve, 60));
      limiter.check('user1'); // t=60
      expect(limiter.check('user1').allowed).toBe(false); // at limit

      // Wait for first request to expire
      await new Promise(resolve => setTimeout(resolve, 50));

      // First request expired, should allow
      expect(limiter.check('user1').allowed).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-LIM-03: Tokens refill at correct rate
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-LIM-03: Tokens refill at correct rate', () => {
    it('token bucket refills predictably', async () => {
      const limiter = new RateLimiter({
        strategy: Strategy.TOKEN_BUCKET,
        bucketCapacity: 10,
        refillRate: 10, // 10 per second = 1 per 100ms
        enableCleanup: false,
      });

      // Exhaust all tokens
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1').allowed).toBe(false);

      // Wait 200ms = ~2 tokens
      await new Promise(resolve => setTimeout(resolve, 220));

      // Should have at least 1 token
      expect(limiter.check('user1').allowed).toBe(true);
    });

    it('leaky bucket leaks predictably', async () => {
      const limiter = new RateLimiter({
        strategy: Strategy.LEAKY_BUCKET,
        bucketCapacity: 10,
        refillRate: 20, // 20 per second = fast leak
        enableCleanup: false,
      });

      // Fill bucket
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1').allowed).toBe(false);

      // Wait 550ms = should leak ~11 units
      await new Promise(resolve => setTimeout(resolve, 550));

      // Do a check to trigger leak calculation
      const result = limiter.check('user1');
      
      // Should be nearly empty (added 1 from this check)
      expect(result.current).toBeLessThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-LIM-04: Per-key isolation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-LIM-04: Per-key isolation', () => {
    it('exhausting one key does not affect others', () => {
      const limiter = new RateLimiter({
        strategy: Strategy.SLIDING_WINDOW,
        limit: 3,
        windowMs: 10000,
        enableCleanup: false,
      });

      // Exhaust user1
      for (let i = 0; i < 5; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1').allowed).toBe(false);

      // user2, user3 should be unaffected
      expect(limiter.check('user2').allowed).toBe(true);
      expect(limiter.check('user3').allowed).toBe(true);
    });

    it('resetting one key does not affect others', () => {
      const limiter = new RateLimiter({
        strategy: Strategy.FIXED_WINDOW,
        limit: 3,
        windowMs: 10000,
        enableCleanup: false,
      });

      limiter.check('user1');
      limiter.check('user1');
      limiter.check('user2');
      limiter.check('user2');

      limiter.resetKey('user1');

      // user1 reset
      expect(limiter.getKeyInfo('user1')).toBeNull();
      
      // user2 unchanged
      expect(limiter.getKeyInfo('user2')?.current).toBe(2);
    });

    it('100 keys tracked independently', () => {
      const limiter = new RateLimiter({
        strategy: Strategy.SLIDING_WINDOW,
        limit: 5,
        windowMs: 10000,
        enableCleanup: false,
      });

      // Each key gets 3 requests
      for (let k = 0; k < 100; k++) {
        for (let r = 0; r < 3; r++) {
          const result = limiter.check(`user${k}`);
          expect(result.allowed).toBe(true);
        }
      }

      // Verify each key's state
      for (let k = 0; k < 100; k++) {
        const info = limiter.getKeyInfo(`user${k}`);
        expect(info?.current).toBe(3);
        expect(info?.remaining).toBe(2);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-LIM-05: Deterministic allow/deny
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-LIM-05: Deterministic allow/deny', () => {
    it('same state produces same result', () => {
      const limiter1 = new RateLimiter({
        strategy: Strategy.FIXED_WINDOW,
        limit: 5,
        windowMs: 10000,
        enableCleanup: false,
      });
      const limiter2 = new RateLimiter({
        strategy: Strategy.FIXED_WINDOW,
        limit: 5,
        windowMs: 10000,
        enableCleanup: false,
      });

      // Same sequence
      for (let i = 0; i < 7; i++) {
        const r1 = limiter1.check('user1');
        const r2 = limiter2.check('user1');
        expect(r1.allowed).toBe(r2.allowed);
      }
    });

    it('over limit is always denied', () => {
      const limiter = new RateLimiter({
        strategy: Strategy.SLIDING_WINDOW,
        limit: 5,
        windowMs: 10000,
        enableCleanup: false,
      });

      // Hit limit
      for (let i = 0; i < 5; i++) {
        limiter.check('user1');
      }

      // 100 more attempts all denied
      for (let i = 0; i < 100; i++) {
        expect(limiter.check('user1').allowed).toBe(false);
      }
    });

    it('under limit is always allowed', () => {
      const limiter = new RateLimiter({
        strategy: Strategy.FIXED_WINDOW,
        limit: 100,
        windowMs: 10000,
        enableCleanup: false,
      });

      // All under limit should be allowed
      for (let i = 0; i < 100; i++) {
        expect(limiter.check('user1').allowed).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-LIM-06: Stats accurate
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-LIM-06: Stats accurate', () => {
    it('totalChecks matches actual checks', () => {
      const limiter = new RateLimiter({
        strategy: Strategy.SLIDING_WINDOW,
        limit: 5,
        windowMs: 10000,
        enableCleanup: false,
      });

      const checkCount = 47;
      for (let i = 0; i < checkCount; i++) {
        limiter.check('user1');
      }

      expect(limiter.getStats().totalChecks).toBe(checkCount);
    });

    it('allowed + denied equals total', () => {
      const limiter = new RateLimiter({
        strategy: Strategy.FIXED_WINDOW,
        limit: 10,
        windowMs: 10000,
        enableCleanup: false,
      });

      for (let i = 0; i < 50; i++) {
        limiter.check('user1');
      }

      const stats = limiter.getStats();
      expect(stats.totalAllowed + stats.totalDenied).toBe(stats.totalChecks);
    });

    it('activeKeys accurate', () => {
      const limiter = new RateLimiter({
        strategy: Strategy.SLIDING_WINDOW,
        limit: 5,
        windowMs: 10000,
        enableCleanup: false,
      });

      const keyCount = 25;
      for (let i = 0; i < keyCount; i++) {
        limiter.check(`user${i}`);
      }

      expect(limiter.getStats().activeKeys).toBe(keyCount);
    });

    it('version always correct', () => {
      const limiters = [
        new RateLimiter({ strategy: Strategy.FIXED_WINDOW, enableCleanup: false }),
        new RateLimiter({ strategy: Strategy.SLIDING_WINDOW, enableCleanup: false }),
        new RateLimiter({ strategy: Strategy.TOKEN_BUCKET, enableCleanup: false }),
        new RateLimiter({ strategy: Strategy.LEAKY_BUCKET, enableCleanup: false }),
      ];

      for (const limiter of limiters) {
        expect(limiter.getStats().version).toBe(LIMITER_VERSION);
      }
    });
  });
});
