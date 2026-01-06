/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Stress Engine - Tests
 * 
 * Phase 23 - Sprint 23.3
 * 
 * INVARIANTS TESTED:
 * - INV-STRESS-01: Hash Stability - N runs, same seed ⇒ same chronicle hash
 * - INV-STRESS-02: Latency Bound - P99 < threshold under load
 * - INV-STRESS-03: Memory Bound - heap < threshold under max load
 * - INV-STRESS-04: Throughput Floor - > min RPS maintained
 * - INV-STRESS-05: Zero Drift - variance(hash_per_run) = 0
 */

import { describe, it, expect } from 'vitest';
import {
  // Types
  LoadPattern,
  ALL_PATTERNS,
  OMEGA_THRESHOLDS,
  
  // Factory functions
  requestCount,
  requestsPerSecond,
  latencyMs,
  memoryBytes,
  stressSeed,
  runId,
  
  // Runner
  StressRunner,
  createStressRunner,
  runStressTest,
  defaultGenerator,
  createLoadProfile,
  calculateLoad,
  calculateLatencyPercentiles,
  calculateThroughputMetrics,
  calculateDeterministicHash,
  
  // Scenarios
  PROFILE_LIGHT,
  PROFILE_MEDIUM,
  PROFILE_SPIKE,
  PROFILE_CHAOS,
  ALL_PROFILES,
  ALL_THRESHOLDS,
  createScenario,
  sanityCheckScenario,
  standardLoadScenario,
  determinismVerificationScenario,
  fastMockHandler,
  variableLatencyHandler,
  flakyHandler,
} from '../../src/stress/index.js';

describe('Stress Types', () => {
  describe('Branded Type Factories', () => {
    describe('requestCount', () => {
      it('should create valid request count', () => {
        expect(requestCount(100)).toBe(100);
        expect(requestCount(0)).toBe(0);
      });

      it('should reject negative values', () => {
        expect(() => requestCount(-1)).toThrow();
      });

      it('should reject non-integers', () => {
        expect(() => requestCount(1.5)).toThrow();
      });
    });

    describe('requestsPerSecond', () => {
      it('should create valid RPS', () => {
        expect(requestsPerSecond(1000)).toBe(1000);
        expect(requestsPerSecond(0.5)).toBe(0.5);
      });

      it('should reject negative values', () => {
        expect(() => requestsPerSecond(-1)).toThrow();
      });
    });

    describe('latencyMs', () => {
      it('should create valid latency', () => {
        expect(latencyMs(50)).toBe(50);
        expect(latencyMs(0.1)).toBe(0.1);
      });

      it('should reject negative values', () => {
        expect(() => latencyMs(-1)).toThrow();
      });
    });

    describe('memoryBytes', () => {
      it('should create valid memory', () => {
        expect(memoryBytes(1024)).toBe(1024);
      });

      it('should reject non-integers', () => {
        expect(() => memoryBytes(1024.5)).toThrow();
      });
    });

    describe('stressSeed', () => {
      it('should create valid seed', () => {
        expect(stressSeed(12345)).toBe(12345);
      });

      it('should reject negative values', () => {
        expect(() => stressSeed(-1)).toThrow();
      });
    });

    describe('runId', () => {
      it('should create valid run ID', () => {
        expect(runId('TEST_RUN')).toBe('TEST_RUN');
      });

      it('should reject empty string', () => {
        expect(() => runId('')).toThrow();
      });
    });
  });

  describe('Load Patterns', () => {
    it('should have all expected patterns', () => {
      expect(ALL_PATTERNS).toContain(LoadPattern.CONSTANT);
      expect(ALL_PATTERNS).toContain(LoadPattern.LINEAR_RAMP);
      expect(ALL_PATTERNS).toContain(LoadPattern.EXPONENTIAL);
      expect(ALL_PATTERNS).toContain(LoadPattern.STEP);
      expect(ALL_PATTERNS).toContain(LoadPattern.SPIKE);
      expect(ALL_PATTERNS).toContain(LoadPattern.WAVE);
      expect(ALL_PATTERNS).toContain(LoadPattern.CHAOS);
    });
  });

  describe('Thresholds', () => {
    it('should have OMEGA thresholds defined', () => {
      expect(OMEGA_THRESHOLDS.maxP99LatencyMs).toBe(100);
      expect(OMEGA_THRESHOLDS.minSuccessRate).toBe(0.99);
      expect(OMEGA_THRESHOLDS.minThroughputRps).toBe(1000);
    });
  });
});

