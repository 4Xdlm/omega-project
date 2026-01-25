/**
 * OMEGA Emotion Gate — Validator Interface
 *
 * Base interface for all emotion validators.
 * All validators are PURE FUNCTIONS — no side effects, no modifications.
 */

import type {
  EmotionFrame,
  EmotionSequence,
  EmotionGateContext,
  EmotionValidatorResult,
  EmotionValidatorId,
  EmotionMetrics,
  ValidatorResultType,
} from '../gate/types.js';

/**
 * Base interface for all emotion validators.
 * Validators OBSERVE and MEASURE — they never modify EmotionV2.
 */
export interface EmotionValidator {
  readonly id: EmotionValidatorId;
  readonly version: string;
  readonly name: string;
  readonly description: string;

  /**
   * Evaluate a single emotion frame.
   * PURE FUNCTION — no side effects, no modification of frame.
   */
  evaluate(frame: EmotionFrame, context: EmotionGateContext): EmotionValidatorResult;
}

/**
 * Extended interface for validators that analyze sequences.
 */
export interface SequenceEmotionValidator extends EmotionValidator {
  /**
   * Evaluate an emotion sequence for patterns.
   * PURE FUNCTION — no side effects, no modification.
   */
  evaluateSequence(sequence: EmotionSequence, context: EmotionGateContext): EmotionValidatorResult;
}

/**
 * Helper to check if a validator supports sequence evaluation.
 */
export function isSequenceValidator(validator: EmotionValidator): validator is SequenceEmotionValidator {
  return 'evaluateSequence' in validator && typeof (validator as SequenceEmotionValidator).evaluateSequence === 'function';
}

/**
 * Create a validator result.
 */
export function createValidatorResult(
  validator_id: EmotionValidatorId,
  validator_version: string,
  result: ValidatorResultType,
  reasons: readonly string[],
  metrics?: EmotionMetrics
): EmotionValidatorResult {
  return {
    validator_id,
    validator_version,
    result,
    reasons,
    metrics,
  };
}

/**
 * Create a PASS result.
 */
export function passResult(
  validator_id: EmotionValidatorId,
  validator_version: string,
  reason: string,
  metrics?: EmotionMetrics
): EmotionValidatorResult {
  return createValidatorResult(validator_id, validator_version, 'PASS', [reason], metrics);
}

/**
 * Create a FAIL result.
 */
export function failResult(
  validator_id: EmotionValidatorId,
  validator_version: string,
  reasons: readonly string[],
  metrics?: EmotionMetrics
): EmotionValidatorResult {
  return createValidatorResult(validator_id, validator_version, 'FAIL', reasons, metrics);
}

/**
 * Create a DEFER result.
 */
export function deferResult(
  validator_id: EmotionValidatorId,
  validator_version: string,
  reasons: readonly string[],
  metrics?: EmotionMetrics
): EmotionValidatorResult {
  return createValidatorResult(validator_id, validator_version, 'DEFER', reasons, metrics);
}
