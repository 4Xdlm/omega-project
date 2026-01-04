/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Suggest Index
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Orchestrates all 5 strategies:
 * 1. Beat-Next (gravity + attractors)
 * 2. Tension-Delta (topology + gradient)
 * 3. Contrast-Knife (transitions + wild-card)
 * 4. Reframe-Truth (pivots)
 * 5. Agency-Injection (inertia)
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import type { EmotionStateV2 } from '../../emotion_v2';
import type { NarrativeContext, Suggestion, SuggestMeta, StrategyTrace, Rejection } from '../types';
import { STRATEGY_IDS, MAX_SUGGESTIONS, MIN_SUGGESTIONS, MIN_DISTINCT_TYPES } from '../constants';
import type { StrategyId } from '../constants';
import { createPRNG, type PRNGState } from '../prng';
import { hashSuggestInput } from '../fingerprint';
import { scoreSuggestion, rankSuggestions, filterSurvivors, type ScoringInput } from '../scoring';
import { diversify, ensureTypeVariety, analyzeHarmony } from '../diversity';
import { validatePhysics } from '../physics';

// Import strategies
import { generateBeatNext } from './strat_beat_next';
import { generateTensionDelta } from './strat_tension_delta';
import { generateContrastKnife } from './strat_contrast_knife';
import { generateReframeTruth } from './strat_reframe_truth';
import { generateAgencyInjection } from './strat_agency_injection';

// Re-export strategies
export { generateBeatNext } from './strat_beat_next';
export { generateTensionDelta } from './strat_tension_delta';
export { generateContrastKnife } from './strat_contrast_knife';
export { generateReframeTruth } from './strat_reframe_truth';
export { generateAgencyInjection } from './strat_agency_injection';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SUGGEST FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface SuggestParams {
  emotion: EmotionStateV2;
  context: NarrativeContext;
  seed: number;
  previousSuggestions?: string[];
}

export interface SuggestResult {
  suggestions: Suggestion[];
  meta: SuggestMeta;
  inputHash: string;
}

/**
 * Generate suggestions using all 5 strategies
 * 
 * Pipeline:
 * 1. Generate candidates from each strategy
 * 2. Score all candidates
 * 3. Filter survivors (score/safety/actionability thresholds)
 * 4. Diversify (remove clones)
 * 5. Ensure type variety
 * 6. Analyze harmony
 */
