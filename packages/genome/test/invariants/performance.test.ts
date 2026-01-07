/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — SPRINT 28.7 PERFORMANCE TESTS
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * 
 * Benchmarks et contrats de performance.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import { analyze, compare, computeFingerprint } from "../../src/index.js";
import { canonicalBytes } from "../../src/core/canonical.js";
import type { OmegaDNA } from "../../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createLargeMockDNA(): OmegaDNA {
  return {
    rootHash: "perf_test_hash_" + Date.now(),
    emotionData: {
      distribution: {
        joy: 0.15, sadness: 0.1, anger: 0.08, fear: 0.08,
        surprise: 0.05, disgust: 0.05, trust: 0.1, anticipation: 0.08,
        love: 0.08, guilt: 0.05, shame: 0.03, pride: 0.05,
        envy: 0.03, hope: 0.07,
      },
      transitions: Array.from({ length: 5 }, (_, i) => ({
        from: "joy" as const,
        to: "sadness" as const,
        frequency: 0.1 + i * 0.05,
      })),
      tensionCurve: Array.from({ length: 10 }, (_, i) => i / 10),
      valence: 0.2,
    },
    styleData: {
      burstiness: 0.5, perplexity: 0.5, humanTouch: 0.6,
      lexicalRichness: 0.55, averageSentenceLength: 0.4, dialogueRatio: 0.35,
    },
    structureData: {
      chapterCount: 0.4, averageChapterLength: 0.5,
      incitingIncident: 0.12, midpoint: 0.5, climax: 0.85,
      povCount: 0.2, timelineComplexity: 0.3,
    },
    tempoData: {
      averagePace: 0.5, paceVariance: 0.3, actionDensity: 0.35,
      dialogueDensity: 0.4, descriptionDensity: 0.25, breathingCycles: 0.5,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 28.7-A: CONTRATS DE PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe("28.7-A: Contrats de Performance", () => {
  it("analyze() < 10ms pour un genome standard", () => {
    const dna = createLargeMockDNA();
    
    const start = performance.now();
    analyze(dna);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(10);
  });

  it("compare() < 5ms pour deux genomes", () => {
    const genomeA = analyze(createLargeMockDNA());
    const genomeB = analyze(createLargeMockDNA());
    
    const start = performance.now();
    compare(genomeA, genomeB);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(5);
  });

  it("canonicalBytes() < 2ms", () => {
    const genome = analyze(createLargeMockDNA());
    
    const start = performance.now();
    canonicalBytes(genome);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(2);
  });

  it("100 analyze() < 500ms", () => {
    const dna = createLargeMockDNA();
    
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      analyze(dna, { seed: i });
    }
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(500);
  });

  it("100 compare() < 200ms", () => {
    const genomes = Array.from({ length: 10 }, (_, i) => 
      analyze(createLargeMockDNA(), { seed: i })
    );
    
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      const a = genomes[i % 10];
      const b = genomes[(i + 1) % 10];
      compare(a, b);
    }
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 28.7-B: MÉMOIRE (approximatif)
// ═══════════════════════════════════════════════════════════════════════════════

describe("28.7-B: Mémoire", () => {
  it("genome serialisé < 5KB", () => {
    const genome = analyze(createLargeMockDNA());
    const serialized = JSON.stringify(genome);
    const sizeKB = Buffer.byteLength(serialized, "utf8") / 1024;
    
    expect(sizeKB).toBeLessThan(5);
  });

  it("canonicalBytes < 3KB", () => {
    const genome = analyze(createLargeMockDNA());
    const bytes = canonicalBytes(genome);
    const sizeKB = bytes.length / 1024;
    
    expect(sizeKB).toBeLessThan(3);
  });

  it("1000 genomes créés sans explosion mémoire", () => {
    const genomes: ReturnType<typeof analyze>[] = [];
    
    for (let i = 0; i < 1000; i++) {
      genomes.push(analyze(createLargeMockDNA(), { seed: i }));
    }
    
    // Si on arrive ici sans OOM, c'est bon
    expect(genomes.length).toBe(1000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 28.7-C: DÉTERMINISME PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe("28.7-C: Déterminisme sous charge", () => {
  it("fingerprint identique après 1000 runs", () => {
    const dna = createLargeMockDNA();
    const fingerprints = new Set<string>();
    
    for (let i = 0; i < 1000; i++) {
      const genome = analyze(dna, { seed: 42 });
      fingerprints.add(genome.fingerprint);
    }
    
    expect(fingerprints.size).toBe(1);
  });

  it("compare() stable après 1000 runs", () => {
    const genomeA = analyze(createLargeMockDNA(), { seed: 1 });
    const genomeB = analyze(createLargeMockDNA(), { seed: 2 });
    
    const scores = new Set<number>();
    
    for (let i = 0; i < 1000; i++) {
      const result = compare(genomeA, genomeB);
      scores.add(result.score);
    }
    
    expect(scores.size).toBe(1);
  });
});
