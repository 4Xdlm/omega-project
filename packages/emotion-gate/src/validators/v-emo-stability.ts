/**
 * OMEGA Emotion Gate — V-EMO-STABILITY Validator
 *
 * Validates temporal continuity — no sudden emotional jumps without explanation.
 * FAIL if delta exceeds threshold between consecutive frames.
 */

import type {
  EmotionFrame,
  EmotionGateContext,
  EmotionValidatorResult,
  EmotionValidatorId,
  EmotionMetrics,
} from '../gate/types.js';
import { OMEGA_EMO_STABILITY_THRESHOLD } from '../gate/types.js';
import type { EmotionValidator } from './validator-interface.js';
import { passResult, failResult } from './validator-interface.js';
import { computeDriftVector } from '../metrics/drift-metrics.js';

const VALIDATOR_ID: EmotionValidatorId = 'eval_stability';
const VALIDATOR_VERSION = '1.0.0';

/**
 * V-EMO-STABILITY Validator
 *
 * Checks:
 * - Delta between consecutive frames is within threshold
 * - No sudden emotional jumps
 */
export class VEmoStabilityValidator implements EmotionValidator {
  readonly id: EmotionValidatorId = VALIDATOR_ID;
  readonly version: string = VALIDATOR_VERSION;
  readonly name = 'Emotion Stability Validator';
  readonly description = 'Validates temporal continuity — no sudden emotional jumps';

  evaluate(frame: EmotionFrame, context: EmotionGateContext): EmotionValidatorResult {
    const previousFrame = context.previous_frame;
    const threshold = context.calibration[OMEGA_EMO_STABILITY_THRESHOLD];

    // First frame — always stable (no previous to compare)
    if (!previousFrame) {
      return passResult(this.id, this.version, 'First frame — no previous to compare');
    }

    // Compute drift from previous frame
    const drift = computeDriftVector(previousFrame, frame);

    const metrics: EmotionMetrics = {
      drift_vector: drift,
    };

    // Check if magnitude exceeds threshold
    if (drift.magnitude > threshold) {
      const violations: string[] = [
        `Emotional jump too large: magnitude ${drift.magnitude.toFixed(4)} > threshold ${threshold}`,
      ];

      // List the largest deltas
      const sortedDeltas = [...drift.emotional_deltas]
        .filter(d => Math.abs(d.delta) > 0.01)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 3);

      for (const delta of sortedDeltas) {
        violations.push(
          `${delta.dimension}: ${delta.from_value.toFixed(3)} → ${delta.to_value.toFixed(3)} (Δ${delta.delta.toFixed(3)})`
        );
      }

      return failResult(this.id, this.version, violations, metrics);
    }

    return passResult(this.id, this.version, 'Stable transition', metrics);
  }
}

/**
 * Create the stability validator.
 */
export function createStabilityValidator(): VEmoStabilityValidator {
  return new VEmoStabilityValidator();
}
