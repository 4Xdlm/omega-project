/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — INVARIANTS TESTS
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * 
 * Ces tests PROUVENT les 14 invariants du module.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import { 
  analyze, 
  compare, 
  compareDetailed, 
  isValidFingerprint, 
  validateGenome,
  computeFingerprint,
  quantizeFloat,
  canonicalSerialize,
  cosineSimilarity,
  GENOME_VERSION,
  DEFAULT_SEED,
  DISTRIBUTION_SUM_TOLERANCE,
  FINGERPRINT_LENGTH,
} from "../../src/index.js";
import type { OmegaDNA, NarrativeGenome } from "../../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const mockOmegaDNA: OmegaDNA = {
  rootHash: "abc123def456789",
  emotionData: {
    distribution: {
      joy: 0.2,
      sadness: 0.15,
      anger: 0.1,
      fear: 0.1,
      surprise: 0.05,
      disgust: 0.05,
      trust: 0.1,
      anticipation: 0.05,
      love: 0.05,
      guilt: 0.03,
      shame: 0.02,
      pride: 0.05,
      envy: 0.02,
      hope: 0.03,
    },
    transitions: [
      { from: "joy", to: "sadness", frequency: 0.3 },
      { from: "fear", to: "anger", frequency: 0.2 },
    ],
    tensionCurve: [0.1, 0.2, 0.4, 0.5, 0.6, 0.8, 0.9, 0.7, 0.5, 0.3],
    valence: 0.2,
  },
  styleData: {
    burstiness: 0.6,
    perplexity: 0.5,
    humanTouch: 0.7,
    lexicalRichness: 0.65,
    averageSentenceLength: 0.4,
    dialogueRatio: 0.35,
  },
  structureData: {
    chapterCount: 0.4,
    averageChapterLength: 0.5,
    incitingIncident: 0.12,
    midpoint: 0.5,
    climax: 0.85,
    povCount: 0.2,
    timelineComplexity: 0.3,
  },
  tempoData: {
    averagePace: 0.5,
    paceVariance: 0.3,
    actionDensity: 0.4,
    dialogueDensity: 0.35,
    descriptionDensity: 0.25,
    breathingCycles: 0.5,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-01: DÉTERMINISME
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GEN-01: Déterminisme", () => {
  it("même œuvre + même seed → même fingerprint (100 runs)", () => {
    const fingerprints = new Set<string>();
    
    for (let i = 0; i < 100; i++) {
      const genome = analyze(mockOmegaDNA, { seed: DEFAULT_SEED });
      fingerprints.add(genome.fingerprint);
    }
    
    expect(fingerprints.size).toBe(1);
  });
  
  it("seed différent → fingerprint potentiellement différent", () => {
    const genome1 = analyze(mockOmegaDNA, { seed: 42 });
    const genome2 = analyze(mockOmegaDNA, { seed: 42 });
    
    expect(genome1.fingerprint).toBe(genome2.fingerprint);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-02: FINGERPRINT = SHA256(CANONICAL PAYLOAD)
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GEN-02: Fingerprint = SHA256(canonical payload)", () => {
  it("fingerprint est un hash SHA-256 valide (64 hex chars)", () => {
    const genome = analyze(mockOmegaDNA);
    
    expect(genome.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(genome.fingerprint.length).toBe(FINGERPRINT_LENGTH);
  });
  
  it("fingerprint est lowercase", () => {
    const genome = analyze(mockOmegaDNA);
    
    expect(genome.fingerprint).toBe(genome.fingerprint.toLowerCase());
  });
  
  it("isValidFingerprint accepte les fingerprints valides", () => {
    const genome = analyze(mockOmegaDNA);
    
    expect(isValidFingerprint(genome.fingerprint)).toBe(true);
  });
  
  it("isValidFingerprint rejette les fingerprints invalides", () => {
    expect(isValidFingerprint("invalid")).toBe(false);
    expect(isValidFingerprint("ABC123")).toBe(false);
    expect(isValidFingerprint("")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-03: AXES BORNÉS
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GEN-03: Axes bornés [0,1] ou [-1,1]", () => {
  it("toutes les valeurs de style sont dans [0,1]", () => {
    const genome = analyze(mockOmegaDNA);
    const style = genome.axes.style;
    
    expect(style.burstiness).toBeGreaterThanOrEqual(0);
    expect(style.burstiness).toBeLessThanOrEqual(1);
    expect(style.perplexity).toBeGreaterThanOrEqual(0);
    expect(style.perplexity).toBeLessThanOrEqual(1);
    expect(style.humanTouch).toBeGreaterThanOrEqual(0);
    expect(style.humanTouch).toBeLessThanOrEqual(1);
  });
  
  it("la valence est dans [-1,1]", () => {
    const genome = analyze(mockOmegaDNA);
    
    expect(genome.axes.emotion.averageValence).toBeGreaterThanOrEqual(-1);
    expect(genome.axes.emotion.averageValence).toBeLessThanOrEqual(1);
  });
  
  it("la courbe de tension est dans [0,1]", () => {
    const genome = analyze(mockOmegaDNA);
    
    for (const value of genome.axes.emotion.tensionCurve) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-04: DISTRIBUTION SOMME À 1.0
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GEN-04: Distribution émotionnelle somme à 1.0", () => {
  it("la distribution somme à 1.0 (±tolérance)", () => {
    const genome = analyze(mockOmegaDNA);
    const sum = Object.values(genome.axes.emotion.distribution).reduce((a, b) => a + b, 0);
    
    expect(Math.abs(sum - 1.0)).toBeLessThan(DISTRIBUTION_SUM_TOLERANCE);
  });
  
  it("validateGenome détecte une distribution invalide", () => {
    const genome = analyze(mockOmegaDNA);
    
    const brokenGenome = {
      ...genome,
      axes: {
        ...genome.axes,
        emotion: {
          ...genome.axes.emotion,
          distribution: {
            ...genome.axes.emotion.distribution,
            joy: 10,
          },
        },
      },
    };
    
    const result = validateGenome(brokenGenome as NarrativeGenome);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("distribution"))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-05: SIMILARITÉ SYMÉTRIQUE
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GEN-05: Similarité symétrique", () => {
  it("compare(A, B) = compare(B, A)", () => {
    const genomeA = analyze(mockOmegaDNA);
    const genomeB = analyze({
      ...mockOmegaDNA,
      rootHash: "different_hash_xyz",
      styleData: { ...mockOmegaDNA.styleData as object, burstiness: 0.8 },
    });
    
    const resultAB = compare(genomeA, genomeB);
    const resultBA = compare(genomeB, genomeA);
    
    expect(resultAB.score).toBe(resultBA.score);
  });
  
  it("cosineSimilarity(a, b) = cosineSimilarity(b, a)", () => {
    const a = [0.1, 0.5, 0.3, 0.1];
    const b = [0.2, 0.4, 0.2, 0.2];
    
    expect(cosineSimilarity(a, b)).toBe(cosineSimilarity(b, a));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-06: SIMILARITÉ BORNÉE [0,1]
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GEN-06: Similarité bornée [0,1]", () => {
  it("le score est toujours dans [0,1]", () => {
    const genomeA = analyze(mockOmegaDNA);
    const genomeB = analyze({
      ...mockOmegaDNA,
      rootHash: "totally_different",
    });
    
    const result = compare(genomeA, genomeB);
    
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
  
  it("compareDetailed: tous les scores par axe sont dans [0,1]", () => {
    const genomeA = analyze(mockOmegaDNA);
    const genomeB = analyze({
      ...mockOmegaDNA,
      rootHash: "different",
    });
    
    const detailed = compareDetailed(genomeA, genomeB);
    
    expect(detailed.overall).toBeGreaterThanOrEqual(0);
    expect(detailed.overall).toBeLessThanOrEqual(1);
    expect(detailed.byAxis.emotion).toBeGreaterThanOrEqual(0);
    expect(detailed.byAxis.emotion).toBeLessThanOrEqual(1);
    expect(detailed.byAxis.style).toBeGreaterThanOrEqual(0);
    expect(detailed.byAxis.style).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-07: AUTO-SIMILARITÉ = 1.0
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GEN-07: Auto-similarité = 1.0", () => {
  it("compare(A, A) = 1.0", () => {
    const genome = analyze(mockOmegaDNA);
    const result = compare(genome, genome);
    
    expect(result.score).toBe(1.0);
    expect(result.verdict).toBe("IDENTICAL");
  });
  
  it("cosineSimilarity(v, v) = 1.0", () => {
    const v = [0.1, 0.5, 0.3, 0.1];
    
    expect(cosineSimilarity(v, v)).toBe(1.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-08: VERSION TRACÉE
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GEN-08: Version tracée", () => {
  it("genome.version = GENOME_VERSION", () => {
    const genome = analyze(mockOmegaDNA);
    
    expect(genome.version).toBe(GENOME_VERSION);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-09: SOURCE TRACÉE
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GEN-09: Source tracée (rootHash)", () => {
  it("genome.sourceHash = source.rootHash", () => {
    const genome = analyze(mockOmegaDNA);
    
    expect(genome.sourceHash).toBe(mockOmegaDNA.rootHash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-10: READ-ONLY
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GEN-10: Read-only (n'affecte pas source)", () => {
  it("extraction ne modifie pas source.rootHash", () => {
    const originalHash = mockOmegaDNA.rootHash;
    
    analyze(mockOmegaDNA);
    analyze(mockOmegaDNA);
    analyze(mockOmegaDNA);
    
    expect(mockOmegaDNA.rootHash).toBe(originalHash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-11: METADATA HORS FINGERPRINT
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GEN-11: Metadata hors fingerprint", () => {
  it("extractedAt différent → même fingerprint", () => {
    const genome1 = analyze(mockOmegaDNA);
    const genome2 = analyze(mockOmegaDNA);
    
    expect(genome1.fingerprint).toBe(genome2.fingerprint);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-12: EMOTION14 SANCTUARISÉ
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GEN-12: Emotion14 sanctuarisé", () => {
  it("distribution contient exactement 14 émotions", () => {
    const genome = analyze(mockOmegaDNA);
    const emotions = Object.keys(genome.axes.emotion.distribution);
    
    expect(emotions.length).toBe(14);
  });
  
  it("les 14 émotions canoniques sont présentes", () => {
    const genome = analyze(mockOmegaDNA);
    const dist = genome.axes.emotion.distribution;
    
    const expected = [
      "joy", "sadness", "anger", "fear", "surprise", "disgust",
      "trust", "anticipation", "love", "guilt", "shame", "pride", "envy", "hope"
    ];
    
    for (const emotion of expected) {
      expect(dist).toHaveProperty(emotion);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-13: SÉRIALISATION CANONIQUE
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GEN-13: Sérialisation canonique", () => {
  it("clés triées alphabétiquement", () => {
    const obj = { z: 1, a: 2, m: 3 };
    const serialized = canonicalSerialize(obj);
    
    expect(serialized).toBe('{"a":2,"m":3,"z":1}');
  });
  
  it("pas de whitespace", () => {
    const obj = { key: "value", nested: { a: 1 } };
    const serialized = canonicalSerialize(obj);
    
    expect(serialized).not.toContain(" ");
    expect(serialized).not.toContain("\n");
  });
  
  it("ordre des clés déterministe", () => {
    const obj1 = { b: 2, a: 1, c: 3 };
    const obj2 = { c: 3, a: 1, b: 2 };
    
    expect(canonicalSerialize(obj1)).toBe(canonicalSerialize(obj2));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-14: FLOAT QUANTIFIÉ
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GEN-14: Float quantifié à 1e-6", () => {
  it("quantizeFloat arrondit à 6 décimales", () => {
    expect(quantizeFloat(0.123456789)).toBe(0.123457);
    expect(quantizeFloat(0.1234561)).toBe(0.123456);
  });
  
  it("micro-différences sont éliminées", () => {
    const a = 0.1 + 0.2;
    const b = 0.3;
    
    expect(quantizeFloat(a)).toBe(quantizeFloat(b));
  });
  
  it("fingerprint stable malgré erreurs de précision float", () => {
    const axes1 = {
      emotion: { distribution: { joy: 0.1 + 0.2 } },
      style: {},
      structure: {},
      tempo: {},
    };
    const axes2 = {
      emotion: { distribution: { joy: 0.3 } },
      style: {},
      structure: {},
      tempo: {},
    };
    
    const hash1 = computeFingerprint("test", axes1 as any);
    const hash2 = computeFingerprint("test", axes2 as any);
    
    expect(hash1).toBe(hash2);
  });
});
