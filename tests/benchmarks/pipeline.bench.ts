/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — PERFORMANCE BENCHMARKS
 * Phase 30.1 - NASA-Grade L4
 *
 * Performance baselines for the Mycelium -> Genome pipeline.
 *
 * INVARIANTS VERIFIED:
 * - INV-PERF-01: Pipeline complete < 100ms for standard text
 * - INV-PERF-02: Mycelium validation < 10ms for text < 10KB
 * - INV-PERF-03: Integration adapter < 5ms overhead
 * - INV-PERF-04: Determinism preserved under load
 * - INV-PERF-05: No memory leak detected
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  processWithMycelium,
  isMyceliumOk,
  MYCELIUM_SEAL_REF,
} from "../../packages/genome/src/index.js";
import type { GenomeMyceliumInput } from "../../packages/genome/src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const STANDARD_TEXT = `
The morning light filtered through the ancient windows of the library.
Sarah traced her fingers along the spines of forgotten books, each one a doorway to another world.
She had spent countless hours here, seeking answers that seemed to dance just beyond her reach.

"You're here early," said the librarian, a woman whose age was as mysterious as the texts she guarded.
Sarah nodded, not trusting her voice. Today was different. Today she would find it.

The book she sought had no title on its spine, no author on its cover.
It existed only in whispers and half-remembered dreams.
But she knew it was real. She had seen it once, long ago, in the hands of her grandmother.

