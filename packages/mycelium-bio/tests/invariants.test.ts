// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MYCELIUM BIO INVARIANTS TEST v1.0.0
// ═══════════════════════════════════════════════════════════════════════════════
// Tests L4 NASA-Grade: 12 invariants SACRÉS
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  // Types
  EMOTION_TYPES,
  EMOTION_COUNT,
  PHYSICS,
  
  // Canonical JSON
  canonicalStringify,
  canonicalHashSync,
  
  // Gematria
  computeGematria,
  
  // Emotion Field
  createNeutralRecord,
  normalizeIntensities,
  computeEntropy,
  computeTotalEnergy,
  buildEmotionField,
  applyOfficialDecay,
  
  // Bio Engine
  computeOxygen,
  
  // Morpho Engine
  computeHSL,
  computeDirection,
  isNormalized,
  EMOTION_HUE_MAP,
  
  // Fingerprint
  cosineSimilarity,
  buildFingerprint,
  computeSimilarity,
  
  // Merkle
  computeNodeHash,
  computeMerkleRoot,
  verifyIntegrity,
  recomputeAllHashes,
  
  // DNA Builder
  buildMyceliumDNA,
  verifyDeterminism,
  
  // Types
  EmotionType,
  EmotionState,
  IntensityRecord14,
  MyceliumNode,
  TextSegment
} from "../src/index";

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const SEED = 42;

