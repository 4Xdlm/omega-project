/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Strategy: Tension Delta
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * TENSION-DELTA: "How to increase energy without breaking canon?"
 * 
 * Uses:
 * - Topology (tension surface model)
 * - Gradient (natural tension direction)
 * 
 * This strategy pushes tension UP when appropriate.
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
import { validatePhysics, getTransitionEnablers } from '../physics';
import { fingerprintSuggestion, generateSuggestionId } from '../fingerprint';

// Tension-amplifying emotions
const TENSION_EMOTIONS = ['fear', 'anger', 'anticipation', 'surprise'] as const;

// Tension triggers by emotion
const TENSION_TRIGGERS: Record<string, string[]> = {
  fear: ['threat', 'danger', 'unknown', 'vulnerability', 'loss_risk'],
  anger: ['injustice', 'betrayal', 'obstruction', 'violation', 'frustration'],
  anticipation: ['deadline', 'countdown', 'approaching', 'imminent', 'stakes_raise'],
  surprise: ['revelation', 'twist', 'unexpected', 'discovery', 'shock'],
};

export interface TensionDeltaInput {
  emotion: EmotionStateV2;
  context: NarrativeContext;
  inputHash: string;
  prng: PRNGState;
}

/**
 * Generate Tension-Delta suggestions
 */
export function generateTensionDelta(input: TensionDeltaInput): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const dominant = input.emotion.appraisal.emotions[0];
  if (!dominant) return suggestions;
  
  // Current tension level from dynamics
  const currentTension = input.emotion.dynamics?.volatility ?? 0.5;
  
  // Don't add tension if already maxed
  if (currentTension > 0.85) return suggestions;
  
  // Generate tension suggestions for each tension emotion
  for (const tensionEmotion of TENSION_EMOTIONS) {
    const suggestion = createTensionSuggestion(
      input,
      dominant.id,
      tensionEmotion,
      currentTension
    );
    if (suggestion) suggestions.push(suggestion);
  }
  
  return suggestions;
}

function createTensionSuggestion(
  input: TensionDeltaInput,
  fromEmotion: string,
  tensionEmotion: string,
  currentTension: number
): Suggestion | null {
  const dominant = input.emotion.appraisal.emotions[0]!;
  
  // Pick a trigger
  const triggers = TENSION_TRIGGERS[tensionEmotion] ?? ['conflict'];
  const trigger = triggers[Math.floor(nextFloat(input.prng) * triggers.length)];
  
  // Validate physics with trigger
  const physics = validatePhysics(
    input.emotion,
    tensionEmotion as any,
    Math.min(0.9, dominant.weight + 0.2),
    trigger
  );
  
  // Skip if physics violation in strict mode
  if (!physics.transition_valid && physics.energy_required > 0.9) {
    return null;
  }
  
  // Calculate intensity increase
  const intensityDelta = 0.15 + nextFloat(input.prng) * 0.2;
  
  // Build rationale
  const rationale = buildTensionRationale(
    input,
    tensionEmotion,
    intensityDelta,
    trigger
  );
  
  // Generate content
  const content = `Introduce ${tensionEmotion} via ${trigger}. ` +
    `Raise tension from ${(currentTension * 100).toFixed(0)}% to ${((currentTension + 0.2) * 100).toFixed(0)}%. ` +
    `Scene goal: ${input.context.scene_goal}.`;
  
  const expectedShift: EmotionShift = {
    from: fromEmotion as any,
    to: tensionEmotion as any,
    intensity_delta: intensityDelta,
    transition_type: physics.gravity_score > 0.4 ? 'natural' : 'forced',
  };
  
  const fingerprint = fingerprintSuggestion(
    STRATEGY_IDS.TENSION_DELTA,
    content,
    undefined,
    { from: fromEmotion, to: tensionEmotion, intensity_delta: intensityDelta },
    rationale
  );
  
  const id = generateSuggestionId(
    STRATEGY_IDS.TENSION_DELTA,
    input.inputHash,
    input.prng.seed,
    fingerprint
  );
  
  return {
    id,
    strategy: STRATEGY_IDS.TENSION_DELTA,
    content,
    expected_shift: expectedShift,
    score: 0,
    confidence: 0.7,
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

function buildTensionRationale(
  input: TensionDeltaInput,
  tensionEmotion: string,
  intensityDelta: number,
  trigger: string
): Rationale {
  const dominant = input.emotion.appraisal.emotions[0]!;
  const activeChars = input.context.characters.filter(c => c.agency_level !== 'none');
  const targetChar = activeChars[0]?.name ?? 'the protagonist';
  
  const drafts: Record<string, string> = {
    fear: `${targetChar} realizes the danger is closer than they thought.`,
    anger: `${targetChar}'s patience snaps at the ${trigger}.`,
    anticipation: `The clock ticks down as ${targetChar} braces for impact.`,
    surprise: `A ${trigger} shatters ${targetChar}'s expectations.`,
  };
  
  return {
    trigger: {
      emotions: [dominant.id],
      intensities: [dominant.weight],
    },
    constraint_check: `Tension raise via ${trigger} is canon-safe; maintains style profile`,
    mechanism: 'tension',
    expected_outcome: `Escalate to ${tensionEmotion}, Δ=+${intensityDelta.toFixed(2)}`,
    minimal_draft: drafts[tensionEmotion] ?? `${targetChar} feels ${tensionEmotion} rising.`,
  };
}
