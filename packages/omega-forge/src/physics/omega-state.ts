/**
 * OMEGA Forge — Omega State Conversion
 * Phase C.5 — R14 <-> Omega(X,Y,Z) conversion
 * X = Valence [-10, +10], Y = Intensity [0, 100], Z = Persistence [0, C]
 */

import type { EmotionState14D, OmegaState, CanonicalEmotionTable, Emotion14 } from '../types.js';
import { EMOTION_14_KEYS } from '../types.js';
import { computeValence, computeArousal, dominantEmotion } from './emotion-space.js';

/**
 * Convert R14 state to Omega(X,Y,Z)
 * X = valence scaled to [-10, +10]
 * Y = arousal scaled to [0, 100]
 * Z = persistence based on dominant emotion inertia
 */
export function toOmegaState(
  state: EmotionState14D,
  table: CanonicalEmotionTable,
  C: number,
): OmegaState {
  const rawValence = computeValence(state);
  const X = Math.max(-10, Math.min(10, rawValence * 10));

  const arousal = computeArousal(state);
  const Y = Math.max(0, Math.min(100, arousal * 100));

  const dominant = dominantEmotion(state);
  const physics = table.find((e) => e.emotion === dominant);
  const M = physics ? physics.M : 1;
  const Z = Math.max(0, Math.min(C, (M / 10) * C * arousal));

  return { X, Y, Z };
}

/**
 * Convert Omega(X,Y,Z) back to approximate R14 state.
 * This is a lossy conversion — we spread intensity across
 * emotions based on valence polarity.
 */
export function fromOmegaState(
  omega: OmegaState,
  table: CanonicalEmotionTable,
  C: number,
): EmotionState14D {
  const intensity = Math.max(0, Math.min(1, omega.Y / 100));
  const valenceStrength = Math.min(1, Math.abs(omega.X) / 10);

  const result: Record<string, number> = {};
  for (const key of EMOTION_14_KEYS) {
    const physics = table.find((e) => e.emotion === key);
    if (!physics) {
      result[key] = 0;
      continue;
    }
    const polarity = omega.X >= 0
      ? (key === 'joy' || key === 'trust' || key === 'love' || key === 'anticipation' || key === 'awe' ? 1 : 0)
      : (key === 'fear' || key === 'sadness' || key === 'disgust' || key === 'anger' || key === 'contempt' || key === 'remorse' ? 1 : 0);

    const persistenceFactor = C > 0 ? omega.Z / C : 0;
    result[key] = Math.max(0, Math.min(1,
      intensity * (polarity * valenceStrength + (1 - valenceStrength) * 0.1) * (1 + persistenceFactor * 0.2),
    ));
  }
  return result as EmotionState14D;
}

/** Validate Omega state bounds */
export function isValidOmega(omega: OmegaState, C: number): boolean {
  if (omega.X < -10 || omega.X > 10) return false;
  if (omega.Y < 0 || omega.Y > 100) return false;
  if (omega.Z < 0 || omega.Z > C) return false;
  return true;
}

/** Create a neutral Omega state */
export function neutralOmega(): OmegaState {
  return { X: 0, Y: 0, Z: 0 };
}

/** Get the dominant emotion from a table for a given Omega state */
export function omegaDominant(
  omega: OmegaState,
  table: CanonicalEmotionTable,
  C: number,
): Emotion14 {
  const state = fromOmegaState(omega, table, C);
  return dominantEmotion(state);
}
