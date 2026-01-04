/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Scoring
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SCORING MULTI-AXE — The secret of "justesse"
 * 
 * Each suggestion receives a global score calculated on 6 OBJECTIVE axes:
 * 
 * 1. Actionability (A): Can you write it NOW?
 * 2. Context Fit (C): Matches scene_goal, current_beat, constraints
 * 3. Emotional Leverage (E): Exploits dominant + secondary emotions
 * 4. Novelty (N): Different from others + history
 * 5. Canon Safety (S): Risk of violation (1 = safe)
 * 6. Arc Alignment (R): Coherent with NarrativeArc
 * 
 * Formula: score = 0.22A + 0.20C + 0.18E + 0.16N + 0.14S + 0.10R
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import {
  SCORING_WEIGHTS,
  MIN_SCORE_TO_SURVIVE,
  MIN_CANON_SAFETY,
  MIN_ACTIONABILITY,
  CONFIDENCE_CAP,
} from './constants';
import type {
  Suggestion,
  ScoreBreakdown,
  NarrativeContext,
  NarrativeArc,
  Rationale,
  PhysicsCompliance,
} from './types';
import type { EmotionStateV2 } from '../emotion_v2';

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScoringInput {
  /** Raw suggestion content */
  content: string;
  /** Structured rationale */
  rationale: Rationale;
  /** Target character (if any) */
  targetCharacter?: string;
  /** Expected emotional shift */
  expectedShift: { from: string; to: string; intensity_delta: number };
  /** Current emotion state */
  currentEmotion: EmotionStateV2;
  /** Narrative context */
  context: NarrativeContext;
  /** Narrative arc (if available) */
  arc?: NarrativeArc;
  /** Physics compliance data */
  physics: PhysicsCompliance;
  /** Previous suggestions (for novelty check) */
  existingSuggestions: Suggestion[];
  /** Historical suggestions (for novelty check) */
  historySuggestions?: string[];
}

