/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Strategy: Reframe Truth
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * REFRAME-TRUTH: "A micro-reveal or recontextualization that makes everything clearer"
 * 
 * Uses:
 * - Pivot points (topology)
 * - Revelation triggers
 * 
 * This strategy changes meaning without changing events.
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import type { EmotionStateV2, EmotionId } from '../../emotion_v2';
import type { NarrativeContext, Suggestion, Rationale, EmotionShift } from '../types';
import { STRATEGY_IDS } from '../constants';
import type { PRNGState } from '../prng';
import { nextFloat, pickOne } from '../prng';
import { validatePhysics } from '../physics';
import { fingerprintSuggestion, generateSuggestionId } from '../fingerprint';

// Reframe types and their emotional outcomes
const REFRAME_TYPES = {
  reveal_motive: {
    description: 'Reveal hidden motivation',
    outcomes: ['surprise', 'anger', 'trust', 'fear'],
    triggers: ['secret exposed', 'confession', 'evidence found'],
  },
  reveal_context: {
    description: 'New context changes meaning',
    outcomes: ['surprise', 'relief', 'guilt', 'shame'],
    triggers: ['backstory revealed', 'timeline shift', 'perspective change'],
  },
  reveal_stakes: {
    description: 'True stakes become clear',
    outcomes: ['fear', 'anticipation', 'anger', 'love'],
    triggers: ['consequence unveiled', 'cost revealed', 'price known'],
  },
  reveal_identity: {
    description: 'Identity or relationship truth',
    outcomes: ['surprise', 'joy', 'sadness', 'anger'],
    triggers: ['true identity', 'connection revealed', 'deception exposed'],
  },
  recontextualize: {
    description: 'Same facts, new meaning',
    outcomes: ['relief', 'guilt', 'pride', 'shame'],
    triggers: ['reinterpretation', 'new lens', 'understanding shifts'],
  },
} as const;

type ReframeType = keyof typeof REFRAME_TYPES;

export interface ReframeTruthInput {
  emotion: EmotionStateV2;
  context: NarrativeContext;
  inputHash: string;
  prng: PRNGState;
}

/**
 * Generate Reframe-Truth suggestions
 */
export function generateReframeTruth(input: ReframeTruthInput): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const dominant = input.emotion.appraisal.emotions[0];
  if (!dominant) return suggestions;
  
  // Select appropriate reframe types based on current state
  const reframeTypes = selectReframeTypes(input.prng, dominant.id);
  
  for (const reframeType of reframeTypes) {
    const suggestion = createReframeSuggestion(input, reframeType);
    if (suggestion) suggestions.push(suggestion);
  }
  
  return suggestions;
}

function selectReframeTypes(prng: PRNGState, currentEmotion: string): ReframeType[] {
  const allTypes: ReframeType[] = Object.keys(REFRAME_TYPES) as ReframeType[];
  
  // Weight selection based on current emotion
  const weighted: ReframeType[] = [];
  
  for (const type of allTypes) {
    const outcomes = REFRAME_TYPES[type].outcomes;
    // Add multiple times if outcomes don't include current (= more contrast)
    if (!outcomes.includes(currentEmotion as typeof outcomes[number])) {
      weighted.push(type, type);
    } else {
      weighted.push(type);
    }
  }
  
  // Pick 2-3 types
  const selected: ReframeType[] = [];
  const used = new Set<ReframeType>();
  
  while (selected.length < 3 && weighted.length > 0) {
    const idx = Math.floor(nextFloat(prng) * weighted.length);
    const type = weighted[idx];
    if (!used.has(type)) {
      selected.push(type);
      used.add(type);
    }
    weighted.splice(idx, 1);
  }
  
  return selected;
}

