/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — STRESS TESTS
 * Phase 31.0 - NASA-Grade L4
 *
 * High-load stress tests for pipeline robustness.
 *
 * INVARIANTS VERIFIED:
 * - INV-STRESS-01: Pipeline stable under high load (1000+ iterations)
 * - INV-STRESS-02: No data corruption under stress
 * - INV-STRESS-04: No crash/unhandled exception
 * - INV-STRESS-05: Determinism maintained under stress
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  processWithMycelium,
  isMyceliumOk,
  isMyceliumErr,
  MYCELIUM_SEAL_REF,
} from "../../packages/genome/src/index.js";
import type { GenomeMyceliumInput } from "../../packages/genome/src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const STANDARD_TEXT = "The quick brown fox jumps over the lazy dog. ".repeat(20);
const LARGE_TEXT = STANDARD_TEXT.repeat(100); // ~90KB

function createInput(text: string, id: string): GenomeMyceliumInput {
  return {
    request_id: id,
    text,
    seed: 42,
    mode: "paragraph",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRESS-A: HIGH ITERATION COUNT [INV-STRESS-01]
// ═══════════════════════════════════════════════════════════════════════════════

describe("STRESS-A: High Iteration Count [INV-STRESS-01]", () => {
  it("STRESS-A-01: 1000 sequential validations", () => {
    const input = createInput(STANDARD_TEXT, "stress-seq");
    const firstResult = processWithMycelium(input);

    expect(firstResult.ok).toBe(true);

    for (let i = 0; i < 1000; i++) {
      const result = processWithMycelium(input);
      expect(result.ok).toBe(true);
    }
  });

  it("STRESS-A-02: 500 validations with unique request_ids", () => {
    for (let i = 0; i < 500; i++) {
      const input = createInput(STANDARD_TEXT, `stress-unique-${i}`);
      const result = processWithMycelium(input);
      expect(result.ok).toBe(true);
      expect(result.request_id).toBe(`stress-unique-${i}`);
    }
  });

  it("STRESS-A-03: 200 large text validations", () => {
    const input = createInput(LARGE_TEXT, "stress-large");

    for (let i = 0; i < 200; i++) {
      const result = processWithMycelium(input);
      expect(result.ok).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRESS-B: DETERMINISM UNDER STRESS [INV-STRESS-05]
// ═══════════════════════════════════════════════════════════════════════════════

describe("STRESS-B: Determinism Under Stress [INV-STRESS-05]", () => {
  it("STRESS-B-01: Identical results across 1000 iterations", () => {
    const input = createInput(STANDARD_TEXT, "stress-det");
    const firstResult = processWithMycelium(input);

    for (let i = 0; i < 1000; i++) {
      const result = processWithMycelium(input);
      expect(result).toEqual(firstResult);
    }
  });

  it("STRESS-B-02: seal_ref consistent across all iterations", () => {
    const input = createInput(STANDARD_TEXT, "stress-seal");

    for (let i = 0; i < 500; i++) {
      const result = processWithMycelium(input);
      expect(result.seal_ref).toEqual(MYCELIUM_SEAL_REF);
    }
  });

  it("STRESS-B-03: Rejection determinism under stress", () => {
    const input = createInput("", "stress-rej-det");
    const firstResult = processWithMycelium(input);

    expect(firstResult.ok).toBe(false);

    for (let i = 0; i < 500; i++) {
      const result = processWithMycelium(input);
      expect(result).toEqual(firstResult);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRESS-C: DATA INTEGRITY [INV-STRESS-02]
// ═══════════════════════════════════════════════════════════════════════════════

describe("STRESS-C: Data Integrity [INV-STRESS-02]", () => {
  it("STRESS-C-01: No data corruption in normalized content", () => {
    const input = createInput(STANDARD_TEXT, "stress-integrity");
    const firstResult = processWithMycelium(input);

    expect(firstResult.ok).toBe(true);
    if (!isMyceliumOk(firstResult)) throw new Error("Expected ok");

    const expectedContent = firstResult.normalized.content;

    for (let i = 0; i < 500; i++) {
      const result = processWithMycelium(input);
      if (isMyceliumOk(result)) {
        expect(result.normalized.content).toBe(expectedContent);
      }
    }
  });

  it("STRESS-C-02: Seed preserved under stress", () => {
    const input = createInput(STANDARD_TEXT, "stress-seed");

    for (let i = 0; i < 500; i++) {
      const result = processWithMycelium(input);
      if (isMyceliumOk(result)) {
        expect(result.normalized.seed).toBe(42);
      }
    }
  });

  it("STRESS-C-03: Mode preserved under stress", () => {
    const input = createInput(STANDARD_TEXT, "stress-mode");

    for (let i = 0; i < 500; i++) {
      const result = processWithMycelium(input);
      if (isMyceliumOk(result)) {
        expect(result.normalized.mode).toBe("paragraph");
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRESS-D: MIXED WORKLOAD
// ═══════════════════════════════════════════════════════════════════════════════

describe("STRESS-D: Mixed Workload", () => {
  it("STRESS-D-01: Alternating valid/invalid inputs", () => {
    for (let i = 0; i < 500; i++) {
      const validInput = createInput(STANDARD_TEXT, `stress-mixed-valid-${i}`);
      const invalidInput = createInput("", `stress-mixed-invalid-${i}`);

      const validResult = processWithMycelium(validInput);
      const invalidResult = processWithMycelium(invalidInput);

      expect(validResult.ok).toBe(true);
      expect(invalidResult.ok).toBe(false);
    }
  });

  it("STRESS-D-02: Varying text sizes", () => {
    const sizes = [10, 100, 1000, 5000, 10000];

    for (let round = 0; round < 100; round++) {
      for (const size of sizes) {
        const text = "A".repeat(size);
        const input = createInput(text, `stress-size-${size}-${round}`);
        const result = processWithMycelium(input);
        expect(result.ok).toBe(true);
      }
    }
  });

  it("STRESS-D-03: Rapid fire requests", () => {
    const start = performance.now();
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const input = createInput(STANDARD_TEXT, `rapid-${i}`);
      processWithMycelium(input);
    }

    const duration = performance.now() - start;
    // Performance metric verified by expect() below - no console output in tests

    // Should complete within reasonable time
    expect(duration).toBeLessThan(5000); // 5 seconds max
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRESS-E: NO CRASH GUARANTEE [INV-STRESS-04]
// ═══════════════════════════════════════════════════════════════════════════════

describe("STRESS-E: No Crash Guarantee [INV-STRESS-04]", () => {
  it("STRESS-E-01: No crash with malformed inputs", () => {
    const malformedInputs = [
      { request_id: "", text: "" },
      { request_id: "x", text: "\x00\x00\x00" },
      { request_id: "y", text: "%PDF-1.4" },
      { request_id: "   ", text: "valid" },
      { request_id: "z", text: "   " },
    ];

    for (const input of malformedInputs) {
      // Should not throw
      expect(() => {
        processWithMycelium(input as GenomeMyceliumInput);
      }).not.toThrow();
    }
  });

  it("STRESS-E-02: Graceful handling of edge request_ids", () => {
    const edgeIds = [
      "a".repeat(10000), // Very long
      "🎉🚀🌍", // Emojis
      "test\n\t\r", // With whitespace
      "123", // Numeric-like
    ];

    for (const id of edgeIds) {
      expect(() => {
        const input: GenomeMyceliumInput = {
          request_id: id,
          text: "Valid content",
        };
        processWithMycelium(input);
      }).not.toThrow();
    }
  });
});
