/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Strategy: Beat Next
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * BEAT-NEXT: "What's the next natural beat given the emotional state?"
 * 
 * Uses:
 * - Gravity (natural emotional trajectories)
 * - Attractors (where the narrative wants to go)
 * 
 * This strategy follows the path of least resistance.
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import type { EmotionStateV2 } from '../../emotion_v2';
import type {
  NarrativeContext,
  Suggestion,
  Rationale,
  EmotionShift,
} from '../types';
import { STRATEGY_IDS } from '../constants';
import type { PRNGState } from '../prng';
import { nextFloat, pickOne } from '../prng';
import {
  calculateNaturalTrajectory,
  getAttractions,
  getGravitationalPath,
  findActiveAttractors,
  validatePhysics,
} from '../physics';
import { fingerprintSuggestion, generateSuggestionId } from '../fingerprint';

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface BeatNextInput {
  emotion: EmotionStateV2;
  context: NarrativeContext;
  inputHash: string;
  prng: PRNGState;
}

/**
 * Generate Beat-Next suggestions
 * Follows natural emotional trajectory via gravity
 */
export function generateBeatNext(input: BeatNextInput): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  const dominant = input.emotion.appraisal.emotions[0];
  if (!dominant) return suggestions;
  
  // Get emotional history for attractor detection
  const emotionHistory = input.emotion.appraisal.emotions.map(e => e.id);
  
  // 1. Calculate natural trajectory
  const trajectory = calculateNaturalTrajectory(dominant.id, dominant.weight);
  if (trajectory) {
    const suggestion = createBeatSuggestion(
      input,
      trajectory.emotion,
      trajectory.probability,
      'follow_gravity',
      `Natural emotional flow from ${dominant.id} toward ${trajectory.emotion}`
    );
    if (suggestion) suggestions.push(suggestion);
  }
  
  // 2. Check active attractors
  const attractors = findActiveAttractors(dominant.id, emotionHistory);
  for (const attractor of attractors.slice(0, 2)) {
    const suggestion = createBeatSuggestion(
      input,
      attractor.emotion,
      attractor.strength,
      'attractor_pull',
      `${attractor.type} attractor pulling toward ${attractor.emotion}`
    );
    if (suggestion) suggestions.push(suggestion);
  }
  
  // 3. Secondary attractions
  const attractions = getAttractions(dominant.id);
  for (const attraction of attractions.slice(0, 2)) {
    if (suggestions.some(s => s.expected_shift.to === attraction.emotion)) continue;
    
    const suggestion = createBeatSuggestion(
      input,
      attraction.emotion,
      attraction.strength * 0.8,
      'secondary_attraction',
      `Secondary attraction from ${dominant.id} to ${attraction.emotion}`
    );
    if (suggestion) suggestions.push(suggestion);
  }
  
  return suggestions;
}

/**
 * Create a beat suggestion
 */
function createBeatSuggestion(
  input: BeatNextInput,
  targetEmotion: string,
  probability: number,
  beatType: string,
  description: string
): Suggestion | null {
  const dominant = input.emotion.appraisal.emotions[0];
  if (!dominant) return null;
  
  // Validate physics
  const physics = validatePhysics(
    input.emotion,
    targetEmotion as any,
    dominant.weight * 0.9
  );
  
  // Calculate intensity delta
  const intensityDelta = calculateIntensityDelta(
    input.prng,
    dominant.weight,
    targetEmotion,
    beatType
  );
  
  // Build rationale
  const rationale = buildBeatRationale(
    input,
    targetEmotion,
    intensityDelta,
    beatType
  );
  
  // Generate content
  const content = generateBeatContent(
    input.context,
    dominant.id,
    targetEmotion,
    beatType
  );
  
  const expectedShift: EmotionShift = {
    from: dominant.id,
    to: targetEmotion as any,
    intensity_delta: intensityDelta,
    transition_type: physics.gravity_score > 0.5 ? 'natural' : 'forced',
  };
  
  // Generate fingerprint and ID
  const fingerprint = fingerprintSuggestion(
    STRATEGY_IDS.BEAT_NEXT,
    content,
    undefined,
    { from: dominant.id, to: targetEmotion, intensity_delta: intensityDelta },
    rationale
  );
  
  const id = generateSuggestionId(
    STRATEGY_IDS.BEAT_NEXT,
    input.inputHash,
    input.prng.seed,
    fingerprint
  );
  
  return {
    id,
    strategy: STRATEGY_IDS.BEAT_NEXT,
    content,
    expected_shift: expectedShift,
    score: 0, // Will be calculated by scoring module
    confidence: Math.min(0.95, probability),
    rationale,
    score_breakdown: {
      actionability: 0,
      context_fit: 0,
      emotional_leverage: 0,
      novelty: 0,
      canon_safety: 0,
      arc_alignment: 0,
    },
    physics,
  };
}