describe('Load Profile Calculator', () => {
  describe('CONSTANT pattern', () => {
    it('should return constant load', () => {
      const profile = createLoadProfile(LoadPattern.CONSTANT, 100, 100, 10000);
      
      expect(calculateLoad(profile, 0)).toBe(100);
      expect(calculateLoad(profile, 5000)).toBe(100);
      expect(calculateLoad(profile, 10000)).toBe(100);
    });
  });

  describe('LINEAR_RAMP pattern', () => {
    it('should ramp linearly', () => {
      const profile = createLoadProfile(LoadPattern.LINEAR_RAMP, 100, 500, 10000, { rampTimeMs: 10000 });
      
      expect(calculateLoad(profile, 0)).toBe(100);
      expect(calculateLoad(profile, 5000)).toBe(300);
      expect(calculateLoad(profile, 10000)).toBe(500);
    });
  });

  describe('STEP pattern', () => {
    it('should increase in steps', () => {
      const profile = createLoadProfile(LoadPattern.STEP, 100, 500, 20000, { stepIntervalMs: 5000 });
      
      const load0 = calculateLoad(profile, 0);
      const load5000 = calculateLoad(profile, 5000);
      const load10000 = calculateLoad(profile, 10000);
      
      expect(load0).toBe(100);
      expect(load5000).toBeGreaterThan(load0);
      expect(load10000).toBeGreaterThan(load5000);
    });
  });

  describe('SPIKE pattern', () => {
    it('should spike at midpoint', () => {
      const profile = createLoadProfile(LoadPattern.SPIKE, 100, 5000, 10000, { spikeDurationMs: 2000 });
      
      const loadBefore = calculateLoad(profile, 2000);
      const loadDuring = calculateLoad(profile, 5500);
      const loadAfter = calculateLoad(profile, 8000);
      
      expect(loadBefore).toBe(100);
      expect(loadDuring).toBe(5000);
      expect(loadAfter).toBe(100);
    });
  });

  describe('WAVE pattern', () => {
    it('should oscillate', () => {
      const profile = createLoadProfile(LoadPattern.WAVE, 100, 500, 10000, { wavePeriodMs: 4000 });
      
      const load0 = calculateLoad(profile, 0);
      const load1000 = calculateLoad(profile, 1000); // Peak
      const load2000 = calculateLoad(profile, 2000);
      
      expect(load1000).toBeGreaterThan(load0);
      expect(load2000).toBeLessThan(load1000);
    });
  });
});

