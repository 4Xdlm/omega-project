/**
 * OMEGA V2.1 — Chunking Module Index
 *
 * Sprint V2.1 implementation complete + calibration framework 2026-05-26
 */

export * from './types.js';
export {
  chunkAdaptive,
  isAdaptiveModeReady,
  getAdaptivePipelineStatus,
} from './adaptive.js';
export type { AdaptivePipelineStatus } from './adaptive.js';
export { EmotionalArcDetector, DEFAULT_DETECTOR_CONFIG } from './detector/emotionalArc.js';
export type { EmotionalArcDetectorConfig } from './detector/emotionalArc.js';
export { ChunkBoundaryOptimizer } from './optimizer/boundary.js';
export type { BoundaryOptimizerConfig } from './optimizer/boundary.js';
export {
  splitSentences,
  countWords,
  cumulativeWordCounts,
  totalWords,
} from './detector/sentences.js';
export {
  extractFeatures,
  extractVAKOG,
  extractBodyBinding,
  extractSentiment,
  extractConcreteness,
  extractPunctuationDensity,
  featureDistance,
  featureIntensity,
  determineDominantEmotion,
  tokenize,
} from './detector/features.js';
export {
  computeArcBreakage,
  computeLengthVariance,
  computeDiscontinuity,
  computeTotalCost,
  computeCostBreakdown,
} from './optimizer/cost.js';
export type { CostBreakdown } from './optimizer/cost.js';
export * from './calibration/index.js';
