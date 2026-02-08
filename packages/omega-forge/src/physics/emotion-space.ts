/**
 * OMEGA Forge — Emotion Space Operations
 * Phase C.5 — R14 distances, valence, arousal, dominance
 * Pure reimplementation of GENESIS FORGE formulas.
 */

import type { EmotionState14D, Emotion14, OmegaState } from '../types.js';
import { EMOTION_14_KEYS, EMOTION_POLARITY } from '../types.js';

/** Cosine similarity in R14: <a,b> / (||a|| * ||b||) */
export function cosineSimilarity14D(a: EmotionState14D, b: EmotionState14D): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const key of EMOTION_14_KEYS) {
    dot += a[key] * b[key];
    normA += a[key] * a[key];
    normB += b[key] * b[key];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

/** Euclidean distance in R14: sqrt(sum((a[i]-b[i])^2)) */
export function euclideanDistance14D(a: EmotionState14D, b: EmotionState14D): number {
  let sum = 0;
  for (const key of EMOTION_14_KEYS) {
    const diff = a[key] - b[key];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/** VAD distance between two OmegaStates: sqrt((v1-v2)^2+(a1-a2)^2+(d1-d2)^2) */
export function vadDistance(a: OmegaState, b: OmegaState): number {
  const dv = a.X - b.X;
  const da = a.Y - b.Y;
  const dd = a.Z - b.Z;
  return Math.sqrt(dv * dv + da * da + dd * dd);
}

/** Compute valence from R14 state: sum(polarity[i] * e[i]) */
export function computeValence(state: EmotionState14D): number {
  let valence = 0;
  for (const key of EMOTION_14_KEYS) {
    valence += EMOTION_POLARITY[key] * state[key];
  }
  return valence;
}

/** Compute arousal from R14 state: sqrt(sum(e[i]^2)) / sqrt(14) */
export function computeArousal(state: EmotionState14D): number {
  let sum = 0;
  for (const key of EMOTION_14_KEYS) {
    sum += state[key] * state[key];
  }
  return Math.sqrt(sum / EMOTION_14_KEYS.length);
}

/** Dominant emotion: argmax(e[i]) */
export function dominantEmotion(state: EmotionState14D): Emotion14 {
  let maxVal = -Infinity;
  let maxKey: Emotion14 = 'joy';
  for (const key of EMOTION_14_KEYS) {
    if (state[key] > maxVal) {
      maxVal = state[key];
      maxKey = key;
    }
  }
  return maxKey;
}

/** Validate that all values are in [0, 1] */
export function isValidState(state: EmotionState14D): boolean {
  for (const key of EMOTION_14_KEYS) {
    const v = state[key];
    if (typeof v !== 'number' || isNaN(v) || v < 0 || v > 1) return false;
  }
  return true;
}

/** Create a zero state (all emotions = 0) */
export function zeroState(): EmotionState14D {
  const state: Record<string, number> = {};
  for (const key of EMOTION_14_KEYS) {
    state[key] = 0;
  }
  return state as EmotionState14D;
}

/** Create a state from a single dominant emotion */
export function singleEmotionState(emotion: Emotion14, intensity: number): EmotionState14D {
  const state: Record<string, number> = {};
  for (const key of EMOTION_14_KEYS) {
    state[key] = key === emotion ? Math.max(0, Math.min(1, intensity)) : 0;
  }
  return state as EmotionState14D;
}