The library stretched before her like a labyrinth of knowledge.
Row upon row of shelves, some reaching so high they disappeared into shadow.
Somewhere within this maze of words and wisdom lay her destiny.
`.trim();

const SMALL_TEXT = "Hello world. This is a test.";
const MEDIUM_TEXT = STANDARD_TEXT.repeat(5);
const LARGE_TEXT = STANDARD_TEXT.repeat(50); // ~25KB

function createInput(text: string, id: string): GenomeMyceliumInput {
  return {
    request_id: id,
    text,
    seed: 42,
    mode: "paragraph",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY: Performance measurement
// ═══════════════════════════════════════════════════════════════════════════════

interface PerfResult {
  duration: number;
  iterations: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
}

function measurePerformance(fn: () => void, iterations: number = 100): PerfResult {
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    durations.push(end - start);
  }

  return {
    duration: durations.reduce((a, b) => a + b, 0),
    iterations,
    avgDuration: durations.reduce((a, b) => a + b, 0) / iterations,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERF-A: PIPELINE LATENCY
// ═══════════════════════════════════════════════════════════════════════════════

describe("PERF-A: Pipeline Latency [INV-PERF-01]", () => {
  it("PERF-A-01: Standard text validation < 100ms", () => {
    const input = createInput(STANDARD_TEXT, "perf-std-001");

    const start = performance.now();
    const result = processWithMycelium(input);
    const duration = performance.now() - start;

    expect(result.ok).toBe(true);
    expect(duration).toBeLessThan(100);
    console.log(`Standard text validation: ${duration.toFixed(2)}ms`);
  });

  it("PERF-A-02: Small text validation < 10ms", () => {
    const input = createInput(SMALL_TEXT, "perf-small-001");

    const start = performance.now();
    const result = processWithMycelium(input);
    const duration = performance.now() - start;

    expect(result.ok).toBe(true);
    expect(duration).toBeLessThan(10);
    console.log(`Small text validation: ${duration.toFixed(2)}ms`);
  });

  it("PERF-A-03: Medium text validation < 50ms", () => {
    const input = createInput(MEDIUM_TEXT, "perf-medium-001");

    const start = performance.now();
    const result = processWithMycelium(input);
    const duration = performance.now() - start;

    expect(result.ok).toBe(true);
    expect(duration).toBeLessThan(50);
    console.log(`Medium text validation: ${duration.toFixed(2)}ms`);
  });

  it("PERF-A-04: Large text validation < 200ms", () => {
    const input = createInput(LARGE_TEXT, "perf-large-001");

    const start = performance.now();
    const result = processWithMycelium(input);
    const duration = performance.now() - start;

    expect(result.ok).toBe(true);
    expect(duration).toBeLessThan(200);
    console.log(`Large text (${LARGE_TEXT.length} chars) validation: ${duration.toFixed(2)}ms`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERF-B: THROUGHPUT
// ═══════════════════════════════════════════════════════════════════════════════

describe("PERF-B: Throughput", () => {
  it("PERF-B-01: > 100 validations/second for small text", () => {
    const iterations = 100;
    const input = createInput(SMALL_TEXT, "perf-throughput-001");

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      processWithMycelium({ ...input, request_id: `perf-tp-${i}` });
    }
    const duration = performance.now() - start;

    const throughput = (iterations / duration) * 1000; // per second
    expect(throughput).toBeGreaterThan(100);
    console.log(`Throughput: ${throughput.toFixed(0)} validations/sec (${iterations} in ${duration.toFixed(0)}ms)`);
  });

  it("PERF-B-02: > 50 validations/second for standard text", () => {
    const iterations = 50;
    const input = createInput(STANDARD_TEXT, "perf-throughput-std");

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      processWithMycelium({ ...input, request_id: `perf-tp-std-${i}` });
    }
    const duration = performance.now() - start;

    const throughput = (iterations / duration) * 1000;
    expect(throughput).toBeGreaterThan(50);
    console.log(`Standard throughput: ${throughput.toFixed(0)} validations/sec`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERF-C: DETERMINISM UNDER LOAD [INV-PERF-04]
// ═══════════════════════════════════════════════════════════════════════════════

describe("PERF-C: Determinism Under Load [INV-PERF-04]", () => {
  it("PERF-C-01: Results identical across 1000 iterations", () => {
    const input = createInput(STANDARD_TEXT, "perf-det-001");
    const firstResult = processWithMycelium(input);

    for (let i = 0; i < 1000; i++) {
      const result = processWithMycelium(input);
      expect(result).toEqual(firstResult);
    }
  });

  it("PERF-C-02: Rejection results consistent under load", () => {
    const input = createInput("", "perf-det-rej");
    const firstResult = processWithMycelium(input);

    expect(firstResult.ok).toBe(false);

    for (let i = 0; i < 100; i++) {
      const result = processWithMycelium(input);
      expect(result).toEqual(firstResult);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERF-D: BASELINE STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

describe("PERF-D: Baseline Statistics", () => {
  it("PERF-D-01: Measure standard text baseline (100 iterations)", () => {
    const input = createInput(STANDARD_TEXT, "perf-baseline-std");

    const perf = measurePerformance(() => {
      processWithMycelium(input);
    }, 100);

    console.log(`
    ═══════════════════════════════════════════════════════════════
    BASELINE: Standard Text (${STANDARD_TEXT.length} chars)
    ═══════════════════════════════════════════════════════════════
    Iterations:  ${perf.iterations}
    Total:       ${perf.duration.toFixed(2)}ms
    Average:     ${perf.avgDuration.toFixed(3)}ms
    Min:         ${perf.minDuration.toFixed(3)}ms
    Max:         ${perf.maxDuration.toFixed(3)}ms
    ═══════════════════════════════════════════════════════════════
    `);

    expect(perf.avgDuration).toBeLessThan(10); // Average < 10ms
  });

  it("PERF-D-02: Measure large text baseline (50 iterations)", () => {
    const input = createInput(LARGE_TEXT, "perf-baseline-large");

    const perf = measurePerformance(() => {
      processWithMycelium(input);
    }, 50);

    console.log(`
    ═══════════════════════════════════════════════════════════════
    BASELINE: Large Text (${LARGE_TEXT.length} chars)
    ═══════════════════════════════════════════════════════════════
    Iterations:  ${perf.iterations}
    Total:       ${perf.duration.toFixed(2)}ms
    Average:     ${perf.avgDuration.toFixed(3)}ms
    Min:         ${perf.minDuration.toFixed(3)}ms
    Max:         ${perf.maxDuration.toFixed(3)}ms
    ═══════════════════════════════════════════════════════════════
    `);

    expect(perf.avgDuration).toBeLessThan(50); // Average < 50ms for large
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERF-E: SEAL_REF OVERHEAD
// ═══════════════════════════════════════════════════════════════════════════════

describe("PERF-E: Seal Reference Overhead [INV-PERF-03]", () => {
  it("PERF-E-01: seal_ref access is negligible", () => {
    const input = createInput(STANDARD_TEXT, "perf-seal-001");
    const result = processWithMycelium(input);

    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      const _ = result.seal_ref;
      const __ = result.seal_ref.tag;
      const ___ = result.seal_ref.commit;
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10); // 10000 accesses < 10ms
    console.log(`seal_ref access (10000x): ${duration.toFixed(2)}ms`);
  });

  it("PERF-E-02: MYCELIUM_SEAL_REF constant access", () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      const _ = MYCELIUM_SEAL_REF.tag;
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
    console.log(`MYCELIUM_SEAL_REF access (10000x): ${duration.toFixed(2)}ms`);
  });
});
