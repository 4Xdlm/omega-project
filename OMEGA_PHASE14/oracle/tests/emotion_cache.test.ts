/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Emotion Cache Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for LRU cache functionality.
 * INV-ORC-04: Cache hit = skip LLM, same result
 * 
 * Total: 8 tests
 * 
 * @module oracle/tests/emotion_cache.test
 * @version 3.14.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EmotionCache,
  createEmotionCache,
} from '../emotion_cache.js';
import {
  validateEmotionStateV2,
  EMOTION_V2_VERSION,
} from '../emotion_v2.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════════

function mockState(trace_id: string = 'test') {
  return validateEmotionStateV2({
    schema_version: EMOTION_V2_VERSION,
    trace_id,
    created_at_ms: 1000,
    signals: [{ channel: 'semantic', valence: 0, arousal: 0.5, confidence: 0.8 }],
    appraisal: {
      emotions: [{ label: 'joy', family: 'joy_family', weight: 1, polarity: 1 }],
      dominant: 'joy',
      ambiguity: 0,
      valence_aggregate: 0,
      arousal_aggregate: 0.5,
    },
    model: { provider_id: 'p', model_name: 'm', latency_ms: 100 },
    rationale: 'Test',
    input_hash: 'HASH',
    cached: false,
    calibrated: false,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Emotion Cache - INV-ORC-04', () => {
  let cache: EmotionCache;
  
  beforeEach(() => {
    cache = createEmotionCache({
      max_size: 10,
      ttl_ms: 60000,
      enabled: true,
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: Basic Operations (3 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Basic Operations', () => {
    it('stores and retrieves entries', () => {
      const state = mockState();
      cache.set('hash1', state, 1000);
      
      const retrieved = cache.get('hash1', 2000);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.trace_id).toBe('test');
      expect(retrieved!.cached).toBe(true);
    });
    
    it('returns null for non-existent key', () => {
      expect(cache.get('nonexistent', 1000)).toBeNull();
    });
    
    it('has() checks existence correctly', () => {
      const state = mockState();
      cache.set('hash1', state, 1000);
      
      expect(cache.has('hash1', 1000)).toBe(true);
      expect(cache.has('nonexistent', 1000)).toBe(false);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: TTL (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('TTL Expiration', () => {
    it('expires entries after TTL', () => {
      cache = createEmotionCache({ ttl_ms: 1000, enabled: true });
      
      const state = mockState();
      cache.set('hash1', state, 1000);
      
      // Before expiry
      expect(cache.get('hash1', 1500)).not.toBeNull();
      
      // After expiry
      expect(cache.get('hash1', 3000)).toBeNull();
    });
    
    it('cleanExpired removes old entries', () => {
      cache = createEmotionCache({ ttl_ms: 1000, enabled: true });
      
      cache.set('hash1', mockState(), 1000);
      cache.set('hash2', mockState(), 2000);
      
      const cleaned = cache.cleanExpired(5000);
      expect(cleaned).toBe(2);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: LRU Eviction (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('LRU Eviction', () => {
    it('evicts LRU entry when at capacity', () => {
      cache = createEmotionCache({ max_size: 3, ttl_ms: 0, enabled: true });
      
      cache.set('hash1', mockState('1'), 1000);
      cache.set('hash2', mockState('2'), 2000);
      cache.set('hash3', mockState('3'), 3000);
      
      // Access hash1 to make it recently used
      cache.get('hash1', 4000);
      
      // Add new entry, should evict hash2 (LRU)
      cache.set('hash4', mockState('4'), 5000);
      
      expect(cache.has('hash1', 5000)).toBe(true);
      expect(cache.has('hash2', 5000)).toBe(false); // Evicted
      expect(cache.has('hash3', 5000)).toBe(true);
      expect(cache.has('hash4', 5000)).toBe(true);
    });
    
    it('tracks eviction count', () => {
      cache = createEmotionCache({ max_size: 2, ttl_ms: 0, enabled: true });
      
      cache.set('h1', mockState(), 1000);
      cache.set('h2', mockState(), 2000);
      cache.set('h3', mockState(), 3000); // Evicts h1
      
      const stats = cache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: Statistics (1 test)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Statistics', () => {
    it('tracks hits and misses', () => {
      cache.set('hash1', mockState(), 1000);
      
      cache.get('hash1', 2000); // Hit
      cache.get('hash1', 3000); // Hit
      cache.get('nonexistent', 4000); // Miss
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hit_rate).toBeCloseTo(0.667, 1);
    });
  });
});
