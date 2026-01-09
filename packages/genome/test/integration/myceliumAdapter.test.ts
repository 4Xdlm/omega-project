/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — MYCELIUM ADAPTER INTEGRATION TESTS
 * Phase 29.3 - NASA-Grade L4
 *
 * Tests for Genome ↔ Mycelium integration layer.
 *
 * CATEGORIES:
 * - CAT-INT-A: Happy path (valid input → ok: true)
 * - CAT-INT-B: Rejection propagation (REJ-MYC-* → GenomeMyceliumErr)
 * - CAT-INT-C: Gate fail-fast (GATE-INT-01, GATE-INT-02)
 * - CAT-INT-D: Determinism (same input → same output)
 * - CAT-INT-E: Boundary tests (size limits, edge cases)
 * - CAT-INT-F: Seal reference verification
 *
 * INVARIANTS VERIFIED:
 * - INV-INT-01: Mycelium module is NOT modified (FROZEN)
 * - INV-INT-02: All REJ-MYC-* codes propagated without loss
 * - INV-INT-03: Gates are fail-fast (no silent fallback)
 * - INV-INT-04: seal_ref always attached
 * - INV-INT-05: Deterministic output for same input
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  processWithMycelium,
  isMyceliumOk,
  isMyceliumErr,
  MYCELIUM_SEAL_REF,
  INTEGRATION_GATES,
  ADAPTER_VERSION,
} from "../../src/integrations/myceliumAdapter.js";
import type {
  GenomeMyceliumInput,
  GenomeMyceliumResult,
  GenomeMyceliumOk,
  GenomeMyceliumErr,
} from "../../src/integrations/myceliumTypes.js";

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createValidInput(overrides: Partial<GenomeMyceliumInput> = {}): GenomeMyceliumInput {
  return {
    request_id: "test-req-001",
    text: "This is a valid test text for Mycelium validation.",
    seed: 42,
    mode: "paragraph",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAT-INT-A: HAPPY PATH
// ═══════════════════════════════════════════════════════════════════════════════

describe("CAT-INT-A: Happy Path", () => {
  it("INT-A-01: Valid input returns ok: true", () => {
    const input = createValidInput();
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    expect(isMyceliumOk(result)).toBe(true);
  });

  it("INT-A-02: Valid result contains normalized content", () => {
    const input = createValidInput({ text: "Hello world.\r\nSecond line." });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    if (isMyceliumOk(result)) {
      expect(result.normalized).toBeDefined();
      expect(typeof result.normalized.content).toBe("string");
      // Mycelium normalizes CRLF to LF
      expect(result.normalized.content).not.toContain("\r\n");
    }
  });

  it("INT-A-03: Valid result echoes request_id", () => {
    const input = createValidInput({ request_id: "unique-req-xyz-123" });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    expect(result.request_id).toBe("unique-req-xyz-123");
  });

  it("INT-A-04: Valid result includes seal_ref", () => {
    const input = createValidInput();
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    if (isMyceliumOk(result)) {
      expect(result.seal_ref).toBeDefined();
      expect(result.seal_ref.tag).toBe("v3.30.0");
      expect(result.seal_ref.commit).toBe("35976d1");
      expect(result.seal_ref.scope).toBe("packages/mycelium/");
    }
  });

  it("INT-A-05: Valid result preserves seed", () => {
    const input = createValidInput({ seed: 12345 });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    if (isMyceliumOk(result)) {
      expect(result.normalized.seed).toBe(12345);
    }
  });

  it("INT-A-06: Valid result preserves mode", () => {
    const input = createValidInput({ mode: "sentence" });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    if (isMyceliumOk(result)) {
      expect(result.normalized.mode).toBe("sentence");
    }
  });

  it("INT-A-07: Metadata does not affect processing", () => {
    const input1 = createValidInput({ metadata: { author: "test" } });
    const input2 = createValidInput({ metadata: { author: "different" } });

    const result1 = processWithMycelium(input1);
    const result2 = processWithMycelium(input2);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    if (isMyceliumOk(result1) && isMyceliumOk(result2)) {
      expect(result1.normalized.content).toBe(result2.normalized.content);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CAT-INT-B: REJECTION PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("CAT-INT-B: Rejection Propagation", () => {
  it("INT-B-01: Empty text rejected with REJ-MYC code", () => {
    const input = createValidInput({ text: "" });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    if (isMyceliumErr(result)) {
      expect(result.rej_code).toMatch(/^REJ-MYC-/);
      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe("string");
    }
  });

  it("INT-B-02: Rejection preserves request_id", () => {
    const input = createValidInput({ text: "", request_id: "rej-test-001" });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    expect(result.request_id).toBe("rej-test-001");
  });

  it("INT-B-03: Rejection includes seal_ref", () => {
    const input = createValidInput({ text: "" });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    if (isMyceliumErr(result)) {
      expect(result.seal_ref).toBeDefined();
      expect(result.seal_ref.tag).toBe("v3.30.0");
    }
  });

  it("INT-B-04: Rejection includes category", () => {
    const input = createValidInput({ text: "" });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    if (isMyceliumErr(result)) {
      expect(result.category).toBeDefined();
      expect(typeof result.category).toBe("string");
    }
  });

  it("INT-B-05: Binary content rejected", () => {
    // PDF magic bytes
    const pdfContent = "%PDF-1.4 some binary content";
    const input = createValidInput({ text: pdfContent });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    if (isMyceliumErr(result)) {
      expect(result.rej_code).toMatch(/^REJ-MYC-/);
    }
  });

  it("INT-B-06: Null byte rejected", () => {
    const input = createValidInput({ text: "Hello\x00World" });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    if (isMyceliumErr(result)) {
      expect(result.rej_code).toMatch(/^REJ-MYC-/);
    }
  });

  it("INT-B-07: Whitespace-only text rejected", () => {
    const input = createValidInput({ text: "   \t\n\r\n   " });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    if (isMyceliumErr(result)) {
      expect(result.rej_code).toMatch(/^REJ-MYC-/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CAT-INT-C: GATE FAIL-FAST
// ═══════════════════════════════════════════════════════════════════════════════

describe("CAT-INT-C: Gate Fail-Fast", () => {
  it("INT-C-01: GATE-INT-01 - Empty request_id rejected immediately", () => {
    const input = createValidInput({ request_id: "" });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    if (isMyceliumErr(result)) {
      expect(result.rej_code).toBe("REJ-INT-001");
      expect(result.category).toBe("Params");
    }
  });

  it("INT-C-02: GATE-INT-01 - Whitespace-only request_id rejected", () => {
    const input = createValidInput({ request_id: "   " });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    if (isMyceliumErr(result)) {
      expect(result.rej_code).toBe("REJ-INT-001");
    }
  });

  it("INT-C-03: GATE-INT-02 - Non-string text rejected", () => {
    const input = {
      request_id: "test-001",
      text: 12345 as unknown as string,
    };
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    if (isMyceliumErr(result)) {
      expect(result.rej_code).toBe("REJ-INT-002");
      expect(result.category).toBe("Params");
    }
  });

  it("INT-C-04: Gate rejection is immediate (does not call Mycelium)", () => {
    // Invalid request_id should fail at gate, not reach Mycelium
    const input = createValidInput({ request_id: "" });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    if (isMyceliumErr(result)) {
      // REJ-INT-* = gate rejection (not REJ-MYC-*)
      expect(result.rej_code).toMatch(/^REJ-INT-/);
    }
  });

  it("INT-C-05: Gate constants are defined", () => {
    expect(INTEGRATION_GATES.INPUT_MINIMAL).toBe("GATE-INT-01");
    expect(INTEGRATION_GATES.SCHEMA_VALID).toBe("GATE-INT-02");
    expect(INTEGRATION_GATES.DETERMINISTIC).toBe("GATE-INT-03");
    expect(INTEGRATION_GATES.REJECT_PROPAGATION).toBe("GATE-INT-04");
    expect(INTEGRATION_GATES.SEAL_ATTACHED).toBe("GATE-INT-05");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CAT-INT-D: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe("CAT-INT-D: Determinism [INV-INT-05]", () => {
  it("INT-D-01: Same input produces same output", () => {
    const input = createValidInput({ seed: 42 });
    const result1 = processWithMycelium(input);
    const result2 = processWithMycelium(input);

    expect(result1).toEqual(result2);
  });

  it("INT-D-02: Same input with different request_id produces same normalized content", () => {
    const input1 = createValidInput({ request_id: "req-001", seed: 42 });
    const input2 = createValidInput({ request_id: "req-002", seed: 42 });

    const result1 = processWithMycelium(input1);
    const result2 = processWithMycelium(input2);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    if (isMyceliumOk(result1) && isMyceliumOk(result2)) {
      expect(result1.normalized.content).toBe(result2.normalized.content);
    }
  });

  it("INT-D-03: Determinism across 100 iterations", () => {
    const input = createValidInput({ text: "Determinism test content.", seed: 42 });
    const firstResult = processWithMycelium(input);

    for (let i = 0; i < 100; i++) {
      const result = processWithMycelium(input);
      expect(result).toEqual(firstResult);
    }
  });

  it("INT-D-04: Rejection is deterministic", () => {
    const input = createValidInput({ text: "" });
    const result1 = processWithMycelium(input);
    const result2 = processWithMycelium(input);

    expect(result1).toEqual(result2);
  });

  it("INT-D-05: Different seeds can produce different results (when applicable)", () => {
    const input1 = createValidInput({ seed: 1 });
    const input2 = createValidInput({ seed: 2 });

    const result1 = processWithMycelium(input1);
    const result2 = processWithMycelium(input2);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    if (isMyceliumOk(result1) && isMyceliumOk(result2)) {
      expect(result1.normalized.seed).toBe(1);
      expect(result2.normalized.seed).toBe(2);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CAT-INT-E: BOUNDARY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CAT-INT-E: Boundary Tests", () => {
  it("INT-E-01: Single character text is valid", () => {
    const input = createValidInput({ text: "A" });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
  });

  it("INT-E-02: Very long text within limits is valid", () => {
    const longText = "A".repeat(100000); // 100KB
    const input = createValidInput({ text: longText });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
  });

  it("INT-E-03: Unicode text is valid", () => {
    const input = createValidInput({ text: "Hello 世界 🌍 Émojis café" });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    if (isMyceliumOk(result)) {
      expect(result.normalized.content).toContain("世界");
      expect(result.normalized.content).toContain("🌍");
    }
  });

  it("INT-E-04: Mixed line endings normalized to LF", () => {
    const input = createValidInput({ text: "Line1\r\nLine2\rLine3\nLine4" });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    if (isMyceliumOk(result)) {
      expect(result.normalized.content).not.toContain("\r");
      expect(result.normalized.content.split("\n").length).toBe(4);
    }
  });

  it("INT-E-05: Request ID with special characters is valid", () => {
    const input = createValidInput({ request_id: "req-123_abc.xyz" });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    expect(result.request_id).toBe("req-123_abc.xyz");
  });

  it("INT-E-06: Mode defaults work correctly", () => {
    const input: GenomeMyceliumInput = {
      request_id: "test-001",
      text: "Test content.",
    };
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    if (isMyceliumOk(result)) {
      expect(result.normalized.mode).toBeDefined();
    }
  });

  it("INT-E-07: Seed defaults work correctly", () => {
    const input: GenomeMyceliumInput = {
      request_id: "test-001",
      text: "Test content.",
    };
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    if (isMyceliumOk(result)) {
      expect(typeof result.normalized.seed).toBe("number");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CAT-INT-F: SEAL REFERENCE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("CAT-INT-F: Seal Reference [INV-INT-04]", () => {
  it("INT-F-01: MYCELIUM_SEAL_REF is frozen", () => {
    expect(MYCELIUM_SEAL_REF.tag).toBe("v3.30.0");
    expect(MYCELIUM_SEAL_REF.commit).toBe("35976d1");
    expect(MYCELIUM_SEAL_REF.scope).toBe("packages/mycelium/");
  });

  it("INT-F-02: seal_ref always present in ok result", () => {
    const input = createValidInput();
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    expect(result.seal_ref).toBeDefined();
    expect(result.seal_ref).toEqual(MYCELIUM_SEAL_REF);
  });

  it("INT-F-03: seal_ref always present in err result", () => {
    const input = createValidInput({ text: "" });
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    expect(result.seal_ref).toBeDefined();
    expect(result.seal_ref).toEqual(MYCELIUM_SEAL_REF);
  });

  it("INT-F-04: seal_ref matches expected frozen values", () => {
    const input = createValidInput();
    const result = processWithMycelium(input);

    // These values are from Phase 29.2 FROZEN certification
    expect(result.seal_ref.tag).toBe("v3.30.0");
    expect(result.seal_ref.commit).toBe("35976d1");
    expect(result.seal_ref.scope).toBe("packages/mycelium/");
  });

  it("INT-F-05: ADAPTER_VERSION is defined", () => {
    expect(ADAPTER_VERSION).toBe("1.0.0");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARD TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Type Guards", () => {
  it("isMyceliumOk correctly identifies ok results", () => {
    const okResult: GenomeMyceliumOk = {
      ok: true,
      normalized: { content: "test", seed: 42, mode: "paragraph" },
      request_id: "test",
      seal_ref: MYCELIUM_SEAL_REF,
    };

    expect(isMyceliumOk(okResult)).toBe(true);
    expect(isMyceliumErr(okResult)).toBe(false);
  });

  it("isMyceliumErr correctly identifies err results", () => {
    const errResult: GenomeMyceliumErr = {
      ok: false,
      rej_code: "REJ-MYC-300",
      message: "Test error",
      category: "Content",
      request_id: "test",
      seal_ref: MYCELIUM_SEAL_REF,
    };

    expect(isMyceliumErr(errResult)).toBe(true);
    expect(isMyceliumOk(errResult)).toBe(false);
  });
});
