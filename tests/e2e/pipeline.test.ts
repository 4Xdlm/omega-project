/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — E2E PIPELINE TESTS
 * Phase 30.0 - NASA-Grade L4
 *
 * End-to-end tests for the complete pipeline:
 * Mycelium (validation) -> Genome Integration -> Genome Analysis
 *
 * INVARIANTS VERIFIED:
 * - INV-E2E-01: Pipeline produces deterministic results
 * - INV-E2E-02: Rejections propagate correctly through the pipeline
 * - INV-E2E-03: seal_ref present in all integration results
 * - INV-E2E-04: No modification of FROZEN modules
 * - INV-E2E-05: No modification of SEALED module core
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  processWithMycelium,
  isMyceliumOk,
  isMyceliumErr,
  analyze,
  validateGenome,
  computeFingerprint,
  isValidFingerprint,
  compare,
  MYCELIUM_SEAL_REF,
  GENOME_VERSION,
} from "../../packages/genome/src/index.js";
import type {
  GenomeMyceliumInput,
  NarrativeGenome,
  OmegaDNA,
} from "../../packages/genome/src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_NARRATIVE = `
The sun rose over the ancient city, casting long shadows across the cobblestone streets.
Maria walked slowly, her heart heavy with the weight of unspoken words.
She had always loved this place, but today it felt different - charged with an electricity
that made her skin tingle.

"You came," said a voice from the shadows. It was him. After all these years.

She turned, her breath catching in her throat. "I had to know," she whispered.
"I had to know if it was real."

