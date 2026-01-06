/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Stress Engine - Runner
 * 
 * Phase 23 - Sprint 23.3
 * 
 * Executes stress tests deterministically.
 * Collects metrics and verifies determinism.
 * 
 * INVARIANT: INV-STRESS-01 - same seed ⇒ same chronicle hash
 * INVARIANT: INV-STRESS-05 - Zero Drift
 */

import {
  StressRunConfig,
  StressRunResult,
  StressRequest,
  StressResponse,
  MetricsSnapshot,
  LatencyPercentiles,
  ThroughputMetrics,
  MemoryMetrics,
  ThresholdViolation,
  StressThresholds,
  OMEGA_THRESHOLDS,
  LoadProfile,
  LoadPattern,
  latencyMs,
  requestCount,
  requestsPerSecond,
  memoryBytes,
  stressSeed,
  runId,
  StressSeed,
  LatencyMs,
  RunId,
  RequestsPerSecond,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC RANDOM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mulberry32 PRNG for deterministic randomness
 */
class DeterministicRandom {
  private state: number;

  constructor(seed: StressSeed) {
    this.state = seed;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD PROFILE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate load at a given time based on profile
 */
export function calculateLoad(profile: LoadProfile, elapsedMs: number, random?: DeterministicRandom): RequestsPerSecond {
  const progress = Math.min(1, elapsedMs / profile.durationMs);
  const range = profile.maxRps - profile.initialRps;

  switch (profile.pattern) {
    case LoadPattern.CONSTANT:
      return profile.initialRps;

    case LoadPattern.LINEAR_RAMP: {
      const rampProgress = profile.rampTimeMs 
        ? Math.min(1, elapsedMs / profile.rampTimeMs)
        : progress;
      return requestsPerSecond(profile.initialRps + range * rampProgress);
    }

    case LoadPattern.EXPONENTIAL:
      return requestsPerSecond(profile.initialRps * Math.pow(profile.maxRps / profile.initialRps, progress));

    case LoadPattern.STEP: {
      const stepInterval = profile.stepIntervalMs ?? 1000;
      const steps = Math.floor(elapsedMs / stepInterval);
      const totalSteps = Math.floor(profile.durationMs / stepInterval);
      const stepProgress = totalSteps > 0 ? steps / totalSteps : 0;
      return requestsPerSecond(profile.initialRps + range * stepProgress);
    }

    case LoadPattern.SPIKE: {
      const spikeDuration = profile.spikeDurationMs ?? 1000;
      const midpoint = profile.durationMs / 2;
      if (elapsedMs >= midpoint && elapsedMs <= midpoint + spikeDuration) {
        return profile.maxRps;
      }
      return profile.initialRps;
    }

    case LoadPattern.WAVE: {
      const period = profile.wavePeriodMs ?? 10000;
      const phase = (2 * Math.PI * elapsedMs) / period;
      const waveFactor = (Math.sin(phase) + 1) / 2;
      return requestsPerSecond(profile.initialRps + range * waveFactor);
    }

    case LoadPattern.CHAOS:
      if (random) {
        return requestsPerSecond(profile.initialRps + range * random.next());
      }
      return profile.initialRps;

    default:
      return profile.initialRps;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate latency percentiles from responses
 */
export function calculateLatencyPercentiles(responses: StressResponse[]): LatencyPercentiles {
  if (responses.length === 0) {
    return {
      p50: latencyMs(0),
      p75: latencyMs(0),
      p90: latencyMs(0),
      p95: latencyMs(0),
      p99: latencyMs(0),
      p999: latencyMs(0),
      min: latencyMs(0),
      max: latencyMs(0),
      mean: latencyMs(0),
      stdDev: latencyMs(0),
    };
  }

  const latencies = responses.map(r => r.latencyMs).sort((a, b) => a - b);
  const n = latencies.length;

  const percentile = (p: number): LatencyMs => {
    const index = Math.ceil((p / 100) * n) - 1;
    return latencies[Math.max(0, Math.min(index, n - 1))]!;
  };

  const sum = latencies.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = latencies.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;

  return {
    p50: percentile(50),
    p75: percentile(75),
    p90: percentile(90),
    p95: percentile(95),
    p99: percentile(99),
    p999: percentile(99.9),
    min: latencies[0]!,
    max: latencies[n - 1]!,
    mean: latencyMs(mean),
    stdDev: latencyMs(Math.sqrt(variance)),
  };
}

/**
 * Calculate throughput metrics
 */
export function calculateThroughputMetrics(
  responses: StressResponse[],
  durationMs: number,
  targetRps: RequestsPerSecond
): ThroughputMetrics {
  const successful = responses.filter(r => r.success).length;
  const failed = responses.length - successful;
  const actualRps = durationMs > 0 ? (responses.length / durationMs) * 1000 : 0;

  return {
    totalRequests: requestCount(responses.length),
    successfulRequests: requestCount(successful),
    failedRequests: requestCount(failed),
    actualRps: requestsPerSecond(actualRps),
    targetRps,
    successRate: responses.length > 0 ? successful / responses.length : 1,
  };
}

/**
 * Get memory metrics
 */
export function getMemoryMetrics(startHeap: number): MemoryMetrics {
  // In Node.js, we'd use process.memoryUsage()
  // For browser/testing, we simulate
  const currentHeap = typeof process !== 'undefined' && process.memoryUsage
    ? process.memoryUsage().heapUsed
    : startHeap + Math.random() * 1024 * 1024;

  return {
    heapUsedStart: memoryBytes(startHeap),
    heapUsedEnd: memoryBytes(Math.round(currentHeap)),
    heapPeak: memoryBytes(Math.round(Math.max(startHeap, currentHeap) * 1.1)),
    external: memoryBytes(0),
    arrayBuffers: memoryBytes(0),
  };
}

/**
 * Calculate deterministic hash from responses
 */
export function calculateDeterministicHash(responses: StressResponse[]): string {
  // Simple deterministic hash of all response hashes
  let hash = 0;
  for (const response of responses) {
    for (let i = 0; i < response.responseHash.length; i++) {
      const char = response.responseHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
  }
  return `0x${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRESS RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Stress Runner - executes stress tests
 */
export class StressRunner {
  private readonly config: StressRunConfig;
  private readonly thresholds: StressThresholds;
  private readonly random: DeterministicRandom;
  private readonly responses: StressResponse[] = [];
  private readonly snapshots: MetricsSnapshot[] = [];
  private startTime: number = 0;
  private startHeap: number = 0;

  constructor(config: StressRunConfig, thresholds: StressThresholds = OMEGA_THRESHOLDS) {
    this.config = config;
    this.thresholds = thresholds;
    this.random = new DeterministicRandom(config.seed);
  }

  /**
   * Execute the stress run
   */
  async run(): Promise<StressRunResult> {
    this.startTime = Date.now();
    this.startHeap = typeof process !== 'undefined' && process.memoryUsage
      ? process.memoryUsage().heapUsed
      : 50 * 1024 * 1024;

    // Generate all requests upfront for determinism
    const requests = this.generateRequests();

    // Execute requests
    await this.executeRequests(requests);

    // Calculate final metrics
    const endTime = Date.now();
    const durationMs = endTime - this.startTime;
    const metrics = this.createMetricsSnapshot(durationMs);

    // Check thresholds
    const violations = this.checkThresholds(metrics);

    return {
      config: this.config,
      startedAt: this.startTime,
      completedAt: endTime,
      durationMs,
      responses: [...this.responses],
      metrics,
      snapshots: [...this.snapshots],
      deterministicHash: calculateDeterministicHash(this.responses),
      passed: violations.filter(v => v.severity === 'CRITICAL').length === 0,
      violations,
    };
  }

  /**
   * Generate all requests upfront
   */
  private generateRequests(): StressRequest[] {
    const requests: StressRequest[] = [];
    const profile = this.config.profile;
    
    // Calculate total requests based on profile
    let totalRequests = 0;
    const intervalMs = 100; // Generate in 100ms intervals
    
    for (let elapsed = 0; elapsed < profile.durationMs; elapsed += intervalMs) {
      const load = calculateLoad(profile, elapsed, this.random);
      totalRequests += Math.ceil(load * (intervalMs / 1000));
    }

    // Generate requests
    for (let i = 0; i < totalRequests; i++) {
      requests.push(this.config.generator(i, this.config.seed));
    }

    return requests;
  }

  /**
   * Execute requests with controlled concurrency
   */
  private async executeRequests(requests: StressRequest[]): Promise<void> {
    const batchSize = this.config.workers;
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(req => this.executeRequest(req))
      );
      this.responses.push(...results);

      // Take snapshot every 100 requests
      if (this.responses.length % 100 === 0) {
        const elapsed = Date.now() - this.startTime;
        this.snapshots.push(this.createMetricsSnapshot(elapsed));
      }
    }
  }

  /**
   * Execute a single request
   */
  private async executeRequest(request: StressRequest): Promise<StressResponse> {
    const startedAt = Date.now();
    
    try {
      const response = await this.config.handler(request);
      return response;
    } catch (error) {
      const completedAt = Date.now();
      return {
        requestId: request.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: latencyMs(completedAt - startedAt),
        startedAt,
        completedAt,
        responseHash: `ERROR_${request.id}`,
      };
    }
  }

  /**
   * Create a metrics snapshot
   */
  private createMetricsSnapshot(elapsedMs: number): MetricsSnapshot {
    const latency = calculateLatencyPercentiles(this.responses);
    const throughput = calculateThroughputMetrics(
      this.responses,
      elapsedMs,
      this.config.profile.maxRps
    );
    const memory = getMemoryMetrics(this.startHeap);

    return {
      timestamp: Date.now(),
      latency,
      throughput,
      memory,
      deterministicHash: calculateDeterministicHash(this.responses),
    };
  }

  /**
   * Check thresholds and return violations
   */
  private checkThresholds(metrics: MetricsSnapshot): ThresholdViolation[] {
    const violations: ThresholdViolation[] = [];

    // P99 Latency
    if (metrics.latency.p99 > this.thresholds.maxP99LatencyMs) {
      violations.push({
        metric: 'p99_latency',
        threshold: this.thresholds.maxP99LatencyMs,
        actual: metrics.latency.p99,
        severity: metrics.latency.p99 > this.thresholds.maxP99LatencyMs * 2 ? 'CRITICAL' : 'ERROR',
      });
    }

    // P95 Latency
    if (metrics.latency.p95 > this.thresholds.maxP95LatencyMs) {
      violations.push({
        metric: 'p95_latency',
        threshold: this.thresholds.maxP95LatencyMs,
        actual: metrics.latency.p95,
        severity: 'WARNING',
      });
    }

    // Success Rate
    if (metrics.throughput.successRate < this.thresholds.minSuccessRate) {
      violations.push({
        metric: 'success_rate',
        threshold: this.thresholds.minSuccessRate,
        actual: metrics.throughput.successRate,
        severity: metrics.throughput.successRate < 0.9 ? 'CRITICAL' : 'ERROR',
      });
    }

    // Throughput
    if (metrics.throughput.actualRps < this.thresholds.minThroughputRps) {
      violations.push({
        metric: 'throughput',
        threshold: this.thresholds.minThroughputRps,
        actual: metrics.throughput.actualRps,
        severity: 'WARNING',
      });
    }

    // Memory
    if (metrics.memory.heapPeak > this.thresholds.maxMemoryBytes) {
      violations.push({
        metric: 'memory',
        threshold: this.thresholds.maxMemoryBytes,
        actual: metrics.memory.heapPeak,
        severity: 'ERROR',
      });
    }

    return violations;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a stress runner
 */
export function createStressRunner(
  config: StressRunConfig,
  thresholds?: StressThresholds
): StressRunner {
  return new StressRunner(config, thresholds);
}

/**
 * Quick stress test helper
 */
export async function runStressTest(
  config: Partial<StressRunConfig> & { 
    profile: LoadProfile;
    handler: StressRunConfig['handler'];
  }
): Promise<StressRunResult> {
  const fullConfig: StressRunConfig = {
    runId: config.runId ?? runId(`STRESS_${Date.now()}`),
    seed: config.seed ?? stressSeed(12345),
    profile: config.profile,
    workers: config.workers ?? 10,
    generator: config.generator ?? defaultGenerator,
    handler: config.handler,
    warmupMs: config.warmupMs ?? 0,
    cooldownMs: config.cooldownMs ?? 0,
  };

  const runner = new StressRunner(fullConfig);
  return runner.run();
}

/**
 * Default request generator
 */
export const defaultGenerator = (sequenceNumber: number, seed: StressSeed): StressRequest => ({
  id: `REQ_${seed}_${sequenceNumber}`,
  sequenceNumber,
  scheduledAt: Date.now(),
  payload: { sequence: sequenceNumber, seed },
  seed,
});

/**
 * Create a load profile
 */
export function createLoadProfile(
  pattern: LoadPattern,
  initialRps: number,
  maxRps: number,
  durationMs: number,
  options?: Partial<LoadProfile>
): LoadProfile {
  return {
    pattern,
    initialRps: requestsPerSecond(initialRps),
    maxRps: requestsPerSecond(maxRps),
    durationMs,
    ...options,
  };
}
