/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Response Parser
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Parse and normalize LLM responses for EmotionStateV2.
 * INV-ORC-02: Invalid JSON = explicit error
 * 
 * @module oracle/response_parser
 * @version 3.14.0
 */

import {
  type EmotionStateV2,
  type EmotionAppraisalItem,
  validateEmotionStateV2,
  EmotionValidationError,
  EMOTION_LABELS,
  EMOTION_TO_FAMILY,
  calculateAmbiguity,
} from './emotion_v2.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export class NormalizationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(`${field}: ${message}`);
    this.name = 'NormalizationError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract JSON from LLM response (handles markdown fences, prose, etc.)
 */
export function extractJson(raw: string): string {
  if (!raw || raw.trim().length === 0) {
    throw new ParseError('Empty response', raw);
  }
  
  let cleaned = raw.trim();
  
  // Remove markdown code fences
  const jsonFenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonFenceMatch) {
    cleaned = jsonFenceMatch[1].trim();
  }
  
  // Find JSON object boundaries
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new ParseError('No valid JSON object found', raw);
  }
  
  return cleaned.slice(firstBrace, lastBrace + 1);
}

/**
 * Parse JSON string to object
 */
export function parseJson(jsonStr: string, raw: string): unknown {
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new ParseError(
      `Invalid JSON: ${e instanceof Error ? e.message : 'unknown error'}`,
      raw,
      e instanceof Error ? e : undefined
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clamp number to range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Round to N decimal places
 */
function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Normalize emotion label (case-insensitive, trim)
 */
function normalizeEmotionLabel(label: string): string {
  const normalized = label.toLowerCase().trim();
  
  // Check if valid
  if (!EMOTION_LABELS.includes(normalized as any)) {
    // Try to map common variations
    const mappings: Record<string, string> = {
      'happy': 'joy',
      'happiness': 'joy',
      'afraid': 'fear',
      'scared': 'fear',
      'angry': 'anger',
      'sad': 'sadness',
      'surprised': 'surprise',
      'disgusted': 'disgust',
      'anxious': 'fear',
      'excited': 'anticipation',
      'loving': 'love',
      'proud': 'pride',
      'ashamed': 'shame',
      'guilty': 'guilt',
      'jealous': 'envy',
      'relieved': 'relief',
      'trusting': 'trust',
    };
    
    if (mappings[normalized]) {
      return mappings[normalized];
    }
    
    // Default to closest match or anticipation (neutral)
    return 'anticipation';
  }
  
  return normalized;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE NORMALIZER
// ═══════════════════════════════════════════════════════════════════════════════

export interface NormalizationOptions {
  /** Force specific trace_id */
  trace_id?: string;
  /** Force specific created_at_ms */
  created_at_ms?: number;
  /** Force specific input_hash */
  input_hash?: string;
  /** Provider ID for model info */
  provider_id?: string;
  /** Model name override */
  model_name?: string;
  /** Latency in ms */
  latency_ms?: number;
  /** Max confidence (anti-overconfidence) */
  max_confidence?: number;
}

/**
 * Normalize parsed response to valid EmotionStateV2
 */
export function normalizeResponse(
  parsed: unknown,
  options: NormalizationOptions
): EmotionStateV2 {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new NormalizationError('Expected object', 'root', parsed);
  }
  
  const raw = parsed as Record<string, unknown>;
  const maxConf = options.max_confidence ?? 0.95;
  
  // Build normalized object
  const normalized: Record<string, unknown> = {
    schema_version: '2.0.0',
    trace_id: options.trace_id ?? raw.trace_id ?? 'unknown',
    created_at_ms: options.created_at_ms ?? raw.created_at_ms ?? Date.now(),
    input_hash: options.input_hash ?? raw.input_hash ?? 'unknown',
    cached: false,
    calibrated: false,
  };
  
  // Normalize signals
  const rawSignals = Array.isArray(raw.signals) ? raw.signals : [];
  if (rawSignals.length === 0) {
    // Create default signal
    normalized.signals = [{
      channel: 'semantic',
      valence: 0,
      arousal: 0.5,
      confidence: 0.3,
    }];
  } else {
    normalized.signals = rawSignals.map((s: any, i: number) => ({
      channel: ['lexical', 'syntactic', 'semantic', 'contextual', 'prosodic'].includes(s?.channel)
        ? s.channel
        : 'semantic',
      valence: round(clamp(Number(s?.valence) || 0, -1, 1)),
      arousal: round(clamp(Number(s?.arousal) || 0.5, 0, 1)),
      confidence: round(clamp(Number(s?.confidence) || 0.5, 0, maxConf)),
      ...(Array.isArray(s?.markers) && s.markers.length > 0 ? { markers: s.markers } : {}),
    }));
  }
  
  // Normalize appraisal
  const rawAppraisal = raw.appraisal as Record<string, unknown> | undefined;
  const rawEmotions = Array.isArray(rawAppraisal?.emotions) ? rawAppraisal.emotions : [];
  
  let emotions: EmotionAppraisalItem[];
  
  if (rawEmotions.length === 0) {
    // Default emotion
    emotions = [{
      label: 'anticipation',
      family: 'surprise_family',
      weight: 1,
      polarity: 0,
    }];
  } else {
    emotions = rawEmotions.map((e: any) => {
      const label = normalizeEmotionLabel(String(e?.label || 'anticipation'));
      return {
        label: label as any,
        family: EMOTION_TO_FAMILY[label as keyof typeof EMOTION_TO_FAMILY] || 'surprise_family',
        weight: round(clamp(Number(e?.weight) || 0.5, 0, 1)),
        polarity: (e?.polarity === -1 || e?.polarity === 0 || e?.polarity === 1)
          ? e.polarity
          : 0,
      };
    });
    
    // Sort by weight DESC
    emotions.sort((a, b) => b.weight - a.weight);
  }
  
  const weights = emotions.map(e => e.weight);
  const ambiguity = calculateAmbiguity(weights);
  
  // Calculate aggregates from signals
  const signals = normalized.signals as any[];
  const totalConf = signals.reduce((sum, s) => sum + s.confidence, 0);
  const valence_aggregate = round(
    totalConf > 0 ? signals.reduce((sum, s) => sum + s.valence * s.confidence, 0) / totalConf : 0
  );
  const arousal_aggregate = round(
    totalConf > 0 ? signals.reduce((sum, s) => sum + s.arousal * s.confidence, 0) / totalConf : 0.5
  );
  
  normalized.appraisal = {
    emotions,
    dominant: emotions[0].label,
    ambiguity: round(ambiguity),
    valence_aggregate: clamp(valence_aggregate, -1, 1),
    arousal_aggregate: clamp(arousal_aggregate, 0, 1),
  };
  
  // Normalize dynamics (if present)
  if (raw.dynamics && typeof raw.dynamics === 'object') {
    const d = raw.dynamics as Record<string, unknown>;
    normalized.dynamics = {
      inertia: round(clamp(Number(d.inertia) || 0.5, 0, 1)),
      volatility: round(clamp(Number(d.volatility) || 0.5, 0, 1)),
      trend: ['rising', 'stable', 'falling', 'oscillating'].includes(d.trend as string)
        ? d.trend
        : 'stable',
      rupture: Boolean(d.rupture),
    };
  }
  
  // Normalize narrative_role (if present)
  if (raw.narrative_role && typeof raw.narrative_role === 'object') {
    const nr = raw.narrative_role as Record<string, unknown>;
    const validFunctions = ['setup', 'tension', 'release', 'mask', 'revelation', 'contrast', 'echo', 'foreshadow'];
    const validScopes = ['local', 'scene', 'chapter', 'arc', 'global'];
    const validIntentionality = ['conscious', 'repressed', 'externalized', 'shared'];
    
    normalized.narrative_role = {
      function: validFunctions.includes(nr.function as string) ? nr.function : 'setup',
      scope: validScopes.includes(nr.scope as string) ? nr.scope : 'local',
      intentionality: validIntentionality.includes(nr.intentionality as string)
        ? nr.intentionality
        : 'conscious',
      weight: round(clamp(Number(nr.weight) || 0.5, 0, 1)),
    };
  }
  
  // Normalize legacy_plutchik (if present)
  if (raw.legacy_plutchik && typeof raw.legacy_plutchik === 'object') {
    const lp = raw.legacy_plutchik as Record<string, unknown>;
    const validPlutchik = ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'];
    
    const primary = validPlutchik.includes(lp.primary as string)
      ? lp.primary
      : emotions[0].label; // Fallback to dominant
    
    normalized.legacy_plutchik = {
      primary: validPlutchik.includes(primary as string) ? primary : 'anticipation',
      intensity: round(clamp(Number(lp.intensity) || 0.5, 0, 1)),
      ...(lp.secondary && validPlutchik.includes(lp.secondary as string)
        ? { secondary: lp.secondary }
        : {}),
    };
  }
  
  // Model info
  const rawLatency = (raw.model as any)?.latency_ms;
  const latencyMs = options.latency_ms !== undefined 
    ? options.latency_ms 
    : (typeof rawLatency === 'number' ? rawLatency : 0);
  
  normalized.model = {
    provider_id: options.provider_id ?? (raw.model as any)?.provider_id ?? 'unknown',
    model_name: options.model_name ?? (raw.model as any)?.model_name ?? 'unknown',
    latency_ms: latencyMs,
  };
  
  // Rationale
  normalized.rationale = typeof raw.rationale === 'string' && raw.rationale.trim().length > 0
    ? raw.rationale.trim().slice(0, 500)
    : 'No rationale provided';
  
  return normalized as EmotionStateV2;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PARSER - INV-ORC-02
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse and validate LLM response to EmotionStateV2
 * @throws ParseError on invalid JSON
 * @throws NormalizationError on normalization failure
 * @throws EmotionValidationError on schema violation
 */
export function parseResponse(
  raw: string,
  options: NormalizationOptions
): EmotionStateV2 {
  // Step 1: Extract JSON
  const jsonStr = extractJson(raw);
  
  // Step 2: Parse JSON
  const parsed = parseJson(jsonStr, raw);
  
  // Step 3: Normalize
  const normalized = normalizeResponse(parsed, options);
  
  // Step 4: Validate (strict)
  return validateEmotionStateV2(normalized);
}

/**
 * Try to parse response, return null on failure (for fallback scenarios)
 */
export function tryParseResponse(
  raw: string,
  options: NormalizationOptions
): EmotionStateV2 | null {
  try {
    return parseResponse(raw, options);
  } catch {
    return null;
  }
}
