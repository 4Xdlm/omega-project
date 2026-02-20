/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Strategy: Contrast Knife
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * CONTRAST-KNIFE: "Create emotional contrast that wakes up the scene"
 * 
 * Uses:
 * - Transition matrix (valid/forced transitions)
 * - Harmonic wild-card (controlled dissonance)
 * 
 * This strategy introduces deliberate contrast.
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import type { EmotionStateV2, EmotionId } from '../../emotion_v2';
import type { NarrativeContext, Suggestion, Rationale, EmotionShift } from '../types';
import { STRATEGY_IDS } from '../constants';
import type { PRNGState } from '../prng';
import { nextFloat, shuffle } from '../prng';
import { validatePhysics, getEmotionalDistance, getValidPath } from '../physics';
import { fingerprintSuggestion, generateSuggestionId } from '../fingerprint';

// Contrast pairs (from → contrasting emotion)
const CONTRAST_PAIRS: Record<string, string[]> = {
  joy: ['sadness', 'fear', 'anger'],
  sadness: ['joy', 'anger', 'surprise'],
  anger: ['trust', 'joy', 'fear'],
  fear: ['trust', 'pride', 'relief'],
  trust: ['fear', 'anger', 'disgust'],
  surprise: ['anticipation', 'trust'],
  disgust: ['love', 'trust', 'joy'],
  anticipation: ['sadness', 'fear', 'surprise'],
  love: ['anger', 'disgust', 'envy'],
  shame: ['pride', 'joy', 'anger'],
  guilt: ['pride', 'relief', 'anger'],
  envy: ['joy', 'trust', 'pride'],
  pride: ['shame', 'fear', 'sadness'],
  relief: ['fear', 'tension', 'surprise'],
};

export interface ContrastKnifeInput {
  emotion: EmotionStateV2;
  context: NarrativeContext;
  inputHash: string;
  prng: PRNGState;
}

/**
 * Generate Contrast-Knife suggestions
 */
export function generateContrastKnife(input: ContrastKnifeInput): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const dominant = input.emotion.appraisal.emotions[0];
  if (!dominant) return suggestions;
  
  // Get valid contrast emotions
  const contrasts = CONTRAST_PAIRS[dominant.id] ?? ['surprise'];
  const shuffled = shuffle(input.prng, contrasts);
  
  // Generate up to 3 contrast suggestions
  for (const contrastEmotion of shuffled.slice(0, 3)) {
    const suggestion = createContrastSuggestion(
      input,
      dominant.id,
      contrastEmotion as EmotionId
    );
    if (suggestion) suggestions.push(suggestion);
  }
  
  return suggestions;
}

function createContrastSuggestion(
  input: ContrastKnifeInput,
  fromEmotion: string,
  contrastEmotion: EmotionId
): Suggestion | null {
  const dominant = input.emotion.appraisal.emotions[0]!;
  
  // Check path validity
  const path = getValidPath(fromEmotion as EmotionId, contrastEmotion);
  const distance = getEmotionalDistance(fromEmotion as EmotionId, contrastEmotion);
  
  // Strong contrast = high distance
  if (distance < 0.4) return null;
  
  // Validate physics
  const physics = validatePhysics(
    input.emotion,
    contrastEmotion,
    0.6 + nextFloat(input.prng) * 0.2,
    path.valid ? undefined : 'contrast_event'
  );
  
  // Intensity change for contrast (usually moderate)
  const intensityDelta = -0.1 + nextFloat(input.prng) * 0.3;
  
  // Build rationale
  const rationale = buildContrastRationale(
    input,
    contrastEmotion,
    intensityDelta,
    distance,
    path
  );
  
  // Generate content
  const intermediary = path.path.length > 2 ? ` via ${path.path[1]}` : '';
  const content = `Create sharp contrast: ${fromEmotion} → ${contrastEmotion}${intermediary}. ` +
    `Emotional distance: ${(distance * 100).toFixed(0)}%. ` +
    `Use this contrast to heighten ${input.context.scene_goal}.`;
  
  const expectedShift: EmotionShift = {
    from: fromEmotion as EmotionId,
    to: contrastEmotion,
    intensity_delta: intensityDelta,
    transition_type: distance > 0.7 ? 'pivot' : 'forced',
  };
  
  const fingerprint = fingerprintSuggestion(
    STRATEGY_IDS.CONTRAST_KNIFE,
    content,
    undefined,
    { from: fromEmotion, to: contrastEmotion, intensity_delta: intensityDelta },
    rationale
  );
  
  const id = generateSuggestionId(
    STRATEGY_IDS.CONTRAST_KNIFE,
    input.inputHash,
    input.prng.seed,
    fingerprint
  );
  
  return {
    id,
    strategy: STRATEGY_IDS.CONTRAST_KNIFE,
    content,
    expected_shift: expectedShift,
    score: 0,
    confidence: 0.6,
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

function buildContrastRationale(
  input: ContrastKnifeInput,
  contrastEmotion: EmotionId,
  intensityDelta: number,
  distance: number,
  path: { path: EmotionId[]; valid: boolean }
): Rationale {
  const dominant = input.emotion.appraisal.emotions[0]!;
  const activeChars = input.context.characters.filter(c => c.agency_level !== 'none');
  const targetChar = activeChars[0]?.name ?? 'the protagonist';
  
  const contrastType = distance > 0.7 ? 'sharp' : 'moderate';
  
  const drafts: Record<string, string[]> = {
    sharp: [
      `In a heartbeat, ${targetChar}'s world flips from ${dominant.id} to ${contrastEmotion}.`,
      `The ${dominant.id} shatters, replaced by unexpected ${contrastEmotion}.`,
      `${targetChar} is blindsided—${contrastEmotion} crashes in without warning.`,
    ],
    moderate: [
      `${targetChar}'s ${dominant.id} gives way to creeping ${contrastEmotion}.`,
      `Something shifts; ${targetChar} feels ${contrastEmotion} rising beneath the ${dominant.id}.`,
      `The ${dominant.id} fades as ${contrastEmotion} takes hold.`,
    ],
  };
  
  const options = drafts[contrastType];
  const draft = options[Math.floor(nextFloat(input.prng) * options.length)];
  
  return {
    trigger: {
      emotions: [dominant.id],
      intensities: [dominant.weight],
    },
    constraint_check: path.valid 
      ? `Contrast transition is valid; emotional distance ${(distance * 100).toFixed(0)}%`
      : `Requires event trigger for ${contrastType} contrast`,
    mechanism: 'contrast',
    expected_outcome: `${contrastType.charAt(0).toUpperCase() + contrastType.slice(1)} shift to ${contrastEmotion}, Δ=${intensityDelta > 0 ? '+' : ''}${intensityDelta.toFixed(2)}`,
    minimal_draft: draft,
  };
}
