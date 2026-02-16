/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SEMANTIC ANALYZER VALIDATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: src/semantic/semantic-validation.ts
 * Version: 1.0.0 (Sprint 9 Commit 9.1)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Validation and clamping utilities for semantic emotion analysis.
 * Ensures ART-SEM-01 compliance (valid 14D, no NaN/Infinity).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SemanticEmotionResult } from './types.js';

/**
 * 14 Plutchik emotion keys for validation.
 */
const EMOTION_14_KEYS: ReadonlyArray<keyof SemanticEmotionResult> = [
  'joy', 'trust', 'fear', 'surprise', 'sadness',
  'disgust', 'anger', 'anticipation', 'love', 'submission',
  'awe', 'disapproval', 'remorse', 'contempt',
] as const;

/**
 * Validates that parsed JSON contains all 14 emotion keys.
 * Throws if any key is missing.
 *
 * @param parsed - Parsed JSON object
 * @throws Error if missing keys
 */
export function validateEmotionKeys(parsed: unknown): asserts parsed is Record<string, unknown> {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Semantic analysis: parsed response is not an object');
  }

  const obj = parsed as Record<string, unknown>;
  const missingKeys: string[] = [];

  for (const key of EMOTION_14_KEYS) {
    if (!(key in obj)) {
      missingKeys.push(key);
    }
  }

  if (missingKeys.length > 0) {
    throw new Error(`Semantic analysis: missing keys: ${missingKeys.join(', ')}`);
  }
}

/**
 * Clamps emotion values to [0, 1] range, rejects NaN/Infinity.
 * ART-SEM-01 compliance: never returns invalid numbers.
 *
 * @param parsed - Validated object with 14 emotion keys
 * @returns SemanticEmotionResult with clamped values
 * @throws Error if any value is NaN or Infinity
 */
export function clampEmotionValues(parsed: Record<string, unknown>): SemanticEmotionResult {
  const result: Record<string, number> = {};

  for (const key of EMOTION_14_KEYS) {
    const value = parsed[key];

    if (typeof value !== 'number') {
      throw new Error(`Semantic analysis: ${key} is not a number (got ${typeof value})`);
    }

    if (!Number.isFinite(value)) {
      throw new Error(`Semantic analysis: ${key} is NaN or Infinity`);
    }

    // Clamp to [0, 1]
    result[key] = Math.max(0, Math.min(1, value));
  }

  return result as SemanticEmotionResult;
}
