/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Emotion Cache
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * LRU cache for EmotionStateV2 results.
 * INV-ORC-04: Cache hit = skip LLM, same result guaranteed
 * 
 * @module oracle/emotion_cache
 * @version 3.14.0
 */

import type { EmotionStateV2 } from './emotion_v2.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

interface CacheEntry {
  readonly state: EmotionStateV2;
  readonly created_at_ms: number;
  readonly access_count: number;
  last_access_ms: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CacheStats {
  readonly size: number;
  readonly max_size: number;
  readonly hits: number;
  readonly misses: number;
  readonly hit_rate: number;
  readonly evictions: number;
  readonly oldest_entry_ms: number | null;
  readonly newest_entry_ms: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface CacheConfig {
  /** Maximum number of entries */
  readonly max_size: number;
  /** TTL in milliseconds (0 = infinite) */
  readonly ttl_ms: number;
  /** Enable cache (can be disabled for testing) */
  readonly enabled: boolean;
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = Object.freeze({
  max_size: 1000,
  ttl_ms: 3600000, // 1 hour
  enabled: true,
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION CACHE CLASS - INV-ORC-04
// ═══════════════════════════════════════════════════════════════════════════════

export class EmotionCache {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  
  // Statistics
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  
  constructor(config?: Partial<CacheConfig>) {
    this.config = Object.freeze({ ...DEFAULT_CACHE_CONFIG, ...config });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get current configuration
   */
  getConfig(): CacheConfig {
    return this.config;
  }
  
  /**
   * Check if cache is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE OPERATIONS - INV-ORC-04
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get cached result by input hash
   * Returns null if not found or expired
   */
  get(input_hash: string, now_ms: number): EmotionStateV2 | null {
    if (!this.config.enabled) {
      this.misses++;
      return null;
    }
    
    const entry = this.cache.get(input_hash);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    // Check TTL
    if (this.config.ttl_ms > 0) {
      const age = now_ms - entry.created_at_ms;
      if (age > this.config.ttl_ms) {
        // Expired
        this.cache.delete(input_hash);
        this.misses++;
        return null;
      }
    }
    
    // Update access info (mutable for LRU)
    entry.last_access_ms = now_ms;
    (entry as { access_count: number }).access_count++;
    
    this.hits++;
    
    // Return with cached flag set
    return {
      ...entry.state,
      cached: true,
    };
  }
  
  /**
   * Check if entry exists (without updating stats)
   */
  has(input_hash: string, now_ms: number): boolean {
    if (!this.config.enabled) return false;
    
    const entry = this.cache.get(input_hash);
    if (!entry) return false;
    
    // Check TTL
    if (this.config.ttl_ms > 0) {
      const age = now_ms - entry.created_at_ms;
      if (age > this.config.ttl_ms) return false;
    }
    
    return true;
  }
  
  /**
   * Store result in cache
   */
  set(input_hash: string, state: EmotionStateV2, now_ms: number): void {
    if (!this.config.enabled) return;
    
    // Evict if at capacity
    if (this.cache.size >= this.config.max_size && !this.cache.has(input_hash)) {
      this.evictLRU(now_ms);
    }
    
    const entry: CacheEntry = {
      state: { ...state, cached: false }, // Store without cached flag
      created_at_ms: now_ms,
      access_count: 1,
      last_access_ms: now_ms,
    };
    
    this.cache.set(input_hash, entry);
  }
  
  /**
   * Delete entry from cache
   */
  delete(input_hash: string): boolean {
    return this.cache.delete(input_hash);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LRU EVICTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Evict least recently used entry
   */
  private evictLRU(now_ms: number): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    
    // First, try to evict expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (this.config.ttl_ms > 0) {
        const age = now_ms - entry.created_at_ms;
        if (age > this.config.ttl_ms) {
          this.cache.delete(key);
          this.evictions++;
          return;
        }
      }
      
      if (entry.last_access_ms < oldestAccess) {
        oldestAccess = entry.last_access_ms;
        oldestKey = key;
      }
    }
    
    // Evict LRU entry
    if (oldestKey !== null) {
      this.cache.delete(oldestKey);
      this.evictions++;
    }
  }
  
  /**
   * Clean all expired entries
   */
  cleanExpired(now_ms: number): number {
    if (this.config.ttl_ms <= 0) return 0;
    
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      const age = now_ms - entry.created_at_ms;
      if (age > this.config.ttl_ms) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    this.evictions += cleaned;
    return cleaned;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hit_rate = total > 0 ? this.hits / total : 0;
    
    let oldest_entry_ms: number | null = null;
    let newest_entry_ms: number | null = null;
    
    for (const entry of this.cache.values()) {
      if (oldest_entry_ms === null || entry.created_at_ms < oldest_entry_ms) {
        oldest_entry_ms = entry.created_at_ms;
      }
      if (newest_entry_ms === null || entry.created_at_ms > newest_entry_ms) {
        newest_entry_ms = entry.created_at_ms;
      }
    }
    
    return {
      size: this.cache.size,
      max_size: this.config.max_size,
      hits: this.hits,
      misses: this.misses,
      hit_rate: Math.round(hit_rate * 1000) / 1000,
      evictions: this.evictions,
      oldest_entry_ms,
      newest_entry_ms,
    };
  }
  
  /**
   * Get all cached hashes (for debugging)
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }
  
  /**
   * Full reset (clear + reset stats)
   */
  reset(): void {
    this.clear();
    this.resetStats();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new emotion cache instance
 */
export function createEmotionCache(config?: Partial<CacheConfig>): EmotionCache {
  return new EmotionCache(config);
}
