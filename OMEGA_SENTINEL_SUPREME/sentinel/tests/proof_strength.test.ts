/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — PROOF STRENGTH TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module tests/proof_strength.test
 * @version 3.26.0
 * 
 * INVARIANTS TESTED:
 * - INV-PROOF-01: Proof strengths form a total order (Ω > Λ > Σ > Δ > Ε)
 * - INV-PROOF-02: Each strength level has explicit criteria
 * - INV-PROOF-03: Strength comparison is deterministic
 * - INV-PROOF-04: Composite strength is dominated by weakest link
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  // Types
  type ProofStrength,
  type ProofStrengthDefinition,
  type StrengthComparison,
  type CompositeProofStrength,
  
  // Registry
  STRENGTH_ORDER,
  ALL_STRENGTHS,
  
  // Individual definitions
  STRENGTH_OMEGA,
  STRENGTH_LAMBDA,
  STRENGTH_SIGMA,
  STRENGTH_DELTA,
  STRENGTH_EPSILON,
  
  // Accessors
  getStrengthDefinition,
  getStrengthWeight,
  getStrengthName,
  
  // Comparison
  compareStrengths,
  isAtLeast,
  isStrongerThan,
  maxStrength,
  minStrength,
  
  // Composite
  computeCompositeStrength,
  meetsMinimumStrength,
  getDominantStrength,
  
  // Validation
  isProofStrength,
  parseProofStrength,
  
  // Documentation
  generateStrengthHierarchy,
  generateStrengthTable
} from '../foundation/proof_strength.js';

import { PROOF_STRENGTH_WEIGHTS } from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: STRENGTH ORDER
// ═══════════════════════════════════════════════════════════════════════════════

