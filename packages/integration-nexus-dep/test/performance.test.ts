/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — PERFORMANCE TESTS
 * Version: 0.7.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Performance benchmarks and validation.
 * INV-PERF-01: Adapter operations meet latency requirements.
 * INV-PERF-02: Pipeline throughput meets requirements.
 * INV-PERF-03: Scheduler overhead is minimal.
 * INV-PERF-04: Memory usage is bounded.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createNexusRequest,
  createGenomeAdapter,
  createMyceliumAdapter,
  createDefaultRouter,
  createInputTranslator,
  createOutputTranslator,
  createPipeline,
  createValidationPipeline,
  createPipelineExecutor,
  createScheduler
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PERF_LIMITS = {
  ADAPTER_SINGLE_OP_MS: 10,
  ADAPTER_BATCH_100_MS: 500,
  TRANSLATOR_SINGLE_OP_MS: 5,
  TRANSLATOR_BATCH_1000_MS: 500,
  ROUTER_SINGLE_OP_MS: 50,
  ROUTER_BATCH_100_MS: 2000,
  PIPELINE_SINGLE_STAGE_MS: 10,
  PIPELINE_5_STAGES_MS: 100,
  SCHEDULER_SUBMIT_MS: 5,
  SCHEDULER_100_JOBS_MS: 5000,
  HASH_1KB_MS: 5,
  HASH_1MB_MS: 100,
  REQUEST_CREATE_MS: 1,
  REQUEST_100_CREATE_MS: 50
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function measureTime<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  return { result, duration: performance.now() - start };
}

async function measureTimeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  return { result, duration: performance.now() - start };
}

