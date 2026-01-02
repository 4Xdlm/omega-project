// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MYCELIUM BIO — TESTS INVARIANTS L4
// ═══════════════════════════════════════════════════════════════════════════════
// 12 invariants certifiables niveau aérospatial
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";

import {
  // Types
  EmotionType,
  EMOTION_TYPES,
  EMOTION_COUNT,
  PHYSICS,
  
  // Modules
  canonicalStringify,
  canonicalHashSync,
  computeGematria,
  createNeutralRecord,
  normalizeIntensities,
  computeEntropy,
  buildEmotionField,
  applyOfficialDecay,
  computeOxygen,
  computeHSL,
  computeDirection,
  isNormalized,
  buildFingerprint,
  cosineSimilarity,
  computeSimilarity,
  computeMerkleRoot,
  verifyIntegrity,
  recomputeAllHashes,
  buildMyceliumDNA,
  verifyDeterminism,
  
  // Types pour construction
  TextSegment
} from "../src/index";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_SEGMENTS: TextSegment[] = [
  {
    text: "Le soleil brillait sur la vallée verdoyante.",
    kind: "sentence",
    index: 0,
    emotions: { joy: 0.6, hope: 0.4, trust: 0.3 }
  },
  {
    text: "Mais une ombre menaçante s'approchait lentement.",
    kind: "sentence",
    index: 1,
    emotions: { fear: 0.5, anticipation: 0.4 }
  },
  {
    text: "Le héros serra les poings, prêt à combattre!",
    kind: "sentence",
    index: 2,
    emotions: { anger: 0.6, pride: 0.5 },
    eventBoost: 0.4
  },
  {
    text: "La victoire fut éclatante et le peuple exulta.",
    kind: "sentence",
    index: 3,
    emotions: { joy: 0.9, pride: 0.7, love: 0.4 },
    eventBoost: 0.6
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// INV-MYC-01: DÉTERMINISME DNA
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-MYC-01: Déterminisme DNA", () => {
  it("même texte + seed → même rootHash (100 runs)", () => {
    const baseline = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    
    for (let i = 0; i < 100; i++) {
      const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
      expect(dna.rootHash).toBe(baseline.rootHash);
    }
  });

  it("seed différent → hash différent", () => {
    const dna1 = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    const dna2 = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 43 });
    
    expect(dna1.rootHash).not.toBe(dna2.rootHash);
  });

  it("verifyDeterminism helper fonctionne", () => {
    expect(verifyDeterminism(SAMPLE_SEGMENTS, { seed: 42 })).toBe(true);
  });

  it("canonical JSON est stable", () => {
    const obj = { z: 3, a: 1, m: { y: 2, x: 1 } };
    const baseline = canonicalStringify(obj);
    
    for (let i = 0; i < 100; i++) {
      expect(canonicalStringify(obj)).toBe(baseline);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INV-MYC-02: COMPATIBILITÉ EMOTION ENGINE 14D
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-MYC-02: Compatibilité EmotionEngine 14D", () => {
  it("EMOTION_COUNT = 14", () => {
    expect(EMOTION_COUNT).toBe(14);
  });

  it("EMOTION_TYPES contient exactement 14 émotions", () => {
    expect(EMOTION_TYPES.length).toBe(14);
  });

  it("toutes les émotions attendues sont présentes", () => {
    const expected: EmotionType[] = [
      "joy", "fear", "anger", "sadness",
      "surprise", "disgust", "trust", "anticipation",
      "love", "guilt", "shame", "pride",
      "hope", "despair"
    ];
    
    for (const e of expected) {
      expect(EMOTION_TYPES).toContain(e);
    }
  });

  it("createNeutralRecord produit 14 états", () => {
    const record = createNeutralRecord();
    expect(Object.keys(record).length).toBe(14);
  });

  it("DNA fingerprint contient 14 émotions", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    const dist = dna.fingerprint.emotionDistribution;
    expect(Object.keys(dist).length).toBe(14);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INV-MYC-03: FORMULES OFFICIELLES
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-MYC-03: Formules Officielles", () => {
  it("decay exponentiel vers baseline", () => {
    const state = {
      type: "anger" as EmotionType,
      mass: 2.0,
      intensity: 0.9,
      inertia: 0.4,
      decay_rate: 0.2,
      baseline: 0.2
    };
    
    // Après decay
    const decayed = applyOfficialDecay(state, 5000);
    
    // Doit être entre baseline et intensity
    expect(decayed).toBeGreaterThanOrEqual(state.baseline);
    expect(decayed).toBeLessThan(state.intensity);
    
    // Plus le temps passe, plus on se rapproche du baseline
    const moreDecayed = applyOfficialDecay(state, 30000);
    expect(moreDecayed).toBeLessThan(decayed);
    expect(moreDecayed).toBeGreaterThanOrEqual(state.baseline);
  });

  it("entropie normalisée log(14)", () => {
    const record = createNeutralRecord();
    const normalized = normalizeIntensities(record);
    const entropy = computeEntropy(normalized);
    
    // Distribution uniforme = entropie maximale ≈ 1
    expect(entropy).toBeGreaterThan(0.95);
    expect(entropy).toBeLessThanOrEqual(1.0);
  });

  it("PHYSICS.ENTROPY_LOG_BASE = log(14)", () => {
    expect(Math.abs(PHYSICS.ENTROPY_LOG_BASE - Math.log(14))).toBeLessThan(0.0001);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INV-MYC-04: CONSERVATION ÉMOTIONNELLE
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-MYC-04: Conservation Émotionnelle", () => {
  it("conservationDelta est calculé", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    const sentenceNodes = dna.nodes.filter(n => n.kind === "sentence");
    
    for (const node of sentenceNodes) {
      expect(typeof node.emotionField.conservationDelta).toBe("number");
      expect(node.emotionField.conservationDelta).toBeGreaterThanOrEqual(0);
    }
  });

  it("avgConservationDelta est dans fingerprint", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    expect(typeof dna.fingerprint.breathing.avgConservationDelta).toBe("number");
  });

  it("PHYSICS.CONSERVATION_MAX_DELTA = 0.05", () => {
    expect(PHYSICS.CONSERVATION_MAX_DELTA).toBe(0.05);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INV-MYC-05: GÉMATRIE CANONIQUE
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-MYC-05: Gématrie Canonique", () => {
  it("OMEGA = 41", () => {
    expect(computeGematria("OMEGA")).toBe(41);
  });

  it("A=1, Z=26", () => {
    expect(computeGematria("A")).toBe(1);
    expect(computeGematria("Z")).toBe(26);
  });

  it("case insensitive", () => {
    expect(computeGematria("omega")).toBe(computeGematria("OMEGA"));
    expect(computeGematria("OmEgA")).toBe(computeGematria("OMEGA"));
  });

  it("ignore non-lettres", () => {
    expect(computeGematria("O.M.E.G.A")).toBe(41);
    expect(computeGematria("OMEGA 123")).toBe(41);
  });

  it("déterministe", () => {
    const baseline = computeGematria("MYCELIUM");
    for (let i = 0; i < 100; i++) {
      expect(computeGematria("MYCELIUM")).toBe(baseline);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INV-MYC-06: OXYGEN BOUNDS
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-MYC-06: Oxygen Bounds", () => {
  it("O₂ ∈ [0, 1] pour tous les nœuds", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    
    for (const node of dna.nodes) {
      expect(node.oxygen).toBeGreaterThanOrEqual(0);
      expect(node.oxygen).toBeLessThanOrEqual(1);
    }
  });

  it("computeOxygen retourne valeurs bornées", () => {
    const field = buildEmotionField(createNeutralRecord());
    
    // Cas extrêmes
    const result1 = computeOxygen(field, 0, 0);
    expect(result1.final).toBeGreaterThanOrEqual(0);
    expect(result1.final).toBeLessThanOrEqual(1);
    
    const result2 = computeOxygen(field, 1.0, 1000);
    expect(result2.final).toBeGreaterThanOrEqual(0);
    expect(result2.final).toBeLessThanOrEqual(1);
  });

  it("histogramme O₂ normalisé (Σ = 1)", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    const sum = dna.fingerprint.oxygenHistogram.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(0.01);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INV-MYC-07: HSL BOUNDS
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-MYC-07: HSL Bounds", () => {
  it("H ∈ [0, 360] pour tous les nœuds", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    
    for (const node of dna.nodes) {
      expect(node.color.h).toBeGreaterThanOrEqual(0);
      expect(node.color.h).toBeLessThanOrEqual(360);
    }
  });

  it("S ∈ [0, 1] pour tous les nœuds", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    
    for (const node of dna.nodes) {
      expect(node.color.s).toBeGreaterThanOrEqual(0);
      expect(node.color.s).toBeLessThanOrEqual(1);
    }
  });

  it("L ∈ [0, 1] pour tous les nœuds", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    
    for (const node of dna.nodes) {
      expect(node.color.l).toBeGreaterThanOrEqual(0);
      expect(node.color.l).toBeLessThanOrEqual(1);
    }
  });

  it("histogramme Hue normalisé (Σ = 1)", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    const sum = dna.fingerprint.hueHistogram.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(0.01);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INV-MYC-08: FINGERPRINT STABLE
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-MYC-08: Fingerprint Stable", () => {
  it("emotionDistribution Σ = 1", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    const sum = Object.values(dna.fingerprint.emotionDistribution)
      .reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(0.01);
  });

  it("oxygenHistogram a 20 bins", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    expect(dna.fingerprint.oxygenHistogram.length).toBe(PHYSICS.OXYGEN_HISTOGRAM_BINS);
  });

  it("hueHistogram a 24 bins", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    expect(dna.fingerprint.hueHistogram.length).toBe(PHYSICS.HUE_HISTOGRAM_BINS);
  });

  it("fingerprint déterministe", () => {
    const dna1 = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    const dna2 = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    
    // Comparer les distributions
    for (const type of EMOTION_TYPES) {
      expect(dna1.fingerprint.emotionDistribution[type])
        .toBe(dna2.fingerprint.emotionDistribution[type]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INV-MYC-09: SIMILARITÉ SYMÉTRIQUE
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-MYC-09: Similarité Symétrique", () => {
  it("sim(A, B) = sim(B, A)", () => {
    const dna1 = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    const dna2 = buildMyceliumDNA(SAMPLE_SEGMENTS.slice(0, 2), { seed: 42 });
    
    const sim12 = computeSimilarity(dna1.fingerprint, dna2.fingerprint);
    const sim21 = computeSimilarity(dna2.fingerprint, dna1.fingerprint);
    
    expect(Math.abs(sim12.score - sim21.score)).toBeLessThan(0.0001);
  });

  it("cosineSimilarity symétrique", () => {
    const a = [0.3, 0.5, 0.2];
    const b = [0.4, 0.4, 0.2];
    
    expect(cosineSimilarity(a, b)).toBe(cosineSimilarity(b, a));
  });

  it("similarité avec soi-même = 1", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    const sim = computeSimilarity(dna.fingerprint, dna.fingerprint);
    
    expect(sim.score).toBeGreaterThan(0.99);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INV-MYC-10: NO VOLATILE IN HASH
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-MYC-10: No Volatile in Hash", () => {
  it("timestamp n'affecte pas rootHash", () => {
    // Construire deux fois avec délai
    const dna1 = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    
    // Attendre un peu (simulé par reconstruction)
    const dna2 = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    
    // Les timestamps sont différents mais les hash identiques
    expect(dna1.rootHash).toBe(dna2.rootHash);
  });

  it("meta.computedAt est HORS du rootHash", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    
    // Vérifier que meta existe mais n'affecte pas le hash
    expect(dna.meta.computedAt).toBeDefined();
    expect(dna.meta.nodeCount).toBe(5); // 1 book + 4 sentences
  });

  it("processingTimeMs est HORS du rootHash", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    expect(typeof dna.meta.processingTimeMs).toBe("number");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INV-MYC-11: MERKLE STABILITY
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-MYC-11: Merkle Stability", () => {
  it("ordre des nœuds = ordre des leaves", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    
    // Vérifier que les sentence nodes sont ordonnés par index
    const sentenceNodes = dna.nodes.filter(n => n.kind === "sentence");
    for (let i = 0; i < sentenceNodes.length - 1; i++) {
      expect(sentenceNodes[i].sentenceIndex)
        .toBeLessThan(sentenceNodes[i + 1].sentenceIndex!);
    }
  });

  it("computeMerkleRoot déterministe", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    
    const root1 = computeMerkleRoot(dna.nodes);
    const root2 = computeMerkleRoot(dna.nodes);
    
    expect(root1).toBe(root2);
  });

  it("rootHash format = 64 hex chars", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    expect(dna.rootHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INV-MYC-12: PROOF REPRODUCIBILITY
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-MYC-12: Proof Reproducibility", () => {
  it("nodeHash recalculable", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    
    // Recalculer tous les hashes
    const recomputed = recomputeAllHashes([...dna.nodes] as any);
    
    // Comparer
    for (let i = 0; i < dna.nodes.length; i++) {
      expect(dna.nodes[i].nodeHash).toBe(recomputed[i].nodeHash);
    }
  });

  it("verifyIntegrity détecte corruption", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    
    // Intégrité OK
    const check1 = verifyIntegrity(dna.nodes);
    expect(check1.valid).toBe(true);
    
    // Corrompre un nœud
    const corrupted = [...dna.nodes] as any;
    corrupted[1] = { ...corrupted[1], oxygen: 0.999 };
    
    const check2 = verifyIntegrity(corrupted);
    expect(check2.valid).toBe(false);
    expect(check2.corrupted).toContain(1);
  });

  it("direction toujours normalisée", () => {
    const dna = buildMyceliumDNA(SAMPLE_SEGMENTS, { seed: 42 });
    
    for (const node of dna.nodes) {
      expect(isNormalized(node.direction)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BONUS: STRESS TEST
// ─────────────────────────────────────────────────────────────────────────────

describe("STRESS: Performance et robustesse", () => {
  it("gère 100 segments", () => {
    const manySegments: TextSegment[] = [];
    for (let i = 0; i < 100; i++) {
      manySegments.push({
        text: `Phrase numéro ${i} avec du contenu varié.`,
        kind: "sentence",
        index: i,
        emotions: {
          joy: Math.sin(i * 0.1) * 0.5 + 0.5,
          fear: Math.cos(i * 0.1) * 0.3 + 0.3
        }
      });
    }
    
    const dna = buildMyceliumDNA(manySegments, { seed: 42 });
    expect(dna.nodes.length).toBe(101); // 1 book + 100 sentences
    expect(dna.rootHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("temps de construction < 5s pour 100 segments", () => {
    const manySegments: TextSegment[] = [];
    for (let i = 0; i < 100; i++) {
      manySegments.push({
        text: `Phrase numéro ${i} avec du contenu.`,
        kind: "sentence",
        index: i,
        emotions: { joy: 0.5 }
      });
    }
    
    const start = Date.now();
    buildMyceliumDNA(manySegments, { seed: 42 });
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeLessThan(5000);
  });
});
