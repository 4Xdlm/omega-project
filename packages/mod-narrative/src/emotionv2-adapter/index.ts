/**
 * OMEGA Mod-Narrative — EmotionV2 Adapter Index
 *
 * Exports types and utilities for consuming EmotionV2 analysis.
 * Remember: This module CONSUMES emotions, it does NOT calculate them.
 */

export {
  type EmotionVector14D,
  type EmotionAnalysisResult,
  type EmotionCurvePoint,
  type EmotionCurve,
  type EmotionV2Provider,
  computeEmotionCurve,
  computeEmotionalInertia,
  createNullEmotionVector,
  findDominantEmotion,
  createEmotionV2Adapter,
} from './provider';
