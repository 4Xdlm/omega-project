/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Physics: Attractors
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NARRATIVE PHYSICS — The narrative space has ATTRACTORS and REPULSORS.
 * 
 * ATTRACTORS: States the narrative naturally tends toward (resolutions)
 * - Catharsis points
 * - Emotional equilibrium
 * - Story beat destinations
 * 
 * REPULSORS: States the narrative avoids (unless forced)
 * - Emotional taboos
 * - Unearned transitions
 * - Dead ends
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import type { EmotionId } from '../emotion_v2';
import type { NarrativeArc, NarrativeContext } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// ATTRACTOR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Attractor {
  /** Target emotional state */
  emotion: EmotionId;
  /** Pull strength (0-1) */
  strength: number;
  /** Type of attractor */
  type: AttractorType;
  /** Conditions for this attractor to be active */
  conditions: AttractorCondition[];
  /** Basin of attraction (emotions that feed into this) */
  basin: EmotionId[];
}

export type AttractorType = 
  | 'catharsis'      // Release of built-up tension
  | 'resolution'     // Story beat completion
  | 'equilibrium'    // Return to baseline
  | 'revelation'     // Truth/insight moment
  | 'transformation' // Character change point
  | 'climax';        // Peak intensity point

export interface AttractorCondition {
  type: 'arc_position' | 'tension_level' | 'emotion_history' | 'character_state';
  operator: 'gt' | 'lt' | 'eq' | 'contains';
  value: number | string | string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT ATTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Universal narrative attractors
 * These exist in almost every story
 */
export const UNIVERSAL_ATTRACTORS: Attractor[] = [
  // Relief after fear
  {
    emotion: 'relief',
    strength: 0.7,
    type: 'catharsis',
    conditions: [
      { type: 'emotion_history', operator: 'contains', value: ['fear'] },
    ],
    basin: ['fear', 'anticipation', 'surprise'],
  },
  
  // Trust after betrayal arc
  {
    emotion: 'trust',
    strength: 0.6,
    type: 'resolution',
    conditions: [
      { type: 'emotion_history', operator: 'contains', value: ['anger', 'shame'] },
    ],
    basin: ['guilt', 'shame', 'sadness'],
  },
  
  // Joy at climax
  {
    emotion: 'joy',
    strength: 0.8,
    type: 'climax',
    conditions: [
      { type: 'arc_position', operator: 'gt', value: 0.8 },
      { type: 'tension_level', operator: 'gt', value: 0.6 },
    ],
    basin: ['anticipation', 'trust', 'relief'],
  },
  
  // Sadness for tragedy
  {
    emotion: 'sadness',
    strength: 0.75,
    type: 'catharsis',
    conditions: [
      { type: 'emotion_history', operator: 'contains', value: ['love', 'fear'] },
    ],
    basin: ['love', 'fear', 'anticipation'],
  },
  
  // Pride at transformation
  {
    emotion: 'pride',
    strength: 0.65,
    type: 'transformation',
    conditions: [
      { type: 'emotion_history', operator: 'contains', value: ['shame', 'fear'] },
    ],
    basin: ['shame', 'guilt', 'anticipation'],
  },
  
  // Love as equilibrium
  {
    emotion: 'love',
    strength: 0.5,
    type: 'equilibrium',
    conditions: [],
    basin: ['trust', 'joy', 'relief'],
  },
];

/**
 * Repulsor states — narrative avoids these without strong justification
 */
export const REPULSOR_STATES: Array<{
  emotion: EmotionId;
  strength: number;
  reason: string;
}> = [
  {
    emotion: 'joy',
    strength: 0.6,
    reason: 'Unearned happiness feels hollow',
  },
  {
    emotion: 'trust',
    strength: 0.5,
    reason: 'Trust must be built, not instant',
  },
  {
    emotion: 'pride',
    strength: 0.5,
    reason: 'Pride without journey feels undeserved',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ATTRACTOR FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find active attractors given current state
 */
export function findActiveAttractors(
  currentEmotion: EmotionId,
  emotionHistory: EmotionId[],
  arc?: NarrativeArc,
  tensionLevel?: number
): Attractor[] {
  const active: Attractor[] = [];
  
  for (const attractor of UNIVERSAL_ATTRACTORS) {
    // Check if current emotion is in basin
    if (!attractor.basin.includes(currentEmotion)) {
      continue;
    }
    
    // Check all conditions
    let conditionsMet = true;
    for (const condition of attractor.conditions) {
      if (!evaluateCondition(condition, emotionHistory, arc, tensionLevel)) {
        conditionsMet = false;
        break;
      }
    }
    
    if (conditionsMet) {
      active.push(attractor);
    }
  }
  
  // Sort by strength
  return active.sort((a, b) => b.strength - a.strength);
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  condition: AttractorCondition,
  emotionHistory: EmotionId[],
  arc?: NarrativeArc,
  tensionLevel?: number
): boolean {
  switch (condition.type) {
    case 'emotion_history':
      if (condition.operator === 'contains' && Array.isArray(condition.value)) {
        return condition.value.some(e => emotionHistory.includes(e as EmotionId));
      }
      break;
      
    case 'arc_position':
      if (arc && typeof condition.value === 'number') {
        return compareNumber(arc.progress, condition.operator, condition.value);
      }
      break;
      
    case 'tension_level':
      if (tensionLevel !== undefined && typeof condition.value === 'number') {
        return compareNumber(tensionLevel, condition.operator, condition.value);
      }
      break;
  }
  
  return true; // Unknown conditions pass by default
}

function compareNumber(
  actual: number,
  operator: 'gt' | 'lt' | 'eq' | 'contains',
  expected: number
): boolean {
  switch (operator) {
    case 'gt': return actual > expected;
    case 'lt': return actual < expected;
    case 'eq': return Math.abs(actual - expected) < 0.01;
    default: return false;
  }
}

/**
 * Calculate pull strength toward attractors
 * Returns strongest pull direction
 */
export function calculateAttractorPull(
  currentEmotion: EmotionId,
  emotionHistory: EmotionId[],
  arc?: NarrativeArc,
  tensionLevel?: number
): { emotion: EmotionId; strength: number; type: AttractorType } | null {
  const active = findActiveAttractors(currentEmotion, emotionHistory, arc, tensionLevel);
  
  if (active.length === 0) return null;
  
  const strongest = active[0];
  return {
    emotion: strongest.emotion,
    strength: strongest.strength,
    type: strongest.type,
  };
}

/**
 * Check if an emotion is currently a repulsor
 * Repulsors block "easy" transitions to positive states
 */
export function isRepulsor(
  targetEmotion: EmotionId,
  emotionHistory: EmotionId[]
): { isRepulsor: boolean; reason?: string } {
  const repulsor = REPULSOR_STATES.find(r => r.emotion === targetEmotion);
  
  if (!repulsor) {
    return { isRepulsor: false };
  }
  
  // Check if journey justifies the target
  // Simple heuristic: need at least 3 steps of history with negative emotions
  const negativeEmotions = ['fear', 'anger', 'sadness', 'shame', 'guilt', 'disgust'];
  const negativeCount = emotionHistory.filter(e => negativeEmotions.includes(e)).length;
  
  if (negativeCount >= 3) {
    // Journey earned this positive state
    return { isRepulsor: false };
  }
  
  return {
    isRepulsor: true,
    reason: repulsor.reason,
  };
}

/**
 * Get basin of attraction for an attractor
 * Returns emotions that naturally lead to this attractor
 */
export function getBasin(targetEmotion: EmotionId): EmotionId[] {
  for (const attractor of UNIVERSAL_ATTRACTORS) {
    if (attractor.emotion === targetEmotion) {
      return attractor.basin;
    }
  }
  return [];
}

/**
 * Calculate distance to nearest attractor
 * Returns how "close" the current state is to a natural resolution
 */
export function distanceToAttractor(
  currentEmotion: EmotionId,
  emotionHistory: EmotionId[],
  arc?: NarrativeArc
): { distance: number; attractor: EmotionId | null } {
  const active = findActiveAttractors(currentEmotion, emotionHistory, arc);
  
  if (active.length === 0) {
    return { distance: 1.0, attractor: null };
  }
  
  // Distance = inverse of strength
  const nearest = active[0];
  return {
    distance: 1 - nearest.strength,
    attractor: nearest.emotion,
  };
}
