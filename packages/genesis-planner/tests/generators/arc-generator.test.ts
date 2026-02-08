import { describe, it, expect } from 'vitest';
import { generateArcs } from '../../src/generators/arc-generator.js';
import { SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS, SCENARIO_C_INTENT, SCENARIO_C_CANON, SCENARIO_C_CONSTRAINTS } from '../fixtures.js';

describe('Arc Generator', () => {
  it('should generate 1 arc for small word count (≤3000)', () => {
    const arcs = generateArcs(SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS);
    expect(arcs.length).toBe(1);
  });

  it('should generate 2 arcs for medium word count (≤10000)', () => {
    const arcs = generateArcs(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    expect(arcs.length).toBe(2);
  });

  it('should generate 3 arcs for large word count (>10000)', () => {
    const arcs = generateArcs(SCENARIO_C_INTENT, SCENARIO_C_CANON, SCENARIO_C_CONSTRAINTS);
    expect(arcs.length).toBe(3);
  });

  it('should include justification on every arc', () => {
    const arcs = generateArcs(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    for (const arc of arcs) {
      expect(arc.justification).toBeTruthy();
      expect(arc.justification.length).toBeGreaterThan(0);
    }
  });

  it('should include progression on every arc', () => {
    const arcs = generateArcs(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    for (const arc of arcs) {
      expect(arc.progression).toBeTruthy();
    }
  });

  it('should be deterministic (same input → same output)', () => {
    const arcs1 = generateArcs(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    const arcs2 = generateArcs(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    expect(arcs1).toEqual(arcs2);
  });
});
