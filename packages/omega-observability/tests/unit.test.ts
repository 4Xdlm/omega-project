// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA OBSERVABILITY — UNIT TESTS
// packages/omega-observability/tests/unit.test.ts
// Version: 1.0.0
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ProgressEmitter,
  createNoopEmitter,
  createCliEmitter,
  createCiEmitter,
  createCallbackEmitter,
  createTestEmitter,
  formatCli,
  formatJsonl,
  formatDuration,
  formatBytes,
  formatRate,
  formatNumber,
  DEFAULT_PROGRESS_OPTIONS,
  VALID_PHASES,
  isValidPhase,
  type ProgressEvent,
  type ProgressOptions,
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATTERS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Formatters", () => {
  describe("formatDuration", () => {
    it("should format seconds correctly", () => {
      expect(formatDuration(0)).toBe("00:00");
      expect(formatDuration(1000)).toBe("00:01");
      expect(formatDuration(59000)).toBe("00:59");
    });

    it("should format minutes correctly", () => {
      expect(formatDuration(60000)).toBe("01:00");
      expect(formatDuration(90000)).toBe("01:30");
      expect(formatDuration(3599000)).toBe("59:59");
    });

    it("should format hours correctly", () => {
      expect(formatDuration(3600000)).toBe("01:00:00");
      expect(formatDuration(3661000)).toBe("01:01:01");
      expect(formatDuration(36000000)).toBe("10:00:00");
    });

    it("should handle edge cases", () => {
      expect(formatDuration(-1000)).toBe("--:--");
      expect(formatDuration(Infinity)).toBe("--:--");
      expect(formatDuration(NaN)).toBe("--:--");
    });
  });

  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(500)).toBe("500 B");
      expect(formatBytes(1023)).toBe("1023 B");
    });

    it("should format KB correctly", () => {
      expect(formatBytes(1024)).toBe("1.0 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(1048575)).toBe("1024.0 KB");
    });

    it("should format MB correctly", () => {
      expect(formatBytes(1048576)).toBe("1.0 MB");
      expect(formatBytes(1572864)).toBe("1.5 MB");
    });

    it("should format GB correctly", () => {
      expect(formatBytes(1073741824)).toBe("1.0 GB");
    });

    it("should handle edge cases", () => {
      expect(formatBytes(-100)).toBe("0 B");
      expect(formatBytes(Infinity)).toBe("0 B");
    });
  });

  describe("formatRate", () => {
    it("should format rate correctly", () => {
      expect(formatRate(1000, 1000, "items")).toBe("1000.0 items/s");
      expect(formatRate(100, 1000, "seg")).toBe("100.0 seg/s");
      expect(formatRate(50, 500, "ops")).toBe("100.0 ops/s");
    });

    it("should format K rate correctly", () => {
      expect(formatRate(10000, 1000, "items")).toBe("10.0K items/s");
    });

    it("should handle edge cases", () => {
      expect(formatRate(0, 0, "items")).toBe("-- items/s");
      expect(formatRate(100, 0, "items")).toBe("-- items/s");
    });
  });

  describe("formatNumber", () => {
    it("should format numbers with separators", () => {
      expect(formatNumber(1000)).toBe("1,000");
      expect(formatNumber(1000000)).toBe("1,000,000");
      expect(formatNumber(123)).toBe("123");
    });

    it("should handle edge cases", () => {
      expect(formatNumber(Infinity)).toBe("--");
      expect(formatNumber(NaN)).toBe("--");
    });
  });

  describe("formatJsonl", () => {
    it("should format event as JSON", () => {
      const event: ProgressEvent = {
        phase: "analyze",
        current: 50,
        total: 100,
        percent: 50,
        elapsed_ms: 5000,
      };

      const json = formatJsonl(event);
      const parsed = JSON.parse(json);

      expect(parsed.phase).toBe("analyze");
      expect(parsed.current).toBe(50);
      expect(parsed.total).toBe(100);
      expect(parsed.percent).toBe(50);
    });

    it("should exclude undefined values", () => {
      const event: ProgressEvent = {
        phase: "read",
        current: 100,
        elapsed_ms: 1000,
      };

      const json = formatJsonl(event);
      const parsed = JSON.parse(json);

      expect(parsed.total).toBeUndefined();
      expect(parsed.percent).toBeUndefined();
      expect(parsed.eta_ms).toBeUndefined();
    });
  });

  describe("formatCli", () => {
    it("should format event for CLI", () => {
      const event: ProgressEvent = {
        phase: "analyze",
        current: 50,
        total: 100,
        percent: 50,
        elapsed_ms: 60000,
        eta_ms: 60000,
      };

      const options: ProgressOptions = {
        ...DEFAULT_PROGRESS_OPTIONS,
        enabled: true,
        format: "cli",
      };

      const cli = formatCli(event, options);

      expect(cli).toContain("[analyze");
      expect(cli).toContain("50%");
      expect(cli).toContain("50/100");
      expect(cli).toContain("01:00");
      expect(cli).toContain("ETA");
      expect(cli.startsWith("\r")).toBe(true);
    });

    it("should handle unknown percent", () => {
      const event: ProgressEvent = {
        phase: "read",
        current: 1000,
        elapsed_ms: 1000,
      };

      const cli = formatCli(event, DEFAULT_PROGRESS_OPTIONS);

      expect(cli).toContain("--%");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Types", () => {
  describe("VALID_PHASES", () => {
    it("should contain all 8 phases", () => {
      expect(VALID_PHASES.size).toBe(8);
      expect(VALID_PHASES.has("init")).toBe(true);
      expect(VALID_PHASES.has("read")).toBe(true);
      expect(VALID_PHASES.has("segment")).toBe(true);
      expect(VALID_PHASES.has("analyze")).toBe(true);
      expect(VALID_PHASES.has("dna")).toBe(true);
      expect(VALID_PHASES.has("aggregate")).toBe(true);
      expect(VALID_PHASES.has("write")).toBe(true);
      expect(VALID_PHASES.has("done")).toBe(true);
    });
  });

  describe("isValidPhase", () => {
    it("should return true for valid phases", () => {
      expect(isValidPhase("init")).toBe(true);
      expect(isValidPhase("analyze")).toBe(true);
      expect(isValidPhase("done")).toBe(true);
    });

    it("should return false for invalid phases", () => {
      expect(isValidPhase("invalid")).toBe(false);
      expect(isValidPhase("")).toBe(false);
      expect(isValidPhase("ANALYZE")).toBe(false);
    });
  });

  describe("DEFAULT_PROGRESS_OPTIONS", () => {
    it("should have correct defaults", () => {
      expect(DEFAULT_PROGRESS_OPTIONS.enabled).toBe(false);
      expect(DEFAULT_PROGRESS_OPTIONS.format).toBe("none");
      expect(DEFAULT_PROGRESS_OPTIONS.throttle_ms).toBe(100);
      expect(DEFAULT_PROGRESS_OPTIONS.show_eta).toBe(true);
      expect(DEFAULT_PROGRESS_OPTIONS.show_rate).toBe(true);
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(DEFAULT_PROGRESS_OPTIONS)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMITTER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("ProgressEmitter", () => {
  describe("createNoopEmitter", () => {
    it("should create disabled emitter", () => {
      const emitter = createNoopEmitter();
      expect(emitter.isEnabled()).toBe(false);
    });

    it("should not emit events when disabled", () => {
      const emitter = createNoopEmitter();
      emitter.emit("read", 100, 200);
      expect(emitter.getLastEvent()).toBeNull();
      expect(emitter.getEventCount()).toBe(0);
    });
  });

  describe("createCliEmitter", () => {
    it("should create CLI emitter with correct options", () => {
      const emitter = createCliEmitter(50);
      const options = emitter.getOptions();

      expect(options.enabled).toBe(true);
      expect(options.format).toBe("cli");
      expect(options.throttle_ms).toBe(50);
    });
  });

  describe("createCiEmitter", () => {
    it("should create CI emitter with JSONL format", () => {
      const emitter = createCiEmitter();
      const options = emitter.getOptions();

      expect(options.enabled).toBe(true);
      expect(options.format).toBe("jsonl");
      expect(options.throttle_ms).toBe(1000);
    });
  });

  describe("createTestEmitter", () => {
    it("should create emitter that collects events", async () => {
      const [emitter, events] = createTestEmitter();

      emitter.emit("read", 100, 200);
      emitter.emit("segment", 1, 10);
      emitter.emit("analyze", 1, 10);

      // Wait for microtasks
      await new Promise((r) => setTimeout(r, 10));

      expect(events.length).toBe(3);
      expect(events[0]?.phase).toBe("read");
      expect(events[1]?.phase).toBe("segment");
      expect(events[2]?.phase).toBe("analyze");
    });
  });

  describe("emit", () => {
    it("should emit events with correct properties", async () => {
      const [emitter, events] = createTestEmitter();

      emitter.emit("analyze", 50, 100);

      await new Promise((r) => setTimeout(r, 10));

      expect(events.length).toBe(1);
      const event = events[0]!;

      expect(event.phase).toBe("analyze");
      expect(event.current).toBe(50);
      expect(event.total).toBe(100);
      expect(event.percent).toBe(50);
      expect(event.elapsed_ms).toBeGreaterThanOrEqual(0);
    });

    it("should freeze events (readonly)", async () => {
      const [emitter, events] = createTestEmitter();

      emitter.emit("read", 100, 200);

      await new Promise((r) => setTimeout(r, 10));

      expect(events.length).toBe(1);
      expect(Object.isFrozen(events[0])).toBe(true);
    });

    it("should calculate percent correctly", async () => {
      const [emitter, events] = createTestEmitter();

      emitter.emit("analyze", 25, 100);
      emitter.emit("analyze", 50, 100);
      emitter.emit("analyze", 75, 100);
      emitter.emit("analyze", 100, 100);

      await new Promise((r) => setTimeout(r, 10));

      expect(events[0]?.percent).toBe(25);
      expect(events[1]?.percent).toBe(50);
      expect(events[2]?.percent).toBe(75);
      expect(events[3]?.percent).toBe(100);
    });

    it("should handle undefined total", async () => {
      const [emitter, events] = createTestEmitter();

      emitter.emit("read", 1000);

      await new Promise((r) => setTimeout(r, 10));

      expect(events[0]?.total).toBeUndefined();
      expect(events[0]?.percent).toBeUndefined();
    });
  });

  describe("throttling", () => {
    it("should throttle events", async () => {
      const events: ProgressEvent[] = [];
      const emitter = new ProgressEmitter({
        enabled: true,
        format: "none",
        throttle_ms: 50,
        callback: (e) => events.push(e),
      });

      // Emit 20 events rapidly
      for (let i = 0; i < 20; i++) {
        emitter.emit("analyze", i, 20);
      }

      await new Promise((r) => setTimeout(r, 10));

      // Should be throttled to 1-2 events
      expect(events.length).toBeLessThanOrEqual(2);
    });

    it("should not throttle 'done' events", async () => {
      const [emitter, events] = createTestEmitter();

      emitter.emit("done", 1, 1);
      emitter.emit("done", 1, 1);
      emitter.emit("done", 1, 1);

      await new Promise((r) => setTimeout(r, 10));

      // All 'done' events should be emitted
      expect(events.filter((e) => e.phase === "done").length).toBe(3);
    });
  });

  describe("helper methods", () => {
    it("should have working init method", async () => {
      const [emitter, events] = createTestEmitter();

      emitter.init("Starting...");

      await new Promise((r) => setTimeout(r, 10));

      expect(events[0]?.phase).toBe("init");
      expect(events[0]?.message).toBe("Starting...");
    });

    it("should have working done method", async () => {
      const [emitter, events] = createTestEmitter();

      emitter.done("abc123def456", { segments_count: 42 });

      await new Promise((r) => setTimeout(r, 10));

      expect(events[0]?.phase).toBe("done");
      expect(events[0]?.metadata?.root_hash).toBe("abc123def456");
      expect(events[0]?.metadata?.segments_count).toBe(42);
    });

    it("should have working read method", async () => {
      const [emitter, events] = createTestEmitter();

      emitter.read(1000, 5000, "test.txt");

      await new Promise((r) => setTimeout(r, 10));

      expect(events[0]?.phase).toBe("read");
      expect(events[0]?.current).toBe(1000);
      expect(events[0]?.total).toBe(5000);
      expect(events[0]?.file).toBe("test.txt");
    });

    it("should have working segment method", async () => {
      const [emitter, events] = createTestEmitter();

      emitter.segment(4, 10); // 0-based index

      await new Promise((r) => setTimeout(r, 10));

      expect(events[0]?.phase).toBe("segment");
      expect(events[0]?.current).toBe(5); // 1-based for display
      expect(events[0]?.total).toBe(10);
    });

    it("should have working aggregate method", async () => {
      const [emitter, events] = createTestEmitter();

      emitter.aggregate("start");
      emitter.aggregate("end", "Done!");

      await new Promise((r) => setTimeout(r, 10));

      expect(events[0]?.phase).toBe("aggregate");
      expect(events[0]?.current).toBe(0);
      expect(events[1]?.current).toBe(1);
      expect(events[1]?.message).toBe("Done!");
    });
  });

  describe("callback error handling", () => {
    it("should not crash on callback error", async () => {
      const emitter = new ProgressEmitter({
        enabled: true,
        format: "none",
        throttle_ms: 0,
        callback: () => {
          throw new Error("Callback error!");
        },
      });

      // Should not throw
      expect(() => {
        emitter.emit("read", 100, 200);
      }).not.toThrow();

      await new Promise((r) => setTimeout(r, 10));

      expect(emitter.getEventCount()).toBe(1);
    });
  });

  describe("output stream", () => {
    it("should write to custom output stream", () => {
      const writes: string[] = [];
      const mockStream = {
        write: (data: string) => {
          writes.push(data);
          return true;
        },
      } as NodeJS.WritableStream;

      const emitter = new ProgressEmitter({
        enabled: true,
        format: "jsonl",
        throttle_ms: 0,
        output: mockStream,
      });

      emitter.emit("read", 100, 200);

      expect(writes.length).toBe(1);
      expect(writes[0]).toContain('"phase":"read"');
    });

    it("should not crash on output stream error", () => {
      const mockStream = {
        write: () => {
          throw new Error("Stream error!");
        },
      } as unknown as NodeJS.WritableStream;

      const emitter = new ProgressEmitter({
        enabled: true,
        format: "jsonl",
        throttle_ms: 0,
        output: mockStream,
      });

      expect(() => {
        emitter.emit("read", 100, 200);
      }).not.toThrow();
    });
  });

  describe("getters", () => {
    it("should return elapsed time", async () => {
      const emitter = createNoopEmitter();

      await new Promise((r) => setTimeout(r, 50));

      expect(emitter.getElapsedMs()).toBeGreaterThanOrEqual(50);
    });

    it("should return event count", async () => {
      const [emitter] = createTestEmitter();

      expect(emitter.getEventCount()).toBe(0);

      emitter.emit("read", 1);
      emitter.emit("read", 2);
      emitter.emit("read", 3);

      expect(emitter.getEventCount()).toBe(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases", () => {
  it("should handle very large numbers", async () => {
    const [emitter, events] = createTestEmitter();

    emitter.emit("read", 1e12, 1e15);

    await new Promise((r) => setTimeout(r, 10));

    expect(events[0]?.current).toBe(1e12);
    expect(events[0]?.total).toBe(1e15);
  });

  it("should handle zero values", async () => {
    const [emitter, events] = createTestEmitter();

    emitter.emit("read", 0, 0);

    await new Promise((r) => setTimeout(r, 10));

    expect(events[0]?.current).toBe(0);
    expect(events[0]?.percent).toBeUndefined(); // Can't calculate with 0 total
  });

  it("should handle rapid phase changes", async () => {
    const [emitter, events] = createTestEmitter();

    emitter.emit("read", 1);
    emitter.emit("segment", 1);
    emitter.emit("analyze", 1);
    emitter.emit("dna", 1);
    emitter.emit("aggregate", 1);
    emitter.emit("write", 1);
    emitter.emit("done", 1);

    await new Promise((r) => setTimeout(r, 10));

    // Each phase should have exactly 1 event (no throttle for different phases)
    const phases = events.map((e) => e.phase);
    expect(phases).toContain("read");
    expect(phases).toContain("segment");
    expect(phases).toContain("analyze");
    expect(phases).toContain("dna");
    expect(phases).toContain("aggregate");
    expect(phases).toContain("write");
    expect(phases).toContain("done");
  });
});