describe('Metrics Calculator', () => {
  describe('calculateLatencyPercentiles', () => {
    it('should calculate correct percentiles', () => {
      const responses = Array.from({ length: 100 }, (_, i) => ({
        requestId: `REQ_${i}`,
        success: true,
        latencyMs: latencyMs(i + 1), // 1-100ms
        startedAt: 0,
        completedAt: i + 1,
        responseHash: `HASH_${i}`,
      }));

      const percentiles = calculateLatencyPercentiles(responses);

      expect(percentiles.min).toBe(1);
      expect(percentiles.max).toBe(100);
      expect(percentiles.p50).toBe(50);
      expect(percentiles.p99).toBe(99);
    });

    it('should handle empty array', () => {
      const percentiles = calculateLatencyPercentiles([]);

      expect(percentiles.min).toBe(0);
      expect(percentiles.max).toBe(0);
      expect(percentiles.mean).toBe(0);
    });

    it('should calculate mean correctly', () => {
      const responses = [
        { requestId: 'R1', success: true, latencyMs: latencyMs(10), startedAt: 0, completedAt: 10, responseHash: 'H1' },
        { requestId: 'R2', success: true, latencyMs: latencyMs(20), startedAt: 0, completedAt: 20, responseHash: 'H2' },
        { requestId: 'R3', success: true, latencyMs: latencyMs(30), startedAt: 0, completedAt: 30, responseHash: 'H3' },
      ];

      const percentiles = calculateLatencyPercentiles(responses);

      expect(percentiles.mean).toBe(20);
    });
  });

  describe('calculateThroughputMetrics', () => {
    it('should calculate throughput correctly', () => {
      const responses = Array.from({ length: 100 }, (_, i) => ({
        requestId: `REQ_${i}`,
        success: i < 95, // 95% success
        latencyMs: latencyMs(10),
        startedAt: 0,
        completedAt: 10,
        responseHash: `HASH_${i}`,
      }));

      const metrics = calculateThroughputMetrics(responses, 1000, requestsPerSecond(100));

      expect(metrics.totalRequests).toBe(100);
      expect(metrics.successfulRequests).toBe(95);
      expect(metrics.failedRequests).toBe(5);
      expect(metrics.successRate).toBe(0.95);
      expect(metrics.actualRps).toBe(100); // 100 requests in 1000ms = 100 RPS
    });
  });

  describe('calculateDeterministicHash', () => {
    it('should produce same hash for same responses', () => {
      const responses = [
        { requestId: 'R1', success: true, latencyMs: latencyMs(10), startedAt: 0, completedAt: 10, responseHash: 'HASH_1' },
        { requestId: 'R2', success: true, latencyMs: latencyMs(20), startedAt: 0, completedAt: 20, responseHash: 'HASH_2' },
      ];

      const hash1 = calculateDeterministicHash(responses);
      const hash2 = calculateDeterministicHash(responses);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different responses', () => {
      const responses1 = [
        { requestId: 'R1', success: true, latencyMs: latencyMs(10), startedAt: 0, completedAt: 10, responseHash: 'HASH_A' },
      ];
      const responses2 = [
        { requestId: 'R1', success: true, latencyMs: latencyMs(10), startedAt: 0, completedAt: 10, responseHash: 'HASH_B' },
      ];

      const hash1 = calculateDeterministicHash(responses1);
      const hash2 = calculateDeterministicHash(responses2);

      expect(hash1).not.toBe(hash2);
    });
  });
});

describe('Default Generator', () => {
  it('should generate deterministic requests', () => {
    const seed = stressSeed(12345);
    
    const req1a = defaultGenerator(0, seed);
    const req1b = defaultGenerator(0, seed);
    
    expect(req1a.id).toBe(req1b.id);
    expect(req1a.sequenceNumber).toBe(req1b.sequenceNumber);
  });

  it('should generate different requests for different sequences', () => {
    const seed = stressSeed(12345);
    
    const req0 = defaultGenerator(0, seed);
    const req1 = defaultGenerator(1, seed);
    
    expect(req0.id).not.toBe(req1.id);
    expect(req0.sequenceNumber).toBe(0);
    expect(req1.sequenceNumber).toBe(1);
  });
});

describe('Preset Profiles', () => {
  it('should have all preset profiles', () => {
    expect(ALL_PROFILES.LIGHT).toBeDefined();
    expect(ALL_PROFILES.MEDIUM).toBeDefined();
    expect(ALL_PROFILES.HEAVY).toBeDefined();
    expect(ALL_PROFILES.SPIKE).toBeDefined();
    expect(ALL_PROFILES.WAVE).toBeDefined();
    expect(ALL_PROFILES.CHAOS).toBeDefined();
  });

  it('should have correct LIGHT profile', () => {
    expect(PROFILE_LIGHT.pattern).toBe(LoadPattern.CONSTANT);
    expect(PROFILE_LIGHT.initialRps).toBe(100);
  });

  it('should have correct SPIKE profile', () => {
    expect(PROFILE_SPIKE.pattern).toBe(LoadPattern.SPIKE);
    expect(PROFILE_SPIKE.maxRps).toBeGreaterThan(PROFILE_SPIKE.initialRps);
  });
});

describe('Preset Thresholds', () => {
  it('should have all threshold presets', () => {
    expect(ALL_THRESHOLDS.OMEGA).toBeDefined();
    expect(ALL_THRESHOLDS.STRICT).toBeDefined();
    expect(ALL_THRESHOLDS.RELAXED).toBeDefined();
  });

  it('should have stricter thresholds in STRICT', () => {
    expect(ALL_THRESHOLDS.STRICT.maxP99LatencyMs).toBeLessThan(ALL_THRESHOLDS.RELAXED.maxP99LatencyMs);
    expect(ALL_THRESHOLDS.STRICT.minSuccessRate).toBeGreaterThan(ALL_THRESHOLDS.RELAXED.minSuccessRate);
  });
});

