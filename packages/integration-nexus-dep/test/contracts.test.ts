/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — CONTRACTS TESTS
 * Version: 0.1.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  EMOTION14_LIST,
  isNexusError,
  isSuccessResponse,
  isErrorResponse,
  createNexusError,
  validationError,
  adapterError,
  timeoutError,
  determinismViolation,
  sanctuaryAccessDenied,
  unknownOperationError,
  ERROR_CATALOG,
  NexusOperationError,
  isNexusOperationError,
  extractNexusError,
  validateContentSize,
  normalizeWeights,
  DEFAULT_SEED,
  MAX_CONTENT_SIZE,
  MIN_CONTENT_SIZE
} from "../src/contracts/index.js";
import type {
  NexusError,
  NexusResponse,
  NexusRequest,
  CompareWeights
} from "../src/contracts/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION14 TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Contracts — Emotion14", () => {
  it("should have exactly 14 emotions", () => {
    expect(EMOTION14_LIST).toHaveLength(14);
  });

  it("should contain canonical emotions", () => {
    const expected = [
      "joy", "sadness", "anger", "fear", "surprise", "disgust",
      "trust", "anticipation", "love", "guilt", "shame", "pride",
      "envy", "hope"
    ];
    expect(EMOTION14_LIST).toEqual(expected);
  });

  it("should be frozen (immutable)", () => {
    expect(Object.isFrozen(EMOTION14_LIST)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARD TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Contracts — Type Guards", () => {
  it("isNexusError should correctly identify NexusError", () => {
    const error: NexusError = {
      code: "VALIDATION_FAILED",
      message: "Test error",
      timestamp: new Date().toISOString()
    };
    expect(isNexusError(error)).toBe(true);
    expect(isNexusError(null)).toBe(false);
    expect(isNexusError({})).toBe(false);
    expect(isNexusError({ code: "X" })).toBe(false);
  });

  it("isSuccessResponse should identify success responses", () => {
    const success: NexusResponse<string> = {
      requestId: "test-1",
      success: true,
      data: "result",
      executionTimeMs: 10
    };
    const failure: NexusResponse<string> = {
      requestId: "test-2",
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "failed",
        timestamp: new Date().toISOString()
      },
      executionTimeMs: 5
    };
    expect(isSuccessResponse(success)).toBe(true);
    expect(isSuccessResponse(failure)).toBe(false);
  });

  it("isErrorResponse should identify error responses", () => {
    const error: NexusResponse<string> = {
      requestId: "test-1",
      success: false,
      error: {
        code: "ADAPTER_ERROR",
        message: "error",
        timestamp: new Date().toISOString()
      },
      executionTimeMs: 10
    };
    expect(isErrorResponse(error)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR FACTORY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Contracts — Error Factories", () => {
  it("createNexusError should create frozen error", () => {
    const error = createNexusError("TIMEOUT", "Operation timed out", "test");
    expect(error.code).toBe("TIMEOUT");
    expect(error.message).toBe("Operation timed out");
    expect(error.source).toBe("test");
    expect(error.timestamp).toBeDefined();
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("validationError should set correct code", () => {
    const error = validationError("Invalid input");
    expect(error.code).toBe("VALIDATION_FAILED");
  });

  it("adapterError should format message correctly", () => {
    const error = adapterError("genome", "analyze", "failed");
    expect(error.message).toBe("genome.analyze: failed");
    expect(error.source).toBe("genome");
  });

  it("timeoutError should include timeout value", () => {
    const error = timeoutError("analyze", 5000);
    expect(error.code).toBe("TIMEOUT");
    expect(error.message).toContain("5000ms");
  });

  it("determinismViolation should include hash comparison", () => {
    const error = determinismViolation("abc123", "def456", "test");
    expect(error.code).toBe("DETERMINISM_VIOLATION");
    expect(error.message).toContain("abc123");
    expect(error.message).toContain("def456");
  });

  it("sanctuaryAccessDenied should identify sanctuary and operation", () => {
    const error = sanctuaryAccessDenied("genome", "write");
    expect(error.code).toBe("SANCTUARY_ACCESS_DENIED");
    expect(error.message).toContain("genome");
    expect(error.message).toContain("write");
  });

  it("unknownOperationError should identify operation", () => {
    const error = unknownOperationError("INVALID_OP");
    expect(error.code).toBe("UNKNOWN_OPERATION");
    expect(error.message).toContain("INVALID_OP");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CATALOG TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Contracts — Error Catalog", () => {
  it("should have all error codes", () => {
    const codes = [
      "VALIDATION_FAILED",
      "ADAPTER_ERROR",
      "TIMEOUT",
      "DETERMINISM_VIOLATION",
      "SANCTUARY_ACCESS_DENIED",
      "UNKNOWN_OPERATION"
    ];
    for (const code of codes) {
      expect(ERROR_CATALOG).toHaveProperty(code);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS OPERATION ERROR TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Contracts — NexusOperationError", () => {
  it("should wrap NexusError", () => {
    const nexusError = createNexusError("TIMEOUT", "test", "source");
    const opError = new NexusOperationError(nexusError);

    expect(opError.message).toBe("test");
    expect(opError.name).toBe("NexusOperationError");
    expect(opError.nexusError).toBe(nexusError);
  });

  it("toJSON should return nexusError", () => {
    const nexusError = createNexusError("ADAPTER_ERROR", "fail", "x");
    const opError = new NexusOperationError(nexusError);
    expect(opError.toJSON()).toBe(nexusError);
  });

  it("isNexusOperationError should detect correctly", () => {
    const nexusError = createNexusError("TIMEOUT", "test");
    const opError = new NexusOperationError(nexusError);

    expect(isNexusOperationError(opError)).toBe(true);
    expect(isNexusOperationError(new Error("test"))).toBe(false);
    expect(isNexusOperationError(null)).toBe(false);
  });

  it("extractNexusError should extract from various sources", () => {
    const nexusError = createNexusError("TIMEOUT", "test");
    const opError = new NexusOperationError(nexusError);

    expect(extractNexusError(opError)).toBe(nexusError);

    const regularError = new Error("regular");
    const extracted = extractNexusError(regularError);
    expect(extracted.code).toBe("ADAPTER_ERROR");
    expect(extracted.message).toBe("regular");

    const stringError = extractNexusError("string error");
    expect(stringError.message).toBe("string error");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// IO SCHEMA TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Contracts — IO Schema", () => {
  it("should have correct constants", () => {
    expect(DEFAULT_SEED).toBe(42);
    expect(MAX_CONTENT_SIZE).toBe(10 * 1024 * 1024);
    expect(MIN_CONTENT_SIZE).toBe(1);
  });

  it("validateContentSize should accept valid content", () => {
    expect(validateContentSize("Hello")).toBe(true);
    expect(validateContentSize("A")).toBe(true);
  });

  it("validateContentSize should reject empty content", () => {
    expect(validateContentSize("")).toBe(false);
  });

  it("normalizeWeights should return equal weights when undefined", () => {
    const weights = normalizeWeights(undefined);
    expect(weights.emotion).toBe(0.25);
    expect(weights.style).toBe(0.25);
    expect(weights.structure).toBe(0.25);
    expect(weights.tempo).toBe(0.25);
  });

  it("normalizeWeights should normalize to sum 1", () => {
    const input: CompareWeights = {
      emotion: 2,
      style: 2,
      structure: 2,
      tempo: 2
    };
    const normalized = normalizeWeights(input);
    const sum = normalized.emotion + normalized.style +
                normalized.structure + normalized.tempo;
    expect(sum).toBeCloseTo(1.0);
  });

  it("normalizeWeights should handle zero weights", () => {
    const input: CompareWeights = {
      emotion: 0,
      style: 0,
      structure: 0,
      tempo: 0
    };
    const weights = normalizeWeights(input);
    expect(weights.emotion).toBe(0.25);
  });
});
