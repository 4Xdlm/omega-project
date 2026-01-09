/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — NEGATIVE MODULE TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module tests/negative.test
 * @version 2.0.0
 * 
 * INVARIANTS TESTED:
 * - INV-NEG-01: Every negative bound has explicit condition
 * - INV-NEG-02: Negative score is computed deterministically
 * - INV-NEG-03: Violations are tracked with evidence
 * - INV-NEG-04: Negative space is immutable after definition
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  SEVERITY_WEIGHTS,
  SEVERITY_ORDER,
  generateBoundId,
  resetBoundCounter,
  createNegativeBound,
  createNegativeSpace,
  addBound,
  recordViolation,
  computeNegativeScore,
  computeMaxPotentialScore,
  getViolationRatio,
  getBoundsByClass,
  getBoundsBySeverity,
  getBoundsByTag,
  getViolatedBounds,
  getUnviolatedBounds,
  getViolationsForBound,
  countBounds,
  countViolations,
  countViolatedBounds,
  hasCatastrophicViolation,
  hasCriticalOrWorse,
  getHighestViolationSeverity,
  getBoundsDistribution,
  isClean,
  isComprehensive,
  isNegativeSeverity,
  isValidBoundId,
  formatBound,
  formatViolation,
  generateNegativeSpaceSummary,
  type NegativeBound,
  type NegativeSpace,
  type CreateBoundInput
} from '../negative/space.js';