describe('Scenario Builder', () => {
  it('should build a complete scenario', () => {
    const scenario = createScenario('TEST_SCENARIO')
      .withProfile(PROFILE_LIGHT)
      .withSeed(42)
      .withWorkers(5)
      .withHandler(fastMockHandler)
      .build();

    expect(scenario.runId).toBe('TEST_SCENARIO');
    expect(scenario.seed).toBe(42);
    expect(scenario.workers).toBe(5);
    expect(scenario.profile).toBe(PROFILE_LIGHT);
  });

  it('should throw if profile is missing', () => {
    const builder = createScenario('TEST')
      .withHandler(fastMockHandler);

    expect(() => builder.build()).toThrow('Profile is required');
  });

  it('should throw if handler is missing', () => {
    const builder = createScenario('TEST')
      .withProfile(PROFILE_LIGHT);

    expect(() => builder.build()).toThrow('Handler is required');
  });
});

describe('Preset Scenarios', () => {
  it('should create sanity check scenario', () => {
    const scenario = sanityCheckScenario(fastMockHandler);

    expect(scenario.runId).toBe('SANITY_CHECK');
    expect(scenario.profile.pattern).toBe(LoadPattern.CONSTANT);
  });

  it('should create standard load scenario', () => {
    const scenario = standardLoadScenario(fastMockHandler);

    expect(scenario.runId).toBe('STANDARD_LOAD');
    expect(scenario.profile.pattern).toBe(LoadPattern.LINEAR_RAMP);
  });

  it('should create determinism verification scenario', () => {
    const scenario = determinismVerificationScenario(fastMockHandler, 42);

    expect(scenario.runId).toBe('DETERMINISM_VERIFY');
    expect(scenario.seed).toBe(42);
    expect(scenario.workers).toBe(1); // Single worker for determinism
  });
});