describe('Strength Order', () => {
  
  describe('INV-PROOF-01: Total Order', () => {
    
    it('should have exactly 5 strength levels', () => {
      expect(STRENGTH_ORDER).toHaveLength(5);
      expect(ALL_STRENGTHS).toHaveLength(5);
    });
    
    it('should be in descending order (strongest first)', () => {
      expect(STRENGTH_ORDER).toEqual(['Ω', 'Λ', 'Σ', 'Δ', 'Ε']);
    });
    
    it('should have strictly decreasing weights', () => {
      for (let i = 0; i < STRENGTH_ORDER.length - 1; i++) {
        const current = getStrengthWeight(STRENGTH_ORDER[i]!);
        const next = getStrengthWeight(STRENGTH_ORDER[i + 1]!);
        expect(current).toBeGreaterThan(next);
      }
    });
    
    it('should have Ω as strongest', () => {
      const omega = getStrengthWeight('Ω');
      for (const s of STRENGTH_ORDER) {
        expect(omega).toBeGreaterThanOrEqual(getStrengthWeight(s));
      }
    });
    
    it('should have Ε as weakest', () => {
      const epsilon = getStrengthWeight('Ε');
      for (const s of STRENGTH_ORDER) {
        expect(epsilon).toBeLessThanOrEqual(getStrengthWeight(s));
      }
    });
    
  });
  
  describe('Weights', () => {
    
    it('should match PROOF_STRENGTH_WEIGHTS constant', () => {
      expect(getStrengthWeight('Ω')).toBe(PROOF_STRENGTH_WEIGHTS.OMEGA);
      expect(getStrengthWeight('Λ')).toBe(PROOF_STRENGTH_WEIGHTS.LAMBDA);
      expect(getStrengthWeight('Σ')).toBe(PROOF_STRENGTH_WEIGHTS.SIGMA);
      expect(getStrengthWeight('Δ')).toBe(PROOF_STRENGTH_WEIGHTS.DELTA);
      expect(getStrengthWeight('Ε')).toBe(PROOF_STRENGTH_WEIGHTS.EPSILON);
    });
    
    it('should have weights: Ω=5, Λ=4, Σ=3, Δ=2, Ε=1', () => {
      expect(getStrengthWeight('Ω')).toBe(5);
      expect(getStrengthWeight('Λ')).toBe(4);
      expect(getStrengthWeight('Σ')).toBe(3);
      expect(getStrengthWeight('Δ')).toBe(2);
      expect(getStrengthWeight('Ε')).toBe(1);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: STRENGTH DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Strength Definitions', () => {
  
  describe('INV-PROOF-02: Explicit Criteria', () => {
    
    it.each(ALL_STRENGTHS.map(d => [d.symbol, d]))(
      '%s should have non-empty description',
      (symbol, def) => {
        expect(def.description.length).toBeGreaterThan(50);
      }
    );
    
    it.each(ALL_STRENGTHS.map(d => [d.symbol, d]))(
      '%s should have criteria array',
      (symbol, def) => {
        expect(Array.isArray(def.criteria)).toBe(true);
        expect(def.criteria.length).toBeGreaterThan(0);
      }
    );
    
    it.each(ALL_STRENGTHS.map(d => [d.symbol, d]))(
      '%s should have example',
      (symbol, def) => {
        expect(def.example.length).toBeGreaterThan(20);
      }
    );
    
    it.each(ALL_STRENGTHS.map(d => [d.symbol, d]))(
      '%s should have methods array',
      (symbol, def) => {
        expect(Array.isArray(def.methods)).toBe(true);
        expect(def.methods.length).toBeGreaterThan(0);
      }
    );
    
  });
  
  describe('Impossibility Capability', () => {
    
    it('Ω should be able to prove impossibility', () => {
      expect(STRENGTH_OMEGA.canProveImpossibility).toBe(true);
    });
    
    it('Λ should be able to prove impossibility', () => {
      expect(STRENGTH_LAMBDA.canProveImpossibility).toBe(true);
    });
    
    it('Σ should NOT be able to prove impossibility', () => {
      expect(STRENGTH_SIGMA.canProveImpossibility).toBe(false);
    });
    
    it('Δ should NOT be able to prove impossibility', () => {
      expect(STRENGTH_DELTA.canProveImpossibility).toBe(false);
    });
    
    it('Ε should NOT be able to prove impossibility', () => {
      expect(STRENGTH_EPSILON.canProveImpossibility).toBe(false);
    });
    
  });
  
  describe('Determinism', () => {
    
    it.each(ALL_STRENGTHS.map(d => [d.symbol, d]))(
      '%s should be deterministic',
      (symbol, def) => {
        expect(def.isDeterministic).toBe(true);
      }
    );
    
  });
  
  describe('Immutability', () => {
    
    it.each(ALL_STRENGTHS.map(d => [d.symbol, d]))(
      '%s definition should be frozen',
      (symbol, def) => {
        expect(Object.isFrozen(def)).toBe(true);
        expect(Object.isFrozen(def.criteria)).toBe(true);
        expect(Object.isFrozen(def.methods)).toBe(true);
      }
    );
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: COMPARISON FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Comparison Functions', () => {
  
  describe('INV-PROOF-03: Deterministic Comparison', () => {
    
    describe('compareStrengths', () => {
      
      it('should return STRONGER when first is stronger', () => {
        expect(compareStrengths('Ω', 'Λ')).toBe('STRONGER');
        expect(compareStrengths('Ω', 'Ε')).toBe('STRONGER');
        expect(compareStrengths('Λ', 'Σ')).toBe('STRONGER');
        expect(compareStrengths('Σ', 'Δ')).toBe('STRONGER');
        expect(compareStrengths('Δ', 'Ε')).toBe('STRONGER');
      });
      
      it('should return WEAKER when first is weaker', () => {
        expect(compareStrengths('Λ', 'Ω')).toBe('WEAKER');
        expect(compareStrengths('Ε', 'Ω')).toBe('WEAKER');
        expect(compareStrengths('Σ', 'Λ')).toBe('WEAKER');
        expect(compareStrengths('Δ', 'Σ')).toBe('WEAKER');
        expect(compareStrengths('Ε', 'Δ')).toBe('WEAKER');
      });
      
      it('should return EQUAL for same strength', () => {
        for (const s of STRENGTH_ORDER) {
          expect(compareStrengths(s, s)).toBe('EQUAL');
        }
      });
      
      it('should be deterministic (same result on multiple calls)', () => {
        const pairs: [ProofStrength, ProofStrength][] = [
          ['Ω', 'Λ'],
          ['Σ', 'Ε'],
          ['Δ', 'Δ']
        ];
        
        for (const [a, b] of pairs) {
          const result1 = compareStrengths(a, b);
          const result2 = compareStrengths(a, b);
          expect(result1).toBe(result2);
        }
      });
      
    });
    
    describe('isAtLeast', () => {
      
      it('should return true for same strength', () => {
        for (const s of STRENGTH_ORDER) {
          expect(isAtLeast(s, s)).toBe(true);
        }
      });
      
      it('should return true when first is stronger', () => {
        expect(isAtLeast('Ω', 'Ε')).toBe(true);
        expect(isAtLeast('Λ', 'Σ')).toBe(true);
      });
      
      it('should return false when first is weaker', () => {
        expect(isAtLeast('Ε', 'Ω')).toBe(false);
        expect(isAtLeast('Σ', 'Λ')).toBe(false);
      });
      
    });
    
    describe('isStrongerThan', () => {
      
      it('should return false for same strength', () => {
        for (const s of STRENGTH_ORDER) {
          expect(isStrongerThan(s, s)).toBe(false);
        }
      });
      
      it('should return true when strictly stronger', () => {
        expect(isStrongerThan('Ω', 'Λ')).toBe(true);
        expect(isStrongerThan('Ω', 'Ε')).toBe(true);
      });
      
      it('should return false when weaker or equal', () => {
        expect(isStrongerThan('Ε', 'Ω')).toBe(false);
        expect(isStrongerThan('Λ', 'Ω')).toBe(false);
      });
      
    });
    
    describe('maxStrength', () => {
      
      it('should return the stronger of two', () => {
        expect(maxStrength('Ω', 'Ε')).toBe('Ω');
        expect(maxStrength('Ε', 'Ω')).toBe('Ω');
        expect(maxStrength('Λ', 'Σ')).toBe('Λ');
      });
      
      it('should return either when equal', () => {
        expect(maxStrength('Δ', 'Δ')).toBe('Δ');
      });
      
    });
    
    describe('minStrength', () => {
      
      it('should return the weaker of two', () => {
        expect(minStrength('Ω', 'Ε')).toBe('Ε');
        expect(minStrength('Ε', 'Ω')).toBe('Ε');
        expect(minStrength('Λ', 'Σ')).toBe('Σ');
      });
      
      it('should return either when equal', () => {
        expect(minStrength('Σ', 'Σ')).toBe('Σ');
      });
      
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: COMPOSITE STRENGTH
// ═══════════════════════════════════════════════════════════════════════════════

describe('Composite Strength', () => {
  
  describe('INV-PROOF-04: Dominated by Weakest Link', () => {
    
    it('should return Ε for empty array', () => {
      const composite = computeCompositeStrength([]);
      expect(composite.dominant).toBe('Ε');
    });
    
    it('should return single strength for singleton', () => {
      const composite = computeCompositeStrength(['Λ']);
      expect(composite.dominant).toBe('Λ');
    });
    
    it('should return weakest for multiple strengths', () => {
      expect(computeCompositeStrength(['Ω', 'Λ', 'Σ']).dominant).toBe('Σ');
      expect(computeCompositeStrength(['Ω', 'Ε']).dominant).toBe('Ε');
      expect(computeCompositeStrength(['Λ', 'Δ']).dominant).toBe('Δ');
    });
    
    it('should deduplicate levels', () => {
      const composite = computeCompositeStrength(['Ω', 'Ω', 'Λ', 'Λ']);
      expect(composite.levels).toEqual(['Ω', 'Λ']);
    });
    
    it('should sort levels in descending order', () => {
      const composite = computeCompositeStrength(['Ε', 'Σ', 'Ω']);
      expect(composite.levels).toEqual(['Ω', 'Σ', 'Ε']);
    });
    
    it('should set weight based on dominant', () => {
      const composite = computeCompositeStrength(['Ω', 'Λ', 'Σ']);
      expect(composite.weight).toBe(getStrengthWeight('Σ'));
    });
    
    it('should always be consistent', () => {
      const composite = computeCompositeStrength(['Ω', 'Ε']);
      expect(composite.isConsistent).toBe(true);
    });
    
  });
  
  describe('meetsMinimumStrength', () => {
    
    it('should return true when all meet minimum', () => {
      expect(meetsMinimumStrength(['Ω', 'Λ', 'Σ'], 'Σ')).toBe(true);
      expect(meetsMinimumStrength(['Ω'], 'Ω')).toBe(true);
    });
    
    it('should return false when any below minimum', () => {
      expect(meetsMinimumStrength(['Ω', 'Λ', 'Ε'], 'Σ')).toBe(false);
      expect(meetsMinimumStrength(['Δ'], 'Σ')).toBe(false);
    });
    
    it('should return true for empty array', () => {
      expect(meetsMinimumStrength([], 'Ω')).toBe(true);  // vacuous truth
    });
    
  });
  
  describe('getDominantStrength', () => {
    
    it('should return Ε for empty array', () => {
      expect(getDominantStrength([])).toBe('Ε');
    });
    
    it('should return weakest strength', () => {
      expect(getDominantStrength(['Ω', 'Σ', 'Δ'])).toBe('Δ');
      expect(getDominantStrength(['Λ', 'Λ', 'Λ'])).toBe('Λ');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Validation', () => {
  
  describe('isProofStrength', () => {
    
    it('should return true for valid symbols', () => {
      expect(isProofStrength('Ω')).toBe(true);
      expect(isProofStrength('Λ')).toBe(true);
      expect(isProofStrength('Σ')).toBe(true);
      expect(isProofStrength('Δ')).toBe(true);
      expect(isProofStrength('Ε')).toBe(true);
    });
    
    it('should return false for invalid values', () => {
      expect(isProofStrength('X')).toBe(false);
      expect(isProofStrength('omega')).toBe(false);
      expect(isProofStrength(5)).toBe(false);
      expect(isProofStrength(null)).toBe(false);
      expect(isProofStrength(undefined)).toBe(false);
    });
    
  });
  
  describe('parseProofStrength', () => {
    
    it('should parse valid symbols', () => {
      expect(parseProofStrength('Ω')).toBe('Ω');
      expect(parseProofStrength('Ε')).toBe('Ε');
    });
    
    it('should parse names (case insensitive)', () => {
      expect(parseProofStrength('Formal Impossibility')).toBe('Ω');
      expect(parseProofStrength('Mathematical Proof')).toBe('Λ');
      expect(parseProofStrength('exhaustive enumeration')).toBe('Σ');
    });
    
    it('should parse common aliases', () => {
      expect(parseProofStrength('omega')).toBe('Ω');
      expect(parseProofStrength('lambda')).toBe('Λ');
      expect(parseProofStrength('sigma')).toBe('Σ');
      expect(parseProofStrength('delta')).toBe('Δ');
      expect(parseProofStrength('epsilon')).toBe('Ε');
      expect(parseProofStrength('formal')).toBe('Ω');
      expect(parseProofStrength('statistical')).toBe('Δ');
      expect(parseProofStrength('empirical')).toBe('Ε');
    });
    
    it('should return undefined for invalid values', () => {
      expect(parseProofStrength('invalid')).toBeUndefined();
      expect(parseProofStrength('')).toBeUndefined();
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: ACCESSOR FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Accessor Functions', () => {
  
  describe('getStrengthDefinition', () => {
    
    it('should return definition for valid symbols', () => {
      for (const s of STRENGTH_ORDER) {
        const def = getStrengthDefinition(s);
        expect(def).toBeDefined();
        expect(def?.symbol).toBe(s);
      }
    });
    
    it('should return undefined for invalid symbol', () => {
      expect(getStrengthDefinition('X' as ProofStrength)).toBeUndefined();
    });
    
  });
  
  describe('getStrengthName', () => {
    
    it('should return correct names', () => {
      expect(getStrengthName('Ω')).toBe('Formal Impossibility');
      expect(getStrengthName('Λ')).toBe('Mathematical Proof');
      expect(getStrengthName('Σ')).toBe('Exhaustive Enumeration');
      expect(getStrengthName('Δ')).toBe('Statistical Sampling');
      expect(getStrengthName('Ε')).toBe('Empirical Observation');
    });
    
    it('should return Unknown for invalid symbol', () => {
      expect(getStrengthName('X' as ProofStrength)).toBe('Unknown');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Documentation', () => {
  
  describe('generateStrengthHierarchy', () => {
    
    it('should generate non-empty diagram', () => {
      const diagram = generateStrengthHierarchy();
      expect(diagram.length).toBeGreaterThan(200);
    });
    
    it('should include all symbols', () => {
      const diagram = generateStrengthHierarchy();
      for (const s of STRENGTH_ORDER) {
        expect(diagram).toContain(s);
      }
    });
    
    it('should include header', () => {
      const diagram = generateStrengthHierarchy();
      expect(diagram).toContain('HIERARCHY');
    });
    
  });
  
  describe('generateStrengthTable', () => {
    
    it('should generate markdown table', () => {
      const table = generateStrengthTable();
      expect(table).toContain('|');
      expect(table).toContain('Symbol');
      expect(table).toContain('Weight');
    });
    
    it('should include all strengths', () => {
      const table = generateStrengthTable();
      for (const s of STRENGTH_ORDER) {
        expect(table).toContain(s);
      }
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe('Determinism', () => {
  
  it('should return same order on multiple calls', () => {
    const order1 = [...STRENGTH_ORDER];
    const order2 = [...STRENGTH_ORDER];
    expect(order1).toEqual(order2);
  });
  
  it('should return same composite on multiple calls', () => {
    const input: ProofStrength[] = ['Ω', 'Σ', 'Ε'];
    const composite1 = computeCompositeStrength(input);
    const composite2 = computeCompositeStrength(input);
    expect(composite1).toEqual(composite2);
  });
  
});
