/**
 * OMEGA RATE_LIMITER — Statistics Tests
 * Phase 16.3
 * 
 * INV-LIM-06: Stats accurate
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, Strategy, LIMITER_VERSION } from '../src/limiter/index.js';

describe('RATE_LIMITER getStats() (INV-LIM-06)', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      strategy: Strategy.SLIDING_WINDOW,
      limit: 5,
      windowMs: 1000,
      enableCleanup: false,
      enableStats: true,
    });
  });

  describe('report structure', () => {
    it('includes timestamp', () => {
      const stats = limiter.getStats();
      expect(stats.timestamp).toBeDefined();
      expect(new Date(stats.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('includes version', () => {
      const stats = limiter.getStats();
      expect(stats.version).toBe(LIMITER_VERSION);
    });

    it('includes uptimeMs', () => {
      const stats = limiter.getStats();
      expect(stats.uptimeMs).toBeGreaterThanOrEqual(0);
    });

    it('includes all counter fields', () => {
      const stats = limiter.getStats();
      expect(stats.totalChecks).toBeDefined();
      expect(stats.totalAllowed).toBeDefined();
      expect(stats.totalDenied).toBeDefined();
      expect(stats.totalWarnings).toBeDefined();
    });

    it('includes key counts', () => {
      const stats = limiter.getStats();
      expect(stats.activeKeys).toBeDefined();
      expect(stats.peakKeys).toBeDefined();
    });

    it('includes rates', () => {
      const stats = limiter.getStats();
      expect(stats.allowRate).toBeDefined();
      expect(stats.denyRate).toBeDefined();
    });

    it('includes config', () => {
      const stats = limiter.getStats();
      expect(stats.config).toBeDefined();
      expect(stats.config.strategy).toBe(Strategy.SLIDING_WINDOW);
    });
  });

  describe('counter tracking', () => {
    it('tracks totalChecks', () => {
      limiter.check('user1');
      limiter.check('user1');
      limiter.check('user1');
      
      const stats = limiter.getStats();
      expect(stats.totalChecks).toBe(3);
    });

    it('tracks totalAllowed', () => {
      limiter.check('user1');
      limiter.check('user1');
      
      const stats = limiter.getStats();
      expect(stats.totalAllowed).toBe(2);
    });

    it('tracks totalDenied', () => {
      for (let i = 0; i < 7; i++) {
        limiter.check('user1');
      }
      
      const stats = limiter.getStats();
      expect(stats.totalDenied).toBe(2);
    });

    it('tracks totalWarnings', () => {
      const limiter10 = new RateLimiter({
        strategy: Strategy.SLIDING_WINDOW,
        limit: 10,
        windowMs: 1000,
        warningThreshold: 0.8,
        enableCleanup: false,
      });

      for (let i = 0; i < 10; i++) {
        limiter10.check('user1');
      }
      
      const stats = limiter10.getStats();
      expect(stats.totalWarnings).toBe(3); // 8th, 9th, 10th are warnings
    });
  });

  describe('key tracking', () => {
    it('tracks activeKeys', () => {
      limiter.check('user1');
      limiter.check('user2');
      limiter.check('user3');
      
      const stats = limiter.getStats();
      expect(stats.activeKeys).toBe(3);
    });

    it('tracks peakKeys', () => {
      limiter.check('user1');
      limiter.check('user2');
      limiter.check('user3');
      
      // Reset one
      limiter.resetKey('user2');
      
      const stats = limiter.getStats();
      expect(stats.peakKeys).toBe(3);
      expect(stats.activeKeys).toBe(2);
    });
  });

  describe('rate calculations', () => {
    it('calculates allowRate correctly', () => {
      limiter.check('user1');
      limiter.check('user1');
      limiter.check('user1');
      limiter.check('user1');
      
      const stats = limiter.getStats();
      expect(stats.allowRate).toBe(100);
    });

    it('calculates denyRate correctly', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      
      const stats = limiter.getStats();
      // 5 allowed, 5 denied = 50% deny rate
      expect(stats.denyRate).toBe(50);
    });
  });

  describe('getKeyStats()', () => {
    it('returns per-key statistics', () => {
      limiter.check('user1');
      limiter.check('user1');
      
      const keyStats = limiter.getKeyStats('user1');
      expect(keyStats).not.toBeNull();
      expect(keyStats?.totalChecks).toBe(2);
      expect(keyStats?.totalAllowed).toBe(2);
    });

    it('returns null for unknown key', () => {
      const keyStats = limiter.getKeyStats('unknown');
      expect(keyStats).toBeNull();
    });

    it('tracks denials per key', () => {
      for (let i = 0; i < 7; i++) {
        limiter.check('user1');
      }
      
      const keyStats = limiter.getKeyStats('user1');
      expect(keyStats?.totalDenied).toBe(2);
    });

    it('tracks firstSeen and lastSeen', () => {
      limiter.check('user1');
      
      const keyStats = limiter.getKeyStats('user1');
      expect(keyStats?.firstSeen).toBeDefined();
      expect(keyStats?.lastSeen).toBeDefined();
    });
  });

  describe('stats coherence (INV-LIM-06)', () => {
    it('totalChecks equals allowed + denied', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      
      const stats = limiter.getStats();
      expect(stats.totalChecks).toBe(stats.totalAllowed + stats.totalDenied);
    });

    it('rates sum to 100', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('user1');
      }
      
      const stats = limiter.getStats();
      expect(stats.allowRate + stats.denyRate).toBe(100);
    });

    it('peakKeys >= activeKeys always', () => {
      limiter.check('user1');
      limiter.check('user2');
      limiter.check('user3');
      limiter.resetKey('user2');
      
      const stats = limiter.getStats();
      expect(stats.peakKeys).toBeGreaterThanOrEqual(stats.activeKeys);
    });
  });
});

describe('RATE_LIMITER clear()', () => {
  it('resets all state', () => {
    const limiter = new RateLimiter({
      strategy: Strategy.SLIDING_WINDOW,
      limit: 5,
      enableCleanup: false,
    });
    
    limiter.check('user1');
    limiter.check('user2');
    
    limiter.clear();
    
    const stats = limiter.getStats();
    expect(stats.totalChecks).toBe(0);
    expect(stats.activeKeys).toBe(0);
  });
});
