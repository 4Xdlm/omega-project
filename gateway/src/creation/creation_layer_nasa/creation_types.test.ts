/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — CREATION_LAYER
 * creation_types.test.ts — Tests Types & Guards
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  // Types
  ARTIFACT_TYPES,
  ASSUMPTION_REASONS,
  SCHEMA_VERSION,
  DEFAULT_CREATION_CONFIG,
  // Type guards
  isArtifactType,
  isSourceRef,
  isArtifact,
  isTemplate,
  isCreationRequest,
  isAssumption,
  isConfidenceReport,
  // Utilities
  validateArtifactType,
  validateAssumptionReason,
  ConfidenceReportBuilder,
  createAssumption,
} from "./creation_types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — ARTIFACT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

describe("ARTIFACT_TYPES", () => {
  it("should have exactly 10 types defined", () => {
    expect(ARTIFACT_TYPES).toHaveLength(10);
  });

  it("should include all expected types", () => {
    const expected = [
      "SCENE_OUTLINE",
      "CHARACTER_SHEET",
      "TIMELINE_VIEW",
      "EMOTION_REPORT",
      "CONSISTENCY_AUDIT",
      "DIFF_REPORT",
      "QUERY_ANSWER",
      "RELATIONSHIP_MAP",
      "LOCATION_INDEX",
      "PLOT_SUMMARY",
    ];
    expect([...ARTIFACT_TYPES].sort()).toEqual(expected.sort());
  });

  it("should be frozen (immutable)", () => {
    expect(Object.isFrozen(ARTIFACT_TYPES)).toBe(true);
  });
});

