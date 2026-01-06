// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS REPLAY CACHE
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// @invariant INV-WIRE-05: Replay Safety - même replay_protection_key
//                         → pas de double exécution non contrôlée
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { ReplayCache, createReplayCache } from '../src/replay_cache.js';
import { FixedClock, IncrementalClock } from '../src/clock.js';

describe('ReplayCache', () => {
  describe('Basic operations', () => {
    it('check returns isReplay: false for unknown key', () => {
      const cache = new ReplayCache({ clock: new FixedClock(1000) });
      const result = cache.check('unknown-key');
      expect(result.isReplay).toBe(false);
    });

    it('check returns isReplay: true after record', () => {
      const cache = new ReplayCache({ clock: new FixedClock(1000) });
      cache.record('key-1');
      const result = cache.check('key-1');
      expect(result.isReplay).toBe(true);
    });

    it('record stores cached result', () => {
      const cache = new ReplayCache({ clock: new FixedClock(1000) });
      const cachedValue = { hash: 'abc123', success: true };
      cache.record('key-1', cachedValue);
      
      const result = cache.check('key-1');
      expect(result.isReplay).toBe(true);
      if (result.isReplay) {
        expect(result.cachedResult).toEqual(cachedValue);
      }
    });

    it('has returns true for recorded key', () => {
      const cache = new ReplayCache({ clock: new FixedClock(1000) });
      cache.record('key-1');
      expect(cache.has('key-1')).toBe(true);
      expect(cache.has('key-2')).toBe(false);
    });

    it('size tracks number of entries', () => {
      const cache = new ReplayCache({ clock: new FixedClock(1000) });
      expect(cache.size).toBe(0);
      cache.record('key-1');
      expect(cache.size).toBe(1);
      cache.record('key-2');
      expect(cache.size).toBe(2);
    });

    it('remove deletes a key', () => {
      const cache = new ReplayCache({ clock: new FixedClock(1000) });
      cache.record('key-1');
      expect(cache.has('key-1')).toBe(true);
      cache.remove('key-1');
      expect(cache.has('key-1')).toBe(false);
    });

    it('clear removes all entries', () => {
      const cache = new ReplayCache({ clock: new FixedClock(1000) });
      cache.record('key-1');
      cache.record('key-2');
      cache.record('key-3');
      expect(cache.size).toBe(3);
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('checkAndRecord (atomic operation)', () => {
    it('returns isReplay: false and records on first call', () => {
      const cache = new ReplayCache({ clock: new FixedClock(1000) });
      
      const result = cache.checkAndRecord('key-1', { data: 42 });
      expect(result.isReplay).toBe(false);
      expect(cache.has('key-1')).toBe(true);
    });

    it('returns isReplay: true with cached result on second call', () => {
      const cache = new ReplayCache({ clock: new FixedClock(1000) });
      
      cache.checkAndRecord('key-1', { data: 42 });
      const result = cache.checkAndRecord('key-1', { data: 999 });
      
      expect(result.isReplay).toBe(true);
      if (result.isReplay) {
        expect(result.cachedResult).toEqual({ data: 42 });
      }
    });

    it('is idempotent - multiple calls return same cached result', () => {
      const cache = new ReplayCache({ clock: new FixedClock(1000) });
      
      cache.checkAndRecord('key-1', { original: true });
      
      for (let i = 0; i < 10; i++) {
        const result = cache.checkAndRecord('key-1', { attempt: i });
        expect(result.isReplay).toBe(true);
        if (result.isReplay) {
          expect(result.cachedResult).toEqual({ original: true });
        }
      }
    });
  });

  describe('TTL expiration', () => {
    it('entry expires after TTL', () => {
      const clock = new IncrementalClock(0, 1000);
      const cache = new ReplayCache({ clock, ttlMs: 5000 });
      
      cache.record('key-1'); // t=0
      
      // Advance clock past TTL
      clock.nowMs(); // t=1000
      clock.nowMs(); // t=2000
      clock.nowMs(); // t=3000
      clock.nowMs(); // t=4000
      clock.nowMs(); // t=5000
      clock.nowMs(); // t=6000 - past TTL
      
      const result = cache.check('key-1');
      expect(result.isReplay).toBe(false);
    });

    it('entry is valid before TTL', () => {
      const clock = new IncrementalClock(0, 1000);
      const cache = new ReplayCache({ clock, ttlMs: 5000 });
      
      cache.record('key-1'); // t=0
      
      // Advance clock but not past TTL
      clock.nowMs(); // t=1000
      clock.nowMs(); // t=2000
      
      const result = cache.check('key-1');
      expect(result.isReplay).toBe(true);
    });

    it('expired entries are cleaned up', () => {
      const clock = new IncrementalClock(0, 1000);
      const cache = new ReplayCache({ clock, ttlMs: 3000 });
      
      cache.record('key-1'); // t=0
      expect(cache.size).toBe(1);
      
      // Advance past TTL
      clock.nowMs(); // t=1000
      clock.nowMs(); // t=2000
      clock.nowMs(); // t=3000
      clock.nowMs(); // t=4000
      
      // Trigger cleanup via check
      cache.check('any-key');
      expect(cache.size).toBe(0);
    });
  });

  describe('Max size eviction', () => {
    it('evicts oldest entries when maxSize reached', () => {
      const clock = new IncrementalClock(0, 1);
      const cache = new ReplayCache({ clock, maxSize: 10 });
      
      // Fill cache
      for (let i = 0; i < 10; i++) {
        cache.record(`key-${i}`);
      }
      expect(cache.size).toBe(10);
      
      // Add one more - should trigger eviction
      cache.record('key-new');
      expect(cache.size).toBeLessThanOrEqual(10);
      
      // New key should exist
      expect(cache.has('key-new')).toBe(true);
    });

    it('oldest entries are evicted first', () => {
      const clock = new IncrementalClock(0, 100);
      const cache = new ReplayCache({ clock, maxSize: 5, ttlMs: 1000000 });
      
      // Add entries with increasing timestamps
      cache.record('oldest');     // t=0
      cache.record('second');     // t=100
      cache.record('third');      // t=200
      cache.record('fourth');     // t=300
      cache.record('fifth');      // t=400
      
      // Add new entry - should evict oldest
      cache.record('newest');     // t=500
      
      // Oldest should be gone
      expect(cache.has('oldest')).toBe(false);
      // Newest should exist
      expect(cache.has('newest')).toBe(true);
    });
  });

  describe('INV-WIRE-05: Replay Safety', () => {
    it('prevents double execution - same key always returns replay', () => {
      const cache = new ReplayCache({ clock: new FixedClock(1000) });
      
      // First execution
      const first = cache.checkAndRecord('operation-123', { result: 'success' });
      expect(first.isReplay).toBe(false);
      
      // Simulated "retry" - should return cached result, not execute again
      const retry1 = cache.checkAndRecord('operation-123');
      const retry2 = cache.checkAndRecord('operation-123');
      const retry3 = cache.checkAndRecord('operation-123');
      
      expect(retry1.isReplay).toBe(true);
      expect(retry2.isReplay).toBe(true);
      expect(retry3.isReplay).toBe(true);
      
      if (retry1.isReplay) {
        expect(retry1.cachedResult).toEqual({ result: 'success' });
      }
    });

    it('different keys are not considered replay', () => {
      const cache = new ReplayCache({ clock: new FixedClock(1000) });
      
      cache.record('key-A');
      
      const resultB = cache.check('key-B');
      const resultC = cache.check('key-C');
      
      expect(resultB.isReplay).toBe(false);
      expect(resultC.isReplay).toBe(false);
    });

    it('handles high volume without false positives', () => {
      const cache = new ReplayCache({ 
        clock: new FixedClock(1000),
        maxSize: 10000 
      });
      
      const keys: string[] = [];
      for (let i = 0; i < 1000; i++) {
        keys.push(`unique-key-${i}`);
      }
      
      // Record all
      for (const key of keys) {
        cache.record(key);
      }
      
      // Verify all are detected as replay
      for (const key of keys) {
        expect(cache.check(key).isReplay).toBe(true);
      }
      
      // Verify new keys are not replay
      for (let i = 0; i < 100; i++) {
        expect(cache.check(`new-key-${i}`).isReplay).toBe(false);
      }
    });

    it('handles rapid successive checks for same key', () => {
      const cache = new ReplayCache({ clock: new FixedClock(1000) });
      
      // First check and record
      const first = cache.checkAndRecord('rapid-key', { executed: true });
      expect(first.isReplay).toBe(false);
      
      // 100 rapid checks - all should be replay
      const results: boolean[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(cache.check('rapid-key').isReplay);
      }
      
      expect(results.every(r => r === true)).toBe(true);
    });
  });

  describe('Factory function', () => {
    it('createReplayCache creates cache with defaults', () => {
      const cache = createReplayCache(new FixedClock(1000));
      expect(cache).toBeInstanceOf(ReplayCache);
      expect(cache.size).toBe(0);
    });

    it('createReplayCache accepts options', () => {
      const cache = createReplayCache(new FixedClock(1000), {
        ttlMs: 60000,
        maxSize: 500,
      });
      expect(cache).toBeInstanceOf(ReplayCache);
    });
  });
});
