/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Physics: Inertia
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NARRATIVE PHYSICS — Emotions don't change randomly.
 * They have INERTIA: a dominant emotion resists change.
 * 
 * The longer an emotion has been dominant, the more "mass" it has.
 * Changing direction requires proportional "force" (narrative energy).
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import type { EmotionStateV2, EmotionId } from '../emotion_v2';

// ═══════════════════════════════════════════════════════════════════════════════
// INERTIA MODEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Inertia coefficient by emotion type
 * Some emotions are "heavier" (harder to shift)
 */
export const EMOTION_MASS: Record<EmotionId, number> = {
  // Heavy emotions (high inertia)
  sadness: 0.85,
  guilt: 0.80,
  shame: 0.80,
  grief: 0.90,
  
  // Medium emotions
  anger: 0.65,
  fear: 0.60,
  love: 0.70,
  trust: 0.65,
  pride: 0.60,
  
  // Light emotions (low inertia, easier to shift)
  joy: 0.45,
  surprise: 0.30,
  anticipation: 0.40,
  disgust: 0.50,
  relief: 0.35,
  envy: 0.55,
};

/**
 * Calculate inertia factor based on:
 * 1. Emotion mass (intrinsic property)
 * 2. Duration (how long it's been dominant)
 * 3. Intensity (stronger = more inertia)
 */
export function calculateInertia(
  emotion: EmotionId,
  intensity: number,
  durationBeats: number
): number {
  const mass = EMOTION_MASS[emotion] ?? 0.5;
  
  // Duration factor: log scale, caps at ~10 beats
  const durationFactor = Math.min(1.0, Math.log2(durationBeats + 1) / 3.32);
  
  // Intensity factor: squared for non-linear effect
  const intensityFactor = intensity * intensity;
  
  // Combined inertia: mass weighted by duration and intensity
  const inertia = mass * (0.4 + 0.3 * durationFactor + 0.3 * intensityFactor);
  
  return Math.min(1.0, Math.max(0.0, inertia));
}

/**
 * Calculate energy required to shift from one emotion to another
 * Higher inertia = more energy needed
 */
export function calculateShiftEnergy(
  fromEmotion: EmotionId,
  fromIntensity: number,
  durationBeats: number,
  toEmotion: EmotionId,
  toIntensity: number
): number {
  const inertia = calculateInertia(fromEmotion, fromIntensity, durationBeats);
  
  // Base energy = inertia
  let energy = inertia;
  
  // Emotional distance modifier
  const distance = getEmotionalDistance(fromEmotion, toEmotion);
  energy *= (0.5 + 0.5 * distance);
  
  // Intensity jump modifier
  const intensityDelta = Math.abs(toIntensity - fromIntensity);
  energy *= (1.0 + 0.3 * intensityDelta);
  
  return Math.min(1.0, energy);
}

/**
 * Check if a transition respects inertia physics
 * Returns true if transition is physically plausible
 */
export function validateInertia(
  currentState: EmotionStateV2,
  proposedShift: { to: EmotionId; intensity: number },
  availableEnergy: number
): { valid: boolean; energyRequired: number; reason?: string } {
  const dominant = currentState.appraisal.emotions[0];
  if (!dominant) {
    return { valid: true, energyRequired: 0 };
  }
  
  // Estimate duration from dynamics if available
  const duration = currentState.dynamics?.inertia 
    ? Math.round(currentState.dynamics.inertia * 10) 
    : 1;
  
  const energyRequired = calculateShiftEnergy(
    dominant.id,
    dominant.weight,
    duration,
    proposedShift.to,
    proposedShift.intensity
  );
  
  if (availableEnergy < energyRequired) {
    return {
      valid: false,
      energyRequired,
      reason: `Insufficient energy: need ${energyRequired.toFixed(2)}, have ${availableEnergy.toFixed(2)}`,
    };
  }
  
  return { valid: true, energyRequired };
}

/**
 * Calculate momentum of emotional state
 * Momentum = mass × velocity (rate of change)
 */
export function calculateMomentum(
  emotion: EmotionId,
  intensity: number,
  volatility: number
): number {
  const mass = EMOTION_MASS[emotion] ?? 0.5;
  // Volatility represents velocity of change
  return mass * intensity * (1 + volatility);
}

/**
 * Predict resistance to a proposed change
 * Returns 0-1 where 1 = maximum resistance
 */
export function predictResistance(
  currentState: EmotionStateV2,
  proposedChange: EmotionId
): number {
  const dominant = currentState.appraisal.emotions[0];
  if (!dominant) return 0;
  
  const mass = EMOTION_MASS[dominant.id] ?? 0.5;
  const intensity = dominant.weight;
  const inertiaFactor = currentState.dynamics?.inertia ?? 0.5;
  
  // Distance-based resistance
  const distance = getEmotionalDistance(dominant.id, proposedChange);
  
  // Combine factors
  const resistance = mass * intensity * inertiaFactor * distance;
  
  return Math.min(1.0, resistance);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTIONAL DISTANCE (used by multiple physics modules)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Emotion families for distance calculation
 */
const EMOTION_FAMILIES: Record<string, EmotionId[]> = {
  positive_high: ['joy', 'anticipation', 'pride'],
  positive_low: ['trust', 'love', 'relief'],
  negative_high: ['anger', 'fear', 'disgust'],
  negative_low: ['sadness', 'guilt', 'shame', 'grief'],
  neutral: ['surprise', 'envy'],
};

/**
 * Get emotional distance between two emotions (0-1)
 * Same family = small distance, opposite families = large distance
 */
export function getEmotionalDistance(from: EmotionId, to: EmotionId): number {
  if (from === to) return 0;
  
  // Find families
  let fromFamily = '';
  let toFamily = '';
  
  for (const [family, emotions] of Object.entries(EMOTION_FAMILIES)) {
    if (emotions.includes(from)) fromFamily = family;
    if (emotions.includes(to)) toFamily = family;
  }
  
  if (fromFamily === toFamily) return 0.2; // Same family
  
  // Opposite families
  const opposites: Record<string, string> = {
    positive_high: 'negative_low',
    positive_low: 'negative_high',
    negative_high: 'positive_low',
    negative_low: 'positive_high',
  };
  
  if (opposites[fromFamily] === toFamily) return 1.0; // Maximum distance
  
  // Adjacent families
  return 0.5;
}

/**
 * Get all emotions in same family
 */
export function getEmotionFamily(emotion: EmotionId): EmotionId[] {
  for (const emotions of Object.values(EMOTION_FAMILIES)) {
    if (emotions.includes(emotion)) {
      return emotions;
    }
  }
  return [emotion];
}