describe("isArtifactType", () => {
  it("should return true for valid types", () => {
    for (const type of ARTIFACT_TYPES) {
      expect(isArtifactType(type)).toBe(true);
    }
  });

  it("should return false for invalid types", () => {
    expect(isArtifactType("INVALID")).toBe(false);
    expect(isArtifactType("")).toBe(false);
    expect(isArtifactType(null)).toBe(false);
    expect(isArtifactType(undefined)).toBe(false);
    expect(isArtifactType(123)).toBe(false);
    expect(isArtifactType({})).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — SOURCE REF
// ═══════════════════════════════════════════════════════════════════════════════

describe("isSourceRef", () => {
  const validSourceRef = {
    key: "character:alice",
    version: 1,
    entry_hash: "a".repeat(64),
  };

  it("should return true for valid SourceRef", () => {
    expect(isSourceRef(validSourceRef)).toBe(true);
  });

  it("should return true with optional fields_used", () => {
    expect(isSourceRef({
      ...validSourceRef,
      fields_used: ["name", "age"],
    })).toBe(true);
  });

  it("should return false for empty key", () => {
    expect(isSourceRef({ ...validSourceRef, key: "" })).toBe(false);
  });

  it("should return false for non-integer version", () => {
    expect(isSourceRef({ ...validSourceRef, version: 1.5 })).toBe(false);
  });

  it("should return false for version < 1", () => {
    expect(isSourceRef({ ...validSourceRef, version: 0 })).toBe(false);
    expect(isSourceRef({ ...validSourceRef, version: -1 })).toBe(false);
  });

  it("should return false for invalid hash length", () => {
    expect(isSourceRef({ ...validSourceRef, entry_hash: "abc" })).toBe(false);
    expect(isSourceRef({ ...validSourceRef, entry_hash: "a".repeat(63) })).toBe(false);
    expect(isSourceRef({ ...validSourceRef, entry_hash: "a".repeat(65) })).toBe(false);
  });

  it("should return false for non-string fields_used items", () => {
    expect(isSourceRef({
      ...validSourceRef,
      fields_used: [123],
    })).toBe(false);
  });

  it("should return false for null/undefined", () => {
    expect(isSourceRef(null)).toBe(false);
    expect(isSourceRef(undefined)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — ASSUMPTION
// ═══════════════════════════════════════════════════════════════════════════════

describe("ASSUMPTION_REASONS", () => {
  it("should have exactly 5 reasons", () => {
    expect(ASSUMPTION_REASONS).toHaveLength(5);
  });

  it("should include all expected reasons", () => {
    const expected = [
      "SOURCE_MISSING",
      "FIELD_MISSING",
      "VALUE_AMBIGUOUS",
      "INFERENCE_REQUIRED",
      "DEFAULT_APPLIED",
    ];
    expect([...ASSUMPTION_REASONS].sort()).toEqual(expected.sort());
  });
});

describe("isAssumption", () => {
  const validAssumption = {
    field: "age",
    assumed_value: 25,
    reason: "DEFAULT_APPLIED",
    description: "Default age used",
  };

  it("should return true for valid Assumption", () => {
    expect(isAssumption(validAssumption)).toBe(true);
  });

  it("should return false for empty field", () => {
    expect(isAssumption({ ...validAssumption, field: "" })).toBe(false);
  });

  it("should return false for invalid reason", () => {
    expect(isAssumption({ ...validAssumption, reason: "INVALID" })).toBe(false);
  });

  it("should return false for missing description", () => {
    const { description, ...rest } = validAssumption;
    expect(isAssumption(rest)).toBe(false);
  });
});

describe("createAssumption", () => {
  it("should create a frozen Assumption", () => {
    const assumption = createAssumption(
      "name",
      "Unknown",
      "FIELD_MISSING",
      "Name field was missing"
    );
    
    expect(Object.isFrozen(assumption)).toBe(true);
    expect(assumption.field).toBe("name");
    expect(assumption.assumed_value).toBe("Unknown");
    expect(assumption.reason).toBe("FIELD_MISSING");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — CONFIDENCE REPORT
// ═══════════════════════════════════════════════════════════════════════════════

describe("isConfidenceReport", () => {
  const validReport = {
    sources_requested: 5,
    sources_found: 5,
    sources_missing: [],
    oldest_source_age_days: 10,
    newest_source_age_days: 1,
    assumptions: [],
    derivation_complete: true,
  };

  it("should return true for valid complete report", () => {
    expect(isConfidenceReport(validReport)).toBe(true);
  });

  it("should return true for report with assumptions", () => {
    const withAssumption = {
      sources_requested: 3,
      sources_found: 2,
      sources_missing: ["character:bob"],
      oldest_source_age_days: 5,
      newest_source_age_days: 2,
      assumptions: [{
        field: "age",
        assumed_value: 30,
        reason: "SOURCE_MISSING",
        description: "Character Bob not found",
      }],
      derivation_complete: false,
    };
    expect(isConfidenceReport(withAssumption)).toBe(true);
  });

  it("should return false if sources_found > sources_requested", () => {
    expect(isConfidenceReport({
      ...validReport,
      sources_found: 10,
    })).toBe(false);
  });

  it("should return false if derivation_complete but has assumptions", () => {
    expect(isConfidenceReport({
      ...validReport,
      derivation_complete: true,
      assumptions: [{ field: "x", assumed_value: 1, reason: "DEFAULT_APPLIED", description: "test" }],
    })).toBe(false);
  });

  it("should return false if sources_missing count mismatch", () => {
    expect(isConfidenceReport({
      ...validReport,
      sources_requested: 5,
      sources_found: 3,
      sources_missing: ["a"], // Should be 2 items
    })).toBe(false);
  });
});

describe("ConfidenceReportBuilder", () => {
  it("should build a complete report", () => {
    const builder = new ConfidenceReportBuilder();
    builder.requestSource("char:alice", true, 5);
    builder.requestSource("char:bob", true, 2);
    
    const report = builder.build();
    
    expect(report.sources_requested).toBe(2);
    expect(report.sources_found).toBe(2);
    expect(report.sources_missing).toHaveLength(0);
    expect(report.derivation_complete).toBe(true);
    expect(Object.isFrozen(report)).toBe(true);
  });

  it("should handle missing sources", () => {
    const builder = new ConfidenceReportBuilder();
    builder.requestSource("char:alice", true, 5);
    builder.requestSource("char:bob", false);
    builder.addAssumption(createAssumption(
      "bob_age",
      30,
      "SOURCE_MISSING",
      "Bob not found"
    ));
    
    const report = builder.build();
    
    expect(report.sources_requested).toBe(2);
    expect(report.sources_found).toBe(1);
    expect(report.sources_missing).toEqual(["char:bob"]);
    expect(report.derivation_complete).toBe(false);
    expect(report.assumptions).toHaveLength(1);
  });

  it("should track oldest and newest age", () => {
    const builder = new ConfidenceReportBuilder();
    builder.requestSource("a", true, 100);
    builder.requestSource("b", true, 1);
    builder.requestSource("c", true, 50);
    
    const report = builder.build();
    
    expect(report.oldest_source_age_days).toBe(100);
    expect(report.newest_source_age_days).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

describe("DEFAULT_CREATION_CONFIG", () => {
  it("should be frozen", () => {
    expect(Object.isFrozen(DEFAULT_CREATION_CONFIG)).toBe(true);
  });

  it("should have reasonable defaults", () => {
    expect(DEFAULT_CREATION_CONFIG.defaultTimeoutMs).toBe(30_000);
    expect(DEFAULT_CREATION_CONFIG.maxArtifactBytes).toBe(10 * 1024 * 1024);
    expect(DEFAULT_CREATION_CONFIG.maxSourceRefs).toBe(1000);
    expect(DEFAULT_CREATION_CONFIG.maxAssumptions).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — SCHEMA VERSION
// ═══════════════════════════════════════════════════════════════════════════════

describe("SCHEMA_VERSION", () => {
  it("should be 1.0.0", () => {
    expect(SCHEMA_VERSION).toBe("1.0.0");
  });
});
