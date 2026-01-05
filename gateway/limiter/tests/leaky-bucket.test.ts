/**
 * OMEGA RATE_LIMITER — Leaky Bucket Tests
 * Phase 16.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, Strategy, LimitResult } from '../src/limiter/index.js';

describe('RATE_LIMITER Leaky Bucket Strategy', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      strategy: Strategy.LEAKY_BUCKET,
      bucketCapacity: 10,
      refillRate: 10, // 10 units leak per second
      warningThreshold: 0.8,
      enableCleanup: false,
    });
  });

  describe('basic rate limiting', () => {
    it('allows requests when bucket not full', () => {
      for (let i = 0; i < 10; i++) {
        const result = limiter.check('user1');
        expect(result.allowed).toBe(true);
      }
    });

    it('denies when bucket overflows', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      const result = limiter.check('user1');
      expect(result.allowed).toBe(false);
    });

    it('leaks over time allowing new requests', async () => {
      // Fill bucket
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1').allowed).toBe(false);
      
      // Wait for some water to leak
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(limiter.check('user1').allowed).toBe(true);
    });
  });

  describe('leak rate', () => {
    it('leaks at correct rate', async () => {
      // Fill half the bucket
      for (let i = 0; i < 5; i++) {
        limiter.check('user1');
      }
      
      // Wait 500ms = 10 units leaked at 20/s
      await new Promise(resolve => setTimeout(resolve, 550));
      
      // Do a check to trigger leak calculation
      const result = limiter.check('user1');
      
      // Should be nearly empty - the check adds 1 but leak removed most
      expect(result.current).toBeLessThanOrEqual(2);
    });
  });

  describe('result structure', () => {
    it('includes all required fields', () => {
      const result = limiter.check('user1');
      
      expect(result.allowed).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.key).toBe('user1');
      expect(result.current).toBeDefined();
      expect(result.remaining).toBeDefined();
      expect(result.resetInMs).toBeDefined();
    });

    it('current increases as bucket fills', () => {
      const r1 = limiter.check('user1');
      const r2 = limiter.check('user1');
      const r3 = limiter.check('user1');
      
      expect(r1.current).toBe(1);
      expect(r2.current).toBe(2);
      expect(r3.current).toBe(3);
    });
  });

  describe('warning threshold', () => {
    it('warns when bucket nearly full', () => {
      // Fill to 80%
      for (let i = 0; i < 8; i++) {
        limiter.check('user1');
      }
      
      const result = limiter.check('user1');
      expect(result.result).toBe(LimitResult.WARNING);
    });
  });

  describe('per-key isolation', () => {
    it('each key has separate bucket', () => {
      // Fill user1's bucket
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1').allowed).toBe(false);
      
      // user2's bucket should be empty
      expect(limiter.check('user2').allowed).toBe(true);
    });
  });

  describe('getKeyInfo', () => {
    it('returns bucket state', () => {
      for (let i = 0; i < 5; i++) {
        limiter.check('user1');
      }
      
      const info = limiter.getKeyInfo('user1');
      expect(info).not.toBeNull();
      expect(info?.current).toBe(5);
      expect(info?.remaining).toBe(5);
    });
  });

  describe('reset', () => {
    it('empties the bucket', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1').allowed).toBe(false);
      
      limiter.resetKey('user1');
      
      expect(limiter.check('user1').allowed).toBe(true);
    });
  });
});