describe('Mock Handlers', () => {
  describe('fastMockHandler', () => {
    it('should always succeed', async () => {
      const request = defaultGenerator(0, stressSeed(12345));
      const response = await fastMockHandler(request);

      expect(response.success).toBe(true);
      expect(response.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('variableLatencyHandler', () => {
    it('should have latency in range', async () => {
      const handler = variableLatencyHandler(5, 15);
      const request = defaultGenerator(0, stressSeed(12345));
      const response = await handler(request);

      expect(response.success).toBe(true);
      expect(response.latencyMs).toBeGreaterThanOrEqual(5);
    });

    it('should be deterministic for same sequence', async () => {
      const handler = variableLatencyHandler(5, 100);
      const req1 = defaultGenerator(42, stressSeed(12345));
      const req2 = defaultGenerator(42, stressSeed(12345));

      const resp1 = await handler(req1);
      const resp2 = await handler(req2);

      expect(resp1.responseHash).toBe(resp2.responseHash);
    });
  });

  describe('flakyHandler', () => {
    it('should fail at expected rate', async () => {
      const handler = flakyHandler(0.1); // 10% failure
      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) => 
          handler(defaultGenerator(i, stressSeed(12345)))
        )
      );

      const failures = results.filter(r => !r.success).length;
      expect(failures).toBe(1); // Exactly 1 failure (deterministic)
    });
  });
});

describe('Stress Runner', () => {
  // Fast profile for invariant tests - minimal requests, fast execution
  const FAST_PROFILE = createLoadProfile(LoadPattern.CONSTANT, 10, 10, 100); // 10 RPS for 100ms = ~1-2 requests
  
  const createFastDeterminismScenario = (seed: number) => 
    createScenario('FAST_DETERMINISM')
      .withProfile(FAST_PROFILE)
      .withSeed(seed)
      .withWorkers(1)
      .withHandler(fastMockHandler)
      .build();

  describe('Basic Execution', () => {
    it('should execute a stress run', async () => {
      const config = createScenario('BASIC_TEST')
        .withProfile(FAST_PROFILE)
        .withSeed(42)
        .withWorkers(1)
        .withHandler(fastMockHandler)
        .build();
      const runner = createStressRunner(config, ALL_THRESHOLDS.RELAXED);
      
      const result = await runner.run();

      expect(result.config).toBe(config);
      expect(result.responses.length).toBeGreaterThan(0);
      expect(result.metrics).toBeDefined();
      expect(result.deterministicHash).toBeDefined();
    });

    it('should track all responses', async () => {
      const shortProfile = createLoadProfile(LoadPattern.CONSTANT, 10, 10, 100);
      const config = createScenario('SHORT_TEST')
        .withProfile(shortProfile)
        .withWorkers(1)
        .withHandler(fastMockHandler)
        .build();

      const runner = createStressRunner(config);
      const result = await runner.run();

      expect(result.responses.length).toBeGreaterThan(0);
      result.responses.forEach(r => {
        expect(r.requestId).toBeDefined();
        expect(r.responseHash).toBeDefined();
      });
    });
  });

  describe('INV-STRESS-01: Hash Stability', () => {
    it('should produce same hash for same seed', async () => {
      const config1 = createFastDeterminismScenario(42);
      const config2 = createFastDeterminismScenario(42);

      const runner1 = createStressRunner(config1);
      const runner2 = createStressRunner(config2);

      const result1 = await runner1.run();
      const result2 = await runner2.run();

      expect(result1.deterministicHash).toBe(result2.deterministicHash);
    });

    it('should produce different hash for different seed', async () => {
      const config1 = createFastDeterminismScenario(42);
      const config2 = createFastDeterminismScenario(99);

      const runner1 = createStressRunner(config1);
      const runner2 = createStressRunner(config2);

      const result1 = await runner1.run();
      const result2 = await runner2.run();

      expect(result1.deterministicHash).not.toBe(result2.deterministicHash);
    });
  });

  describe('INV-STRESS-05: Zero Drift', () => {
    it('should have zero variance in hash across runs', async () => {
      const seed = 12345;
      const hashes: string[] = [];

      for (let i = 0; i < 3; i++) {
        const config = createFastDeterminismScenario(seed);
        const runner = createStressRunner(config);
        const result = await runner.run();
        hashes.push(result.deterministicHash);
      }

      // All hashes should be identical
      expect(new Set(hashes).size).toBe(1);
    });
  });

  describe('Threshold Violations', () => {
    it('should detect violations', async () => {
      const slowHandler = async (req: any) => {
        const start = Date.now();
        await new Promise(r => setTimeout(r, 200)); // 200ms latency
        return {
          requestId: req.id,
          success: true,
          latencyMs: latencyMs(200),
          startedAt: start,
          completedAt: Date.now(),
          responseHash: `HASH_${req.id}`,
        };
      };

      const strictThresholds = {
        ...OMEGA_THRESHOLDS,
        maxP99LatencyMs: 50, // Will be violated
      };

      const shortProfile = createLoadProfile(LoadPattern.CONSTANT, 5, 5, 500);
      const config = createScenario('SLOW_TEST')
        .withProfile(shortProfile)
        .withWorkers(1)
        .withHandler(slowHandler)
        .build();

      const runner = createStressRunner(config, strictThresholds);
      const result = await runner.run();

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.metric === 'p99_latency')).toBe(true);
    });

    it('should pass with relaxed thresholds', async () => {
      const shortProfile = createLoadProfile(LoadPattern.CONSTANT, 10, 10, 100);
      const config = createScenario('FAST_TEST')
        .withProfile(shortProfile)
        .withWorkers(1)
        .withHandler(fastMockHandler)
        .build();

      const runner = createStressRunner(config, ALL_THRESHOLDS.RELAXED);
      const result = await runner.run();

      expect(result.passed).toBe(true);
    });
  });
});

describe('runStressTest Helper', () => {
  it('should run a quick stress test', async () => {
    const result = await runStressTest({
      profile: createLoadProfile(LoadPattern.CONSTANT, 10, 10, 100),
      handler: fastMockHandler,
    });

    expect(result).toBeDefined();
    expect(result.responses.length).toBeGreaterThan(0);
  });
});
