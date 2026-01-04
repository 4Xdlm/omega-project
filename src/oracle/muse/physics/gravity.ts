/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Physics: Gravity
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NARRATIVE PHYSICS — Emotions have GRAVITY.
 * Certain emotions naturally "pull" toward others.
 * 
 * Fear → Relief (natural resolution)
 * Anger → Shame (after catharsis)
 * Sadness → Acceptance (healing arc)
 * 
 * This is not preference — it's narrative physics.
 * Writers instinctively know these patterns.
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import type { EmotionId } from '../emotion_v2';

// ═══════════════════════════════════════════════════════════════════════════════
// GRAVITY MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gravitational attraction between emotions
 * Positive = attraction, Negative = repulsion, Zero = neutral
 * 
 * Matrix[from][to] = attraction strength (-1 to 1)
 */
export const GRAVITY_MATRIX: Record<EmotionId, Partial<Record<EmotionId, number>>> = {
  // Fear naturally pulls toward relief or trust
  fear: {
    relief: 0.8,
    trust: 0.5,
    anger: 0.3,      // Fight response
    sadness: 0.2,
    joy: -0.3,       // Unnatural jump
    pride: -0.4,
  },
  
  // Anger pulls toward shame (aftermath) or relief (catharsis)
  anger: {
    shame: 0.6,
    guilt: 0.5,
    relief: 0.4,
    sadness: 0.3,
    pride: 0.2,      // Righteous anger
    joy: -0.4,
    love: -0.3,
  },
  
  // Sadness pulls toward acceptance (relief) or love (comfort)
  sadness: {
    relief: 0.6,
    love: 0.5,
    trust: 0.4,
    anticipation: 0.3,  // Hope
    joy: 0.2,
    anger: 0.2,      // Grief to rage
    pride: -0.3,
  },
  
  // Joy is unstable, pulls toward contentment (trust) or anticipation
  joy: {
    trust: 0.5,
    anticipation: 0.5,
    love: 0.4,
    pride: 0.3,
    fear: 0.2,       // Joy creates vulnerability
    sadness: -0.2,
  },
  
  // Trust pulls toward love or contentment
  trust: {
    love: 0.6,
    joy: 0.4,
    relief: 0.3,
    anticipation: 0.3,
    fear: -0.4,
    anger: -0.3,
  },
  
  // Surprise is a pivot — can go anywhere
  surprise: {
    fear: 0.4,
    joy: 0.4,
    anger: 0.3,
    anticipation: 0.3,
    trust: 0.2,
    sadness: 0.2,
  },
  
  // Disgust pulls toward anger or shame
  disgust: {
    anger: 0.5,
    shame: 0.4,
    fear: 0.3,
    sadness: 0.2,
    joy: -0.5,
    love: -0.4,
  },
  
  // Anticipation pulls toward joy (fulfillment) or fear (anxiety)
  anticipation: {
    joy: 0.5,
    fear: 0.4,
    relief: 0.3,
    trust: 0.3,
    sadness: 0.2,    // Disappointed hope
    anger: -0.2,
  },
  
  // Love is sticky, pulls toward trust and joy
  love: {
    trust: 0.6,
    joy: 0.5,
    fear: 0.3,       // Fear of loss
    sadness: 0.3,    // Love enables grief
    anger: 0.2,      // Betrayal path
    pride: 0.2,
  },
  
  // Shame pulls toward guilt, then relief
  shame: {
    guilt: 0.6,
    relief: 0.4,
    sadness: 0.4,
    anger: 0.2,      // Defensive
    pride: -0.5,
    joy: -0.4,
  },
  
  // Guilt pulls toward shame, relief, or sadness
  guilt: {
    shame: 0.5,
    relief: 0.5,
    sadness: 0.4,
    anger: 0.2,
    pride: -0.4,
    joy: -0.3,
  },
  
  // Envy pulls toward anger, shame, or motivation (anticipation)
  envy: {
    anger: 0.5,
    shame: 0.4,
    anticipation: 0.3,
    sadness: 0.3,
    joy: -0.3,
    trust: -0.2,
  },
  
  // Pride pulls toward joy or shame (hubris fall)
  pride: {
    joy: 0.5,
    shame: 0.4,      // The fall
    anticipation: 0.3,
    anger: 0.2,      // Wounded pride
    fear: 0.2,
    sadness: -0.2,
  },
  
  // Relief is a resting point, pulls toward trust/joy
  relief: {
    trust: 0.5,
    joy: 0.5,
    love: 0.3,
    anticipation: 0.2,
    fear: -0.4,
    anger: -0.3,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// GRAVITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get gravitational pull from one emotion to another
 * Returns value in range [-1, 1]
 */
export function getGravity(from: EmotionId, to: EmotionId): number {
  if (from === to) return 0;
  return GRAVITY_MATRIX[from]?.[to] ?? 0;
}

/**
 * Get all emotions that "from" is attracted to
 * Returns sorted by attraction strength (descending)
 */
export function getAttractions(from: EmotionId): Array<{ emotion: EmotionId; strength: number }> {
  const attractions: Array<{ emotion: EmotionId; strength: number }> = [];
  
  const pulls = GRAVITY_MATRIX[from] ?? {};
  for (const [emotion, strength] of Object.entries(pulls)) {
    if (strength && strength > 0) {
      attractions.push({ emotion: emotion as EmotionId, strength });
    }
  }
  
  return attractions.sort((a, b) => b.strength - a.strength);
}

/**
 * Get all emotions that "from" is repulsed by
 * Returns sorted by repulsion strength (descending)
 */
export function getRepulsions(from: EmotionId): Array<{ emotion: EmotionId; strength: number }> {
  const repulsions: Array<{ emotion: EmotionId; strength: number }> = [];
  
  const pulls = GRAVITY_MATRIX[from] ?? {};
  for (const [emotion, strength] of Object.entries(pulls)) {
    if (strength && strength < 0) {
      repulsions.push({ emotion: emotion as EmotionId, strength: Math.abs(strength) });
    }
  }
  
  return repulsions.sort((a, b) => b.strength - a.strength);
}

/**
 * Calculate natural trajectory from current emotion
 * Returns the most likely "natural" next emotion
 */
export function calculateNaturalTrajectory(
  current: EmotionId,
  intensity: number
): { emotion: EmotionId; probability: number } | null {
  const attractions = getAttractions(current);
  if (attractions.length === 0) return null;
  
  // Highest attraction wins, probability scaled by intensity
  const best = attractions[0];
  
  // Low intensity = more likely to follow gravity
  // High intensity = more resistance (inertia)
  const probability = best.strength * (1 - 0.3 * intensity);
  
  return {
    emotion: best.emotion,
    probability: Math.min(0.95, Math.max(0.1, probability)),
  };
}

/**
 * Score a proposed transition by gravitational "naturalness"
 * High score = feels natural, Low score = feels forced
 */
export function scoreTransitionNaturalness(from: EmotionId, to: EmotionId): number {
  const gravity = getGravity(from, to);
  
  // Convert gravity (-1 to 1) to naturalness score (0 to 1)
  // Positive gravity = high naturalness
  // Zero gravity = medium naturalness
  // Negative gravity = low naturalness
  return (gravity + 1) / 2;
}

/**
 * Get the "gravitational path" from one emotion to another
 * Returns intermediate emotions for a natural transition
 */
export function getGravitationalPath(
  from: EmotionId,
  to: EmotionId,
  maxSteps: number = 3
): EmotionId[] {
  if (from === to) return [from];
  
  // Direct path if gravity is positive
  const directGravity = getGravity(from, to);
  if (directGravity > 0.3) {
    return [from, to];
  }
  
  // Find intermediate steps via attractions
  const path: EmotionId[] = [from];
  let current = from;
  const visited = new Set<EmotionId>([from]);
  
  for (let step = 0; step < maxSteps && current !== to; step++) {
    const attractions = getAttractions(current);
    
    // Find best next step toward target
    let bestNext: EmotionId | null = null;
    let bestScore = -Infinity;
    
    for (const { emotion, strength } of attractions) {
      if (visited.has(emotion)) continue;
      
      // Score = attraction + how close to target
      const toTargetGravity = getGravity(emotion, to);
      const score = strength + (emotion === to ? 1 : toTargetGravity);
      
      if (score > bestScore) {
        bestScore = score;
        bestNext = emotion;
      }
    }
    
    if (bestNext) {
      path.push(bestNext);
      visited.add(bestNext);
      current = bestNext;
    } else {
      break;
    }
  }
  
  // Force target at end if not reached
  if (path[path.length - 1] !== to) {
    path.push(to);
  }
  
  return path;
}

/**
 * Calculate total "gravitational energy" of a path
 * Low energy = natural flow, High energy = forced
 */
export function calculatePathEnergy(path: EmotionId[]): number {
  if (path.length < 2) return 0;
  
  let totalEnergy = 0;
  
  for (let i = 0; i < path.length - 1; i++) {
    const gravity = getGravity(path[i], path[i + 1]);
    // Negative gravity means we're fighting it = high energy
    // Positive gravity means we're flowing with it = low energy
    totalEnergy += 1 - gravity;
  }
  
  return totalEnergy / (path.length - 1);
}
