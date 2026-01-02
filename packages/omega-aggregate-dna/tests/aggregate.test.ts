// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — AGGREGATE DNA v1.0.0 — TESTS L4
// ═══════════════════════════════════════════════════════════════════════════════
// 25+ tests NASA-Grade pour certification aérospatiale
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { aggregateDNA, verifyAggregationDeterminism } from "../src/aggregate.js";
import { computeMerkleRoot, generateMerkleProof, verifyMerkleProof } from "../src/merkle.js";
import {
  assertAggregationInvariants,
  assertMerkleValid,
  assertOrderSensitive,
  assertEmptyValid,
} from "../src/invariants.js";
import {
  MyceliumDNAAdapter,
  createMockMyceliumDNA,
  type MyceliumDNA,
} from "../src/mycelium_adapter.js";

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function mkDNA(seed: number, hash: string, joyIntensity: number = 0.2): MyceliumDNA {
  return createMockMyceliumDNA(seed, hash, { joy: joyIntensity, fear: 0.1 });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MERKLE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Merkle Tree", () => {
  it("arbre vide retourne hash constant", () => {
    const root = computeMerkleRoot([]);
    expect(root).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(root)).toBe(true);
  });

  it("single leaf retourne hash valide", () => {
    const root = computeMerkleRoot(["a".repeat(64)]);
    expect(root).toHaveLength(64);
  });

  it("déterminisme: 100 runs identiques", () => {
    const leaves = ["hash1", "hash2", "hash3", "hash4"];
    const roots = new Set<string>();

    for (let i = 0; i < 100; i++) {
      roots.add(computeMerkleRoot(leaves));
    }

    expect(roots.size).toBe(1);
  });

  it("ordre sensible: [A,B] ≠ [B,A]", () => {
    const rootAB = computeMerkleRoot(["A", "B"]);
    const rootBA = computeMerkleRoot(["B", "A"]);

    expect(rootAB).not.toBe(rootBA);
  });

  it("nombre impair de feuilles géré", () => {
    const root3 = computeMerkleRoot(["a", "b", "c"]);
    const root5 = computeMerkleRoot(["a", "b", "c", "d", "e"]);

    expect(root3).toHaveLength(64);
    expect(root5).toHaveLength(64);
  });

  it("proof/verify fonctionne", () => {
    const leaves = ["hash1", "hash2", "hash3", "hash4"];
    const proof = generateMerkleProof(leaves, 2);

    expect(verifyMerkleProof("hash3", proof)).toBe(true);
    expect(verifyMerkleProof("wrong", proof)).toBe(false);
  });

  it("proof pour chaque feuille valide", () => {
    const leaves = ["a", "b", "c", "d", "e"];

    for (let i = 0; i < leaves.length; i++) {
      const proof = generateMerkleProof(leaves, i);
      expect(verifyMerkleProof(leaves[i], proof)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATION BASIC TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Aggregation — Basic", () => {
  it("agrège 2 segments correctement", () => {
    const seed = 42;
    const dnaA = mkDNA(seed, "a".repeat(64), 0.3);
    const dnaB = mkDNA(seed, "b".repeat(64), 0.7);

    const result = aggregateDNA(
      { seed, version: "1.0.0", segmentDNAs: [dnaA, dnaB] },
      MyceliumDNAAdapter
    );

    expect(result.aggregation.segment_count).toBe(2);
    expect(result.aggregation.merkle_root).toHaveLength(64);
    expect(result.dna.rootHash).toHaveLength(64);
  });

  it("agrège 5 segments", () => {
    const seed = 42;
    const dnas = Array.from({ length: 5 }, (_, i) =>
      mkDNA(seed, `hash${i}`.padEnd(64, "0"), 0.2)
    );

    const result = aggregateDNA(
      { seed, version: "1.0.0", segmentDNAs: dnas },
      MyceliumDNAAdapter
    );

    expect(result.aggregation.segment_count).toBe(5);
    expect(result.aggregation.segment_root_hashes).toHaveLength(5);
  });

  it("gère 0 segments (corpus vide)", () => {
    const result = aggregateDNA(
      { seed: 42, version: "1.0.0", segmentDNAs: [] },
      MyceliumDNAAdapter
    );

    expect(result.aggregation.segment_count).toBe(0);
    expect(result.stats.total_words).toBe(0);
    assertEmptyValid(result);
  });

  it("ajoute les métadonnées d'agrégation au DNA", () => {
    const seed = 42;
    const dnaA = mkDNA(seed, "a".repeat(64));

    const result = aggregateDNA(
      { seed, version: "1.0.0", segmentDNAs: [dnaA] },
      MyceliumDNAAdapter
    );

    expect(result.dna.aggregation).toBeDefined();
    expect(result.dna.aggregation?.merkle_root).toBe(result.aggregation.merkle_root);
    expect(result.dna.aggregation?.aggregator_version).toBe("1.0.0");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Déterminisme (L4 Critical)", () => {
  it("100 runs → même rootHash", () => {
    const seed = 42;
    const dnaA = mkDNA(seed, "a".repeat(64), 0.2);
    const dnaB = mkDNA(seed, "b".repeat(64), 0.6);

    const hashes = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const result = aggregateDNA(
        { seed, version: "1.0.0", segmentDNAs: [dnaA, dnaB] },
        MyceliumDNAAdapter
      );
      hashes.add(result.dna.rootHash);
    }

    expect(hashes.size).toBe(1);
  });

  it("100 runs → même merkle_root", () => {
    const seed = 42;
    const dnas = [
      mkDNA(seed, "x".repeat(64)),
      mkDNA(seed, "y".repeat(64)),
      mkDNA(seed, "z".repeat(64)),
    ];

    const merkles = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const result = aggregateDNA(
        { seed, version: "1.0.0", segmentDNAs: dnas },
        MyceliumDNAAdapter
      );
      merkles.add(result.aggregation.merkle_root);
    }

    expect(merkles.size).toBe(1);
  });

  it("verifyAggregationDeterminism retourne true", () => {
    const seed = 42;
    const dnas = [mkDNA(seed, "a".repeat(64)), mkDNA(seed, "b".repeat(64))];

    const isDeterministic = verifyAggregationDeterminism(
      { seed, version: "1.0.0", segmentDNAs: dnas },
      MyceliumDNAAdapter,
      10
    );

    expect(isDeterministic).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER SENSITIVITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Ordre sensible", () => {
  it("[A,B] ≠ [B,A] — merkle root différent", () => {
    const seed = 42;
    const dnaA = mkDNA(seed, "a".repeat(64), 0.1);
    const dnaB = mkDNA(seed, "b".repeat(64), 0.9);

    const resultAB = aggregateDNA(
      { seed, version: "1.0.0", segmentDNAs: [dnaA, dnaB] },
      MyceliumDNAAdapter
    );

    const resultBA = aggregateDNA(
      { seed, version: "1.0.0", segmentDNAs: [dnaB, dnaA] },
      MyceliumDNAAdapter
    );

    expect(resultAB.aggregation.merkle_root).not.toBe(resultBA.aggregation.merkle_root);
  });

  it("[A,B] ≠ [B,A] — rootHash différent", () => {
    const seed = 42;
    const dnaA = mkDNA(seed, "a".repeat(64));
    const dnaB = mkDNA(seed, "b".repeat(64));

    const resultAB = aggregateDNA(
      { seed, version: "1.0.0", segmentDNAs: [dnaA, dnaB] },
      MyceliumDNAAdapter
    );

    const resultBA = aggregateDNA(
      { seed, version: "1.0.0", segmentDNAs: [dnaB, dnaA] },
      MyceliumDNAAdapter
    );

    expect(resultAB.dna.rootHash).not.toBe(resultBA.dna.rootHash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEED VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Validation seed", () => {
  it("rejette segments avec seeds différents", () => {
    const dnaA = mkDNA(42, "a".repeat(64));
    const dnaB = mkDNA(99, "b".repeat(64)); // seed différent!

    expect(() =>
      aggregateDNA(
        { seed: 42, version: "1.0.0", segmentDNAs: [dnaA, dnaB] },
        MyceliumDNAAdapter
      )
    ).toThrow(/seed mismatch/i);
  });

  it("accepte segments avec même seed", () => {
    const seed = 42;
    const dnaA = mkDNA(seed, "a".repeat(64));
    const dnaB = mkDNA(seed, "b".repeat(64));

    expect(() =>
      aggregateDNA(
        { seed, version: "1.0.0", segmentDNAs: [dnaA, dnaB] },
        MyceliumDNAAdapter
      )
    ).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Invariants L4", () => {
  it("INV-AGG-02: Merkle valide (peut être recalculé)", () => {
    const seed = 42;
    const dnas = [
      mkDNA(seed, "a".repeat(64)),
      mkDNA(seed, "b".repeat(64)),
      mkDNA(seed, "c".repeat(64)),
    ];

    const result = aggregateDNA(
      { seed, version: "1.0.0", segmentDNAs: dnas },
      MyceliumDNAAdapter
    );

    // L'invariant vérifie que merkle_root correspond aux segment hashes
    expect(() => assertMerkleValid(result.aggregation)).not.toThrow();
  });

  it("INV-AGG-03: Ordre sensible (assertion)", () => {
    const seed = 42;
    const dnaA = mkDNA(seed, "a".repeat(64));
    const dnaB = mkDNA(seed, "b".repeat(64));

    const resultAB = aggregateDNA(
      { seed, version: "1.0.0", segmentDNAs: [dnaA, dnaB] },
      MyceliumDNAAdapter
    );

    const resultBA = aggregateDNA(
      { seed, version: "1.0.0", segmentDNAs: [dnaB, dnaA] },
      MyceliumDNAAdapter
    );

    expect(() =>
      assertOrderSensitive(resultAB.aggregation.merkle_root, resultBA.aggregation.merkle_root)
    ).not.toThrow();
  });

  it("INV-AGG-06: Vide valide", () => {
    const result = aggregateDNA(
      { seed: 42, version: "1.0.0", segmentDNAs: [] },
      MyceliumDNAAdapter
    );

    expect(() => assertEmptyValid(result)).not.toThrow();
  });

  it("assertAggregationInvariants passe sur agrégation valide", () => {
    const seed = 42;
    const dnas = [
      mkDNA(seed, "a".repeat(64)),
      mkDNA(seed, "b".repeat(64)),
    ];

    const result = aggregateDNA(
      { seed, version: "1.0.0", segmentDNAs: dnas },
      MyceliumDNAAdapter
    );

    expect(() => assertAggregationInvariants(result)).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENTATION HASH TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Segmentation Hash", () => {
  it("conserve le segmentation_hash fourni", () => {
    const seed = 42;
    const segHash = "seg".repeat(21).slice(0, 64);

    const result = aggregateDNA(
      {
        seed,
        version: "1.0.0",
        segmentDNAs: [mkDNA(seed, "a".repeat(64))],
        segmentationHash: segHash,
      },
      MyceliumDNAAdapter
    );

    expect(result.aggregation.segmentation_hash).toBe(segHash);
    expect(result.dna.aggregation?.segmentation_hash).toBe(segHash);
  });

  it("segmentation_hash null si non fourni", () => {
    const result = aggregateDNA(
      { seed: 42, version: "1.0.0", segmentDNAs: [mkDNA(42, "a".repeat(64))] },
      MyceliumDNAAdapter
    );

    expect(result.aggregation.segmentation_hash).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Poids personnalisés", () => {
  it("accepte des poids explicites", () => {
    const seed = 42;
    const dnaA = mkDNA(seed, "a".repeat(64));
    const dnaB = mkDNA(seed, "b".repeat(64));

    const result = aggregateDNA(
      {
        seed,
        version: "1.0.0",
        segmentDNAs: [dnaA, dnaB],
        segmentWeights: [10, 30],
      },
      MyceliumDNAAdapter
    );

    expect(result.aggregation.weighting).toBe("word_count");
  });

  it("rejette poids avec longueur incorrecte", () => {
    const seed = 42;
    const dnas = [mkDNA(seed, "a".repeat(64)), mkDNA(seed, "b".repeat(64))];

    expect(() =>
      aggregateDNA(
        {
          seed,
          version: "1.0.0",
          segmentDNAs: dnas,
          segmentWeights: [10], // 1 poids pour 2 segments
        },
        MyceliumDNAAdapter
      )
    ).toThrow(/length mismatch/i);
  });

  it("rejette poids négatifs", () => {
    const seed = 42;
    const dnas = [mkDNA(seed, "a".repeat(64))];

    expect(() =>
      aggregateDNA(
        {
          seed,
          version: "1.0.0",
          segmentDNAs: dnas,
          segmentWeights: [-5],
        },
        MyceliumDNAAdapter
      )
    ).toThrow(/invalid weight/i);
  });
});
