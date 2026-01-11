/**
 * @fileoverview OMEGA Performance - Type Definitions
 * @module @omega/performance/types
 *
 * Performance measurement types.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TIMING TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Timer result.
 */
export interface TimerResult {
  readonly name: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Timer options.
 */
export interface TimerOptions {
  readonly name?: string;
  readonly metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BENCHMARK TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Benchmark result.
 */
export interface BenchmarkResult {
  readonly name: string;
  readonly iterations: number;
  readonly totalTime: number;
  readonly meanTime: number;
  readonly minTime: number;
  readonly maxTime: number;
  readonly stdDev: number;
  readonly opsPerSecond: number;
  readonly percentiles: BenchmarkPercentiles;
}

/**
 * Benchmark percentiles.
 */
export interface BenchmarkPercentiles {
  readonly p50: number;
  readonly p75: number;
  readonly p90: number;
  readonly p95: number;
  readonly p99: number;
}

/**
 * Benchmark options.
 */
export interface BenchmarkOptions {
  readonly iterations?: number;
  readonly warmupIterations?: number;
  readonly name?: string;
}

/**
 * Benchmark comparison.
 */
export interface BenchmarkComparison {
  readonly baseline: BenchmarkResult;
  readonly current: BenchmarkResult;
  readonly speedup: number;
  readonly slower: boolean;
  readonly percentChange: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Statistics for a series of measurements.
 */
export interface Statistics {
  readonly count: number;
  readonly sum: number;
  readonly mean: number;
  readonly min: number;
  readonly max: number;
  readonly stdDev: number;
  readonly variance: number;
  readonly percentiles: BenchmarkPercentiles;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cache entry.
 */
export interface CacheEntry<T> {
  readonly value: T;
  readonly createdAt: number;
  readonly accessedAt: number;
  readonly hits: number;
}

/**
 * Cache statistics.
 */
export interface CacheStats {
  readonly size: number;
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly evictions: number;
}

/**
 * Cache options.
 */
export interface CacheOptions {
  readonly maxSize?: number;
  readonly ttlMs?: number;
  readonly onEvict?: (key: string, value: unknown) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POOL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Object pool options.
 */
export interface PoolOptions<T> {
  readonly create: () => T;
  readonly reset?: (item: T) => void;
  readonly maxSize?: number;
  readonly initialSize?: number;
}

/**
 * Pool statistics.
 */
export interface PoolStats {
  readonly size: number;
  readonly available: number;
  readonly inUse: number;
  readonly created: number;
  readonly reused: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAZY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lazy value wrapper.
 */
export interface Lazy<T> {
  readonly get: () => T;
  readonly isEvaluated: () => boolean;
  readonly reset: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Profile entry.
 */
export interface ProfileEntry {
  readonly name: string;
  readonly calls: number;
  readonly totalTime: number;
  readonly avgTime: number;
  readonly minTime: number;
  readonly maxTime: number;
}

/**
 * Profile report.
 */
export interface ProfileReport {
  readonly entries: readonly ProfileEntry[];
  readonly totalTime: number;
  readonly startTime: number;
  readonly endTime: number;
}
