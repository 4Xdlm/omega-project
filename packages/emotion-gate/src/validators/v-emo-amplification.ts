/**
 * OMEGA Emotion Gate — V-EMO-AMPLIFICATION Validator
 *
 * Detects toxic amplification loops in emotional sequences.
 * FAIL if oscillating pattern exceeds cycle threshold.
 */

import type {
  EmotionFrame,
  EmotionGateContext,
  EmotionValidatorResult,
  EmotionValidatorId,
  EmotionMetrics,
  EmotionSequence,
} from '../gate/types.js';
import { OMEGA_EMO_AMPLIFICATION_CYCLES } from '../gate/types.js';
import type { EmotionValidator } from './validator-interface.js';
import { passResult, failResult, deferResult } from './validator-interface.js';
import { detectAmplificationLoop, createSafeToxicitySignal } from '../metrics/toxicity-metrics.js';

const VALIDATOR_ID: EmotionValidatorId = 'eval_amplification';
const VALIDATOR_VERSION = '1.0.0';

/**
 * V-EMO-AMPLIFICATION Validator
 *
 * Checks:
 * - No oscillating amplification patterns
 * - Cycles below threshold
 * - No sustained emotional feedback loops
 */
export class VEmoAmplificationValidator implements EmotionValidator {
  readonly id: EmotionValidatorId = VALIDATOR_ID;
  readonly version: string = VALIDATOR_VERSION;
  readonly name = 'Emotion Amplification Validator';
  readonly description = 'Detects toxic amplification loops in emotional sequences';

  private sequence?: EmotionSequence;

  /**
   * Set the sequence context for loop detection.
   */
  setSequence(sequence: EmotionSequence): void {
    this.sequence = sequence;
  }

  evaluate(frame: EmotionFrame, context: EmotionGateContext): EmotionValidatorResult {
    const cycleThreshold = context.calibration[OMEGA_EMO_AMPLIFICATION_CYCLES];

    // No sequence — defer (need more data)
    if (!this.sequence || this.sequence.frames.length < cycleThreshold * 2 + 1) {
      return deferResult(
        this.id,
        this.version,
        'Insufficient sequence data for amplification detection'
      );
    }

    // Detect amplification loop
    const loopPattern = detectAmplificationLoop(this.sequence, context.calibration);

    if (!loopPattern) {
      const metrics: EmotionMetrics = {
        toxicity_signal: createSafeToxicitySignal(),
      };
      return passResult(this.id, this.version, 'No amplification loop detected', metrics);
    }

    // Amplification detected
    const violations: string[] = [
      `Amplification loop detected: ${loopPattern.oscillating_dimensions.length} dimension(s) oscillating`,
      `Cycle length: ${loopPattern.cycle_length} frames`,
      `Amplitude: ${loopPattern.amplitude.toFixed(4)}`,
    ];

    for (const dim of loopPattern.oscillating_dimensions.slice(0, 3)) {
      violations.push(`Oscillating: ${dim}`);
    }

    const metrics: EmotionMetrics = {
      toxicity_signal: {
        amplification_detected: true,
        amplification_cycles: loopPattern.oscillating_dimensions.length,
        loop_pattern: loopPattern,
        instability_score: loopPattern.amplitude,
        contradiction_count: 0,
        unjustified_spikes: 0,
      },
    };

    return failResult(this.id, this.version, violations, metrics);
  }
}

/**
 * Create the amplification validator.
 */
export function createAmplificationValidator(): VEmoAmplificationValidator {
  return new VEmoAmplificationValidator();
}