function createReframeSuggestion(
  input: ReframeTruthInput,
  reframeType: ReframeType
): Suggestion | null {
  const dominant = input.emotion.appraisal.emotions[0]!;
  const reframeConfig = REFRAME_TYPES[reframeType];
  
  // Pick outcome emotion
  const outcomeIdx = Math.floor(nextFloat(input.prng) * reframeConfig.outcomes.length);
  const targetEmotion = reframeConfig.outcomes[outcomeIdx] as EmotionId;
  
  // Pick trigger
  const triggerIdx = Math.floor(nextFloat(input.prng) * reframeConfig.triggers.length);
  const trigger = reframeConfig.triggers[triggerIdx];
  
  // Validate physics
  const physics = validatePhysics(
    input.emotion,
    targetEmotion,
    0.5 + nextFloat(input.prng) * 0.3,
    'revelation'
  );
  
  // Intensity delta (reveals often moderate the current emotion)
  const intensityDelta = -0.15 + nextFloat(input.prng) * 0.25;
  
  // Build rationale
  const rationale = buildReframeRationale(
    input,
    reframeType,
    targetEmotion,
    trigger,
    intensityDelta
  );
  
  // Generate content
  const content = `${reframeConfig.description}: use "${trigger}" to shift toward ${targetEmotion}. ` +
    `This reframes the current ${dominant.id} by adding context. ` +
    `Scene impact: ${input.context.scene_goal}.`;
  
  const expectedShift: EmotionShift = {
    from: dominant.id,
    to: targetEmotion,
    intensity_delta: intensityDelta,
    transition_type: 'pivot',
  };
  
  const fingerprint = fingerprintSuggestion(
    STRATEGY_IDS.REFRAME_TRUTH,
    content,
    undefined,
    { from: dominant.id, to: targetEmotion, intensity_delta: intensityDelta },
    rationale
  );
  
  const id = generateSuggestionId(
    STRATEGY_IDS.REFRAME_TRUTH,
    input.inputHash,
    input.prng.seed,
    fingerprint
  );
  
  return {
    id,
    strategy: STRATEGY_IDS.REFRAME_TRUTH,
    content,
    expected_shift: expectedShift,
    score: 0,
    confidence: 0.65,
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

function buildReframeRationale(
  input: ReframeTruthInput,
  reframeType: ReframeType,
  targetEmotion: EmotionId,
  trigger: string,
  intensityDelta: number
): Rationale {
  const dominant = input.emotion.appraisal.emotions[0]!;
  const activeChars = input.context.characters.filter(c => c.agency_level !== 'none');
  const targetChar = activeChars[0]?.name ?? 'the protagonist';
  
  const draftTemplates: Record<ReframeType, string[]> = {
    reveal_motive: [
      `"I did it because..." — and suddenly ${targetChar} understands everything.`,
      `The real reason surfaces, and ${targetChar}'s ${dominant.id} transforms to ${targetEmotion}.`,
    ],
    reveal_context: [
      `${targetChar} learns what happened before, and the ${dominant.id} makes sense now.`,
      `With this new context, ${targetChar} sees the situation differently.`,
    ],
    reveal_stakes: [
      `${targetChar} finally understands what's truly at risk.`,
      `The cost becomes clear: ${targetChar}'s ${dominant.id} sharpens into ${targetEmotion}.`,
    ],
    reveal_identity: [
      `The truth about who they really are changes everything for ${targetChar}.`,
      `${targetChar} discovers the connection they never suspected.`,
    ],
    recontextualize: [
      `Same facts, but ${targetChar} now sees them through new eyes.`,
      `Nothing changed—except how ${targetChar} understands it all.`,
    ],
  };
  
  const templates = draftTemplates[reframeType];
  const draft = templates[Math.floor(nextFloat(input.prng) * templates.length)];
  
  return {
    trigger: {
      emotions: [dominant.id],
      intensities: [dominant.weight],
    },
    constraint_check: `Revelation "${trigger}" is canon-compatible; no constraint violation`,
    mechanism: 'reveal',
    expected_outcome: `Pivot to ${targetEmotion} via ${reframeType}, Δ=${intensityDelta > 0 ? '+' : ''}${intensityDelta.toFixed(2)}`,
    minimal_draft: draft,
  };
}
