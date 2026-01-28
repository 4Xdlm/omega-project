/**
 * OMEGA Orchestrator Intent Normalizer v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Normalizes Intent objects for consistent processing
 *
 * INVARIANTS:
 * - G-INV-01: No fact injection via Intent
 * - G-INV-05: Deterministic pipeline order
 * - G-INV-07: IntentId = SHA256(normalized_intent_content)
 *
 * SPEC: ORCHESTRATOR_SPEC v1.0 §G3
 */

import type {
  Intent,
  IntentConstraints,
  ToneProfile,
  ForbiddenSet,
  PatternId,
  VocabularyId,
  StructureId,
} from './types';
import { createEmptyForbiddenSet } from './types';
import { createIntent, type RawIntentInput } from './intent-schema';

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZATION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Default maximum length if not specified */
export const DEFAULT_MAX_LENGTH = 5000;

/** Minimum allowed maximum length */
export const MIN_MAX_LENGTH = 1;

/** Maximum allowed maximum length */
export const MAX_MAX_LENGTH = 100000;

/** Default tone profile */
export const DEFAULT_TONE_PROFILE: ToneProfile = Object.freeze({
  tone: 'NEUTRAL',
  intensity: 'MEDIUM',
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalizes a text string.
 * - Trims whitespace
 * - Normalizes line endings to \n
 * - Removes null bytes
 * - Collapses multiple spaces
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\0/g, '') // Remove null bytes
    .replace(/\r\n/g, '\n') // Normalize Windows line endings
    .replace(/\r/g, '\n') // Normalize old Mac line endings
    .replace(/ +/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Normalizes a payload object.
 * Recursively normalizes all string values.
 */
export function normalizePayload(
  payload: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string') {
      normalized[key] = normalizeText(value);
    } else if (Array.isArray(value)) {
      normalized[key] = value.map(item =>
        typeof item === 'string' ? normalizeText(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      normalized[key] = normalizePayload(value as Record<string, unknown>);
    } else {
      normalized[key] = value;
    }
  }

  return Object.freeze(normalized);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTRAINT NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalizes constraints.
 * - Clamps maxLength to valid range
 * - Ensures format is TEXT_ONLY
 * - Ensures allowFacts is false (G-INV-01)
 */
export function normalizeConstraints(
  constraints: Partial<IntentConstraints>
): IntentConstraints {
  let maxLength = constraints.maxLength ?? DEFAULT_MAX_LENGTH;

  // Clamp to valid range
  maxLength = Math.max(MIN_MAX_LENGTH, Math.min(MAX_MAX_LENGTH, maxLength));

  // Ensure integer
  maxLength = Math.floor(maxLength);

  return Object.freeze({
    maxLength,
    format: 'TEXT_ONLY', // Always TEXT_ONLY
    allowFacts: false, // G-INV-01: Always false
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORBIDDEN SET NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sorts and deduplicates an array of IDs.
 */
function sortAndDedupe<T extends string>(items: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(items)].sort());
}

/**
 * Normalizes a ForbiddenSet.
 * - Sorts arrays for determinism
 * - Deduplicates entries
 */
export function normalizeForbiddenSet(
  forbidden: ForbiddenSet | undefined
): ForbiddenSet {
  if (!forbidden) {
    return createEmptyForbiddenSet();
  }

  return Object.freeze({
    patterns: sortAndDedupe(forbidden.patterns),
    vocabularies: sortAndDedupe(forbidden.vocabularies),
    structures: sortAndDedupe(forbidden.structures),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TONE NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalizes tone profile.
 * Returns default if not provided.
 */
export function normalizeToneProfile(
  tone: ToneProfile | undefined
): ToneProfile {
  if (!tone) {
    return DEFAULT_TONE_PROFILE;
  }

  return Object.freeze({
    tone: tone.tone,
    intensity: tone.intensity,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL INTENT NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of normalization
 */
export interface NormalizationResult {
  readonly normalized: Intent;
  readonly changes: readonly string[];
}

/**
 * Normalizes a raw intent input.
 * Creates a complete Intent with normalized fields.
 *
 * G-INV-05: Deterministic pipeline order
 * G-INV-07: IntentId computed from normalized content
 *
 * @param input - Raw intent input
 * @returns Normalized Intent with list of changes made
 */
export function normalizeRawIntent(input: RawIntentInput): NormalizationResult {
  const changes: string[] = [];

  // Normalize constraints
  const normalizedConstraints = normalizeConstraints(input.constraints);
  if (normalizedConstraints.maxLength !== input.constraints.maxLength) {
    changes.push(`maxLength clamped to ${normalizedConstraints.maxLength}`);
  }

  // Normalize payload
  const normalizedPayload = normalizePayload(input.payload);
  const originalPayloadStr = JSON.stringify(input.payload);
  const normalizedPayloadStr = JSON.stringify(normalizedPayload);
  if (originalPayloadStr !== normalizedPayloadStr) {
    changes.push('payload text normalized');
  }

  // Normalize forbidden set
  const normalizedForbidden = normalizeForbiddenSet(input.forbidden);
  if (!input.forbidden) {
    changes.push('forbidden set defaulted to empty');
  }

  // Normalize tone
  const normalizedTone = normalizeToneProfile(input.tone);
  if (!input.tone) {
    changes.push('tone defaulted to NEUTRAL/MEDIUM');
  }

  // Create normalized raw input
  const normalizedInput: RawIntentInput = {
    actorId: input.actorId,
    goal: input.goal,
    constraints: normalizedConstraints,
    tone: normalizedTone,
    forbidden: normalizedForbidden,
    payload: normalizedPayload,
  };

  // Create Intent with computed IntentId (G-INV-07)
  const normalized = createIntent(normalizedInput);

  return Object.freeze({
    normalized,
    changes: Object.freeze(changes),
  });
}

/**
 * Normalizes an existing Intent.
 * Re-normalizes all fields and recomputes IntentId.
 *
 * @param intent - Intent to normalize
 * @returns Normalized Intent
 */
export function normalizeIntent(intent: Intent): NormalizationResult {
  // Extract as raw input and re-normalize
  const rawInput: RawIntentInput = {
    actorId: intent.actorId,
    goal: intent.goal,
    constraints: intent.constraints,
    tone: intent.tone,
    forbidden: intent.forbidden,
    payload: intent.payload,
  };

  return normalizeRawIntent(rawInput);
}

/**
 * Checks if an Intent is already normalized.
 *
 * @param intent - Intent to check
 * @returns true if already normalized
 */
export function isNormalized(intent: Intent): boolean {
  const { normalized } = normalizeIntent(intent);
  return intent.intentId === normalized.intentId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// (Constants are exported at their declarations above)
// ═══════════════════════════════════════════════════════════════════════════════