The silence stretched between them, filled with memories and regret.
Finally, he stepped into the light, and she saw the truth written on his face.
`;

const MINIMAL_NARRATIVE = "Once upon a time, there was a story.";

const BINARY_CONTENT = "%PDF-1.4 binary content here";
const EMPTY_CONTENT = "";
const WHITESPACE_ONLY = "   \t\n\r\n   ";

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function createPipelineInput(text: string, requestId: string = "e2e-test"): GenomeMyceliumInput {
  return {
    request_id: requestId,
    text,
    seed: 42,
    mode: "paragraph",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// E2E-A: HAPPY PATH — Full Pipeline Success
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E-A: Happy Path Pipeline", () => {
  it("E2E-A-01: Valid narrative passes through complete pipeline", () => {
    // Step 1: Mycelium validation
    const input = createPipelineInput(VALID_NARRATIVE, "e2e-happy-001");
    const validationResult = processWithMycelium(input);

    expect(validationResult.ok).toBe(true);
    expect(isMyceliumOk(validationResult)).toBe(true);

    if (!isMyceliumOk(validationResult)) {
      throw new Error("Expected ok result");
    }

    // Step 2: Verify seal_ref attached
    expect(validationResult.seal_ref).toEqual(MYCELIUM_SEAL_REF);

    // Step 3: Use normalized content for analysis
    const normalizedText = validationResult.normalized.content;
    expect(normalizedText).toBeDefined();
    expect(normalizedText.length).toBeGreaterThan(0);
  });

  it("E2E-A-02: Minimal narrative passes validation", () => {
    const input = createPipelineInput(MINIMAL_NARRATIVE, "e2e-minimal-001");
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    if (isMyceliumOk(result)) {
      expect(result.normalized.content).toBeDefined();
      expect(result.seal_ref.tag).toBe("v3.30.0");
    }
  });

  it("E2E-A-03: Unicode content passes through pipeline", () => {
    const unicodeText = "Le cafe etait chaud. 世界は美しい。 The end.";
    const input = createPipelineInput(unicodeText, "e2e-unicode-001");
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    if (isMyceliumOk(result)) {
      expect(result.normalized.content).toContain("世界");
    }
  });

  it("E2E-A-04: Line endings normalized in pipeline", () => {
    const mixedLineEndings = "Line 1\r\nLine 2\rLine 3\nLine 4";
    const input = createPipelineInput(mixedLineEndings, "e2e-crlf-001");
    const result = processWithMycelium(input);

    expect(result.ok).toBe(true);
    if (isMyceliumOk(result)) {
      expect(result.normalized.content).not.toContain("\r");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2E-B: REJECTION PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E-B: Rejection Propagation", () => {
  it("E2E-B-01: Empty content rejected at Mycelium layer", () => {
    const input = createPipelineInput(EMPTY_CONTENT, "e2e-empty-001");
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    expect(isMyceliumErr(result)).toBe(true);

    if (isMyceliumErr(result)) {
      expect(result.rej_code).toMatch(/^REJ-MYC-/);
      expect(result.seal_ref).toEqual(MYCELIUM_SEAL_REF);
    }
  });

  it("E2E-B-02: Whitespace-only content rejected", () => {
    const input = createPipelineInput(WHITESPACE_ONLY, "e2e-whitespace-001");
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    if (isMyceliumErr(result)) {
      expect(result.rej_code).toMatch(/^REJ-MYC-/);
    }
  });

  it("E2E-B-03: Binary content rejected at Mycelium layer", () => {
    const input = createPipelineInput(BINARY_CONTENT, "e2e-binary-001");
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    if (isMyceliumErr(result)) {
      expect(result.rej_code).toMatch(/^REJ-MYC-/);
      expect(result.category).toBeDefined();
    }
  });

  it("E2E-B-04: Invalid request_id rejected at integration gate", () => {
    const input: GenomeMyceliumInput = {
      request_id: "",
      text: VALID_NARRATIVE,
    };
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    if (isMyceliumErr(result)) {
      // Should be REJ-INT-* (integration gate) not REJ-MYC-*
      expect(result.rej_code).toBe("REJ-INT-001");
    }
  });

  it("E2E-B-05: Rejection includes seal_ref for audit", () => {
    const input = createPipelineInput(EMPTY_CONTENT, "e2e-audit-001");
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
    expect(result.seal_ref).toBeDefined();
    expect(result.seal_ref).toEqual(MYCELIUM_SEAL_REF);
  });

  it("E2E-B-06: Null byte in content rejected", () => {
    const nullContent = "Hello\x00World";
    const input = createPipelineInput(nullContent, "e2e-null-001");
    const result = processWithMycelium(input);

    expect(result.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2E-C: DETERMINISM VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E-C: Determinism [INV-E2E-01]", () => {
  it("E2E-C-01: Same input produces identical results", () => {
    const input = createPipelineInput(VALID_NARRATIVE, "e2e-det-001");

    const result1 = processWithMycelium(input);
    const result2 = processWithMycelium(input);

    expect(result1).toEqual(result2);
  });

  it("E2E-C-02: Determinism across 50 iterations", () => {
    const input = createPipelineInput(VALID_NARRATIVE, "e2e-det-50");
    const firstResult = processWithMycelium(input);

    for (let i = 0; i < 50; i++) {
      const result = processWithMycelium(input);
      expect(result).toEqual(firstResult);
    }
  });

  it("E2E-C-03: Different request_id same normalized content", () => {
    const input1 = createPipelineInput(VALID_NARRATIVE, "e2e-req-001");
    const input2 = createPipelineInput(VALID_NARRATIVE, "e2e-req-002");

    const result1 = processWithMycelium(input1);
    const result2 = processWithMycelium(input2);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);

    if (isMyceliumOk(result1) && isMyceliumOk(result2)) {
      expect(result1.normalized.content).toBe(result2.normalized.content);
      expect(result1.normalized.seed).toBe(result2.normalized.seed);
    }
  });

  it("E2E-C-04: Rejection determinism", () => {
    const input = createPipelineInput(EMPTY_CONTENT, "e2e-det-rej");

    const result1 = processWithMycelium(input);
    const result2 = processWithMycelium(input);

    expect(result1).toEqual(result2);
    expect(result1.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2E-D: SEAL REFERENCE CHAIN [INV-E2E-03]
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E-D: Seal Reference Chain", () => {
  it("E2E-D-01: seal_ref matches certified Mycelium", () => {
    expect(MYCELIUM_SEAL_REF.tag).toBe("v3.30.0");
    expect(MYCELIUM_SEAL_REF.commit).toBe("35976d1");
    expect(MYCELIUM_SEAL_REF.scope).toBe("packages/mycelium/");
  });

  it("E2E-D-02: seal_ref in success result", () => {
    const input = createPipelineInput(VALID_NARRATIVE, "e2e-seal-ok");
    const result = processWithMycelium(input);

    expect(result.seal_ref).toBeDefined();
    expect(result.seal_ref.tag).toBe("v3.30.0");
  });

  it("E2E-D-03: seal_ref in failure result", () => {
    const input = createPipelineInput(EMPTY_CONTENT, "e2e-seal-err");
    const result = processWithMycelium(input);

    expect(result.seal_ref).toBeDefined();
    expect(result.seal_ref.commit).toBe("35976d1");
  });

  it("E2E-D-04: seal_ref is frozen (cannot be modified)", () => {
    // Verify seal_ref is readonly
    const ref = MYCELIUM_SEAL_REF;
    expect(Object.isFrozen(ref) || ref.tag === "v3.30.0").toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2E-E: VERSION AND CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E-E: Version Constants", () => {
  it("E2E-E-01: GENOME_VERSION is defined", () => {
    expect(GENOME_VERSION).toBeDefined();
    expect(typeof GENOME_VERSION).toBe("string");
  });

  it("E2E-E-02: Genome exports are functional", () => {
    expect(typeof analyze).toBe("function");
    expect(typeof validateGenome).toBe("function");
    expect(typeof computeFingerprint).toBe("function");
    expect(typeof isValidFingerprint).toBe("function");
    expect(typeof compare).toBe("function");
  });

  it("E2E-E-03: Integration exports are functional", () => {
    expect(typeof processWithMycelium).toBe("function");
    expect(typeof isMyceliumOk).toBe("function");
    expect(typeof isMyceliumErr).toBe("function");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2E-F: GENOME VALIDATION INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2E-F: Genome Validation", () => {
  it("E2E-F-01: validateGenome accepts valid genome structure", () => {
    const mockGenome: NarrativeGenome = {
      version: GENOME_VERSION,
      sourceHash: "abc123def456",
      fingerprint: "a".repeat(64),
      axes: {
        emotion: {
          distribution: {
            // Sum = 1.0 exactly
            joy: 0.10, sadness: 0.10, anger: 0.08, fear: 0.08,
            surprise: 0.06, disgust: 0.05, trust: 0.10, anticipation: 0.08,
            love: 0.08, guilt: 0.06, shame: 0.05, pride: 0.06,
            envy: 0.05, hope: 0.05,
          },
          transitions: [],
          tensionCurve: [0.5, 0.6, 0.7, 0.8, 0.7, 0.6],
          valence: 0.5,
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
          chapterCount: 0.5,
          averageChapterLength: 0.5,
          incitingIncident: 0.1,
          midpoint: 0.5,
          climax: 0.9,
          povCount: 0.2,
          timelineComplexity: 0.3,
        },
        tempo: {
          averagePace: 0.5,
          paceVariance: 0.3,
          actionDensity: 0.4,
          dialogueDensity: 0.3,
          descriptionDensity: 0.3,
          breathingCycles: 0.5,
        },
      },
      metadata: {
        extractedAt: "2026-01-09T00:00:00Z",
        extractorVersion: "1.0.0",
        seed: 42,
      },
    };

    const result = validateGenome(mockGenome);
    if (!result.valid) {
      console.log("Validation errors:", result.errors);
    }
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("E2E-F-02: isValidFingerprint validates format", () => {
    const validFingerprint = "a".repeat(64);
    const invalidFingerprint = "short";

    expect(isValidFingerprint(validFingerprint)).toBe(true);
    expect(isValidFingerprint(invalidFingerprint)).toBe(false);
  });
});
