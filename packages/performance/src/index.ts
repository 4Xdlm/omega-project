/**
 * @fileoverview OMEGA Performance - Public API
 * @module @omega/performance
 *
 * Performance measurement and optimization utilities.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  TimerResult,
  TimerOptions,
  BenchmarkResult,
  BenchmarkPercentiles,
  BenchmarkOptions,
  BenchmarkComparison,
  Statistics,
  CacheEntry,
  CacheStats,
  CacheOptions,
  PoolOptions,
  PoolStats,
  Lazy,
  ProfileEntry,
  ProfileReport,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TIMER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  now,
  Timer,
  time,
  timeAsync,
  timed,
  sleep,
  timeMultiple,
  Stopwatch,
} from './timer.js';

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  sum,
  mean,
  min,
  max,
  variance,
  stdDev,
  percentile,
  percentiles,
  median,
  calculateStats,
  removeOutliers,
  findOutliers,
  coefficientOfVariation,
  isSignificantlyDifferent,
} from './stats.js';

// ═══════════════════════════════════════════════════════════════════════════════
// BENCHMARK
// ═══════════════════════════════════════════════════════════════════════════════

export {
  benchmark,
  benchmarkAsync,
  compare,
  formatResult,
  formatComparison,
  BenchmarkSuite,
} from './benchmark.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  LRUCache,
  memoize,
  memoizeWith,
  memoizeAsync,
  computed,
} from './cache.js';

// ═══════════════════════════════════════════════════════════════════════════════
// POOL
// ═══════════════════════════════════════════════════════════════════════════════

export {
  ObjectPool,
  lazy,
  lazyAsync,
  throttle,
  debounce,
  RateLimiter,
} from './pool.js';
