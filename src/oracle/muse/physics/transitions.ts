/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Physics: Transitions
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NARRATIVE PHYSICS — Not all emotional transitions are valid.
 * 
 * Some transitions are:
 * - NATURAL: Can happen without explicit trigger (gravity assists)
 * - TRIGGERED: Require a narrative event to justify
 * - FORBIDDEN: Cannot happen directly (must go through intermediary)
 * 
 * INV-MUSE-11: Every suggestion must produce a valid transition
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import type { EmotionId } from '../emotion_v2';

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TransitionType = 'natural' | 'triggered' | 'forbidden';

export interface TransitionRule {
  from: EmotionId;
  to: EmotionId;
  type: TransitionType;
  /** Minimum intensity delta to justify this transition (for triggered) */
  minIntensityDelta?: number;
  /** Required intermediary emotion (for forbidden) */
  intermediary?: EmotionId;
  /** Narrative triggers that can enable this transition */
  enablers?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITION MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Transition rules for all emotion pairs
 * Default: triggered (requires justification)
 * 
 * Format: TRANSITIONS[from][to] = type | rule
 */
export const TRANSITIONS: Record<EmotionId, Partial<Record<EmotionId, TransitionType | TransitionRule>>> = {
  joy: {
    trust: 'natural',
    anticipation: 'natural',
    love: 'natural',
    pride: 'natural',
    fear: { type: 'triggered', enablers: ['threat', 'loss_risk', 'vulnerability'] },
    sadness: { type: 'triggered', enablers: ['loss', 'disappointment', 'ending'] },
    anger: { type: 'forbidden', intermediary: 'surprise' },
    disgust: { type: 'forbidden', intermediary: 'surprise' },
    shame: { type: 'triggered', enablers: ['revelation', 'mistake', 'caught'] },
    guilt: { type: 'triggered', enablers: ['realization', 'consequence'] },
    surprise: 'natural',
    relief: 'natural',
    envy: { type: 'forbidden', intermediary: 'sadness' },
  },
  
  sadness: {
    relief: 'natural',
    love: 'natural',
    trust: 'natural',
    anticipation: { type: 'triggered', enablers: ['hope', 'possibility', 'support'] },
    joy: { type: 'triggered', enablers: ['resolution', 'reunion', 'gift'] },
    anger: 'natural', // Grief can turn to anger
    fear: 'natural',
    shame: 'natural',
    guilt: 'natural',
    surprise: 'natural',
    disgust: { type: 'triggered', enablers: ['betrayal_reveal', 'truth'] },
    pride: { type: 'forbidden', intermediary: 'anticipation' },
    envy: 'natural',
  },
  
  anger: {
    shame: 'natural', // Aftermath of outburst
    guilt: 'natural',
    relief: { type: 'triggered', enablers: ['catharsis', 'resolution', 'apology'] },
    sadness: 'natural',
    fear: { type: 'triggered', enablers: ['consequence', 'realization'] },
    disgust: 'natural',
    pride: { type: 'triggered', enablers: ['victory', 'righteousness'] },
    surprise: 'natural',
    joy: { type: 'forbidden', intermediary: 'relief' },
    trust: { type: 'forbidden', intermediary: 'relief' },
    love: { type: 'forbidden', intermediary: 'shame' },
    anticipation: { type: 'triggered', enablers: ['plan', 'revenge'] },
    envy: 'natural',
  },
  
  fear: {
    relief: 'natural', // Threat passes
    trust: { type: 'triggered', enablers: ['protection', 'rescue', 'proof'] },
    anger: 'natural', // Fight response
    sadness: 'natural',
    surprise: 'natural',
    anticipation: { type: 'triggered', enablers: ['preparation', 'plan'] },
    joy: { type: 'forbidden', intermediary: 'relief' },
    pride: { type: 'forbidden', intermediary: 'relief' },
    love: { type: 'triggered', enablers: ['protection', 'comfort'] },
    shame: 'natural',
    guilt: { type: 'triggered', enablers: ['caused_harm', 'failure'] },
    disgust: 'natural',
    envy: { type: 'forbidden', intermediary: 'sadness' },
  },
  
  trust: {
    love: 'natural',
    joy: 'natural',
    relief: 'natural',
    anticipation: 'natural',
    pride: 'natural',
    fear: { type: 'triggered', enablers: ['threat', 'warning', 'risk'] },
    anger: { type: 'triggered', enablers: ['betrayal', 'violation'] },
    sadness: { type: 'triggered', enablers: ['loss', 'separation'] },
    shame: { type: 'triggered', enablers: ['revelation', 'mistake'] },
    guilt: { type: 'triggered', enablers: ['realization', 'consequence'] },
    surprise: 'natural',
    disgust: { type: 'forbidden', intermediary: 'anger' },
    envy: { type: 'forbidden', intermediary: 'sadness' },
  },
  
  surprise: {
    // Surprise is a PIVOT — can transition to almost anything
    joy: 'natural',
    fear: 'natural',
    anger: 'natural',
    sadness: 'natural',
    trust: 'natural',
    disgust: 'natural',
    anticipation: 'natural',
    love: 'natural',
    pride: 'natural',
    shame: 'natural',
    guilt: 'natural',
    relief: 'natural',
    envy: 'natural',
  },
  
  disgust: {
    anger: 'natural',
    fear: 'natural',
    shame: 'natural',
    sadness: 'natural',
    surprise: 'natural',
    relief: { type: 'triggered', enablers: ['removal', 'cleaning', 'escape'] },
    trust: { type: 'forbidden', intermediary: 'relief' },
    joy: { type: 'forbidden', intermediary: 'relief' },
    love: { type: 'forbidden', intermediary: 'relief' },
    pride: { type: 'forbidden', intermediary: 'anger' },
    anticipation: { type: 'triggered', enablers: ['plan', 'revenge'] },
    guilt: 'natural',
    envy: { type: 'forbidden', intermediary: 'sadness' },
  },
  
  anticipation: {
    joy: 'natural', // Fulfillment
    fear: 'natural', // Anxiety
    relief: 'natural',
    trust: 'natural',
    surprise: 'natural',
    sadness: 'natural', // Disappointment
    anger: { type: 'triggered', enablers: ['frustration', 'obstacle'] },
    shame: { type: 'triggered', enablers: ['failure', 'revelation'] },
    guilt: { type: 'triggered', enablers: ['consequence', 'realization'] },
    love: 'natural',
    pride: 'natural',
    disgust: { type: 'triggered', enablers: ['reveal', 'truth'] },
    envy: 'natural',
  },
  
  love: {
    trust: 'natural',
    joy: 'natural',
    fear: 'natural', // Fear of loss
    sadness: 'natural', // Love enables grief
    anticipation: 'natural',
    pride: 'natural',
    anger: { type: 'triggered', enablers: ['betrayal', 'harm'] },
    shame: { type: 'triggered', enablers: ['revelation', 'mistake'] },
    guilt: 'natural',
    relief: 'natural',
    surprise: 'natural',
    disgust: { type: 'forbidden', intermediary: 'anger' },
    envy: { type: 'triggered', enablers: ['comparison', 'threat'] },
  },
  
  shame: {
    guilt: 'natural',
    sadness: 'natural',
    anger: 'natural', // Defensive
    relief: { type: 'triggered', enablers: ['forgiveness', 'acceptance', 'confession'] },
    fear: 'natural',
    trust: { type: 'triggered', enablers: ['acceptance', 'support'] },
    pride: { type: 'triggered', enablers: ['redemption', 'growth'] },
    joy: { type: 'forbidden', intermediary: 'relief' },
    love: { type: 'triggered', enablers: ['acceptance', 'forgiveness'] },
    anticipation: { type: 'triggered', enablers: ['hope', 'plan'] },
    surprise: 'natural',
    disgust: 'natural',
    envy: 'natural',
  },
  
  guilt: {
    shame: 'natural',
    sadness: 'natural',
    relief: { type: 'triggered', enablers: ['forgiveness', 'amends', 'confession'] },
    anger: 'natural', // Self-directed or redirected
    fear: 'natural',
    trust: { type: 'triggered', enablers: ['forgiveness', 'second_chance'] },
    pride: { type: 'forbidden', intermediary: 'relief' },
    joy: { type: 'forbidden', intermediary: 'relief' },
    love: 'natural',
    anticipation: { type: 'triggered', enablers: ['redemption_plan', 'amends'] },
    surprise: 'natural',
    disgust: 'natural',
    envy: { type: 'forbidden', intermediary: 'sadness' },
  },
  
  envy: {
    anger: 'natural',
    sadness: 'natural',
    shame: 'natural',
    anticipation: 'natural', // Motivation
    guilt: 'natural',
    fear: { type: 'triggered', enablers: ['exposure_risk', 'consequence'] },
    disgust: 'natural',
    surprise: 'natural',
    joy: { type: 'forbidden', intermediary: 'anticipation' },
    trust: { type: 'forbidden', intermediary: 'relief' },
    love: { type: 'forbidden', intermediary: 'shame' },
    pride: { type: 'triggered', enablers: ['achievement', 'surpass'] },
    relief: { type: 'triggered', enablers: ['resolution', 'acceptance'] },
  },
  
  pride: {
    joy: 'natural',
    trust: 'natural',
    anticipation: 'natural',
    love: 'natural',
    shame: 'natural', // The fall
    anger: 'natural', // Wounded pride
    fear: 'natural',
    sadness: { type: 'triggered', enablers: ['loss', 'failure'] },
    guilt: { type: 'triggered', enablers: ['realization', 'consequence'] },
    relief: 'natural',
    surprise: 'natural',
    disgust: { type: 'triggered', enablers: ['reveal', 'betrayal'] },
    envy: { type: 'forbidden', intermediary: 'shame' },
  },
  
  relief: {
    trust: 'natural',
    joy: 'natural',
    love: 'natural',
    anticipation: 'natural',
    pride: 'natural',
    fear: { type: 'triggered', enablers: ['new_threat', 'reminder'] },
    anger: { type: 'triggered', enablers: ['realization', 'injustice'] },
    sadness: { type: 'triggered', enablers: ['loss_realization', 'aftermath'] },
    shame: { type: 'triggered', enablers: ['reflection', 'revelation'] },
    guilt: { type: 'triggered', enablers: ['realization', 'consequence'] },
    surprise: 'natural',
    disgust: { type: 'triggered', enablers: ['reveal', 'truth'] },
    envy: { type: 'forbidden', intermediary: 'sadness' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get transition rule between two emotions
 */
export function getTransition(from: EmotionId, to: EmotionId): TransitionRule {
  if (from === to) {
    return { from, to, type: 'natural' };
  }
  
  const rule = TRANSITIONS[from]?.[to];
  
  if (!rule) {
    // Default: triggered (requires justification)
    return { from, to, type: 'triggered' };
  }
  
  if (typeof rule === 'string') {
    return { from, to, type: rule };
  }
  
  return { from, to, ...rule };
}

/**
 * Check if a transition is valid
 * INV-MUSE-11: All suggestions must produce valid transitions
 */
export function isTransitionValid(
  from: EmotionId,
  to: EmotionId,
  trigger?: string
): { valid: boolean; reason?: string; intermediary?: EmotionId } {
  const rule = getTransition(from, to);
  
  switch (rule.type) {
    case 'natural':
      return { valid: true };
      
    case 'triggered':
      if (trigger && rule.enablers?.includes(trigger)) {
        return { valid: true };
      }
      // Allow triggered transitions if a trigger is provided (any trigger)
      if (trigger) {
        return { valid: true };
      }
      return {
        valid: false,
        reason: `Transition ${from} → ${to} requires trigger: ${rule.enablers?.join(', ') || 'any'}`,
      };
      
    case 'forbidden':
      return {
        valid: false,
        reason: `Transition ${from} → ${to} forbidden`,
        intermediary: rule.intermediary,
      };
  }
}

/**
 * Get all natural transitions from an emotion
 */
export function getNaturalTransitions(from: EmotionId): EmotionId[] {
  const natural: EmotionId[] = [];
  
  const transitions = TRANSITIONS[from] ?? {};
  for (const [to, rule] of Object.entries(transitions)) {
    const type = typeof rule === 'string' ? rule : rule.type;
    if (type === 'natural') {
      natural.push(to as EmotionId);
    }
  }
  
  return natural;
}

/**
 * Get valid path from one emotion to another
 * If direct transition is forbidden, returns path through intermediary
 */
export function getValidPath(
  from: EmotionId,
  to: EmotionId,
  trigger?: string
): { path: EmotionId[]; valid: boolean; triggers: string[] } {
  // Check direct path
  const direct = isTransitionValid(from, to, trigger);
  if (direct.valid) {
    return {
      path: [from, to],
      valid: true,
      triggers: trigger ? [trigger] : [],
    };
  }
  
  // If forbidden, try intermediary
  if (direct.intermediary) {
    const toIntermediary = isTransitionValid(from, direct.intermediary);
    const fromIntermediary = isTransitionValid(direct.intermediary, to);
    
    if (toIntermediary.valid && fromIntermediary.valid) {
      return {
        path: [from, direct.intermediary, to],
        valid: true,
        triggers: [],
      };
    }
  }
  
  // No valid path found
  return {
    path: [from, to],
    valid: false,
    triggers: [],
  };
}

/**
 * Calculate transition difficulty
 * 0 = natural, 0.5 = triggered, 1 = forbidden
 */
export function getTransitionDifficulty(from: EmotionId, to: EmotionId): number {
  const rule = getTransition(from, to);
  
  switch (rule.type) {
    case 'natural': return 0;
    case 'triggered': return 0.5;
    case 'forbidden': return 1;
  }
}

/**
 * Get enablers for a triggered transition
 */
export function getTransitionEnablers(from: EmotionId, to: EmotionId): string[] {
  const rule = getTransition(from, to);
  
  if (rule.type === 'triggered' && rule.enablers) {
    return rule.enablers;
  }
  
  return [];
}
