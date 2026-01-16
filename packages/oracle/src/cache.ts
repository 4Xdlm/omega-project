/**
 * Oracle Cache System
 * @module @omega/oracle/cache
 * @description Intelligent caching for Oracle responses
 */

import type { OracleResponse } from './types';

/**
 * Cache entry structure
 */
export interface CacheEntry<T> {
  value: T;
  expires: number;
  accessCount: number;
  lastAccess: number;
  size: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Maximum cache size in bytes */
  maxSize: number;
  /** Default TTL in milliseconds */
  defaultTTL: number;
  /** Enable LRU eviction */
  lruEnabled: boolean;
  /** Maximum entries */
  maxEntries: number;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 50 * 1024 * 1024, // 50MB
  defaultTTL: 3600000, // 1 hour
  lruEnabled: true,
  maxEntries: 1000,
};

/**
 * Cache statistics
 */
export interface CacheStats {
  entries: number;
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

/**
 * Intelligent cache for Oracle responses
 */
export class OracleCache {
  private cache: Map<string, CacheEntry<OracleResponse>>;
  private config: CacheConfig;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
  };
  private currentSize: number;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
    this.currentSize = 0;
  }

  /**
   * Generate cache key from request
   */
  generateKey(text: string, depth: string, options: Record<string, unknown> = {}): string {
    const optionsStr = JSON.stringify(options);
    const combined = `${depth}:${optionsStr}:${text}`;
    // Simple hash for key
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `cache-${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get value from cache
   */
  get(key: string): OracleResponse | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expires) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: OracleResponse, ttl?: number): void {
    const size = this.estimateSize(value);
    const effectiveTTL = ttl ?? this.config.defaultTTL;

    // Ensure space is available
    this.ensureSpace(size);

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Check entry limit
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    const entry: CacheEntry<OracleResponse> = {
      value,
      expires: Date.now() + effectiveTTL,
      accessCount: 1,
      lastAccess: Date.now(),
      size,
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.currentSize -= entry.size;
    return this.cache.delete(key);
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expires) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      entries: this.cache.size,
      size: this.currentSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      evictions: this.stats.evictions,
    };
  }

  /**
   * Clean expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get all valid keys
   */
  keys(): string[] {
    this.cleanup();
    return Array.from(this.cache.keys());
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: OracleResponse): number {
    // Rough estimation based on JSON string length
    return JSON.stringify(value).length * 2; // UTF-16
  }

  /**
   * Ensure space is available
   */
  private ensureSpace(requiredSize: number): void {
    while (
      this.currentSize + requiredSize > this.config.maxSize &&
      this.cache.size > 0
    ) {
      if (this.config.lruEnabled) {
        this.evictLRU();
      } else {
        this.evictOldest();
      }
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * Evict oldest entry by creation time
   */
  private evictOldest(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.delete(firstKey);
      this.stats.evictions++;
    }
  }

  /**
   * Warm up cache with precomputed results
   */
  warmup(entries: Array<{ key: string; value: OracleResponse; ttl?: number }>): void {
    for (const { key, value, ttl } of entries) {
      this.set(key, value, ttl);
    }
  }

  /**
   * Export cache for persistence
   */
  export(): Array<{ key: string; entry: CacheEntry<OracleResponse> }> {
    this.cleanup();
    const result: Array<{ key: string; entry: CacheEntry<OracleResponse> }> = [];

    for (const [key, entry] of this.cache.entries()) {
      result.push({ key, entry });
    }

    return result;
  }

  /**
   * Import cache from persisted data
   */
  import(data: Array<{ key: string; entry: CacheEntry<OracleResponse> }>): void {
    const now = Date.now();

    for (const { key, entry } of data) {
      // Skip expired entries
      if (entry.expires <= now) continue;

      // Update size and add to cache
      this.cache.set(key, entry);
      this.currentSize += entry.size;
    }
  }
}

/**
 * Create cache instance
 */
export function createCache(config?: Partial<CacheConfig>): OracleCache {
  return new OracleCache(config);
}
