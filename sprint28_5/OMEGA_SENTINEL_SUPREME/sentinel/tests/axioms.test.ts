/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — AXIOMS TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module tests/axioms.test
 * @version 3.26.0
 * 
 * INVARIANTS TESTED:
 * - INV-AX-01: All axioms have explicit rejection consequences
 * - INV-AX-02: Axiom set is complete and minimal (5 axioms)
 * - INV-AX-03: Axioms are immutable once declared
 * - INV-AX-04: Each axiom has formal and natural language statements
 * - INV-AX-05: Rejection impact is categorized (TOTAL/PARTIAL)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  // Types
  type Axiom,
  type AxiomValidationResult,
  type RejectionImpact,
  
  // Registry
  AXIOM_REGISTRY,
  
  // Individual axioms
  AXIOM_OMEGA,
  AXIOM_LAMBDA,
  AXIOM_SIGMA,
  AXIOM_DELTA,
  AXIOM_EPSILON,
  
  // Accessors
  getAxiom,
  getAllAxioms,
  getCriticalAxioms,
  getNonCriticalAxioms,
  getAssumedAxiomIds,
  
  // Validation
  validateAxiomRegistry,
  
  // Consequence analysis
  computeRejectionConsequences,
  isSystemInvalidated,
  
  // Documentation
  generateAxiomSummary,
  generateRejectionTable
} from '../foundation/axioms.js';

