/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SEMANTIC EMOTION ANALYZER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: src/semantic/semantic-analyzer.ts
 * Version: 1.2.0 (Sprint 9 Commit 9.3)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SEM-01, ART-SEM-02, ART-SEM-03, ART-SEM-04
 *
 * LLM-based semantic emotion analysis with cache, N-samples, and variance tolerance.
 * Handles negation, irony, mixed emotions via structured JSON.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256 } from '@omega/canon-kernel';
import { analyzeEmotionFromText } from '@omega/omega-forge';
import type { SovereignProvider } from '../types.js';
import type { SemanticEmotionResult, SemanticAnalyzerConfig } from './types.js';
import { DEFAULT_SEMANTIC_CONFIG } from './types.js';
import { buildSemanticPrompt } from './semantic-prompts.js';
import { validateEmotionKeys, clampEmotionValues } from './semantic-validation.js';
import { aggregateSamples, checkVarianceTolerance } from './semantic-aggregation.js';
import { SemanticCache } from './semantic-cache.js';

/**
 * Global singleton cache instance.
 * Shared across all analyzeEmotionSemantic calls.
 */
const globalCache = new SemanticCache(3600); // 1 hour TTL

/**
 * Analyzes emotions in text using LLM semantic understanding.
 * Supports cache, N-samples with median aggregation, and variance tolerance checking.
 *
 * ART-SEM-01: Returns valid 14D JSON with all values [0, 1], no NaN/Infinity.
 * ART-SEM-02: Cache hit → same (text_hash, model_id, prompt_hash) → same result.
 * ART-SEM-03: N-samples median, écart-type < variance_tolerance.
 * ART-SEM-04: Resolves negation correctly (e.g., "pas peur" → fear LOW, not HIGH).
 *
 * @param text - Text to analyze (prose paragraph or full text)
 * @param language - Target language ('fr' or 'en')
 * @param provider - SovereignProvider for LLM calls
 * @param config - Optional configuration (uses defaults if not provided)
 * @returns Promise<SemanticEmotionResult> - 14D emotion state [0, 1]
 *
 * @remarks
 * Pipeline (with cache):
 * 0. Check cache if enabled (early return on hit)
 * 1. Construct prompt with negation/irony instructions
 * 2. Call provider.generateStructuredJSON() N times
 * 3. Parse and validate each response
 * 4. Compute MEDIAN per dimension (variance reduction)
 * 5. Check std deviation < variance_tolerance (warn if exceeded)
 * 6. Store result in cache if enabled
 * 7. Fallback to keywords if any step fails
 *
 * @example
 * ```typescript
 * const result = await analyzeEmotionSemantic(
 *   "Il n'avait pas peur.",
 *   'fr',
 *   provider,
 *   { n_samples: 3, cache_enabled: true }
 * );
 * // First call: LLM + cache store
 * // Second call (same text): cache hit (no LLM)
 * ```
 */
export async function analyzeEmotionSemantic(
  text: string,
  language: 'fr' | 'en',
  provider: SovereignProvider,
  config?: Partial<SemanticAnalyzerConfig>,
): Promise<SemanticEmotionResult> {
  const finalConfig: SemanticAnalyzerConfig = {
    ...DEFAULT_SEMANTIC_CONFIG,
    ...config,
  };

  // Kill switch: if disabled, fallback immediately
  if (!finalConfig.enabled) {
    return fallbackToKeywords(text, language);
  }

  try {
    // Step 0: Check cache if enabled
    const prompt = buildSemanticPrompt(text, language);
    const promptHash = sha256(prompt);
    const modelId = 'sovereign-semantic-v1'; // Fixed model ID for now

    if (finalConfig.cache_enabled) {
      const cacheKey = globalCache.computeCacheKey(text, modelId, promptHash);
      const cached = globalCache.get(cacheKey);
      if (cached) {
        return cached; // Cache hit: early return
      }
    }

    // Step 1: N-samples collection
    const samples: SemanticEmotionResult[] = [];
    for (let i = 0; i < finalConfig.n_samples; i++) {
      const parsed = await provider.generateStructuredJSON(prompt);
      validateEmotionKeys(parsed);
      const clamped = clampEmotionValues(parsed as Record<string, unknown>);
      samples.push(clamped);
    }

    // Step 2: Aggregate (median if N > 1, direct if N = 1)
    const result = aggregateSamples(samples);

    // Step 3: Variance tolerance check
    if (finalConfig.n_samples > 1) {
      checkVarianceTolerance(samples, result, finalConfig.variance_tolerance);
    }

    // Step 4: Store in cache if enabled
    if (finalConfig.cache_enabled) {
      const cacheKey = globalCache.computeCacheKey(text, modelId, promptHash);
      globalCache.set(cacheKey, result);
    }

    return result;
  } catch (error) {
    // Step 5: Fallback to keywords on any failure
    if (finalConfig.fallback_to_keywords) {
      return fallbackToKeywords(text, language);
    }
    throw error;
  }
}

/**
 * Returns cache statistics.
 * Useful for monitoring and debugging.
 *
 * @returns Current cache stats (hits, misses, size)
 */
export function getCacheStats() {
  return globalCache.stats();
}

/**
 * Clears the global cache.
 * Useful for testing and memory management.
 */
export function clearCache() {
  globalCache.clear();
}

/**
 * Fallback to keyword-based emotion analysis.
 * Converts EmotionState14D (omega-forge) to SemanticEmotionResult.
 *
 * @param text - Text to analyze
 * @param language - Target language
 * @returns SemanticEmotionResult using keyword matching
 */
function fallbackToKeywords(text: string, language: 'fr' | 'en'): SemanticEmotionResult {
  const keywordResult = analyzeEmotionFromText(text, language);

  // Convert Readonly<Record<Emotion14, number>> to SemanticEmotionResult
  return {
    joy: keywordResult.joy,
    trust: keywordResult.trust,
    fear: keywordResult.fear,
    surprise: keywordResult.surprise,
    sadness: keywordResult.sadness,
    disgust: keywordResult.disgust,
    anger: keywordResult.anger,
    anticipation: keywordResult.anticipation,
    love: keywordResult.love,
    submission: keywordResult.submission,
    awe: keywordResult.awe,
    disapproval: keywordResult.disapproval,
    remorse: keywordResult.remorse,
    contempt: keywordResult.contempt,
  };
}