import { IMPOSSIBILITY_CLASSES, MAX_NEGATIVE_SCORE } from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createTestBoundInput(overrides: Partial<CreateBoundInput> = {}): CreateBoundInput {
  return {
    invariantId: 'INV-TEST-001',
    description: 'Must never produce null',
    formalCondition: '∀x: f(x) ≠ null',
    impossibilityClass: 'CANNOT_CORRUPT',
    severity: 'CRITICAL',
    impactScore: 7,
    justification: 'Null output would crash downstream systems',
    ...overrides
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: SEVERITY CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Severity Constants', () => {
  
  it('SEVERITY_WEIGHTS should be frozen', () => {
    expect(Object.isFrozen(SEVERITY_WEIGHTS)).toBe(true);
  });
  
  it('SEVERITY_ORDER should be frozen', () => {
    expect(Object.isFrozen(SEVERITY_ORDER)).toBe(true);
  });
  
  it('should have 5 severity levels', () => {
    expect(SEVERITY_ORDER).toHaveLength(5);
  });
  
  it('should have decreasing weights in order', () => {
    let prevWeight = Infinity;
    for (const severity of SEVERITY_ORDER) {
      expect(SEVERITY_WEIGHTS[severity]).toBeLessThan(prevWeight);
      prevWeight = SEVERITY_WEIGHTS[severity];
    }
  });
  
  it('CATASTROPHIC should have highest weight', () => {
    expect(SEVERITY_WEIGHTS['CATASTROPHIC']).toBe(5.0);
  });
  
  it('MINOR should have lowest weight', () => {
    expect(SEVERITY_WEIGHTS['MINOR']).toBe(1.0);
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: BOUND CREATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Bound Creation', () => {
  
  beforeEach(() => {
    resetBoundCounter();
  });
  
  describe('generateBoundId', () => {
    
    it('should generate unique IDs', () => {
      const id1 = generateBoundId('INV-TEST-001');
      const id2 = generateBoundId('INV-TEST-001');
      expect(id1).not.toBe(id2);
    });
    
    it('should follow pattern NEG-{invariantId}-NNN', () => {
      const id = generateBoundId('INV-TEST-001');
      expect(id).toMatch(/^NEG-INV-TEST-001-\d{3}$/);
    });
    
    it('should reset with resetBoundCounter', () => {
      generateBoundId('INV-TEST-001');
      resetBoundCounter();
      const id = generateBoundId('INV-TEST-001');
      expect(id).toBe('NEG-INV-TEST-001-001');
    });
    
  });
  
  describe('createNegativeBound', () => {
    
    it('INV-NEG-01: should create bound with all fields', () => {
      const bound = createNegativeBound(createTestBoundInput());
      
      expect(bound.id).toBeDefined();
      expect(bound.invariantId).toBe('INV-TEST-001');
      expect(bound.description).toBeDefined();
      expect(bound.formalCondition).toBeDefined();
      expect(bound.impossibilityClass).toBeDefined();
      expect(bound.severity).toBeDefined();
      expect(bound.impactScore).toBeDefined();
      expect(bound.justification).toBeDefined();
    });
    
    it('INV-NEG-04: should freeze the bound', () => {
      const bound = createNegativeBound(createTestBoundInput());
      expect(Object.isFrozen(bound)).toBe(true);
    });
    
    it('should set timestamp', () => {
      const bound = createNegativeBound(createTestBoundInput());
      expect(bound.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
    
    it('should throw for invalid impact score (< 1)', () => {
      expect(() => {
        createNegativeBound(createTestBoundInput({ impactScore: 0 }));
      }).toThrow('Impact score must be between 1 and 10');
    });
    
    it('should throw for invalid impact score (> 10)', () => {
      expect(() => {
        createNegativeBound(createTestBoundInput({ impactScore: 11 }));
      }).toThrow('Impact score must be between 1 and 10');
    });
    
    it('should throw for invalid impossibility class', () => {
      expect(() => {
        createNegativeBound(createTestBoundInput({ 
          impossibilityClass: 'INVALID' as any 
        }));
      }).toThrow('Invalid impossibility class');
    });
    
    it('should support optional fields', () => {
      const bound = createNegativeBound(createTestBoundInput({
        violationExample: 'f(null) = null',
        tags: ['safety', 'critical']
      }));
      
      expect(bound.violationExample).toBe('f(null) = null');
      expect(bound.tags).toContain('safety');
    });
    
    it('should default tags to empty array', () => {
      const bound = createNegativeBound(createTestBoundInput());
      expect(bound.tags).toHaveLength(0);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: NEGATIVE SPACE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Negative Space', () => {
  
  beforeEach(() => {
    resetBoundCounter();
  });
  
  describe('createNegativeSpace', () => {
    
    it('should create empty space', () => {
      const space = createNegativeSpace('INV-TEST-001');
      
      expect(space.invariantId).toBe('INV-TEST-001');
      expect(space.bounds).toHaveLength(0);
      expect(space.violations).toHaveLength(0);
      expect(space.negativeScore).toBe(0);
      expect(space.isViolated).toBe(false);
    });
    
    it('INV-NEG-04: should freeze the space', () => {
      const space = createNegativeSpace('INV-TEST-001');
      expect(Object.isFrozen(space)).toBe(true);
    });
    
    it('should set timestamps', () => {
      const space = createNegativeSpace('INV-TEST-001');
      expect(space.createdAt).toBeDefined();
      expect(space.updatedAt).toBeDefined();
    });
    
  });
  
  describe('addBound', () => {
    
    it('should add bound to space', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput());
      
      space = addBound(space, bound);
      
      expect(space.bounds).toHaveLength(1);
      expect(space.bounds[0].id).toBe(bound.id);
    });
    
    it('should preserve existing bounds', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound1 = createNegativeBound(createTestBoundInput());
      const bound2 = createNegativeBound(createTestBoundInput({
        description: 'Another bound'
      }));
      
      space = addBound(space, bound1);
      space = addBound(space, bound2);
      
      expect(space.bounds).toHaveLength(2);
    });
    
    it('should throw for mismatched invariant ID', () => {
      const space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput({
        invariantId: 'INV-OTHER-001'
      }));
      
      expect(() => addBound(space, bound)).toThrow('does not match');
    });
    
    it('should throw for duplicate bound ID', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput());
      
      space = addBound(space, bound);
      
      // Try to add same bound again
      expect(() => addBound(space, bound)).toThrow('Duplicate bound ID');
    });
    
    it('should update timestamp', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const originalUpdate = space.updatedAt;
      
      // Small delay to ensure different timestamp
      const bound = createNegativeBound(createTestBoundInput());
      space = addBound(space, bound);
      
      expect(space.updatedAt).toBeDefined();
    });
    
  });
  
  describe('recordViolation', () => {
    
    it('INV-NEG-03: should record violation with evidence', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput());
      space = addBound(space, bound);
      
      space = recordViolation(
        space,
        bound.id,
        'Null was produced',
        'abc123hash',
        'input: null',
        'output: null'
      );
      
      expect(space.violations).toHaveLength(1);
      expect(space.violations[0].boundId).toBe(bound.id);
      expect(space.violations[0].evidenceHash).toBe('abc123hash');
    });
    
    it('should set isViolated to true', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput());
      space = addBound(space, bound);
      
      expect(space.isViolated).toBe(false);
      
      space = recordViolation(space, bound.id, 'Violation', 'hash');
      
      expect(space.isViolated).toBe(true);
    });
    
    it('should update negative score', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput());
      space = addBound(space, bound);
      
      expect(space.negativeScore).toBe(0);
      
      space = recordViolation(space, bound.id, 'Violation', 'hash');
      
      expect(space.negativeScore).toBeGreaterThan(0);
    });
    
    it('should throw for unknown bound ID', () => {
      const space = createNegativeSpace('INV-TEST-001');
      
      expect(() => {
        recordViolation(space, 'UNKNOWN', 'Violation', 'hash');
      }).toThrow('Unknown bound ID');
    });
    
    it('should inherit severity from bound', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput({
        severity: 'CATASTROPHIC'
      }));
      space = addBound(space, bound);
      
      space = recordViolation(space, bound.id, 'Violation', 'hash');
      
      expect(space.violations[0].severity).toBe('CATASTROPHIC');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: SCORE COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Score Computation', () => {
  
  beforeEach(() => {
    resetBoundCounter();
  });
  
  describe('INV-NEG-02: computeNegativeScore', () => {
    
    it('should return 0 for no violations', () => {
      expect(computeNegativeScore([], [])).toBe(0);
    });
    
    it('should compute score from violations', () => {
      const bound = createNegativeBound(createTestBoundInput({
        impactScore: 5,
        severity: 'CRITICAL' // weight 4.0
      }));
      
      const violation = {
        boundId: bound.id,
        detectedAt: new Date().toISOString(),
        description: 'Test',
        evidenceHash: 'hash',
        severity: bound.severity,
        impactScore: bound.impactScore
      };
      
      const score = computeNegativeScore([bound], [violation]);
      
      // 5 * 4.0 * impossibilityWeight
      expect(score).toBeGreaterThan(0);
    });
    
    it('should be deterministic', () => {
      const bound = createNegativeBound(createTestBoundInput());
      const violation = {
        boundId: bound.id,
        detectedAt: new Date().toISOString(),
        description: 'Test',
        evidenceHash: 'hash',
        severity: bound.severity,
        impactScore: bound.impactScore
      };
      
      const score1 = computeNegativeScore([bound], [violation]);
      const score2 = computeNegativeScore([bound], [violation]);
      
      expect(score1).toBe(score2);
    });
    
    it('should cap at MAX_NEGATIVE_SCORE', () => {
      const bounds: NegativeBound[] = [];
      const violations: any[] = [];
      
      // Create many high-impact violations
      for (let i = 0; i < 10; i++) {
        const bound = createNegativeBound(createTestBoundInput({
          impactScore: 10,
          severity: 'CATASTROPHIC'
        }));
        bounds.push(bound);
        violations.push({
          boundId: bound.id,
          detectedAt: new Date().toISOString(),
          description: 'Test',
          evidenceHash: `hash${i}`,
          severity: bound.severity,
          impactScore: bound.impactScore
        });
      }
      
      const score = computeNegativeScore(bounds, violations);
      expect(score).toBeLessThanOrEqual(MAX_NEGATIVE_SCORE);
    });
    
  });
  
  describe('computeMaxPotentialScore', () => {
    
    it('should compute potential max score', () => {
      const bound = createNegativeBound(createTestBoundInput({
        impactScore: 10,
        severity: 'CATASTROPHIC'
      }));
      
      const maxScore = computeMaxPotentialScore([bound]);
      expect(maxScore).toBeGreaterThan(0);
    });
    
    it('should return 0 for empty bounds', () => {
      expect(computeMaxPotentialScore([])).toBe(0);
    });
    
  });
  
  describe('getViolationRatio', () => {
    
    it('should return 0 for empty space', () => {
      const space = createNegativeSpace('INV-TEST-001');
      expect(getViolationRatio(space)).toBe(0);
    });
    
    it('should calculate ratio correctly', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound1 = createNegativeBound(createTestBoundInput());
      const bound2 = createNegativeBound(createTestBoundInput());
      
      space = addBound(space, bound1);
      space = addBound(space, bound2);
      space = recordViolation(space, bound1.id, 'V', 'h');
      
      expect(getViolationRatio(space)).toBe(0.5);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Queries', () => {
  
  let space: NegativeSpace;
  let bound1: NegativeBound;
  let bound2: NegativeBound;
  
  beforeEach(() => {
    resetBoundCounter();
    space = createNegativeSpace('INV-TEST-001');
    
    bound1 = createNegativeBound(createTestBoundInput({
      impossibilityClass: 'CANNOT_CORRUPT',
      severity: 'CRITICAL',
      tags: ['safety']
    }));
    
    bound2 = createNegativeBound(createTestBoundInput({
      impossibilityClass: 'CANNOT_LEAK',
      severity: 'MODERATE',
      tags: ['performance']
    }));
    
    space = addBound(space, bound1);
    space = addBound(space, bound2);
  });
  
  describe('getBoundsByClass', () => {
    
    it('should filter by impossibility class', () => {
      const results = getBoundsByClass(space, 'CANNOT_CORRUPT');
      expect(results).toHaveLength(1);
      expect(results[0].impossibilityClass).toBe('CANNOT_CORRUPT');
    });
    
  });
  
  describe('getBoundsBySeverity', () => {
    
    it('should filter by severity', () => {
      const results = getBoundsBySeverity(space, 'CRITICAL');
      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('CRITICAL');
    });
    
  });
  
  describe('getBoundsByTag', () => {
    
    it('should filter by tag', () => {
      const results = getBoundsByTag(space, 'safety');
      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('safety');
    });
    
  });
  
  describe('getViolatedBounds', () => {
    
    it('should return violated bounds', () => {
      space = recordViolation(space, bound1.id, 'V', 'h');
      
      const violated = getViolatedBounds(space);
      expect(violated).toHaveLength(1);
      expect(violated[0].id).toBe(bound1.id);
    });
    
  });
  
  describe('getUnviolatedBounds', () => {
    
    it('should return unviolated bounds', () => {
      space = recordViolation(space, bound1.id, 'V', 'h');
      
      const unviolated = getUnviolatedBounds(space);
      expect(unviolated).toHaveLength(1);
      expect(unviolated[0].id).toBe(bound2.id);
    });
    
  });
  
  describe('getViolationsForBound', () => {
    
    it('should return violations for specific bound', () => {
      space = recordViolation(space, bound1.id, 'V1', 'h1');
      space = recordViolation(space, bound1.id, 'V2', 'h2');
      
      const violations = getViolationsForBound(space, bound1.id);
      expect(violations).toHaveLength(2);
    });
    
  });
  
  describe('Count functions', () => {
    
    it('countBounds should return bound count', () => {
      expect(countBounds(space)).toBe(2);
    });
    
    it('countViolations should return violation count', () => {
      space = recordViolation(space, bound1.id, 'V', 'h');
      expect(countViolations(space)).toBe(1);
    });
    
    it('countViolatedBounds should return unique violated bounds', () => {
      space = recordViolation(space, bound1.id, 'V1', 'h1');
      space = recordViolation(space, bound1.id, 'V2', 'h2');
      
      expect(countViolatedBounds(space)).toBe(1);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Analysis', () => {
  
  beforeEach(() => {
    resetBoundCounter();
  });
  
  describe('hasCatastrophicViolation', () => {
    
    it('should return false for clean space', () => {
      const space = createNegativeSpace('INV-TEST-001');
      expect(hasCatastrophicViolation(space)).toBe(false);
    });
    
    it('should return true for catastrophic violation', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput({
        severity: 'CATASTROPHIC'
      }));
      space = addBound(space, bound);
      space = recordViolation(space, bound.id, 'V', 'h');
      
      expect(hasCatastrophicViolation(space)).toBe(true);
    });
    
  });
  
  describe('hasCriticalOrWorse', () => {
    
    it('should return true for CRITICAL', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput({
        severity: 'CRITICAL'
      }));
      space = addBound(space, bound);
      space = recordViolation(space, bound.id, 'V', 'h');
      
      expect(hasCriticalOrWorse(space)).toBe(true);
    });
    
    it('should return false for only MODERATE', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput({
        severity: 'MODERATE'
      }));
      space = addBound(space, bound);
      space = recordViolation(space, bound.id, 'V', 'h');
      
      expect(hasCriticalOrWorse(space)).toBe(false);
    });
    
  });
  
  describe('getHighestViolationSeverity', () => {
    
    it('should return null for no violations', () => {
      const space = createNegativeSpace('INV-TEST-001');
      expect(getHighestViolationSeverity(space)).toBeNull();
    });
    
    it('should return highest severity', () => {
      let space = createNegativeSpace('INV-TEST-001');
      
      const bound1 = createNegativeBound(createTestBoundInput({ severity: 'MINOR' }));
      const bound2 = createNegativeBound(createTestBoundInput({ severity: 'CRITICAL' }));
      
      space = addBound(space, bound1);
      space = addBound(space, bound2);
      space = recordViolation(space, bound1.id, 'V', 'h');
      space = recordViolation(space, bound2.id, 'V', 'h');
      
      expect(getHighestViolationSeverity(space)).toBe('CRITICAL');
    });
    
  });
  
  describe('getBoundsDistribution', () => {
    
    it('should return distribution by class', () => {
      let space = createNegativeSpace('INV-TEST-001');
      
      const bound1 = createNegativeBound(createTestBoundInput({
        impossibilityClass: 'CANNOT_CORRUPT'
      }));
      const bound2 = createNegativeBound(createTestBoundInput({
        impossibilityClass: 'CANNOT_CORRUPT'
      }));
      const bound3 = createNegativeBound(createTestBoundInput({
        impossibilityClass: 'CANNOT_LEAK'
      }));
      
      space = addBound(space, bound1);
      space = addBound(space, bound2);
      space = addBound(space, bound3);
      
      const dist = getBoundsDistribution(space);
      expect(dist.get('CANNOT_CORRUPT')).toBe(2);
      expect(dist.get('CANNOT_LEAK')).toBe(1);
    });
    
  });
  
  describe('isClean', () => {
    
    it('should return true for no violations', () => {
      const space = createNegativeSpace('INV-TEST-001');
      expect(isClean(space)).toBe(true);
    });
    
    it('should return false after violation', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput());
      space = addBound(space, bound);
      space = recordViolation(space, bound.id, 'V', 'h');
      
      expect(isClean(space)).toBe(false);
    });
    
  });
  
  describe('isComprehensive', () => {
    
    it('should return false for few classes', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput());
      space = addBound(space, bound);
      
      expect(isComprehensive(space)).toBe(false);
    });
    
    it('should return true for multiple classes', () => {
      let space = createNegativeSpace('INV-TEST-001');
      
      const classes = ['CANNOT_CORRUPT', 'CANNOT_LEAK', 'CANNOT_DEADLOCK'] as const;
      
      for (const cls of classes) {
        const bound = createNegativeBound(createTestBoundInput({
          impossibilityClass: cls
        }));
        space = addBound(space, bound);
      }
      
      expect(isComprehensive(space)).toBe(true);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Type Guards', () => {
  
  describe('isNegativeSeverity', () => {
    
    it('should return true for valid severities', () => {
      expect(isNegativeSeverity('CATASTROPHIC')).toBe(true);
      expect(isNegativeSeverity('CRITICAL')).toBe(true);
      expect(isNegativeSeverity('MINOR')).toBe(true);
    });
    
    it('should return false for invalid values', () => {
      expect(isNegativeSeverity('INVALID')).toBe(false);
      expect(isNegativeSeverity(123)).toBe(false);
    });
    
  });
  
  describe('isValidBoundId', () => {
    
    it('should return true for valid format', () => {
      expect(isValidBoundId('NEG-INV-TEST-001-001')).toBe(true);
    });
    
    it('should return false for invalid format', () => {
      expect(isValidBoundId('INVALID')).toBe(false);
      expect(isValidBoundId('NEG-001')).toBe(false);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Documentation', () => {
  
  beforeEach(() => {
    resetBoundCounter();
  });
  
  describe('formatBound', () => {
    
    it('should format bound as string', () => {
      const bound = createNegativeBound(createTestBoundInput());
      const formatted = formatBound(bound);
      
      expect(formatted).toContain('CRITICAL');
      expect(formatted).toContain('Description:');
      expect(formatted).toContain('Impact:');
    });
    
  });
  
  describe('formatViolation', () => {
    
    it('should format violation as string', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput());
      space = addBound(space, bound);
      space = recordViolation(space, bound.id, 'Test violation', 'hash123');
      
      const formatted = formatViolation(space.violations[0]);
      
      expect(formatted).toContain('Violation');
      expect(formatted).toContain('Evidence:');
    });
    
  });
  
  describe('generateNegativeSpaceSummary', () => {
    
    it('should generate summary', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput());
      space = addBound(space, bound);
      
      const summary = generateNegativeSpaceSummary(space);
      
      expect(summary).toContain('INV-TEST-001');
      expect(summary).toContain('Bounds: 1');
      expect(summary).toContain('CLEAN');
    });
    
    it('should show violated status', () => {
      let space = createNegativeSpace('INV-TEST-001');
      const bound = createNegativeBound(createTestBoundInput());
      space = addBound(space, bound);
      space = recordViolation(space, bound.id, 'V', 'h');
      
      const summary = generateNegativeSpaceSummary(space);
      expect(summary).toContain('VIOLATED');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe('Determinism', () => {
  
  beforeEach(() => {
    resetBoundCounter();
  });
  
  it('bound creation should be consistent', () => {
    const input = createTestBoundInput();
    const bound1 = createNegativeBound(input);
    
    resetBoundCounter();
    const bound2 = createNegativeBound(input);
    
    expect(bound1.id).toBe(bound2.id);
    expect(bound1.description).toBe(bound2.description);
    expect(bound1.impactScore).toBe(bound2.impactScore);
  });
  
  it('score computation should be deterministic', () => {
    const bound = createNegativeBound(createTestBoundInput());
    const violation = {
      boundId: bound.id,
      detectedAt: '2025-01-01T00:00:00Z',
      description: 'Test',
      evidenceHash: 'hash',
      severity: bound.severity,
      impactScore: bound.impactScore
    };
    
    for (let i = 0; i < 10; i++) {
      const score = computeNegativeScore([bound], [violation]);
      expect(score).toBe(computeNegativeScore([bound], [violation]));
    }
  });
  
});
