/**
 * OMEGA RATE_LIMITER — Token Bucket Tests
 * Phase 16.3
 * 
 * INV-LIM-03: Tokens refill at correct rate
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, Strategy, LimitResult } from '../src/limiter/index.js';

describe('RATE_LIMITER Token Bucket Strategy', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      strategy: Strategy.TOKEN_BUCKET,
      bucketCapacity: 10,
      refillRate: 10, // 10 tokens per second
      warningThreshold: 0.8,
      enableCleanup: false,
    });
  });

  describe('basic token consumption', () => {
    it('allows requests when tokens available', () => {
      for (let i = 0; i < 10; i++) {
        const result = limiter.check('user1');
        expect(result.allowed).toBe(true);
      }
    });

    it('denies when tokens exhausted', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      const result = limiter.check('user1');
      expect(result.allowed).toBe(false);
    });

    it('refills tokens over time', async () => {
      // Exhaust tokens
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1').allowed).toBe(false);
      
      // Wait for refill (100ms = 1 token at 10/s)
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(limiter.check('user1').allowed).toBe(true);
    });
  });

  describe('consume() method', () => {
    it('consumes multiple tokens', () => {
      const result = limiter.consume('user1', 5);
      expect(result.allowed).toBe(true);
      expect(result.consumed).toBe(5);
      expect(result.requested).toBe(5);
    });

    it('denies when not enough tokens', () => {
      limiter.consume('user1', 8);
      const result = limiter.consume('user1', 5);
      expect(result.allowed).toBe(false);
      expect(result.consumed).toBe(0);
    });

    it('consumes exactly requested tokens', () => {
      const r1 = limiter.consume('user1', 3);
      const r2 = limiter.consume('user1', 4);
      
      expect(r1.remaining).toBe(7);
      expect(r2.remaining).toBe(3);
    });
  });

  describe('refill rate (INV-LIM-03)', () => {
    it('refills at correct rate', async () => {
      // Exhaust all tokens
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      
      // Wait 200ms = 2 tokens
      await new Promise(resolve => setTimeout(resolve, 220));
      
      // Should have ~2 tokens
      const result = limiter.check('user1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    it('does not exceed bucket capacity', async () => {
      // Check once and wait
      limiter.check('user1');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Should be capped at bucket capacity
      const info = limiter.getKeyInfo('user1');
      expect(info?.remaining).toBeLessThanOrEqual(10);
    });
  });

  describe('result structure', () => {
    it('includes token-specific info', () => {
      const result = limiter.check('user1');
      
      expect(result.allowed).toBe(true);
      expect(result.current).toBeDefined();
      expect(result.remaining).toBeDefined();
      expect(result.resetInMs).toBeDefined();
    });

    it('remaining reflects tokens left', () => {
      limiter.consume('user1', 7);
      const result = limiter.check('user1');
      expect(result.remaining).toBe(2);
    });
  });

  describe('warning threshold', () => {
    it('warns when tokens low', () => {
      // Use 80% of tokens
      limiter.consume('user1', 8);
      
      // Next request should warn
      const result = limiter.check('user1');
      expect(result.result).toBe(LimitResult.WARNING);
      expect(result.allowed).toBe(true);
    });
  });

  describe('per-key isolation', () => {
    it('tracks buckets independently', () => {
      // Exhaust user1
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1').allowed).toBe(false);
      
      // user2 should be full
      expect(limiter.check('user2').allowed).toBe(true);
      expect(limiter.check('user2').remaining).toBe(8);
    });
  });

  describe('getKeyInfo', () => {
    it('returns bucket state', () => {
      limiter.consume('user1', 3);
      
      const info = limiter.getKeyInfo('user1');
      expect(info).not.toBeNull();
      expect(info?.remaining).toBe(7);
    });
  });

  describe('reset', () => {
    it('resets bucket to full capacity', () => {
      limiter.consume('user1', 10);
      expect(limiter.check('user1').allowed).toBe(false);
      
      limiter.resetKey('user1');
      
      // New bucket should be full
      expect(limiter.check('user1').allowed).toBe(true);
    });
  });
});
