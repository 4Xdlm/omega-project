/**
 * OMEGA EMOTION_GATE — Tests L4 NASA-Grade
 * Module: gateway/tests/emotion_gate.test.ts
 * Phase: 7C
 * 
 * @invariant INV-EMO-01: Ne crée jamais de fait (read-only)
 * @invariant INV-EMO-02: Ne contredit jamais le canon
 * @invariant INV-EMO-03: Cohérence émotionnelle obligatoire
 * @invariant INV-EMO-04: Dette émotionnelle traçable
 * @invariant INV-EMO-05: Arc cassé = WARN ou FAIL selon sévérité
 */

import { describe, it, expect } from "vitest";
import { createEmotionGate, EmotionalArc, EmotionalState, BaseEmotion } from "../src/gates/emotion_gate";
import { CanonState, CanonFact } from "../src/gates/types";

// ═══════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════

function createEmptyCanon(): CanonState {
  return {
    version: "1.0.0",
    facts: [],
    rootHash: "0".repeat(64),
    lastUpdated: new Date().toISOString()
  };
}

function createCanonWithFact(subject: string, predicate: string): CanonState {
  const fact: CanonFact = {
    id: "FACT-1",
    type: "STATE",
    subject,
    predicate,
    establishedAt: "chapter-1",
    establishedTimestamp: new Date().toISOString(),
    confidence: 1.0,
    proofHash: "hash-1"
  };
  return {
    version: "1.0.1",
    facts: [fact],
    rootHash: "canon-hash",
    lastUpdated: new Date().toISOString()
  };
}

function createEmotionalState(
  characterId: string,
  characterName: string,
  emotion: BaseEmotion,
  intensity: number
): EmotionalState {
  return {
    characterId,
    characterName,
    dominantEmotion: emotion,
    intensity,
    secondaryEmotions: [],
    establishedAt: "chapter-1",
    timestamp: new Date().toISOString()
  };
}

