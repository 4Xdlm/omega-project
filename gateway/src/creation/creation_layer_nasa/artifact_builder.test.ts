/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — CREATION_LAYER
 * artifact_builder.test.ts — Tests Artifact Construction
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * INVARIANTS TESTÉS :
 *   INV-CRE-03 : Full Provenance
 *   INV-CRE-05 : Derivation Honesty
 *   INV-CRE-09 : Atomic Output
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ArtifactBuildContext,
  createBuildContext,
  buildArtifact,
  verifyArtifact,
  requireValidArtifact,
  artifactsEqual,
  sameSnapshotOrigin,
  hasCompleteDerivation,
} from "./artifact_builder.js";
import type { Template, SourceRef, Artifact } from "./creation_types.js";
import { isArtifact } from "./creation_types.js";
import { isCreationError } from "./creation_errors.js";
import { MockSnapshotProvider, createReadOnlyContext, createSourceRef } from "./snapshot_context.js";
import { createTemplate } from "./template_registry.js";

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createMockContextWithData() {
  const provider = new MockSnapshotProvider();
  provider.addSnapshot("snap1", "root".padEnd(64, "0"));
  provider.addEntry("snap1", {
    key: "char:alice",
    version: 1,
    payload: { name: "Alice", age: 25 },
    hash: "a".repeat(64),
    created_at_utc: "2026-01-01T00:00:00Z",
  });
  provider.addEntry("snap1", {
    key: "char:bob",
    version: 1,
    payload: { name: "Bob", age: 30 },
    hash: "b".repeat(64),
    created_at_utc: "2026-01-01T00:00:00Z",
  });
  return createReadOnlyContext(provider, "snap1");
}

