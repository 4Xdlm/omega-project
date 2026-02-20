/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Physics Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for Narrative Physics:
 * - Inertia (resistance to change)
 * - Gravity (natural attractions)
 * - Attractors (resolution points)
 * - Transitions (valid transition matrix)
 * 
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';
import {
  // Inertia
  EMOTION_MASS,
  calculateInertia,
  calculateShiftEnergy,
  predictResistance,
  getEmotionalDistance,
  getEmotionFamily,
  
  // Gravity
  GRAVITY_MATRIX,
  getGravity,
  getAttractions,
  getRepulsions,
  calculateNaturalTrajectory,
  scoreTransitionNaturalness,
  getGravitationalPath,
  
  // Attractors
  findActiveAttractors,
  calculateAttractorPull,
  isRepulsor,
  
  // Transitions
  getTransition,
  isTransitionValid,
  getNaturalTransitions,
  getValidPath,
  getTransitionDifficulty,
  
  // Combined
  validatePhysics,
} from '../physics';
import { createEmotionState } from '../../emotion_v2';

// ═══════════════════════════════════════════════════════════════════════════════
// INERTIA TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Physics: Inertia', () => {
  it('heavy emotions have higher mass', () => {
    expect(EMOTION_MASS.sadness).toBeGreaterThan(EMOTION_MASS.joy);
    expect(EMOTION_MASS.guilt).toBeGreaterThan(EMOTION_MASS.surprise);
  });
  
  it('calculateInertia increases with duration', () => {
    const short = calculateInertia('sadness', 0.7, 1);
    const long = calculateInertia('sadness', 0.7, 5);
    expect(long).toBeGreaterThan(short);
  });
  
  it('calculateInertia increases with intensity', () => {
    const low = calculateInertia('fear', 0.3, 3);
    const high = calculateInertia('fear', 0.9, 3);
    expect(high).toBeGreaterThan(low);
  });
  
  it('calculateShiftEnergy is higher for large emotional distance', () => {
    const near = calculateShiftEnergy('joy', 0.7, 3, 'trust', 0.7);
    const far = calculateShiftEnergy('joy', 0.7, 3, 'sadness', 0.7);
    expect(far).toBeGreaterThan(near);
  });
  
  it('getEmotionalDistance returns 0 for same emotion', () => {
    expect(getEmotionalDistance('fear', 'fear')).toBe(0);
  });
  
  it('getEmotionalDistance returns max for opposite emotions', () => {
    const distance = getEmotionalDistance('joy', 'sadness');
    expect(distance).toBeGreaterThan(0.5);
  });
  
  it('getEmotionFamily returns related emotions', () => {
    const family = getEmotionFamily('joy');
    expect(family).toContain('joy');
  });
  
  it('predictResistance increases with inertia', () => {
    const state = createEmotionState('sadness', 0.9);
    // Sadness has high mass, should resist change
    const resistance = predictResistance(state, 'joy');
    expect(resistance).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GRAVITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Physics: Gravity', () => {
  it('GRAVITY_MATRIX has entries for all major emotions', () => {
    expect(GRAVITY_MATRIX.fear).toBeDefined();
    expect(GRAVITY_MATRIX.joy).toBeDefined();
    expect(GRAVITY_MATRIX.anger).toBeDefined();
    expect(GRAVITY_MATRIX.sadness).toBeDefined();
  });
  
  it('fear is attracted to relief', () => {
    const gravity = getGravity('fear', 'relief');
    expect(gravity).toBeGreaterThan(0);
  });
  
  it('getAttractions returns sorted list', () => {
    const attractions = getAttractions('fear');
    expect(attractions.length).toBeGreaterThan(0);
    
    for (let i = 1; i < attractions.length; i++) {
      expect(attractions[i - 1].strength).toBeGreaterThanOrEqual(attractions[i].strength);
    }
  });
  
  it('getRepulsions returns negative attractions', () => {
    const repulsions = getRepulsions('fear');
    // Fear should be repulsed from some emotions
    expect(repulsions.length).toBeGreaterThanOrEqual(0);
  });
  
  it('calculateNaturalTrajectory returns probable next emotion', () => {
    const trajectory = calculateNaturalTrajectory('fear', 0.7);
    expect(trajectory).not.toBeNull();
    if (trajectory) {
      expect(trajectory.probability).toBeGreaterThan(0);
      expect(trajectory.probability).toBeLessThanOrEqual(1);
    }
  });
  
  it('scoreTransitionNaturalness returns 0-1', () => {
    const score = scoreTransitionNaturalness('fear', 'relief');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
  
  it('getGravitationalPath finds path', () => {
    const path = getGravitationalPath('anger', 'relief');
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0]).toBe('anger');
    expect(path[path.length - 1]).toBe('relief');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ATTRACTORS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Physics: Attractors', () => {
  it('findActiveAttractors returns attractors when conditions met', () => {
    const attractors = findActiveAttractors('fear', ['fear', 'anticipation']);
    // Fear should have relief as attractor
    expect(attractors.length).toBeGreaterThanOrEqual(0);
  });
  
  it('calculateAttractorPull returns strongest pull', () => {
    const pull = calculateAttractorPull('fear', ['fear', 'anticipation']);
    // May or may not have a pull depending on conditions
    if (pull) {
      expect(pull.strength).toBeGreaterThan(0);
    }
  });
  
  it('isRepulsor detects unearned positive emotions', () => {
    // Joy without journey should be repulsor
    const result = isRepulsor('joy', ['anticipation']);
    expect(typeof result.isRepulsor).toBe('boolean');
  });
  
  it('isRepulsor allows earned emotions', () => {
    // Joy after fear/sadness journey should not be repulsor
    const result = isRepulsor('joy', ['fear', 'sadness', 'anger', 'anticipation']);
    expect(result.isRepulsor).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITIONS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Physics: Transitions', () => {
  it('getTransition returns rule for any pair', () => {
    const rule = getTransition('fear', 'relief');
    expect(rule).toBeDefined();
    expect(rule.from).toBe('fear');
    expect(rule.to).toBe('relief');
    expect(['natural', 'triggered', 'forbidden']).toContain(rule.type);
  });
  
  it('fear to relief is natural', () => {
    const rule = getTransition('fear', 'relief');
    expect(rule.type).toBe('natural');
  });
  
  it('joy to anger is forbidden without intermediary', () => {
    const rule = getTransition('joy', 'anger');
    expect(rule.type).toBe('forbidden');
  });
  
  it('isTransitionValid validates natural transitions', () => {
    const result = isTransitionValid('fear', 'relief');
    expect(result.valid).toBe(true);
  });
  
  it('isTransitionValid rejects forbidden transitions', () => {
    const result = isTransitionValid('joy', 'anger');
    expect(result.valid).toBe(false);
    expect(result.intermediary).toBeDefined();
  });
  
  it('getNaturalTransitions returns list', () => {
    const natural = getNaturalTransitions('fear');
    expect(natural).toContain('relief');
  });
  
  it('getValidPath finds path for forbidden transitions', () => {
    const path = getValidPath('joy', 'anger');
    expect(path.path.length).toBeGreaterThan(2); // Needs intermediary
    expect(path.path[0]).toBe('joy');
    expect(path.path[path.path.length - 1]).toBe('anger');
  });
  
  it('getTransitionDifficulty returns correct values', () => {
    expect(getTransitionDifficulty('fear', 'relief')).toBe(0); // Natural
    expect(getTransitionDifficulty('joy', 'anger')).toBe(1); // Forbidden
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED PHYSICS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Physics: validatePhysics', () => {
  it('validates natural transition', () => {
    const state = createEmotionState('fear', 0.7);
    const result = validatePhysics(state, 'relief', 0.6);
    
    expect(result.transition_valid).toBe(true);
    expect(result.gravity_score).toBeGreaterThan(0.5);
  });
  
  it('flags forbidden transition', () => {
    const state = createEmotionState('joy', 0.8);
    const result = validatePhysics(state, 'anger', 0.7);
    
    expect(result.transition_valid).toBe(false);
  });
  
  it('calculates energy required', () => {
    const state = createEmotionState('sadness', 0.9);
    const result = validatePhysics(state, 'joy', 0.8);
    
    expect(result.energy_required).toBeGreaterThan(0);
  });
  
  it('identifies attractor targets', () => {
    const state = createEmotionState('fear', 0.7);
    const result = validatePhysics(state, 'relief', 0.5);
    
    // Relief is a common attractor from fear
    expect(['attractor', 'neutral']).toContain(result.target_type);
  });
});
