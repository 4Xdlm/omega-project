/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SEMANTIC CACHE TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/semantic/semantic-cache.test.ts
 * Version: 1.0.0 (Sprint 9 Commit 9.3)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SEM-02
 *
 * Tests for semantic emotion analysis cache layer.
 * 5 mandatory tests: CACHE-01 to CACHE-05.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticCache } from '../../src/semantic/semantic-cache.js';
import type { SemanticEmotionResult } from '../../src/semantic/types.js';

const mockResult: SemanticEmotionResult = {
  joy: 0.5,
  trust: 0.4,
  fear: 0.3,
  surprise: 0.2,
  sadness: 0.1,
  disgust: 0.05,
  anger: 0.15,
  anticipation: 0.25,
  love: 0.35,
  submission: 0.45,
  awe: 0.55,
  disapproval: 0.65,
  remorse: 0.75,
  contempt: 0.85,
};

describe('Semantic Cache (ART-SEM-02)', () => {
  let cache: SemanticCache;

  beforeEach(() => {
    cache = new SemanticCache(3600); // 1 hour TTL
  });

  it('CACHE-01: cache miss returns null and increments miss counter', () => {
    const key = cache.computeCacheKey('test text', 'claude-4', 'prompt-hash-abc');

    const result = cache.get(key);

    // Cache miss
    expect(result).toBeNull();

    // Stats should show 1 miss
    const stats = cache.stats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(0);
    expect(stats.size).toBe(0);
  });

  it('CACHE-02: cache hit returns stored result and increments hit counter', () => {
    const text = 'test text';
    const modelId = 'claude-4';
    const promptHash = 'prompt-hash-abc';
    const key = cache.computeCacheKey(text, modelId, promptHash);

    // Store result
    cache.set(key, mockResult);

    // Retrieve result
    const retrieved = cache.get(key);

    // Cache hit
    expect(retrieved).toEqual(mockResult);
    expect(retrieved?.joy).toBe(0.5);

    // Stats should show 1 hit
    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(0);
    expect(stats.size).toBe(1);
  });

  it('CACHE-03: same inputs produce same cache key (determinism)', () => {
    const text = 'Hello world';
    const modelId = 'claude-sonnet-4';
    const promptHash = 'abc123def456';

    const key1 = cache.computeCacheKey(text, modelId, promptHash);
    const key2 = cache.computeCacheKey(text, modelId, promptHash);

    // ART-SEM-02: Same inputs → same cache key
    expect(key1).toBe(key2);

    // Different text → different key
    const key3 = cache.computeCacheKey('Different text', modelId, promptHash);
    expect(key3).not.toBe(key1);

    // Different model → different key
    const key4 = cache.computeCacheKey(text, 'gpt-4', promptHash);
    expect(key4).not.toBe(key1);

    // Different prompt hash → different key
    const key5 = cache.computeCacheKey(text, modelId, 'xyz789');
    expect(key5).not.toBe(key1);
  });

  it('CACHE-04: expired entries return null (TTL enforcement)', () => {
    // Create cache with 1 second TTL
    const shortCache = new SemanticCache(1);
    const key = shortCache.computeCacheKey('test', 'model', 'prompt');

    // Store result
    shortCache.set(key, mockResult);

    // Immediate get should hit
    const immediate = shortCache.get(key);
    expect(immediate).toEqual(mockResult);
    expect(shortCache.stats().hits).toBe(1);

    // Wait for expiration (1.1 seconds)
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const expired = shortCache.get(key);

        // Expired entry should return null
        expect(expired).toBeNull();

        // Should count as miss
        expect(shortCache.stats().misses).toBe(1);

        // Entry should be removed from cache
        expect(shortCache.stats().size).toBe(0);

        resolve();
      }, 1100);
    });
  });

  it('CACHE-05: clear() resets cache and statistics', () => {
    // Populate cache
    const key1 = cache.computeCacheKey('text1', 'model1', 'prompt1');
    const key2 = cache.computeCacheKey('text2', 'model2', 'prompt2');

    cache.set(key1, mockResult);
    cache.set(key2, mockResult);

    // Generate some hits and misses
    cache.get(key1); // hit
    cache.get('nonexistent'); // miss

    // Verify stats before clear
    let stats = cache.stats();
    expect(stats.size).toBe(2);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);

    // Clear cache
    cache.clear();

    // Verify everything is reset
    stats = cache.stats();
    expect(stats.size).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);

    // Keys should no longer exist
    expect(cache.get(key1)).toBeNull();
    expect(cache.get(key2)).toBeNull();
  });
});