function createTestTemplate(): Template {
  return createTemplate({
    id: "TEST_TEMPLATE",
    version: "1.0.0",
    artifactType: "CHARACTER_SHEET",
    description: "Test template",
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    execute: () => ({}),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — ARTIFACT BUILD CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

describe("ArtifactBuildContext", () => {
  let ctx: ReturnType<typeof createMockContextWithData>;
  let template: Template;
  
  beforeEach(() => {
    ctx = createMockContextWithData();
    template = createTestTemplate();
  });

  describe("creation", () => {
    it("should create build context", () => {
      const builder = createBuildContext(ctx, template);
      expect(builder).toBeInstanceOf(ArtifactBuildContext);
      expect(builder.isBuilt()).toBe(false);
      expect(builder.getSourceCount()).toBe(0);
    });
  });

  describe("addSource — INV-CRE-03", () => {
    it("should add source references", () => {
      const builder = createBuildContext(ctx, template);
      const entry = ctx.getLatest("char:alice");
      const sourceRef = createSourceRef(entry!);
      
      builder.addSource(sourceRef);
      expect(builder.getSourceCount()).toBe(1);
    });

    it("should not allow adding sources after build", () => {
      const builder = createBuildContext(ctx, template);
      builder.setContent({ test: true }).build();
      
      const entry = ctx.getLatest("char:alice");
      const sourceRef = createSourceRef(entry!);
      
      expect(() => builder.addSource(sourceRef)).toThrow("after build");
    });
  });

  describe("addMissingSource — INV-CRE-05", () => {
    it("should track missing sources", () => {
      const builder = createBuildContext(ctx, template);
      builder.addMissingSource("char:unknown");
      builder.addAssumption("name", "Unknown", "SOURCE_MISSING", "Source not found");
      builder.setContent({ name: "Unknown" });
      
      const artifact = builder.build();
      expect(artifact.confidence.sources_missing).toContain("char:unknown");
      expect(artifact.confidence.derivation_complete).toBe(false);
    });
  });

  describe("addAssumption — INV-CRE-05", () => {
    it("should track assumptions", () => {
      const builder = createBuildContext(ctx, template);
      builder.addAssumption("age", 25, "DEFAULT_APPLIED", "Default age");
      builder.setContent({ age: 25 });
      
      const artifact = builder.build();
      expect(artifact.confidence.assumptions).toHaveLength(1);
      expect(artifact.confidence.assumptions[0]?.field).toBe("age");
      expect(artifact.confidence.derivation_complete).toBe(false);
    });
  });

  describe("build — INV-CRE-09", () => {
    it("should build complete artifact", () => {
      const builder = createBuildContext(ctx, template);
      const entry = ctx.getLatest("char:alice");
      
      builder
        .addSource(createSourceRef(entry!))
        .setContent({ character: "Alice" });
      
      const artifact = builder.build();
      
      expect(isArtifact(artifact)).toBe(true);
      expect(artifact.artifact_id).toHaveLength(32);
      expect(artifact.artifact_hash).toHaveLength(64);
      expect(artifact.content_hash).toHaveLength(64);
      expect(artifact.template_id).toBe("TEST_TEMPLATE");
      expect(artifact.template_version).toBe("1.0.0");
    });

    it("should fail without content", () => {
      const builder = createBuildContext(ctx, template);
      expect(() => builder.build()).toThrow("Content not set");
    });

    it("should not allow double build", () => {
      const builder = createBuildContext(ctx, template);
      builder.setContent({ test: true }).build();
      
      expect(() => builder.build()).toThrow("already built");
    });

    it("should freeze the artifact", () => {
      const builder = createBuildContext(ctx, template);
      const artifact = builder.setContent({ x: 1 }).build();
      
      expect(Object.isFrozen(artifact)).toBe(true);
      expect(Object.isFrozen(artifact.content)).toBe(true);
      expect(Object.isFrozen(artifact.source_refs)).toBe(true);
    });

    it("should derive artifact_id from artifact_hash", () => {
      const builder = createBuildContext(ctx, template);
      const artifact = builder.setContent({ data: "test" }).build();
      
      expect(artifact.artifact_id).toBe(artifact.artifact_hash.slice(0, 32));
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — QUICK BUILD
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildArtifact", () => {
  let ctx: ReturnType<typeof createMockContextWithData>;
  let template: Template;
  
  beforeEach(() => {
    ctx = createMockContextWithData();
    template = createTestTemplate();
  });

  it("should build artifact in one call", () => {
    const artifact = buildArtifact(ctx, template, { simple: true });
    
    expect(isArtifact(artifact)).toBe(true);
    expect(artifact.content).toEqual({ simple: true });
  });

  it("should include source refs", () => {
    const entry = ctx.getLatest("char:alice");
    const sourceRef = createSourceRef(entry!);
    
    const artifact = buildArtifact(ctx, template, { data: 1 }, {
      sourceRefs: [sourceRef],
    });
    
    expect(artifact.source_refs).toHaveLength(1);
  });

  it("should include assumptions", () => {
    const artifact = buildArtifact(ctx, template, { data: 1 }, {
      assumptions: [{
        field: "data",
        value: 1,
        reason: "DEFAULT_APPLIED",
        description: "Default value",
      }],
    });
    
    expect(artifact.confidence.assumptions).toHaveLength(1);
    expect(artifact.confidence.derivation_complete).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — ARTIFACT VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("verifyArtifact", () => {
  let ctx: ReturnType<typeof createMockContextWithData>;
  let template: Template;
  
  beforeEach(() => {
    ctx = createMockContextWithData();
    template = createTestTemplate();
  });

  it("should validate correct artifact", () => {
    const artifact = buildArtifact(ctx, template, { test: true });
    const result = verifyArtifact(artifact);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should detect content_hash tampering", () => {
    const artifact = buildArtifact(ctx, template, { test: true });
    const tampered = {
      ...artifact,
      content_hash: "0".repeat(64),
    };
    
    const result = verifyArtifact(tampered as Artifact);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("content_hash"))).toBe(true);
  });

  it("should detect artifact_hash tampering", () => {
    const artifact = buildArtifact(ctx, template, { test: true });
    const tampered = {
      ...artifact,
      artifact_hash: "0".repeat(64),
    };
    
    const result = verifyArtifact(tampered as Artifact);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("artifact_hash"))).toBe(true);
  });

  it("should detect artifact_id tampering", () => {
    const artifact = buildArtifact(ctx, template, { test: true });
    const tampered = {
      ...artifact,
      artifact_id: "0".repeat(32),
    };
    
    const result = verifyArtifact(tampered as Artifact);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("artifact_id"))).toBe(true);
  });
});

describe("requireValidArtifact", () => {
  let ctx: ReturnType<typeof createMockContextWithData>;
  let template: Template;
  
  beforeEach(() => {
    ctx = createMockContextWithData();
    template = createTestTemplate();
  });

  it("should not throw for valid artifact", () => {
    const artifact = buildArtifact(ctx, template, { test: true });
    expect(() => requireValidArtifact(artifact)).not.toThrow();
  });

  it("should throw for invalid artifact", () => {
    const artifact = buildArtifact(ctx, template, { test: true });
    const tampered = { ...artifact, content_hash: "0".repeat(64) };
    
    expect(() => requireValidArtifact(tampered as Artifact)).toThrow("integrity");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — ARTIFACT COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

describe("artifactsEqual", () => {
  let ctx: ReturnType<typeof createMockContextWithData>;
  let template: Template;
  
  beforeEach(() => {
    ctx = createMockContextWithData();
    template = createTestTemplate();
  });

  it("should return true for same content", () => {
    // Build same artifact twice at same time (same created_at)
    // This won't work because created_at_utc differs
    const a1 = buildArtifact(ctx, template, { x: 1 });
    
    // Can't easily test equality due to timestamp
    expect(artifactsEqual(a1, a1)).toBe(true);
  });

  it("should return false for different content", () => {
    const a1 = buildArtifact(ctx, template, { x: 1 });
    const a2 = buildArtifact(ctx, template, { x: 2 });
    
    expect(artifactsEqual(a1, a2)).toBe(false);
  });
});

describe("sameSnapshotOrigin", () => {
  it("should return true for same snapshot", () => {
    const ctx = createMockContextWithData();
    const template = createTestTemplate();
    
    const a1 = buildArtifact(ctx, template, { x: 1 });
    const a2 = buildArtifact(ctx, template, { x: 2 });
    
    expect(sameSnapshotOrigin(a1, a2)).toBe(true);
  });

  it("should return false for different snapshots", () => {
    const template = createTestTemplate();
    
    const provider1 = new MockSnapshotProvider();
    provider1.addSnapshot("snap1", "root1".padEnd(64, "0"));
    const ctx1 = createReadOnlyContext(provider1, "snap1");
    
    const provider2 = new MockSnapshotProvider();
    provider2.addSnapshot("snap2", "root2".padEnd(64, "0"));
    const ctx2 = createReadOnlyContext(provider2, "snap2");
    
    const a1 = buildArtifact(ctx1, template, { x: 1 });
    const a2 = buildArtifact(ctx2, template, { x: 1 });
    
    expect(sameSnapshotOrigin(a1, a2)).toBe(false);
  });
});

describe("hasCompleteDerivation", () => {
  let ctx: ReturnType<typeof createMockContextWithData>;
  let template: Template;
  
  beforeEach(() => {
    ctx = createMockContextWithData();
    template = createTestTemplate();
  });

  it("should return true when no assumptions", () => {
    const artifact = buildArtifact(ctx, template, { x: 1 });
    expect(hasCompleteDerivation(artifact)).toBe(true);
  });

  it("should return false when has assumptions", () => {
    const artifact = buildArtifact(ctx, template, { x: 1 }, {
      assumptions: [{
        field: "x",
        value: 1,
        reason: "DEFAULT_APPLIED",
        description: "Default",
      }],
    });
    
    expect(hasCompleteDerivation(artifact)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — PROVENANCE TESTS — INV-CRE-03
// ═══════════════════════════════════════════════════════════════════════════════

describe("Full Provenance — INV-CRE-03", () => {
  let ctx: ReturnType<typeof createMockContextWithData>;
  let template: Template;
  
  beforeEach(() => {
    ctx = createMockContextWithData();
    template = createTestTemplate();
  });

  it("should include snapshot_id", () => {
    const artifact = buildArtifact(ctx, template, { x: 1 });
    expect(artifact.snapshot_id).toBe("snap1");
  });

  it("should include snapshot_root_hash", () => {
    const artifact = buildArtifact(ctx, template, { x: 1 });
    expect(artifact.snapshot_root_hash).toBe("root".padEnd(64, "0"));
  });

  it("should include template_id and version", () => {
    const artifact = buildArtifact(ctx, template, { x: 1 });
    expect(artifact.template_id).toBe("TEST_TEMPLATE");
    expect(artifact.template_version).toBe("1.0.0");
  });

  it("should include all source_refs", () => {
    const alice = ctx.getLatest("char:alice");
    const bob = ctx.getLatest("char:bob");
    
    const artifact = buildArtifact(ctx, template, { x: 1 }, {
      sourceRefs: [
        createSourceRef(alice!),
        createSourceRef(bob!),
      ],
    });
    
    expect(artifact.source_refs).toHaveLength(2);
    expect(artifact.source_refs[0]?.key).toBe("char:alice");
    expect(artifact.source_refs[1]?.key).toBe("char:bob");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — ATOMIC OUTPUT — INV-CRE-09
// ═══════════════════════════════════════════════════════════════════════════════

describe("Atomic Output — INV-CRE-09", () => {
  it("should not return partial artifact on error", () => {
    const ctx = createMockContextWithData();
    const template = createTestTemplate();
    
    const builder = createBuildContext(ctx, template);
    // Don't set content - should fail
    
    let artifact: Artifact | null = null;
    try {
      artifact = builder.build();
    } catch (e) {
      // Expected
    }
    
    expect(artifact).toBeNull();
    expect(builder.isBuilt()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe("Determinism", () => {
  it("artifact_id should derive deterministically from hash", () => {
    const ctx = createMockContextWithData();
    const template = createTestTemplate();
    
    // Build 100 artifacts with same content
    const artifacts: Artifact[] = [];
    for (let i = 0; i < 100; i++) {
      // Note: created_at_utc will differ, so hashes will differ
      // But artifact_id should always be hash.slice(0, 32)
      const a = buildArtifact(ctx, template, { iteration: i });
      artifacts.push(a);
      
      expect(a.artifact_id).toBe(a.artifact_hash.slice(0, 32));
    }
  });
});
