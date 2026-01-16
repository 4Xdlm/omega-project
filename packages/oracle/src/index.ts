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
