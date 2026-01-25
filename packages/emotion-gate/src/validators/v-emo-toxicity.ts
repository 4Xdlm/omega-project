/**
 * OMEGA Emotion Gate — V-EMO-TOXICITY Validator
 *
 * Detects toxicity patterns in emotional sequences.
 * FAIL if toxicity signal exceeds threshold.
 */

import type {
  EmotionFrame,
  EmotionGateContext,
  EmotionValidatorResult,
  EmotionValidatorId,
  EmotionMetrics,
  EmotionSequence,
} from '../gate/types.js';
import { OMEGA_EMO_TOXICITY_THRESHOLD } from '../gate/types.js';
import type { EmotionValidator } from './validator-interface.js';
import { passResult, failResult, deferResult } from './validator-interface.js';
import {
  computeToxicitySignal,
  createSafeToxicitySignal,
} from '../metrics/toxicity-metrics.js';

const VALIDATOR_ID: EmotionValidatorId = 'eval_toxicity';
const VALIDATOR_VERSION = '1.0.0';

/**
 * V-EMO-TOXICITY Validator
 *
 * Checks:
 * - Instability score below threshold
 * - No sustained amplification
 * - Contradiction count within limits
 * - No unjustified spikes
 */
export class VEmoToxicityValidator implements EmotionValidator {
  readonly id: EmotionValidatorId = VALIDATOR_ID;
  readonly version: string = VALIDATOR_VERSION;
  readonly name = 'Emotion Toxicity Validator';
  readonly description = 'Detects toxicity patterns in emotional sequences';

  private sequence?: EmotionSequence;

  /**
   * Set the sequence context for toxicity analysis.
   */
  setSequence(sequence: EmotionSequence): void {
    this.sequence = sequence;
  }

  evaluate(frame: EmotionFrame, context: EmotionGateContext): EmotionValidatorResult {
    const toxicityThreshold = context.calibration[OMEGA_EMO_TOXICITY_THRESHOLD];

    // Single frame — no toxicity possible
    if (!this.sequence || this.sequence.frames.length < 2) {
      const metrics: EmotionMetrics = {
        toxicity_signal: createSafeToxicitySignal(),
      };
      return deferResult(this.id, this.version, 'Insufficient data for toxicity analysis', metrics);
    }

    // Compute toxicity signal
    const toxicity = computeToxicitySignal(frame, this.sequence, context.calibration);

    const metrics: EmotionMetrics = {
      toxicity_signal: toxicity,
    };

    const violations: string[] = [];

    // Check amplification
    if (toxicity.amplification_detected) {
      violations.push(
        `Amplification detected: ${toxicity.amplification_cycles} cycle(s)`
      );
      if (toxicity.loop_pattern) {
        violations.push(
          `Loop pattern: ${toxicity.loop_pattern.oscillating_dimensions.join(', ')}`
        );
      }
    }

    // Check instability
    if (toxicity.instability_score > toxicityThreshold) {
      violations.push(
        `Instability score ${toxicity.instability_score.toFixed(4)} exceeds threshold ${toxicityThreshold}`
      );
    }

    // Check contradictions
    const maxContradictions = 3;
    if (toxicity.contradiction_count > maxContradictions) {
      violations.push(
        `Contradiction count ${toxicity.contradiction_count} exceeds max ${maxContradictions}`
      );
    }

    // Check unjustified spikes
    const maxSpikes = 2;
    if (toxicity.unjustified_spikes > maxSpikes) {
      violations.push(
        `Unjustified spikes ${toxicity.unjustified_spikes} exceeds max ${maxSpikes}`
      );
    }

    if (violations.length > 0) {
      return failResult(this.id, this.version, violations, metrics);
    }

    return passResult(
      this.id,
      this.version,
      `Toxicity within bounds (instability: ${toxicity.instability_score.toFixed(4)})`,
      metrics
    );
  }
}

/**
 * Create the toxicity validator.
 */
export function createToxicityValidator(): VEmoToxicityValidator {
  return new VEmoToxicityValidator();
}
