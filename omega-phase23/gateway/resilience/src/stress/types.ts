/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Stress Engine - Types
 * 
 * Phase 23 - Sprint 23.3
 * 
 * Types for deterministic stress testing and performance measurement.
 * 
 * INVARIANTS:
 * - INV-STRESS-01: Hash Stability - N runs, same seed ⇒ same chronicle hash
 * - INV-STRESS-02: Latency Bound - P99 < 100ms under load
 * - INV-STRESS-03: Memory Bound - heap < 512MB under max load
 * - INV-STRESS-04: Throughput Floor - > 1000 req/s maintained
 * - INV-STRESS-05: Zero Drift - variance(hash_per_run) = 0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Request count */
export type RequestCount = Brand<number, 'RequestCount'>;

/** Requests per second */
export type RequestsPerSecond = Brand<number, 'RequestsPerSecond'>;

/** Latency in milliseconds */
export type LatencyMs = Brand<number, 'LatencyMs'>;

/** Memory in bytes */
export type MemoryBytes = Brand<number, 'MemoryBytes'>;

/** Stress seed for deterministic runs */
export type StressSeed = Brand<number, 'StressSeed'>;

/** Run identifier */
export type RunId = Brand<string, 'RunId'>;

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD PROFILE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Load profile patterns
 */
export const LoadPattern = {
  /** Constant load throughout */
  CONSTANT: 'CONSTANT',
  /** Linear ramp up */
  LINEAR_RAMP: 'LINEAR_RAMP',
  /** Exponential increase */
  EXPONENTIAL: 'EXPONENTIAL',
  /** Step function */
  STEP: 'STEP',
  /** Spike pattern */
  SPIKE: 'SPIKE',
  /** Wave/sinusoidal */
  WAVE: 'WAVE',
  /** Random (deterministic with seed) */
  CHAOS: 'CHAOS',
} as const;

export type LoadPattern = typeof LoadPattern[keyof typeof LoadPattern];

/**
 * Load profile definition
 */
