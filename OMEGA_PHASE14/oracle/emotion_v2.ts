/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Emotion Model v2
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Post-Plutchik emotion model for narrative analysis.
 * Multi-layer architecture: signals → appraisal → dynamics → narrative_role
 * 
 * Plutchik is LEGACY ONLY (compatibility facade, never used for logic).
 * 
 * @module oracle/emotion_v2
 * @version 2.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const EMOTION_V2_VERSION = '2.0.0' as const;

/** 
 * Extended emotion set (14 emotions vs Plutchik's 8)
 * This is the OMEGA canonical emotion vocabulary
 */
export const EMOTION_LABELS = [
  // Plutchik base (8)
  'joy',
  'trust',
  'fear',
  'surprise',
  'sadness',
  'disgust',
  'anger',
  'anticipation',
  // OMEGA extensions (6)
  'love',
  'shame',
  'guilt',
  'envy',
  'pride',
  'relief',
] as const;

export type EmotionLabel = typeof EMOTION_LABELS[number];

/** Emotion families for grouping */
export const EMOTION_FAMILIES = [
  'joy_family',      // joy, love, pride, relief
  'trust_family',    // trust
  'fear_family',     // fear, shame, guilt
  'surprise_family', // surprise, anticipation
  'sadness_family',  // sadness, envy
  'disgust_family',  // disgust
  'anger_family',    // anger
] as const;

export type EmotionFamily = typeof EMOTION_FAMILIES[number];

