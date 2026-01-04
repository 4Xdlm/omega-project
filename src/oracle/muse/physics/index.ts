/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Physics Index
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NARRATIVE PHYSICS — Emotions obey laws.
 * 
 * @version 1.0.0
 * @phase 14.4
 */

// Inertia — Resistance to change
export {
  EMOTION_MASS,
  calculateInertia,
  calculateShiftEnergy,
  validateInertia,
  calculateMomentum,
  predictResistance,
  getEmotionalDistance,
  getEmotionFamily,
} from './inertia';

// Gravity — Natural attractions
export {
  GRAVITY_MATRIX,
  getGravity,
  getAttractions,
  getRepulsions,
  calculateNaturalTrajectory,
  scoreTransitionNaturalness,
  getGravitationalPath,
  calculatePathEnergy,
} from './gravity';

// Attractors — Resolution points
export {
  UNIVERSAL_ATTRACTORS,
  REPULSOR_STATES,
  findActiveAttractors,
  calculateAttractorPull,
  isRepulsor,
  getBasin,
  distanceToAttractor,
  type Attractor,
  type AttractorType,
  type AttractorCondition,
} from './attractors';

// Transitions — Valid transition matrix
export {
  TRANSITIONS,
  getTransition,
  isTransitionValid,
  getNaturalTransitions,
  getValidPath,
  getTransitionDifficulty,
  getTransitionEnablers,
  type TransitionType,
  type TransitionRule,
} from './transitions';

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED PHYSICS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

import type { EmotionStateV2, EmotionId } from '../../emotion_v2';
import type { PhysicsCompliance } from '../types';
import { calculateInertia, getEmotionalDistance, calculateShiftEnergy } from './inertia';
import { scoreTransitionNaturalness, getGravity } from './gravity';
import { isRepulsor, findActiveAttractors } from './attractors';
import { isTransitionValid, getTransition } from './transitions';

/**
 * Full physics validation for a proposed emotional shift
 */
export function validatePhysics(
  currentState: EmotionStateV2,
  proposedTo: EmotionId,
  proposedIntensity: number,
  trigger?: string
): PhysicsCompliance {
  const dominant = currentState.appraisal.emotions[0];
  if (!dominant) {
    // No current dominant = any transition valid
    return {
      inertia_respected: true,
      gravity_score: 1.0,
      target_type: 'neutral',
      transition_valid: true,
      energy_required: 0,
    };
  }
  
  const from = dominant.id;
  const fromIntensity = dominant.weight;
  const duration = currentState.dynamics?.inertia 
    ? Math.round(currentState.dynamics.inertia * 10) 
    : 1;
  
  // 1. Check transition validity
  const transitionCheck = isTransitionValid(from, proposedTo, trigger);
  
  // 2. Calculate energy required
  const energyRequired = calculateShiftEnergy(
    from, fromIntensity, duration,
    proposedTo, proposedIntensity
  );
  
  // 3. Gravity score
  const gravityScore = scoreTransitionNaturalness(from, proposedTo);
  
  // 4. Check if target is attractor/repulsor
  const emotionHistory = currentState.appraisal.emotions.map(e => e.id);
  const repulsorCheck = isRepulsor(proposedTo, emotionHistory);
  const attractors = findActiveAttractors(from, emotionHistory);
  
  let targetType: 'attractor' | 'repulsor' | 'neutral' = 'neutral';
  if (repulsorCheck.isRepulsor) {
    targetType = 'repulsor';
  } else if (attractors.some(a => a.emotion === proposedTo)) {
    targetType = 'attractor';
  }
  
  // 5. Inertia check
  const inertia = calculateInertia(from, fromIntensity, duration);
  // Inertia respected if energy is sufficient OR transition is natural
  const inertiaRespected = energyRequired < 0.8 || gravityScore > 0.6;
  
  return {
    inertia_respected: inertiaRespected,
    gravity_score: gravityScore,
    target_type: targetType,
    transition_valid: transitionCheck.valid,
    energy_required: energyRequired,
  };
}
