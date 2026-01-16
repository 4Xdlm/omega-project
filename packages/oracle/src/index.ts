/**
 * Oracle Package Exports
 * @module @omega/oracle
 * @description OMEGA Oracle - AI-Powered Emotional Analysis Engine
 */

export {
  type OracleConfig,
  type OracleRequest,
  type OracleResponse,
  type OracleStatus,
  type EmotionalInsight,
  type NarrativeAnalysis,
  type OracleErrorType,
  DEFAULT_CONFIG,
  OracleError,
} from './types';

export { Oracle, createOracle } from './oracle';

export {
  type PromptParams,
  type PromptTemplate,
  createAnalysisPrompt,
  createNarrativePrompt,
  createComparisonPrompt,
  createSummaryPrompt,
  createRecommendationsPrompt,
  getAvailablePromptTypes,
  validatePromptParams,
  estimateTokenCount,
  PROMPT_REGISTRY,
} from './prompts';

export {
  type CacheEntry,
  type CacheConfig,
  type CacheStats,
  OracleCache,
  createCache,
  DEFAULT_CACHE_CONFIG,
} from './cache';

export {
  type StreamChunkType,
  type StreamChunk,
  type StartChunk,
  type TextChunk,
  type InsightChunk,
  type NarrativeChunk,
  type SummaryChunk,
  type ProgressChunk,
  type CompleteChunk,
  type ErrorChunk,
  type OracleStreamChunk,
  type StreamConfig,
  type StreamState,
  type StreamCallbacks,
  StreamController,
  StreamingOracle,
  createStreamingOracle,
  DEFAULT_STREAM_CONFIG,
} from './streaming';

export {
  type ContextEntry,
  type ContextConfig,
  type EmotionTrend,
  type ContextSummary,
  type ComparisonResult,
  OracleContext,
  createContext,
  DEFAULT_CONTEXT_CONFIG,
} from './context';
