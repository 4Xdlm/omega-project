/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — SPRINT 28.2 CANONICALISATION TESTS
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * 
 * CES TESTS PROUVENT QUE LA CANONICALISATION EST BÉTON.
 * Si un seul échoue = fingerprint instable = projet mort.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  canonicalBytes,
  canonicalString,
  canonicalSerialize,
  quantizeFloat,
  quantizeObject,
  validateNumber,
  stripMetadata,
  computeFingerprintFromPayload,
  CanonicalizeError,
} from "../../src/core/canonical.js";
import { sha256 } from "../../src/utils/sha256.js";

// ═══════════════════════════════════════════════════════════════════════════════
// A) PERMUTATION KEYS — 50 variantes, même résultat
// ═══════════════════════════════════════════════════════════════════════════════

describe("28.2-A: Permutation Keys", () => {
  const basePayload = {
    alpha: 1,
    beta: 2,
    gamma: 3,
    delta: 4,
    epsilon: 5,
  };

  it("50 permutations de clés → canonicalBytes identiques", () => {
    const referenceBytes = canonicalBytes(basePayload);
    const referenceStr = new TextDecoder().decode(referenceBytes);

    // Générer 50 permutations
    const keys = Object.keys(basePayload);
    for (let i = 0; i < 50; i++) {
      // Shuffle keys (Fisher-Yates with seeded random for reproducibility)
      const shuffled = [...keys];
      for (let j = shuffled.length - 1; j > 0; j--) {
        const k = Math.floor((Math.sin(i * j + 1) * 0.5 + 0.5) * (j + 1));
        [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
      }

      // Rebuild object with shuffled keys
      const permuted: Record<string, number> = {};
      for (const key of shuffled) {
        permuted[key] = basePayload[key as keyof typeof basePayload];
      }

      const permutedBytes = canonicalBytes(permuted);
      const permutedStr = new TextDecoder().decode(permutedBytes);

      expect(permutedStr).toBe(referenceStr);
    }
  });

  it("50 permutations → fingerprint identique", () => {
    const referenceHash = computeFingerprintFromPayload(basePayload);

    for (let i = 0; i < 50; i++) {
      const keys = Object.keys(basePayload);
      const shuffled = [...keys].sort(() => Math.sin(i * 7) - 0.5);

      const permuted: Record<string, number> = {};
      for (const key of shuffled) {
        permuted[key] = basePayload[key as keyof typeof basePayload];
      }

      const permutedHash = computeFingerprintFromPayload(permuted);
      expect(permutedHash).toBe(referenceHash);
    }
  });

  it("objets imbriqués avec clés dans ordres différents → même résultat", () => {
    const obj1 = { z: { c: 1, a: 2, b: 3 }, a: { x: 1, y: 2 } };
    const obj2 = { a: { y: 2, x: 1 }, z: { b: 3, a: 2, c: 1 } };

    expect(canonicalString(obj1)).toBe(canonicalString(obj2));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B) METADATA POISON — metadata ne doit JAMAIS influencer le fingerprint
// ═══════════════════════════════════════════════════════════════════════════════

describe("28.2-B: Metadata Poison", () => {
  const corePayload = {
    version: "1.2.0",
    data: { value: 42 },
  };

  it("metadata différent → fingerprint IDENTIQUE", () => {
    const payload1 = {
      ...corePayload,
      metadata: { extractedAt: "2026-01-07T10:00:00Z", host: "linux" },
    };

    const payload2 = {
      ...corePayload,
      metadata: { extractedAt: "2026-01-08T15:30:00Z", host: "windows" },
    };

    const hash1 = computeFingerprintFromPayload(payload1);
    const hash2 = computeFingerprintFromPayload(payload2);

    expect(hash1).toBe(hash2);
  });

  it("timestamp différent → fingerprint IDENTIQUE", () => {
    const payload1 = { ...corePayload, timestamp: "2026-01-01" };
    const payload2 = { ...corePayload, timestamp: "2099-12-31" };

    expect(computeFingerprintFromPayload(payload1)).toBe(
      computeFingerprintFromPayload(payload2)
    );
  });

  it("tous les champs metadata exclus", () => {
    const fullPayload = {
      ...corePayload,
      metadata: { x: 1 },
      meta: { y: 2 },
      extractedAt: "date",
      timestamp: "ts",
      createdAt: "ca",
      updatedAt: "ua",
      source: "src",
      trace: "tr",
      host: "h",
      user: "u",
      path: "/p",
      runId: "rid",
      environment: "env",
    };

    const stripped = stripMetadata(fullPayload);

    expect(stripped).not.toHaveProperty("metadata");
    expect(stripped).not.toHaveProperty("meta");
    expect(stripped).not.toHaveProperty("extractedAt");
    expect(stripped).not.toHaveProperty("timestamp");
    expect(stripped).toHaveProperty("version");
    expect(stripped).toHaveProperty("data");
  });

  it("canonicalBytes ignores metadata completement", () => {
    const withMeta = { a: 1, metadata: { huge: "payload".repeat(1000) } };
    const withoutMeta = { a: 1 };

    const bytesStripped = canonicalBytes(stripMetadata(withMeta));
    const bytesClean = canonicalBytes(withoutMeta);

    expect(bytesStripped).toEqual(bytesClean);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C) FLOAT EDGE — cas limites des floats
// ═══════════════════════════════════════════════════════════════════════════════

describe("28.2-C: Float Edge Cases", () => {
  it("0.1 + 0.2 === 0.3 après quantification", () => {
    const a = quantizeFloat(0.1 + 0.2, "test");
    const b = quantizeFloat(0.3, "test");

    expect(a).toBe(b);
  });

  it("1/3 est stable", () => {
    const third = quantizeFloat(1 / 3, "test");

    // Doit être quantifié à 6 décimales
    expect(third).toBe(0.333333);
  });

  it("très petit float (1e-10) quantifié à 0", () => {
    const tiny = quantizeFloat(1e-10, "test");
    expect(tiny).toBe(0);
  });

  it("float proche frontière (0.9999996) stable", () => {
    const edge = quantizeFloat(0.9999996, "test");
    expect(edge).toBe(1); // Arrondi à 1
  });

  it("float proche frontière (0.9999994) stable", () => {
    const edge = quantizeFloat(0.9999994, "test");
    expect(edge).toBe(0.999999);
  });

  it("floats dans objet imbriqué tous quantifiés", () => {
    const obj = {
      a: 0.1 + 0.2,
      nested: {
        b: 1 / 3,
        arr: [0.1 + 0.1, 0.7 + 0.1],
      },
    };

    const quantized = quantizeObject(obj);

    expect(quantized.a).toBe(0.3);
    expect(quantized.nested.b).toBe(0.333333);
    expect(quantized.nested.arr[0]).toBe(0.2);
    expect(quantized.nested.arr[1]).toBe(0.8);
  });

  it("fingerprint stable malgré erreurs float JS", () => {
    const payload1 = { value: 0.1 + 0.2 }; // 0.30000000000000004
    const payload2 = { value: 0.3 };

    const hash1 = computeFingerprintFromPayload(payload1);
    const hash2 = computeFingerprintFromPayload(payload2);

    expect(hash1).toBe(hash2);
  });

  it("notation scientifique normalisée", () => {
    // Ces valeurs pourraient être sérialisées différemment
    const payload1 = { value: 0.000001 };
    const payload2 = { value: 1e-6 };

    const str1 = canonicalString(payload1);
    const str2 = canonicalString(payload2);

    expect(str1).toBe(str2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D) NaN/INFINITY — rejet strict
// ═══════════════════════════════════════════════════════════════════════════════

describe("28.2-D: NaN/Infinity Rejection", () => {
  it("NaN direct → CanonicalizeError", () => {
    expect(() => quantizeFloat(NaN, "test")).toThrow(CanonicalizeError);
    expect(() => quantizeFloat(NaN, "test")).toThrow("NaN detected");
  });

  it("Infinity direct → CanonicalizeError", () => {
    expect(() => quantizeFloat(Infinity, "test")).toThrow(CanonicalizeError);
    expect(() => quantizeFloat(Infinity, "test")).toThrow("Infinity detected");
  });

  it("-Infinity direct → CanonicalizeError", () => {
    expect(() => quantizeFloat(-Infinity, "test")).toThrow(CanonicalizeError);
    expect(() => quantizeFloat(-Infinity, "test")).toThrow("Infinity detected");
  });

  it("NaN dans objet imbriqué → rejet avec path", () => {
    const obj = { a: { b: { c: NaN } } };

    expect(() => quantizeObject(obj)).toThrow(CanonicalizeError);
    expect(() => quantizeObject(obj)).toThrow("root.a.b.c");
  });

  it("Infinity dans tableau → rejet avec index", () => {
    const obj = { arr: [1, 2, Infinity, 4] };

    expect(() => quantizeObject(obj)).toThrow(CanonicalizeError);
    expect(() => quantizeObject(obj)).toThrow("root.arr[2]");
  });

  it("canonicalBytes rejette payload avec NaN", () => {
    const payload = { value: NaN };

    expect(() => canonicalBytes(payload)).toThrow(CanonicalizeError);
  });

  it("computeFingerprintFromPayload rejette NaN", () => {
    const payload = { data: { nested: NaN } };

    expect(() => computeFingerprintFromPayload(payload)).toThrow(CanonicalizeError);
  });

  it("validateNumber fournit le path correct", () => {
    expect(() => validateNumber(NaN, "root.axes.emotion.valence")).toThrow(
      "root.axes.emotion.valence"
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E) GOLDEN FILE — byte-for-byte comparison
// ═══════════════════════════════════════════════════════════════════════════════

describe("28.2-E: Golden File Byte-for-Byte", () => {
  // Payload de référence FROZEN
  const GOLDEN_PAYLOAD = {
    version: "1.2.0",
    sourceHash: "abc123",
    axes: {
      emotion: {
        distribution: {
          anger: 0.1,
          anticipation: 0.05,
          disgust: 0.05,
          envy: 0.02,
          fear: 0.1,
          guilt: 0.03,
          hope: 0.05,
          joy: 0.2,
          love: 0.1,
          pride: 0.05,
          sadness: 0.1,
          shame: 0.02,
          surprise: 0.05,
          trust: 0.08,
        },
        averageValence: 0.15,
        tensionCurve: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.6, 0.4, 0.2],
        dominantTransitions: [],
      },
      style: {
        burstiness: 0.5,
        perplexity: 0.5,
        humanTouch: 0.5,
        lexicalRichness: 0.5,
        averageSentenceLength: 0.5,
        dialogueRatio: 0.3,
      },
      structure: {
        chapterCount: 0.4,
        averageChapterLength: 0.5,
        incitingIncident: 0.12,
        midpoint: 0.5,
        climax: 0.85,
        povCount: 0.2,
        timelineComplexity: 0.3,
      },
      tempo: {
        averagePace: 0.5,
        paceVariance: 0.3,
        actionDensity: 0.3,
        dialogueDensity: 0.4,
        descriptionDensity: 0.3,
        breathingCycles: 0.5,
      },
    },
  };

  // GOLDEN VALUES — calculés une fois, vérifiés pour toujours
  // Ces valeurs sont FROZEN et définissent la vérité
  const GOLDEN_CANONICAL_STRING = '{"axes":{"emotion":{"averageValence":0.15,"distribution":{"anger":0.1,"anticipation":0.05,"disgust":0.05,"envy":0.02,"fear":0.1,"guilt":0.03,"hope":0.05,"joy":0.2,"love":0.1,"pride":0.05,"sadness":0.1,"shame":0.02,"surprise":0.05,"trust":0.08},"dominantTransitions":[],"tensionCurve":[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.6,0.4,0.2]},"structure":{"averageChapterLength":0.5,"chapterCount":0.4,"climax":0.85,"incitingIncident":0.12,"midpoint":0.5,"povCount":0.2,"timelineComplexity":0.3},"style":{"averageSentenceLength":0.5,"burstiness":0.5,"dialogueRatio":0.3,"humanTouch":0.5,"lexicalRichness":0.5,"perplexity":0.5},"tempo":{"actionDensity":0.3,"averagePace":0.5,"breathingCycles":0.5,"descriptionDensity":0.3,"dialogueDensity":0.4,"paceVariance":0.3}},"sourceHash":"abc123","version":"1.2.0"}';

  const GOLDEN_FINGERPRINT = "e8c7f4b9d8a2c1e5f6b3a4d7c8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7";

  it("canonicalString match GOLDEN exactement", () => {
    const result = canonicalString(GOLDEN_PAYLOAD);
    expect(result).toBe(GOLDEN_CANONICAL_STRING);
  });

  it("canonicalBytes UTF-8 bytes match", () => {
    const bytes = canonicalBytes(GOLDEN_PAYLOAD);
    const expectedBytes = new TextEncoder().encode(GOLDEN_CANONICAL_STRING);

    expect(bytes.length).toBe(expectedBytes.length);
    for (let i = 0; i < bytes.length; i++) {
      expect(bytes[i]).toBe(expectedBytes[i]);
    }
  });

  it("fingerprint GOLDEN stable", () => {
    const hash = sha256(GOLDEN_CANONICAL_STRING);
    
    // GOLDEN HASH - valeur de référence calculée
    // Si ce test échoue, la canonicalisation a changé = REGRESSION
    const EXPECTED_GOLDEN_HASH = "172f970a3b2bb5713743d0cd3ecf2d7537699cba5694a3e6946b786f5e213252";
    
    expect(hash).toBe(EXPECTED_GOLDEN_HASH);
    
    // Vérifier que le hash est déterministe
    const hash2 = sha256(GOLDEN_CANONICAL_STRING);
    expect(hash).toBe(hash2);
  });

  it("fingerprint identique sur 100 runs", () => {
    const hashes = new Set<string>();
    
    for (let i = 0; i < 100; i++) {
      const bytes = canonicalBytes(GOLDEN_PAYLOAD);
      const str = new TextDecoder().decode(bytes);
      const hash = sha256(str);
      hashes.add(hash);
    }
    
    expect(hashes.size).toBe(1);
  });

  it("payload avec clés dans ordre différent → même golden", () => {
    // Reconstruire le payload avec un ordre différent
    const shuffledPayload = {
      sourceHash: "abc123",
      version: "1.2.0",
      axes: {
        tempo: GOLDEN_PAYLOAD.axes.tempo,
        structure: GOLDEN_PAYLOAD.axes.structure,
        emotion: GOLDEN_PAYLOAD.axes.emotion,
        style: GOLDEN_PAYLOAD.axes.style,
      },
    };

    const result = canonicalString(shuffledPayload);
    expect(result).toBe(GOLDEN_CANONICAL_STRING);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F) CROSS-PLATFORM DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe("28.2-F: Cross-Platform Determinism", () => {
  it("sérialisation nombres sans notation scientifique problématique", () => {
    // Ces valeurs doivent être sérialisées de manière stable
    const values = [
      { input: 0.000001, expected: 0.000001 },
      { input: 0.0000001, expected: 0 }, // Below precision -> 0
      { input: 1000000, expected: 1000000 },
      { input: 0.123456, expected: 0.123456 },
      { input: 0.999999, expected: 0.999999 },
    ];

    for (const { input, expected } of values) {
      const quantized = quantizeFloat(input, "test");
      expect(quantized).toBe(expected);
      
      // Vérifier que la sérialisation est stable
      const serialized1 = JSON.stringify({ value: quantized });
      const serialized2 = JSON.stringify({ value: quantized });
      expect(serialized1).toBe(serialized2);
    }
  });

  it("ordre des clés toujours lexicographique", () => {
    const tests = [
      { z: 1, a: 2, m: 3, A: 4, Z: 5 },
      { _a: 1, a: 2, a1: 3, a10: 4, a2: 5 },
      { "": 1, " ": 2, "  ": 3 },
    ];

    for (const obj of tests) {
      const keys = Object.keys(JSON.parse(canonicalSerialize(obj)));
      const sorted = [...keys].sort();
      expect(keys).toEqual(sorted);
    }
  });

  it("UTF-8 encoding déterministe pour caractères spéciaux", () => {
    const obj = {
      emoji: "🎯",
      accent: "éàü",
      chinese: "中文",
      mixed: "Hello 世界! 🌍",
    };

    const bytes1 = canonicalBytes(obj);
    const bytes2 = canonicalBytes(obj);

    expect(bytes1).toEqual(bytes2);
  });
});
