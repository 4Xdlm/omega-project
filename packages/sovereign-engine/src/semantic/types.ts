/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SEMANTIC ANALYZER TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: src/semantic/types.ts
 * Version: 1.0.0 (Sprint 9 Commit 9.1)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SEM-01
 *
 * Types for LLM-based semantic emotion analysis (Plutchik 14D).
 * Replaces keyword matching with structured JSON LLM output.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Semantic emotion analysis result (Plutchik 14-dimensional space).
 * Each value represents emotion intensity in [0, 1].
 *
 * ART-SEM-01: All values MUST be numeric [0, 1], never NaN or Infinity.
 *
 * @remarks
 * - joy, trust, fear, surprise, sadness, disgust, anger, anticipation: Plutchik 8 primary
 * - love, submission, awe, disapproval, remorse, contempt: Plutchik 6 secondary
 */
export interface SemanticEmotionResult {
  readonly joy: number;
  readonly trust: number;
  readonly fear: number;
  readonly surprise: number;
  readonly sadness: number;
  readonly disgust: number;
  readonly anger: number;
  readonly anticipation: number;
  readonly love: number;
  readonly submission: number;
  readonly awe: number;
  readonly disapproval: number;
  readonly remorse: number;
  readonly contempt: number;
}

/**
 * Cache key for semantic analysis results.
 * Deterministic: same (text, model, prompt) → same cache key.
 *
 * ART-SEM-02: Cache MUST use (text_hash + model_id + prompt_hash) tuple.
 *
 * @remarks
 * - text_hash: SHA-256 of analyzed text
 * - model_id: LLM model identifier (e.g., 'claude-sonnet-4-20250514')
 * - prompt_hash: SHA-256 of analysis prompt template
 */
export interface SemanticCacheKey {
  readonly text_hash: string;
  readonly model_id: string;
  readonly prompt_hash: string;
}

/**
 * Configuration for semantic emotion analyzer.
 * All fields have production-ready defaults.
 *
 * @remarks
 * - enabled: Global kill switch (DEFAULT: true)
 * - fallback_to_keywords: Use keyword matching if LLM fails (DEFAULT: true)
 * - cache_enabled: Enable result caching (DEFAULT: true, reserved for 9.3)
 * - cache_ttl_seconds: Cache time-to-live (DEFAULT: 3600)
 * - n_samples: Number of LLM calls for variance reduction (DEFAULT: 1)
 * - variance_tolerance: Max std deviation across samples (DEFAULT: 5.0)
 * - min_improvement_threshold: Min score gain to accept correction (DEFAULT: 2.0)
 */
export interface SemanticAnalyzerConfig {
  readonly enabled: boolean;
  readonly fallback_to_keywords: boolean;
  readonly cache_enabled: boolean;
  readonly cache_ttl_seconds: number;
  readonly n_samples: number;
  readonly variance_tolerance: number;
  readonly min_improvement_threshold: number;
}

/**
 * Default configuration for semantic analyzer.
 * Production-ready defaults per ART roadmap specification.
 */
export const DEFAULT_SEMANTIC_CONFIG: SemanticAnalyzerConfig = {
  enabled: true,
  fallback_to_keywords: true,
  cache_enabled: true,
  cache_ttl_seconds: 3600,
  n_samples: 1,
  variance_tolerance: 5.0,
  min_improvement_threshold: 2.0,
};