/**
 * Calculate appropriate intensity delta
 */
function calculateIntensityDelta(
  prng: PRNGState,
  currentIntensity: number,
  targetEmotion: string,
  beatType: string
): number {
  // Base delta depends on beat type
  let baseDelta = 0;
  
  switch (beatType) {
    case 'follow_gravity':
      // Natural flow = small adjustment
      baseDelta = -0.1 + nextFloat(prng) * 0.15;
      break;
    case 'attractor_pull':
      // Moving toward resolution = decrease
      baseDelta = -0.15 + nextFloat(prng) * 0.1;
      break;
    case 'secondary_attraction':
      // Secondary = medium adjustment
      baseDelta = -0.05 + nextFloat(prng) * 0.2;
      break;
  }
  
  // Ensure we don't go below 0 or above 1
  const newIntensity = Math.max(0.1, Math.min(0.95, currentIntensity + baseDelta));
  return newIntensity - currentIntensity;
}

/**
 * Build structured rationale for beat suggestion
 */
function buildBeatRationale(
  input: BeatNextInput,
  targetEmotion: string,
  intensityDelta: number,
  beatType: string
): Rationale {
  const dominant = input.emotion.appraisal.emotions[0]!;
  const secondary = input.emotion.appraisal.emotions[1];
  
  // Pick a character for the minimal draft
  const activeChars = input.context.characters.filter(c => c.agency_level !== 'none');
  const targetChar = activeChars[0]?.name ?? 'the protagonist';
  
  return {
    trigger: {
      emotions: secondary 
        ? [dominant.id, secondary.id] 
        : [dominant.id],
      intensities: secondary 
        ? [dominant.weight, secondary.weight] 
        : [dominant.weight],
    },
    constraint_check: `Beat follows natural gravity from ${dominant.id}; no constraint violation`,
    mechanism: intensityDelta < 0 ? 'resolution' : 'tension',
    expected_outcome: `Shift toward ${targetEmotion} with Δ=${intensityDelta.toFixed(2)}`,
    minimal_draft: generateMinimalDraft(targetChar, dominant.id, targetEmotion, beatType),
  };
}

/**
 * Generate minimal draft (1-sentence execution example)
 */
function generateMinimalDraft(
  character: string,
  fromEmotion: string,
  toEmotion: string,
  beatType: string
): string {
  const templates: Record<string, string[]> = {
    follow_gravity: [
      `${character}'s ${fromEmotion} begins to settle, making room for ${toEmotion}.`,
      `As the moment passes, ${character} feels ${toEmotion} taking over.`,
      `The ${fromEmotion} ebbs, replaced by a quiet ${toEmotion}.`,
    ],
    attractor_pull: [
      `${character} reaches a turning point, ${toEmotion} finally within reach.`,
      `Everything has been leading to this: ${character} embraces ${toEmotion}.`,
      `The narrative arc bends toward ${toEmotion} as ${character} lets go.`,
    ],
    secondary_attraction: [
      `${character}'s ${fromEmotion} transforms subtly into ${toEmotion}.`,
      `A shift occurs: ${character} moves from ${fromEmotion} toward ${toEmotion}.`,
      `The emotional landscape changes as ${toEmotion} emerges for ${character}.`,
    ],
  };
  
  const options = templates[beatType] ?? templates.follow_gravity;
  // Deterministic selection based on character name
  const index = character.charCodeAt(0) % options.length;
  return options[index];
}

/**
 * Generate content description
 */
function generateBeatContent(
  context: NarrativeContext,
  fromEmotion: string,
  toEmotion: string,
  beatType: string
): string {
  const beatDescriptions: Record<string, string> = {
    follow_gravity: `Allow natural emotional flow from ${fromEmotion} to ${toEmotion}`,
    attractor_pull: `Move toward narrative resolution with ${toEmotion}`,
    secondary_attraction: `Introduce subtle shift toward ${toEmotion}`,
  };
  
  const baseContent = beatDescriptions[beatType] ?? `Transition to ${toEmotion}`;
  return `${baseContent}. Scene: ${context.scene_goal}. Current beat: ${context.current_beat}.`;
}
