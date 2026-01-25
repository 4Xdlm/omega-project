/**
 * OMEGA Emotion Gate — V-EMO-BOUNDS Validator
 *
 * Validates that emotion values are within [0, 1] and format is EmotionV2 strict.
 * FAIL if any value is out of bounds or format is invalid.
 */

import type {
  EmotionFrame,
  EmotionGateContext,
  EmotionValidatorResult,
  EmotionValidatorId,
  EmotionStateV2,
} from '../gate/types.js';
import { EMOTION_DIMENSIONS } from '../gate/types.js';
import type { EmotionValidator } from './validator-interface.js';
import { passResult, failResult } from './validator-interface.js';

const VALIDATOR_ID: EmotionValidatorId = 'eval_bounds';
const VALIDATOR_VERSION = '1.0.0';

/**
 * V-EMO-BOUNDS Validator
 *
 * Checks:
 * - All emotion values are numbers
 * - All emotion values are in range [0, 1]
 * - Source field equals 'EmotionV2'
 * - All 14 dimensions are present
 */
export class VEmoBoundsValidator implements EmotionValidator {
  readonly id: EmotionValidatorId = VALIDATOR_ID;
  readonly version: string = VALIDATOR_VERSION;
  readonly name = 'Emotion Bounds Validator';
  readonly description = 'Validates emotion values are within [0, 1] and format is EmotionV2 strict';

  evaluate(frame: EmotionFrame, _context: EmotionGateContext): EmotionValidatorResult {
    const violations: string[] = [];

    // Check source field
    if (frame.source !== 'EmotionV2') {
      violations.push(`Invalid source: expected 'EmotionV2', got '${frame.source}'`);
    }

    // Check all dimensions exist and are valid
    for (const dimension of EMOTION_DIMENSIONS) {
      const value = frame.emotion_state[dimension];

      if (typeof value !== 'number') {
        violations.push(`${dimension}: expected number, got ${typeof value}`);
        continue;
      }

      if (Number.isNaN(value)) {
        violations.push(`${dimension}: value is NaN`);
        continue;
      }

      if (!Number.isFinite(value)) {
        violations.push(`${dimension}: value is not finite`);
        continue;
      }

      if (value < 0) {
        violations.push(`${dimension}: value ${value} is below 0`);
      }

      if (value > 1) {
        violations.push(`${dimension}: value ${value} is above 1`);
      }
    }

    // Check for extra/missing properties
    const stateKeys = Object.keys(frame.emotion_state);
    const expectedKeys = new Set(EMOTION_DIMENSIONS);

    for (const key of stateKeys) {
      if (!expectedKeys.has(key as keyof EmotionStateV2)) {
        violations.push(`Unexpected property: ${key}`);
      }
    }

    if (stateKeys.length !== EMOTION_DIMENSIONS.length) {
      violations.push(`Expected ${EMOTION_DIMENSIONS.length} dimensions, got ${stateKeys.length}`);
    }

    if (violations.length > 0) {
      return failResult(this.id, this.version, violations);
    }

    return passResult(this.id, this.version, 'All bounds valid');
  }
}

/**
 * Check if a value is within valid emotion bounds.
 */
export function isValidEmotionValue(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    !Number.isNaN(value) &&
    value >= 0 &&
    value <= 1
  );
}

/**
 * Check if an emotion state has valid bounds.
 */
export function hasValidBounds(state: EmotionStateV2): boolean {
  for (const dimension of EMOTION_DIMENSIONS) {
    if (!isValidEmotionValue(state[dimension])) {
      return false;
    }
  }
  return true;
}

/**
 * Create the bounds validator.
 */
export function createBoundsValidator(): VEmoBoundsValidator {
  return new VEmoBoundsValidator();
}
