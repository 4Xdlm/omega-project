/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — CREATION_LAYER
 * creation_engine.test.ts — Tests Creation Engine E2E
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * INVARIANTS TESTÉS :
 *   INV-CRE-02 : No Write Authority (proposal only)
 *   INV-CRE-10 : Idempotency
 *   E2E : Full pipeline tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CreationEngine,
  globalEngine,
  createArtifact,
  createArtifactSync,
  isProposalValid,
  isProposalComplete,
  extractArtifact,
} from "./creation_engine.js";
import type { CreationProposal } from "./creation_engine.js";
import type { CreationRequest, Template, SourceRef } from "./creation_types.js";
import { isArtifact } from "./creation_types.js";
import { isCreationError } from "./creation_errors.js";
import {
  MockSnapshotProvider,
  createReadOnlyContext,
  createSourceRef,
} from "./snapshot_context.js";
import {
  TemplateRegistry,
  createTemplate,
  globalRegistry,
} from "./template_registry.js";
import { createRequestSync, generateRequestId } from "./creation_request.js";

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createTestProvider(): MockSnapshotProvider {
  const provider = new MockSnapshotProvider();
  provider.addSnapshot("snap1", "root".padEnd(64, "0"));
  provider.addEntry("snap1", {
    key: "char:alice",
    version: 1,
    payload: { name: "Alice", age: 25, role: "protagonist" },
    hash: "a".repeat(64),
    created_at_utc: "2026-01-01T00:00:00Z",
  });
  provider.addEntry("snap1", {
    key: "char:bob",
    version: 1,
    payload: { name: "Bob", age: 30, role: "antagonist" },
    hash: "b".repeat(64),
    created_at_utc: "2026-01-01T00:00:00Z",
  });
  provider.addEntry("snap1", {
    key: "scene:opening",
    version: 1,
    payload: { title: "Opening Scene", setting: "Forest" },
    hash: "c".repeat(64),
    created_at_utc: "2026-01-01T00:00:00Z",
  });
  return provider;
}

function createSimpleTemplate(): Template {
  return createTemplate({
    id: "SIMPLE_TRANSFORM",
    version: "1.0.0",
    artifactType: "SCENE_OUTLINE",
    description: "Simple transformation template",
    inputSchema: {
      type: "object",
      properties: {
        input_value: { type: "string" },
      },
      required: ["input_value"],
    },
    outputSchema: {
      type: "object",
      properties: {
        transformed: { type: "string" },
      },
    },
    execute: (ctx, params) => {
      const p = params as { input_value: string };
      return {
        transformed: `[TRANSFORMED] ${p.input_value}`,
      };
    },
  });
}

function createCharacterSheetTemplate(): Template {
  return createTemplate({
    id: "CHARACTER_SHEET_GEN",
    version: "1.0.0",
    artifactType: "CHARACTER_SHEET",
    description: "Generates character sheet from data",
    inputSchema: {
      type: "object",
      properties: {
        character_key: { type: "string" },
      },
      required: ["character_key"],
    },
    outputSchema: {
      type: "object",
    },
    execute: (ctx, params) => {
      const p = params as { character_key: string };
      const entry = ctx.getLatest(p.character_key);
      
      if (!entry) {
        return {
          _missing_sources: [p.character_key],
          _assumptions: [{
            field: "character_data",
            value: { name: "Unknown", age: 0 },
            reason: "SOURCE_MISSING" as const,
            description: `Character ${p.character_key} not found`,
          }],
          name: "Unknown",
          age: 0,
          description: "Character not found in snapshot",
        };
      }
      
      const sourceRef = createSourceRef(entry);
      const payload = entry.payload as { name: string; age: number; role: string };
      
      return {
        _source_refs: [sourceRef],
        name: payload.name,
        age: payload.age,
        role: payload.role,
        description: `${payload.name} is a ${payload.age} year old ${payload.role}`,
      };
    },
  });
}

