/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — ROUTER TESTS
 * Version: 0.2.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  OperationRegistry,
  getDefaultRegistry,
  resetDefaultRegistry,
  Dispatcher,
  createDispatcher,
  NexusRouter,
  createRouter,
  createDefaultRouter,
  generateRequestId
} from "../src/index.js";
import type {
  NexusRequest,
  NexusOperationType,
  HandlerContext
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATION REGISTRY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Router — OperationRegistry", () => {
  let registry: OperationRegistry;

  beforeEach(() => {
    registry = new OperationRegistry();
  });

  it("should register an operation", () => {
    const handler = async () => "result";
    registry.register("ANALYZE_TEXT", handler);

    expect(registry.has("ANALYZE_TEXT")).toBe(true);
    expect(registry.size).toBe(1);
  });

  it("should throw on duplicate registration", () => {
    registry.register("ANALYZE_TEXT", async () => "result");

    expect(() => {
      registry.register("ANALYZE_TEXT", async () => "other");
    }).toThrow("already registered");
  });

  it("should get registered handler", () => {
    const handler = async () => "result";
    registry.register("ANALYZE_TEXT", handler);

    const retrieved = registry.get("ANALYZE_TEXT");
    expect(retrieved).toBe(handler);
  });

  it("should return undefined for unregistered operation", () => {
    expect(registry.get("QUERY_GENOME")).toBeUndefined();
  });

  it("should list registered operations", () => {
    registry.register("ANALYZE_TEXT", async () => "a");
    registry.register("VALIDATE_INPUT", async () => "b");

    const ops = registry.list();
    expect(ops).toContain("ANALYZE_TEXT");
    expect(ops).toContain("VALIDATE_INPUT");
    expect(ops).toHaveLength(2);
  });

  it("should unregister an operation", () => {
    registry.register("ANALYZE_TEXT", async () => "result");
    expect(registry.has("ANALYZE_TEXT")).toBe(true);

    const removed = registry.unregister("ANALYZE_TEXT");
    expect(removed).toBe(true);
    expect(registry.has("ANALYZE_TEXT")).toBe(false);
  });

  it("should clear all registrations", () => {
    registry.register("ANALYZE_TEXT", async () => "a");
    registry.register("VALIDATE_INPUT", async () => "b");
    expect(registry.size).toBe(2);

    registry.clear();
    expect(registry.size).toBe(0);
  });

  it("should get registration metadata", () => {
    registry.register("ANALYZE_TEXT", async () => "result");

    const metadata = registry.getMetadata("ANALYZE_TEXT");
    expect(metadata).toBeDefined();
    expect(metadata!.type).toBe("ANALYZE_TEXT");
    expect(metadata!.registeredAt).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT REGISTRY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Router — Default Registry", () => {
  beforeEach(() => {
    resetDefaultRegistry();
  });

  it("should return singleton instance", () => {
    const r1 = getDefaultRegistry();
    const r2 = getDefaultRegistry();
    expect(r1).toBe(r2);
  });

  it("should reset and create new instance", () => {
    const r1 = getDefaultRegistry();
    r1.register("ANALYZE_TEXT", async () => "test");

    resetDefaultRegistry();

    const r2 = getDefaultRegistry();
    expect(r2.has("ANALYZE_TEXT")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCHER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Router — Dispatcher", () => {
  let registry: OperationRegistry;
  let dispatcher: Dispatcher;

  beforeEach(() => {
    registry = new OperationRegistry();
    dispatcher = createDispatcher(registry);
  });

  it("should dispatch to registered handler", async () => {
    registry.register("ANALYZE_TEXT", async (payload: string) => {
      return `Analyzed: ${payload}`;
    });

    const request: NexusRequest<string> = {
      id: "test-1",
      type: "ANALYZE_TEXT",
      payload: "Hello",
      timestamp: new Date().toISOString()
    };

    const response = await dispatcher.execute<string, string>(request);

    expect(response.success).toBe(true);
    expect(response.data).toBe("Analyzed: Hello");
    expect(response.requestId).toBe("test-1");
    expect(response.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("should return error for unknown operation (INV-ROUTER-01)", async () => {
    const request: NexusRequest<string> = {
      id: "test-2",
      type: "QUERY_GENOME",
      payload: "test",
      timestamp: new Date().toISOString()
    };

    const response = await dispatcher.execute<string, string>(request);

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe("UNKNOWN_OPERATION");
  });

  it("should include execution time (INV-ROUTER-02)", async () => {
    registry.register("ANALYZE_TEXT", async () => {
      await new Promise(r => setTimeout(r, 10));
      return "done";
    });

    const request: NexusRequest<void> = {
      id: "test-3",
      type: "ANALYZE_TEXT",
      payload: undefined,
      timestamp: new Date().toISOString()
    };

    const response = await dispatcher.execute(request);
    expect(response.executionTimeMs).toBeGreaterThanOrEqual(10);
  });

  it("should preserve request ID (INV-ROUTER-03)", async () => {
    registry.register("ANALYZE_TEXT", async () => "result");

    const request: NexusRequest<void> = {
      id: "my-unique-id-123",
      type: "ANALYZE_TEXT",
      payload: undefined,
      timestamp: new Date().toISOString()
    };

    const response = await dispatcher.execute(request);
    expect(response.requestId).toBe("my-unique-id-123");
  });

  it("should timeout (INV-ROUTER-04)", async () => {
    registry.register("ANALYZE_TEXT", async () => {
      await new Promise(r => setTimeout(r, 500));
      return "result";
    });

    const shortTimeoutDispatcher = dispatcher.withTimeout(50);

    const request: NexusRequest<void> = {
      id: "test-timeout",
      type: "ANALYZE_TEXT",
      payload: undefined,
      timestamp: new Date().toISOString()
    };

    const response = await shortTimeoutDispatcher.execute(request);
    expect(response.success).toBe(false);
    expect(response.error!.code).toBe("TIMEOUT");
  });

  it("should handle handler errors", async () => {
    registry.register("ANALYZE_TEXT", async () => {
      throw new Error("Handler failed");
    });

    const request: NexusRequest<void> = {
      id: "test-error",
      type: "ANALYZE_TEXT",
      payload: undefined,
      timestamp: new Date().toISOString()
    };

    const response = await dispatcher.execute(request);
    expect(response.success).toBe(false);
    expect(response.error!.message).toBe("Handler failed");
  });

  it("should create dispatcher with trace enabled", () => {
    const tracingDispatcher = dispatcher.withTrace(true);
    expect(tracingDispatcher).toBeInstanceOf(Dispatcher);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS ROUTER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Router — NexusRouter", () => {
  it("should create router with createRouter", () => {
    const router = createRouter();
    expect(router).toBeInstanceOf(NexusRouter);
  });

  it("should register and dispatch", async () => {
    const router = createRouter();
    router.register("ANALYZE_TEXT", async (payload: string) => {
      return `Result: ${payload}`;
    });

    const response = await router.execute<string, string>(
      "ANALYZE_TEXT",
      "test"
    );

    expect(response.success).toBe(true);
    expect(response.data).toBe("Result: test");
  });

  it("should chain register calls", () => {
    const router = createRouter()
      .register("ANALYZE_TEXT", async () => "a")
      .register("VALIDATE_INPUT", async () => "b");

    expect(router.getOperations()).toHaveLength(2);
  });

  it("should list operations", () => {
    const router = createRouter();
    router.register("ANALYZE_TEXT", async () => "a");
    router.register("VALIDATE_INPUT", async () => "b");

    const ops = router.getOperations();
    expect(ops).toContain("ANALYZE_TEXT");
    expect(ops).toContain("VALIDATE_INPUT");
  });

  it("should check if operation exists", () => {
    const router = createRouter();
    router.register("ANALYZE_TEXT", async () => "a");

    expect(router.hasOperation("ANALYZE_TEXT")).toBe(true);
    expect(router.hasOperation("QUERY_GENOME")).toBe(false);
  });

  it("should use default seed", async () => {
    const router = createRouter({ defaultSeed: 123 });

    let capturedSeed: number | undefined;
    router.register("ANALYZE_TEXT", async (payload, context) => {
      capturedSeed = context.seed;
      return "done";
    });

    await router.execute("ANALYZE_TEXT", "test");
    expect(capturedSeed).toBe(123);
  });

  it("should override seed in execute", async () => {
    const router = createRouter({ defaultSeed: 42 });

    let capturedSeed: number | undefined;
    router.register("ANALYZE_TEXT", async (payload, context) => {
      capturedSeed = context.seed;
      return "done";
    });

    await router.execute("ANALYZE_TEXT", "test", 999);
    expect(capturedSeed).toBe(999);
  });

  it("should create router with timeout", () => {
    const router = createRouter();
    router.register("ANALYZE_TEXT", async () => "a");

    const timedRouter = router.withTimeout(1000);
    expect(timedRouter.hasOperation("ANALYZE_TEXT")).toBe(true);
  });

  it("should create router with trace", () => {
    const router = createRouter();
    router.register("ANALYZE_TEXT", async () => "a");

    const tracedRouter = router.withTrace(true);
    expect(tracedRouter.hasOperation("ANALYZE_TEXT")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT ROUTER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Router — Default Router", () => {
  it("should create default router with pre-registered handlers", () => {
    const router = createDefaultRouter();

    expect(router.hasOperation("ANALYZE_TEXT")).toBe(true);
    expect(router.hasOperation("VALIDATE_INPUT")).toBe(true);
    expect(router.hasOperation("BUILD_DNA")).toBe(true);
  });

  it("should execute ANALYZE_TEXT on valid input", async () => {
    const router = createDefaultRouter();

    const response = await router.execute(
      "ANALYZE_TEXT",
      { content: "Hello world" }
    );

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });

  it("should fail ANALYZE_TEXT on empty input", async () => {
    const router = createDefaultRouter();

    const response = await router.execute(
      "ANALYZE_TEXT",
      { content: "" }
    );

    expect(response.success).toBe(false);
  });

  it("should execute VALIDATE_INPUT", async () => {
    const router = createDefaultRouter();

    const response = await router.execute(
      "VALIDATE_INPUT",
      { content: "Valid content", seed: 42 }
    );

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Router — Utilities", () => {
  it("generateRequestId should create unique IDs", () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^NEXUS-[a-z0-9]+-[a-z0-9]+$/);
  });
});
