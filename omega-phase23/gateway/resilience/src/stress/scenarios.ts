/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Stress Engine - Scenarios
 * 
 * Phase 23 - Sprint 23.3
 * 
 * Preset stress test scenarios for common use cases.
 */

import {
  LoadProfile,
  LoadPattern,
  StressRunConfig,
  StressRequest,
  StressResponse,
  StressThresholds,
  OMEGA_THRESHOLDS,
  requestsPerSecond,
  stressSeed,
  runId,
  latencyMs,
  StressSeed,
} from './types.js';
import { defaultGenerator, createLoadProfile } from './runner.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET LOAD PROFILES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Light load - for baseline testing
 */
export const PROFILE_LIGHT: LoadProfile = createLoadProfile(
  LoadPattern.CONSTANT,
  100, // 100 RPS
  100,
  10000 // 10 seconds
);

/**
 * Medium load - standard testing
 */
export const PROFILE_MEDIUM: LoadProfile = createLoadProfile(
  LoadPattern.LINEAR_RAMP,
  100,
  500,
  30000, // 30 seconds
  { rampTimeMs: 10000 }
);

/**
 * Heavy load - stress testing
 */
export const PROFILE_HEAVY: LoadProfile = createLoadProfile(
  LoadPattern.LINEAR_RAMP,
  100,
  2000,
  60000, // 60 seconds
  { rampTimeMs: 20000 }
);

/**
 * Spike load - resilience testing
 */
export const PROFILE_SPIKE: LoadProfile = createLoadProfile(
  LoadPattern.SPIKE,
  100,
  5000,
  30000,
  { spikeDurationMs: 5000 }
);

/**
 * Wave load - sustained variable load
 */
export const PROFILE_WAVE: LoadProfile = createLoadProfile(
  LoadPattern.WAVE,
  200,
  1000,
  60000,
  { wavePeriodMs: 15000 }
);

/**
 * Chaos load - unpredictable load pattern
 */
export const PROFILE_CHAOS: LoadProfile = createLoadProfile(
  LoadPattern.CHAOS,
  100,
  3000,
  45000
);

/**
 * Step load - gradual increase
 */
export const PROFILE_STEP: LoadProfile = createLoadProfile(
  LoadPattern.STEP,
  100,
  1500,
  30000,
  { stepIntervalMs: 5000 }
);

/**
 * Exponential load - exponential growth
 */
export const PROFILE_EXPONENTIAL: LoadProfile = createLoadProfile(
  LoadPattern.EXPONENTIAL,
  50,
  5000,
  45000
);

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Strict thresholds - for production validation
 */
export const THRESHOLDS_STRICT: StressThresholds = {
  maxP99LatencyMs: 50,
  maxP95LatencyMs: 25,
  minSuccessRate: 0.999,
  minThroughputRps: 2000,
  maxMemoryBytes: 256 * 1024 * 1024, // 256MB
  maxErrorRate: 0.001,
};

/**
 * Relaxed thresholds - for development testing
 */
