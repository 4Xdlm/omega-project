/**
 * OMEGA Emotion Gate — V-EMO-COHERENCE Validator
 *
 * Validates inter-entity emotional coherence.
 * FAIL if entity's emotions are incoherent with related entities.
 */

import type {
  EmotionFrame,
  EmotionGateContext,
  EmotionValidatorResult,
  EmotionValidatorId,
  EmotionStateV2,
} from '../gate/types.js';
import { OMEGA_EMO_COHERENCE_RADIUS, EMOTION_DIMENSIONS } from '../gate/types.js';
import type { EmotionValidator } from './validator-interface.js';
import { passResult, failResult, deferResult } from './validator-interface.js';

const VALIDATOR_ID: EmotionValidatorId = 'eval_coherence';
const VALIDATOR_VERSION = '1.0.0';

/**
 * Compute emotional distance between two states.
 */
function computeEmotionalDistance(a: EmotionStateV2, b: EmotionStateV2): number {
  let sumSquared = 0;
  for (const dim of EMOTION_DIMENSIONS) {
    const delta = a[dim] - b[dim];
    sumSquared += delta * delta;
  }
  return Math.sqrt(sumSquared);
}

/**
 * Check if two emotional states are coherent (similar enough).
 */
function areStatesCoherent(
  a: EmotionStateV2,
  b: EmotionStateV2,
  radius: number
): boolean {
  return computeEmotionalDistance(a, b) <= radius;
}

/**
 * V-EMO-COHERENCE Validator
 *
 * Checks:
 * - Entity's emotions are coherent with related entities
 * - No contradictory emotional states between related entities
 * - Emotional states within coherence radius
 */
export class VEmoCoherenceValidator implements EmotionValidator {
  readonly id: EmotionValidatorId = VALIDATOR_ID;
  readonly version: string = VALIDATOR_VERSION;
  readonly name = 'Emotion Coherence Validator';
  readonly description = 'Validates inter-entity emotional coherence';

  private relatedFrames: Map<string, EmotionFrame> = new Map();

  /**
   * Set related entity frames for coherence check.
   */
  setRelatedFrames(frames: EmotionFrame[]): void {
    this.relatedFrames.clear();
    for (const frame of frames) {
      this.relatedFrames.set(frame.entity_id, frame);
    }
  }

  /**
   * Get related entity frame.
   */
  getRelatedFrame(entityId: string): EmotionFrame | undefined {
    return this.relatedFrames.get(entityId);
  }

  evaluate(frame: EmotionFrame, context: EmotionGateContext): EmotionValidatorResult {
    const coherenceRadius = context.calibration[OMEGA_EMO_COHERENCE_RADIUS];
    const relatedEntities = context.related_entities ?? [];

    // No related entities — pass (nothing to check)
    if (relatedEntities.length === 0) {
      return passResult(this.id, this.version, 'No related entities to check');
    }

    // Check if we have frames for related entities
    const availableRelated = relatedEntities.filter(id => this.relatedFrames.has(id));

    if (availableRelated.length === 0) {
      return deferResult(
        this.id,
        this.version,
        'No related entity frames available for coherence check'
      );
    }

    const violations: string[] = [];
    let coherentCount = 0;

    for (const relatedId of availableRelated) {
      const relatedFrame = this.relatedFrames.get(relatedId);
      if (!relatedFrame) continue;

      const distance = computeEmotionalDistance(
        frame.emotion_state,
        relatedFrame.emotion_state
      );

      if (distance > coherenceRadius) {
        violations.push(
          `Incoherent with entity ${relatedId}: distance ${distance.toFixed(4)} > radius ${coherenceRadius}`
        );

        // Find most different dimensions
        const differences: Array<{ dim: keyof EmotionStateV2; delta: number }> = [];
        for (const dim of EMOTION_DIMENSIONS) {
          const delta = Math.abs(frame.emotion_state[dim] - relatedFrame.emotion_state[dim]);
          if (delta > 0.1) {
            differences.push({ dim, delta });
          }
        }

        differences.sort((a, b) => b.delta - a.delta);
        for (const diff of differences.slice(0, 2)) {
          violations.push(
            `  ${diff.dim}: Δ${diff.delta.toFixed(3)}`
          );
        }
      } else {
        coherentCount++;
      }
    }

    if (violations.length > 0) {
      return failResult(this.id, this.version, violations);
    }

    return passResult(
      this.id,
      this.version,
      `Coherent with ${coherentCount} related entity/entities`
    );
  }
}

/**
 * Create the coherence validator.
 */
export function createCoherenceValidator(): VEmoCoherenceValidator {
  return new VEmoCoherenceValidator();
}
