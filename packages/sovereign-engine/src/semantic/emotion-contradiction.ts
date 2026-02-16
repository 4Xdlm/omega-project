/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — EMOTION CONTRADICTION DETECTOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: src/semantic/emotion-contradiction.ts
 * Version: 1.0.0 (Sprint 9 Commit 9.4)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SEM-05
 *
 * Detects contradictory emotional states in semantic analysis results.
 * Contradiction = 2+ emotions with intensity > threshold (default: 0.4).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SemanticEmotionResult, EmotionContradiction } from './types.js';

/**
 * Default threshold for contradiction detection.
 * Emotions above this intensity are considered "active".
 */
const DEFAULT_CONTRADICTION_THRESHOLD = 0.4;

/**
 * 14 Plutchik emotion keys for iteration.
 */
const EMOTION_14_KEYS: ReadonlyArray<keyof SemanticEmotionResult> = [
  'joy', 'trust', 'fear', 'surprise', 'sadness',
  'disgust', 'anger', 'anticipation', 'love', 'submission',
  'awe', 'disapproval', 'remorse', 'contempt',
] as const;

/**
 * Emotion labels in French for instruction generation.
 */
const EMOTION_LABELS_FR: Record<keyof SemanticEmotionResult, string> = {
  joy: 'joie',
  trust: 'confiance',
  fear: 'peur',
  surprise: 'surprise',
  sadness: 'tristesse',
  disgust: 'dégoût',
  anger: 'colère',
  anticipation: 'anticipation',
  love: 'amour',
  submission: 'soumission',
  awe: 'admiration',
  disapproval: 'désapprobation',
  remorse: 'remords',
  contempt: 'mépris',
};

/**
 * Detects contradictory emotional states in semantic analysis results.
 * ART-SEM-05: Contradiction = 2+ emotions > threshold.
 *
 * @param result - Semantic emotion analysis result (14D)
 * @param threshold - Intensity threshold for "active" emotions (default: 0.4)
 * @returns Array of detected contradictions (empty if none)
 *
 * @remarks
 * Algorithm:
 * 1. Filter emotions > threshold
 * 2. If 2+ active emotions → contradiction
 * 3. Generate pairwise contradictions (all combinations)
 * 4. Generate instruction_fr for each pair
 *
 * @example
 * ```typescript
 * const result = { joy: 0.5, sadness: 0.6, fear: 0.1, ... };
 * const contradictions = detectContradictions(result);
 * // Returns: [{ emotions: ['joy', 'sadness'], intensities: [0.5, 0.6], instruction_fr: '...' }]
 * ```
 */
export function detectContradictions(
  result: SemanticEmotionResult,
  threshold: number = DEFAULT_CONTRADICTION_THRESHOLD,
): EmotionContradiction[] {
  // Step 1: Collect active emotions (intensity > threshold)
  const activeEmotions: Array<{ emotion: keyof SemanticEmotionResult; intensity: number }> = [];

  for (const emotion of EMOTION_14_KEYS) {
    const intensity = result[emotion];
    if (intensity > threshold) {
      activeEmotions.push({ emotion, intensity });
    }
  }

  // Step 2: If less than 2 active emotions, no contradiction
  if (activeEmotions.length < 2) {
    return [];
  }

  // Step 3: Generate pairwise contradictions
  const contradictions: EmotionContradiction[] = [];

  for (let i = 0; i < activeEmotions.length; i++) {
    for (let j = i + 1; j < activeEmotions.length; j++) {
      const emotion1 = activeEmotions[i];
      const emotion2 = activeEmotions[j];

      const instruction_fr = buildContradictionInstruction(
        emotion1.emotion,
        emotion1.intensity,
        emotion2.emotion,
        emotion2.intensity,
      );

      contradictions.push({
        emotions: [emotion1.emotion, emotion2.emotion],
        intensities: [emotion1.intensity, emotion2.intensity],
        instruction_fr,
      });
    }
  }

  return contradictions;
}

/**
 * Builds a French instruction describing the contradiction.
 * Format: "Contradiction émotionnelle : {emotion1} ({intensity1}%) et {emotion2} ({intensity2}%)."
 *
 * @param emotion1 - First emotion
 * @param intensity1 - First emotion intensity [0, 1]
 * @param emotion2 - Second emotion
 * @param intensity2 - Second emotion intensity [0, 1]
 * @returns French instruction string
 */
function buildContradictionInstruction(
  emotion1: keyof SemanticEmotionResult,
  intensity1: number,
  emotion2: keyof SemanticEmotionResult,
  intensity2: number,
): string {
  const label1 = EMOTION_LABELS_FR[emotion1];
  const label2 = EMOTION_LABELS_FR[emotion2];
  const percent1 = (intensity1 * 100).toFixed(0);
  const percent2 = (intensity2 * 100).toFixed(0);

  return `Contradiction émotionnelle : ${label1} (${percent1}%) et ${label2} (${percent2}%).`;
}