export interface ScoringResult {
  /** Final score (0-1) */
  score: number;
  /** Confidence (0-0.95) */
  confidence: number;
  /** Breakdown by axis */
  breakdown: ScoreBreakdown;
  /** Whether suggestion survives filtering */
  survives: boolean;
  /** Rejection reason if doesn't survive */
  rejectionReason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AXIS CALCULATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Actionability (A): Can you write it NOW?
 * 
 * High score if:
 * - Content is specific (not vague)
 * - minimal_draft is concrete
 * - Target is clear
 * - Mechanism is explicit
 */
function calculateActionability(input: ScoringInput): number {
  let score = 0.5; // Base
  
  // Content specificity: longer, more specific = better
  const contentLength = input.content.length;
  if (contentLength > 100) score += 0.15;
  else if (contentLength > 50) score += 0.1;
  else if (contentLength < 20) score -= 0.15;
  
  // Minimal draft presence and quality
  const draft = input.rationale.minimal_draft;
  if (draft && draft.length > 30) score += 0.2;
  else if (draft && draft.length > 15) score += 0.1;
  else score -= 0.2;
  
  // Target character specified
  if (input.targetCharacter) score += 0.1;
  
  // Mechanism is clear
  if (input.rationale.mechanism) score += 0.1;
  
  // Expected outcome is specific
  if (input.rationale.expected_outcome.length > 20) score += 0.05;
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Context Fit (C): Matches scene_goal, current_beat, constraints
 */
function calculateContextFit(input: ScoringInput): number {
  let score = 0.5;
  
  const content = input.content.toLowerCase();
  const context = input.context;
  
  // Scene goal alignment (simple keyword matching)
  const goalWords = context.scene_goal.toLowerCase().split(/\s+/);
  const goalMatches = goalWords.filter(w => w.length > 3 && content.includes(w)).length;
  score += Math.min(0.2, goalMatches * 0.05);
  
  // Beat alignment
  const beatWords = context.current_beat.toLowerCase().split(/\s+/);
  const beatMatches = beatWords.filter(w => w.length > 3 && content.includes(w)).length;
  score += Math.min(0.15, beatMatches * 0.05);
  
  // Constraint violation check
  for (const constraint of context.constraints) {
    if (content.includes(constraint.toLowerCase())) {
      score -= 0.3; // Heavy penalty for constraint violation
    }
  }
  
  // Character relevance
  const activeCharacters = context.characters.filter(c => c.agency_level !== 'none');
  if (input.targetCharacter) {
    const isActive = activeCharacters.some(c => 
      c.name.toLowerCase() === input.targetCharacter?.toLowerCase() ||
      c.id === input.targetCharacter
    );
    if (isActive) score += 0.1;
    else score -= 0.1;
  }
  
  // Style profile match
  const mechanism = input.rationale.mechanism;
  if (context.style_profile.tone === 'dark' && ['reveal', 'tension'].includes(mechanism)) {
    score += 0.05;
  }
  if (context.style_profile.tone === 'light' && ['resolution', 'agency'].includes(mechanism)) {
    score += 0.05;
  }
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Emotional Leverage (E): Exploits dominant + secondary emotions
 */
function calculateEmotionalLeverage(input: ScoringInput): number {
  let score = 0.4;
  
  const currentEmotions = input.currentEmotion.appraisal.emotions;
  const trigger = input.rationale.trigger;
  
  if (currentEmotions.length === 0) return 0.5;
  
  const dominant = currentEmotions[0];
  const secondary = currentEmotions[1];
  
  // Check if trigger emotions match current state
  for (const triggerEmotion of trigger.emotions) {
    if (triggerEmotion === dominant.id) {
      score += 0.25;
    } else if (secondary && triggerEmotion === secondary.id) {
      score += 0.15;
    } else if (currentEmotions.some(e => e.id === triggerEmotion)) {
      score += 0.1;
    }
  }
  
  // Intensity alignment
  const dominantIntensity = dominant.weight;
  const triggerIntensity = trigger.intensities[0] ?? 0.5;
  const intensityMatch = 1 - Math.abs(dominantIntensity - triggerIntensity);
  score += intensityMatch * 0.1;
  
  // Physics gravity bonus
  if (input.physics.gravity_score > 0.6) {
    score += 0.1;
  }
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Novelty (N): Different from others + history
 */
function calculateNovelty(input: ScoringInput): number {
  let score = 0.8; // Start high, deduct for similarities
  
  const content = input.content.toLowerCase();
  const mechanism = input.rationale.mechanism;
  
  // Check against existing suggestions
  for (const existing of input.existingSuggestions) {
    // Same mechanism penalty
    if (existing.rationale.mechanism === mechanism) {
      score -= 0.15;
    }
    
    // Content similarity (simple word overlap)
    const existingWords = new Set(existing.content.toLowerCase().split(/\s+/));
    const contentWords = content.split(/\s+/);
    const overlap = contentWords.filter(w => w.length > 3 && existingWords.has(w)).length;
    if (overlap > 3) score -= 0.2;
    
    // Same target character
    if (existing.target_character && existing.target_character === input.targetCharacter) {
      score -= 0.1;
    }
  }
  
  // Check against history
  if (input.historySuggestions) {
    for (const hist of input.historySuggestions) {
      const histWords = new Set(hist.toLowerCase().split(/\s+/));
      const contentWords = content.split(/\s+/);
      const overlap = contentWords.filter(w => w.length > 3 && histWords.has(w)).length;
      if (overlap > 5) score -= 0.15;
    }
  }
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Canon Safety (S): Risk of violation (1 = safe)
 */
function calculateCanonSafety(input: ScoringInput): number {
  let score = 1.0; // Start safe
  
  // Physics violations
  if (!input.physics.transition_valid) {
    score -= 0.4;
  }
  if (!input.physics.inertia_respected) {
    score -= 0.2;
  }
  if (input.physics.target_type === 'repulsor') {
    score -= 0.3;
  }
  if (input.physics.energy_required > 0.8) {
    score -= 0.15;
  }
  
  // Gravity penalty for unnatural transitions
  if (input.physics.gravity_score < 0.3) {
    score -= 0.2;
  }
  
  // Constraint check
  const content = input.content.toLowerCase();
  for (const constraint of input.context.constraints) {
    if (content.includes(constraint.toLowerCase())) {
      score -= 0.5;
    }
  }
  
  // Style violations
  const style = input.context.style_profile;
  const intensityDelta = Math.abs(input.expectedShift.intensity_delta);
  if (intensityDelta > style.intensity_range[1]) {
    score -= 0.15;
  }
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Arc Alignment (R): Coherent with NarrativeArc
 */
function calculateArcAlignment(input: ScoringInput): number {
  if (!input.arc) return 0.5; // No arc = neutral
  
  let score = 0.5;
  const arc = input.arc;
  
  // Target emotion alignment
  const expectedTo = input.expectedShift.to;
  if (expectedTo === arc.target_emotion) {
    score += 0.3;
  }
  
  // Progress-appropriate suggestion
  const progress = arc.progress;
  const mechanism = input.rationale.mechanism;
  
  // Early arc: tension building appropriate
  if (progress < 0.3 && mechanism === 'tension') {
    score += 0.15;
  }
  // Mid arc: contrast and reveal appropriate
  if (progress >= 0.3 && progress < 0.7 && ['contrast', 'reveal'].includes(mechanism)) {
    score += 0.15;
  }
  // Late arc: resolution and agency appropriate
  if (progress >= 0.7 && ['resolution', 'agency'].includes(mechanism)) {
    score += 0.2;
  }
  
  // Arc type alignment
  if (arc.type === 'rise' && input.expectedShift.intensity_delta > 0) {
    score += 0.1;
  }
  if (arc.type === 'fall' && input.expectedShift.intensity_delta < 0) {
    score += 0.1;
  }
  
  // Stakes alignment
  if (arc.stakes === 'high' || arc.stakes === 'critical') {
    if (mechanism === 'tension' || mechanism === 'contrast') {
      score += 0.1;
    }
  }
  
  return Math.max(0, Math.min(1, score));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCORING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate full score for a suggestion
 * Returns score, breakdown, and survival status
 */
export function scoreSuggestion(input: ScoringInput): ScoringResult {
  // Calculate all axes
  const actionability = calculateActionability(input);
  const contextFit = calculateContextFit(input);
  const emotionalLeverage = calculateEmotionalLeverage(input);
  const novelty = calculateNovelty(input);
  const canonSafety = calculateCanonSafety(input);
  const arcAlignment = calculateArcAlignment(input);
  
  const breakdown: ScoreBreakdown = {
    actionability,
    context_fit: contextFit,
    emotional_leverage: emotionalLeverage,
    novelty,
    canon_safety: canonSafety,
    arc_alignment: arcAlignment,
  };
  
  // Apply weights
  const score =
    SCORING_WEIGHTS.actionability * actionability +
    SCORING_WEIGHTS.context_fit * contextFit +
    SCORING_WEIGHTS.emotional_leverage * emotionalLeverage +
    SCORING_WEIGHTS.novelty * novelty +
    SCORING_WEIGHTS.canon_safety * canonSafety +
    SCORING_WEIGHTS.arc_alignment * arcAlignment;
  
  // Calculate confidence based on score consistency
  const scores = [actionability, contextFit, emotionalLeverage, novelty, canonSafety, arcAlignment];
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  // High variance = low confidence
  const confidence = Math.min(CONFIDENCE_CAP, score * (1 - stdDev));
  
  // Check survival
  let survives = true;
  let rejectionReason: string | undefined;
  
  if (canonSafety < MIN_CANON_SAFETY) {
    survives = false;
    rejectionReason = `Canon safety too low: ${canonSafety.toFixed(2)} < ${MIN_CANON_SAFETY}`;
  } else if (actionability < MIN_ACTIONABILITY) {
    survives = false;
    rejectionReason = `Actionability too low: ${actionability.toFixed(2)} < ${MIN_ACTIONABILITY}`;
  } else if (score < MIN_SCORE_TO_SURVIVE) {
    survives = false;
    rejectionReason = `Score too low: ${score.toFixed(2)} < ${MIN_SCORE_TO_SURVIVE}`;
  }
  
  return {
    score: Math.max(0, Math.min(1, score)),
    confidence: Math.max(0, Math.min(CONFIDENCE_CAP, confidence)),
    breakdown,
    survives,
    rejectionReason,
  };
}

/**
 * Rank suggestions by score (stable sort)
 */
export function rankSuggestions(suggestions: Suggestion[]): Suggestion[] {
  return [...suggestions].sort((a, b) => {
    // Primary: score (descending)
    if (Math.abs(a.score - b.score) > 0.001) {
      return b.score - a.score;
    }
    // Tie-breaker: ID (stable)
    return a.id.localeCompare(b.id);
  });
}

/**
 * Filter suggestions by survival criteria
 */
export function filterSurvivors(
  results: Array<{ suggestion: Suggestion; result: ScoringResult }>
): { survivors: Suggestion[]; rejections: Array<{ suggestion: Suggestion; reason: string }> } {
  const survivors: Suggestion[] = [];
  const rejections: Array<{ suggestion: Suggestion; reason: string }> = [];
  
  for (const { suggestion, result } of results) {
    if (result.survives) {
      survivors.push({
        ...suggestion,
        score: result.score,
        confidence: result.confidence,
        score_breakdown: result.breakdown,
      });
    } else {
      rejections.push({
        suggestion,
        reason: result.rejectionReason ?? 'Unknown',
      });
    }
  }
  
  return { survivors, rejections };
}
