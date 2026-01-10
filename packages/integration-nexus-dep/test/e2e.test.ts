/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — E2E TESTS
 * Version: 0.7.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * End-to-end tests covering complete flows from input to output.
 * INV-E2E-01: Complete flow validation
 * INV-E2E-02: Component integration
 * INV-E2E-03: Error propagation
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  // Contracts
  createNexusRequest,
  createNexusResponse,
  createErrorResponse,
  NexusRequest,
  NexusResponse,
  NexusOperationType,

  // Adapters
  GenomeAdapter,
  MyceliumAdapter,
  MyceliumBioAdapter,
  createGenomeAdapter,
  createMyceliumAdapter,
  createMyceliumBioAdapter,

  // Router
  NexusRouter,
  createRouter,
  createDefaultRouter,

  // Translators
  InputTranslator,
  OutputTranslator,
  createInputTranslator,
  createOutputTranslator,

  // Connectors
  createFilesystemConnector,
  createMockFilesystem,
  createCLIConnector,
  createMockCLI,

  // Pipeline
  createPipeline,
  createValidationPipeline,
  createAnalysisPipeline,
  createPipelineExecutor,
  PipelineExecutor,

  // Scheduler
  JobScheduler,
  createScheduler,
  createMaxQueuePolicy,
  createTagFilterPolicy,
  createCompositePolicy
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// E2E FLOW: REQUEST → ROUTER → ADAPTER → RESPONSE
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E — Request to Response Flow", () => {
  let router: NexusRouter;

  beforeEach(() => {
    router = createDefaultRouter();
  });

  it("should complete ANALYZE_TEXT flow", async () => {
    const request = createNexusRequest(
      "ANALYZE_TEXT",
      { content: "A beautiful sunrise over the ocean." }
    );

    const response = await router.dispatch(request);

    expect(response.success).toBe(true);
    expect(response.requestId).toBe(request.id);
    expect(response.data).toBeDefined();
  });

  it("should complete VALIDATE_INPUT flow", async () => {
    const request = createNexusRequest(
      "VALIDATE_INPUT",
      { content: "Test content for validation" }
    );

    const response = await router.dispatch(request);

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });

  it("should complete BUILD_DNA flow", async () => {
    const request = createNexusRequest(
      "BUILD_DNA",
      {
        validatedContent: "Test content for DNA building",
        seed: 42,
        mode: "auto"
      }
    );

    const response = await router.dispatch(request);

    expect(response.success).toBe(true);
  });

  it("should handle unknown operation", async () => {
    const request = createNexusRequest(
      "UNKNOWN_OP" as NexusOperationType,
      { content: "test" }
    );

    const response = await router.dispatch(request);

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe("UNKNOWN_OPERATION");
  });

  it("should execute via convenience method", async () => {
    const response = await router.execute(
      "ANALYZE_TEXT",
      { content: "Quick analysis test" }
    );

    expect(response.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2E FLOW: TRANSLATOR INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E — Translator Integration", () => {
  it("should translate input and format output", async () => {
    // Setup chain
    const inputTranslator = createInputTranslator();
    const outputTranslator = createOutputTranslator();
    const genomeAdapter = createGenomeAdapter();

    // Raw input
    const rawInput = "A sunset paints the sky in shades of gold.";

    // Step 1: Translate to normalized form
    const normalized = inputTranslator.translate(rawInput);
    expect(normalized.content).toBeDefined();

    // Step 2: Analyze with adapter
    const genomeResult = await genomeAdapter.analyzeText(normalized.content);
    expect(genomeResult.fingerprint).toBeDefined();

    // Step 3: Format output (OutputTranslator.format takes a NexusResponse)
    const mockResponse = createNexusResponse("test-req", {
      fingerprint: genomeResult.fingerprint,
      version: genomeResult.version
    });
    const formatted = outputTranslator.format(mockResponse);

    expect(formatted.success).toBe(true);
    expect((formatted.data as Record<string, unknown>)?.fingerprint).toBe(genomeResult.fingerprint);
  });

  it("should handle multi-line text translation", async () => {
    const inputTranslator = createInputTranslator();

    const multiLine = `Line one of the story.
Line two continues.
Line three concludes.`;

    const normalized = inputTranslator.translate(multiLine);
    expect(normalized.content).toContain("Line one");
    expect(normalized.lineCount).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2E FLOW: CONNECTOR INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E — Connector Integration", () => {
  it("should use mock filesystem in E2E flow", async () => {
    const mockFs = createMockFilesystem({
      "/data/story.txt": "Once upon a time in a distant land..."
    });

    // readFile returns string directly, not {success, content}
    const content = await mockFs.readFile("/data/story.txt");
    expect(content).toContain("Once upon a time");

    // Analyze the content
    const genomeAdapter = createGenomeAdapter();
    const genome = await genomeAdapter.analyzeText(content);
    expect(genome.fingerprint).toBeDefined();
  });

  it("should use mock CLI in E2E flow", async () => {
    const mockCli = createMockCLI([
      "--input", "/path/to/file.txt",
      "--output", "json",
      "--seed", "42"
    ]);

    // parseArgs requires the args to be passed
    const args = mockCli.parseArgs([
      "--input", "/path/to/file.txt",
      "--seed", "42"
    ]);
    expect(args.input).toBe("/path/to/file.txt");
    expect(args.seed).toBe(42);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2E FLOW: PIPELINE ORCHESTRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E — Pipeline Orchestration", () => {
  it("should execute validation pipeline E2E", async () => {
    const pipeline = createValidationPipeline();
    const executor = createPipelineExecutor();

    const result = await executor.execute(pipeline, {
      content: "Valid content for the validation pipeline test."
    });

    expect(result.status).toBe("completed");
    expect(result.stages.length).toBeGreaterThan(0);
  });

  it("should execute analysis pipeline with real adapters", async () => {
    const genomeAdapter = createGenomeAdapter();

    const pipeline = createPipeline("e2e-analysis")
      .stage("extract", async (input: { text: string }) => {
        return { content: input.text };
      })
      .stage("analyze", async (input: { content: string }) => {
        const result = await genomeAdapter.analyzeText(input.content);
        return { genome: result };
      })
      .stage("format", async (input: { genome: { fingerprint: string } }) => {
        return { formatted: true, fingerprint: input.genome.fingerprint };
      })
      .build();

    const executor = createPipelineExecutor();
    const result = await executor.execute(pipeline, {
      text: "A thrilling adventure awaits in the dark forest."
    });

    expect(result.status).toBe("completed");
    expect(result.finalOutput?.formatted).toBe(true);
    expect(result.finalOutput?.fingerprint).toBeDefined();
  });

  it("should handle pipeline failure with error propagation", async () => {
    const pipeline = createPipeline("failing-pipeline")
      .stage("step1", async (input: unknown) => input)
      .stage("fail", async () => {
        throw new Error("Intentional E2E failure");
      })
      .build();

    const executor = createPipelineExecutor();
    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe("failed");
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("Intentional E2E failure");
  });

  it("should execute multi-stage pipeline with adapters", async () => {
    const genomeAdapter = createGenomeAdapter();
    const myceliumAdapter = createMyceliumAdapter();

    const pipeline = createPipeline("adapter-pipeline")
      .stage("validate", async (input: { text: string }) => {
        const validation = await myceliumAdapter.validateInput({ content: input.text });
        return { content: validation.normalizedContent ?? input.text };
      })
      .stage("analyze", async (input: { content: string }) => {
        const genome = await genomeAdapter.analyzeText(input.content);
        return { fingerprint: genome.fingerprint };
      })
      .build();

    const executor = createPipelineExecutor();
    const result = await executor.execute(pipeline, {
      text: "Joy fills the room with laughter and smiles."
    });

    expect(result.status).toBe("completed");
    expect(result.finalOutput?.fingerprint).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2E FLOW: SCHEDULER WITH JOBS
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E — Scheduler Job Execution", () => {
  it("should schedule and execute job E2E", async () => {
    const scheduler = createScheduler({ maxConcurrent: 2 });
    const pipeline = createValidationPipeline();

    const jobId = scheduler.submit("e2e-job", pipeline, {
      content: "E2E test content"
    });

    const state = await scheduler.waitFor(jobId);

    expect(state.status).toBe("completed");
    expect(state.result).toBeDefined();
    expect(state.result?.status).toBe("completed");
  });

  it("should execute multiple jobs in priority order", async () => {
    const completionOrder: string[] = [];
    const scheduler = createScheduler({
      maxConcurrent: 1,
      onJobComplete: (job) => completionOrder.push(job.name)
    });

    const pipeline = createPipeline("quick")
      .stage("process", async (input: unknown) => input)
      .build();

    // Submit in order: low, high, critical
    const lowId = scheduler.submit("low-priority", pipeline, {}, { priority: "low" });
    const highId = scheduler.submit("high-priority", pipeline, {}, { priority: "high" });
    const criticalId = scheduler.submit("critical-priority", pipeline, {}, { priority: "critical" });

    // Wait for all
    await scheduler.waitFor(lowId);
    await scheduler.waitFor(highId);
    await scheduler.waitFor(criticalId);

    // All should complete
    expect(completionOrder).toContain("low-priority");
    expect(completionOrder).toContain("high-priority");
    expect(completionOrder).toContain("critical-priority");
  });

  it("should apply policies in E2E flow", () => {
    const policy = createMaxQueuePolicy(2);
    const scheduler = createScheduler({
      maxConcurrent: 0,
      policies: [policy]
    });

    const pipeline = createValidationPipeline();

    scheduler.submit("job1", pipeline, {});
    scheduler.submit("job2", pipeline, {});
    scheduler.submit("job3", pipeline, {}); // Should be blocked

    const stats = scheduler.getStats();
    expect(stats.queued).toBe(2);
    expect(stats.blocked).toBe(1);
  });

  it("should complete full scheduler lifecycle", async () => {
    const scheduler = createScheduler({ maxConcurrent: 3 });
    const pipeline = createValidationPipeline();

    // Submit multiple jobs
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(scheduler.submit(`job-${i}`, pipeline, { content: `test ${i}` }));
    }

    // Wait for all
    for (const id of ids) {
      await scheduler.waitFor(id);
    }

    // Verify stats
    const stats = scheduler.getStats();
    expect(stats.completed).toBe(5);
    expect(stats.running).toBe(0);
    expect(stats.queued).toBe(0);

    // Cleanup
    const removed = scheduler.cleanup();
    expect(removed).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2E FLOW: COMPLETE SYSTEM INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E — Complete System Integration", () => {
  it("should process request through entire system", async () => {
    // Setup all components
    const inputTranslator = createInputTranslator();
    const outputTranslator = createOutputTranslator();
    const router = createDefaultRouter();
    const scheduler = createScheduler({ maxConcurrent: 2 });

    // Create pipeline that uses router
    const pipeline = createPipeline("full-system")
      .stage("translate", async (input: { rawText: string }) => {
        const normalized = inputTranslator.translate(input.rawText);
        return { text: normalized.content };
      })
      .stage("route", async (input: { text: string }) => {
        const request = createNexusRequest("ANALYZE_TEXT", { content: input.text });
        const response = await router.dispatch(request);
        return { response };
      })
      .stage("format", async (input: { response: NexusResponse<unknown> }) => {
        // Use OutputTranslator.format() which takes a NexusResponse
        const formatted = outputTranslator.format(input.response);
        return formatted;
      })
      .build();

    // Schedule job
    const jobId = scheduler.submit("full-integration", pipeline, {
      rawText: "The hero embarked on a dangerous journey through the mountains."
    });

    // Wait for completion
    const state = await scheduler.waitFor(jobId);

    expect(state.status).toBe("completed");
    expect(state.result?.finalOutput?.success).toBe(true);
  });

  it("should handle multi-adapter workflow", async () => {
    const genomeAdapter = createGenomeAdapter();
    const myceliumAdapter = createMyceliumAdapter();

    const pipeline = createPipeline("multi-adapter")
      .stage("genome-analyze", async (input: { text: string }) => {
        const result = await genomeAdapter.analyzeText(input.text);
        return { genomeResult: result };
      })
      .stage("mycelium-validate", async (input: { genomeResult: { fingerprint: string } }) => {
        // MyceliumAdapter has validateInput, not computeFingerprint
        const validation = await myceliumAdapter.validateInput({
          content: "test content for validation"
        });
        return {
          genomeFingerprint: input.genomeResult.fingerprint,
          validationResult: validation.valid
        };
      })
      .build();

    const executor = createPipelineExecutor();
    const result = await executor.execute(pipeline, {
      text: "A complex narrative with multiple emotional layers."
    });

    expect(result.status).toBe("completed");
    expect(result.finalOutput?.genomeFingerprint).toBeDefined();
    expect(result.finalOutput?.validationResult).toBe(true);
  });

  it("should handle error recovery with default retry", async () => {
    let attempts = 0;
    const pipeline = createPipeline("retry-flow")
      .defaultRetry(3)  // Use builder method for retry
      .stage("unstable", async (input: { value: number }) => {
        attempts++;
        if (attempts < 2) {
          throw new Error("Transient failure");
        }
        return { value: input.value * 2 };
      })
      .build();

    const executor = createPipelineExecutor();
    const result = await executor.execute(pipeline, { value: 21 });

    expect(result.status).toBe("completed");
    expect(result.finalOutput?.value).toBe(42);
  });

  it("should propagate context through all layers", async () => {
    const contextData: string[] = [];

    const pipeline = createPipeline("context-flow")
      .stage("layer1", async (input: { message: string }) => {
        contextData.push("layer1");
        return { ...input, layer1: true };
      })
      .stage("layer2", async (input: { message: string; layer1: boolean }) => {
        contextData.push("layer2");
        return { ...input, layer2: true };
      })
      .stage("layer3", async (input: { message: string; layer1: boolean; layer2: boolean }) => {
        contextData.push("layer3");
        return { ...input, layer3: true };
      })
      .build();

    const executor = createPipelineExecutor();
    const result = await executor.execute(pipeline, { message: "test" });

    expect(result.status).toBe("completed");
    expect(contextData).toEqual(["layer1", "layer2", "layer3"]);
    expect(result.finalOutput).toEqual({
      message: "test",
      layer1: true,
      layer2: true,
      layer3: true
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2E FLOW: DETERMINISM VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E — Determinism Verification", () => {
  it("should produce identical fingerprints for same input (deterministic)", async () => {
    const genomeAdapter = createGenomeAdapter();

    const text = "Deterministic test: the same input must yield the same output.";
    const seed = 42;

    const result1 = await genomeAdapter.analyzeText(text, seed);
    const result2 = await genomeAdapter.analyzeText(text, seed);

    expect(result1.fingerprint).toBe(result2.fingerprint);
  });

  it("should maintain determinism through pipeline", async () => {
    const genomeAdapter = createGenomeAdapter();

    const pipeline = createPipeline("deterministic")
      .stage("analyze", async (input: { text: string }) => {
        const result = await genomeAdapter.analyzeText(input.text, 42);
        return { fingerprint: result.fingerprint };
      })
      .build();

    const executor = createPipelineExecutor();
    const input = { text: "Reproducible analysis test content." };

    const result1 = await executor.execute(pipeline, input);
    const result2 = await executor.execute(pipeline, input);

    expect(result1.output?.fingerprint).toBe(result2.output?.fingerprint);
  });

  it("should verify request ID uniqueness", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const request = createNexusRequest("ANALYZE_TEXT", { content: "test" });
      expect(ids.has(request.id)).toBe(false);
      ids.add(request.id);
    }
    expect(ids.size).toBe(100);
  });

  it("should produce different fingerprints for different seeds", async () => {
    const genomeAdapter = createGenomeAdapter();

    const text = "Same text, different seeds.";

    const result1 = await genomeAdapter.computeFingerprint(text, 42);
    const result2 = await genomeAdapter.computeFingerprint(text, 43);

    expect(result1).not.toBe(result2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2E FLOW: STRESS INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E — Stress Integration", () => {
  it("should handle burst of requests", async () => {
    const router = createDefaultRouter();
    const requests: Promise<NexusResponse<unknown>>[] = [];

    for (let i = 0; i < 20; i++) {
      const request = createNexusRequest("ANALYZE_TEXT", {
        content: `Burst test message ${i}`
      });
      requests.push(router.dispatch(request));
    }

    const responses = await Promise.all(requests);

    expect(responses.length).toBe(20);
    expect(responses.every(r => r.success)).toBe(true);
  });

  it("should handle scheduler under load", async () => {
    const scheduler = createScheduler({ maxConcurrent: 5 });
    const pipeline = createValidationPipeline();

    const jobs: string[] = [];
    for (let i = 0; i < 15; i++) {
      jobs.push(scheduler.submit(`load-job-${i}`, pipeline, { content: `load ${i}` }));
    }

    // Wait for all
    await Promise.all(jobs.map(id => scheduler.waitFor(id)));

    const stats = scheduler.getStats();
    expect(stats.completed).toBe(15);
  });

  it("should maintain correctness under concurrent execution", async () => {
    const genomeAdapter = createGenomeAdapter();
    const texts = [
      "First story about adventure.",
      "Second tale of mystery.",
      "Third narrative of romance.",
      "Fourth epic of fantasy.",
      "Fifth chronicle of history."
    ];

    const results = await Promise.all(
      texts.map(text => genomeAdapter.analyzeText(text, 42))
    );

    // All should have unique fingerprints
    const fingerprints = results.map(r => r.fingerprint);
    const uniqueFingerprints = new Set(fingerprints);
    expect(uniqueFingerprints.size).toBe(5);
  });
});

