/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — Emotion V2 Types (MUSE standalone mock)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Minimal EmotionStateV2 types for MUSE module testing.
 * In production, this imports from oracle/emotion_v2.ts
 * 
 * @version 2.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION IDS
// ═══════════════════════════════════════════════════════════════════════════════

export const EMOTION_IDS = [
  'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation',
  'love', 'shame', 'guilt', 'envy', 'pride', 'relief',
] as const;

export type EmotionId = typeof EMOTION_IDS[number];

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION STATE V2
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmotionSignal {
  channel: string;
  valence: number; // -1 to 1
  arousal: number; // 0 to 1
  confidence: number; // 0 to 1
}

export interface EmotionWeight {
  id: EmotionId;
  weight: number; // 0 to 1
}

export interface EmotionAppraisal {
  emotions: EmotionWeight[];
  ambiguity: number; // 0 to 1
  aggregates: {
    valence: number;
    arousal: number;
    dominance: number;
  };
}

export interface EmotionDynamics {
  inertia: number; // 0 to 1
  volatility: number; // 0 to 1
  trend: 'rising' | 'falling' | 'stable' | 'oscillating';
  rupture: boolean;
}

export interface NarrativeRole {
  function: 'catalyst' | 'sustain' | 'transition' | 'resolution' | 'contrast';
  scope: 'beat' | 'scene' | 'arc' | 'story';
  intentionality: 'active' | 'reactive' | 'passive';
  weight: number;
}

export interface ModelInfo {
  provider: string;
  model: string;
  version: string;
}

export interface EmotionStateV2 {
  schema_version: '2.0.0';
  trace_id: string;
  created_at_ms: number;
  input_hash: string;
  signals: EmotionSignal[];
  appraisal: EmotionAppraisal;
  dynamics?: EmotionDynamics;
  narrative_role?: NarrativeRole;
  model: ModelInfo;
  rationale: string;
  cached: boolean;
  calibrated: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateEmotionStateV2(state: EmotionStateV2): ValidationResult {
  const errors: string[] = [];
  
  // Schema version
  if (state.schema_version !== '2.0.0') {
    errors.push(`Invalid schema_version: ${state.schema_version}`);
  }
  
  // Required fields
  if (!state.trace_id) errors.push('Missing trace_id');
  if (!state.input_hash) errors.push('Missing input_hash');
  if (!state.signals || !Array.isArray(state.signals)) errors.push('Missing or invalid signals');
  if (!state.appraisal) errors.push('Missing appraisal');
  if (!state.model) errors.push('Missing model');
  
  // Appraisal validation
  if (state.appraisal) {
    if (!state.appraisal.emotions || !Array.isArray(state.appraisal.emotions)) {
      errors.push('Missing or invalid appraisal.emotions');
    } else {
      for (const emotion of state.appraisal.emotions) {
        if (!EMOTION_IDS.includes(emotion.id)) {
          errors.push(`Invalid emotion id: ${emotion.id}`);
        }
        if (emotion.weight < 0 || emotion.weight > 1) {
          errors.push(`Invalid weight for ${emotion.id}: ${emotion.weight}`);
        }
      }
    }
    
    if (state.appraisal.ambiguity < 0 || state.appraisal.ambiguity > 1) {
      errors.push(`Invalid ambiguity: ${state.appraisal.ambiguity}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createNeutralState(traceId: string = 'test'): EmotionStateV2 {
  return {
    schema_version: '2.0.0',
    trace_id: traceId,
    created_at_ms: Date.now(),
    input_hash: 'test-hash',
    signals: [],
    appraisal: {
      emotions: [{ id: 'anticipation', weight: 1.0 }],
      ambiguity: 0,
      aggregates: { valence: 0, arousal: 0.5, dominance: 0.5 },
    },
    model: { provider: 'test', model: 'test', version: '1.0' },
    rationale: 'Neutral test state',
    cached: false,
    calibrated: false,
  };
}

export function createEmotionState(
  dominant: EmotionId,
  weight: number = 0.8,
  secondary?: { id: EmotionId; weight: number }
): EmotionStateV2 {
  const emotions: EmotionWeight[] = [{ id: dominant, weight }];
  if (secondary) {
    emotions.push(secondary);
  }
  
  return {
    schema_version: '2.0.0',
    trace_id: `test-${Date.now()}`,
    created_at_ms: Date.now(),
    input_hash: `hash-${dominant}-${weight}`,
    signals: [{ channel: 'text', valence: 0, arousal: weight, confidence: 0.8 }],
    appraisal: {
      emotions,
      ambiguity: secondary ? 0.3 : 0,
      aggregates: { valence: 0, arousal: weight, dominance: 0.5 },
    },
    dynamics: {
      inertia: 0.5,
      volatility: 0.5,
      trend: 'stable',
      rupture: false,
    },
    narrative_role: {
      function: 'sustain',
      scope: 'scene',
      intentionality: 'active',
      weight: 0.7,
    },
    model: { provider: 'test', model: 'test', version: '1.0' },
    rationale: `Test state with ${dominant}`,
    cached: false,
    calibrated: true,
  };
}