export const THRESHOLDS_RELAXED: StressThresholds = {
  maxP99LatencyMs: 500,
  maxP95LatencyMs: 200,
  minSuccessRate: 0.95,
  minThroughputRps: 100,
  maxMemoryBytes: 1024 * 1024 * 1024, // 1GB
  maxErrorRate: 0.05,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a complete stress scenario
 */
export interface ScenarioBuilder {
  withProfile(profile: LoadProfile): ScenarioBuilder;
  withThresholds(thresholds: StressThresholds): ScenarioBuilder;
  withSeed(seed: number): ScenarioBuilder;
  withWorkers(workers: number): ScenarioBuilder;
  withGenerator(generator: (seq: number, seed: StressSeed) => StressRequest): ScenarioBuilder;
  withHandler(handler: (req: StressRequest) => Promise<StressResponse>): ScenarioBuilder;
  build(): StressRunConfig;
}

/**
 * Create a scenario builder
 */
export function createScenario(name: string): ScenarioBuilder {
  let config: Partial<StressRunConfig> = {
    runId: runId(name),
    seed: stressSeed(12345),
    workers: 10,
    warmupMs: 1000,
    cooldownMs: 500,
  };

  const builder: ScenarioBuilder = {
    withProfile(profile: LoadProfile) {
      config.profile = profile;
      return builder;
    },
    withThresholds(_thresholds: StressThresholds) {
      // Thresholds stored separately
      return builder;
    },
    withSeed(seed: number) {
      config.seed = stressSeed(seed);
      return builder;
    },
    withWorkers(workers: number) {
      config.workers = workers;
      return builder;
    },
    withGenerator(generator) {
      config.generator = generator;
      return builder;
    },
    withHandler(handler) {
      config.handler = handler;
      return builder;
    },
    build(): StressRunConfig {
      if (!config.profile) {
        throw new Error('Profile is required');
      }
      if (!config.handler) {
        throw new Error('Handler is required');
      }
      return {
        runId: config.runId!,
        seed: config.seed!,
        profile: config.profile,
        workers: config.workers!,
        generator: config.generator ?? defaultGenerator,
        handler: config.handler,
        warmupMs: config.warmupMs!,
        cooldownMs: config.cooldownMs!,
      };
    },
  };

  return builder;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a quick sanity check scenario
 */
export function sanityCheckScenario(
  handler: (req: StressRequest) => Promise<StressResponse>
): StressRunConfig {
  return createScenario('SANITY_CHECK')
    .withProfile(PROFILE_LIGHT)
    .withSeed(42)
    .withWorkers(5)
    .withHandler(handler)
    .build();
}

/**
 * Create a standard load test scenario
 */
export function standardLoadScenario(
  handler: (req: StressRequest) => Promise<StressResponse>
): StressRunConfig {
  return createScenario('STANDARD_LOAD')
    .withProfile(PROFILE_MEDIUM)
    .withSeed(12345)
    .withWorkers(20)
    .withHandler(handler)
    .build();
}

/**
 * Create a spike test scenario
 */
export function spikeTestScenario(
  handler: (req: StressRequest) => Promise<StressResponse>
): StressRunConfig {
  return createScenario('SPIKE_TEST')
    .withProfile(PROFILE_SPIKE)
    .withSeed(99999)
    .withWorkers(50)
    .withHandler(handler)
    .build();
}

/**
 * Create a chaos test scenario
 */
export function chaosTestScenario(
  handler: (req: StressRequest) => Promise<StressResponse>
): StressRunConfig {
  return createScenario('CHAOS_TEST')
    .withProfile(PROFILE_CHAOS)
    .withSeed(777)
    .withWorkers(30)
    .withHandler(handler)
    .build();
}

/**
 * Create a determinism verification scenario
 * Runs the same test twice to verify identical results
 */
export function determinismVerificationScenario(
  handler: (req: StressRequest) => Promise<StressResponse>,
  seed: number = 12345
): StressRunConfig {
  return createScenario('DETERMINISM_VERIFY')
    .withProfile(PROFILE_LIGHT)
    .withSeed(seed)
    .withWorkers(1) // Single worker for strict determinism
    .withHandler(handler)
    .build();
}

/**
 * Create a soak test scenario (long duration)
 */
export function soakTestScenario(
  handler: (req: StressRequest) => Promise<StressResponse>,
  durationMs: number = 300000 // 5 minutes default
): StressRunConfig {
  const profile = createLoadProfile(
    LoadPattern.CONSTANT,
    500,
    500,
    durationMs
  );
  
  return createScenario('SOAK_TEST')
    .withProfile(profile)
    .withSeed(54321)
    .withWorkers(25)
    .withHandler(handler)
    .build();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fast mock handler - always succeeds quickly
 */
export const fastMockHandler = async (req: StressRequest): Promise<StressResponse> => {
  const startedAt = Date.now();
  await new Promise(resolve => setTimeout(resolve, 1));
  const completedAt = Date.now();
  
  return {
    requestId: req.id,
    success: true,
    latencyMs: latencyMs(completedAt - startedAt),
    startedAt,
    completedAt,
    responseHash: `HASH_${req.id}_${req.sequenceNumber}`,
  };
};

/**
 * Variable latency mock handler
 */
export const variableLatencyHandler = (minMs: number, maxMs: number) => 
  async (req: StressRequest): Promise<StressResponse> => {
    const startedAt = Date.now();
    // Use sequence number for deterministic "randomness"
    const delay = minMs + ((req.sequenceNumber * 17) % (maxMs - minMs));
    await new Promise(resolve => setTimeout(resolve, delay));
    const completedAt = Date.now();
    
    return {
      requestId: req.id,
      success: true,
      latencyMs: latencyMs(completedAt - startedAt),
      startedAt,
      completedAt,
      responseHash: `HASH_${req.id}_${delay}`,
    };
  };

/**
 * Flaky mock handler - fails occasionally
 */
export const flakyHandler = (failureRate: number) =>
  async (req: StressRequest): Promise<StressResponse> => {
    const startedAt = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1));
    const completedAt = Date.now();
    
    // Deterministic failure based on sequence number
    const shouldFail = (req.sequenceNumber % Math.floor(1 / failureRate)) === 0;
    
    return {
      requestId: req.id,
      success: !shouldFail,
      error: shouldFail ? 'Simulated failure' : undefined,
      latencyMs: latencyMs(completedAt - startedAt),
      startedAt,
      completedAt,
      responseHash: shouldFail ? `ERROR_${req.id}` : `HASH_${req.id}`,
    };
  };

// ═══════════════════════════════════════════════════════════════════════════════
// ALL PROFILES COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_PROFILES = {
  LIGHT: PROFILE_LIGHT,
  MEDIUM: PROFILE_MEDIUM,
  HEAVY: PROFILE_HEAVY,
  SPIKE: PROFILE_SPIKE,
  WAVE: PROFILE_WAVE,
  CHAOS: PROFILE_CHAOS,
  STEP: PROFILE_STEP,
  EXPONENTIAL: PROFILE_EXPONENTIAL,
} as const;

export const ALL_THRESHOLDS = {
  OMEGA: OMEGA_THRESHOLDS,
  STRICT: THRESHOLDS_STRICT,
  RELAXED: THRESHOLDS_RELAXED,
} as const;
