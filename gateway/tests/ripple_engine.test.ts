/**
 * OMEGA RIPPLE_ENGINE — Tests L4 NASA-Grade
 * Module: gateway/tests/ripple_engine.test.ts
 * Phase: 7D
 * 
 * @invariant INV-RIPPLE-01: Propagation déterministe
 * @invariant INV-RIPPLE-02: Atténuation obligatoire
 * @invariant INV-RIPPLE-03: Pas de cycle infini
 * @invariant INV-RIPPLE-04: Traçabilité complète
 * @invariant INV-RIPPLE-05: Respect du canon
 */

import { describe, it, expect } from "vitest";
import { 
  createRippleEngine, 
  RippleSource, 
  RelationGraph, 
  RippleTarget,
  Ripple,
  PropagationConfig
} from "../src/gates/ripple_engine";
import { CanonState, CanonFact } from "../src/gates/types";

// ═══════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════

function createTarget(id: string, name: string, type: "CHARACTER" | "LOCATION" = "CHARACTER"): RippleTarget {
  return { id, name, type };
}

function createSource(
  subject: string,
  targets: RippleTarget[],
  strength = 0.8
): RippleSource {
  return {
    id: `SOURCE-${Date.now()}`,
    type: "CHARACTER_ACTION",
    subject,
    description: `Action de ${subject}`,
    initialStrength: strength,
    potentialTargets: targets,
    context: "chapter-1"
  };
}

