/**
 * OMEGA V4.4 — Phase 5: Boussole Émotionnelle
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * 4 directions based on dominant emotion:
 * - N (Nord): Construction - Joy, Hope, Love, Serenity
 * - S (Sud): Dissolution - Sadness, Depression, Void
 * - E (Est): Tension/Action - Anger, Desire, Jealousy
 * - O (Ouest): Retreat/Protection - Fear, Anxiety, Shame
 */

import type { CompassDirection, EmotionId } from '../phase1_contract/index.js';
import type { DirectionClassification } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// EMOTION TO DIRECTION MAPPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * North (Construction) emotions
 */
const NORTH_EMOTIONS: ReadonlySet<string> = new Set([
  'JOIE', 'ESPOIR', 'AMOUR', 'SERENITE',
]);

/**
 * South (Dissolution) emotions
 */
const SOUTH_EMOTIONS: ReadonlySet<string> = new Set([
  'TRISTESSE', 'DEUIL', 'NOSTALGIE', 'ENNUI',
]);

/**
 * East (Tension/Action) emotions
 */
const EAST_EMOTIONS: ReadonlySet<string> = new Set([
  'COLERE', 'HAINE', 'TERREUR', 'SURPRISE',
]);

/**
 * West (Retreat/Protection) emotions
 */
const WEST_EMOTIONS: ReadonlySet<string> = new Set([
  'PEUR', 'ANXIETE', 'CULPABILITE', 'DEGOUT',
]);

// ═══════════════════════════════════════════════════════════════════════════
// BOUSSOLE CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Boussole Émotionnelle - Direction classifier
 */
export class BoussoleEmotionnelle {
  /**
   * Get direction for a single emotion
   */
  getDirection(emotion: string): CompassDirection {
    if (NORTH_EMOTIONS.has(emotion)) return 'N';
    if (SOUTH_EMOTIONS.has(emotion)) return 'S';
    if (EAST_EMOTIONS.has(emotion)) return 'E';
    if (WEST_EMOTIONS.has(emotion)) return 'O';

    // Default to neutral (South for unknown)
    return 'S';
  }

  /**
   * Classify based on dominant emotion with confidence
   */
  classify(dominantEmotion: string, intensity: number): DirectionClassification {
    const direction = this.getDirection(dominantEmotion);

    // Confidence based on intensity
    const confidence = Math.min(1, intensity / 100);

    return {
      direction,
      dominantEmotion,
      confidence,
    };
  }

  /**
   * Get weighted direction from multiple emotions
   */
  getWeightedDirection(
    emotions: ReadonlyMap<EmotionId, { intensity: number }>
  ): DirectionClassification {
    const directionScores: Record<CompassDirection, number> = {
      N: 0,
      S: 0,
      E: 0,
      O: 0,
    };

    let maxIntensity = 0;
    let dominantEmotion = 'SERENITE';

    for (const [emotion, data] of emotions) {
      const direction = this.getDirection(emotion);
      directionScores[direction] += data.intensity;

      if (data.intensity > maxIntensity) {
        maxIntensity = data.intensity;
        dominantEmotion = emotion;
      }
    }

    // Find dominant direction
    let maxScore = 0;
    let dominantDirection: CompassDirection = 'S';

    for (const [dir, score] of Object.entries(directionScores) as Array<[CompassDirection, number]>) {
      if (score > maxScore) {
        maxScore = score;
        dominantDirection = dir;
      }
    }

    // Calculate confidence
    const totalScore = Object.values(directionScores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? maxScore / totalScore : 0;

    return {
      direction: dominantDirection,
      dominantEmotion,
      confidence,
    };
  }

  /**
   * Calculate angular distance between directions
   */
  getAngularDistance(dir1: CompassDirection, dir2: CompassDirection): number {
    if (dir1 === dir2) return 0;

    const order: CompassDirection[] = ['N', 'E', 'S', 'O'];
    const idx1 = order.indexOf(dir1);
    const idx2 = order.indexOf(dir2);

    const diff = Math.abs(idx1 - idx2);
    return Math.min(diff, 4 - diff) * 90;
  }
}
