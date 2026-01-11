/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — TRANSLATORS TESTS
 * Version: 0.3.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  InputTranslator,
  createInputTranslator,
  translateInput,
  OutputTranslator,
  createOutputTranslator,
  formatOutput,
  OUTPUT_FORMAT_VERSION,
  ModuleTranslator,
  createModuleTranslator,
  getModuleTranslator,
  GENOME_TO_BIO_EMOTION,
  BIO_TO_GENOME_EMOTION
} from "../src/translators/index.js";
import type { NexusResponse, Emotion14 } from "../src/contracts/types.js";
import type { EmotionType } from "../src/adapters/mycelium-bio.adapter.js";

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT TRANSLATOR TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Translators — InputTranslator", () => {
  it("should create with default options", () => {
    const translator = createInputTranslator();
    expect(translator).toBeInstanceOf(InputTranslator);
  });

  it("should normalize line endings", () => {
    const translator = createInputTranslator();
    const result = translator.translate("line1\r\nline2\rline3\nline4");
    expect(result.content).toBe("line1\nline2\nline3\nline4");
  });

  it("should normalize whitespace", () => {
    const translator = createInputTranslator();
    const result = translator.translate("word1  word2\t\tword3");
    expect(result.content).toBe("word1 word2 word3");
  });

  it("should trim lines", () => {
    const translator = createInputTranslator();
    const result = translator.translate("  line1  \n  line2  ");
    expect(result.content).toBe("line1\nline2");
  });

  it("should remove empty lines when option set", () => {
    const translator = createInputTranslator({ removeEmptyLines: true });
    const result = translator.translate("line1\n\n\nline2");
    expect(result.content).toBe("line1\nline2");
  });

  it("should convert to lowercase when option set", () => {
    const translator = createInputTranslator({ toLowerCase: true });
    const result = translator.translate("Hello World");
    expect(result.content).toBe("hello world");
  });

  it("should compute word count", () => {
    const result = translateInput("one two three four five");
    expect(result.wordCount).toBe(5);
  });

  it("should compute line count", () => {
    const result = translateInput("line1\nline2\nline3");
    expect(result.lineCount).toBe(3);
  });

  it("should detect Unicode", () => {
    const result = translateInput("Hello éàü 世界");
    expect(result.metadata.hasUnicode).toBe(true);
  });

  it("should detect ASCII only", () => {
    const result = translateInput("Hello World");
    expect(result.metadata.hasUnicode).toBe(false);
  });

  it("should detect French", () => {
    const result = translateInput("Le chat est sur la table avec le chien");
    expect(result.metadata.detectedLanguage).toBe("fr");
  });

  it("should detect English", () => {
    const result = translateInput("The cat is on the table with the dog");
    expect(result.metadata.detectedLanguage).toBe("en");
  });

  it("should be deterministic (INV-TRANS-01)", () => {
    const translator = createInputTranslator();
    const input = "Hello  World\r\n  Test  ";
    const result1 = translator.translate(input);
    const result2 = translator.translate(input);
    expect(result1.content).toBe(result2.content);
  });

  it("quickNormalize should work", () => {
    const translator = createInputTranslator();
    const result = translator.quickNormalize("  Hello\r\n  World  ");
    expect(result).toBe("Hello\nWorld");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT TRANSLATOR TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Translators — OutputTranslator", () => {
  it("should create with default options", () => {
    const translator = createOutputTranslator();
    expect(translator).toBeInstanceOf(OutputTranslator);
  });

  it("should format successful response", () => {
    const response: NexusResponse<string> = {
      requestId: "test-1",
      success: true,
      data: "result",
      executionTimeMs: 10
    };

    const output = formatOutput(response);
    expect(output.success).toBe(true);
    expect(output.data).toBe("result");
    expect(output.version).toBe(OUTPUT_FORMAT_VERSION);
  });

  it("should format error response", () => {
    const response: NexusResponse<string> = {
      requestId: "test-2",
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Invalid input",
        timestamp: new Date().toISOString()
      },
      executionTimeMs: 5
    };

    const output = formatOutput(response);
    expect(output.success).toBe(false);
    expect(output.error).toBeDefined();
    expect(output.error!.code).toBe("VALIDATION_FAILED");
  });

  it("should include summary", () => {
    const response: NexusResponse<string> = {
      requestId: "test-3",
      success: true,
      data: "result",
      executionTimeMs: 100
    };

    const output = formatOutput(response);
    expect(output.summary).toBeDefined();
    expect(output.summary!.requestId).toBe("test-3");
    expect(output.summary!.executionTimeMs).toBe(100);
    expect(output.summary!.status).toBe("success");
  });

  it("should include metadata", () => {
    const translator = createOutputTranslator({ includeMetadata: true });
    const response: NexusResponse<string> = {
      requestId: "test-4",
      success: true,
      data: "result",
      executionTimeMs: 10
    };

    const output = translator.format(response);
    expect(output.metadata).toBeDefined();
    expect(output.metadata!.formatVersion).toBe(OUTPUT_FORMAT_VERSION);
  });

  it("should output minimal format", () => {
    const translator = createOutputTranslator({ format: "minimal" });
    const response: NexusResponse<{ fingerprint: string; extra: string }> = {
      requestId: "test-5",
      success: true,
      data: { fingerprint: "abc123", extra: "ignored" },
      executionTimeMs: 10
    };

    const output = translator.format(response);
    expect(output.format).toBe("minimal");
    expect((output.data as Record<string, unknown>).fingerprint).toBe("abc123");
  });

  it("should format as JSON", () => {
    const translator = createOutputTranslator({ prettyPrint: false });
    const response: NexusResponse<string> = {
      requestId: "test-6",
      success: true,
      data: "result",
      executionTimeMs: 10
    };

    const json = translator.toJSON(response);
    expect(typeof json).toBe("string");
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("should format similarity", () => {
    const translator = createOutputTranslator();
    const result = { score: 0.85, confidence: 0.9, verdict: "VERY_SIMILAR" as const };
    const formatted = translator.formatSimilarity(result);
    expect(formatted).toContain("85%");
    expect(formatted).toContain("VERY_SIMILAR");
  });

  it("should format emotions (INV-TRANS-02)", () => {
    const translator = createOutputTranslator();
    const distribution: Record<Emotion14, number> = {
      joy: 0.3, sadness: 0.2, anger: 0.1, fear: 0.05,
      surprise: 0.05, disgust: 0.05, trust: 0.05, anticipation: 0.05,
      love: 0.05, guilt: 0.025, shame: 0.025, pride: 0.025,
      hope: 0.025, envy: 0.02
    };
    const formatted = translator.formatEmotions(distribution);
    expect(formatted).toContain("joy");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE TRANSLATOR TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Translators — ModuleTranslator", () => {
  it("should create module translator", () => {
    const translator = createModuleTranslator();
    expect(translator).toBeInstanceOf(ModuleTranslator);
  });

  it("should get singleton translator", () => {
    const t1 = getModuleTranslator();
    const t2 = getModuleTranslator();
    expect(t1).toBe(t2);
  });

  it("should have complete Genome to Bio mapping", () => {
    const emotions14: Emotion14[] = [
      "joy", "sadness", "anger", "fear", "surprise", "disgust",
      "trust", "anticipation", "love", "guilt", "shame", "pride",
      "hope", "envy"
    ];
    for (const e of emotions14) {
      expect(GENOME_TO_BIO_EMOTION[e]).toBeDefined();
    }
  });

  it("should have complete Bio to Genome mapping", () => {
    const emotionsBio: EmotionType[] = [
      "joy", "sadness", "anger", "fear", "surprise", "disgust",
      "trust", "anticipation", "love", "guilt", "shame", "pride",
      "hope", "despair"
    ];
    for (const e of emotionsBio) {
      expect(BIO_TO_GENOME_EMOTION[e]).toBeDefined();
    }
  });

  it("should translate Genome emotions to Bio", () => {
    const translator = createModuleTranslator();
    const genome: Record<Emotion14, number> = {
      joy: 0.5, sadness: 0.2, anger: 0.1, fear: 0.05,
      surprise: 0.05, disgust: 0.02, trust: 0.02, anticipation: 0.02,
      love: 0.01, guilt: 0.01, shame: 0.01, pride: 0.005,
      hope: 0.005, envy: 0.02
    };

    const bio = translator.translateEmotionsGenomeToBio(genome);

    // Check key emotions are preserved
    expect(bio.joy).toBeGreaterThan(0);
    expect(bio.sadness).toBeGreaterThan(0);
  });

  it("should translate Bio emotions to Genome", () => {
    const translator = createModuleTranslator();
    const bio: Record<EmotionType, number> = {
      joy: 0.5, sadness: 0.2, anger: 0.1, fear: 0.05,
      surprise: 0.05, disgust: 0.02, trust: 0.02, anticipation: 0.02,
      love: 0.01, guilt: 0.01, shame: 0.01, pride: 0.005,
      hope: 0.005, despair: 0.02
    };

    const genome = translator.translateEmotionsBioToGenome(bio);

    expect(genome.joy).toBeGreaterThan(0);
    expect(genome.sadness).toBeGreaterThan(0);
  });

  it("should normalize to sum 1 after translation", () => {
    const translator = createModuleTranslator();
    const input: Record<Emotion14, number> = {
      joy: 1, sadness: 0, anger: 0, fear: 0,
      surprise: 0, disgust: 0, trust: 0, anticipation: 0,
      love: 0, guilt: 0, shame: 0, pride: 0,
      hope: 0, envy: 0
    };

    const bio = translator.translateEmotionsGenomeToBio(input);
    const sum = Object.values(bio).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("should normalize fingerprint", () => {
    const translator = createModuleTranslator();
    const fp = translator.normalizeFingerprint(
      "ABC123",
      "genome",
      "1.0.0",
      { joy: 0.5 }
    );

    expect(fp.type).toBe("unified");
    expect(fp.hash).toBe("abc123");
    expect(fp.version).toBe("1.0.0");
  });

  it("should compare cross-module fingerprints", () => {
    const translator = createModuleTranslator();

    // Identical
    expect(translator.compareCrossModule("abc123", "ABC123")).toBe(1.0);

    // Different
    const score = translator.compareCrossModule("abc123", "xyz789");
    expect(score).toBeLessThan(1.0);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("should merge emotion distributions", () => {
    const translator = createModuleTranslator();
    const dist1 = { joy: 0.8, sadness: 0.2 };
    const dist2 = { joy: 0.2, sadness: 0.8 };

    const merged = translator.mergeEmotionDistributions([dist1, dist2]);
    expect(merged.joy).toBeCloseTo(0.5, 5);
    expect(merged.sadness).toBeCloseTo(0.5, 5);
  });

  it("should merge with weights", () => {
    const translator = createModuleTranslator();
    const dist1 = { joy: 1.0 };
    const dist2 = { sadness: 1.0 };

    const merged = translator.mergeEmotionDistributions(
      [dist1, dist2],
      [3, 1] // 75% weight to dist1
    );

    expect(merged.joy).toBeGreaterThan(merged.sadness);
  });

  it("should preserve semantic content (INV-TRANS-03)", () => {
    const translator = createModuleTranslator();
    const original: Record<Emotion14, number> = {
      joy: 0.5, sadness: 0, anger: 0, fear: 0,
      surprise: 0, disgust: 0, trust: 0.5, anticipation: 0,
      love: 0, guilt: 0, shame: 0, pride: 0,
      hope: 0, envy: 0
    };

    const bio = translator.translateEmotionsGenomeToBio(original);
    const backToGenome = translator.translateEmotionsBioToGenome(bio);

    // Joy and trust should be preserved
    expect(backToGenome.joy).toBeCloseTo(original.joy, 1);
    expect(backToGenome.trust).toBeCloseTo(original.trust, 1);
  });
});
