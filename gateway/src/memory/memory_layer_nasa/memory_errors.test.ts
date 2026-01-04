/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — MEMORY_LAYER
 * memory_errors.test.ts — Tests Error Hierarchy
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  MemoryError,
  MemoryErrors,
  isMemoryError,
  isMemoryErrorOfCategory,
  isInvariantViolation,
  filterInvariantViolations,
  getErrorCategory,
  wrapError,
  createErrorFromCode,
  success,
  failure,
  unwrap,
  unwrapOr,
  type MemoryErrorCode,
  type MemoryErrorCategory,
  type MemoryResult,
} from "./memory_errors.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — MEMORY ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

describe("MemoryError", () => {
  it("should create error with all properties", () => {
    const error = new MemoryError(
      "MEM_100_INVALID_KEY",
      "Test message",
      { key: "test" },
      new Error("cause")
    );
    
    expect(error.code).toBe("MEM_100_INVALID_KEY");
    expect(error.message).toBe("Test message");
    expect(error.category).toBe("VALIDATION");
    expect(error.details).toEqual({ key: "test" });
    expect(error.cause_error?.message).toBe("cause");
    expect(error.timestamp_utc).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should extend Error", () => {
    const error = new MemoryError("MEM_500_INTERNAL_ERROR", "Test");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MemoryError);
  });

  it("should have name MemoryError", () => {
    const error = new MemoryError("MEM_500_INTERNAL_ERROR", "Test");
    expect(error.name).toBe("MemoryError");
  });

  describe("toJSON", () => {
    it("should serialize to JSON", () => {
      const error = new MemoryError(
        "MEM_100_INVALID_KEY",
        "Test message",
        { key: "test" }
      );
      
      const json = error.toJSON();
      
      expect(json.name).toBe("MemoryError");
      expect(json.code).toBe("MEM_100_INVALID_KEY");
      expect(json.category).toBe("VALIDATION");
      expect(json.message).toBe("Test message");
      expect(json.details).toEqual({ key: "test" });
      expect(json.timestamp_utc).toBeDefined();
    });

    it("should include cause message", () => {
      const error = new MemoryError(
        "MEM_500_INTERNAL_ERROR",
        "Test",
        undefined,
        new Error("Original error")
      );
      
      const json = error.toJSON();
      expect(json.cause).toBe("Original error");
    });
  });

  describe("toString", () => {
    it("should format without details", () => {
      const error = new MemoryError("MEM_100_INVALID_KEY", "Test message");
      expect(error.toString()).toBe("[MEM_100_INVALID_KEY] Test message");
    });

    it("should format with details", () => {
      const error = new MemoryError(
        "MEM_100_INVALID_KEY",
        "Test message",
        { key: "test" }
      );
      expect(error.toString()).toContain("Details:");
      expect(error.toString()).toContain("key");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — ERROR CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Error Categories", () => {
  describe("getErrorCategory", () => {
    it("should return VALIDATION for 1xx codes", () => {
      expect(getErrorCategory("MEM_100_INVALID_KEY")).toBe("VALIDATION");
      expect(getErrorCategory("MEM_105_SCHEMA_VIOLATION")).toBe("VALIDATION");
    });

    it("should return STORE for 2xx codes", () => {
      expect(getErrorCategory("MEM_200_RECORD_NOT_FOUND")).toBe("STORE");
      expect(getErrorCategory("MEM_204_STORE_CORRUPTED")).toBe("STORE");
    });

    it("should return OPERATION for 3xx codes", () => {
      expect(getErrorCategory("MEM_300_WRITE_FAILED")).toBe("OPERATION");
      expect(getErrorCategory("MEM_302_QUERY_TIMEOUT")).toBe("OPERATION");
    });

    it("should return INVARIANT for 4xx codes", () => {
      expect(getErrorCategory("MEM_400_MUTATION_ATTEMPTED")).toBe("INVARIANT");
      expect(getErrorCategory("MEM_403_PROVENANCE_MISSING")).toBe("INVARIANT");
    });

    it("should return SYSTEM for 5xx codes", () => {
      expect(getErrorCategory("MEM_500_INTERNAL_ERROR")).toBe("SYSTEM");
      expect(getErrorCategory("MEM_501_NOT_IMPLEMENTED")).toBe("SYSTEM");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — ERROR FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

describe("MemoryErrors Factory", () => {
  describe("Validation Errors (1xx)", () => {
    it("invalidKey", () => {
      const error = MemoryErrors.invalidKey("bad:key", "wrong format");
      expect(error.code).toBe("MEM_100_INVALID_KEY");
      expect(error.message).toContain("bad:key");
      expect(error.message).toContain("wrong format");
    });

    it("invalidPayload", () => {
      const error = MemoryErrors.invalidPayload("not serializable", { type: "function" });
      expect(error.code).toBe("MEM_101_INVALID_PAYLOAD");
      expect(error.details).toEqual({ type: "function" });
    });

    it("invalidProvenance", () => {
      const error = MemoryErrors.invalidProvenance("missing source");
      expect(error.code).toBe("MEM_102_INVALID_PROVENANCE");
    });

    it("invalidRequest", () => {
      const error = MemoryErrors.invalidRequest("missing key");
      expect(error.code).toBe("MEM_103_INVALID_REQUEST");
    });

    it("invalidQuery", () => {
      const error = MemoryErrors.invalidQuery("invalid filter");
      expect(error.code).toBe("MEM_104_INVALID_QUERY");
    });

    it("schemaViolation", () => {
      const error = MemoryErrors.schemaViolation("version", "number", "string");
      expect(error.code).toBe("MEM_105_SCHEMA_VIOLATION");
      expect(error.message).toContain("version");
      expect(error.message).toContain("number");
      expect(error.message).toContain("string");
    });
  });

  describe("Store Errors (2xx)", () => {
    it("recordNotFound without version", () => {
      const error = MemoryErrors.recordNotFound("char:alice");
      expect(error.code).toBe("MEM_200_RECORD_NOT_FOUND");
      expect(error.message).toContain("char:alice");
    });

    it("recordNotFound with version", () => {
      const error = MemoryErrors.recordNotFound("char:alice", 5);
      expect(error.message).toContain("version 5");
    });

    it("versionConflict", () => {
      const error = MemoryErrors.versionConflict("char:alice", 2, 3);
      expect(error.code).toBe("MEM_201_VERSION_CONFLICT");
      expect(error.details).toEqual({ key: "char:alice", expected: 2, actual: 3 });
    });

    it("hashMismatch", () => {
      const error = MemoryErrors.hashMismatch("char:alice", "abc123", "def456");
      expect(error.code).toBe("MEM_202_HASH_MISMATCH");
      expect(error.message).toContain("integrity");
    });

    it("integrityViolation", () => {
      const error = MemoryErrors.integrityViolation("char:alice", "chain broken");
      expect(error.code).toBe("MEM_203_INTEGRITY_VIOLATION");
    });

    it("storeCorrupted", () => {
      const error = MemoryErrors.storeCorrupted("index inconsistent");
      expect(error.code).toBe("MEM_204_STORE_CORRUPTED");
    });
  });

  describe("Operation Errors (3xx)", () => {
    it("writeFailed", () => {
      const cause = new Error("disk full");
      const error = MemoryErrors.writeFailed("char:alice", "disk full", cause);
      expect(error.code).toBe("MEM_300_WRITE_FAILED");
      expect(error.cause_error).toBe(cause);
    });

    it("queryFailed", () => {
      const error = MemoryErrors.queryFailed("timeout");
      expect(error.code).toBe("MEM_301_QUERY_FAILED");
    });

    it("queryTimeout", () => {
      const error = MemoryErrors.queryTimeout(5000);
      expect(error.code).toBe("MEM_302_QUERY_TIMEOUT");
      expect(error.message).toContain("5000");
    });

    it("operationRejected", () => {
      const error = MemoryErrors.operationRejected("delete", "not allowed");
      expect(error.code).toBe("MEM_303_OPERATION_REJECTED");
    });
  });

  describe("Invariant Violations (4xx)", () => {
    it("mutationAttempted — INV-MEM-01", () => {
      const error = MemoryErrors.mutationAttempted("char:alice", "update");
      expect(error.code).toBe("MEM_400_MUTATION_ATTEMPTED");
      expect(error.message).toContain("INV-MEM-01");
      expect(error.details).toHaveProperty("invariant", "INV-MEM-01");
    });

    it("deleteAttempted — INV-MEM-01", () => {
      const error = MemoryErrors.deleteAttempted("char:alice");
      expect(error.code).toBe("MEM_401_DELETE_ATTEMPTED");
      expect(error.message).toContain("INV-MEM-01");
    });

    it("implicitLinkDetected — INV-MEM-03", () => {
      const error = MemoryErrors.implicitLinkDetected("scene:1", "char:alice");
      expect(error.code).toBe("MEM_402_IMPLICIT_LINK_DETECTED");
      expect(error.message).toContain("INV-MEM-03");
    });

    it("provenanceMissing — INV-MEM-07", () => {
      const error = MemoryErrors.provenanceMissing("char:alice");
      expect(error.code).toBe("MEM_403_PROVENANCE_MISSING");
      expect(error.message).toContain("INV-MEM-07");
    });
  });

  describe("System Errors (5xx)", () => {
    it("internal", () => {
      const cause = new Error("unexpected");
      const error = MemoryErrors.internal("something went wrong", cause);
      expect(error.code).toBe("MEM_500_INTERNAL_ERROR");
      expect(error.cause_error).toBe(cause);
    });

    it("notImplemented", () => {
      const error = MemoryErrors.notImplemented("export");
      expect(error.code).toBe("MEM_501_NOT_IMPLEMENTED");
      expect(error.details).toEqual({ feature: "export" });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Type Guards", () => {
  describe("isMemoryError", () => {
    it("should return true for MemoryError", () => {
      const error = MemoryErrors.internal("test");
      expect(isMemoryError(error)).toBe(true);
    });

    it("should return false for regular Error", () => {
      expect(isMemoryError(new Error("test"))).toBe(false);
    });

    it("should return false for non-errors", () => {
      expect(isMemoryError(null)).toBe(false);
      expect(isMemoryError(undefined)).toBe(false);
      expect(isMemoryError("error")).toBe(false);
      expect(isMemoryError({})).toBe(false);
    });
  });

  describe("isMemoryErrorOfCategory", () => {
    it("should return true for matching category", () => {
      const error = MemoryErrors.invalidKey("key", "reason");
      expect(isMemoryErrorOfCategory(error, "VALIDATION")).toBe(true);
    });

    it("should return false for non-matching category", () => {
      const error = MemoryErrors.invalidKey("key", "reason");
      expect(isMemoryErrorOfCategory(error, "STORE")).toBe(false);
    });

    it("should return false for non-MemoryError", () => {
      expect(isMemoryErrorOfCategory(new Error("test"), "VALIDATION")).toBe(false);
    });
  });

  describe("isInvariantViolation", () => {
    it("should return true for invariant errors", () => {
      expect(isInvariantViolation(MemoryErrors.mutationAttempted("k", "op"))).toBe(true);
      expect(isInvariantViolation(MemoryErrors.deleteAttempted("k"))).toBe(true);
      expect(isInvariantViolation(MemoryErrors.implicitLinkDetected("a", "b"))).toBe(true);
      expect(isInvariantViolation(MemoryErrors.provenanceMissing("k"))).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isInvariantViolation(MemoryErrors.internal("test"))).toBe(false);
      expect(isInvariantViolation(MemoryErrors.recordNotFound("k"))).toBe(false);
    });
  });

  describe("filterInvariantViolations", () => {
    it("should filter only invariant violations", () => {
      const errors = [
        MemoryErrors.internal("test"),
        MemoryErrors.mutationAttempted("k", "op"),
        new Error("regular"),
        MemoryErrors.deleteAttempted("k"),
        MemoryErrors.recordNotFound("k"),
      ];
      
      const violations = filterInvariantViolations(errors);
      
      expect(violations).toHaveLength(2);
      expect(violations[0]!.code).toBe("MEM_400_MUTATION_ATTEMPTED");
      expect(violations[1]!.code).toBe("MEM_401_DELETE_ATTEMPTED");
    });

    it("should return empty array if no violations", () => {
      const errors = [
        MemoryErrors.internal("test"),
        new Error("regular"),
      ];
      
      expect(filterInvariantViolations(errors)).toHaveLength(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Error Utilities", () => {
  describe("wrapError", () => {
    it("should return MemoryError unchanged", () => {
      const original = MemoryErrors.internal("test");
      const wrapped = wrapError(original, "context");
      expect(wrapped).toBe(original);
    });

    it("should wrap regular Error", () => {
      const original = new Error("original message");
      const wrapped = wrapError(original, "context");
      
      expect(wrapped).toBeInstanceOf(MemoryError);
      expect(wrapped.code).toBe("MEM_500_INTERNAL_ERROR");
      expect(wrapped.message).toContain("context");
      expect(wrapped.message).toContain("original message");
      expect(wrapped.cause_error).toBe(original);
    });

    it("should wrap non-error values", () => {
      const wrapped = wrapError("string error", "context");
      expect(wrapped).toBeInstanceOf(MemoryError);
      expect(wrapped.message).toContain("string error");
    });
  });

  describe("createErrorFromCode", () => {
    it("should create error with given code", () => {
      const error = createErrorFromCode(
        "MEM_200_RECORD_NOT_FOUND",
        "Custom message",
        { key: "test" }
      );
      
      expect(error.code).toBe("MEM_200_RECORD_NOT_FOUND");
      expect(error.message).toBe("Custom message");
      expect(error.details).toEqual({ key: "test" });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — RESULT TYPE
// ═══════════════════════════════════════════════════════════════════════════════

describe("MemoryResult", () => {
  describe("success", () => {
    it("should create success result", () => {
      const result = success(42);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(42);
      }
    });

    it("should freeze result", () => {
      const result = success({ data: "test" });
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe("failure", () => {
    it("should create failure result", () => {
      const error = MemoryErrors.internal("test");
      const result = failure<number>(error);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });

    it("should freeze result", () => {
      const result = failure(MemoryErrors.internal("test"));
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe("unwrap", () => {
    it("should return value for success", () => {
      const result = success(42);
      expect(unwrap(result)).toBe(42);
    });

    it("should throw for failure", () => {
      const error = MemoryErrors.internal("test");
      const result = failure<number>(error);
      
      expect(() => unwrap(result)).toThrow(error);
    });
  });

  describe("unwrapOr", () => {
    it("should return value for success", () => {
      const result = success(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    it("should return default for failure", () => {
      const result = failure<number>(MemoryErrors.internal("test"));
      expect(unwrapOr(result, 0)).toBe(0);
    });
  });
});
