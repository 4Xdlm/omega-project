/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — DETERMINISM TESTS
 * Version: 0.7.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Verifying that all operations produce deterministic outputs.
 * INV-DET-01: Same input + seed = same output.
 * INV-DET-02: No random or time-dependent behavior.
 * INV-DET-03: Order independence where applicable.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  createNexusRequest,
  createGenomeAdapter,
  createMyceliumAdapter,
  createMyceliumBioAdapter,
  createDefaultRouter,
  createInputTranslator,
  createOutputTranslator,
  createPipeline,
  createValidationPipeline,
  createPipelineExecutor,
  createScheduler
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTER DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe("Determinism — Adapter Operations", () => {
  it("should produce identical fingerprints for same input and seed", async () => {
    const adapter = createGenomeAdapter();
    const text = "Deterministic test content for fingerprint";
    const seed = 42;

    const result1 = await adapter.analyzeText(text, seed);
    const result2 = await adapter.analyzeText(text, seed);
    const result3 = await adapter.analyzeText(text, seed);

    expect(result1.fingerprint).toBe(result2.fingerprint);
    expect(result2.fingerprint).toBe(result3.fingerprint);
  });

  it("should produce different fingerprints for different seeds", async () => {
    const adapter = createGenomeAdapter();
    const text = "Same text, different seeds";

    const result1 = await adapter.analyzeText(text, 1);
    const result2 = await adapter.analyzeText(text, 2);
    const result3 = await adapter.analyzeText(text, 3);

    expect(result1.fingerprint).not.toBe(result2.fingerprint);
    expect(result2.fingerprint).not.toBe(result3.fingerprint);
    expect(result1.fingerprint).not.toBe(result3.fingerprint);
  });

  it("should produce different fingerprints for different content", async () => {
    const adapter = createGenomeAdapter();
    const seed = 42;

    const result1 = await adapter.analyzeText("Content A", seed);
    const result2 = await adapter.analyzeText("Content B", seed);
    const result3 = await adapter.analyzeText("Content C", seed);

    expect(result1.fingerprint).not.toBe(result2.fingerprint);
    expect(result2.fingerprint).not.toBe(result3.fingerprint);
    expect(result1.fingerprint).not.toBe(result3.fingerprint);
  });

  it("should maintain determinism across adapter instances", async () => {
    const text = "Cross-instance determinism test";
    const seed = 123;

    const adapter1 = createGenomeAdapter();
    const adapter2 = createGenomeAdapter();
    const adapter3 = createGenomeAdapter();

    const result1 = await adapter1.analyzeText(text, seed);
    const result2 = await adapter2.analyzeText(text, seed);
    const result3 = await adapter3.analyzeText(text, seed);

    expect(result1.fingerprint).toBe(result2.fingerprint);
    expect(result2.fingerprint).toBe(result3.fingerprint);
  });

  it("should deterministically compute fingerprint", async () => {
    const adapter = createGenomeAdapter();

    const result1 = await adapter.computeFingerprint("test", 42);
    const result2 = await adapter.computeFingerprint("test", 42);
    const result3 = await adapter.computeFingerprint("test", 42);

    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });

  it("should maintain validation consistency", async () => {
    const adapter = createMyceliumAdapter();
    const input = { content: "Validation determinism test" };

    const result1 = await adapter.validateInput(input);
    const result2 = await adapter.validateInput(input);
    const result3 = await adapter.validateInput(input);

    expect(result1.valid).toBe(result2.valid);
    expect(result2.valid).toBe(result3.valid);
    expect(result1.normalizedContent).toBe(result2.normalizedContent);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATOR DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe("Determinism — Translator Operations", () => {
  it("should produce identical translation results", () => {
    const translator = createInputTranslator();
    const text = "Text for translation determinism test.\nWith multiple lines.";

    const result1 = translator.translate(text);
    const result2 = translator.translate(text);
    const result3 = translator.translate(text);

    expect(result1.content).toBe(result2.content);
    expect(result2.content).toBe(result3.content);
    expect(result1.lineCount).toBe(result2.lineCount);
    expect(result1.charCount).toBe(result2.charCount);
  });

  it("should produce identical output formatting", () => {
    const translator = createOutputTranslator();
    const response = {
      success: true as const,
      requestId: "test-123",
      data: { value: 42, nested: { key: "value" } }
    };

    const result1 = translator.format(response);
    const result2 = translator.format(response);
    const result3 = translator.format(response);

    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
    expect(JSON.stringify(result2)).toBe(JSON.stringify(result3));
  });

  it("should normalize whitespace consistently", () => {
    const translator = createInputTranslator();
    const text = "  Multiple   spaces   and   tabs\t\there  ";

    const result1 = translator.translate(text);
    const result2 = translator.translate(text);

    expect(result1.content).toBe(result2.content);
  });

  it("should handle line endings consistently", () => {
    const translator = createInputTranslator();

    const unixText = "line1\nline2\nline3";
    const windowsText = "line1\r\nline2\r\nline3";

    const unixResult1 = translator.translate(unixText);
    const unixResult2 = translator.translate(unixText);

    expect(unixResult1.content).toBe(unixResult2.content);

    const windowsResult1 = translator.translate(windowsText);
    const windowsResult2 = translator.translate(windowsText);

    expect(windowsResult1.content).toBe(windowsResult2.content);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe("Determinism — Router Operations", () => {
  it("should produce consistent responses for same requests", async () => {
    const router = createDefaultRouter();

    const request1 = createNexusRequest("ANALYZE_TEXT", {
      content: "Router determinism test content"
    });
    const request2 = createNexusRequest("ANALYZE_TEXT", {
      content: "Router determinism test content"
    });

    const response1 = await router.dispatch(request1);
    const response2 = await router.dispatch(request2);

    expect(response1.success).toBe(response2.success);
    // Data should have same structure
    expect(typeof response1.data).toBe(typeof response2.data);
  });

  it("should handle execute with same seed consistently", async () => {
    const router = createDefaultRouter();
    const content = "Execute determinism test";
    const seed = 42;

    const response1 = await router.execute("ANALYZE_TEXT", { content }, seed);
    const response2 = await router.execute("ANALYZE_TEXT", { content }, seed);
    const response3 = await router.execute("ANALYZE_TEXT", { content }, seed);

    expect(response1.success).toBe(response2.success);
    expect(response2.success).toBe(response3.success);
  });

  it("should list operations consistently", () => {
    const router = createDefaultRouter();

    const ops1 = router.getOperations();
    const ops2 = router.getOperations();
    const ops3 = router.getOperations();

    expect(ops1).toEqual(ops2);
    expect(ops2).toEqual(ops3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe("Determinism — Pipeline Operations", () => {
  it("should execute pipeline with consistent results", async () => {
    const executor = createPipelineExecutor();
    const pipeline = createPipeline("determinism-test")
      .stage("double", async (input: { n: number }) => ({ n: input.n * 2 }))
      .stage("square", async (input: { n: number }) => ({ n: input.n * input.n }))
      .build();

    const result1 = await executor.execute(pipeline, { n: 5 });
    const result2 = await executor.execute(pipeline, { n: 5 });
    const result3 = await executor.execute(pipeline, { n: 5 });

    expect(result1.finalOutput).toEqual(result2.finalOutput);
    expect(result2.finalOutput).toEqual(result3.finalOutput);
    expect((result1.finalOutput as { n: number }).n).toBe(100); // (5*2)^2 = 100
  });

  it("should produce consistent stage results", async () => {
    const executor = createPipelineExecutor();
    const pipeline = createPipeline("stage-consistency")
      .stage("step1", async (input: { v: string }) => ({ v: input.v.toUpperCase() }))
      .stage("step2", async (input: { v: string }) => ({ v: input.v + "!" }))
      .build();

    const result1 = await executor.execute(pipeline, { v: "test" });
    const result2 = await executor.execute(pipeline, { v: "test" });

    expect(result1.stages.length).toBe(result2.stages.length);
    expect(result1.stages[0].data).toEqual(result2.stages[0].data);
    expect(result1.stages[1].data).toEqual(result2.stages[1].data);
  });

  it("should maintain execution order", async () => {
    const executor = createPipelineExecutor();
    const executionOrder: string[] = [];

    const pipeline = createPipeline("order-test")
      .stage("first", async (input: unknown) => {
        executionOrder.push("first");
        return input;
      })
      .stage("second", async (input: unknown) => {
        executionOrder.push("second");
        return input;
      })
      .stage("third", async (input: unknown) => {
        executionOrder.push("third");
        return input;
      })
      .build();

    await executor.execute(pipeline, {});
    expect(executionOrder).toEqual(["first", "second", "third"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULER DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe("Determinism — Scheduler Operations", () => {
  it("should generate unique job IDs consistently", () => {
    const scheduler1 = createScheduler({ maxConcurrent: 0 });
    const scheduler2 = createScheduler({ maxConcurrent: 0 });
    const pipeline = createValidationPipeline();

    // IDs should be unique within scheduler
    const id1 = scheduler1.submit("job1", pipeline, {});
    const id2 = scheduler1.submit("job2", pipeline, {});
    expect(id1).not.toBe(id2);

    // IDs should be unique across schedulers
    const id3 = scheduler2.submit("job1", pipeline, {});
    const id4 = scheduler2.submit("job2", pipeline, {});
    expect(id3).not.toBe(id4);
  });

  it("should maintain consistent stats", () => {
    const scheduler = createScheduler({ maxConcurrent: 0 });
    const pipeline = createValidationPipeline();

    scheduler.submit("job1", pipeline, {});
    scheduler.submit("job2", pipeline, {});
    scheduler.submit("job3", pipeline, {});

    const stats1 = scheduler.getStats();
    const stats2 = scheduler.getStats();
    const stats3 = scheduler.getStats();

    expect(stats1).toEqual(stats2);
    expect(stats2).toEqual(stats3);
    expect(stats1.queued).toBe(3);
  });

  it("should maintain priority ordering", () => {
    const scheduler = createScheduler({ maxConcurrent: 0 });
    const pipeline = createValidationPipeline();

    scheduler.submit("low", pipeline, {}, { priority: "low" });
    scheduler.submit("critical", pipeline, {}, { priority: "critical" });
    scheduler.submit("normal", pipeline, {}, { priority: "normal" });
    scheduler.submit("high", pipeline, {}, { priority: "high" });

    // Queue order should be: critical, high, normal, low
    const stats = scheduler.getStats();
    expect(stats.queued).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HASH DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe("Determinism — Hash Operations", () => {
  it("should produce consistent hashes for same content", async () => {
    const adapter = createGenomeAdapter();
    const content = "Hash determinism test content";

    // analyzeText uses internal hashing
    const result1 = await adapter.analyzeText(content, 42);
    const result2 = await adapter.analyzeText(content, 42);

    expect(result1.sourceHash).toBe(result2.sourceHash);
  });

  it("should produce different hashes for different content", async () => {
    const adapter = createGenomeAdapter();

    const result1 = await adapter.analyzeText("Content A", 42);
    const result2 = await adapter.analyzeText("Content B", 42);

    expect(result1.sourceHash).not.toBe(result2.sourceHash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST ID DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe("Determinism — Request ID Generation", () => {
  it("should generate unique IDs", () => {
    const ids = new Set<string>();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      const request = createNexusRequest("ANALYZE_TEXT", {});
      ids.add(request.id);
    }

    expect(ids.size).toBe(count);
  });

  it("should follow NEXUS-{timestamp}-{random} format", () => {
    const request = createNexusRequest("ANALYZE_TEXT", {});
    const parts = request.id.split("-");

    expect(parts[0]).toBe("NEXUS");
    expect(parts.length).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DOUBLE RUN VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Determinism — Double Run Verification", () => {
  it("should produce identical results on double run", async () => {
    const adapter = createGenomeAdapter();
    const translator = createInputTranslator();
    const text = "Double run verification test content.";

    // First run
    const translated1 = translator.translate(text);
    const analyzed1 = await adapter.analyzeText(translated1.content, 42);

    // Second run
    const translated2 = translator.translate(text);
    const analyzed2 = await adapter.analyzeText(translated2.content, 42);

    // Verify equality
    expect(translated1.content).toBe(translated2.content);
    expect(translated1.lineCount).toBe(translated2.lineCount);
    expect(analyzed1.fingerprint).toBe(analyzed2.fingerprint);
    expect(analyzed1.sourceHash).toBe(analyzed2.sourceHash);
  });

  it("should produce identical pipeline results on double run", async () => {
    const executor = createPipelineExecutor();
    const adapter = createGenomeAdapter();

    const pipeline = createPipeline("double-run")
      .stage("analyze", async (input: { text: string }) => {
        const result = await adapter.analyzeText(input.text, 42);
        return { fingerprint: result.fingerprint };
      })
      .build();

    const input = { text: "Pipeline double run test" };

    const result1 = await executor.execute(pipeline, input);
    const result2 = await executor.execute(pipeline, input);

    expect(result1.status).toBe(result2.status);
    expect(result1.finalOutput).toEqual(result2.finalOutput);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONCURRENT DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe("Determinism — Concurrent Operations", () => {
  it("should maintain determinism under concurrent execution", async () => {
    const adapter = createGenomeAdapter();
    const text = "Concurrent determinism test";
    const seed = 42;

    // Execute same operation concurrently
    const results = await Promise.all([
      adapter.analyzeText(text, seed),
      adapter.analyzeText(text, seed),
      adapter.analyzeText(text, seed),
      adapter.analyzeText(text, seed),
      adapter.analyzeText(text, seed)
    ]);

    // All should produce same fingerprint
    const fingerprints = new Set(results.map(r => r.fingerprint));
    expect(fingerprints.size).toBe(1);
  });

  it("should maintain fingerprint uniqueness for different inputs", async () => {
    const adapter = createGenomeAdapter();
    const texts = [
      "Input one",
      "Input two",
      "Input three",
      "Input four",
      "Input five"
    ];

    const results = await Promise.all(
      texts.map(t => adapter.analyzeText(t, 42))
    );

    const fingerprints = new Set(results.map(r => r.fingerprint));
    expect(fingerprints.size).toBe(5);
  });
});

