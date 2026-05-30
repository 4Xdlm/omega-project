/**
 * Oracle Cache Tests
 * @module @omega/oracle/test/cache
 * @description Unit tests for Phase 141 - Oracle Cache
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OracleCache, createCache, DEFAULT_CACHE_CONFIG, type CacheConfig } from '../src/cache';
import type { OracleResponse } from '../src/types';

describe('OMEGA Oracle - Phase 141: Oracle Cache', () => {
  let cache: OracleCache;

  const mockResponse: OracleResponse = {
    id: 'test-1',
    text: 'Test text',
    insights: [{ primaryEmotion: 'joy', confidence: 0.8, evidence: [], intensity: 0.7 }],
    summary: 'Test summary',
    metadata: {
      model: 'test',
      tokensUsed: 100,
      processingTime: 50,
      cached: false,
      timestamp: Date.now(),
    },
  };

  beforeEach(() => {
    cache = createCache();
  });

  describe('Cache Configuration', () => {
    it('should use default configuration', () => {
      expect(DEFAULT_CACHE_CONFIG.maxSize).toBe(50 * 1024 * 1024);
      expect(DEFAULT_CACHE_CONFIG.defaultTTL).toBe(3600000);
      expect(DEFAULT_CACHE_CONFIG.lruEnabled).toBe(true);
    });

    it('should accept custom configuration', () => {
      const custom = createCache({ maxSize: 10 * 1024 * 1024, maxEntries: 100 });
      expect(custom).toBeDefined();
    });
  });

  describe('Key Generation', () => {
    it('should generate consistent keys', () => {
      const key1 = cache.generateKey('test', 'standard', {});
      const key2 = cache.generateKey('test', 'standard', {});
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different texts', () => {
      const key1 = cache.generateKey('text1', 'standard', {});
      const key2 = cache.generateKey('text2', 'standard', {});
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different depths', () => {
      const key1 = cache.generateKey('test', 'quick', {});
      const key2 = cache.generateKey('test', 'deep', {});
      expect(key1).not.toBe(key2);
    });

    it('should start with cache- prefix', () => {
      const key = cache.generateKey('test', 'standard', {});
      expect(key.startsWith('cache-')).toBe(true);
    });
  });

  describe('Basic Operations', () => {
    it('should set and get value', () => {
      const key = 'test-key';
      cache.set(key, mockResponse);
      const result = cache.get(key);
      expect(result).toEqual(mockResponse);
    });

    it('should return null for missing key', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete value', () => {
      const key = 'delete-test';
      cache.set(key, mockResponse);
      expect(cache.has(key)).toBe(true);
      cache.delete(key);
      expect(cache.has(key)).toBe(false);
    });

    it('should check existence with has', () => {
      const key = 'has-test';
      expect(cache.has(key)).toBe(false);
      cache.set(key, mockResponse);
      expect(cache.has(key)).toBe(true);
    });

    it('should clear all entries', () => {
      cache.set('key1', mockResponse);
      cache.set('key2', mockResponse);
      cache.clear();
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortCache = createCache({ defaultTTL: 50 }); // 50ms TTL
      shortCache.set('expire-test', mockResponse);

      expect(shortCache.has('expire-test')).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(shortCache.has('expire-test')).toBe(false);
    });

    it('should support custom TTL per entry', async () => {
      cache.set('custom-ttl', mockResponse, 50); // 50ms TTL

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(cache.has('custom-ttl')).toBe(false);
    });

    it('should cleanup expired entries', async () => {
      const shortCache = createCache({ defaultTTL: 50 });
      shortCache.set('cleanup1', mockResponse);
      shortCache.set('cleanup2', mockResponse);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const cleaned = shortCache.cleanup();
      expect(cleaned).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', () => {
      cache.set('stats-test', mockResponse);
      cache.get('stats-test'); // hit
      cache.get('missing'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should calculate hit rate', () => {
      cache.set('hit-rate', mockResponse);
      cache.get('hit-rate'); // hit
      cache.get('hit-rate'); // hit
      cache.get('missing'); // miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should track entry count', () => {
      cache.set('count1', mockResponse);
      cache.set('count2', mockResponse);

      const stats = cache.getStats();
      expect(stats.entries).toBe(2);
    });

    it('should track evictions', () => {
      const smallCache = createCache({ maxEntries: 2 });
      smallCache.set('evict1', mockResponse);
      smallCache.set('evict2', mockResponse);
      smallCache.set('evict3', mockResponse); // triggers eviction

      const stats = smallCache.getStats();
      expect(stats.evictions).toBeGreaterThanOrEqual(1);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used', async () => {
      const smallCache = createCache({ maxEntries: 2, lruEnabled: true });

      smallCache.set('lru1', mockResponse);
      await new Promise((r) => setTimeout(r, 10)); // Ensure different timestamps
      smallCache.set('lru2', mockResponse);

      await new Promise((r) => setTimeout(r, 10));
      // Access lru1 to make it more recent
      smallCache.get('lru1');

      await new Promise((r) => setTimeout(r, 10));
      // Add new entry, should evict lru2
      smallCache.set('lru3', mockResponse);

      expect(smallCache.has('lru1')).toBe(true);
      expect(smallCache.has('lru2')).toBe(false);
      expect(smallCache.has('lru3')).toBe(true);
    });
  });

  describe('Export and Import', () => {
    it('should export cache contents', () => {
      cache.set('export1', mockResponse);
      cache.set('export2', mockResponse);

      const exported = cache.export();
      expect(exported.length).toBe(2);
    });

    it('should import cache contents', () => {
      const exportCache = createCache();
      exportCache.set('import-test', mockResponse);
      const exported = exportCache.export();

      const importCache = createCache();
      importCache.import(exported);

      expect(importCache.has('import-test')).toBe(true);
    });

    it('should skip expired entries on import', () => {
      const expired = [{
        key: 'expired',
        entry: {
          value: mockResponse,
          expires: Date.now() - 1000, // Already expired
          accessCount: 1,
          lastAccess: Date.now(),
          size: 100,
        },
      }];

      cache.import(expired);
      expect(cache.has('expired')).toBe(false);
    });
  });

  describe('Warmup', () => {
    it('should warmup cache with entries', () => {
      cache.warmup([
        { key: 'warm1', value: mockResponse },
        { key: 'warm2', value: mockResponse },
      ]);

      expect(cache.has('warm1')).toBe(true);
      expect(cache.has('warm2')).toBe(true);
    });
  });

  describe('Invariants', () => {
    it('INV-CACHE-001: Keys must start with cache- prefix', () => {
      const key = cache.generateKey('test', 'standard', {});
      expect(key.startsWith('cache-')).toBe(true);
    });

    it('INV-CACHE-002: Hit rate must be between 0 and 1', () => {
      cache.set('inv-test', mockResponse);
      cache.get('inv-test');
      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });

    it('INV-CACHE-003: Expired entries must be removed on access', async () => {
      const shortCache = createCache({ defaultTTL: 50 });
      shortCache.set('expire-access', mockResponse);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = shortCache.get('expire-access');
      expect(result).toBeNull();
    });

    it('INV-CACHE-004: Clear must remove all entries', () => {
      cache.set('clear1', mockResponse);
      cache.set('clear2', mockResponse);
      cache.clear();
      expect(cache.keys().length).toBe(0);
    });

    it('INV-CACHE-005: Max entries limit must be enforced', () => {
      const smallCache = createCache({ maxEntries: 3 });
      for (let i = 0; i < 5; i++) {
        smallCache.set(`limit-${i}`, mockResponse);
      }
      expect(smallCache.getStats().entries).toBeLessThanOrEqual(3);
    });

    it('INV-CACHE-006: Access count must increment on get', () => {
      cache.set('access-count', mockResponse);
      cache.get('access-count');
      cache.get('access-count');
      // Access count is internal, but stats should reflect hits
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });
  });
});