export interface LoadProfile {
  /** Profile pattern */
  readonly pattern: LoadPattern;
  /** Initial load (requests per second) */
  readonly initialRps: RequestsPerSecond;
  /** Maximum load (requests per second) */
  readonly maxRps: RequestsPerSecond;
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** Ramp time for LINEAR_RAMP (ms) */
  readonly rampTimeMs?: number;
  /** Step interval for STEP pattern (ms) */
  readonly stepIntervalMs?: number;
  /** Spike duration for SPIKE pattern (ms) */
  readonly spikeDurationMs?: number;
  /** Wave period for WAVE pattern (ms) */
  readonly wavePeriodMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Synthetic request for stress testing
 */
export interface StressRequest {
  /** Unique request ID */
  readonly id: string;
  /** Request sequence number */
  readonly sequenceNumber: number;
  /** Timestamp when scheduled */
  readonly scheduledAt: number;
  /** Request payload */
  readonly payload: unknown;
  /** Seed used to generate this request */
  readonly seed: StressSeed;
}

/**
 * Response from processing a stress request
 */
export interface StressResponse {
  /** Request ID */
  readonly requestId: string;
  /** Whether request succeeded */
  readonly success: boolean;
  /** Error message if failed */
  readonly error?: string;
  /** Processing latency (ms) */
  readonly latencyMs: LatencyMs;
  /** Timestamp when started */
  readonly startedAt: number;
  /** Timestamp when completed */
  readonly completedAt: number;
  /** Response hash (for determinism verification) */
  readonly responseHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Latency percentiles
 */
export interface LatencyPercentiles {
  readonly p50: LatencyMs;
  readonly p75: LatencyMs;
  readonly p90: LatencyMs;
  readonly p95: LatencyMs;
  readonly p99: LatencyMs;
  readonly p999: LatencyMs;
  readonly min: LatencyMs;
  readonly max: LatencyMs;
  readonly mean: LatencyMs;
  readonly stdDev: LatencyMs;
}

/**
 * Throughput metrics
 */
export interface ThroughputMetrics {
  /** Total requests processed */
  readonly totalRequests: RequestCount;
  /** Successful requests */
  readonly successfulRequests: RequestCount;
  /** Failed requests */
  readonly failedRequests: RequestCount;
  /** Requests per second (actual) */
  readonly actualRps: RequestsPerSecond;
  /** Target requests per second */
  readonly targetRps: RequestsPerSecond;
  /** Success rate (0-1) */
  readonly successRate: number;
}

/**
 * Memory metrics
 */
export interface MemoryMetrics {
  /** Heap used at start */
  readonly heapUsedStart: MemoryBytes;
  /** Heap used at end */
  readonly heapUsedEnd: MemoryBytes;
  /** Peak heap usage */
  readonly heapPeak: MemoryBytes;
  /** External memory */
  readonly external: MemoryBytes;
  /** Array buffers */
  readonly arrayBuffers: MemoryBytes;
}

/**
 * Complete metrics snapshot
 */
export interface MetricsSnapshot {
  readonly timestamp: number;
  readonly latency: LatencyPercentiles;
  readonly throughput: ThroughputMetrics;
  readonly memory: MemoryMetrics;
  /** Determinism hash for this snapshot */
  readonly deterministicHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for a stress run
 */
export interface StressRunConfig {
  /** Run identifier */
  readonly runId: RunId;
  /** Seed for deterministic generation */
  readonly seed: StressSeed;
  /** Load profile */
  readonly profile: LoadProfile;
  /** Number of concurrent workers */
  readonly workers: number;
  /** Request generator function */
  readonly generator: RequestGenerator;
  /** Request handler function */
  readonly handler: RequestHandler;
  /** Warmup duration (ms) */
  readonly warmupMs: number;
  /** Cooldown duration (ms) */
  readonly cooldownMs: number;
}

/**
 * Request generator function type
 */
export type RequestGenerator = (sequenceNumber: number, seed: StressSeed) => StressRequest;

/**
 * Request handler function type
 */
export type RequestHandler = (request: StressRequest) => Promise<StressResponse>;

/**
 * Result of a stress run
 */
export interface StressRunResult {
  /** Run configuration */
  readonly config: StressRunConfig;
  /** Run start time */
  readonly startedAt: number;
  /** Run end time */
  readonly completedAt: number;
  /** Total duration (ms) */
  readonly durationMs: number;
  /** All responses */
  readonly responses: ReadonlyArray<StressResponse>;
  /** Aggregated metrics */
  readonly metrics: MetricsSnapshot;
  /** Per-interval snapshots */
  readonly snapshots: ReadonlyArray<MetricsSnapshot>;
  /** Determinism verification */
  readonly deterministicHash: string;
  /** Whether run passed all thresholds */
  readonly passed: boolean;
  /** Threshold violations */
  readonly violations: ReadonlyArray<ThresholdViolation>;
}

/**
 * Threshold violation
 */
export interface ThresholdViolation {
  readonly metric: string;
  readonly threshold: number;
  readonly actual: number;
  readonly severity: 'WARNING' | 'ERROR' | 'CRITICAL';
}

// ═══════════════════════════════════════════════════════════════════════════════
// THRESHOLD TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Threshold configuration
 */
export interface StressThresholds {
  /** Maximum P99 latency (ms) */
  readonly maxP99LatencyMs: number;
  /** Maximum P95 latency (ms) */
  readonly maxP95LatencyMs: number;
  /** Minimum success rate (0-1) */
  readonly minSuccessRate: number;
  /** Minimum throughput (requests per second) */
  readonly minThroughputRps: number;
  /** Maximum memory (bytes) */
  readonly maxMemoryBytes: number;
  /** Maximum error rate (0-1) */
  readonly maxErrorRate: number;
}

/**
 * Default thresholds for OMEGA
 */
export const OMEGA_THRESHOLDS: StressThresholds = {
  maxP99LatencyMs: 100,
  maxP95LatencyMs: 50,
  minSuccessRate: 0.99,
  minThroughputRps: 1000,
  maxMemoryBytes: 512 * 1024 * 1024, // 512MB
  maxErrorRate: 0.01,
};

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function requestCount(value: number): RequestCount {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('RequestCount must be a non-negative integer');
  }
  return value as RequestCount;
}

export function requestsPerSecond(value: number): RequestsPerSecond {
  if (value < 0) {
    throw new Error('RequestsPerSecond must be non-negative');
  }
  return value as RequestsPerSecond;
}

export function latencyMs(value: number): LatencyMs {
  if (value < 0) {
    throw new Error('LatencyMs must be non-negative');
  }
  return value as LatencyMs;
}

export function memoryBytes(value: number): MemoryBytes {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('MemoryBytes must be a non-negative integer');
  }
  return value as MemoryBytes;
}

export function stressSeed(value: number): StressSeed {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('StressSeed must be a non-negative integer');
  }
  return value as StressSeed;
}

export function runId(value: string): RunId {
  if (!value) {
    throw new Error('RunId cannot be empty');
  }
  return value as RunId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_PATTERNS = Object.values(LoadPattern);
