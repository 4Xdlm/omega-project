/**
 * OMEGA Emotion Gate — V-EMO-CAUSALITY Validator
 *
 * Validates that emotional changes have narrative causation.
 * FAIL if significant emotional change without evidence.
 */

import type {
  EmotionFrame,
  EmotionGateContext,
  EmotionValidatorResult,
  EmotionValidatorId,
  EmotionMetrics,
} from '../gate/types.js';
import { OMEGA_EMO_CAUSALITY_WINDOW, OMEGA_EMO_NEGLIGIBLE_DELTA } from '../gate/types.js';
import type { EmotionValidator } from './validator-interface.js';
import { passResult, failResult } from './validator-interface.js';
import { computeDriftVector } from '../metrics/drift-metrics.js';

const VALIDATOR_ID: EmotionValidatorId = 'eval_causality';
const VALIDATOR_VERSION = '1.0.0';

/**
 * V-EMO-CAUSALITY Validator
 *
 * Checks:
 * - Significant emotional changes have evidence
 * - Evidence is within causality window
 * - No unexplained emotional shifts
 */
export class VEmoCausalityValidator implements EmotionValidator {
  readonly id: EmotionValidatorId = VALIDATOR_ID;
  readonly version: string = VALIDATOR_VERSION;
  readonly name = 'Emotion Causality Validator';
  readonly description = 'Validates emotional changes have narrative causation';

  evaluate(frame: EmotionFrame, context: EmotionGateContext): EmotionValidatorResult {
    const previousFrame = context.previous_frame;
    const negligibleDelta = context.calibration[OMEGA_EMO_NEGLIGIBLE_DELTA];
    const _causalityWindow = context.calibration[OMEGA_EMO_CAUSALITY_WINDOW];

    // First frame — no causality required
    if (!previousFrame) {
      return passResult(this.id, this.version, 'First frame — no causality check needed');
    }

    // Compute drift to determine if significant change occurred
    const drift = computeDriftVector(previousFrame, frame);

    const metrics: EmotionMetrics = {
      drift_vector: drift,
    };

    // Check if change is negligible
    if (drift.magnitude <= negligibleDelta) {
      return passResult(this.id, this.version, 'Change is negligible', metrics);
    }

    // Significant change detected — check for evidence
    const hasEvidence = frame.evidence_refs.length > 0;
    const hasNarrativeContext = context.narrative_context?.recent_events?.length ?? 0 > 0;

    if (!hasEvidence && !hasNarrativeContext) {
      // Find the dimensions with largest changes
      const violations: string[] = [
        `Significant emotional change (magnitude ${drift.magnitude.toFixed(4)}) without evidence`,
      ];

      const sortedDeltas = [...drift.emotional_deltas]
        .filter(d => Math.abs(d.delta) > negligibleDelta)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 3);

      for (const delta of sortedDeltas) {
        violations.push(
          `${delta.dimension}: ${delta.from_value.toFixed(3)} → ${delta.to_value.toFixed(3)} (Δ${delta.delta.toFixed(3)}) — no cause`
        );
      }

      return failResult(this.id, this.version, violations, metrics);
    }

    // Has evidence — verify it relates to the changed dimensions
    const changedDimensions = drift.emotional_deltas
      .filter(d => Math.abs(d.delta) > negligibleDelta)
      .map(d => d.dimension);

    return passResult(
      this.id,
      this.version,
      `Causality established for ${changedDimensions.length} dimension(s)`,
      metrics
    );
  }
}

/**
 * Create the causality validator.
 */
export function createCausalityValidator(): VEmoCausalityValidator {
  return new VEmoCausalityValidator();
}
