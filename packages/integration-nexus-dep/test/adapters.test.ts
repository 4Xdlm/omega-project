/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — ADAPTERS TESTS
 * Version: 0.1.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  GenomeAdapter,
  MyceliumAdapter,
  MyceliumBioAdapter,
  createAdapter,
  getAllAdapters,
  REJECTION_CODES
} from "../src/adapters/index.js";
import { DEFAULT_SEED } from "../src/contracts/io.js";

// ═══════════════════════════════════════════════════════════════════════════════
// GENOME ADAPTER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Adapters — GenomeAdapter", () => {
  it("should be READ-ONLY", () => {
    const adapter = new GenomeAdapter();
    expect(adapter.isReadOnly).toBe(true);
  });

  it("should have correct name and version", () => {
    const adapter = new GenomeAdapter();
    expect(adapter.name).toBe("genome");
    expect(adapter.version).toBe("1.2.0");
  });

  it("should be frozen (immutable)", () => {
    const adapter = new GenomeAdapter();
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("checkHealth should return healthy status", async () => {
    const adapter = new GenomeAdapter();
    const health = await adapter.checkHealth();
    expect(health.adapter).toBe("genome");
    expect(health.healthy).toBe(true);
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("analyzeText should return NarrativeGenomeData", async () => {
    const adapter = new GenomeAdapter();
    const result = await adapter.analyzeText("Test content", 42);

    expect(result.version).toBe("1.2.0");
    expect(result.sourceHash).toBeDefined();
    expect(result.fingerprint).toBeDefined();
    expect(result.axes).toBeDefined();
    expect(result.metadata.seed).toBe(42);
  });

  it("analyzeText should be deterministic", async () => {
    const adapter = new GenomeAdapter();
    const result1 = await adapter.analyzeText("Same content", 42);
    const result2 = await adapter.analyzeText("Same content", 42);

    expect(result1.fingerprint).toBe(result2.fingerprint);
    expect(result1.sourceHash).toBe(result2.sourceHash);
  });

  it("computeFingerprint should be deterministic", async () => {
    const adapter = new GenomeAdapter();
    const fp1 = await adapter.computeFingerprint("test", 42);
    const fp2 = await adapter.computeFingerprint("test", 42);

    expect(fp1).toBe(fp2);
  });

  it("compareSimilarity should detect identical fingerprints", async () => {
    const adapter = new GenomeAdapter();
    const data1 = await adapter.analyzeText("test", 42);
    const data2 = await adapter.analyzeText("test", 42);

    const similarity = await adapter.compareSimilarity(data1, data2);
    expect(similarity.score).toBe(1.0);
    expect(similarity.verdict).toBe("IDENTICAL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MYCELIUM ADAPTER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Adapters — MyceliumAdapter", () => {
  it("should be READ-ONLY", () => {
    const adapter = new MyceliumAdapter();
    expect(adapter.isReadOnly).toBe(true);
  });

  it("should have correct name and version", () => {
    const adapter = new MyceliumAdapter();
    expect(adapter.name).toBe("mycelium");
    expect(adapter.version).toBe("1.0.0");
  });

  it("checkHealth should return healthy status", async () => {
    const adapter = new MyceliumAdapter();
    const health = await adapter.checkHealth();
    expect(health.healthy).toBe(true);
  });

  it("validateInput should accept valid content", async () => {
    const adapter = new MyceliumAdapter();
    const result = await adapter.validateInput({
      content: "Valid test content",
      seed: 42
    });

    expect(result.valid).toBe(true);
    expect(result.normalizedContent).toBeDefined();
  });

  it("validateInput should reject empty content", async () => {
    const adapter = new MyceliumAdapter();
    const result = await adapter.validateInput({
      content: "",
      seed: 42
    });

    expect(result.valid).toBe(false);
    expect(result.rejectionCode).toBe(REJECTION_CODES.EMPTY_CONTENT);
  });

  it("validateInput should reject whitespace-only content", async () => {
    const adapter = new MyceliumAdapter();
    const result = await adapter.validateInput({
      content: "   \n\t   ",
      seed: 42
    });

    expect(result.valid).toBe(false);
    expect(result.rejectionCode).toBe(REJECTION_CODES.EMPTY_CONTENT);
  });

  it("validateInput should reject negative seed", async () => {
    const adapter = new MyceliumAdapter();
    const result = await adapter.validateInput({
      content: "Valid content",
      seed: -1
    });

    expect(result.valid).toBe(false);
    expect(result.rejectionCode).toBe(REJECTION_CODES.INVALID_SEED);
  });

  it("normalizeContent should normalize line endings", () => {
    const adapter = new MyceliumAdapter();
    const result = adapter.normalizeContent("line1\r\nline2\rline3\nline4");
    expect(result).toBe("line1\nline2\nline3\nline4");
  });

  it("normalizeContent should trim lines", () => {
    const adapter = new MyceliumAdapter();
    const result = adapter.normalizeContent("  line1  \n  line2  ");
    expect(result).toBe("line1\nline2");
  });

  it("createGenomeInput should create valid output", async () => {
    const adapter = new MyceliumAdapter();
    const result = await adapter.createGenomeInput({
      content: "Test content",
      seed: 42,
      mode: "auto"
    });

    expect(result.accepted).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.output!.seed).toBe(42);
    expect(result.output!.mode).toBe("auto");
  });

  it("createGenomeInput should use defaults", async () => {
    const adapter = new MyceliumAdapter();
    const result = await adapter.createGenomeInput({
      content: "Test content"
    });

    expect(result.accepted).toBe(true);
    expect(result.output!.seed).toBe(DEFAULT_SEED);
    expect(result.output!.mode).toBe("auto");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MYCELIUM-BIO ADAPTER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Adapters — MyceliumBioAdapter", () => {
  it("should be READ-ONLY", () => {
    const adapter = new MyceliumBioAdapter();
    expect(adapter.isReadOnly).toBe(true);
  });

  it("should have correct name and version", () => {
    const adapter = new MyceliumBioAdapter();
    expect(adapter.name).toBe("mycelium-bio");
    expect(adapter.version).toBe("1.0.0");
  });

  it("checkHealth should return healthy status", async () => {
    const adapter = new MyceliumBioAdapter();
    const health = await adapter.checkHealth();
    expect(health.healthy).toBe(true);
  });

  it("buildDNA should return BuildDNAOutput", async () => {
    const adapter = new MyceliumBioAdapter();
    const result = await adapter.buildDNA({
      validatedContent: "Test content",
      seed: 42,
      mode: "auto"
    });

    expect(result.rootHash).toBeDefined();
    expect(result.nodeCount).toBe(0); // Skeleton returns 0
    expect(result.fingerprint).toBeDefined();
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("buildDNA should be deterministic", async () => {
    const adapter = new MyceliumBioAdapter();
    const result1 = await adapter.buildDNA({
      validatedContent: "Same content",
      seed: 42,
      mode: "auto"
    });
    const result2 = await adapter.buildDNA({
      validatedContent: "Same content",
      seed: 42,
      mode: "auto"
    });

    expect(result1.rootHash).toBe(result2.rootHash);
  });

  it("computeDNA should return MyceliumDNA", async () => {
    const adapter = new MyceliumBioAdapter();
    const dna = await adapter.computeDNA("Test content", 42);

    expect(dna.version).toBe("1.0.0");
    expect(dna.profile).toBe("L4");
    expect(dna.seed).toBe(42);
    expect(dna.sourceHash).toBeDefined();
    expect(dna.rootHash).toBeDefined();
    expect(dna.fingerprint).toBeDefined();
    expect(dna.nodes).toEqual([]);
  });

  it("compareFragrance should detect identical DNA", async () => {
    const adapter = new MyceliumBioAdapter();
    const dna1 = await adapter.computeDNA("test", 42);
    const dna2 = await adapter.computeDNA("test", 42);

    const similarity = await adapter.compareFragrance(dna1, dna2);
    expect(similarity.score).toBe(1.0);
    expect(similarity.verdict).toBe("IDENTICAL");
  });

  it("extractFingerprint should return fingerprint from DNA", async () => {
    const adapter = new MyceliumBioAdapter();
    const dna = await adapter.computeDNA("test", 42);
    const fp = adapter.extractFingerprint(dna);

    expect(fp).toBe(dna.fingerprint);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTER FACTORY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Adapters — Factory", () => {
  it("createAdapter should create genome adapter", () => {
    const adapter = createAdapter("genome");
    expect(adapter.name).toBe("genome");
    expect(adapter.isReadOnly).toBe(true);
  });

  it("createAdapter should create mycelium adapter", () => {
    const adapter = createAdapter("mycelium");
    expect(adapter.name).toBe("mycelium");
    expect(adapter.isReadOnly).toBe(true);
  });

  it("createAdapter should create mycelium-bio adapter", () => {
    const adapter = createAdapter("mycelium-bio");
    expect(adapter.name).toBe("mycelium-bio");
    expect(adapter.isReadOnly).toBe(true);
  });

  it("createAdapter should throw on unknown type", () => {
    expect(() => createAdapter("unknown" as never)).toThrow();
  });

  it("getAllAdapters should return all 3 adapters", () => {
    const adapters = getAllAdapters();
    expect(adapters).toHaveLength(3);

    const names = adapters.map(a => a.name);
    expect(names).toContain("genome");
    expect(names).toContain("mycelium");
    expect(names).toContain("mycelium-bio");
  });

  it("all adapters should be READ-ONLY", () => {
    const adapters = getAllAdapters();
    for (const adapter of adapters) {
      expect(adapter.isReadOnly).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Adapters — Invariants", () => {
  it("INV-NEXUS-01: All adapters enforce READ-ONLY", () => {
    const adapters = getAllAdapters();
    for (const adapter of adapters) {
      expect(adapter.isReadOnly).toBe(true);
      expect(Object.isFrozen(adapter)).toBe(true);
    }
  });

  it("INV-NEXUS-02: Determinism with same seed", async () => {
    const genome = new GenomeAdapter();
    const bio = new MyceliumBioAdapter();

    // Genome adapter
    const g1 = await genome.analyzeText("content", 42);
    const g2 = await genome.analyzeText("content", 42);
    expect(g1.fingerprint).toBe(g2.fingerprint);

    // Bio adapter
    const d1 = await bio.computeDNA("content", 42);
    const d2 = await bio.computeDNA("content", 42);
    expect(d1.rootHash).toBe(d2.rootHash);
  });

  it("INV-NEXUS-02: Different seed produces different output", async () => {
    const genome = new GenomeAdapter();

    const g1 = await genome.analyzeText("content", 42);
    const g2 = await genome.analyzeText("content", 43);
    expect(g1.fingerprint).not.toBe(g2.fingerprint);
  });
});