export function suggest(params: SuggestParams): SuggestResult {
  const startTime = Date.now();
  const prng = createPRNG(params.seed);
  const inputHash = hashSuggestInput({
    emotion: params.emotion,
    context: params.context,
    seed: params.seed,
    previous_suggestions: params.previousSuggestions,
  });
  
  // Track strategy execution
  const strategyTraces: StrategyTrace[] = [];
  const allRejections: Rejection[] = [];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Generate candidates from all strategies
  // ═══════════════════════════════════════════════════════════════════════════
  
  const allCandidates: Suggestion[] = [];
  
  const strategyInput = {
    emotion: params.emotion,
    context: params.context,
    inputHash,
    prng,
  };
  
  // Execute each strategy and track results
  const strategies: Array<{
    id: StrategyId;
    generator: (input: typeof strategyInput) => Suggestion[];
  }> = [
    { id: STRATEGY_IDS.BEAT_NEXT, generator: generateBeatNext },
    { id: STRATEGY_IDS.TENSION_DELTA, generator: generateTensionDelta },
    { id: STRATEGY_IDS.CONTRAST_KNIFE, generator: generateContrastKnife },
    { id: STRATEGY_IDS.REFRAME_TRUTH, generator: generateReframeTruth },
    { id: STRATEGY_IDS.AGENCY_INJECTION, generator: generateAgencyInjection },
  ];
  
  for (const { id, generator } of strategies) {
    const candidates = generator(strategyInput);
    
    strategyTraces.push({
      strategy: id,
      candidates_count: candidates.length,
      survivors_count: 0, // Updated after filtering
      best_score: 0,
      worst_score: 0,
      rejection_reasons: [],
    });
    
    allCandidates.push(...candidates);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Score all candidates
  // ═══════════════════════════════════════════════════════════════════════════
  
  const scoredCandidates: Array<{ suggestion: Suggestion; result: ReturnType<typeof scoreSuggestion> }> = [];
  
  for (const candidate of allCandidates) {
    const scoringInput: ScoringInput = {
      content: candidate.content,
      rationale: candidate.rationale,
      targetCharacter: candidate.target_character,
      expectedShift: {
        from: candidate.expected_shift.from,
        to: candidate.expected_shift.to,
        intensity_delta: candidate.expected_shift.intensity_delta,
      },
      currentEmotion: params.emotion,
      context: params.context,
      arc: undefined, // Could be added to params
      physics: candidate.physics,
      existingSuggestions: scoredCandidates
        .filter(sc => sc.result.survives)
        .map(sc => sc.suggestion),
      historySuggestions: params.previousSuggestions,
    };
    
    const result = scoreSuggestion(scoringInput);
    scoredCandidates.push({ suggestion: candidate, result });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Filter survivors
  // ═══════════════════════════════════════════════════════════════════════════
  
  const { survivors, rejections } = filterSurvivors(scoredCandidates);
  
  // Track rejections
  for (const { suggestion, reason } of rejections) {
    allRejections.push({
      suggestion_fingerprint: suggestion.id.substring(0, 16),
      strategy: suggestion.strategy,
      reason: reason.includes('safety') ? 'canon_safety_too_low' :
              reason.includes('actionability') ? 'actionability_too_low' :
              'score_too_low',
      score: suggestion.score,
      detail: reason,
    });
    
    // Update strategy trace
    const trace = strategyTraces.find(t => t.strategy === suggestion.strategy);
    if (trace) {
      trace.rejection_reasons.push(reason);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: Rank and diversify
  // ═══════════════════════════════════════════════════════════════════════════
  
  const ranked = rankSuggestions(survivors);
  const { survivors: diversified, rejected: diversityRejected } = diversify(ranked);
  
  // Track diversity rejections
  for (const { suggestion, similarTo } of diversityRejected) {
    allRejections.push({
      suggestion_fingerprint: suggestion.id.substring(0, 16),
      strategy: suggestion.strategy,
      reason: 'diversity_too_similar',
      score: suggestion.score,
      detail: `Too similar to ${similarTo.substring(0, 8)}`,
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: Ensure type variety
  // ═══════════════════════════════════════════════════════════════════════════
  
  const withVariety = ensureTypeVariety(diversified, ranked, MIN_DISTINCT_TYPES);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6: Final selection and harmony analysis
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Limit to MAX_SUGGESTIONS
  const finalSuggestions = withVariety.slice(0, MAX_SUGGESTIONS);
  
  // Ensure at least MIN_SUGGESTIONS (INV-MUSE-02b)
  // If we have 0, something went wrong - this should be handled by caller
  
  // Analyze harmony
  const harmonicAnalysis = analyzeHarmony(finalSuggestions);
  
  // Update strategy traces with final counts
  for (const trace of strategyTraces) {
    const strategySurvivors = finalSuggestions.filter(s => s.strategy === trace.strategy);
    trace.survivors_count = strategySurvivors.length;
    if (strategySurvivors.length > 0) {
      trace.best_score = Math.max(...strategySurvivors.map(s => s.score));
      trace.worst_score = Math.min(...strategySurvivors.map(s => s.score));
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD RESULT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const meta: SuggestMeta = {
    candidates_generated: allCandidates.length,
    rejections: allRejections,
    strategy_trace: strategyTraces,
    harmonic_analysis: harmonicAnalysis,
    duration_ms: Date.now() - startTime,
  };
  
  return {
    suggestions: finalSuggestions,
    meta,
    inputHash,
  };
}

/**
 * Quick suggest: single strategy for fast results
 */
export function quickSuggest(
  emotion: EmotionStateV2,
  context: NarrativeContext,
  seed: number,
  strategy: StrategyId
): Suggestion[] {
  const prng = createPRNG(seed);
  const inputHash = hashSuggestInput({
    emotion,
    context,
    seed,
  });
  
  const input = { emotion, context, inputHash, prng };
  
  switch (strategy) {
    case STRATEGY_IDS.BEAT_NEXT:
      return generateBeatNext(input);
    case STRATEGY_IDS.TENSION_DELTA:
      return generateTensionDelta(input);
    case STRATEGY_IDS.CONTRAST_KNIFE:
      return generateContrastKnife(input);
    case STRATEGY_IDS.REFRAME_TRUTH:
      return generateReframeTruth(input);
    case STRATEGY_IDS.AGENCY_INJECTION:
      return generateAgencyInjection(input);
    default:
      return [];
  }
}
