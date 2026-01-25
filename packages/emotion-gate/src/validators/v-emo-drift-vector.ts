/**
 * OMEGA Emotion Gate — V-EMO-DRIFT-VECTOR Validator
 *
 * Measures emotional drift against threshold.
 * FAIL if drift magnitude exceeds threshold.
 */

import type {
  EmotionFrame,
  EmotionGateContext,
  EmotionValidatorResult,
  EmotionValidatorId,
  EmotionMetrics,
} from '../gate/types.js';
import { OMEGA_EMO_DRIFT_THRESHOLD, OMEGA_EMO_DELTA_MAX } from '../gate/types.js';
import type { EmotionValidator } from './validator-interface.js';
import { passResult, failResult } from './validator-interface.js';
import { computeDriftVector, createZeroDriftVector } from '../metrics/drift-metrics.js';

const VALIDATOR_ID: EmotionValidatorId = 'eval_drift_vector';
const VALIDATOR_VERSION = '1.0.0';

/**
 * V-EMO-DRIFT-VECTOR Validator
 *
 * Checks:
 * - Overall drift magnitude below threshold
 * - Individual dimension deltas below max
 * - Acceleration within reasonable bounds
 */
export class VEmoDriftVectorValidator implements EmotionValidator {
  readonly id: EmotionValidatorId = VALIDATOR_ID;
  readonly version: string = VALIDATOR_VERSION;
  readonly name = 'Emotion Drift Vector Validator';
  readonly description = 'Measures emotional drift against threshold';

  evaluate(frame: EmotionFrame, context: EmotionGateContext): EmotionValidatorResult {
    const previousFrame = context.previous_frame;
    const driftThreshold = context.calibration[OMEGA_EMO_DRIFT_THRESHOLD];
    const deltaMax = context.calibration[OMEGA_EMO_DELTA_MAX];

    // First frame — zero drift
    if (!previousFrame) {
      const metrics: EmotionMetrics = {
        drift_vector: createZeroDriftVector(),
      };
      return passResult(this.id, this.version, 'First frame — zero drift', metrics);
    }

    // Compute drift vector
    const drift = computeDriftVector(previousFrame, frame);

    const metrics: EmotionMetrics = {
      drift_vector: drift,
    };

    const violations: string[] = [];

    // Check overall magnitude
    if (drift.magnitude > driftThreshold) {
      violations.push(
        `Drift magnitude ${drift.magnitude.toFixed(4)} exceeds threshold ${driftThreshold}`
      );
    }

    // Check individual dimension deltas
    const maxDeltaDimensions = drift.emotional_deltas
      .filter(d => Math.abs(d.delta) > deltaMax)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    for (const d of maxDeltaDimensions.slice(0, 3)) {
      violations.push(
        `${d.dimension}: delta ${d.delta.toFixed(4)} exceeds max ${deltaMax}`
      );
    }

    // Check acceleration (if high, indicates erratic behavior)
    const accelerationThreshold = driftThreshold * 2;
    if (Math.abs(drift.acceleration) > accelerationThreshold) {
      violations.push(
        `Acceleration ${drift.acceleration.toFixed(4)} exceeds threshold ${accelerationThreshold.toFixed(4)}`
      );
    }

    if (violations.length > 0) {
      return failResult(this.id, this.version, violations, metrics);
    }

    return passResult(
      this.id,
      this.version,
      `Drift within bounds (magnitude: ${drift.magnitude.toFixed(4)})`,
      metrics
    );
  }
}

/**
 * Create the drift vector validator.
 */
export function createDriftVectorValidator(): VEmoDriftVectorValidator {
  return new VEmoDriftVectorValidator();
}