/** Map emotions to families */
export const EMOTION_TO_FAMILY: Record<EmotionLabel, EmotionFamily> = {
  joy: 'joy_family',
  love: 'joy_family',
  pride: 'joy_family',
  relief: 'joy_family',
  trust: 'trust_family',
  fear: 'fear_family',
  shame: 'fear_family',
  guilt: 'fear_family',
  surprise: 'surprise_family',
  anticipation: 'surprise_family',
  sadness: 'sadness_family',
  envy: 'sadness_family',
  disgust: 'disgust_family',
  anger: 'anger_family',
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1: SIGNALS (Raw emotional detection)
// ═══════════════════════════════════════════════════════════════════════════════

export type SignalChannel = 'lexical' | 'syntactic' | 'semantic' | 'contextual' | 'prosodic';

export interface EmotionSignal {
  readonly channel: SignalChannel;
  /** Valence: negative (-1) to positive (+1) */
  readonly valence: number;
  /** Arousal: calm (0) to excited (1) */
  readonly arousal: number;
  /** Confidence in this signal */
  readonly confidence: number;
  /** Optional: specific markers detected */
  readonly markers?: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2: APPRAISAL (Emotion interpretation)
// ═══════════════════════════════════════════════════════════════════════════════

export type Polarity = -1 | 0 | 1;

export interface EmotionAppraisalItem {
  readonly label: EmotionLabel;
  readonly family: EmotionFamily;
  /** Weight: 0 to 1, sum doesn't need to be 1 */
  readonly weight: number;
  /** Polarity: negative/neutral/positive */
  readonly polarity: Polarity;
}

export interface EmotionAppraisal {
  /** Emotions sorted by weight DESC */
  readonly emotions: readonly EmotionAppraisalItem[];
  /** Dominant emotion (highest weight) */
  readonly dominant: EmotionLabel;
  /** Ambiguity: 0 (clear) to 1 (very ambiguous) */
  readonly ambiguity: number;
  /** Valence aggregate */
  readonly valence_aggregate: number;
  /** Arousal aggregate */
  readonly arousal_aggregate: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3: DYNAMICS (Temporal evolution)
// ═══════════════════════════════════════════════════════════════════════════════

export type Trend = 'rising' | 'stable' | 'falling' | 'oscillating';

export interface EmotionDynamics {
  /** Resistance to change: 0 (volatile) to 1 (rigid) */
  readonly inertia: number;
  /** Variation speed: 0 (slow) to 1 (rapid) */
  readonly volatility: number;
  /** Direction of change */
  readonly trend: Trend;
  /** Sudden break detected */
  readonly rupture: boolean;
  /** Predicted next state (optional) */
  readonly forecast?: EmotionLabel;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 4: NARRATIVE ROLE (Story function)
// ═══════════════════════════════════════════════════════════════════════════════

export type NarrativeFunction = 
  | 'setup'       // Establishing emotional baseline
  | 'tension'     // Building conflict/suspense
  | 'release'     // Catharsis/resolution
  | 'mask'        // Hiding true emotion
  | 'revelation'  // Exposing hidden emotion
  | 'contrast'    // Juxtaposing emotions
  | 'echo'        // Repeating previous emotion
  | 'foreshadow'; // Hinting future emotion

export type NarrativeScope = 'local' | 'scene' | 'chapter' | 'arc' | 'global';

export type Intentionality = 
  | 'conscious'     // Character aware
  | 'repressed'     // Character unaware
  | 'externalized'  // Shown to reader only
  | 'shared';       // Both aware

export interface NarrativeRole {
  readonly function: NarrativeFunction;
  readonly scope: NarrativeScope;
  readonly intentionality: Intentionality;
  /** Importance: 0 (minor) to 1 (crucial) */
  readonly weight: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY: Plutchik Compatibility (FACADE ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

export const PLUTCHIK_EMOTIONS = [
  'joy', 'trust', 'fear', 'surprise',
  'sadness', 'disgust', 'anger', 'anticipation',
] as const;

export type PlutchikEmotion = typeof PLUTCHIK_EMOTIONS[number];

export interface LegacyPlutchik {
  readonly primary: PlutchikEmotion;
  readonly intensity: number;
  readonly secondary?: PlutchikEmotion;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL INFO
// ═══════════════════════════════════════════════════════════════════════════════

export interface ModelInfo {
  readonly provider_id: string;
  readonly model_name: string;
  readonly latency_ms: number;
  readonly tokens_in?: number;
  readonly tokens_out?: number;
  readonly cost_estimate?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TYPE: EmotionStateV2
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmotionStateV2 {
  readonly schema_version: typeof EMOTION_V2_VERSION;
  readonly trace_id: string;
  readonly created_at_ms: number;
  
  // Core layers (required)
  readonly signals: readonly EmotionSignal[];
  readonly appraisal: EmotionAppraisal;
  
  // Optional layers
  readonly dynamics?: EmotionDynamics;
  readonly narrative_role?: NarrativeRole;
  
  // Legacy (compatibility only, NEVER used for logic)
  readonly legacy_plutchik?: LegacyPlutchik;
  
  // Model metadata
  readonly model: ModelInfo;
  
  // Human-readable explanation
  readonly rationale: string;
  
  // Analysis metadata
  readonly input_hash: string;
  readonly cached: boolean;
  readonly calibrated: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export class EmotionValidationError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly value: unknown
  ) {
    super(`${path}: ${message}`);
    this.name = 'EmotionValidationError';
  }
}

function assert(condition: unknown, path: string, message: string, value?: unknown): asserts condition {
  if (!condition) {
    throw new EmotionValidationError(message, path, value);
  }
}

function isObject(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function inRange(x: unknown, min: number, max: number): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
}

function isNonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.trim().length > 0;
}

function isPolarity(x: unknown): x is Polarity {
  return x === -1 || x === 0 || x === 1;
}

function isSignalChannel(x: unknown): x is SignalChannel {
  return ['lexical', 'syntactic', 'semantic', 'contextual', 'prosodic'].includes(x as string);
}

function isTrend(x: unknown): x is Trend {
  return ['rising', 'stable', 'falling', 'oscillating'].includes(x as string);
}

function isNarrativeFunction(x: unknown): x is NarrativeFunction {
  return ['setup', 'tension', 'release', 'mask', 'revelation', 'contrast', 'echo', 'foreshadow'].includes(x as string);
}

function isNarrativeScope(x: unknown): x is NarrativeScope {
  return ['local', 'scene', 'chapter', 'arc', 'global'].includes(x as string);
}

function isIntentionality(x: unknown): x is Intentionality {
  return ['conscious', 'repressed', 'externalized', 'shared'].includes(x as string);
}

function isEmotionLabel(x: unknown): x is EmotionLabel {
  return EMOTION_LABELS.includes(x as EmotionLabel);
}

function isEmotionFamily(x: unknown): x is EmotionFamily {
  return EMOTION_FAMILIES.includes(x as EmotionFamily);
}

function isPlutchikEmotion(x: unknown): x is PlutchikEmotion {
  return PLUTCHIK_EMOTIONS.includes(x as PlutchikEmotion);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AMBIGUITY CALCULATION (Deterministic)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate ambiguity from emotion weights (deterministic)
 * INV-ORC-03: Must be reproducible
 */
export function calculateAmbiguity(weights: readonly number[]): number {
  if (weights.length < 2) return 0;
  
  const sorted = [...weights].sort((a, b) => b - a);
  const delta = sorted[0] - sorted[1];
  
  // delta=0 → ambiguity=1, delta>=0.4 → ambiguity=0
  const ambiguity = 1 - Math.min(1, delta / 0.4);
  
  // Round to 2 decimal places for determinism
  return Math.round(ambiguity * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATOR - INV-ORC-03
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate EmotionStateV2 (NASA-grade strict validation)
 * @throws EmotionValidationError on invalid input
 */
export function validateEmotionStateV2(input: unknown): EmotionStateV2 {
  assert(isObject(input), 'root', 'must be object', input);
  
  const x = input as Record<string, unknown>;
  
  // Version
  assert(x.schema_version === EMOTION_V2_VERSION, 'schema_version', 
    `must be ${EMOTION_V2_VERSION}`, x.schema_version);
  
  // Trace ID
  assert(isNonEmptyString(x.trace_id), 'trace_id', 'must be non-empty string', x.trace_id);
  
  // Created at
  assert(typeof x.created_at_ms === 'number' && Number.isInteger(x.created_at_ms) && x.created_at_ms >= 0,
    'created_at_ms', 'must be non-negative integer', x.created_at_ms);
  
  // Signals
  assert(Array.isArray(x.signals) && x.signals.length >= 1,
    'signals', 'must be non-empty array', x.signals);
  
  for (let i = 0; i < (x.signals as unknown[]).length; i++) {
    const s = (x.signals as unknown[])[i];
    assert(isObject(s), `signals[${i}]`, 'must be object', s);
    
    const sig = s as Record<string, unknown>;
    assert(isSignalChannel(sig.channel), `signals[${i}].channel`, 'invalid channel', sig.channel);
    assert(inRange(sig.valence, -1, 1), `signals[${i}].valence`, 'must be -1 to 1', sig.valence);
    assert(inRange(sig.arousal, 0, 1), `signals[${i}].arousal`, 'must be 0 to 1', sig.arousal);
    assert(inRange(sig.confidence, 0, 1), `signals[${i}].confidence`, 'must be 0 to 1', sig.confidence);
  }
  
  // Appraisal
  assert(isObject(x.appraisal), 'appraisal', 'must be object', x.appraisal);
  
  const appraisal = x.appraisal as Record<string, unknown>;
  assert(Array.isArray(appraisal.emotions) && appraisal.emotions.length >= 1,
    'appraisal.emotions', 'must be non-empty array', appraisal.emotions);
  
  const weights: number[] = [];
  for (let i = 0; i < (appraisal.emotions as unknown[]).length; i++) {
    const e = (appraisal.emotions as unknown[])[i];
    assert(isObject(e), `appraisal.emotions[${i}]`, 'must be object', e);
    
    const emo = e as Record<string, unknown>;
    assert(isEmotionLabel(emo.label), `appraisal.emotions[${i}].label`, 'invalid emotion label', emo.label);
    assert(isEmotionFamily(emo.family), `appraisal.emotions[${i}].family`, 'invalid family', emo.family);
    assert(inRange(emo.weight, 0, 1), `appraisal.emotions[${i}].weight`, 'must be 0 to 1', emo.weight);
    assert(isPolarity(emo.polarity), `appraisal.emotions[${i}].polarity`, 'must be -1, 0, or 1', emo.polarity);
    
    weights.push(emo.weight as number);
  }
  
  // Check sorted DESC
  for (let i = 1; i < weights.length; i++) {
    assert(weights[i - 1] >= weights[i], 'appraisal.emotions',
      'must be sorted by weight DESC', weights);
  }
  
  assert(isEmotionLabel(appraisal.dominant), 'appraisal.dominant', 'invalid emotion', appraisal.dominant);
  assert(inRange(appraisal.ambiguity, 0, 1), 'appraisal.ambiguity', 'must be 0 to 1', appraisal.ambiguity);
  assert(inRange(appraisal.valence_aggregate, -1, 1), 'appraisal.valence_aggregate', 
    'must be -1 to 1', appraisal.valence_aggregate);
  assert(inRange(appraisal.arousal_aggregate, 0, 1), 'appraisal.arousal_aggregate',
    'must be 0 to 1', appraisal.arousal_aggregate);
  
  // Ambiguity consistency check (tolerance 0.15)
  const expectedAmbiguity = calculateAmbiguity(weights);
  const ambiguityDiff = Math.abs(expectedAmbiguity - (appraisal.ambiguity as number));
  assert(ambiguityDiff <= 0.15, 'appraisal.ambiguity',
    `inconsistent with weights (expected ~${expectedAmbiguity})`, appraisal.ambiguity);
  
  // Dynamics (optional)
  if (x.dynamics !== undefined) {
    assert(isObject(x.dynamics), 'dynamics', 'must be object', x.dynamics);
    
    const dyn = x.dynamics as Record<string, unknown>;
    assert(inRange(dyn.inertia, 0, 1), 'dynamics.inertia', 'must be 0 to 1', dyn.inertia);
    assert(inRange(dyn.volatility, 0, 1), 'dynamics.volatility', 'must be 0 to 1', dyn.volatility);
    assert(isTrend(dyn.trend), 'dynamics.trend', 'invalid trend', dyn.trend);
    assert(typeof dyn.rupture === 'boolean', 'dynamics.rupture', 'must be boolean', dyn.rupture);
  }
  
  // Narrative role (optional)
  if (x.narrative_role !== undefined) {
    assert(isObject(x.narrative_role), 'narrative_role', 'must be object', x.narrative_role);
    
    const nr = x.narrative_role as Record<string, unknown>;
    assert(isNarrativeFunction(nr.function), 'narrative_role.function', 'invalid function', nr.function);
    assert(isNarrativeScope(nr.scope), 'narrative_role.scope', 'invalid scope', nr.scope);
    assert(isIntentionality(nr.intentionality), 'narrative_role.intentionality', 
      'invalid intentionality', nr.intentionality);
    assert(inRange(nr.weight, 0, 1), 'narrative_role.weight', 'must be 0 to 1', nr.weight);
  }
  
  // Legacy Plutchik (optional)
  if (x.legacy_plutchik !== undefined) {
    assert(isObject(x.legacy_plutchik), 'legacy_plutchik', 'must be object', x.legacy_plutchik);
    
    const lp = x.legacy_plutchik as Record<string, unknown>;
    assert(isPlutchikEmotion(lp.primary), 'legacy_plutchik.primary', 'invalid emotion', lp.primary);
    assert(inRange(lp.intensity, 0, 1), 'legacy_plutchik.intensity', 'must be 0 to 1', lp.intensity);
    
    if (lp.secondary !== undefined) {
      assert(isPlutchikEmotion(lp.secondary), 'legacy_plutchik.secondary', 'invalid emotion', lp.secondary);
    }
  }
  
  // Model info
  assert(isObject(x.model), 'model', 'must be object', x.model);
  
  const model = x.model as Record<string, unknown>;
  assert(isNonEmptyString(model.provider_id), 'model.provider_id', 'must be non-empty string', model.provider_id);
  assert(isNonEmptyString(model.model_name), 'model.model_name', 'must be non-empty string', model.model_name);
  assert(typeof model.latency_ms === 'number' && model.latency_ms >= 0,
    'model.latency_ms', 'must be non-negative number', model.latency_ms);
  
  // Rationale
  assert(isNonEmptyString(x.rationale), 'rationale', 'must be non-empty string', x.rationale);
  
  // Input hash
  assert(isNonEmptyString(x.input_hash), 'input_hash', 'must be non-empty string', x.input_hash);
  
  // Flags
  assert(typeof x.cached === 'boolean', 'cached', 'must be boolean', x.cached);
  assert(typeof x.calibrated === 'boolean', 'calibrated', 'must be boolean', x.calibrated);
  
  return input as EmotionStateV2;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLUTCHIK MAPPER (Legacy export only)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map EmotionStateV2 to legacy Plutchik format
 * WARNING: This is for compatibility only, NEVER use for logic
 */
export function toLegacyPlutchik(state: EmotionStateV2): LegacyPlutchik {
  const dominant = state.appraisal.dominant;
  
  // Map extended emotions to Plutchik base
  const plutchikMap: Record<EmotionLabel, PlutchikEmotion> = {
    joy: 'joy',
    trust: 'trust',
    fear: 'fear',
    surprise: 'surprise',
    sadness: 'sadness',
    disgust: 'disgust',
    anger: 'anger',
    anticipation: 'anticipation',
    love: 'joy',      // love → joy
    shame: 'fear',    // shame → fear
    guilt: 'sadness', // guilt → sadness
    envy: 'anger',    // envy → anger
    pride: 'joy',     // pride → joy
    relief: 'joy',    // relief → joy
  };
  
  const primary = plutchikMap[dominant];
  const intensity = state.appraisal.emotions[0]?.weight ?? 0.5;
  
  // Find secondary if exists
  let secondary: PlutchikEmotion | undefined;
  if (state.appraisal.emotions.length > 1) {
    secondary = plutchikMap[state.appraisal.emotions[1].label];
    if (secondary === primary) secondary = undefined;
  }
  
  return { primary, intensity, secondary };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEUTRAL STATE FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a neutral emotion state (fallback)
 * INV-ORC-05: Used when LLM fails
 */
export function createNeutralState(params: {
  trace_id: string;
  created_at_ms: number;
  input_hash: string;
  provider_id: string;
  reason: string;
}): EmotionStateV2 {
  return {
    schema_version: EMOTION_V2_VERSION,
    trace_id: params.trace_id,
    created_at_ms: params.created_at_ms,
    signals: [{
      channel: 'semantic',
      valence: 0,
      arousal: 0.3,
      confidence: 0.2, // Low confidence for fallback
    }],
    appraisal: {
      emotions: [{
        label: 'anticipation',
        family: 'surprise_family',
        weight: 1,
        polarity: 0,
      }],
      dominant: 'anticipation',
      ambiguity: 0, // Single emotion → no ambiguity
      valence_aggregate: 0,
      arousal_aggregate: 0.3,
    },
    model: {
      provider_id: params.provider_id,
      model_name: 'fallback-neutral',
      latency_ms: 0,
    },
    rationale: `Neutral fallback: ${params.reason}`,
    input_hash: params.input_hash,
    cached: false,
    calibrated: false,
  };
}