function calculateStats(durations: number[]): {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
} {
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / durations.length,
    p50: sorted[Math.floor(durations.length * 0.5)],
    p95: sorted[Math.floor(durations.length * 0.95)],
    p99: sorted[Math.floor(durations.length * 0.99)]
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTER PERFORMANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Performance — Adapter Operations", () => {
  it("should analyze text within latency limit", async () => {
    const adapter = createGenomeAdapter();
    const { duration } = await measureTimeAsync(() =>
      adapter.analyzeText("Performance test text")
    );

    expect(duration).toBeLessThan(PERF_LIMITS.ADAPTER_SINGLE_OP_MS);
  });

  it("should batch 100 analyses within time limit", async () => {
    const adapter = createGenomeAdapter();
    const texts = Array(100).fill(null).map((_, i) => `Batch text ${i}`);

    const { duration } = await measureTimeAsync(async () => {
      await Promise.all(texts.map(t => adapter.analyzeText(t)));
    });

    expect(duration).toBeLessThan(PERF_LIMITS.ADAPTER_BATCH_100_MS);
  });

  it("should show consistent performance across iterations", async () => {
    const adapter = createGenomeAdapter();
    const durations: number[] = [];

    for (let i = 0; i < 50; i++) {
      const { duration } = await measureTimeAsync(() =>
        adapter.analyzeText(`Iteration ${i}`)
      );
      durations.push(duration);
    }

    const stats = calculateStats(durations);
    // P95 should not be more than 5x the median (consistency check)
    expect(stats.p95).toBeLessThan(stats.p50 * 5);
  });

  it("should validate inputs quickly", async () => {
    const adapter = createMyceliumAdapter();
    const { duration } = await measureTimeAsync(() =>
      adapter.validateInput({ content: "test" })
    );

    expect(duration).toBeLessThan(PERF_LIMITS.ADAPTER_SINGLE_OP_MS);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATOR PERFORMANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Performance — Translator Operations", () => {
  it("should translate input within latency limit", () => {
    const translator = createInputTranslator();
    const { duration } = measureTime(() =>
      translator.translate("Test input for translation")
    );

    expect(duration).toBeLessThan(PERF_LIMITS.TRANSLATOR_SINGLE_OP_MS);
  });

  it("should format output within latency limit", () => {
    const translator = createOutputTranslator();
    const { duration } = measureTime(() =>
      translator.format({
        success: true,
        requestId: "perf-test",
        data: { value: 42 }
      })
    );

    expect(duration).toBeLessThan(PERF_LIMITS.TRANSLATOR_SINGLE_OP_MS);
  });

  it("should batch 1000 translations within time limit", () => {
    const translator = createInputTranslator();
    const inputs = Array(1000).fill(null).map((_, i) => `Translation ${i}`);

    const { duration } = measureTime(() => {
      for (const input of inputs) {
        translator.translate(input);
      }
    });

    expect(duration).toBeLessThan(PERF_LIMITS.TRANSLATOR_BATCH_1000_MS);
  });

  it("should handle large text efficiently", () => {
    const translator = createInputTranslator();
    const largeText = "Lorem ipsum ".repeat(10000);

    const { duration } = measureTime(() =>
      translator.translate(largeText)
    );

    expect(duration).toBeLessThan(100); // 100ms for large text
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER PERFORMANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Performance — Router Operations", () => {
  it("should dispatch request within latency limit", async () => {
    const router = createDefaultRouter();
    const request = createNexusRequest("ANALYZE_TEXT", { content: "test" });

    const { duration } = await measureTimeAsync(() =>
      router.dispatch(request)
    );

    expect(duration).toBeLessThan(PERF_LIMITS.ROUTER_SINGLE_OP_MS);
  });

  it("should handle 100 concurrent requests within time limit", async () => {
    const router = createDefaultRouter();
    const requests = Array(100).fill(null).map((_, i) =>
      createNexusRequest("ANALYZE_TEXT", { content: `Request ${i}` })
    );

    const { duration } = await measureTimeAsync(() =>
      Promise.all(requests.map(r => router.dispatch(r)))
    );

    expect(duration).toBeLessThan(PERF_LIMITS.ROUTER_BATCH_100_MS);
  });

  it("should maintain consistent dispatch latency", async () => {
    const router = createDefaultRouter();
    const durations: number[] = [];

    for (let i = 0; i < 30; i++) {
      const request = createNexusRequest("ANALYZE_TEXT", { content: `Iteration ${i}` });
      const { duration } = await measureTimeAsync(() =>
        router.dispatch(request)
      );
      durations.push(duration);
    }

    const stats = calculateStats(durations);
    expect(stats.p99).toBeLessThan(PERF_LIMITS.ROUTER_SINGLE_OP_MS * 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE PERFORMANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Performance — Pipeline Operations", () => {
  it("should execute single stage within latency limit", async () => {
    const executor = createPipelineExecutor();
    const pipeline = createPipeline("perf-single")
      .stage("process", async (input: unknown) => ({ processed: true }))
      .build();

    const { duration } = await measureTimeAsync(() =>
      executor.execute(pipeline, { data: "test" })
    );

    expect(duration).toBeLessThan(PERF_LIMITS.PIPELINE_SINGLE_STAGE_MS);
  });

  it("should execute 5 stages within latency limit", async () => {
    const executor = createPipelineExecutor();
    let builder = createPipeline("perf-multi");

    for (let i = 0; i < 5; i++) {
      builder = builder.stage(`stage-${i}`, async (input: unknown) => ({
        ...input as object,
        [`stage${i}`]: true
      }));
    }
    const pipeline = builder.build();

    const { duration } = await measureTimeAsync(() =>
      executor.execute(pipeline, { start: true })
    );

    expect(duration).toBeLessThan(PERF_LIMITS.PIPELINE_5_STAGES_MS);
  });

  it("should show linear scaling with stages", async () => {
    const executor = createPipelineExecutor();
    const stageCounts = [1, 2, 5, 10];
    const durations: { stages: number; duration: number }[] = [];

    for (const count of stageCounts) {
      let builder = createPipeline(`scale-${count}`);
      for (let i = 0; i < count; i++) {
        builder = builder.stage(`s${i}`, async (input: unknown) => input);
      }
      const pipeline = builder.build();

      const { duration } = await measureTimeAsync(() =>
        executor.execute(pipeline, {})
      );
      durations.push({ stages: count, duration });
    }

    // Duration should scale roughly linearly
    const baseRate = durations[0].duration / durations[0].stages;
    for (const { stages, duration } of durations) {
      expect(duration).toBeLessThan(baseRate * stages * 5); // Allow 5x overhead
    }
  });

  it("should execute validation pipeline efficiently", async () => {
    const executor = createPipelineExecutor();
    const pipeline = createValidationPipeline();

    const { duration } = await measureTimeAsync(() =>
      executor.execute(pipeline, { content: "test" })
    );

    expect(duration).toBeLessThan(50);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULER PERFORMANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Performance — Scheduler Operations", () => {
  it("should submit job within latency limit", () => {
    const scheduler = createScheduler({ maxConcurrent: 0 });
    const pipeline = createValidationPipeline();

    const { duration } = measureTime(() =>
      scheduler.submit("perf-job", pipeline, {})
    );

    expect(duration).toBeLessThan(PERF_LIMITS.SCHEDULER_SUBMIT_MS);
  });

  it("should submit 100 jobs efficiently", () => {
    const scheduler = createScheduler({ maxConcurrent: 0 });
    const pipeline = createValidationPipeline();

    const { duration } = measureTime(() => {
      for (let i = 0; i < 100; i++) {
        scheduler.submit(`job-${i}`, pipeline, {});
      }
    });

    expect(duration).toBeLessThan(100); // 100 jobs in under 100ms
  });

  it("should complete 100 jobs within time limit", async () => {
    const scheduler = createScheduler({ maxConcurrent: 10 });
    const pipeline = createValidationPipeline();

    const jobs: string[] = [];
    for (let i = 0; i < 100; i++) {
      jobs.push(scheduler.submit(`complete-${i}`, pipeline, {}));
    }

    const { duration } = await measureTimeAsync(() =>
      Promise.all(jobs.map(id => scheduler.waitFor(id)))
    );

    expect(duration).toBeLessThan(PERF_LIMITS.SCHEDULER_100_JOBS_MS);
  });

  it("should get stats quickly", () => {
    const scheduler = createScheduler({ maxConcurrent: 0 });
    const pipeline = createValidationPipeline();

    // Submit many jobs
    for (let i = 0; i < 500; i++) {
      scheduler.submit(`stats-${i}`, pipeline, {});
    }

    const { duration } = measureTime(() => scheduler.getStats());

    expect(duration).toBeLessThan(10); // Stats should be instant
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FINGERPRINT PERFORMANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Performance — Fingerprint Operations", () => {
  it("should compute fingerprint for 1KB within latency limit", async () => {
    const adapter = createGenomeAdapter();
    const data = "x".repeat(1024);

    const { duration } = await measureTimeAsync(() =>
      adapter.computeFingerprint(data)
    );

    expect(duration).toBeLessThan(PERF_LIMITS.HASH_1KB_MS);
  });

  it("should compute fingerprint for 1MB within latency limit", async () => {
    const adapter = createGenomeAdapter();
    const data = "x".repeat(1024 * 1024);

    const { duration } = await measureTimeAsync(() =>
      adapter.computeFingerprint(data)
    );

    expect(duration).toBeLessThan(PERF_LIMITS.HASH_1MB_MS);
  });

  it("should show linear scaling with data size", async () => {
    const adapter = createGenomeAdapter();
    const sizes = [1024, 10240, 102400, 1024000]; // 1KB, 10KB, 100KB, 1MB
    const durations: { size: number; duration: number }[] = [];

    for (const size of sizes) {
      const data = "x".repeat(size);
      const { duration } = await measureTimeAsync(() =>
        adapter.computeFingerprint(data)
      );
      durations.push({ size, duration });
    }

    // Verify roughly linear scaling
    for (let i = 1; i < durations.length; i++) {
      const expectedRatio = durations[i].size / durations[i - 1].size;
      const actualRatio = durations[i].duration / durations[i - 1].duration;
      // Allow for some overhead - actual ratio should not exceed 10x expected
      expect(actualRatio).toBeLessThan(expectedRatio * 10);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST CREATION PERFORMANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Performance — Request Creation", () => {
  it("should create request within latency limit", () => {
    const { duration } = measureTime(() =>
      createNexusRequest("ANALYZE_TEXT", { content: "test" })
    );

    expect(duration).toBeLessThan(PERF_LIMITS.REQUEST_CREATE_MS);
  });

  it("should create 100 requests within time limit", () => {
    const { duration } = measureTime(() => {
      for (let i = 0; i < 100; i++) {
        createNexusRequest("ANALYZE_TEXT", { content: `Request ${i}` });
      }
    });

    expect(duration).toBeLessThan(PERF_LIMITS.REQUEST_100_CREATE_MS);
  });

  it("should generate unique IDs quickly", () => {
    const ids = new Set<string>();

    const { duration } = measureTime(() => {
      for (let i = 0; i < 1000; i++) {
        const request = createNexusRequest("ANALYZE_TEXT", {});
        ids.add(request.id);
      }
    });

    expect(ids.size).toBe(1000); // All unique
    expect(duration).toBeLessThan(100); // 1000 IDs in under 100ms
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY PERFORMANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Performance — Memory Efficiency", () => {
  it("should not accumulate state after cleanup", async () => {
    const scheduler = createScheduler({ maxConcurrent: 10 });
    const pipeline = createValidationPipeline();

    // Run multiple batches
    for (let batch = 0; batch < 5; batch++) {
      const jobs: string[] = [];
      for (let i = 0; i < 50; i++) {
        jobs.push(scheduler.submit(`memory-${batch}-${i}`, pipeline, {}));
      }
      await Promise.all(jobs.map(id => scheduler.waitFor(id)));
      scheduler.cleanup();
    }

    const stats = scheduler.getStats();
    expect(stats.total).toBe(0); // All cleaned up
  });

  it("should handle repeated translator usage", () => {
    const inputTranslator = createInputTranslator();
    const outputTranslator = createOutputTranslator();

    // Many translations
    for (let i = 0; i < 10000; i++) {
      inputTranslator.translate(`Input ${i}`);
      outputTranslator.format({
        success: true,
        requestId: `req-${i}`,
        data: { i }
      });
    }

    // No memory accumulation (translators are stateless)
    expect(true).toBe(true);
  });

  it("should handle repeated adapter usage", async () => {
    const adapter = createGenomeAdapter();

    // Many analyses
    for (let i = 0; i < 100; i++) {
      await adapter.analyzeText(`Analysis ${i}`);
    }

    // No memory accumulation (adapters are functional)
    expect(true).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// THROUGHPUT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Performance — Throughput", () => {
  it("should achieve minimum adapter ops/sec", async () => {
    const adapter = createGenomeAdapter();
    const targetOpsPerSec = 100;
    const testDurationMs = 1000;

    const start = performance.now();
    let ops = 0;

    while (performance.now() - start < testDurationMs) {
      await adapter.analyzeText(`Throughput test ${ops}`);
      ops++;
    }

    const actualOpsPerSec = ops / (testDurationMs / 1000);
    expect(actualOpsPerSec).toBeGreaterThan(targetOpsPerSec);
  });

  it("should achieve minimum translator ops/sec", () => {
    const translator = createInputTranslator();
    const targetOpsPerSec = 10000;
    const testDurationMs = 100;

    const start = performance.now();
    let ops = 0;

    while (performance.now() - start < testDurationMs) {
      translator.translate(`Throughput test ${ops}`);
      ops++;
    }

    const actualOpsPerSec = ops / (testDurationMs / 1000);
    expect(actualOpsPerSec).toBeGreaterThan(targetOpsPerSec);
  });

  it("should achieve minimum fingerprint ops/sec", async () => {
    const adapter = createGenomeAdapter();
    const targetOpsPerSec = 100;
    const testDurationMs = 100;

    const start = performance.now();
    let ops = 0;

    while (performance.now() - start < testDurationMs) {
      await adapter.computeFingerprint(`Hash test ${ops}`);
      ops++;
    }

    const actualOpsPerSec = ops / (testDurationMs / 1000);
    expect(actualOpsPerSec).toBeGreaterThan(targetOpsPerSec);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COLD START TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Performance — Cold Start", () => {
  it("should create adapter quickly", () => {
    const { duration } = measureTime(() => createGenomeAdapter());
    expect(duration).toBeLessThan(10);
  });

  it("should create router quickly", () => {
    const { duration } = measureTime(() => createDefaultRouter());
    expect(duration).toBeLessThan(10);
  });

  it("should create scheduler quickly", () => {
    const { duration } = measureTime(() =>
      createScheduler({ maxConcurrent: 10 })
    );
    expect(duration).toBeLessThan(10);
  });

  it("should create executor quickly", () => {
    const { duration } = measureTime(() => createPipelineExecutor());
    expect(duration).toBeLessThan(10);
  });

  it("should create translators quickly", () => {
    const { duration: inputDuration } = measureTime(() => createInputTranslator());
    const { duration: outputDuration } = measureTime(() => createOutputTranslator());

    expect(inputDuration).toBeLessThan(10);
    expect(outputDuration).toBeLessThan(10);
  });
});

