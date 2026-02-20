/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Strategy: Agency Injection
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * AGENCY-INJECTION: "Give power (or take it away) from the right character"
 * 
 * Uses:
 * - Inertia (resistance to change)
 * - Character state (agency levels)
 * 
 * This strategy shifts control dynamics.
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import type { EmotionStateV2, EmotionId } from '../../emotion_v2';
import type {
  NarrativeContext,
  CharacterState,
  Suggestion,
  Rationale,
  EmotionShift,
} from '../types';
import { STRATEGY_IDS } from '../constants';
import type { PRNGState } from '../prng';
import { nextFloat, shuffle } from '../prng';
import { validatePhysics, calculateInertia, predictResistance } from '../physics';
import { fingerprintSuggestion, generateSuggestionId } from '../fingerprint';

// Agency actions
const AGENCY_ACTIONS = {
  empower: {
    description: 'Give character power/control',
    emotions: ['pride', 'anticipation', 'joy', 'trust'],
    verbs: ['decides', 'takes control', 'steps up', 'claims', 'asserts'],
  },
  disempower: {
    description: 'Remove character control',
    emotions: ['fear', 'sadness', 'shame', 'anger'],
    verbs: ['loses grip', 'is forced', 'surrenders', 'fails', 'is overwhelmed'],
  },
  transfer: {
    description: 'Shift power between characters',
    emotions: ['surprise', 'anger', 'fear', 'anticipation'],
    verbs: ['yields to', 'is overtaken by', 'passes control to', 'is supplanted by'],
  },
  restore: {
    description: 'Return power to rightful owner',
    emotions: ['relief', 'pride', 'joy', 'trust'],
    verbs: ['reclaims', 'recovers', 'regains', 'reasserts', 'returns to'],
  },
} as const;

type AgencyAction = keyof typeof AGENCY_ACTIONS;

export interface AgencyInjectionInput {
  emotion: EmotionStateV2;
  context: NarrativeContext;
  inputHash: string;
  prng: PRNGState;
}

/**
 * Generate Agency-Injection suggestions
 */
export function generateAgencyInjection(input: AgencyInjectionInput): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const dominant = input.emotion.appraisal.emotions[0];
  if (!dominant) return suggestions;
  
  const characters = input.context.characters;
  if (characters.length === 0) return suggestions;
  
  // Analyze character agency states
  const analysis = analyzeAgencyStates(characters);
  
  // Generate appropriate agency suggestions
  const actions = selectAgencyActions(input.prng, analysis, dominant.id);
  
  for (const { action, character } of actions) {
    const suggestion = createAgencySuggestion(input, action, character);
    if (suggestion) suggestions.push(suggestion);
  }
  
  return suggestions;
}

interface AgencyAnalysis {
  passiveCharacters: CharacterState[];
  activeCharacters: CharacterState[];
  stagnantCharacters: CharacterState[]; // Active but not doing much
}

function analyzeAgencyStates(characters: CharacterState[]): AgencyAnalysis {
  return {
    passiveCharacters: characters.filter(c => 
      c.agency_level === 'none' || c.agency_level === 'low'
    ),
    activeCharacters: characters.filter(c => 
      c.agency_level === 'high' || c.agency_level === 'medium'
    ),
    stagnantCharacters: characters.filter(c => 
      c.agency_level !== 'none' && c.beats_since_action > 3
    ),
  };
}

function selectAgencyActions(
  prng: PRNGState,
  analysis: AgencyAnalysis,
  currentEmotion: string
): Array<{ action: AgencyAction; character: CharacterState }> {
  const result: Array<{ action: AgencyAction; character: CharacterState }> = [];
  
  // Empower passive characters
  for (const char of analysis.passiveCharacters.slice(0, 2)) {
    result.push({ action: 'empower', character: char });
  }
  
  // Disempower over-active characters (if needed for drama)
  if (analysis.activeCharacters.length > 0 && nextFloat(prng) > 0.5) {
    const char = analysis.activeCharacters[0];
    result.push({ action: 'disempower', character: char });
  }
  
  // Restore stagnant characters
  for (const char of analysis.stagnantCharacters.slice(0, 1)) {
    result.push({ action: 'restore', character: char });
  }
  
  // Transfer if we have both passive and active
  if (analysis.passiveCharacters.length > 0 && analysis.activeCharacters.length > 0) {
    result.push({ 
      action: 'transfer', 
      character: analysis.passiveCharacters[0] 
    });
  }
  
  // Shuffle and limit
  return shuffle(prng, result).slice(0, 3);
}

