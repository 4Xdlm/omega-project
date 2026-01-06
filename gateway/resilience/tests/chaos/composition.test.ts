/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Chaos Algebra - Composition Tests
 * 
 * Phase 23 - Sprint 23.0
 * 
 * Tests for algebraic composition of perturbations.
 * Proves: Closure, Associativity, Identity, Boundedness
 * 
 * INVARIANT: INV-CHAOS-01 - Fermeture garantie pour toute composition
 */

import { describe, it, expect } from 'vitest';
import {
  sequence,
  parallel,
  choice,
  repeat,
  conditional,
  identity,
  isIdentity,
  sequenceAll,
  parallelAll,
  getBounds,
  verifyClosure,
  verifyAssociativity,
  verifyIdentity,
  verifyBoundedness,
  depth,
  complexity,
  flatten,
} from '../../src/chaos/composition.js';
import {
  perturbation,
  clockSkew,
  networkDelay,
  networkFailure,
} from '../../src/chaos/factory.js';
import {
  Perturbation,
  ComposedPerturbation,
  isComposedPerturbation,
  isPerturbation,
  durationMs,
  magnitude,
  CompositionOperator,
} from '../../src/chaos/types.js';

describe('Chaos Composition Algebra', () => {
  // Create test perturbations
  const p1 = clockSkew(100, 1);
  const p2 = networkDelay(50, 0.5, 2);
  const p3 = networkFailure(0.1, 3);

  describe('sequence', () => {
    it('should compose two perturbations in sequence', () => {
      const composed = sequence(p1, p2);
      
      expect(isComposedPerturbation(composed)).toBe(true);
      expect(composed.operator).toBe(CompositionOperator.SEQUENCE);
      expect(composed.operands.length).toBe(2);
    });

    it('should calculate correct bounds for sequence', () => {
      const composed = sequence(p1, p2);
      const bounds = composed.bounds;
      
      // Total duration = p1.duration + gap + p2.duration
      expect(bounds.totalDuration).toBe(p1.temporal.duration + p2.temporal.duration);
      expect(bounds.maxMagnitude).toBe(Math.max(p1.magnitude, p2.magnitude));
    });

    it('should include gap in sequence bounds', () => {
      const gap = durationMs(100);
      const composed = sequence(p1, p2, gap);
      
      expect(composed.bounds.totalDuration).toBe(
        p1.temporal.duration + gap + p2.temporal.duration
      );
    });

    it('should preserve operand order', () => {
      const composed = sequence(p1, p2);
      
      expect(composed.operands[0]).toBe(p1);
      expect(composed.operands[1]).toBe(p2);
    });
  });

  describe('parallel', () => {
    it('should compose two perturbations in parallel', () => {
      const composed = parallel(p1, p2);
      
      expect(isComposedPerturbation(composed)).toBe(true);
      expect(composed.operator).toBe(CompositionOperator.PARALLEL);
    });

    it('should calculate correct bounds for parallel', () => {
      const composed = parallel(p1, p2);
      const bounds = composed.bounds;
      
      // Duration = max of durations
      expect(bounds.totalDuration).toBe(
        Math.max(p1.temporal.duration, p2.temporal.duration)
      );
      // Magnitude can be additive (capped at 1)
      expect(bounds.maxMagnitude).toBeLessThanOrEqual(1);
    });

    it('should combine domains from both perturbations', () => {
      const composed = parallel(p1, p2);
      
      expect(composed.bounds.domains.has(p1.domain)).toBe(true);
      expect(composed.bounds.domains.has(p2.domain)).toBe(true);
    });
  });

  describe('choice', () => {
    it('should create a probabilistic choice', () => {
      const composed = choice([p1, p2, p3], [0.5, 0.3, 0.2]);
      
      expect(isComposedPerturbation(composed)).toBe(true);
      expect(composed.operator).toBe(CompositionOperator.CHOICE);
      expect(composed.operands.length).toBe(3);
    });

    it('should reject weights that do not sum to 1', () => {
      expect(() => choice([p1, p2], [0.5, 0.4])).toThrow('Weights must sum to 1');
      expect(() => choice([p1, p2], [0.6, 0.6])).toThrow('Weights must sum to 1');
    });

    it('should reject mismatched lengths', () => {
      expect(() => choice([p1, p2], [1.0])).toThrow('Weights must match perturbations length');
    });

    it('should reject empty perturbations', () => {
      expect(() => choice([], [])).toThrow('Choice requires at least one perturbation');
    });

    it('should calculate bounds as max of options', () => {
      const composed = choice([p1, p2], [0.5, 0.5]);
      
      expect(composed.bounds.totalDuration).toBe(
        Math.max(p1.temporal.duration, p2.temporal.duration)
      );
      expect(composed.bounds.maxMagnitude).toBe(
        Math.max(p1.magnitude, p2.magnitude)
      );
    });
  });

  describe('repeat', () => {
    it('should create a repeated perturbation', () => {
      const composed = repeat(p1, 5);
      
      expect(isComposedPerturbation(composed)).toBe(true);
      expect(composed.operator).toBe(CompositionOperator.REPEAT);
    });

    it('should calculate correct bounds for repeat', () => {
      const count = 5;
      const interval = durationMs(50);
      const composed = repeat(p1, count, interval);
      
      // Total = count * duration + (count - 1) * interval
      expect(composed.bounds.totalDuration).toBe(
        count * p1.temporal.duration + (count - 1) * interval
      );
    });

    it('should preserve magnitude (no increase)', () => {
      const composed = repeat(p1, 10);
      
      expect(composed.bounds.maxMagnitude).toBe(p1.magnitude);
    });

    it('should reject count < 1', () => {
      expect(() => repeat(p1, 0)).toThrow('Repeat count must be at least 1');
      expect(() => repeat(p1, -1)).toThrow('Repeat count must be at least 1');
    });
  });

  describe('conditional', () => {
    it('should create a conditional perturbation', () => {
      const composed = conditional(p1, 'module.healthy == true');
      
      expect(isComposedPerturbation(composed)).toBe(true);
      expect(composed.operator).toBe(CompositionOperator.CONDITIONAL);
    });

    it('should reject empty condition', () => {
      expect(() => conditional(p1, '')).toThrow('Condition cannot be empty');
      expect(() => conditional(p1, '   ')).toThrow('Condition cannot be empty');
    });

    it('should have same bounds as underlying', () => {
      const composed = conditional(p1, 'true');
      
      expect(composed.bounds.totalDuration).toBe(p1.temporal.duration);
      expect(composed.bounds.maxMagnitude).toBe(p1.magnitude);
    });
  });

  describe('identity', () => {
    it('should create an identity perturbation', () => {
      const e = identity();
      
      expect(isPerturbation(e)).toBe(true);
      expect(e.magnitude).toBe(0);
      expect(e.target.probability).toBe(0);
    });

    it('should be detected by isIdentity', () => {
      const e = identity();
      
      expect(isIdentity(e)).toBe(true);
      expect(isIdentity(p1)).toBe(false);
    });
  });

  describe('N-ary helpers', () => {
    describe('sequenceAll', () => {
      it('should compose multiple perturbations in sequence', () => {
        const composed = sequenceAll([p1, p2, p3]);
        
        expect(isComposedPerturbation(composed)).toBe(true);
        expect(flatten(composed).length).toBe(3);
      });

      it('should reject empty array', () => {
        expect(() => sequenceAll([])).toThrow('sequenceAll requires at least one perturbation');
      });

      it('should wrap single perturbation', () => {
        const composed = sequenceAll([p1]);
        
        expect(isComposedPerturbation(composed)).toBe(true);
      });
    });

    describe('parallelAll', () => {
      it('should compose multiple perturbations in parallel', () => {
        const composed = parallelAll([p1, p2, p3]);
        
        expect(isComposedPerturbation(composed)).toBe(true);
        expect(flatten(composed).length).toBe(3);
      });
    });
  });

  describe('Algebraic Properties - INV-CHAOS-01', () => {
    describe('Closure', () => {
      it('should satisfy closure for sequence', () => {
        expect(verifyClosure(p1, p2, sequence)).toBe(true);
      });

      it('should satisfy closure for parallel', () => {
        expect(verifyClosure(p1, p2, parallel)).toBe(true);
      });

      it('should satisfy closure for nested compositions', () => {
        const c1 = sequence(p1, p2);
        const c2 = parallel(p2, p3);
        
        expect(verifyClosure(c1, c2, sequence)).toBe(true);
        expect(verifyClosure(c1, c2, parallel)).toBe(true);
      });
    });

    describe('Associativity', () => {
      it('should satisfy associativity for sequence', () => {
        expect(verifyAssociativity(p1, p2, p3)).toBe(true);
      });

      it('should satisfy associativity structurally', () => {
        const leftAssoc = sequence(sequence(p1, p2), p3);
        const rightAssoc = sequence(p1, sequence(p2, p3));
        
        // Bounds should be equal
        expect(leftAssoc.bounds.totalDuration).toBe(rightAssoc.bounds.totalDuration);
        expect(leftAssoc.bounds.maxMagnitude).toBe(rightAssoc.bounds.maxMagnitude);
      });
    });

    describe('Identity', () => {
      it('should satisfy identity property', () => {
        expect(verifyIdentity(p1)).toBe(true);
      });

      it('should preserve bounds with identity composition', () => {
        const e = identity();
        const withIdentity = sequence(e, p1);
        
        expect(withIdentity.bounds.maxMagnitude).toBe(p1.magnitude);
      });
    });

    describe('Boundedness - INV-CHAOS-02', () => {
      it('should verify boundedness for single perturbation', () => {
        expect(verifyBoundedness(p1)).toBe(true);
        expect(verifyBoundedness(p2)).toBe(true);
      });

      it('should verify boundedness for composed perturbation', () => {
        const composed = parallel(p1, p2);
        
        expect(verifyBoundedness(composed)).toBe(true);
      });

      it('should verify custom bound', () => {
        expect(verifyBoundedness(p1, magnitude(0.5))).toBe(true);
        expect(verifyBoundedness(p1, magnitude(0.001))).toBe(false);
      });
    });
  });

  describe('Depth and Complexity', () => {
    it('should calculate depth = 1 for base perturbation', () => {
      expect(depth(p1)).toBe(1);
    });

    it('should calculate depth for simple composition', () => {
      const composed = sequence(p1, p2);
      
      expect(depth(composed)).toBe(2);
    });

    it('should calculate depth for nested composition', () => {
      const inner = sequence(p1, p2);
      const outer = parallel(inner, p3);
      
      expect(depth(outer)).toBe(3);
    });

    it('should calculate complexity = 1 for base perturbation', () => {
      expect(complexity(p1)).toBe(1);
    });

    it('should calculate complexity for composition', () => {
      const composed = sequence(p1, p2);
      
      expect(complexity(composed)).toBe(2);
    });

    it('should calculate complexity for nested composition', () => {
      const inner = parallel(p1, p2);
      const outer = sequence(inner, p3);
      
      expect(complexity(outer)).toBe(3);
    });
  });

  describe('Flatten', () => {
    it('should flatten base perturbation to single element', () => {
      expect(flatten(p1)).toEqual([p1]);
    });

    it('should flatten composition to all base perturbations', () => {
      const composed = sequence(p1, parallel(p2, p3));
      const flattened = flatten(composed);
      
      expect(flattened.length).toBe(3);
      expect(flattened).toContain(p1);
      expect(flattened).toContain(p2);
      expect(flattened).toContain(p3);
    });

    it('should preserve order in sequential flatten', () => {
      const composed = sequence(p1, sequence(p2, p3));
      const flattened = flatten(composed);
      
      expect(flattened[0]).toBe(p1);
      expect(flattened[1]).toBe(p2);
      expect(flattened[2]).toBe(p3);
    });
  });

  describe('getBounds', () => {
    it('should return bounds for base perturbation', () => {
      const bounds = getBounds(p1);
      
      expect(bounds.maxMagnitude).toBe(p1.magnitude);
      expect(bounds.totalDuration).toBe(p1.temporal.duration);
      expect(bounds.domains.has(p1.domain)).toBe(true);
      expect(bounds.effects.has(p1.effect)).toBe(true);
    });

    it('should return bounds for composed perturbation', () => {
      const composed = sequence(p1, p2);
      const bounds = getBounds(composed);
      
      expect(bounds).toBe(composed.bounds);
    });
  });
});

describe('Composition Determinism - INV-CHAOS-03', () => {
  it('should generate same ID for same composition', () => {
    const p1 = clockSkew(100, 1);
    const p2 = networkDelay(50, 0.5, 2);
    
    const c1 = sequence(p1, p2);
    const c2 = sequence(p1, p2);
    
    // IDs are deterministically generated from operand IDs
    expect(c1.id).toBe(c2.id);
  });

  it('should generate different IDs for different compositions', () => {
    const p1 = clockSkew(100, 1);
    const p2 = networkDelay(50, 0.5, 2);
    
    const seq = sequence(p1, p2);
    const par = parallel(p1, p2);
    
    expect(seq.id).not.toBe(par.id);
  });
});
