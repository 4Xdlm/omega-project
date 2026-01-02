// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA MYCELIUM — BRIDGE INDEX
// Version: 1.0.0
// ═══════════════════════════════════════════════════════════════════════════════

// Types
export {
  AnalyzeResult,
  AnalyzeResultSchema,
  AnalysisMeta,
  AnalysisMetaSchema,
  EmotionHit,
  EmotionHitSchema,
  KeywordCount,
  KeywordCountSchema,
  OmegaEmotion14D,
  OMEGA_EMOTIONS_14D,
  isOmegaEmotion,
  parseAnalyzeResult,
  safeParseAnalyzeResult
} from './types';

// Bridge
export {
  EmotionVector14D,
  MyceliumBridgeData,
  ZERO_VECTOR_14D,
  buildBridgeData,
  areBridgeDataEqual,
  vectorToArray,
  vectorMagnitude,
  findDominantFromVector,
  clamp,
  deterministicHash
} from './text_analyzer_bridge';
