/**
 * OMEGA TRUTH_GATE — Tests L4 NASA-Grade
 * Module: gateway/tests/gates/truth_gate.test.ts
 * Phase: 7A
 * 
 * @invariant INV-TRUTH-01: Contradiction détectée = FAIL obligatoire
 * @invariant INV-TRUTH-02: Causalité stricte (effet sans cause = FAIL)
 * @invariant INV-TRUTH-03: Référence inconnue = FAIL en mode strict
 * @invariant INV-TRUTH-04: Verdict déterministe (même input = même output)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createTruthGate } from "../src/gates/truth_gate";
import { TruthGateInput, CanonState, CanonFact } from "../src/gates/types";

// ═══════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════

function createEmptyCanon(): CanonState {
  return {
    version: "1.0.0",
    facts: [],
    rootHash: "0000000000000000",
    lastUpdated: new Date().toISOString()
  };
}

function createCanonWithFacts(facts: Partial<CanonFact>[]): CanonState {
  const fullFacts: CanonFact[] = facts.map((f, i) => ({
    id: f.id || `FACT-${i}`,
    type: f.type || "STATE",
    subject: f.subject || "Unknown",
    predicate: f.predicate || "unknown",
    establishedAt: f.establishedAt || "chapter-1",
    establishedTimestamp: f.establishedTimestamp || new Date().toISOString(),
    confidence: f.confidence ?? 1.0,
    proofHash: f.proofHash || `hash-${i}`
  }));
  
  return {
    version: "1.0.0",
    facts: fullFacts,
    rootHash: "canon-hash",
    lastUpdated: new Date().toISOString()
  };
}

function createInput(
  text: string,
  canon: CanonState,
  strictMode = false,
  severityThreshold = 7
): TruthGateInput {
  return { text, canon, strictMode, severityThreshold };
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe("TRUTH_GATE — Core", () => {
  const gate = createTruthGate();

  it("should have correct name and version", () => {
    expect(gate.name).toBe("TRUTH_GATE");
    expect(gate.version).toBe("1.0.0");
  });

  it("should validate correct input", () => {
    const input = createInput("Test text", createEmptyCanon(), false);
    expect(gate.validate(input)).toBe(true);
  });

  it("should reject invalid input - missing text", () => {
    const input = { text: "", canon: createEmptyCanon(), strictMode: false, severityThreshold: 7 };
    expect(gate.validate(input)).toBe(false);
  });

  it("should reject invalid input - missing canon", () => {
    const input = { text: "Test", canon: null as any, strictMode: false, severityThreshold: 7 };
    expect(gate.validate(input)).toBe(false);
  });
});

describe("TRUTH_GATE — INV-TRUTH-01: Contradiction = FAIL", () => {
  const gate = createTruthGate();

  it("should FAIL on direct contradiction (French)", async () => {
    const canon = createCanonWithFacts([
      { subject: "Marie", predicate: "vivante", type: "STATE" }
    ]);
    const input = createInput("Marie n'est pas vivante.", canon, false);
    
    const result = await gate.execute(input);
    
    expect(result.verdict.status).toBe("FAIL");
    expect(result.verdict.violations.some(v => v.type === "CONTRADICTION")).toBe(true);
  });

  it("should FAIL on direct contradiction (English)", async () => {
    const canon = createCanonWithFacts([
      { subject: "John", predicate: "alive", type: "STATE" }
    ]);
    const input = createInput("John isn't alive.", canon, false);
    
    const result = await gate.execute(input);
    
    expect(result.verdict.status).toBe("FAIL");
    expect(result.verdict.violations.some(v => v.type === "CONTRADICTION")).toBe(true);
  });

  it("should PASS when no contradiction exists", async () => {
    const canon = createCanonWithFacts([
      { subject: "Marie", predicate: "vivante", type: "STATE" }
    ]);
    const input = createInput("Marie marchait dans le parc.", canon, false);
    
    const result = await gate.execute(input);
    
    expect(result.verdict.status).not.toBe("FAIL");
  });

  it("should detect implicit state contradiction", async () => {
    const canon = createCanonWithFacts([
      { subject: "Pierre", predicate: "heureux", type: "STATE" }
    ]);
    const input = createInput("Pierre est triste depuis des jours.", canon, false);
    
    const result = await gate.execute(input);
    
    // Devrait détecter que "triste" contredit "heureux"
    expect(result.verdict.violations.length).toBeGreaterThan(0);
  });
});

describe("TRUTH_GATE — INV-TRUTH-02: Causalité stricte", () => {
  const gate = createTruthGate();

  it("should WARN on 'soudainement' without cause", async () => {
    const input = createInput(
      "Soudainement, la porte s'ouvrit.",
      createEmptyCanon(),
      false
    );
    
    const result = await gate.execute(input);
    
    expect(result.verdict.violations.some(v => v.type === "CAUSALITY_BREAK")).toBe(true);
  });

  it("should WARN on 'miraculeusement'", async () => {
    const input = createInput(
      "Il survécut miraculeusement à l'explosion.",
      createEmptyCanon(),
      false
    );
    
    const result = await gate.execute(input);
    
    expect(result.verdict.violations.some(v => v.type === "CAUSALITY_BREAK")).toBe(true);
  });

  it("should detect DEUS_EX_MACHINA on 'juste à temps'", async () => {
    const input = createInput(
      "Le héros arriva juste à temps pour sauver la princesse.",
      createEmptyCanon(),
      false
    );
    
    const result = await gate.execute(input);
    
    expect(result.verdict.violations.some(v => v.type === "DEUS_EX_MACHINA")).toBe(true);
  });

  it("should detect DEUS_EX_MACHINA on 'par chance'", async () => {
    const input = createInput(
      "Par chance, une échelle se trouvait là.",
      createEmptyCanon(),
      false
    );
    
    const result = await gate.execute(input);
    
    expect(result.verdict.violations.some(v => v.type === "DEUS_EX_MACHINA")).toBe(true);
  });
});

describe("TRUTH_GATE — INV-TRUTH-03: Référence inconnue", () => {
  const gate = createTruthGate();

  it("should WARN on unknown reference in strict mode", async () => {
    const canon = createCanonWithFacts([
      { subject: "Alice", predicate: "protagoniste", type: "CHARACTER" }
    ]);
    const input = createInput(
      "Bob entra dans la pièce.",
      canon,
      true // strict mode
    );
    
    const result = await gate.execute(input);
    
    expect(result.verdict.violations.some(v => v.type === "UNKNOWN_REFERENCE")).toBe(true);
  });

  it("should NOT warn on known reference", async () => {
    const canon = createCanonWithFacts([
      { subject: "Alice", predicate: "protagoniste", type: "CHARACTER" }
    ]);
    const input = createInput(
      "Alice entra dans la pièce.",
      canon,
      true
    );
    
    const result = await gate.execute(input);
    
    expect(result.verdict.violations.filter(v => v.type === "UNKNOWN_REFERENCE").length).toBe(0);
  });

  it("should ignore common words", async () => {
    const input = createInput(
      "Le chat est sur la table.",
      createEmptyCanon(),
      true
    );
    
    const result = await gate.execute(input);
    
    // "Le" ne devrait pas être flaggé comme référence inconnue
    const leViolation = result.verdict.violations.find(
      v => v.type === "UNKNOWN_REFERENCE" && v.source === "Le"
    );
    expect(leViolation).toBeUndefined();
  });
});

describe("TRUTH_GATE — INV-TRUTH-04: Déterminisme", () => {
  const gate = createTruthGate();

  it("should produce identical results for identical inputs", async () => {
    const canon = createCanonWithFacts([
      { subject: "Emma", predicate: "médecin", type: "CHARACTER" }
    ]);
    const input = createInput(
      "Emma examina le patient avec attention.",
      canon,
      false
    );
    
    const result1 = await gate.execute(input);
    const result2 = await gate.execute(input);
    
    expect(result1.verdict.status).toBe(result2.verdict.status);
    expect(result1.verdict.violations.length).toBe(result2.verdict.violations.length);
    expect(result1.extractedFacts.length).toBe(result2.extractedFacts.length);
  });

  it("should be deterministic across 5 runs", async () => {
    const input = createInput(
      "Soudainement, Marie apparut.",
      createEmptyCanon(),
      true
    );
    
    const results = await Promise.all([
      gate.execute(input),
      gate.execute(input),
      gate.execute(input),
      gate.execute(input),
      gate.execute(input),
    ]);
    
    const statuses = results.map(r => r.verdict.status);
    const violationCounts = results.map(r => r.verdict.violations.length);
    
    expect(new Set(statuses).size).toBe(1); // Tous identiques
    expect(new Set(violationCounts).size).toBe(1); // Tous identiques
  });
});

describe("TRUTH_GATE — Fact Extraction", () => {
  const gate = createTruthGate();

  it("should extract new facts on PASS", async () => {
    const input = createInput(
      "Marie est docteur. Pierre est ingénieur.",
      createEmptyCanon(),
      false
    );
    
    const result = await gate.execute(input);
    
    expect(result.extractedFacts.length).toBeGreaterThan(0);
    expect(result.extractedFacts.some(f => f.subject === "Marie")).toBe(true);
  });

  it("should NOT extract facts on FAIL", async () => {
    const canon = createCanonWithFacts([
      { subject: "Marie", predicate: "vivante", type: "STATE" }
    ]);
    const input = createInput(
      "Marie n'est pas vivante.",
      canon,
      false
    );
    
    const result = await gate.execute(input);
    
    expect(result.verdict.status).toBe("FAIL");
    expect(result.extractedFacts.length).toBe(0);
  });

  it("should update canon version on new facts", async () => {
    const canon = createEmptyCanon();
    const input = createInput(
      "Jean est avocat.",
      canon,
      false
    );
    
    const result = await gate.execute(input);
    
    if (result.updatedCanon) {
      expect(result.updatedCanon.version).not.toBe(canon.version);
    }
  });
});

describe("TRUTH_GATE — Severity Threshold", () => {
  const gate = createTruthGate();

  it("should FAIL when violation >= threshold", async () => {
    const input = createInput(
      "Par chance, tout s'arrangea.", // DEUS_EX_MACHINA = severity 7
      createEmptyCanon(),
      false,
      7 // threshold
    );
    
    const result = await gate.execute(input);
    
    expect(result.verdict.status).toBe("FAIL");
  });

  it("should WARN when violation < threshold", async () => {
    const input = createInput(
      "Soudainement, il se leva.", // CAUSALITY_BREAK = severity 6
      createEmptyCanon(),
      false,
      8 // threshold plus haut
    );
    
    const result = await gate.execute(input);
    
    expect(result.verdict.status).toBe("WARN");
  });
});
