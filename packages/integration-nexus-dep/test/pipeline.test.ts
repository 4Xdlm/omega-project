/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — PIPELINE TESTS
 * Version: 0.6.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PipelineExecutor,
  PipelineBuilder,
  StageBuilder,
  createPipelineExecutor,
  createPipeline,
  createStage,
  createAnalysisPipeline,
  createValidationPipeline,
  PipelineEvent
} from "../src/pipeline/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE BUILDER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Pipeline — Builder", () => {
  it("should create a simple pipeline", () => {
    const pipeline = createPipeline("test")
      .setVersion("1.0.0")
      .describe("Test pipeline")
      .stage("step1", async (input) => ({ ...input, step1: true }))
      .build();

    expect(pipeline.name).toBe("test");
    expect(pipeline.version).toBe("1.0.0");
    expect(pipeline.description).toBe("Test pipeline");
    expect(pipeline.stages).toHaveLength(1);
  });

  it("should create multi-stage pipeline", () => {
    const pipeline = createPipeline("multi")
      .stage("validate", async (input) => input)
      .stage("process", async (input) => input)
      .stage("output", async (input) => input)
      .build();

    expect(pipeline.stages).toHaveLength(3);
    expect(pipeline.stages[0].name).toBe("validate");
    expect(pipeline.stages[1].name).toBe("process");
    expect(pipeline.stages[2].name).toBe("output");
  });

  it("should set pipeline options", () => {
    const pipeline = createPipeline("opts")
      .stage("step", async (input) => input)
      .stopOnError(false)
      .defaultTimeout(5000)
      .defaultRetry(2)
      .seed(123)
      .withTrace()
      .build();

    expect(pipeline.options?.stopOnError).toBe(false);
    expect(pipeline.options?.defaultTimeoutMs).toBe(5000);
    expect(pipeline.options?.defaultRetryCount).toBe(2);
    expect(pipeline.options?.seed).toBe(123);
    expect(pipeline.options?.traceEnabled).toBe(true);
  });

  it("should throw on empty pipeline", () => {
    expect(() => createPipeline("empty").build()).toThrow(
      "Pipeline must have at least one stage"
    );
  });

  it("should create immutable definition", () => {
    const pipeline = createPipeline("immutable")
      .stage("step", async (input) => input)
      .build();

    expect(Object.isFrozen(pipeline)).toBe(true);
    expect(Object.isFrozen(pipeline.stages)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE BUILDER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Pipeline — Stage Builder", () => {
  it("should create a stage with all options", () => {
    const stage = createStage("myStage", async (input) => input)
      .describe("My stage description")
      .retry(3)
      .timeout(10000)
      .optional()
      .dependsOn("prevStage")
      .build();

    expect(stage.name).toBe("myStage");
    expect(stage.description).toBe("My stage description");
    expect(stage.retryCount).toBe(3);
    expect(stage.timeoutMs).toBe(10000);
    expect(stage.optional).toBe(true);
    expect(stage.dependsOn).toContain("prevStage");
  });

  it("should add StageBuilder to pipeline", () => {
    const stage = createStage("built", async (input) => input)
      .timeout(5000);

    const pipeline = createPipeline("withBuilder")
      .addStage(stage)
      .build();

    expect(pipeline.stages).toHaveLength(1);
    expect(pipeline.stages[0].name).toBe("built");
    expect(pipeline.stages[0].timeoutMs).toBe(5000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE EXECUTOR TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Pipeline — Executor", () => {
  let executor: PipelineExecutor;

  beforeEach(() => {
    executor = createPipelineExecutor();
  });

  it("should execute simple pipeline", async () => {
    const pipeline = createPipeline("simple")
      .stage<{ value: number }, { value: number }>(
        "double",
        async (input) => ({ value: input.value * 2 })
      )
      .build();

    const result = await executor.execute(pipeline, { value: 5 });

    expect(result.status).toBe("completed");
    expect(result.finalOutput).toEqual({ value: 10 });
    expect(result.stages).toHaveLength(1);
    expect(result.stages[0].status).toBe("completed");
  });

  it("should execute multi-stage pipeline", async () => {
    const pipeline = createPipeline("multi-stage")
      .stage<{ n: number }, { n: number }>("add1", async (input) => ({ n: input.n + 1 }))
      .stage<{ n: number }, { n: number }>("double", async (input) => ({ n: input.n * 2 }))
      .stage<{ n: number }, { n: number }>("add10", async (input) => ({ n: input.n + 10 }))
      .build();

    const result = await executor.execute(pipeline, { n: 5 });

    expect(result.status).toBe("completed");
    expect(result.finalOutput).toEqual({ n: 22 }); // (5+1)*2+10 = 22
    expect(result.stages).toHaveLength(3);
    expect(result.stages.every(s => s.status === "completed")).toBe(true);
  });

  it("should stop on error by default", async () => {
    const pipeline = createPipeline("stop-error")
      .stage("pass", async (input) => input)
      .stage("fail", async () => {
        throw new Error("Stage failure");
      })
      .stage("skip", async (input) => input)
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe("failed");
    expect(result.stages).toHaveLength(2);
    expect(result.stages[0].status).toBe("completed");
    expect(result.stages[1].status).toBe("failed");
  });

  it("should continue on error if stopOnError is false", async () => {
    const pipeline = createPipeline("continue-error")
      .stage("pass1", async (input) => input)
      .stage("fail", async () => {
        throw new Error("Stage failure");
      })
      .stage("pass2", async (input) => input)
      .stopOnError(false)
      .build();

    const result = await executor.execute(pipeline, { data: "test" });

    expect(result.status).toBe("completed");
    expect(result.stages).toHaveLength(3);
    expect(result.stages[1].status).toBe("failed");
    expect(result.stages[2].status).toBe("completed");
  });

  it("should skip optional stages on failure without stopping", async () => {
    const optionalStage = createStage("optional-fail", async () => {
      throw new Error("Optional failure");
    }).optional().build();

    const pipeline = createPipeline("optional")
      .stage("pass1", async (input) => input)
      .addStage(optionalStage)
      .stage("pass2", async (input) => input)
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe("completed");
    expect(result.stages[1].status).toBe("failed");
    expect(result.stages[2].status).toBe("completed");
  });

  it("should handle timeout", async () => {
    const pipeline = createPipeline("timeout")
      .addStage(
        createStage("slow", async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return {};
        }).timeout(100).build()
      )
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe("failed");
    expect(result.stages[0].status).toBe("failed");
    expect(result.stages[0].error?.code).toBe("TIMEOUT");
  });

  it("should retry on failure", async () => {
    let attempts = 0;
    const pipeline = createPipeline("retry")
      .addStage(
        createStage("retry-stage", async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error(`Attempt ${attempts} failed`);
          }
          return { success: true };
        }).retry(3).build()
      )
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe("completed");
    expect(result.stages[0].retryCount).toBe(2);
    expect(attempts).toBe(3);
  });

  it("should provide context to stage handlers", async () => {
    let capturedContext: any;
    const pipeline = createPipeline("context")
      .seed(12345)
      .stage("capture", async (input, ctx) => {
        capturedContext = ctx;
        return input;
      })
      .build();

    await executor.execute(pipeline, { data: "test" });

    expect(capturedContext.pipelineId).toMatch(/^PIPE-/);
    expect(capturedContext.stageName).toBe("capture");
    expect(capturedContext.stageIndex).toBe(0);
    expect(capturedContext.seed).toBe(12345);
  });

  it("should provide previous results in context", async () => {
    let capturedPrevious: any;
    const pipeline = createPipeline("previous")
      .stage<{ n: number }, { first: number }>("first", async (input) => ({ first: input.n * 2 }))
      .stage<{ first: number }, { second: number }>("second", async (input, ctx) => {
        capturedPrevious = ctx.previousResults;
        return { second: input.first + 10 };
      })
      .build();

    await executor.execute(pipeline, { n: 5 });

    expect(capturedPrevious.input).toEqual({ n: 5 });
    expect(capturedPrevious.first).toEqual({ first: 10 });
  });

  it("should generate unique pipeline IDs", async () => {
    const pipeline = createPipeline("ids")
      .stage("step", async (input) => input)
      .build();

    const result1 = await executor.execute(pipeline, {});
    const result2 = await executor.execute(pipeline, {});

    expect(result1.pipelineId).not.toBe(result2.pipelineId);
  });

  it("should track timing information", async () => {
    const pipeline = createPipeline("timing")
      .stage("wait", async (input) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return input;
      })
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.startTimeMs).toBeLessThanOrEqual(result.endTimeMs);
    expect(result.durationMs).toBeGreaterThanOrEqual(50);
    expect(result.stages[0].durationMs).toBeGreaterThanOrEqual(50);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE EVENTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Pipeline — Events", () => {
  it("should emit pipeline events", async () => {
    const events: PipelineEvent[] = [];
    const executor = createPipelineExecutor();
    executor.on(event => events.push(event));

    const pipeline = createPipeline("events")
      .stage("step", async (input) => input)
      .build();

    await executor.execute(pipeline, {});

    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain("pipeline:start");
    expect(eventTypes).toContain("stage:start");
    expect(eventTypes).toContain("stage:complete");
    expect(eventTypes).toContain("pipeline:complete");
  });

  it("should emit error events", async () => {
    const events: PipelineEvent[] = [];
    const executor = createPipelineExecutor();
    executor.on(event => events.push(event));

    const pipeline = createPipeline("error-events")
      .stage("fail", async () => {
        throw new Error("Test error");
      })
      .build();

    await executor.execute(pipeline, {});

    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain("stage:error");
    expect(eventTypes).toContain("pipeline:error");
  });

  it("should emit retry events", async () => {
    const events: PipelineEvent[] = [];
    const executor = createPipelineExecutor();
    executor.on(event => events.push(event));

    let attempt = 0;
    const pipeline = createPipeline("retry-events")
      .addStage(
        createStage("retry", async () => {
          attempt++;
          if (attempt < 2) throw new Error("Retry");
          return {};
        }).retry(1).build()
      )
      .build();

    await executor.execute(pipeline, {});

    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain("stage:retry");
  });

  it("should allow removing event handlers", async () => {
    const events: PipelineEvent[] = [];
    const executor = createPipelineExecutor();
    const handler = (event: PipelineEvent) => events.push(event);

    executor.on(handler);
    executor.off(handler);

    const pipeline = createPipeline("no-events")
      .stage("step", async (input) => input)
      .build();

    await executor.execute(pipeline, {});

    expect(events).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-BUILT PIPELINES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Pipeline — Pre-built", () => {
  it("should create analysis pipeline", () => {
    const pipeline = createAnalysisPipeline();

    expect(pipeline.name).toBe("OMEGA-ANALYSIS");
    expect(pipeline.stages).toHaveLength(3);
    expect(pipeline.stages[0].name).toBe("validate");
    expect(pipeline.stages[1].name).toBe("analyze");
    expect(pipeline.stages[2].name).toBe("buildDNA");
  });

  it("should execute analysis pipeline", async () => {
    const executor = createPipelineExecutor();
    const pipeline = createAnalysisPipeline();

    const result = await executor.execute(pipeline, {
      content: "Test narrative content for analysis",
      seed: 42
    });

    expect(result.status).toBe("completed");
    expect(result.stages.every(s => s.status === "completed")).toBe(true);
  });

  it("should create validation pipeline", () => {
    const pipeline = createValidationPipeline();

    expect(pipeline.name).toBe("OMEGA-VALIDATION");
    expect(pipeline.stages).toHaveLength(1);
    expect(pipeline.stages[0].name).toBe("validate");
  });

  it("should execute validation pipeline", async () => {
    const executor = createPipelineExecutor();
    const pipeline = createValidationPipeline();

    const result = await executor.execute(pipeline, {
      content: "Valid content"
    });

    expect(result.status).toBe("completed");
    expect(result.finalOutput).toEqual({
      valid: true,
      normalized: "Valid content"
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Pipeline — Determinism", () => {
  it("should produce deterministic results with same seed", async () => {
    const executor1 = createPipelineExecutor({ seed: 42 });
    const executor2 = createPipelineExecutor({ seed: 42 });

    const pipeline = createAnalysisPipeline();

    const result1 = await executor1.execute(pipeline, { content: "Test content" });
    const result2 = await executor2.execute(pipeline, { content: "Test content" });

    // Both should complete
    expect(result1.status).toBe("completed");
    expect(result2.status).toBe("completed");

    // Final outputs should match
    expect(result1.finalOutput).toEqual(result2.finalOutput);
  });
});
