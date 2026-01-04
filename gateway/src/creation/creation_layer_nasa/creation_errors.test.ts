/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — CREATION_LAYER
 * creation_errors.test.ts — Tests Error Handling
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  ERROR_DEFINITIONS,
  CreationError,
  CreationErrors,
  isCreationError,
  wrapError,
  getErrorChain,
  formatError,
} from "./creation_errors.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — ERROR DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("ERROR_DEFINITIONS", () => {
  it("should have all 13 error codes defined", () => {
    const codes = Object.keys(ERROR_DEFINITIONS);
    expect(codes).toHaveLength(13);
  });

  it("should have required properties for each definition", () => {
    for (const [code, def] of Object.entries(ERROR_DEFINITIONS)) {
      expect(def.code).toBe(code);
      expect(["FATAL", "ERROR", "WARNING"]).toContain(def.severity);
      expect(["VALIDATION", "SNAPSHOT", "TEMPLATE", "EXECUTION", "INTERNAL"]).toContain(def.category);
      expect(typeof def.description).toBe("string");
      expect(typeof def.recoverable).toBe("boolean");
    }
  });

  it("should mark INTERNAL_ERROR as non-recoverable", () => {
    expect(ERROR_DEFINITIONS.INTERNAL_ERROR.recoverable).toBe(false);
  });

  it("should mark INVALID_REQUEST as recoverable", () => {
    expect(ERROR_DEFINITIONS.INVALID_REQUEST.recoverable).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — CREATION ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CreationError", () => {
  it("should create error with code and message", () => {
    const error = new CreationError("INVALID_REQUEST", "Test message");
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CreationError);
    expect(error.code).toBe("INVALID_REQUEST");
    expect(error.message).toBe("Test message");
    expect(error.name).toBe("CreationError");
  });

  it("should include details when provided", () => {
    const error = new CreationError("INVALID_REQUEST", "Test", { field: "test" });
    expect(error.details).toEqual({ field: "test" });
  });

  it("should include cause when provided", () => {
    const cause = new Error("Original error");
    const error = new CreationError("EXECUTION_FAILED", "Wrapped", undefined, cause);
    expect(error.cause).toBe(cause);
  });

  it("should have timestamp_utc", () => {
    const before = new Date().toISOString();
    const error = new CreationError("INVALID_REQUEST", "Test");
    const after = new Date().toISOString();
    
    expect(error.timestamp_utc).toBeDefined();
    expect(error.timestamp_utc >= before).toBe(true);
    expect(error.timestamp_utc <= after).toBe(true);
  });

  describe("toErrorInfo", () => {
    it("should convert to CreationErrorInfo", () => {
      const error = new CreationError("INVALID_REQUEST", "Test", { x: 1 });
      const info = error.toErrorInfo("req-123");
      
      expect(info.code).toBe("INVALID_REQUEST");
      expect(info.message).toBe("Test");
      expect(info.details).toEqual({ x: 1 });
      expect(info.request_id).toBe("req-123");
    });
  });

  describe("getDefinition", () => {
    it("should return correct definition", () => {
      const error = new CreationError("SNAPSHOT_NOT_FOUND", "Test");
      const def = error.getDefinition();
      
      expect(def.code).toBe("SNAPSHOT_NOT_FOUND");
      expect(def.category).toBe("SNAPSHOT");
    });
  });

  describe("isRecoverable", () => {
    it("should return true for recoverable errors", () => {
      const error = new CreationError("INVALID_REQUEST", "Test");
      expect(error.isRecoverable()).toBe(true);
    });

    it("should return false for non-recoverable errors", () => {
      const error = new CreationError("INTERNAL_ERROR", "Test");
      expect(error.isRecoverable()).toBe(false);
    });
  });

  describe("toJSON", () => {
    it("should serialize to JSON", () => {
      const cause = new Error("Cause");
      const error = new CreationError("EXECUTION_FAILED", "Test", { x: 1 }, cause);
      const json = error.toJSON();
      
      expect(json.name).toBe("CreationError");
      expect(json.code).toBe("EXECUTION_FAILED");
      expect(json.message).toBe("Test");
      expect(json.details).toEqual({ x: 1 });
      expect(json.cause).toEqual({ name: "Error", message: "Cause" });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — ERROR FACTORIES
// ═══════════════════════════════════════════════════════════════════════════════

describe("CreationErrors factories", () => {
  describe("invalidRequest", () => {
    it("should create INVALID_REQUEST error", () => {
      const error = CreationErrors.invalidRequest("bad field", { field: "x" });
      expect(error.code).toBe("INVALID_REQUEST");
      expect(error.message).toContain("bad field");
      expect(error.details).toEqual({ field: "x" });
    });
  });

  describe("snapshotNotFound", () => {
    it("should create SNAPSHOT_NOT_FOUND error", () => {
      const error = CreationErrors.snapshotNotFound("snap-123");
      expect(error.code).toBe("SNAPSHOT_NOT_FOUND");
      expect(error.message).toContain("snap-123");
    });
  });

  describe("snapshotInvalid", () => {
    it("should create SNAPSHOT_INVALID error", () => {
      const error = CreationErrors.snapshotInvalid("snap-123", "corrupted");
      expect(error.code).toBe("SNAPSHOT_INVALID");
      expect(error.message).toContain("snap-123");
      expect(error.message).toContain("corrupted");
    });
  });

  describe("templateNotFound", () => {
    it("should create TEMPLATE_NOT_FOUND error", () => {
      const error = CreationErrors.templateNotFound("SCENE_OUTLINE");
      expect(error.code).toBe("TEMPLATE_NOT_FOUND");
      expect(error.message).toContain("SCENE_OUTLINE");
    });
  });

  describe("templateVersionMismatch", () => {
    it("should create TEMPLATE_VERSION_MISMATCH error", () => {
      const error = CreationErrors.templateVersionMismatch("TPL", "1.0.0", "2.0.0");
      expect(error.code).toBe("TEMPLATE_VERSION_MISMATCH");
      expect(error.message).toContain("1.0.0");
      expect(error.message).toContain("2.0.0");
    });
  });

  describe("paramsValidationFailed", () => {
    it("should create PARAMS_VALIDATION_FAILED error", () => {
      const error = CreationErrors.paramsValidationFailed("missing required field");
      expect(error.code).toBe("PARAMS_VALIDATION_FAILED");
    });
  });

  describe("sourceNotFound", () => {
    it("should create SOURCE_NOT_FOUND error with key only", () => {
      const error = CreationErrors.sourceNotFound("char:alice");
      expect(error.code).toBe("SOURCE_NOT_FOUND");
      expect(error.message).toContain("char:alice");
    });

    it("should create SOURCE_NOT_FOUND error with version", () => {
      const error = CreationErrors.sourceNotFound("char:alice", 3);
      expect(error.message).toContain("char:alice@3");
    });
  });

  describe("sourceHashMismatch", () => {
    it("should create SOURCE_HASH_MISMATCH error", () => {
      const error = CreationErrors.sourceHashMismatch(
        "char:alice",
        "a".repeat(64),
        "b".repeat(64)
      );
      expect(error.code).toBe("SOURCE_HASH_MISMATCH");
    });
  });

  describe("executionFailed", () => {
    it("should create EXECUTION_FAILED error with cause", () => {
      const cause = new Error("Original");
      const error = CreationErrors.executionFailed("crash", cause);
      expect(error.code).toBe("EXECUTION_FAILED");
      expect(error.cause).toBe(cause);
    });
  });

  describe("executionTimeout", () => {
    it("should create EXECUTION_TIMEOUT error", () => {
      const error = CreationErrors.executionTimeout(30000);
      expect(error.code).toBe("EXECUTION_TIMEOUT");
      expect(error.message).toContain("30000");
    });
  });

  describe("outputValidationFailed", () => {
    it("should create OUTPUT_VALIDATION_FAILED error", () => {
      const error = CreationErrors.outputValidationFailed("invalid schema");
      expect(error.code).toBe("OUTPUT_VALIDATION_FAILED");
    });
  });

  describe("artifactTooLarge", () => {
    it("should create ARTIFACT_TOO_LARGE error", () => {
      const error = CreationErrors.artifactTooLarge(20000000, 10000000);
      expect(error.code).toBe("ARTIFACT_TOO_LARGE");
      expect(error.message).toContain("20000000");
      expect(error.message).toContain("10000000");
    });
  });

  describe("internal", () => {
    it("should create INTERNAL_ERROR", () => {
      const error = CreationErrors.internal("unexpected state");
      expect(error.code).toBe("INTERNAL_ERROR");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

describe("isCreationError", () => {
  it("should return true for CreationError", () => {
    const error = new CreationError("INVALID_REQUEST", "Test");
    expect(isCreationError(error)).toBe(true);
  });

  it("should return false for regular Error", () => {
    const error = new Error("Test");
    expect(isCreationError(error)).toBe(false);
  });

  it("should return false for non-error", () => {
    expect(isCreationError("error")).toBe(false);
    expect(isCreationError(null)).toBe(false);
    expect(isCreationError({})).toBe(false);
  });
});

describe("wrapError", () => {
  it("should return CreationError as-is", () => {
    const error = new CreationError("INVALID_REQUEST", "Test");
    expect(wrapError(error)).toBe(error);
  });

  it("should wrap Error in CreationError", () => {
    const error = new Error("Original");
    const wrapped = wrapError(error);
    
    expect(wrapped).toBeInstanceOf(CreationError);
    expect(wrapped.code).toBe("INTERNAL_ERROR");
    expect(wrapped.cause).toBe(error);
  });

  it("should wrap string in CreationError", () => {
    const wrapped = wrapError("something went wrong");
    
    expect(wrapped).toBeInstanceOf(CreationError);
    expect(wrapped.code).toBe("INTERNAL_ERROR");
    expect(wrapped.message).toContain("something went wrong");
  });
});

describe("getErrorChain", () => {
  it("should return single error for no cause", () => {
    const error = new Error("Test");
    const chain = getErrorChain(error);
    expect(chain).toHaveLength(1);
    expect(chain[0]).toBe(error);
  });

  it("should return chain of errors", () => {
    const root = new Error("Root");
    const middle = new Error("Middle", { cause: root });
    const top = new Error("Top", { cause: middle });
    
    const chain = getErrorChain(top);
    
    expect(chain).toHaveLength(3);
    expect(chain[0]).toBe(top);
    expect(chain[1]).toBe(middle);
    expect(chain[2]).toBe(root);
  });
});

describe("formatError", () => {
  it("should format error for logging", () => {
    const error = new CreationError("INVALID_REQUEST", "Bad request", { field: "x" });
    const formatted = formatError(error);
    
    expect(formatted).toContain("[ERROR]");
    expect(formatted).toContain("INVALID_REQUEST");
    expect(formatted).toContain("Bad request");
    expect(formatted).toContain("Category: VALIDATION");
    expect(formatted).toContain("Recoverable: true");
  });

  it("should include cause chain", () => {
    const cause = new Error("Original");
    const error = new CreationError("EXECUTION_FAILED", "Wrapped", undefined, cause);
    const formatted = formatError(error);
    
    expect(formatted).toContain("Cause chain:");
    expect(formatted).toContain("Original");
  });
});
