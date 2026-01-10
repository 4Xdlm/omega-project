/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — EDGE CASES TESTS
 * Version: 0.7.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Testing boundary conditions, error handling, and unusual inputs.
 * INV-EDGE-01: Graceful handling of edge cases.
 * INV-EDGE-02: No undefined behavior.
 * INV-EDGE-03: Clear error messages.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  // Contracts
  createNexusRequest,
  createNexusResponse,
  createErrorResponse,
  NexusOperationType,

  // Adapters
  GenomeAdapter,
  createGenomeAdapter,
  createMyceliumAdapter,
  createMyceliumBioAdapter,

  // Router
  createRouter,
  createDefaultRouter,

  // Translators
  createInputTranslator,
  createOutputTranslator,

  // Connectors
  createMockFilesystem,
  createMockCLI,

  // Pipeline
  createPipeline,
  createValidationPipeline,
  createPipelineExecutor,

  // Scheduler
  createScheduler,
  createMaxQueuePolicy,
  createTagFilterPolicy
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY INPUT EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases — Empty Inputs", () => {
  it("should handle empty string for analysis", async () => {
    const adapter = createGenomeAdapter();
    const result = await adapter.analyzeText("");
    expect(result).toBeDefined();
    expect(result.fingerprint).toBeDefined();
  });

  it("should handle whitespace-only input", async () => {
    const adapter = createGenomeAdapter();
    const result = await adapter.analyzeText("   \n\t  ");
    expect(result).toBeDefined();
  });

  it("should translate empty string", () => {
    const translator = createInputTranslator();
    const result = translator.translate("");
    expect(result.content).toBe("");
    expect(result.charCount).toBe(0);
  });

  it("should handle empty request payload", async () => {
    const router = createDefaultRouter();
    const request = createNexusRequest("ANALYZE_TEXT", {});
    const response = await router.dispatch(request);
    // Should not crash - may fail validation but not throw
    expect(response).toBeDefined();
  });

  it("should handle undefined in request", async () => {
    const router = createDefaultRouter();
    const request = createNexusRequest("ANALYZE_TEXT", {
      content: undefined as unknown as string
    });
    const response = await router.dispatch(request);
    expect(response).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNDARY VALUE EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases — Boundary Values", () => {
  it("should handle very long text", async () => {
    const adapter = createGenomeAdapter();
    const longText = "word ".repeat(10000);
    const result = await adapter.analyzeText(longText);
    expect(result.fingerprint).toBeDefined();
  });

  it("should handle single character", async () => {
    const adapter = createGenomeAdapter();
    const result = await adapter.analyzeText("x");
    expect(result.fingerprint).toBeDefined();
  });

  it("should handle seed at boundaries", async () => {
    const adapter = createGenomeAdapter();

    const result0 = await adapter.computeFingerprint("test", 0);
    const resultMax = await adapter.computeFingerprint("test", Number.MAX_SAFE_INTEGER);
    const resultNeg = await adapter.computeFingerprint("test", -1);

    expect(result0).toBeDefined();
    expect(resultMax).toBeDefined();
    expect(resultNeg).toBeDefined();
  });

  it("should handle max concurrent = 0", async () => {
    const scheduler = createScheduler({ maxConcurrent: 0 });
    const pipeline = createValidationPipeline();

    const jobId = scheduler.submit("stuck-job", pipeline, {});

    // Job should be queued but never processed
    const state = scheduler.getState(jobId);
    expect(state?.status).toBe("queued");

    // Cancel to cleanup
    scheduler.cancel(jobId);
  });

  it("should handle timeout of 0", async () => {
    const pipeline = createPipeline("zero-timeout")
      .defaultTimeout(0)
      .stage("instant", async (input: unknown) => input)
      .build();

    const executor = createPipelineExecutor();
    const result = await executor.execute(pipeline, { data: "test" });

    // Should still complete (0 timeout often means no timeout)
    expect(result).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIAL CHARACTER EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases — Special Characters", () => {
  it("should handle unicode text", async () => {
    const adapter = createGenomeAdapter();
    const unicodeText = "日本語テキスト 中文 العربية 🎉🚀✨";
    const result = await adapter.analyzeText(unicodeText);
    expect(result.fingerprint).toBeDefined();
  });

  it("should handle emoji-only text", async () => {
    const adapter = createGenomeAdapter();
    const result = await adapter.analyzeText("🔥🎯💯🚀");
    expect(result.fingerprint).toBeDefined();
  });

  it("should handle control characters", async () => {
    const translator = createInputTranslator();
    const controlText = "test\x00\x01\x02text";
    const result = translator.translate(controlText);
    expect(result).toBeDefined();
  });

  it("should handle newlines in various formats", async () => {
    const translator = createInputTranslator();

    const unix = translator.translate("line1\nline2\nline3");
    const windows = translator.translate("line1\r\nline2\r\nline3");
    const mac = translator.translate("line1\rline2\rline3");

    expect(unix.lineCount).toBe(3);
    expect(windows.lineCount).toBe(3);
    // Old Mac format might be handled differently
    expect(mac).toBeDefined();
  });

  it("should handle special JSON characters in content", async () => {
    const adapter = createGenomeAdapter();
    const jsonSpecial = 'Text with "quotes" and \\ backslashes and {braces}';
    const result = await adapter.analyzeText(jsonSpecial);
    expect(result.fingerprint).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases — Error Handling", () => {
  it("should provide clear error for missing handler", async () => {
    const router = createRouter();
    const request = createNexusRequest("UNREGISTERED" as NexusOperationType, {});

    const response = await router.dispatch(request);

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe("UNKNOWN_OPERATION");
  });

  it("should handle pipeline stage throwing string", async () => {
    const pipeline = createPipeline("string-throw")
      .stage("throw", async () => {
        throw "string error";
      })
      .build();

    const executor = createPipelineExecutor();
    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe("failed");
    expect(result.error?.message).toContain("string error");
  });

  it("should handle pipeline stage throwing object", async () => {
    const pipeline = createPipeline("object-throw")
      .stage("throw", async () => {
        throw { custom: "error object", code: 123 };
      })
      .build();

    const executor = createPipelineExecutor();
    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe("failed");
  });

  it("should handle file not found in mock filesystem", async () => {
    const mockFs = createMockFilesystem({});

    await expect(mockFs.readFile("/nonexistent/file.txt")).rejects.toThrow();
  });

  it("should handle scheduler waitFor timeout", async () => {
    const scheduler = createScheduler({ maxConcurrent: 0 });
    const pipeline = createValidationPipeline();

    const jobId = scheduler.submit("timeout-test", pipeline, {});

    await expect(scheduler.waitFor(jobId, 50)).rejects.toThrow("Timeout");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STATE TRANSITION EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases — State Transitions", () => {
  it("should not cancel completed job", async () => {
    const scheduler = createScheduler({ maxConcurrent: 1 });
    const pipeline = createValidationPipeline();

    const jobId = scheduler.submit("complete-then-cancel", pipeline, {});
    await scheduler.waitFor(jobId);

    const cancelled = scheduler.cancel(jobId);
    expect(cancelled).toBe(false);

    const state = scheduler.getState(jobId);
    expect(state?.status).toBe("completed");
  });

  it("should not get state of nonexistent job", () => {
    const scheduler = createScheduler();
    const state = scheduler.getState("nonexistent-job-id");
    expect(state).toBeUndefined();
  });

  it("should handle double submission with same name", () => {
    const scheduler = createScheduler({ maxConcurrent: 0 });
    const pipeline = createValidationPipeline();

    const id1 = scheduler.submit("same-name", pipeline, {});
    const id2 = scheduler.submit("same-name", pipeline, {});

    // Different IDs even with same name
    expect(id1).not.toBe(id2);
  });

  it("should handle cleanup when no completed jobs", () => {
    const scheduler = createScheduler({ maxConcurrent: 0 });
    const removed = scheduler.cleanup();
    expect(removed).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONCURRENCY EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases — Concurrency", () => {
  it("should handle rapid submissions", () => {
    const scheduler = createScheduler({ maxConcurrent: 5 });
    const pipeline = createValidationPipeline();

    const ids: string[] = [];
    for (let i = 0; i < 100; i++) {
      ids.push(scheduler.submit(`rapid-${i}`, pipeline, {}));
    }

    // All should have unique IDs
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(100);
  });

  it("should handle concurrent reads from adapter", async () => {
    const adapter = createGenomeAdapter();
    const texts = Array(50).fill("concurrent test text");

    const results = await Promise.all(
      texts.map(t => adapter.analyzeText(t))
    );

    // All should succeed and have same fingerprint
    expect(results.length).toBe(50);
    const fingerprints = new Set(results.map(r => r.fingerprint));
    expect(fingerprints.size).toBe(1);
  });

  it("should handle concurrent router dispatches", async () => {
    const router = createDefaultRouter();

    const requests = Array(30).fill(null).map((_, i) =>
      createNexusRequest("ANALYZE_TEXT", { content: `concurrent ${i}` })
    );

    const responses = await Promise.all(
      requests.map(r => router.dispatch(r))
    );

    expect(responses.length).toBe(30);
    expect(responses.every(r => r.success)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases — Policies", () => {
  it("should handle max queue policy of 0", () => {
    const policy = createMaxQueuePolicy(0);
    const scheduler = createScheduler({
      maxConcurrent: 0,
      policies: [policy]
    });

    const pipeline = createValidationPipeline();
    scheduler.submit("should-block", pipeline, {});

    const stats = scheduler.getStats();
    expect(stats.blocked).toBe(1);
    expect(stats.queued).toBe(0);
  });

  it("should handle empty blocked tags", () => {
    const policy = createTagFilterPolicy([]);
    const scheduler = createScheduler({
      maxConcurrent: 0,
      policies: [policy]
    });

    const pipeline = createValidationPipeline();
    scheduler.submit("any-tag", pipeline, {}, {
      metadata: { tags: ["random", "tags"] }
    });

    const stats = scheduler.getStats();
    expect(stats.queued).toBe(1);
    expect(stats.blocked).toBe(0);
  });

  it("should handle job with undefined metadata", () => {
    const policy = createTagFilterPolicy(["blocked"]);
    const scheduler = createScheduler({
      maxConcurrent: 0,
      policies: [policy]
    });

    const pipeline = createValidationPipeline();
    scheduler.submit("no-metadata", pipeline, {});

    const stats = scheduler.getStats();
    expect(stats.queued).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases — Serialization", () => {
  it("should handle circular references in error", async () => {
    const circularObj: Record<string, unknown> = { name: "circular" };
    circularObj.self = circularObj;

    const pipeline = createPipeline("circular")
      .stage("throw-circular", async () => {
        throw new Error("Error with circular: " + JSON.stringify(circularObj, (key, value) => {
          if (key === "self") return "[Circular]";
          return value;
        }));
      })
      .build();

    const executor = createPipelineExecutor();
    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe("failed");
  });

  it("should format output with special values", () => {
    const translator = createOutputTranslator();
    const response = createNexusResponse("test-id", {
      nullValue: null,
      undefinedValue: undefined,
      infinity: Infinity,
      nan: NaN
    });

    const formatted = translator.format(response);
    expect(formatted.success).toBe(true);
    // Should not throw during serialization
    expect(JSON.stringify(formatted)).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLI CONNECTOR EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases — CLI Connector", () => {
  it("should handle empty args array", () => {
    const cli = createMockCLI([]);
    const args = cli.parseArgs([]);
    expect(args.positional).toEqual([]);
    expect(args.flags.size).toBe(0);
  });

  it("should handle args with equals signs as flag", () => {
    const cli = createMockCLI(["--key=value"]);
    const args = cli.parseArgs(["--key=value"]);
    // Current implementation treats --key=value as a single flag
    expect(args.flags.has("key=value")).toBe(true);
  });

  it("should handle repeated flags", () => {
    const cli = createMockCLI(["--flag", "--flag", "--flag"]);
    const args = cli.parseArgs(["--flag", "--flag", "--flag"]);
    expect(args.flags.has("flag")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILESYSTEM CONNECTOR EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases — Filesystem Connector", () => {
  it("should handle paths with special characters", async () => {
    const mockFs = createMockFilesystem({
      "/path with spaces/file.txt": "content",
      "/path/file (1).txt": "content"
    });

    const content1 = await mockFs.readFile("/path with spaces/file.txt");
    const content2 = await mockFs.readFile("/path/file (1).txt");

    expect(content1).toBe("content");
    expect(content2).toBe("content");
  });

  it("should handle empty file", async () => {
    const mockFs = createMockFilesystem({
      "/empty.txt": ""
    });

    const content = await mockFs.readFile("/empty.txt");
    expect(content).toBe("");
  });

  it("should handle very long path", async () => {
    const longPath = "/" + "a".repeat(200) + "/file.txt";
    const mockFs = createMockFilesystem({
      [longPath]: "content"
    });

    const content = await mockFs.readFile(longPath);
    expect(content).toBe("content");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST ID EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases — Request IDs", () => {
  it("should generate unique IDs rapidly", () => {
    const ids: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const request = createNexusRequest("ANALYZE_TEXT", {});
      ids.push(request.id);
    }

    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(1000);
  });

  it("should include NEXUS prefix in request ID", () => {
    const request = createNexusRequest("ANALYZE_TEXT", {});
    expect(request.id.startsWith("NEXUS-")).toBe(true);
  });

  it("should handle waitFor with invalid job ID format", async () => {
    const scheduler = createScheduler();
    await expect(scheduler.waitFor("invalid-id-format")).rejects.toThrow("not found");
  });
});

