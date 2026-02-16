/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SEMANTIC ANALYZER CACHE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: src/semantic/semantic-cache.ts
 * Version: 1.0.0 (Sprint 9 Commit 9.3)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SEM-02
 *
 * In-memory cache for semantic emotion analysis results.
 * Cache key: (text_hash, model_id, prompt_hash) → deterministic.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256 } from '@omega/canon-kernel';
import type { SemanticEmotionResult, SemanticCacheKey } from './types.js';

/**
 * Cache entry with TTL timestamp.
 */
interface CacheEntry {
  readonly result: SemanticEmotionResult;
  readonly expiresAt: number; // Unix timestamp (ms)
}

/**
 * Cache statistics.
 */
export interface CacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly size: number;
}

/**
 * In-memory cache for semantic emotion analysis results.
 * Thread-safe for single-process use. Not persistent.
 *
 * ART-SEM-02: Cache hit → same (text_hash, model_id, prompt_hash) → same result.
 *
 * @remarks
 * - Cache key: SHA-256 of (text_hash + model_id + prompt_hash)
 * - TTL-based expiration (default: 1 hour)
 * - LRU eviction not implemented (infinite growth until clear())
 * - Stats: hits, misses, current size
 *
 * @example
 * ```typescript
 * const cache = new SemanticCache(3600); // 1 hour TTL
 * const key = cache.computeCacheKey('Hello world', 'claude-4', 'prompt-hash-abc');
 * cache.set(key, result);
 * const cached = cache.get(key); // Returns result if not expired
 * ```
 */
export class SemanticCache {
  private cache: Map<string, CacheEntry> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private readonly ttlSeconds: number;

  /**
   * Creates a new semantic cache.
   *
   * @param ttlSeconds - Time-to-live in seconds (default: 3600 = 1 hour)
   */
  constructor(ttlSeconds: number = 3600) {
    this.ttlSeconds = ttlSeconds;
  }

  /**
   * Computes deterministic cache key from text, model ID, and prompt hash.
   * ART-SEM-02: Same inputs → same cache key.
   *
   * @param text - Text being analyzed
   * @param modelId - LLM model identifier (e.g., 'claude-sonnet-4-20250514')
   * @param promptHash - SHA-256 hash of the analysis prompt template
   * @returns Cache key (SHA-256 hex string)
   */
  computeCacheKey(text: string, modelId: string, promptHash: string): string {
    const textHash = sha256(text);
    // Combine all three components with null-byte separators for uniqueness
    const composite = `${textHash}\x00${modelId}\x00${promptHash}`;
    return sha256(composite);
  }

  /**
   * Retrieves cached result if present and not expired.
   *
   * @param key - Cache key from computeCacheKey()
   * @returns Cached result or null if not found / expired
   */
  get(key: string): SemanticEmotionResult | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check TTL expiration
    const now = Date.now();
    if (now > entry.expiresAt) {
      // Expired: remove from cache and count as miss
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Cache hit
    this.hits++;
    return entry.result;
  }

  /**
   * Stores result in cache with TTL.
   *
   * @param key - Cache key from computeCacheKey()
   * @param result - Semantic emotion analysis result to cache
   */
  set(key: string, result: SemanticEmotionResult): void {
    const expiresAt = Date.now() + this.ttlSeconds * 1000;
    this.cache.set(key, { result, expiresAt });
  }

  /**
   * Clears all cached entries and resets statistics.
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Returns cache statistics.
   *
   * @returns Current cache stats (hits, misses, size)
   */
  stats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
    };
  }
}