function createAgencySuggestion(
  input: AgencyInjectionInput,
  action: AgencyAction,
  character: CharacterState
): Suggestion | null {
  const dominant = input.emotion.appraisal.emotions[0]!;
  const actionConfig = AGENCY_ACTIONS[action];
  
  // Select target emotion
  const emotionIdx = Math.floor(nextFloat(input.prng) * actionConfig.emotions.length);
  const targetEmotion = actionConfig.emotions[emotionIdx] as EmotionId;
  
  // Select verb
  const verbIdx = Math.floor(nextFloat(input.prng) * actionConfig.verbs.length);
  const verb = actionConfig.verbs[verbIdx];
  
  // Calculate resistance (inertia-based)
  const resistance = predictResistance(input.emotion, targetEmotion);
  
  // Validate physics
  const physics = validatePhysics(
    input.emotion,
    targetEmotion,
    0.5 + nextFloat(input.prng) * 0.3,
    action === 'empower' ? 'agency_gain' : 'agency_loss'
  );
  
  // Intensity delta based on action type
  let intensityDelta: number;
  switch (action) {
    case 'empower':
    case 'restore':
      intensityDelta = 0.1 + nextFloat(input.prng) * 0.15;
      break;
    case 'disempower':
      intensityDelta = -0.1 + nextFloat(input.prng) * 0.1;
      break;
    case 'transfer':
      intensityDelta = -0.05 + nextFloat(input.prng) * 0.2;
      break;
  }
  
  // Build rationale
  const rationale = buildAgencyRationale(
    input,
    action,
    character,
    targetEmotion,
    verb,
    intensityDelta
  );
  
  // Generate content
  const content = `${actionConfig.description}: ${character.name} ${verb}. ` +
    `This shifts emotional state toward ${targetEmotion}. ` +
    `Character was ${character.agency_level} agency, ${character.beats_since_action} beats since action.`;
  
  const expectedShift: EmotionShift = {
    from: dominant.id,
    to: targetEmotion,
    intensity_delta: intensityDelta,
    transition_type: physics.inertia_respected ? 'natural' : 'forced',
  };
  
  const fingerprint = fingerprintSuggestion(
    STRATEGY_IDS.AGENCY_INJECTION,
    content,
    character.name,
    { from: dominant.id, to: targetEmotion, intensity_delta: intensityDelta },
    rationale
  );
  
  const id = generateSuggestionId(
    STRATEGY_IDS.AGENCY_INJECTION,
    input.inputHash,
    input.prng.seed,
    fingerprint
  );
  
  return {
    id,
    strategy: STRATEGY_IDS.AGENCY_INJECTION,
    content,
    target_character: character.name,
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

function buildAgencyRationale(
  input: AgencyInjectionInput,
  action: AgencyAction,
  character: CharacterState,
  targetEmotion: EmotionId,
  verb: string,
  intensityDelta: number
): Rationale {
  const dominant = input.emotion.appraisal.emotions[0]!;
  
  const draftTemplates: Record<AgencyAction, string[]> = {
    empower: [
      `${character.name} finally ${verb}—the moment they've been waiting for.`,
      `Something shifts in ${character.name}; they ${verb} with unexpected force.`,
    ],
    disempower: [
      `${character.name} ${verb}, control slipping away.`,
      `The power ${character.name} held ${verb} before their eyes.`,
    ],
    transfer: [
      `${character.name} ${verb} as the balance of power shifts.`,
      `Authority passes: ${character.name} ${verb}.`,
    ],
    restore: [
      `${character.name} ${verb} what was always theirs.`,
      `At last, ${character.name} ${verb}, standing tall once more.`,
    ],
  };
  
  const templates = draftTemplates[action];
  const draft = templates[Math.floor(nextFloat(input.prng) * templates.length)];
  
  return {
    trigger: {
      emotions: [dominant.id, character.emotional_state],
      intensities: [dominant.weight, 0.5],
    },
    constraint_check: `Agency ${action} for ${character.name} is narratively justified; ` +
      `character was ${character.agency_level} for ${character.beats_since_action} beats`,
    mechanism: 'agency',
    expected_outcome: `${character.name} ${action}s, emotional shift to ${targetEmotion}, ` +
      `Δ=${intensityDelta > 0 ? '+' : ''}${intensityDelta.toFixed(2)}`,
    minimal_draft: draft,
  };
}