import { AXIOM_IDS, type AxiomId } from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: AXIOM REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Axiom Registry', () => {
  
  describe('INV-AX-02: Completeness and Minimality', () => {
    
    it('should contain exactly 5 axioms', () => {
      const axioms = getAllAxioms();
      expect(axioms).toHaveLength(5);
    });
    
    it('should contain all expected axiom IDs', () => {
      const expected: AxiomId[] = ['AX-Ω', 'AX-Λ', 'AX-Σ', 'AX-Δ', 'AX-Ε'];
      for (const id of expected) {
        const axiom = getAxiom(id);
        expect(axiom).toBeDefined();
        expect(axiom?.id).toBe(id);
      }
    });
    
    it('should have no duplicate axiom IDs', () => {
      const axioms = getAllAxioms();
      const ids = axioms.map(a => a.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids).toHaveLength(uniqueIds.length);
    });
    
    it('should match AXIOM_IDS constant', () => {
      const axioms = getAllAxioms();
      const ids = axioms.map(a => a.id);
      expect(ids).toEqual([...AXIOM_IDS]);
    });
    
  });
  
  describe('INV-AX-03: Immutability', () => {
    
    it('should freeze individual axioms', () => {
      expect(Object.isFrozen(AXIOM_OMEGA)).toBe(true);
      expect(Object.isFrozen(AXIOM_LAMBDA)).toBe(true);
      expect(Object.isFrozen(AXIOM_SIGMA)).toBe(true);
      expect(Object.isFrozen(AXIOM_DELTA)).toBe(true);
      expect(Object.isFrozen(AXIOM_EPSILON)).toBe(true);
    });
    
    it('should freeze axiom registry', () => {
      expect(Object.isFrozen(AXIOM_REGISTRY)).toBe(true);
    });
    
    it('should freeze dependent features arrays', () => {
      for (const axiom of getAllAxioms()) {
        expect(Object.isFrozen(axiom.dependentFeatures)).toBe(true);
      }
    });
    
    it('should prevent modification of axioms', () => {
      const axiom = getAxiom('AX-Ω');
      expect(axiom).toBeDefined();
      
      // Attempting to modify should fail silently (frozen object)
      // or throw in strict mode
      expect(() => {
        (axiom as any).name = 'Modified Name';
      }).toThrow();
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: INDIVIDUAL AXIOMS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Individual Axioms', () => {
  
  describe('INV-AX-04: Formal and Natural Statements', () => {
    
    it.each(getAllAxioms().map(a => [a.id, a]))(
      '%s should have non-empty statement',
      (id, axiom) => {
        expect(axiom.statement).toBeDefined();
        expect(axiom.statement.length).toBeGreaterThan(50);
      }
    );
    
    it.each(getAllAxioms().map(a => [a.id, a]))(
      '%s should have formal notation',
      (id, axiom) => {
        expect(axiom.formal).toBeDefined();
        expect(axiom.formal.length).toBeGreaterThan(5);
        // Should contain logical symbols or mathematical notation
        expect(
          axiom.formal.includes('∀') ||
          axiom.formal.includes('∃') ||
          axiom.formal.includes('→') ||
          axiom.formal.includes('<') ||
          axiom.formal.includes('=')
        ).toBe(true);
      }
    );
    
  });
  
  describe('INV-AX-01: Rejection Consequences', () => {
    
    it.each(getAllAxioms().map(a => [a.id, a]))(
      '%s should have explicit rejection consequence',
      (id, axiom) => {
        expect(axiom.ifRejected).toBeDefined();
        expect(axiom.ifRejected.length).toBeGreaterThan(20);
      }
    );
    
    it.each(getAllAxioms().map(a => [a.id, a]))(
      '%s should have justification',
      (id, axiom) => {
        expect(axiom.justification).toBeDefined();
        expect(axiom.justification.length).toBeGreaterThan(30);
      }
    );
    
  });
  
  describe('INV-AX-05: Rejection Impact Classification', () => {
    
    it.each(getAllAxioms().map(a => [a.id, a]))(
      '%s should have valid rejection impact',
      (id, axiom) => {
        expect(['TOTAL', 'PARTIAL']).toContain(axiom.rejectionImpact);
      }
    );
    
    it('AX-Ω should have TOTAL impact', () => {
      expect(AXIOM_OMEGA.rejectionImpact).toBe('TOTAL');
    });
    
    it('AX-Λ should have TOTAL impact', () => {
      expect(AXIOM_LAMBDA.rejectionImpact).toBe('TOTAL');
    });
    
    it('AX-Δ should have TOTAL impact', () => {
      expect(AXIOM_DELTA.rejectionImpact).toBe('TOTAL');
    });
    
    it('AX-Σ should have PARTIAL impact', () => {
      expect(AXIOM_SIGMA.rejectionImpact).toBe('PARTIAL');
    });
    
    it('AX-Ε should have PARTIAL impact', () => {
      expect(AXIOM_EPSILON.rejectionImpact).toBe('PARTIAL');
    });
    
  });
  
  describe('Dependent Features', () => {
    
    it.each(getAllAxioms().map(a => [a.id, a]))(
      '%s should have at least one dependent feature',
      (id, axiom) => {
        expect(axiom.dependentFeatures.length).toBeGreaterThan(0);
      }
    );
    
    it('AX-Ω should list Falsification Engine as dependent', () => {
      expect(AXIOM_OMEGA.dependentFeatures).toContain('Falsification Engine');
    });
    
    it('AX-Δ should list Certificate Signing as dependent', () => {
      expect(AXIOM_DELTA.dependentFeatures).toContain('Certificate Signing');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: AX-Ω FALSIFIABILITY (SPECIFIC)
// ═══════════════════════════════════════════════════════════════════════════════

describe('AX-Ω — Falsifiability Axiom', () => {
  
  it('should be the first axiom (core)', () => {
    const axioms = getAllAxioms();
    expect(axioms[0]?.id).toBe('AX-Ω');
  });
  
  it('should reference Popper in justification', () => {
    expect(AXIOM_OMEGA.justification.toLowerCase()).toContain('popper');
  });
  
  it('should define certification as failure to falsify', () => {
    expect(AXIOM_OMEGA.statement.toLowerCase()).toContain('falsif');
    expect(AXIOM_OMEGA.formal).toContain('falsification_method');
  });
  
  it('should have TOTAL rejection impact', () => {
    expect(AXIOM_OMEGA.rejectionImpact).toBe('TOTAL');
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: AX-Σ BOUNDED ATTACK SPACE (R1 CORRECTION)
// ═══════════════════════════════════════════════════════════════════════════════

describe('AX-Σ — Bounded Attack Space (R1 Correction)', () => {
  
  it('should mention measurable approximation', () => {
    expect(AXIOM_SIGMA.statement.toLowerCase()).toContain('approximation');
    expect(AXIOM_SIGMA.statement.toLowerCase()).toContain('measurable');
  });
  
  it('should handle continuous/parametric inputs', () => {
    expect(AXIOM_SIGMA.justification.toLowerCase()).toContain('continuous');
  });
  
  it('should reference discretization', () => {
    expect(AXIOM_SIGMA.justification.toLowerCase()).toContain('discretization');
  });
  
  it('should have formal with OR condition for approximability', () => {
    expect(AXIOM_SIGMA.formal).toContain('∨');  // OR
    expect(AXIOM_SIGMA.formal.toLowerCase()).toContain('approx');
  });
  
  it('should have PARTIAL rejection impact', () => {
    // R1: AX-Σ is not TOTAL because system can still work without coverage metrics
    expect(AXIOM_SIGMA.rejectionImpact).toBe('PARTIAL');
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: ACCESSOR FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Accessor Functions', () => {
  
  describe('getAxiom', () => {
    
    it('should return axiom by ID', () => {
      const axiom = getAxiom('AX-Ω');
      expect(axiom).toBeDefined();
      expect(axiom?.name).toBe('Falsifiability Axiom');
    });
    
    it('should return undefined for unknown ID', () => {
      const axiom = getAxiom('AX-UNKNOWN' as AxiomId);
      expect(axiom).toBeUndefined();
    });
    
  });
  
  describe('getAllAxioms', () => {
    
    it('should return all axioms in canonical order', () => {
      const axioms = getAllAxioms();
      const ids = axioms.map(a => a.id);
      expect(ids).toEqual(['AX-Ω', 'AX-Λ', 'AX-Σ', 'AX-Δ', 'AX-Ε']);
    });
    
    it('should return readonly array', () => {
      const axioms = getAllAxioms();
      const originalLength = axioms.length;
      // In strict mode, modifying a frozen array throws
      // In non-strict, it silently fails
      // We verify the array is frozen
      expect(Object.isFrozen(axioms)).toBe(true);
      // Verify length is still 5 (push had no effect)
      expect(axioms.length).toBe(originalLength);
      expect(axioms.length).toBe(5);
    });
    
  });
  
  describe('getCriticalAxioms', () => {
    
    it('should return only TOTAL impact axioms', () => {
      const critical = getCriticalAxioms();
      for (const axiom of critical) {
        expect(axiom.rejectionImpact).toBe('TOTAL');
      }
    });
    
    it('should include AX-Ω, AX-Λ, AX-Δ', () => {
      const critical = getCriticalAxioms();
      const ids = critical.map(a => a.id);
      expect(ids).toContain('AX-Ω');
      expect(ids).toContain('AX-Λ');
      expect(ids).toContain('AX-Δ');
    });
    
  });
  
  describe('getNonCriticalAxioms', () => {
    
    it('should return only PARTIAL impact axioms', () => {
      const nonCritical = getNonCriticalAxioms();
      for (const axiom of nonCritical) {
        expect(axiom.rejectionImpact).toBe('PARTIAL');
      }
    });
    
    it('should include AX-Σ, AX-Ε', () => {
      const nonCritical = getNonCriticalAxioms();
      const ids = nonCritical.map(a => a.id);
      expect(ids).toContain('AX-Σ');
      expect(ids).toContain('AX-Ε');
    });
    
  });
  
  describe('getAssumedAxiomIds', () => {
    
    it('should return all 5 axiom IDs', () => {
      const ids = getAssumedAxiomIds();
      expect(ids).toHaveLength(5);
      expect([...ids]).toEqual(['AX-Ω', 'AX-Λ', 'AX-Σ', 'AX-Δ', 'AX-Ε']);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Validation', () => {
  
  describe('validateAxiomRegistry', () => {
    
    it('should validate successfully', () => {
      const result = validateAxiomRegistry();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should report correct axiom count', () => {
      const result = validateAxiomRegistry();
      expect(result.axiomCount).toBe(5);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: CONSEQUENCE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Consequence Analysis', () => {
  
  describe('computeRejectionConsequences', () => {
    
    it('should return empty for no rejections', () => {
      const consequences = computeRejectionConsequences(new Set());
      expect(consequences).toHaveLength(0);
    });
    
    it('should return features for single rejection', () => {
      const consequences = computeRejectionConsequences(new Set(['AX-Ω']));
      expect(consequences.length).toBeGreaterThan(0);
      expect(consequences).toContain('Falsification Engine');
    });
    
    it('should merge features for multiple rejections', () => {
      const consequences = computeRejectionConsequences(
        new Set(['AX-Ω', 'AX-Δ'])
      );
      expect(consequences).toContain('Falsification Engine');
      expect(consequences).toContain('Certificate Signing');
    });
    
    it('should deduplicate shared features', () => {
      const consequences = computeRejectionConsequences(
        new Set(['AX-Ω', 'AX-Λ', 'AX-Σ', 'AX-Δ', 'AX-Ε'])
      );
      const uniqueCount = new Set(consequences).size;
      expect(consequences.length).toBe(uniqueCount);
    });
    
  });
  
  describe('isSystemInvalidated', () => {
    
    it('should return false for no rejections', () => {
      expect(isSystemInvalidated(new Set())).toBe(false);
    });
    
    it('should return true for AX-Ω rejection', () => {
      expect(isSystemInvalidated(new Set(['AX-Ω']))).toBe(true);
    });
    
    it('should return true for AX-Λ rejection', () => {
      expect(isSystemInvalidated(new Set(['AX-Λ']))).toBe(true);
    });
    
    it('should return true for AX-Δ rejection', () => {
      expect(isSystemInvalidated(new Set(['AX-Δ']))).toBe(true);
    });
    
    it('should return false for only AX-Σ rejection', () => {
      expect(isSystemInvalidated(new Set(['AX-Σ']))).toBe(false);
    });
    
    it('should return false for only AX-Ε rejection', () => {
      expect(isSystemInvalidated(new Set(['AX-Ε']))).toBe(false);
    });
    
    it('should return true if any TOTAL axiom rejected', () => {
      expect(isSystemInvalidated(new Set(['AX-Σ', 'AX-Ω']))).toBe(true);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DOCUMENTATION GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Documentation Generation', () => {
  
  describe('generateAxiomSummary', () => {
    
    it('should generate non-empty summary', () => {
      const summary = generateAxiomSummary();
      expect(summary.length).toBeGreaterThan(500);
    });
    
    it('should include all axiom IDs', () => {
      const summary = generateAxiomSummary();
      for (const id of AXIOM_IDS) {
        expect(summary).toContain(id);
      }
    });
    
    it('should include header', () => {
      const summary = generateAxiomSummary();
      expect(summary).toContain('FOUNDATIONAL AXIOMS');
    });
    
  });
  
  describe('generateRejectionTable', () => {
    
    it('should generate markdown table', () => {
      const table = generateRejectionTable();
      expect(table).toContain('|');
      expect(table).toContain('Axiom');
      expect(table).toContain('Impact');
    });
    
    it('should include all axioms', () => {
      const table = generateRejectionTable();
      for (const id of AXIOM_IDS) {
        expect(table).toContain(id);
      }
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe('Determinism', () => {
  
  it('should return same axioms on multiple calls', () => {
    const call1 = getAllAxioms();
    const call2 = getAllAxioms();
    expect(call1).toEqual(call2);
  });
  
  it('should return same validation result on multiple calls', () => {
    const call1 = validateAxiomRegistry();
    const call2 = validateAxiomRegistry();
    expect(call1).toEqual(call2);
  });
  
  it('should return same consequences on multiple calls', () => {
    const rejected = new Set<AxiomId>(['AX-Ω', 'AX-Σ']);
    const call1 = computeRejectionConsequences(rejected);
    const call2 = computeRejectionConsequences(rejected);
    expect(call1).toEqual(call2);
  });
  
});