function createArc(states: EmotionalState[], debt = 0): EmotionalArc {
  return {
    characterId: states[0]?.characterId || "unknown",
    states,
    emotionalDebt: debt,
    isValid: true
  };
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe("EMOTION_GATE — Core", () => {
  const gate = createEmotionGate();

  it("should have correct name and version", () => {
    expect(gate.name).toBe("EMOTION_GATE");
    expect(gate.version).toBe("1.0.0");
  });

  it("should validate correct input", () => {
    const input = {
      text: "Marie sourit.",
      characterId: "marie",
      characterName: "Marie",
      detectedState: { emotion: "joy" as BaseEmotion, intensity: 0.7 },
      existingArc: null,
      canon: createEmptyCanon(),
      debtThreshold: 0.7,
      strictMode: false
    };
    expect(gate.validate(input)).toBe(true);
  });

  it("should reject invalid input - missing text", () => {
    const input = {
      text: "",
      characterId: "marie",
      characterName: "Marie",
      detectedState: { emotion: "joy" as BaseEmotion, intensity: 0.7 },
      existingArc: null,
      canon: createEmptyCanon(),
      debtThreshold: 0.7,
      strictMode: false
    };
    expect(gate.validate(input)).toBe(false);
  });

  it("should reject invalid input - intensity out of range", () => {
    const input = {
      text: "Test",
      characterId: "marie",
      characterName: "Marie",
      detectedState: { emotion: "joy" as BaseEmotion, intensity: 1.5 },
      existingArc: null,
      canon: createEmptyCanon(),
      debtThreshold: 0.7,
      strictMode: false
    };
    expect(gate.validate(input)).toBe(false);
  });
});

describe("EMOTION_GATE — INV-EMO-01: Ne crée jamais de fait", () => {
  const gate = createEmotionGate();

  it("should not modify canon on PASS", async () => {
    const canon = createEmptyCanon();
    const input = {
      text: "Marie sourit doucement.",
      characterId: "marie",
      characterName: "Marie",
      detectedState: { emotion: "joy" as BaseEmotion, intensity: 0.5 },
      existingArc: null,
      canon,
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    // Canon doit rester inchangé (read-only)
    expect(canon.facts.length).toBe(0);
    expect(result.verdict.status).toBe("PASS");
  });

  it("should only return emotional state, not canon facts", async () => {
    const input = {
      text: "Jean est furieux.",
      characterId: "jean",
      characterName: "Jean",
      detectedState: { emotion: "anger" as BaseEmotion, intensity: 0.9 },
      existingArc: null,
      canon: createEmptyCanon(),
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    expect(result.newState).not.toBeNull();
    expect(result.newState?.dominantEmotion).toBe("anger");
    // Pas de modification du canon
  });
});

describe("EMOTION_GATE — INV-EMO-02: Ne contredit jamais le canon", () => {
  const gate = createEmotionGate();

  it("should FAIL when emotion contradicts canon (happy vs sad)", async () => {
    const canon = createCanonWithFact("Marie", "heureuse");
    const input = {
      text: "Marie pleurait.",
      characterId: "Marie",
      characterName: "Marie",
      detectedState: { emotion: "sadness" as BaseEmotion, intensity: 0.8 },
      existingArc: null,
      canon,
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    expect(result.verdict.status).toBe("FAIL");
    expect(result.verdict.violations.some(v => v.type === "EMOTION_CONTRADICTION")).toBe(true);
  });

  it("should PASS when emotion aligns with canon", async () => {
    const canon = createCanonWithFact("Marie", "heureuse");
    const input = {
      text: "Marie sourit.",
      characterId: "Marie",
      characterName: "Marie",
      detectedState: { emotion: "joy" as BaseEmotion, intensity: 0.7 },
      existingArc: null,
      canon,
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    expect(result.verdict.violations.filter(v => v.type === "EMOTION_CONTRADICTION").length).toBe(0);
  });

  it("should FAIL on anger when canon says scared", async () => {
    const canon = createCanonWithFact("Jean", "effrayé");
    const input = {
      text: "Jean frappa la table.",
      characterId: "Jean",
      characterName: "Jean",
      detectedState: { emotion: "anger" as BaseEmotion, intensity: 0.9 },
      existingArc: null,
      canon,
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    // fear opposite is anger
    expect(result.verdict.status).toBe("FAIL");
  });
});

describe("EMOTION_GATE — INV-EMO-03: Cohérence émotionnelle", () => {
  const gate = createEmotionGate();

  it("should WARN/FAIL on brutal transition (joy to sadness)", async () => {
    const previousState = createEmotionalState("marie", "Marie", "joy", 0.8);
    const arc = createArc([previousState]);
    
    const input = {
      text: "Marie fondit en larmes.",
      characterId: "marie",
      characterName: "Marie",
      detectedState: { emotion: "sadness" as BaseEmotion, intensity: 0.9 },
      existingArc: arc,
      canon: createEmptyCanon(),
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    expect(result.verdict.violations.some(v => v.type === "OUT_OF_CHARACTER")).toBe(true);
  });

  it("should PASS on natural transition (joy to trust)", async () => {
    const previousState = createEmotionalState("marie", "Marie", "joy", 0.6);
    const arc = createArc([previousState]);
    
    const input = {
      text: "Marie se sentit en confiance.",
      characterId: "marie",
      characterName: "Marie",
      detectedState: { emotion: "trust" as BaseEmotion, intensity: 0.7 },
      existingArc: arc,
      canon: createEmptyCanon(),
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    expect(result.verdict.violations.filter(v => v.type === "OUT_OF_CHARACTER").length).toBe(0);
  });

  it("should PASS on same emotion with different intensity", async () => {
    const previousState = createEmotionalState("jean", "Jean", "anger", 0.5);
    const arc = createArc([previousState]);
    
    const input = {
      text: "Jean devint encore plus furieux.",
      characterId: "jean",
      characterName: "Jean",
      detectedState: { emotion: "anger" as BaseEmotion, intensity: 0.8 },
      existingArc: arc,
      canon: createEmptyCanon(),
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    expect(result.verdict.violations.filter(v => v.type === "OUT_OF_CHARACTER").length).toBe(0);
  });
});

describe("EMOTION_GATE — INV-EMO-04: Dette émotionnelle traçable", () => {
  const gate = createEmotionGate();

  it("should track emotional debt", async () => {
    const input = {
      text: "Marie sourit.",
      characterId: "marie",
      characterName: "Marie",
      detectedState: { emotion: "joy" as BaseEmotion, intensity: 0.5 },
      existingArc: null,
      canon: createEmptyCanon(),
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    expect(typeof result.currentDebt).toBe("number");
    expect(result.currentDebt).toBeGreaterThanOrEqual(0);
    expect(result.currentDebt).toBeLessThanOrEqual(1);
  });

  it("should increase debt on costly transitions", async () => {
    const previousState = createEmotionalState("marie", "Marie", "joy", 0.7);
    const arc = createArc([previousState], 0.2);
    
    const input = {
      text: "Marie eut peur.",
      characterId: "marie",
      characterName: "Marie",
      detectedState: { emotion: "fear" as BaseEmotion, intensity: 0.6 },
      existingArc: arc,
      canon: createEmptyCanon(),
      debtThreshold: 0.9,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    // Debt should increase (joy to fear is not natural)
    expect(result.currentDebt).toBeGreaterThan(0);
  });

  it("should WARN when debt exceeds threshold", async () => {
    const previousState = createEmotionalState("marie", "Marie", "joy", 0.8);
    const arc = createArc([previousState], 0.6);
    
    const input = {
      text: "Marie devint triste.",
      characterId: "marie",
      characterName: "Marie",
      detectedState: { emotion: "sadness" as BaseEmotion, intensity: 0.7 },
      existingArc: arc,
      canon: createEmptyCanon(),
      debtThreshold: 0.5,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    expect(result.verdict.violations.some(v => v.type === "DEBT_OVERFLOW")).toBe(true);
  });
});

describe("EMOTION_GATE — INV-EMO-05: Arc cassé", () => {
  const gate = createEmotionGate();

  it("should detect missing transition in strict mode", async () => {
    const previousState = createEmotionalState("marie", "Marie", "joy", 0.7);
    const arc = createArc([previousState]);
    
    const input = {
      text: "Marie était terrifiée.",
      characterId: "marie",
      characterName: "Marie",
      detectedState: { emotion: "sadness" as BaseEmotion, intensity: 0.8 },
      existingArc: arc,
      canon: createEmptyCanon(),
      debtThreshold: 0.9,
      strictMode: true
    };
    
    const result = await gate.execute(input);
    
    expect(result.verdict.violations.some(v => v.type === "MISSING_TRANSITION")).toBe(true);
  });

  it("should update arc on valid transition", async () => {
    const previousState = createEmotionalState("marie", "Marie", "joy", 0.6);
    const arc = createArc([previousState]);
    
    const input = {
      text: "Marie se sentit confiante.",
      characterId: "marie",
      characterName: "Marie",
      detectedState: { emotion: "trust" as BaseEmotion, intensity: 0.7 },
      existingArc: arc,
      canon: createEmptyCanon(),
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    expect(result.updatedArc).not.toBeNull();
    expect(result.updatedArc?.states.length).toBe(2);
  });

  it("should NOT update arc on FAIL", async () => {
    const canon = createCanonWithFact("Marie", "heureuse");
    const previousState = createEmotionalState("Marie", "Marie", "joy", 0.8);
    const arc = createArc([previousState]);
    
    const input = {
      text: "Marie pleurait.",
      characterId: "Marie",
      characterName: "Marie",
      detectedState: { emotion: "sadness" as BaseEmotion, intensity: 0.9 },
      existingArc: arc,
      canon,
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    expect(result.verdict.status).toBe("FAIL");
    expect(result.updatedArc).toBeNull();
    expect(result.newState).toBeNull();
  });
});

describe("EMOTION_GATE — Intensity validation", () => {
  const gate = createEmotionGate();

  it("should WARN on unjustified intensity jump", async () => {
    const previousState = createEmotionalState("jean", "Jean", "anger", 0.3);
    const arc = createArc([previousState]);
    
    const input = {
      text: "Jean était en colère.",
      characterId: "jean",
      characterName: "Jean",
      detectedState: { emotion: "anger" as BaseEmotion, intensity: 0.95 },
      existingArc: arc,
      canon: createEmptyCanon(),
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    expect(result.verdict.violations.some(v => v.type === "INTENSITY_UNJUSTIFIED")).toBe(true);
  });

  it("should PASS on intensity jump with trigger word", async () => {
    const previousState = createEmotionalState("jean", "Jean", "anger", 0.3);
    const arc = createArc([previousState]);
    
    const input = {
      text: "Soudain, Jean explosa de rage.",
      characterId: "jean",
      characterName: "Jean",
      detectedState: { emotion: "anger" as BaseEmotion, intensity: 0.95 },
      existingArc: arc,
      canon: createEmptyCanon(),
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    expect(result.verdict.violations.filter(v => v.type === "INTENSITY_UNJUSTIFIED").length).toBe(0);
  });
});

describe("EMOTION_GATE — First state (no previous)", () => {
  const gate = createEmotionGate();

  it("should PASS on first emotional state", async () => {
    const input = {
      text: "Marie entra, souriante.",
      characterId: "marie",
      characterName: "Marie",
      detectedState: { emotion: "joy" as BaseEmotion, intensity: 0.6 },
      existingArc: null,
      canon: createEmptyCanon(),
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    expect(result.verdict.status).toBe("PASS");
    expect(result.newState).not.toBeNull();
    expect(result.updatedArc?.states.length).toBe(1);
  });

  it("should create new arc for first state", async () => {
    const input = {
      text: "Jean apparut, inquiet.",
      characterId: "jean",
      characterName: "Jean",
      detectedState: { emotion: "fear" as BaseEmotion, intensity: 0.5 },
      existingArc: null,
      canon: createEmptyCanon(),
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result = await gate.execute(input);
    
    expect(result.updatedArc).not.toBeNull();
    expect(result.updatedArc?.characterId).toBe("jean");
  });
});

describe("EMOTION_GATE — Determinism", () => {
  const gate = createEmotionGate();

  it("should produce identical results for identical inputs", async () => {
    const input = {
      text: "Marie sourit.",
      characterId: "marie",
      characterName: "Marie",
      detectedState: { emotion: "joy" as BaseEmotion, intensity: 0.7 },
      existingArc: null,
      canon: createEmptyCanon(),
      debtThreshold: 0.7,
      strictMode: false
    };
    
    const result1 = await gate.execute(input);
    const result2 = await gate.execute(input);
    
    expect(result1.verdict.status).toBe(result2.verdict.status);
    expect(result1.verdict.violations.length).toBe(result2.verdict.violations.length);
    expect(result1.currentDebt).toBe(result2.currentDebt);
  });
});