function createGraph(connections: Array<[string, string, number]>): RelationGraph {
  const graph: RelationGraph = {
    connections: new Map()
  };
  
  for (const [from, to, weight] of connections) {
    const existing = graph.connections.get(from) || [];
    existing.push({ targetId: to, weight, type: "KNOWS" });
    graph.connections.set(from, existing);
  }
  
  return graph;
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

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe("RIPPLE_ENGINE — Core", () => {
  const engine = createRippleEngine();

  it("should have correct name and version", () => {
    expect(engine.name).toBe("RIPPLE_ENGINE");
    expect(engine.version).toBe("1.0.0");
  });

  it("should propagate to direct targets", () => {
    const source = createSource("Marie", [
      createTarget("jean", "Jean"),
      createTarget("pierre", "Pierre")
    ]);
    const graph = createGraph([]);
    
    const result = engine.propagate(source, graph);
    
    expect(result.ripples.length).toBe(2);
    expect(result.ripples.some(r => r.target.id === "jean")).toBe(true);
    expect(result.ripples.some(r => r.target.id === "pierre")).toBe(true);
  });

  it("should return processing time", () => {
    const source = createSource("Marie", [createTarget("jean", "Jean")]);
    const graph = createGraph([]);
    
    const result = engine.propagate(source, graph);
    
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
  });
});

describe("RIPPLE_ENGINE — INV-RIPPLE-01: Propagation déterministe", () => {
  const engine = createRippleEngine();

  it("should produce same ripples for same input", () => {
    const targets = [createTarget("jean", "Jean"), createTarget("pierre", "Pierre")];
    const source1 = { ...createSource("Marie", targets), id: "SOURCE-FIXED" };
    const source2 = { ...createSource("Marie", targets), id: "SOURCE-FIXED" };
    const graph = createGraph([["jean", "alice", 0.8]]);
    
    const result1 = engine.propagate(source1, graph);
    const result2 = engine.propagate(source2, graph);
    
    expect(result1.ripples.length).toBe(result2.ripples.length);
    expect(result1.depthReached).toBe(result2.depthReached);
  });

  it("should produce consistent depth across runs", () => {
    const source = createSource("Marie", [createTarget("jean", "Jean")], 0.9);
    const graph = createGraph([
      ["jean", "pierre", 0.9],
      ["pierre", "alice", 0.9]
    ]);
    
    const results = [
      engine.propagate(source, graph),
      engine.propagate(source, graph),
      engine.propagate(source, graph)
    ];
    
    const depths = results.map(r => r.depthReached);
    expect(new Set(depths).size).toBe(1); // All same
  });
});

describe("RIPPLE_ENGINE — INV-RIPPLE-02: Atténuation obligatoire", () => {
  const engine = createRippleEngine();

  it("should attenuate strength with depth", () => {
    const strength = 1.0;
    const attenuation = 0.3;
    
    const depth0 = engine.attenuate(strength, 0, attenuation);
    const depth1 = engine.attenuate(strength, 1, attenuation);
    const depth2 = engine.attenuate(strength, 2, attenuation);
    
    expect(depth0).toBe(1.0);
    expect(depth1).toBeCloseTo(0.7, 2);
    expect(depth2).toBeCloseTo(0.49, 2);
  });

  it("should produce weaker ripples at greater depth", () => {
    const source = createSource("Marie", [createTarget("jean", "Jean")], 1.0);
    const graph = createGraph([
      ["jean", "pierre", 1.0],
      ["pierre", "alice", 1.0]
    ]);
    
    const result = engine.propagate(source, graph, { attenuation: 0.3 });
    
    const jeanRipple = result.ripples.find(r => r.target.id === "jean");
    const pierreRipple = result.ripples.find(r => r.target.id === "pierre");
    
    expect(jeanRipple).toBeDefined();
    expect(pierreRipple).toBeDefined();
    expect(pierreRipple!.strength).toBeLessThan(jeanRipple!.strength);
  });

  it("should stop propagation when strength below minimum", () => {
    const source = createSource("Marie", [createTarget("jean", "Jean")], 0.1);
    const graph = createGraph([
      ["jean", "pierre", 0.5],
      ["pierre", "alice", 0.5],
      ["alice", "bob", 0.5]
    ]);
    
    const result = engine.propagate(source, graph, { 
      attenuation: 0.5,
      minStrength: 0.05
    });
    
    // Should not reach very far with low initial strength
    expect(result.depthReached).toBeLessThan(4);
  });
});

describe("RIPPLE_ENGINE — INV-RIPPLE-03: Pas de cycle infini", () => {
  const engine = createRippleEngine();

  it("should detect cycles", () => {
    const visited = new Set(["A", "B", "C"]);
    
    expect(engine.detectCycle("A", visited)).toBe(true);
    expect(engine.detectCycle("D", visited)).toBe(false);
  });

  it("should avoid infinite loops in circular graph", () => {
    const source = createSource("Marie", [createTarget("A", "A")]);
    const graph = createGraph([
      ["A", "B", 0.9],
      ["B", "C", 0.9],
      ["C", "A", 0.9] // Cycle!
    ]);
    
    const result = engine.propagate(source, graph, { maxDepth: 20 });
    
    expect(result.cyclesAvoided).toBeGreaterThan(0);
    expect(result.ripples.length).toBeLessThan(100); // Should terminate
  });

  it("should respect max depth", () => {
    const source = createSource("Marie", [createTarget("A", "A")], 1.0);
    const graph = createGraph([
      ["A", "B", 1.0],
      ["B", "C", 1.0],
      ["C", "D", 1.0],
      ["D", "E", 1.0],
      ["E", "F", 1.0]
    ]);
    
    const result = engine.propagate(source, graph, { 
      maxDepth: 2,
      attenuation: 0.1
    });
    
    expect(result.depthReached).toBeLessThanOrEqual(2);
  });
});

describe("RIPPLE_ENGINE — INV-RIPPLE-04: Traçabilité complète", () => {
  const engine = createRippleEngine();

  it("should trace causal chain", () => {
    const ripples: Ripple[] = [
      {
        id: "R1",
        sourceId: "S1",
        sourceType: "CHARACTER_ACTION",
        target: createTarget("A", "A"),
        impactType: "BEHAVIORAL",
        strength: 0.8,
        depth: 0,
        description: "Test",
        timestamp: new Date().toISOString(),
        causalChain: ["S1"]
      },
      {
        id: "R2",
        sourceId: "S1",
        sourceType: "CHARACTER_ACTION",
        target: createTarget("B", "B"),
        impactType: "BEHAVIORAL",
        strength: 0.5,
        depth: 1,
        description: "Test",
        timestamp: new Date().toISOString(),
        parentRippleId: "R1",
        causalChain: ["S1", "R1"]
      }
    ];
    
    const chain = engine.traceCausalChain(ripples[1], ripples);
    
    expect(chain).toContain("R1");
    expect(chain).toContain("R2");
  });

  it("should include causal chain in ripples", () => {
    const source = createSource("Marie", [createTarget("A", "A")]);
    const graph = createGraph([["A", "B", 0.8]]);
    
    const result = engine.propagate(source, graph);
    
    for (const ripple of result.ripples) {
      expect(ripple.causalChain).toBeDefined();
      expect(ripple.causalChain.length).toBeGreaterThan(0);
    }
  });

  it("should trace back to source", () => {
    const source = createSource("Marie", [createTarget("A", "A")]);
    source.id = "SOURCE-TRACE-TEST";
    const graph = createGraph([
      ["A", "B", 0.9],
      ["B", "C", 0.9]
    ]);
    
    const result = engine.propagate(source, graph, { attenuation: 0.1 });
    
    // All ripples should trace back to source
    for (const ripple of result.ripples) {
      expect(ripple.causalChain[0]).toBe("SOURCE-TRACE-TEST");
    }
  });
});

describe("RIPPLE_ENGINE — INV-RIPPLE-05: Respect du canon", () => {
  const engine = createRippleEngine();

  it("should validate ripple against canon - alive character", () => {
    const canon = createCanonWithFact("Marie", "vivante");
    const ripple: Ripple = {
      id: "R1",
      sourceId: "S1",
      sourceType: "CHARACTER_ACTION",
      target: createTarget("Marie", "Marie"),
      impactType: "PHYSICAL",
      strength: 0.3,
      depth: 0,
      description: "Test",
      timestamp: new Date().toISOString(),
      causalChain: ["S1"]
    };
    
    expect(engine.validateAgainstCanon(ripple, canon)).toBe(true);
  });

  it("should reject physical impact on dead character", () => {
    const canon = createCanonWithFact("Marie", "morte");
    const ripple: Ripple = {
      id: "R1",
      sourceId: "S1",
      sourceType: "CHARACTER_ACTION",
      target: createTarget("Marie", "Marie"),
      impactType: "PHYSICAL",
      strength: 0.8,
      depth: 0,
      description: "Test",
      timestamp: new Date().toISOString(),
      causalChain: ["S1"]
    };
    
    expect(engine.validateAgainstCanon(ripple, canon)).toBe(false);
  });

  it("should allow emotional impact on dead character (memories)", () => {
    const canon = createCanonWithFact("Marie", "morte");
    const ripple: Ripple = {
      id: "R1",
      sourceId: "S1",
      sourceType: "EMOTION_SHIFT",
      target: createTarget("Jean", "Jean"), // Jean affected by Marie's death
      impactType: "EMOTIONAL",
      strength: 0.9,
      depth: 0,
      description: "Jean learns of Marie death",
      timestamp: new Date().toISOString(),
      causalChain: ["S1"]
    };
    
    expect(engine.validateAgainstCanon(ripple, canon)).toBe(true);
  });
});

describe("RIPPLE_ENGINE — Blockers", () => {
  const engine = createRippleEngine();

  it("should block ripples to specified targets", () => {
    const source = createSource("Marie", [
      createTarget("jean", "Jean"),
      createTarget("pierre", "Pierre"),
      createTarget("blocked", "Blocked")
    ]);
    const graph = createGraph([]);
    
    const result = engine.propagate(source, graph, {
      blockers: ["blocked"]
    });
    
    expect(result.ripples.some(r => r.target.id === "blocked")).toBe(false);
    expect(result.blockedCount).toBe(1);
  });

  it("should block propagation through blocker", () => {
    const source = createSource("Marie", [createTarget("A", "A")]);
    const graph = createGraph([
      ["A", "WALL", 1.0],
      ["WALL", "B", 1.0]
    ]);
    
    const result = engine.propagate(source, graph, {
      blockers: ["WALL"]
    });
    
    expect(result.ripples.some(r => r.target.id === "B")).toBe(false);
    expect(result.blockedCount).toBeGreaterThan(0);
  });
});

describe("RIPPLE_ENGINE — Complex scenarios", () => {
  const engine = createRippleEngine();

  it("should handle large graph efficiently", () => {
    const targets = Array.from({ length: 10 }, (_, i) => 
      createTarget(`char${i}`, `Character ${i}`)
    );
    const source = createSource("Hero", targets, 0.9);
    
    // Create dense connections
    const connections: Array<[string, string, number]> = [];
    for (let i = 0; i < 10; i++) {
      for (let j = i + 1; j < 10; j++) {
        connections.push([`char${i}`, `char${j}`, 0.5]);
      }
    }
    const graph = createGraph(connections);
    
    const result = engine.propagate(source, graph, { maxDepth: 3 });
    
    expect(result.processingTimeMs).toBeLessThan(1000);
    expect(result.ripples.length).toBeGreaterThan(0);
  });

  it("should handle empty target list", () => {
    const source = createSource("Marie", []);
    const graph = createGraph([]);
    
    const result = engine.propagate(source, graph);
    
    expect(result.ripples.length).toBe(0);
    expect(result.depthReached).toBe(0);
  });

  it("should handle disconnected graph", () => {
    const source = createSource("Marie", [createTarget("A", "A")]);
    const graph = createGraph([
      ["X", "Y", 1.0], // Disconnected from A
      ["Y", "Z", 1.0]
    ]);
    
    const result = engine.propagate(source, graph);
    
    expect(result.ripples.length).toBe(1); // Only direct target
    expect(result.depthReached).toBe(0);
  });
});