function createTestRequest(
  templateId: string,
  params: unknown,
  snapshotId: string = "snap1"
): CreationRequest {
  return createRequestSync({
    request_id: generateRequestId(),
    snapshot_id: snapshotId,
    template_id: templateId,
    params,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — CREATION ENGINE BASIC
// ═══════════════════════════════════════════════════════════════════════════════

describe("CreationEngine", () => {
  let registry: TemplateRegistry;
  let engine: CreationEngine;
  let provider: MockSnapshotProvider;
  
  beforeEach(() => {
    registry = new TemplateRegistry();
    registry.register(createSimpleTemplate());
    registry.register(createCharacterSheetTemplate());
    
    engine = new CreationEngine({ registry });
    provider = createTestProvider();
  });

  describe("execute", () => {
    it("should execute simple template and return proposal", async () => {
      const request = createTestRequest("SIMPLE_TRANSFORM", {
        input_value: "Hello World",
      });
      
      const proposal = await engine.execute(request, provider);
      
      expect(proposal).toBeDefined();
      expect(proposal.request).toEqual(request);
      expect(proposal.artifact).toBeDefined();
      expect(isArtifact(proposal.artifact)).toBe(true);
    });

    it("should produce valid artifact", async () => {
      const request = createTestRequest("SIMPLE_TRANSFORM", {
        input_value: "Test",
      });
      
      const proposal = await engine.execute(request, provider);
      
      expect(proposal.validation.artifact_valid).toBe(true);
      expect(proposal.validation.output_schema_valid).toBe(true);
    });

    it("should include metrics", async () => {
      const request = createTestRequest("SIMPLE_TRANSFORM", {
        input_value: "Test",
      });
      
      const proposal = await engine.execute(request, provider);
      
      expect(proposal.metrics.duration_ms).toBeGreaterThanOrEqual(0);
      expect(proposal.metrics.template_id).toBe("SIMPLE_TRANSFORM");
      expect(proposal.metrics.template_version).toBe("1.0.0");
    });

    it("should freeze proposal", async () => {
      const request = createTestRequest("SIMPLE_TRANSFORM", {
        input_value: "Test",
      });
      
      const proposal = await engine.execute(request, provider);
      
      expect(Object.isFrozen(proposal)).toBe(true);
      expect(Object.isFrozen(proposal.artifact)).toBe(true);
    });
  });

  describe("executeSync", () => {
    it("should execute synchronously", () => {
      const request = createTestRequest("SIMPLE_TRANSFORM", {
        input_value: "Sync Test",
      });
      
      const proposal = engine.executeSync(request, provider);
      
      expect(proposal).toBeDefined();
      expect(proposal.artifact.content).toEqual({
        transformed: "[TRANSFORMED] Sync Test",
      });
    });
  });

  describe("error handling", () => {
    it("should throw for non-existent template", async () => {
      const request = createTestRequest("NONEXISTENT", { x: 1 });
      
      await expect(engine.execute(request, provider))
        .rejects.toThrow("not found");
    });

    it("should throw for non-existent snapshot", async () => {
      const request = createTestRequest("SIMPLE_TRANSFORM", {
        input_value: "Test",
      }, "nonexistent_snapshot");
      
      await expect(engine.execute(request, provider))
        .rejects.toThrow();
    });

    it("should throw for invalid params", async () => {
      const request = createTestRequest("SIMPLE_TRANSFORM", {
        wrong_param: "Test",
      });
      
      await expect(engine.execute(request, provider))
        .rejects.toThrow("missing required");
    });

    it("should throw for invalid request hash", async () => {
      const request = createTestRequest("SIMPLE_TRANSFORM", {
        input_value: "Test",
      });
      
      // Tamper with the hash
      const tampered = {
        ...request,
        request_hash: "0".repeat(64),
      };
      
      await expect(engine.execute(tampered as CreationRequest, provider))
        .rejects.toThrow("does not match");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — INV-CRE-02 : NO WRITE AUTHORITY
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-CRE-02: No Write Authority", () => {
  let registry: TemplateRegistry;
  let engine: CreationEngine;
  let provider: MockSnapshotProvider;
  
  beforeEach(() => {
    registry = new TemplateRegistry();
    registry.register(createSimpleTemplate());
    engine = new CreationEngine({ registry });
    provider = createTestProvider();
  });

  it("should return proposal, not write directly", async () => {
    const request = createTestRequest("SIMPLE_TRANSFORM", {
      input_value: "Test",
    });
    
    // Get initial state
    const keysBefore = provider.listKeys("snap1");
    
    // Execute
    const proposal = await engine.execute(request, provider);
    
    // Check state unchanged
    const keysAfter = provider.listKeys("snap1");
    expect(keysAfter).toEqual(keysBefore);
    
    // Proposal is returned, not applied
    expect(proposal.artifact).toBeDefined();
  });

  it("CreationEngine has no write methods", () => {
    const engineMethods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(engine)
    ).filter(m => m !== "constructor");
    
    // No methods that suggest writing
    expect(engineMethods).not.toContain("write");
    expect(engineMethods).not.toContain("save");
    expect(engineMethods).not.toContain("store");
    expect(engineMethods).not.toContain("persist");
    expect(engineMethods).not.toContain("commit");
    expect(engineMethods).not.toContain("apply");
  });

  it("CreationProposal is read-only", async () => {
    const request = createTestRequest("SIMPLE_TRANSFORM", {
      input_value: "Test",
    });
    
    const proposal = await engine.execute(request, provider);
    
    // Proposal is frozen
    expect(Object.isFrozen(proposal)).toBe(true);
    
    // Cannot modify
    expect(() => {
      (proposal as any).artifact = null;
    }).toThrow(TypeError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — INV-CRE-10 : IDEMPOTENCY
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-CRE-10: Idempotency", () => {
  let registry: TemplateRegistry;
  let engine: CreationEngine;
  let provider: MockSnapshotProvider;
  
  beforeEach(() => {
    registry = new TemplateRegistry();
    registry.register(createSimpleTemplate());
    engine = new CreationEngine({ registry });
    provider = createTestProvider();
  });

  it("same request should produce same artifact content", async () => {
    const request = createTestRequest("SIMPLE_TRANSFORM", {
      input_value: "Deterministic Test",
    });
    
    const results: CreationProposal[] = [];
    
    for (let i = 0; i < 10; i++) {
      const proposal = await engine.execute(request, provider);
      results.push(proposal);
    }
    
    // All content should be identical
    const firstContent = JSON.stringify(results[0]!.artifact.content);
    for (const r of results) {
      expect(JSON.stringify(r.artifact.content)).toBe(firstContent);
    }
  });

  it("same request should produce same content_hash", async () => {
    const request = createTestRequest("SIMPLE_TRANSFORM", {
      input_value: "Hash Test",
    });
    
    const hashes: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      const proposal = await engine.execute(request, provider);
      hashes.push(proposal.artifact.content_hash);
    }
    
    // All content hashes should be identical
    const firstHash = hashes[0];
    for (const h of hashes) {
      expect(h).toBe(firstHash);
    }
  });

  it("different params should produce different results", async () => {
    const request1 = createTestRequest("SIMPLE_TRANSFORM", {
      input_value: "Value A",
    });
    const request2 = createTestRequest("SIMPLE_TRANSFORM", {
      input_value: "Value B",
    });
    
    const proposal1 = await engine.execute(request1, provider);
    const proposal2 = await engine.execute(request2, provider);
    
    expect(proposal1.artifact.content_hash).not.toBe(proposal2.artifact.content_hash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — E2E WITH SOURCE TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E: Source Tracking", () => {
  let registry: TemplateRegistry;
  let engine: CreationEngine;
  let provider: MockSnapshotProvider;
  
  beforeEach(() => {
    registry = new TemplateRegistry();
    registry.register(createCharacterSheetTemplate());
    engine = new CreationEngine({ registry });
    provider = createTestProvider();
  });

  it("should track sources from snapshot — INV-CRE-03", async () => {
    const request = createTestRequest("CHARACTER_SHEET_GEN", {
      character_key: "char:alice",
    });
    
    const proposal = await engine.execute(request, provider);
    
    expect(proposal.artifact.source_refs).toHaveLength(1);
    expect(proposal.artifact.source_refs[0]?.key).toBe("char:alice");
    expect(proposal.artifact.confidence.sources_found).toBe(1);
    expect(proposal.validation.provenance_complete).toBe(true);
  });

  it("should track missing sources — INV-CRE-05", async () => {
    const request = createTestRequest("CHARACTER_SHEET_GEN", {
      character_key: "char:nonexistent",
    });
    
    const proposal = await engine.execute(request, provider);
    
    expect(proposal.artifact.confidence.sources_missing).toContain("char:nonexistent");
    expect(proposal.artifact.confidence.assumptions).toHaveLength(1);
    expect(proposal.validation.provenance_complete).toBe(false);
  });

  it("should include snapshot provenance", async () => {
    const request = createTestRequest("CHARACTER_SHEET_GEN", {
      character_key: "char:alice",
    });
    
    const proposal = await engine.execute(request, provider);
    
    expect(proposal.artifact.snapshot_id).toBe("snap1");
    expect(proposal.artifact.snapshot_root_hash).toBe("root".padEnd(64, "0"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — GLOBAL ENGINE & CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Global Engine", () => {
  beforeEach(() => {
    globalRegistry.clear();
    globalRegistry.register(createSimpleTemplate());
  });

  it("globalEngine should work", async () => {
    const provider = createTestProvider();
    const request = createTestRequest("SIMPLE_TRANSFORM", {
      input_value: "Global Test",
    });
    
    const proposal = await globalEngine.execute(request, provider);
    expect(proposal.artifact).toBeDefined();
  });

  it("createArtifact convenience function should work", async () => {
    const provider = createTestProvider();
    const request = createTestRequest("SIMPLE_TRANSFORM", {
      input_value: "Convenience Test",
    });
    
    const proposal = await createArtifact(request, provider);
    expect(proposal.artifact).toBeDefined();
  });

  it("createArtifactSync convenience function should work", () => {
    const provider = createTestProvider();
    const request = createTestRequest("SIMPLE_TRANSFORM", {
      input_value: "Sync Convenience Test",
    });
    
    const proposal = createArtifactSync(request, provider);
    expect(proposal.artifact).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — PROPOSAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Proposal Helpers", () => {
  let registry: TemplateRegistry;
  let engine: CreationEngine;
  let provider: MockSnapshotProvider;
  
  beforeEach(() => {
    registry = new TemplateRegistry();
    registry.register(createSimpleTemplate());
    registry.register(createCharacterSheetTemplate());
    engine = new CreationEngine({ registry });
    provider = createTestProvider();
  });

  describe("isProposalValid", () => {
    it("should return true for valid proposal", async () => {
      const request = createTestRequest("SIMPLE_TRANSFORM", {
        input_value: "Test",
      });
      
      const proposal = await engine.execute(request, provider);
      expect(isProposalValid(proposal)).toBe(true);
    });
  });

  describe("isProposalComplete", () => {
    it("should return true when no assumptions", async () => {
      const request = createTestRequest("CHARACTER_SHEET_GEN", {
        character_key: "char:alice",
      });
      
      const proposal = await engine.execute(request, provider);
      expect(isProposalComplete(proposal)).toBe(true);
    });

    it("should return false when has assumptions", async () => {
      const request = createTestRequest("CHARACTER_SHEET_GEN", {
        character_key: "char:unknown",
      });
      
      const proposal = await engine.execute(request, provider);
      expect(isProposalComplete(proposal)).toBe(false);
    });
  });

  describe("extractArtifact", () => {
    it("should return artifact from valid proposal", async () => {
      const request = createTestRequest("SIMPLE_TRANSFORM", {
        input_value: "Test",
      });
      
      const proposal = await engine.execute(request, provider);
      const artifact = extractArtifact(proposal);
      
      expect(artifact).toBe(proposal.artifact);
      expect(isArtifact(artifact)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — PROGRESS CALLBACK
// ═══════════════════════════════════════════════════════════════════════════════

describe("Progress Callback", () => {
  it("should call progress callback", async () => {
    const registry = new TemplateRegistry();
    registry.register(createSimpleTemplate());
    
    const stages: string[] = [];
    const engine = new CreationEngine({
      registry,
      onProgress: (stage) => stages.push(stage),
    });
    
    const provider = createTestProvider();
    const request = createTestRequest("SIMPLE_TRANSFORM", {
      input_value: "Test",
    });
    
    await engine.execute(request, provider);
    
    expect(stages).toContain("validation");
    expect(stages).toContain("template_resolution");
    expect(stages).toContain("template_execution");
    expect(stages).toContain("artifact_build");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — TEMPLATE VERSION RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Template Version Resolution", () => {
  let registry: TemplateRegistry;
  let engine: CreationEngine;
  let provider: MockSnapshotProvider;
  
  beforeEach(() => {
    registry = new TemplateRegistry();
    registry.register(createTemplate({
      id: "VERSIONED",
      version: "1.0.0",
      artifactType: "SCENE_OUTLINE",
      description: "V1",
      inputSchema: { type: "object" },
      outputSchema: { type: "object" },
      execute: () => ({ version: "1.0.0" }),
    }));
    registry.register(createTemplate({
      id: "VERSIONED",
      version: "2.0.0",
      artifactType: "SCENE_OUTLINE",
      description: "V2",
      inputSchema: { type: "object" },
      outputSchema: { type: "object" },
      execute: () => ({ version: "2.0.0" }),
    }));
    
    engine = new CreationEngine({ registry });
    provider = createTestProvider();
  });

  it("should resolve specific version with @", async () => {
    const request = createTestRequest("VERSIONED@1.0.0", {});
    const proposal = await engine.execute(request, provider);
    
    expect(proposal.artifact.content).toEqual({ version: "1.0.0" });
    expect(proposal.metrics.template_version).toBe("1.0.0");
  });

  it("should resolve latest version without @", async () => {
    const request = createTestRequest("VERSIONED", {});
    const proposal = await engine.execute(request, provider);
    
    expect(proposal.artifact.content).toEqual({ version: "2.0.0" });
    expect(proposal.metrics.template_version).toBe("2.0.0");
  });
});