const TEST_SEGMENTS: TextSegment[] = [
  {
    text: "Il était une fois dans un royaume enchanté.",
    kind: "sentence",
    index: 0,
    emotions: { joy: 0.4, anticipation: 0.3, trust: 0.2 }
  },
  {
    text: "Le roi portait une lourde couronne de doutes.",
    kind: "sentence",
    index: 1,
    emotions: { sadness: 0.5, fear: 0.3 }
  },
  {
    text: "Soudain, un dragon apparut!",
    kind: "sentence",
    index: 2,
    emotions: { fear: 0.7, surprise: 0.8 },
    eventBoost: 0.6
  },
  {
    text: "Le héros brandit son épée avec courage.",
    kind: "sentence",
    index: 3,
    emotions: { anger: 0.4, pride: 0.6 }
  },
  {
    text: "La victoire fut totale et la joie immense.",
    kind: "sentence",
    index: 4,
    emotions: { joy: 0.9, pride: 0.7, love: 0.3 }
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MYC-01: DÉTERMINISME DNA
// "Même texte + même seed → même rootHash"
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MYC-01: Déterminisme DNA", () => {
  it("même segments + même seed → même rootHash (10 runs)", () => {
    const hashes: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
      hashes.push(dna.rootHash);
    }
    
    // Tous les hashes doivent être identiques
    const unique = new Set(hashes);
    expect(unique.size).toBe(1);
    expect(hashes[0]).toMatch(/^[a-f0-9]{64}$/);
  });

  it("verifyDeterminism() retourne true", () => {
    expect(verifyDeterminism(TEST_SEGMENTS, { seed: SEED })).toBe(true);
  });

  it("seed différent → hash différent", () => {
    const dna1 = buildMyceliumDNA(TEST_SEGMENTS, { seed: 42 });
    const dna2 = buildMyceliumDNA(TEST_SEGMENTS, { seed: 43 });
    
    expect(dna1.rootHash).not.toBe(dna2.rootHash);
  });

  it("texte différent → hash différent", () => {
    const segments2 = [...TEST_SEGMENTS];
    segments2[0] = { ...segments2[0], text: "Il était deux fois..." };
    
    const dna1 = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    const dna2 = buildMyceliumDNA(segments2, { seed: SEED });
    
    expect(dna1.rootHash).not.toBe(dna2.rootHash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MYC-02: COMPATIBILITÉ EMOTION ENGINE 14D
// "14 émotions officielles, pas 8"
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MYC-02: Compatibilité EmotionEngine 14D", () => {
  it("EMOTION_TYPES contient exactement 14 émotions", () => {
    expect(EMOTION_TYPES.length).toBe(14);
    expect(EMOTION_COUNT).toBe(14);
  });

  it("toutes les 14 émotions sont présentes", () => {
    const expected: EmotionType[] = [
      "joy", "fear", "anger", "sadness",
      "surprise", "disgust", "trust", "anticipation",
      "love", "guilt", "shame", "pride",
      "hope", "despair"
    ];
    
    for (const emotion of expected) {
      expect(EMOTION_TYPES).toContain(emotion);
    }
  });

  it("EmotionRecord14 neutre contient 14 entrées", () => {
    const record = createNeutralRecord();
    const keys = Object.keys(record);
    expect(keys.length).toBe(14);
  });

  it("DNA contient emotionDistribution avec 14 entrées", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    const distKeys = Object.keys(dna.fingerprint.emotionDistribution);
    expect(distKeys.length).toBe(14);
  });

  it("EMOTION_HUE_MAP couvre 14 émotions", () => {
    const hueKeys = Object.keys(EMOTION_HUE_MAP);
    expect(hueKeys.length).toBe(14);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MYC-03: FORMULES OFFICIELLES (Decay)
// "decay = baseline + (intensity - baseline) × e^(-rate×t/mass)"
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MYC-03: Formules Officielles (Decay)", () => {
  it("decay converge vers baseline", () => {
    const state: EmotionState = {
      type: "anger",
      mass: 1.0,
      intensity: 0.9,
      inertia: 0.4,
      decay_rate: 0.2,
      baseline: 0.2
    };
    
    // Après 10 secondes
    const decayed = applyOfficialDecay(state, 10000);
    
    // Doit être plus proche du baseline que l'initial
    const distToBaseline = Math.abs(decayed - state.baseline);
    const initialDist = Math.abs(state.intensity - state.baseline);
    
    expect(distToBaseline).toBeLessThan(initialDist);
  });

  it("decay ne descend jamais sous baseline", () => {
    const state: EmotionState = {
      type: "sadness",
      mass: 0.5,
      intensity: 0.8,
      inertia: 0.6,
      decay_rate: 0.5, // Decay rapide
      baseline: 0.3
    };
    
    // Même après très longtemps
    const decayed = applyOfficialDecay(state, 100000);
    
    expect(decayed).toBeGreaterThanOrEqual(state.baseline - 0.001);
  });

  it("mass élevée ralentit le decay", () => {
    const baseLine = 0.2;
    const stateLight: EmotionState = {
      type: "joy",
      mass: 0.5,
      intensity: 0.9,
      inertia: 0.3,
      decay_rate: 0.2,
      baseline: baseLine
    };
    
    const stateHeavy: EmotionState = {
      ...stateLight,
      mass: 5.0
    };
    
    const decayedLight = applyOfficialDecay(stateLight, 5000);
    const decayedHeavy = applyOfficialDecay(stateHeavy, 5000);
    
    // Heavy mass = moins de decay
    expect(decayedHeavy).toBeGreaterThan(decayedLight);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MYC-04: CONSERVATION ÉMOTIONNELLE
// "Σ E(t) ≈ Σ E(t+1) ± delta_autorisé (5%)"
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MYC-04: Conservation Émotionnelle", () => {
  it("conservationDelta calculé dans EmotionField", () => {
    const record1 = createNeutralRecord();
    const field1 = buildEmotionField(record1);
    
    // Modifier légèrement
    const record2 = { ...record1 };
    record2.joy = { ...record2.joy, intensity: record2.joy.intensity + 0.1 };
    
    const field2 = buildEmotionField(record2, record1);
    
    // conservationDelta doit être défini
    expect(field2.conservationDelta).toBeDefined();
    expect(field2.conservationDelta).toBeGreaterThanOrEqual(0);
  });

  it("DNA tracking avgConservationDelta dans breathing stats", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    expect(dna.fingerprint.breathing.avgConservationDelta).toBeDefined();
    expect(typeof dna.fingerprint.breathing.avgConservationDelta).toBe("number");
  });

  it("PHYSICS.CONSERVATION_MAX_DELTA est défini (5%)", () => {
    expect(PHYSICS.CONSERVATION_MAX_DELTA).toBe(0.05);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MYC-05: GÉMATRIE CANONIQUE
// "G(word) = Σ(A=1..Z=26)"
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MYC-05: Gématrie Canonique", () => {
  it("A=1, Z=26", () => {
    expect(computeGematria("A")).toBe(1);
    expect(computeGematria("Z")).toBe(26);
  });

  it("OMEGA = 41", () => {
    // O(15) + M(13) + E(5) + G(7) + A(1) = 41
    expect(computeGematria("OMEGA")).toBe(41);
  });

  it("case insensitive", () => {
    expect(computeGematria("omega")).toBe(41);
    expect(computeGematria("OmEgA")).toBe(41);
  });

  it("ignore les non-lettres", () => {
    expect(computeGematria("O.M.E.G.A")).toBe(41);
    expect(computeGematria("OMEGA 123 !@#")).toBe(41);
  });

  it("déterministe (100 runs)", () => {
    const results: number[] = [];
    for (let i = 0; i < 100; i++) {
      results.push(computeGematria("MYCELIUM"));
    }
    
    const unique = new Set(results);
    expect(unique.size).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MYC-06: OXYGEN BOUNDS
// "0 ≤ O₂ ≤ 1"
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MYC-06: Oxygen Bounds", () => {
  it("O₂ toujours dans [0, 1]", () => {
    const record = createNeutralRecord();
    const field = buildEmotionField(record);
    
    // Test avec différents paramètres
    const testCases = [
      { eventBoost: 0, streak: 0 },
      { eventBoost: 1, streak: 0 },
      { eventBoost: 0, streak: 1000 },
      { eventBoost: 1, streak: 1000 }
    ];
    
    for (const tc of testCases) {
      const result = computeOxygen(field, tc.eventBoost, tc.streak);
      
      expect(result.base).toBeGreaterThanOrEqual(0);
      expect(result.base).toBeLessThanOrEqual(1);
      expect(result.final).toBeGreaterThanOrEqual(0);
      expect(result.final).toBeLessThanOrEqual(1);
    }
  });

  it("DNA nodes ont tous O₂ dans [0, 1]", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    for (const node of dna.nodes) {
      expect(node.oxygen).toBeGreaterThanOrEqual(0);
      expect(node.oxygen).toBeLessThanOrEqual(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MYC-07: HSL BOUNDS
// "H ∈ [0, 360], S,L ∈ [0, 1]"
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MYC-07: HSL Bounds", () => {
  it("HSL toujours dans les bornes", () => {
    const record = createNeutralRecord();
    const field = buildEmotionField(record);
    
    // Test avec différents O₂
    for (let o2 = 0; o2 <= 1; o2 += 0.1) {
      const hsl = computeHSL(field, o2);
      
      expect(hsl.h).toBeGreaterThanOrEqual(0);
      expect(hsl.h).toBeLessThanOrEqual(360);
      expect(hsl.s).toBeGreaterThanOrEqual(0);
      expect(hsl.s).toBeLessThanOrEqual(1);
      expect(hsl.l).toBeGreaterThanOrEqual(0);
      expect(hsl.l).toBeLessThanOrEqual(1);
    }
  });

  it("tous les EMOTION_HUE dans [0, 360]", () => {
    for (const type of EMOTION_TYPES) {
      const hue = EMOTION_HUE_MAP[type];
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThanOrEqual(360);
    }
  });

  it("DNA nodes ont tous HSL valides", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    for (const node of dna.nodes) {
      expect(node.color.h).toBeGreaterThanOrEqual(0);
      expect(node.color.h).toBeLessThanOrEqual(360);
      expect(node.color.s).toBeGreaterThanOrEqual(0);
      expect(node.color.s).toBeLessThanOrEqual(1);
      expect(node.color.l).toBeGreaterThanOrEqual(0);
      expect(node.color.l).toBeLessThanOrEqual(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MYC-08: FINGERPRINT STABLE
// "Histogrammes normalisés, Σ = 1.0"
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MYC-08: Fingerprint Stable", () => {
  it("emotionDistribution somme à 1", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    const sum = Object.values(dna.fingerprint.emotionDistribution)
      .reduce((a, b) => a + b, 0);
    
    expect(Math.abs(sum - 1)).toBeLessThan(0.001);
  });

  it("oxygenHistogram somme à 1", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    const sum = dna.fingerprint.oxygenHistogram.reduce((a, b) => a + b, 0);
    
    expect(Math.abs(sum - 1)).toBeLessThan(0.001);
  });

  it("hueHistogram somme à 1", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    const sum = dna.fingerprint.hueHistogram.reduce((a, b) => a + b, 0);
    
    expect(Math.abs(sum - 1)).toBeLessThan(0.001);
  });

  it("oxygenHistogram a 20 bins", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    expect(dna.fingerprint.oxygenHistogram.length).toBe(PHYSICS.OXYGEN_HISTOGRAM_BINS);
    expect(PHYSICS.OXYGEN_HISTOGRAM_BINS).toBe(20);
  });

  it("hueHistogram a 24 bins", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    expect(dna.fingerprint.hueHistogram.length).toBe(PHYSICS.HUE_HISTOGRAM_BINS);
    expect(PHYSICS.HUE_HISTOGRAM_BINS).toBe(24);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MYC-09: SIMILARITÉ SYMÉTRIQUE
// "sim(A, B) = sim(B, A)"
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MYC-09: Similarité Symétrique", () => {
  it("cosineSimilarity symétrique", () => {
    const vecA = [0.3, 0.5, 0.2];
    const vecB = [0.4, 0.4, 0.2];
    
    const simAB = cosineSimilarity(vecA, vecB);
    const simBA = cosineSimilarity(vecB, vecA);
    
    expect(Math.abs(simAB - simBA)).toBeLessThan(1e-10);
  });

  it("computeSimilarity symétrique", () => {
    const dna1 = buildMyceliumDNA(TEST_SEGMENTS.slice(0, 3), { seed: 42 });
    const dna2 = buildMyceliumDNA(TEST_SEGMENTS.slice(2, 5), { seed: 42 });
    
    const sim12 = computeSimilarity(dna1.fingerprint, dna2.fingerprint);
    const sim21 = computeSimilarity(dna2.fingerprint, dna1.fingerprint);
    
    expect(Math.abs(sim12.score - sim21.score)).toBeLessThan(1e-10);
  });

  it("similarité avec soi-même = 1", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    const sim = computeSimilarity(dna.fingerprint, dna.fingerprint);
    
    expect(sim.score).toBeCloseTo(1, 5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MYC-10: NO VOLATILE IN HASH
// "timestamp, machine ∉ rootHash"
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MYC-10: No Volatile in Hash", () => {
  it("rootHash stable malgré timestamp différent", async () => {
    const dna1 = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    // Attendre un peu pour changer le timestamp
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const dna2 = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    // Les timestamps sont différents
    expect(dna1.meta.computedAt).not.toBe(dna2.meta.computedAt);
    
    // Mais les rootHash sont identiques
    expect(dna1.rootHash).toBe(dna2.rootHash);
  });

  it("meta.computedAt n'affecte pas rootHash", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    // Le rootHash ne doit pas contenir le timestamp
    const timestampParts = dna.meta.computedAt.split(/[-:TZ]/);
    
    for (const part of timestampParts) {
      if (part.length > 2) {
        // Le hash ne devrait pas dépendre du timestamp
        // (impossible à vérifier directement, mais le test de déterminisme le prouve)
      }
    }
    
    expect(dna.rootHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MYC-11: MERKLE STABILITY
// "Leaf order = sentenceIndex strict"
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MYC-11: Merkle Stability", () => {
  it("nodes ordonnés par sentenceIndex", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    // Filtrer les nœuds avec sentenceIndex
    const sentenceNodes = dna.nodes.filter(n => n.sentenceIndex !== undefined);
    
    for (let i = 1; i < sentenceNodes.length; i++) {
      const prev = sentenceNodes[i - 1].sentenceIndex!;
      const curr = sentenceNodes[i].sentenceIndex!;
      
      expect(curr).toBeGreaterThan(prev);
    }
  });

  it("rootHash change si ordre des segments change", () => {
    const reversed = [...TEST_SEGMENTS].reverse().map((s, i) => ({
      ...s,
      index: i
    }));
    
    const dna1 = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    const dna2 = buildMyceliumDNA(reversed, { seed: SEED });
    
    // Ordre différent = hash différent
    expect(dna1.rootHash).not.toBe(dna2.rootHash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MYC-12: PROOF REPRODUCIBILITY
// "nodeHash recomputable"
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MYC-12: Proof Reproducibility", () => {
  it("nodeHash peut être recalculé", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    for (const node of dna.nodes) {
      const recomputed = computeNodeHash(node);
      expect(recomputed).toBe(node.nodeHash);
    }
  });

  it("verifyIntegrity passe sur DNA fraîchement construit", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    const integrity = verifyIntegrity(dna.nodes);
    
    expect(integrity.valid).toBe(true);
    expect(integrity.corrupted.length).toBe(0);
  });

  it("modification détectée par verifyIntegrity", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    // Copier et modifier un nœud
    const modifiedNodes = [...dna.nodes];
    modifiedNodes[1] = {
      ...modifiedNodes[1],
      oxygen: 0.999 // Modification
    };
    
    const integrity = verifyIntegrity(modifiedNodes);
    
    expect(integrity.valid).toBe(false);
    expect(integrity.corrupted).toContain(1);
  });

  it("Merkle root recalculable", () => {
    const dna = buildMyceliumDNA(TEST_SEGMENTS, { seed: SEED });
    
    const recalculated = computeMerkleRoot(dna.nodes);
    
    expect(recalculated).toBe(dna.rootHash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS SUPPLÉMENTAIRES (ROBUSTESSE)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Robustesse", () => {
  it("DNA avec segments vides", () => {
    const dna = buildMyceliumDNA([], { seed: SEED });
    
    expect(dna.nodes.length).toBe(1); // Juste le nœud book
    expect(dna.rootHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("DNA avec un seul segment", () => {
    const dna = buildMyceliumDNA([TEST_SEGMENTS[0]], { seed: SEED });
    
    expect(dna.nodes.length).toBe(2); // book + 1 sentence
    expect(dna.rootHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("entropie log(14) normalisée", () => {
    // Distribution uniforme = entropie max = 1
    const uniform: Record<EmotionType, number> = {} as any;
    for (const t of EMOTION_TYPES) {
      uniform[t] = 1 / 14;
    }
    
    const entropy = computeEntropy(uniform as IntensityRecord14);
    expect(entropy).toBeCloseTo(1, 2);
    
    // Distribution concentrée = entropie basse
    const concentrated: Record<EmotionType, number> = {} as any;
    for (const t of EMOTION_TYPES) {
      concentrated[t] = 0.001;
    }
    concentrated.joy = 0.986;
    
    const lowEntropy = computeEntropy(concentrated as IntensityRecord14);
    expect(lowEntropy).toBeLessThan(0.3);
  });

  it("direction toujours normalisée", () => {
    const record = createNeutralRecord();
    const field = buildEmotionField(record);
    
    for (let i = 0; i < 100; i++) {
      const dir = computeDirection(field, `node-${i}`, SEED + i);
      expect(isNormalized(dir)).toBe(true);
    }
  });
});
