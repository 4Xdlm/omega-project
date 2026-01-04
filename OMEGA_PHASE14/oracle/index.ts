/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — ORACLE Module
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Advanced narrative emotion analyzer (Emotion v2).
 * 
 * @module oracle
 * @version 3.14.0
 */

// Emotion Model v2
export {
  EMOTION_V2_VERSION,
  EMOTION_LABELS,
  EMOTION_FAMILIES,
  EMOTION_TO_FAMILY,
  PLUTCHIK_EMOTIONS,
  calculateAmbiguity,
  validateEmotionStateV2,
  toLegacyPlutchik,
  createNeutralState,
  EmotionValidationError,
} from './emotion_v2.js';

export type {
  EmotionLabel,
  EmotionFamily,
  SignalChannel,
  Polarity,
  Trend,
  NarrativeFunction,
  NarrativeScope,
  Intentionality,
  PlutchikEmotion,
  EmotionSignal,
  EmotionAppraisalItem,
  EmotionAppraisal,
  EmotionDynamics,
  NarrativeRole,
  LegacyPlutchik,
  ModelInfo,
  EmotionStateV2,
} from './emotion_v2.js';

// Prompt Builder
export {
  buildPrompt,
  buildMinimalPrompt,
  buildFullPrompt,
  calculateInputHash,
  splitIntoChunks,
} from './prompt_builder.js';

export type {
  PromptInput,
  BuiltPrompt,
  ChunkInfo,
} from './prompt_builder.js';

// Response Parser
export {
  extractJson,
  parseJson,
  normalizeResponse,
  parseResponse,
  tryParseResponse,
  ParseError,
  NormalizationError,
} from './response_parser.js';

export type {
  NormalizationOptions,
} from './response_parser.js';

// Emotion Cache
export {
  EmotionCache,
  createEmotionCache,
  DEFAULT_CACHE_CONFIG,
} from './emotion_cache.js';

export type {
  CacheConfig,
  CacheStats,
} from './emotion_cache.js';

// Confidence Calibrator
export {
  ConfidenceCalibrator,
  createConfidenceCalibrator,
  DEFAULT_CALIBRATION_CONFIG,
} from './confidence_calibrator.js';

export type {
  CalibrationConfig,
  CalibrationResult,
  CalibrationAdjustment,
} from './confidence_calibrator.js';

// Oracle Engine
export {
  OracleEngine,
  createOracleEngine,
  DEFAULT_ENGINE_CONFIG,
} from './oracle_engine.js';

export type {
  OracleRouter,
  OracleBridge,
  OracleAudit,
  OracleAuditAction,
  OracleEngineConfig,
  AnalyzeInput,
  AnalyzeResult,
} from './oracle_engine.js';
