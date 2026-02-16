/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SEMANTIC EMOTION ANALYZER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: src/semantic/semantic-analyzer.ts
 * Version: 1.0.0 (Sprint 9 Commit 9.1)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SEM-01, ART-SEM-04
 *
 * LLM-based semantic emotion analysis replacing keyword matching.
 * Handles negation, irony, mixed emotions via structured JSON.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { analyzeEmotionFromText } from '@omega/omega-forge';
import type { SovereignProvider } from '../types.js';
import type { SemanticEmotionResult, SemanticAnalyzerConfig } from './types.js';
import { DEFAULT_SEMANTIC_CONFIG } from './types.js';
import { buildSemanticPrompt } from './semantic-prompts.js';
import { validateEmotionKeys, clampEmotionValues } from './semantic-validation.js';

/**
 * Analyzes emotions in text using LLM semantic understanding.
 * Handles negation, irony, and mixed emotions that keyword matching misses.
 *
 * ART-SEM-01: Returns valid 14D JSON with all values [0, 1], no NaN/Infinity.
 * ART-SEM-04: Resolves negation correctly (e.g., "pas peur" → fear LOW, not HIGH).
 *
 * @param text - Text to analyze (prose paragraph or full text)
 * @param language - Target language ('fr' or 'en')
 * @param provider - SovereignProvider for LLM calls
 * @param config - Optional configuration (uses defaults if not provided)
 * @returns Promise<SemanticEmotionResult> - 14D emotion state [0, 1]
 *
 * @remarks
 * Pipeline:
 * 1. Construct prompt with negation/irony instructions
 * 2. Call provider.generateDraft() for LLM JSON generation
 * 3. Parse JSON response (try/catch)
 * 4. Validate 14 keys present and numeric
 * 5. Clamp values to [0, 1], reject NaN/Infinity
 * 6. Fallback to keyword matching if any step fails
 *
 * @example
 * ```typescript
 * const result = await analyzeEmotionSemantic(
 *   "Il n'avait pas peur.",
 *   'fr',
 *   provider
 * );
 * // result.fear should be < 0.3 (negation resolved)
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
    // Step 1: Construct prompt with negation/irony handling
    const prompt = buildSemanticPrompt(text, language);

    // Step 2: Call LLM via provider.generateDraft()
    const rawResponse = await provider.generateDraft(
      prompt,
      'semantic_analysis',
      'omega-semantic'
    );

    // Step 3: Parse JSON (strict)
    const parsed = JSON.parse(rawResponse);

    // Step 4: Validate structure (14 keys present)
    validateEmotionKeys(parsed);

    // Step 5: Clamp values to [0, 1], reject NaN/Infinity
    const clamped = clampEmotionValues(parsed);

    return clamped;
  } catch (error) {
    // Step 6: Fallback to keywords on any failure
    if (finalConfig.fallback_to_keywords) {
      return fallbackToKeywords(text, language);
    }
    throw error;
  }
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
