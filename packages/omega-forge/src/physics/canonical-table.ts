/**
 * OMEGA Forge — Canonical Emotion Table
 * Phase C.5 — Load and validate 14 emotions x 6 physical parameters
 */

import type { CanonicalEmotionTable, EmotionPhysics, Emotion14 } from '../types.js';
import { EMOTION_14_KEYS } from '../types.js';

/** Default canonical table (SEED VALUES from OMEGA V4.4) */
export const DEFAULT_CANONICAL_TABLE: CanonicalEmotionTable = [
  { emotion: 'joy',          M: 3,  lambda: 0.15, kappa: 1.2, E0: 2, zeta: 0.8, mu: 0.1 },
  { emotion: 'trust',        M: 5,  lambda: 0.08, kappa: 0.8, E0: 3, zeta: 1.2, mu: 0.2 },
  { emotion: 'fear',         M: 7,  lambda: 0.20, kappa: 1.5, E0: 1, zeta: 0.6, mu: 0.3 },
  { emotion: 'surprise',     M: 2,  lambda: 0.30, kappa: 2.0, E0: 0, zeta: 0.5, mu: 0.05 },
  { emotion: 'sadness',      M: 8,  lambda: 0.05, kappa: 0.5, E0: 2, zeta: 1.5, mu: 0.4 },
  { emotion: 'disgust',      M: 4,  lambda: 0.12, kappa: 1.0, E0: 1, zeta: 1.0, mu: 0.15 },
  { emotion: 'anger',        M: 6,  lambda: 0.18, kappa: 1.8, E0: 1, zeta: 0.7, mu: 0.25 },
  { emotion: 'anticipation', M: 3,  lambda: 0.10, kappa: 1.0, E0: 2, zeta: 0.9, mu: 0.1 },
  { emotion: 'love',         M: 9,  lambda: 0.03, kappa: 0.4, E0: 4, zeta: 1.3, mu: 0.35 },
  { emotion: 'submission',   M: 4,  lambda: 0.10, kappa: 0.7, E0: 1, zeta: 1.1, mu: 0.2 },
  { emotion: 'awe',          M: 5,  lambda: 0.12, kappa: 1.3, E0: 2, zeta: 0.7, mu: 0.15 },
  { emotion: 'disapproval',  M: 4,  lambda: 0.15, kappa: 1.0, E0: 1, zeta: 1.0, mu: 0.2 },
  { emotion: 'remorse',      M: 7,  lambda: 0.06, kappa: 0.6, E0: 2, zeta: 1.4, mu: 0.35 },
  { emotion: 'contempt',     M: 6,  lambda: 0.08, kappa: 0.9, E0: 2, zeta: 1.2, mu: 0.3 },
];

/** Load and validate canonical table from JSON data */
export function loadCanonicalTable(json: unknown): CanonicalEmotionTable {
  if (!Array.isArray(json)) {
    throw new Error('Canonical table must be an array');
  }
  if (json.length !== 14) {
    throw new Error(`Canonical table must have 14 entries, got ${json.length}`);
  }
  const table: EmotionPhysics[] = [];
  for (const entry of json) {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error('Each entry must be an object');
    }
    const e = entry as Record<string, unknown>;
    const emotion = e['emotion'] as Emotion14;
    if (!EMOTION_14_KEYS.includes(emotion)) {
      throw new Error(`Unknown emotion: ${String(emotion)}`);
    }
    const M = e['M'] as number;
    const lambda = e['lambda'] as number;
    const kappa = e['kappa'] as number;
    const E0 = e['E0'] as number;
    const zeta = e['zeta'] as number;
    const mu = e['mu'] as number;
    if (M <= 0) throw new Error(`M must be > 0 for ${emotion}`);
    if (lambda <= 0) throw new Error(`lambda must be > 0 for ${emotion}`);
    table.push({ emotion, M, lambda, kappa, E0, zeta, mu });
  }
  return table;
}

/** Get physics for a specific emotion */
export function getEmotionPhysics(
  table: CanonicalEmotionTable,
  emotion: Emotion14,
): EmotionPhysics {
  const found = table.find((e) => e.emotion === emotion);
  if (!found) {
    throw new Error(`Emotion ${emotion} not found in canonical table`);
  }
  return found;
}

/** Validate that all 14 emotions are present and parameters are valid */
export function validateTable(table: CanonicalEmotionTable): boolean {
  if (table.length !== 14) return false;
  for (const emotion of EMOTION_14_KEYS) {
    const entry = table.find((e) => e.emotion === emotion);
    if (!entry) return false;
    if (entry.M <= 0 || entry.lambda <= 0) return false;
  }
  return true;
}
