/**
 * OMEGA Orchestrator Intent Validator v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Validates Intent objects against schema and invariants
 *
 * INVARIANTS:
 * - G-INV-01: No fact injection via Intent
 * - G-INV-04: Intent ≠ Truth (total isolation)
 * - G-INV-07: IntentId = SHA256(normalized_intent_content)
 *
 * SPEC: ORCHESTRATOR_SPEC v1.0 §G2
 */

import type {
  Intent,
  IntentId,
  ActorId,
  IntentGoal,
  IntentConstraints,
  ToneProfile,
  ForbiddenSet,
  ValidationError,
  ValidationErrorCode,
} from './types';
import {
  isIntentId,
  isActorId,
  isIntentGoal,
  isIntentConstraints,
  isToneProfile,
  isForbiddenSet,
  createValidationError,
  INTENT_GOALS,
} from './types';
import { generateIntentId, computeIntentHash, type RawIntentInput } from './intent-schema';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of intent validation.
 */
export interface IntentValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

/**
 * Creates a successful validation result.
 */
function validResult(): IntentValidationResult {
  return Object.freeze({ valid: true, errors: Object.freeze([]) });
}

/**
 * Creates a failed validation result.
 */
function invalidResult(errors: ValidationError[]): IntentValidationResult {
  return Object.freeze({ valid: false, errors: Object.freeze(errors) });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACT INJECTION DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patterns that indicate fact injection attempts.
 * G-INV-01: No fact injection via Intent
 */
const FACT_INJECTION_PATTERNS: readonly RegExp[] = [
  /\[FACT\]/i,
  /\[CANON\]/i,
  /\[TRUTH\]/i,
  /\bfact:\s*\{/i,
  /\bcanon:\s*\{/i,
  /\btruth:\s*\{/i,
  /"predicate"\s*:/i,
  /"subject"\s*:\s*"ENT-/i,
  /\bHAS_NAME\b/,
  /\bHAS_AGE\b/,
  /\bIS_A\b/,
  /\bENT-[a-z]+-[a-f0-9]+/i,
  /\bCLM-[a-f0-9]+/i,
];

/**
 * Keywords that suggest canonical data injection.
 */
const FORBIDDEN_KEYWORDS: readonly string[] = [
  '__canon__',
  '__truth__',
  '__fact__',
  'inject_fact',
  'bypass_gate',
  'skip_validation',
];

/**
 * Checks payload for fact injection attempts.
 * G-INV-01: No fact injection via Intent
 *
 * @param payload - Payload to check
 * @returns true if fact injection detected
 */
export function detectFactInjection(payload: unknown): boolean {
  const payloadStr = JSON.stringify(payload);

  // Check for injection patterns
  for (const pattern of FACT_INJECTION_PATTERNS) {
    if (pattern.test(payloadStr)) {
      return true;
    }
  }

  // Check for forbidden keywords
  const lowerPayload = payloadStr.toLowerCase();
  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (lowerPayload.includes(keyword)) {
      return true;
    }
  }

  return false;
}

/**
 * Recursively checks object for forbidden structure patterns.
 */
export function detectForbiddenStructures(obj: unknown, depth: number = 0): boolean {
  // Prevent infinite recursion
  if (depth > 10) return false;

  if (obj === null || obj === undefined) return false;
  if (typeof obj !== 'object') return false;

  // Check for forbidden keys using Object.getOwnPropertyNames to catch __proto__
  const forbiddenKeys = ['__proto__', 'constructor', 'prototype', '__canon__', '__truth__'];

  // Use getOwnPropertyNames to get all properties including non-enumerable
  const keys = Object.getOwnPropertyNames(obj);
  for (const key of keys) {
    if (forbiddenKeys.includes(key)) {
      return true;
    }
  }

  // Also check stringified version for __proto__ (in case it's in JSON)
  const str = JSON.stringify(obj);
  if (str.includes('"__proto__"') || str.includes('"constructor"') || str.includes('"__canon__"')) {
    return true;
  }

  // Recursively check nested objects
  const record = obj as Record<string, unknown>;
  for (const value of Object.values(record)) {
    if (detectForbiddenStructures(value, depth + 1)) {
      return true;
    }
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates IntentId format.
 */
export function validateIntentId(intentId: unknown): ValidationError | null {
  if (!isIntentId(intentId)) {
    return createValidationError(
      'INVALID_INTENT_ID',
      'IntentId must be INT- followed by 32 hex characters',
      'intentId'
    );
  }
  return null;
}

/**
 * Validates ActorId format.
 */
export function validateActorId(actorId: unknown): ValidationError | null {
  if (!isActorId(actorId)) {
    return createValidationError(
      'INVALID_ACTOR_ID',
      'ActorId must be ACT- followed by alphanumeric characters',
      'actorId'
    );
  }
  return null;
}

/**
 * Validates IntentGoal.
 */
export function validateGoal(goal: unknown): ValidationError | null {
  if (!isIntentGoal(goal)) {
    return createValidationError(
      'INVALID_GOAL',
      `Goal must be one of: ${INTENT_GOALS.join(', ')}`,
      'goal'
    );
  }
  return null;
}

/**
 * Validates IntentConstraints.
 * G-INV-01: Ensures allowFacts is false
 */
export function validateConstraints(constraints: unknown): ValidationError | null {
  if (!isIntentConstraints(constraints)) {
    return createValidationError(
      'INVALID_CONSTRAINTS',
      'Constraints must have maxLength > 0, format: TEXT_ONLY, allowFacts: false',
      'constraints'
    );
  }

  // G-INV-01: Extra check for allowFacts
  const c = constraints as IntentConstraints;
  if (c.allowFacts !== false) {
    return createValidationError(
      'FACT_INJECTION_DETECTED',
      'G-INV-01: allowFacts must be false to prevent fact injection',
      'constraints.allowFacts'
    );
  }

  return null;
}

/**
 * Validates optional ToneProfile.
 */
export function validateTone(tone: unknown): ValidationError | null {
  if (tone === undefined) return null;
  if (!isToneProfile(tone)) {
    return createValidationError(
      'INVALID_CONSTRAINTS',
      'Tone must have valid tone and intensity values',
      'tone'
    );
  }
  return null;
}

/**
 * Validates optional ForbiddenSet.
 */
export function validateForbidden(forbidden: unknown): ValidationError | null {
  if (forbidden === undefined) return null;
  if (!isForbiddenSet(forbidden)) {
    return createValidationError(
      'INVALID_CONSTRAINTS',
      'Forbidden must have patterns, vocabularies, and structures arrays',
      'forbidden'
    );
  }
  return null;
}

/**
 * Validates payload for fact injection.
 * G-INV-01: No fact injection via Intent
 */
export function validatePayload(payload: unknown): ValidationError | null {
  if (typeof payload !== 'object' || payload === null) {
    return createValidationError(
      'INVALID_PAYLOAD',
      'Payload must be an object',
      'payload'
    );
  }

  // G-INV-01: Check for fact injection
  if (detectFactInjection(payload)) {
    return createValidationError(
      'FACT_INJECTION_DETECTED',
      'G-INV-01: Payload contains fact injection patterns',
      'payload'
    );
  }

  // Check for forbidden structures
  if (detectForbiddenStructures(payload)) {
    return createValidationError(
      'FACT_INJECTION_DETECTED',
      'Payload contains forbidden structures',
      'payload'
    );
  }

  return null;
}

/**
 * Validates that IntentId matches computed hash.
 * G-INV-07: IntentId = SHA256(normalized_intent_content)
 */
export function validateIntentIdMatch(intent: Intent): ValidationError | null {
  // Reconstruct raw input
  const rawInput: RawIntentInput = {
    actorId: intent.actorId,
    goal: intent.goal,
    constraints: intent.constraints,
    tone: intent.tone,
    forbidden: intent.forbidden,
    payload: intent.payload,
  };

  const expectedId = generateIntentId(rawInput);

  if (intent.intentId !== expectedId) {
    return createValidationError(
      'INVALID_INTENT_ID',
      `G-INV-07: IntentId mismatch. Expected ${expectedId}, got ${intent.intentId}`,
      'intentId'
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates a complete Intent object.
 *
 * Checks:
 * 1. All required fields present and valid
 * 2. IntentId format correct
 * 3. IntentId matches computed hash (G-INV-07)
 * 4. No fact injection in payload (G-INV-01)
 * 5. allowFacts is false (G-INV-01)
 *
 * @param intent - Intent to validate
 * @returns Validation result with errors if any
 */
export function validateIntent(intent: unknown): IntentValidationResult {
  const errors: ValidationError[] = [];

  // Basic type check
  if (typeof intent !== 'object' || intent === null) {
    return invalidResult([
      createValidationError('INVALID_PAYLOAD', 'Intent must be an object', undefined),
    ]);
  }

  const obj = intent as Record<string, unknown>;

  // Validate each field
  const intentIdError = validateIntentId(obj.intentId);
  if (intentIdError) errors.push(intentIdError);

  const actorIdError = validateActorId(obj.actorId);
  if (actorIdError) errors.push(actorIdError);

  const goalError = validateGoal(obj.goal);
  if (goalError) errors.push(goalError);

  const constraintsError = validateConstraints(obj.constraints);
  if (constraintsError) errors.push(constraintsError);

  const toneError = validateTone(obj.tone);
  if (toneError) errors.push(toneError);

  const forbiddenError = validateForbidden(obj.forbidden);
  if (forbiddenError) errors.push(forbiddenError);

  const payloadError = validatePayload(obj.payload);
  if (payloadError) errors.push(payloadError);

  // If basic validation passed, check IntentId match
  if (errors.length === 0) {
    const matchError = validateIntentIdMatch(intent as Intent);
    if (matchError) errors.push(matchError);
  }

  if (errors.length > 0) {
    return invalidResult(errors);
  }

  return validResult();
}

/**
 * Validates raw intent input before IntentId generation.
 *
 * @param input - Raw intent input
 * @returns Validation result
 */
export function validateRawIntentInput(input: unknown): IntentValidationResult {
  const errors: ValidationError[] = [];

  if (typeof input !== 'object' || input === null) {
    return invalidResult([
      createValidationError('INVALID_PAYLOAD', 'Input must be an object', undefined),
    ]);
  }

  const obj = input as Record<string, unknown>;

  // Validate fields (except intentId which doesn't exist yet)
  const actorIdError = validateActorId(obj.actorId);
  if (actorIdError) errors.push(actorIdError);

  const goalError = validateGoal(obj.goal);
  if (goalError) errors.push(goalError);

  const constraintsError = validateConstraints(obj.constraints);
  if (constraintsError) errors.push(constraintsError);

  const toneError = validateTone(obj.tone);
  if (toneError) errors.push(toneError);

  const forbiddenError = validateForbidden(obj.forbidden);
  if (forbiddenError) errors.push(forbiddenError);

  const payloadError = validatePayload(obj.payload);
  if (payloadError) errors.push(payloadError);

  if (errors.length > 0) {
    return invalidResult(errors);
  }

  return validResult();
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  FACT_INJECTION_PATTERNS,
  FORBIDDEN_KEYWORDS,
};
