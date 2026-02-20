// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — TEXT ANALYZER MODULE — TESTS L4
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { analyze, calculateGematria, DEFAULT_OPTIONS, TextAnalyzerError } from "./index";

const FIXTURES = {
  basicFr: `Été chaud. L'hiver arrive bientôt!

Deuxième paragraphe avec des émotions. Ça c'est génial?`,
  empty: "",
  whitespaceOnly: "   \t\n  ",
  gematriaTest: "OMEGA ABC",
};

// ═══════════════════════════════════════════════════════════════════════════════
// INV-TA-01: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════
describe("INV-TA-01: Determinism", () => {
  it("same input produces same analysisHash", () => {
    const r1 = analyze(FIXTURES.basicFr);
    const r2 = analyze(FIXTURES.basicFr);
    expect(r1.proof.analysisHash).toBe(r2.proof.analysisHash);
  });
  
  it("100 consecutive analyses produce identical hashes", () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      hashes.add(analyze("Test déterminisme.").proof.analysisHash);
    }
    expect(hashes.size).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-TA-02: BOUNDS INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════
describe("INV-TA-02: Bounds Integrity", () => {
  it("all word bounds are valid", () => {
    const r = analyze(FIXTURES.basicFr);
    for (const w of r.words) {
      expect(w.charIndexStart).toBeGreaterThanOrEqual(0);
      expect(w.charIndexEnd).toBeLessThanOrEqual(r.canonical.length);
      expect(w.charIndexStart).toBeLessThan(w.charIndexEnd);
    }
  });
  
  it("all sentence bounds are valid", () => {
    const r = analyze(FIXTURES.basicFr);
    for (const s of r.sentences) {
      expect(s.charIndexStart).toBeGreaterThanOrEqual(0);
      expect(s.charIndexEnd).toBeLessThanOrEqual(r.canonical.length);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-TA-03: COUNTER COHERENCE
// ═══════════════════════════════════════════════════════════════════════════════
describe("INV-TA-03: Counter Coherence", () => {
  it("letterCount equals letters.length", () => {
    const r = analyze(FIXTURES.basicFr);
    expect(r.basicStats.letterCount).toBe(r.letters.length);
  });
  
  it("wordCount equals words.length", () => {
    const r = analyze(FIXTURES.basicFr);
    expect(r.basicStats.wordCount).toBe(r.words.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-TA-04: MONOTONIC INDICES
// ═══════════════════════════════════════════════════════════════════════════════
describe("INV-TA-04: Monotonic Indices", () => {
  it("letterIndex is strictly increasing", () => {
    const r = analyze(FIXTURES.basicFr);
    for (let i = 0; i < r.letters.length; i++) {
      expect(r.letters[i].letterIndex).toBe(i);
    }
  });
  
  it("wordIndex is strictly increasing", () => {
    const r = analyze(FIXTURES.basicFr);
    for (let i = 0; i < r.words.length; i++) {
      expect(r.words[i].wordIndex).toBe(i);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-TA-06: HASH REPRODUCIBILITY
// ═══════════════════════════════════════════════════════════════════════════════
describe("INV-TA-06: Hash Reproducibility", () => {
  it("hash changes when text changes", () => {
    const r1 = analyze("Hello");
    const r2 = analyze("Hello!");
    expect(r1.proof.canonicalHash).not.toBe(r2.proof.canonicalHash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-TA-09: GEMATRIA CORRECTNESS
// ═══════════════════════════════════════════════════════════════════════════════
describe("INV-TA-09: Gematria Correctness", () => {
  it("OMEGA = 41", () => {
    const r = analyze("OMEGA");
    expect(r.words[0].gematriaValue).toBe(41);
  });
  
  it("ABC = 6", () => {
    const r = analyze("ABC");
    expect(r.words[0].gematriaValue).toBe(6);
  });
  
  it("été → ETE = 30", () => {
    const r = analyze("été");
    expect(r.words[0].gematriaValue).toBe(30);
  });
  
  it("calculateGematria matches word.gematriaValue", () => {
    const r = analyze(FIXTURES.gematriaTest);
    for (const w of r.words) {
      expect(w.gematriaValue).toBe(calculateGematria(w.word));
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-TA-10: MYCELIUM HIERARCHY
// ═══════════════════════════════════════════════════════════════════════════════
describe("INV-TA-10: Mycelium Hierarchy", () => {
  it("words belong to valid sentences", () => {
    const r = analyze(FIXTURES.basicFr);
    for (const w of r.words) {
      expect(w.sentenceIndex).toBeGreaterThanOrEqual(0);
      expect(w.sentenceIndex).toBeLessThan(r.sentences.length);
    }
  });
  
  it("sentence branchWeight = sum of word gematria", () => {
    const r = analyze(FIXTURES.basicFr);
    for (const s of r.sentences) {
      const wordsInSent = r.words.filter(w => w.sentenceIndex === s.sentenceIndex);
      const expected = wordsInSent.reduce((sum, w) => sum + w.gematriaValue, 0);
      expect(s.branchWeight).toBe(expected);
    }
  });
  
  it("paragraph branchWeight = sum of sentence branchWeights", () => {
    const r = analyze(FIXTURES.basicFr);
    for (const p of r.paragraphs) {
      const sentsInPara = r.sentences.filter(s => s.paragraphIndex === p.paragraphIndex);
      const expected = sentsInPara.reduce((sum, s) => sum + s.branchWeight, 0);
      expect(p.branchWeight).toBe(expected);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════
describe("Validation", () => {
  it("accepts empty string", () => {
    const r = analyze(FIXTURES.empty);
    expect(r.basicStats.charCount).toBe(0);
  });
  
  it("throws on null", () => {
    expect(() => analyze(null as any)).toThrow(TextAnalyzerError);
  });
  
  it("throws on undefined", () => {
    expect(() => analyze(undefined as any)).toThrow(TextAnalyzerError);
  });
  
  it("throws on non-string", () => {
    expect(() => analyze(123 as any)).toThrow(TextAnalyzerError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICALIZATION
// ═══════════════════════════════════════════════════════════════════════════════
describe("Canonicalization", () => {
  it("normalizes CRLF to LF", () => {
    const r = analyze("Hello\r\nWorld");
    expect(r.canonical).toBe("Hello\nWorld");
  });
  
  it("removes BOM", () => {
    const r = analyze("\uFEFFHello");
    expect(r.canonical).toBe("Hello");
  });
  
  it("converts tabs to spaces", () => {
    const r = analyze("Hello\tWorld");
    expect(r.canonical).toBe("Hello World");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENTATION
// ═══════════════════════════════════════════════════════════════════════════════
describe("Segmentation", () => {
  it("detects multiple paragraphs", () => {
    const r = analyze(FIXTURES.basicFr);
    expect(r.basicStats.paragraphCount).toBe(2);
  });
  
  it("detects sentence types", () => {
    const r = analyze("Déclaration. Question? Exclamation!");
    expect(r.sentences[0].sentenceType).toBe("declarative");
    expect(r.sentences[1].sentenceType).toBe("interrogative");
    expect(r.sentences[2].sentenceType).toBe("exclamatory");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WORD INDEXING
// ═══════════════════════════════════════════════════════════════════════════════
describe("Word Indexing", () => {
  it("tokenizes words correctly", () => {
    const r = analyze("Le chat dort.");
    expect(r.words.map(w => w.word)).toEqual(["Le", "chat", "dort"]);
  });
  
  it("detects stop words", () => {
    const r = analyze("Le chat et la souris");
    expect(r.words.filter(w => w.isStopWord).map(w => w.normalizedWord)).toContain("le");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LETTER INDEXING
// ═══════════════════════════════════════════════════════════════════════════════
describe("Letter Indexing", () => {
  it("assigns correct letterRank", () => {
    const r = analyze("AZ");
    expect(r.letters[0].letterRank).toBe(1);
    expect(r.letters[1].letterRank).toBe(26);
  });
  
  it("normalizes accented letters", () => {
    const r = analyze("éÉ");
    expect(r.letters[0].normalizedLetter).toBe("E");
    expect(r.letters[0].letterRank).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════
describe("Statistics", () => {
  it("computes lexical diversity", () => {
    const r = analyze("le le le chat chat souris");
    expect(r.linguisticStats.lexicalDiversity).toBe(0.5);
  });
  
  it("computes total gematria", () => {
    const r = analyze("ABC");
    expect(r.myceliumStats.totalGematriaValue).toBe(6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF
// ═══════════════════════════════════════════════════════════════════════════════
describe("Proof", () => {
  it("all invariants pass", () => {
    const r = analyze(FIXTURES.basicFr);
    expect(r.proof.allPassed).toBe(true);
    expect(r.proof.failedCount).toBe(0);
  });
  
  it("includes OMEGA seed (42)", () => {
    const r = analyze(FIXTURES.basicFr);
    expect(r.proof.seed).toBe(42);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════
describe("Edge Cases", () => {
  it("handles single character", () => {
    const r = analyze("A");
    expect(r.letters.length).toBe(1);
    expect(r.words.length).toBe(1);
  });
  
  it("handles punctuation only", () => {
    const r = analyze("...");
    expect(r.words.length).toBe(0);
    expect(r.letters.length).toBe(0);
  });
  
  it("handles ALL CAPS", () => {
    const r = analyze("HELLO WORLD");
    expect(r.words[0].isAllCaps).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════════
describe("Performance", () => {
  it("processes long text quickly", () => {
    const longText = "Le petit prince. ".repeat(1000);
    const start = performance.now();
    const r = analyze(longText);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(1000);
    expect(r.basicStats.wordCount).toBeGreaterThan(1000);
  });
});
