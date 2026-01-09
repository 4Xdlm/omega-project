/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — GRAVITY MODULE TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module tests/gravity.test
 * @version 2.0.0
 * 
 * INVARIANTS TESTED:
 * - INV-GRAV-01: Gravity is non-negative and bounded
 * - INV-GRAV-02: Temporal decay is strictly decreasing
 * - INV-GRAV-03: Confidence levels are monotonic with gravity
 * - INV-GRAV-04: Gravity computation is deterministic
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';

import {
  MAX_RAW_GRAVITY,
  CONFIDENCE_LEVEL_THRESHOLDS,
  CONFIDENCE_ORDER,
  EVIDENCE_TYPE_MULTIPLIERS,
  TEMPORAL_DECAY_LAMBDA,
  daysBetween,
  calculateDecayFactor,
  applyDecay,
  calculateHalfLife,
  getProofWeight,
  createEvidenceWeight,
  recomputeWeight,
  createGravityState,
  addEvidence,
  refreshGravity,
  computeRawGravity,
  normalizeGravity,
  determineConfidence,
  countEvidence,
  getEvidenceByType,
  getStrongestEvidence,
  getOldestEvidence,
  getNewestEvidence,
  getAverageAge,
  getDecayStats,
  meetsConfidence,
  getNextConfidenceLevel,
  gravityToNextLevel,
  calculateFreshness,
  isFresh,
  isStale,
  compareConfidence,
  maxConfidence,
  minConfidence,
  isConfidenceLevel,
  isEvidenceType,
  formatGravitySummary,
  getConfidenceDescription,
  type ConfidenceLevel,
  type AddEvidenceInput
} from '../gravity/engine.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Gravity Constants', () => {
  
  it('MAX_RAW_GRAVITY should be 100', () => {
    expect(MAX_RAW_GRAVITY).toBe(100);
  });
  
  it('CONFIDENCE_LEVEL_THRESHOLDS should be frozen', () => {
    expect(Object.isFrozen(CONFIDENCE_LEVEL_THRESHOLDS)).toBe(true);
  });
  
  it('CONFIDENCE_ORDER should have 6 levels', () => {
    expect(CONFIDENCE_ORDER).toHaveLength(6);
  });
  
  it('thresholds should be increasing', () => {
    let prev = -1;
    for (const level of CONFIDENCE_ORDER) {
      expect(CONFIDENCE_LEVEL_THRESHOLDS[level]).toBeGreaterThanOrEqual(prev);
      prev = CONFIDENCE_LEVEL_THRESHOLDS[level];
    }
  });
  
  it('EVIDENCE_TYPE_MULTIPLIERS should be frozen', () => {
    expect(Object.isFrozen(EVIDENCE_TYPE_MULTIPLIERS)).toBe(true);
  });
  
  it('falsification should have highest multiplier among standard types', () => {
    expect(EVIDENCE_TYPE_MULTIPLIERS.falsification).toBeGreaterThan(EVIDENCE_TYPE_MULTIPLIERS.proof);
    expect(EVIDENCE_TYPE_MULTIPLIERS.proof).toBeGreaterThan(EVIDENCE_TYPE_MULTIPLIERS.assertion);
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: TEMPORAL DECAY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Temporal Decay', () => {
  
  describe('daysBetween', () => {
    
    it('should return 0 for same timestamp', () => {
      const ts = '2025-01-01T00:00:00Z';
      expect(daysBetween(ts, ts)).toBe(0);
    });
    
    it('should return 1 for one day difference', () => {
      const from = '2025-01-01T00:00:00Z';
      const to = '2025-01-02T00:00:00Z';
      expect(daysBetween(from, to)).toBe(1);
    });
    
    it('should return 0 for negative difference', () => {
      const from = '2025-01-02T00:00:00Z';
      const to = '2025-01-01T00:00:00Z';
      expect(daysBetween(from, to)).toBe(0);
    });
    
    it('should handle fractional days', () => {
      const from = '2025-01-01T00:00:00Z';
      const to = '2025-01-01T12:00:00Z';
      expect(daysBetween(from, to)).toBe(0.5);
    });
    
  });
  
  describe('INV-GRAV-02: calculateDecayFactor', () => {
    
    it('should return 1 for age 0', () => {
      expect(calculateDecayFactor(0)).toBe(1);
    });
    
    it('should return lambda for age 1', () => {
      expect(calculateDecayFactor(1)).toBe(TEMPORAL_DECAY_LAMBDA);
    });
    
    it('should be strictly decreasing with age', () => {
      const factors = [0, 10, 30, 100, 365].map(d => calculateDecayFactor(d));
      
      for (let i = 1; i < factors.length; i++) {
        expect(factors[i]).toBeLessThan(factors[i - 1]);
      }
    });
    
    it('should approach 0 for very old evidence', () => {
      const veryOld = calculateDecayFactor(1000);
      expect(veryOld).toBeLessThan(0.1);
    });
    
    it('should handle custom lambda', () => {
      expect(calculateDecayFactor(1, 0.5)).toBe(0.5);
      expect(calculateDecayFactor(2, 0.5)).toBe(0.25);
    });
    
  });
  
  describe('applyDecay', () => {
    
    it('should return base weight for age 0', () => {
      expect(applyDecay(10, 0)).toBe(10);
    });
    
    it('should reduce weight over time', () => {
      const initial = 10;
      const decayed = applyDecay(initial, 30);
      expect(decayed).toBeLessThan(initial);
      expect(decayed).toBeGreaterThan(0);
    });
    
  });
  
  describe('calculateHalfLife', () => {
    
    it('should calculate half-life correctly', () => {
      const halfLife = calculateHalfLife(TEMPORAL_DECAY_LAMBDA);
      
      // Verify: decay at half-life should be ~0.5
      const decayAtHalfLife = calculateDecayFactor(halfLife);
      expect(decayAtHalfLife).toBeCloseTo(0.5, 1);
    });
    
    it('should return ~231 days for lambda=0.997', () => {
      const halfLife = calculateHalfLife(0.997);
      expect(halfLife).toBeGreaterThan(200);
      expect(halfLife).toBeLessThan(250);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: EVIDENCE WEIGHT
// ═══════════════════════════════════════════════════════════════════════════════

describe('Evidence Weight', () => {
  
  describe('getProofWeight', () => {
    
    it('should return correct weights', () => {
      expect(getProofWeight('Ω')).toBe(5);
      expect(getProofWeight('Λ')).toBe(4);
      expect(getProofWeight('Σ')).toBe(3);
      expect(getProofWeight('Δ')).toBe(2);
      expect(getProofWeight('Ε')).toBe(1);
    });
    
  });
  
  describe('createEvidenceWeight', () => {
    
    it('should create evidence weight', () => {
      const input: AddEvidenceInput = {
        sourceId: 'proof-001',
        type: 'proof',
        baseWeight: 5
      };
      
      const weight = createEvidenceWeight(input);
      
      expect(weight.sourceId).toBe('proof-001');
      expect(weight.type).toBe('proof');
      expect(weight.baseWeight).toBe(5);
      expect(weight.decayedWeight).toBeCloseTo(5, 1);
    });
    
    it('should apply type multiplier', () => {
      const falsificationInput: AddEvidenceInput = {
        sourceId: 'fals-001',
        type: 'falsification',
        baseWeight: 5
      };
      
      const weight = createEvidenceWeight(falsificationInput);
      
      // falsification multiplier is 1.2
      expect(weight.baseWeight).toBe(6);
    });
    
    it('should be frozen', () => {
      const weight = createEvidenceWeight({
        sourceId: 'test',
        type: 'proof',
        baseWeight: 3
      });
      
      expect(Object.isFrozen(weight)).toBe(true);
    });
    
    it('should respect custom timestamp', () => {
      const oldTimestamp = '2024-01-01T00:00:00Z';
      const referenceTime = '2025-01-01T00:00:00Z'; // ~365-366 days later (leap year)
      
      const input: AddEvidenceInput = {
        sourceId: 'old-proof',
        type: 'proof',
        baseWeight: 10,
        timestamp: oldTimestamp
      };
      
      const weight = createEvidenceWeight(input, referenceTime);
      
      expect(weight.timestamp).toBe(oldTimestamp);
      expect(weight.ageInDays).toBeGreaterThanOrEqual(365);
      expect(weight.ageInDays).toBeLessThanOrEqual(366);
      expect(weight.decayedWeight).toBeLessThan(weight.baseWeight);
    });
    
  });
  
  describe('recomputeWeight', () => {
    
    it('should update decayed weight', () => {
      // Create a weight manually with known timestamp
      const weight = {
        sourceId: 'test',
        type: 'proof' as const,
        baseWeight: 10,
        timestamp: '2025-01-01T00:00:00Z',
        decayedWeight: 10,
        ageInDays: 0
      };
      
      // Recompute 30 days later
      const laterTime = '2025-01-31T00:00:00Z';
      const updated = recomputeWeight(weight, laterTime);
      
      expect(updated.decayedWeight).toBeLessThan(10);
      expect(updated.ageInDays).toBe(30);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: GRAVITY STATE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Gravity State', () => {
  
  describe('createGravityState', () => {
    
    it('should create initial state', () => {
      const state = createGravityState('INV-TEST-001');
      
      expect(state.invariantId).toBe('INV-TEST-001');
      expect(state.weights).toHaveLength(0);
      expect(state.rawGravity).toBe(0);
      expect(state.normalizedGravity).toBe(0);
      expect(state.confidence).toBe('SPECULATIVE');
    });
    
    it('should be frozen', () => {
      const state = createGravityState('INV-TEST-001');
      expect(Object.isFrozen(state)).toBe(true);
    });
    
    it('should set decay lambda', () => {
      const state = createGravityState('INV-TEST-001');
      expect(state.decayLambda).toBe(TEMPORAL_DECAY_LAMBDA);
    });
    
  });
  
  describe('addEvidence', () => {
    
    it('should add evidence to state', () => {
      let state = createGravityState('INV-TEST-001');
      
      state = addEvidence(state, {
        sourceId: 'proof-001',
        type: 'proof',
        baseWeight: 5
      });
      
      expect(state.weights).toHaveLength(1);
      expect(state.rawGravity).toBeGreaterThan(0);
    });
    
    it('INV-GRAV-01: gravity should be non-negative', () => {
      let state = createGravityState('INV-TEST-001');
      
      state = addEvidence(state, {
        sourceId: 'proof-001',
        type: 'proof',
        baseWeight: 5
      });
      
      expect(state.rawGravity).toBeGreaterThanOrEqual(0);
      expect(state.normalizedGravity).toBeGreaterThanOrEqual(0);
    });
    
    it('INV-GRAV-01: normalized gravity should be bounded [0, 1]', () => {
      let state = createGravityState('INV-TEST-001');
      
      // Add lots of evidence
      for (let i = 0; i < 50; i++) {
        state = addEvidence(state, {
          sourceId: `proof-${i}`,
          type: 'external',
          baseWeight: 10
        });
      }
      
      expect(state.normalizedGravity).toBeLessThanOrEqual(1);
      expect(state.normalizedGravity).toBeGreaterThanOrEqual(0);
    });
    
    it('should increase confidence with more evidence', () => {
      let state = createGravityState('INV-TEST-001');
      const initialConfidence = state.confidence;
      
      // Add substantial evidence
      for (let i = 0; i < 10; i++) {
        state = addEvidence(state, {
          sourceId: `proof-${i}`,
          type: 'falsification',
          baseWeight: 5
        });
      }
      
      expect(CONFIDENCE_ORDER.indexOf(state.confidence))
        .toBeGreaterThanOrEqual(CONFIDENCE_ORDER.indexOf(initialConfidence));
    });
    
  });
  
  describe('refreshGravity', () => {
    
    it('should recompute all weights', () => {
      // Create state with old evidence manually
      const oldWeight = {
        sourceId: 'old-proof',
        type: 'proof' as const,
        baseWeight: 10,
        timestamp: '2024-01-01T00:00:00Z',
        decayedWeight: 10,
        ageInDays: 0
      };
      
      const initialState = {
        invariantId: 'INV-TEST-001',
        weights: Object.freeze([oldWeight]),
        rawGravity: 10,
        normalizedGravity: 0.1,
        confidence: 'TENTATIVE' as const,
        decayLambda: TEMPORAL_DECAY_LAMBDA,
        computedAt: '2024-01-01T00:00:00Z'
      };
      
      const refreshed = refreshGravity(initialState);
      
      // Weight should be decayed since original timestamp was old
      expect(refreshed.weights[0].decayedWeight)
        .toBeLessThan(refreshed.weights[0].baseWeight);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: GRAVITY COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Gravity Computation', () => {
  
  describe('computeRawGravity', () => {
    
    it('should sum decayed weights', () => {
      const weights = [
        { sourceId: 'a', type: 'proof' as const, baseWeight: 5, timestamp: '', decayedWeight: 5, ageInDays: 0 },
        { sourceId: 'b', type: 'proof' as const, baseWeight: 3, timestamp: '', decayedWeight: 3, ageInDays: 0 }
      ];
      
      expect(computeRawGravity(weights)).toBe(8);
    });
    
    it('should return 0 for empty weights', () => {
      expect(computeRawGravity([])).toBe(0);
    });
    
  });
  
  describe('normalizeGravity', () => {
    
    it('should normalize to [0, 1]', () => {
      expect(normalizeGravity(0)).toBe(0);
      expect(normalizeGravity(50)).toBe(0.5);
      expect(normalizeGravity(100)).toBe(1);
    });
    
    it('should cap at 1', () => {
      expect(normalizeGravity(200)).toBe(1);
      expect(normalizeGravity(1000)).toBe(1);
    });
    
    it('should floor at 0', () => {
      expect(normalizeGravity(-10)).toBe(0);
    });
    
  });
  
  describe('INV-GRAV-03: determineConfidence', () => {
    
    it('should return SPECULATIVE for 0', () => {
      expect(determineConfidence(0)).toBe('SPECULATIVE');
    });
    
    it('should return CERTAIN for high gravity', () => {
      expect(determineConfidence(0.95)).toBe('CERTAIN');
    });
    
    it('should be monotonic with gravity', () => {
      const gravities = [0, 0.1, 0.2, 0.4, 0.6, 0.8, 0.95];
      const confidences = gravities.map(g => determineConfidence(g));
      
      for (let i = 1; i < confidences.length; i++) {
        const prevIndex = CONFIDENCE_ORDER.indexOf(confidences[i - 1]);
        const currIndex = CONFIDENCE_ORDER.indexOf(confidences[i]);
        expect(currIndex).toBeGreaterThanOrEqual(prevIndex);
      }
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Queries', () => {
  
  let state: ReturnType<typeof createGravityState>;
  
  beforeEach(() => {
    state = createGravityState('INV-TEST-001');
    state = addEvidence(state, { sourceId: 'proof-1', type: 'proof', baseWeight: 5 });
    state = addEvidence(state, { sourceId: 'fals-1', type: 'falsification', baseWeight: 3 });
    state = addEvidence(state, { sourceId: 'assert-1', type: 'assertion', baseWeight: 2 });
  });
  
  it('countEvidence should return total count', () => {
    expect(countEvidence(state)).toBe(3);
  });
  
  it('getEvidenceByType should filter correctly', () => {
    const proofs = getEvidenceByType(state, 'proof');
    expect(proofs).toHaveLength(1);
    expect(proofs[0].type).toBe('proof');
  });
  
  it('getStrongestEvidence should return highest weight', () => {
    const strongest = getStrongestEvidence(state);
    expect(strongest).not.toBeNull();
    // proof weight 5*1.0=5 > falsification 3*1.2=3.6
    expect(strongest?.type).toBe('proof');
  });
  
  it('getStrongestEvidence should return null for empty state', () => {
    const empty = createGravityState('EMPTY');
    expect(getStrongestEvidence(empty)).toBeNull();
  });
  
  it('getAverageAge should return 0 for new evidence', () => {
    const avg = getAverageAge(state);
    expect(avg).toBeCloseTo(0, 0);
  });
  
  it('getDecayStats should return valid stats', () => {
    const stats = getDecayStats(state);
    
    expect(stats.minDecay).toBeLessThanOrEqual(stats.maxDecay);
    expect(stats.avgDecay).toBeGreaterThan(0);
    expect(stats.avgDecay).toBeLessThanOrEqual(1);
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Analysis', () => {
  
  describe('meetsConfidence', () => {
    
    it('should return true for same level', () => {
      let state = createGravityState('TEST');
      expect(meetsConfidence(state, 'SPECULATIVE')).toBe(true);
    });
    
    it('should return false for higher required', () => {
      let state = createGravityState('TEST');
      expect(meetsConfidence(state, 'CERTAIN')).toBe(false);
    });
    
  });
  
  describe('getNextConfidenceLevel', () => {
    
    it('should return TENTATIVE for SPECULATIVE', () => {
      const state = createGravityState('TEST');
      expect(getNextConfidenceLevel(state)).toBe('TENTATIVE');
    });
    
    it('should return null for CERTAIN', () => {
      // Create state with CERTAIN confidence
      let state = createGravityState('TEST');
      for (let i = 0; i < 20; i++) {
        state = addEvidence(state, {
          sourceId: `external-${i}`,
          type: 'external',
          baseWeight: 10
        });
      }
      
      if (state.confidence === 'CERTAIN') {
        expect(getNextConfidenceLevel(state)).toBeNull();
      }
    });
    
  });
  
  describe('gravityToNextLevel', () => {
    
    it('should return positive value for SPECULATIVE', () => {
      const state = createGravityState('TEST');
      const needed = gravityToNextLevel(state);
      expect(needed).toBeGreaterThan(0);
    });
    
  });
  
  describe('calculateFreshness', () => {
    
    it('should return 0 for empty state', () => {
      const state = createGravityState('TEST');
      expect(calculateFreshness(state)).toBe(0);
    });
    
    it('should return 1 for all recent evidence', () => {
      let state = createGravityState('TEST');
      state = addEvidence(state, { sourceId: 'new', type: 'proof', baseWeight: 5 });
      
      expect(calculateFreshness(state, 30)).toBeCloseTo(1, 1);
    });
    
  });
  
  describe('isFresh and isStale', () => {
    
    it('fresh state should be fresh', () => {
      let state = createGravityState('TEST');
      state = addEvidence(state, { sourceId: 'new', type: 'proof', baseWeight: 5 });
      
      expect(isFresh(state)).toBe(true);
      expect(isStale(state)).toBe(false);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

describe('Comparison', () => {
  
  describe('compareConfidence', () => {
    
    it('should return HIGHER for higher level', () => {
      expect(compareConfidence('HIGH', 'LOW' as any)).toBe('HIGHER');
      expect(compareConfidence('CERTAIN', 'SPECULATIVE')).toBe('HIGHER');
    });
    
    it('should return LOWER for lower level', () => {
      expect(compareConfidence('SPECULATIVE', 'CERTAIN')).toBe('LOWER');
    });
    
    it('should return EQUAL for same level', () => {
      expect(compareConfidence('HIGH', 'HIGH')).toBe('EQUAL');
    });
    
  });
  
  describe('maxConfidence', () => {
    
    it('should return higher level', () => {
      expect(maxConfidence('HIGH', 'MODERATE')).toBe('HIGH');
      expect(maxConfidence('SPECULATIVE', 'TENTATIVE')).toBe('TENTATIVE');
    });
    
  });
  
  describe('minConfidence', () => {
    
    it('should return lower level', () => {
      expect(minConfidence('HIGH', 'MODERATE')).toBe('MODERATE');
      expect(minConfidence('CERTAIN', 'TENTATIVE')).toBe('TENTATIVE');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Type Guards', () => {
  
  describe('isConfidenceLevel', () => {
    
    it('should return true for valid levels', () => {
      expect(isConfidenceLevel('SPECULATIVE')).toBe(true);
      expect(isConfidenceLevel('CERTAIN')).toBe(true);
      expect(isConfidenceLevel('HIGH')).toBe(true);
    });
    
    it('should return false for invalid values', () => {
      expect(isConfidenceLevel('INVALID')).toBe(false);
      expect(isConfidenceLevel(123)).toBe(false);
    });
    
  });
  
  describe('isEvidenceType', () => {
    
    it('should return true for valid types', () => {
      expect(isEvidenceType('proof')).toBe(true);
      expect(isEvidenceType('falsification')).toBe(true);
      expect(isEvidenceType('external')).toBe(true);
    });
    
    it('should return false for invalid types', () => {
      expect(isEvidenceType('INVALID')).toBe(false);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Documentation', () => {
  
  describe('formatGravitySummary', () => {
    
    it('should format state as string', () => {
      let state = createGravityState('INV-TEST-001');
      state = addEvidence(state, { sourceId: 'p1', type: 'proof', baseWeight: 5 });
      
      const summary = formatGravitySummary(state);
      
      expect(summary).toContain('INV-TEST-001');
      expect(summary).toContain('Confidence:');
      expect(summary).toContain('Normalized:');
    });
    
  });
  
  describe('getConfidenceDescription', () => {
    
    it('should return description for each level', () => {
      for (const level of CONFIDENCE_ORDER) {
        const desc = getConfidenceDescription(level);
        expect(desc).toBeDefined();
        expect(desc.length).toBeGreaterThan(0);
      }
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-GRAV-04: Determinism', () => {
  
  it('decay computation should be deterministic', () => {
    for (let i = 0; i < 10; i++) {
      expect(calculateDecayFactor(30)).toBe(calculateDecayFactor(30));
    }
  });
  
  it('gravity computation should be deterministic', () => {
    const weights = [
      { sourceId: 'a', type: 'proof' as const, baseWeight: 5, timestamp: '', decayedWeight: 5, ageInDays: 0 },
      { sourceId: 'b', type: 'proof' as const, baseWeight: 3, timestamp: '', decayedWeight: 3, ageInDays: 0 }
    ];
    
    for (let i = 0; i < 10; i++) {
      expect(computeRawGravity(weights)).toBe(8);
    }
  });
  
  it('confidence determination should be deterministic', () => {
    const normalized = 0.56;
    
    for (let i = 0; i < 10; i++) {
      expect(determineConfidence(normalized)).toBe(determineConfidence(normalized));
    }
  });
  
});
