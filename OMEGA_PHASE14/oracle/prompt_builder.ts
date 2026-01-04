/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Prompt Builder
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Deterministic prompt construction for ORACLE v2.
 * INV-ORC-01: Same input → same prompt + same hash
 * 
 * @module oracle/prompt_builder
 * @version 3.14.0
 */

import { createHash } from 'node:crypto';
import { EMOTION_V2_VERSION, EMOTION_LABELS, EMOTION_FAMILIES } from './emotion_v2.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PromptInput {
  /** Unique trace ID */
  readonly trace_id: string;
  /** Text to analyze */
  readonly text: string;
  /** Timestamp (injected, never Date.now() inside) */
  readonly now_ms: number;
  /** Max emotions to return */
  readonly max_emotions: number;
  /** Include dynamics layer */
  readonly include_dynamics: boolean;
  /** Include narrative role layer */
  readonly include_narrative: boolean;
  /** Include legacy Plutchik output */
  readonly include_legacy: boolean;
  /** Language hint */
  readonly language?: string;
  /** Context (previous text, optional) */
  readonly context?: string;
}

export interface BuiltPrompt {
  /** The system prompt */
  readonly system_prompt: string;
  /** The user prompt (contains the text) */
  readonly user_prompt: string;
  /** SHA256 hash of deterministic payload */
  readonly payload_hash: string;
  /** Token estimate (rough) */
  readonly estimated_tokens: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const CHARS_PER_TOKEN = 4;
const MAX_TEXT_LENGTH = 50000;

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT_TEMPLATE = `You are ORACLE v2, an advanced narrative emotion analyzer.
Your task is to analyze text and return structured emotional data in JSON format.

## Schema Version
${EMOTION_V2_VERSION}

## Output Format
Return ONLY valid JSON matching the EmotionStateV2 schema. No markdown. No commentary.

## Emotion Labels (14 canonical emotions)
${EMOTION_LABELS.join(', ')}

## Emotion Families
${EMOTION_FAMILIES.join(', ')}

## Required Fields
- schema_version: "${EMOTION_V2_VERSION}"
- trace_id: (provided in input)
- created_at_ms: (provided in input)
- signals: array of {channel, valence(-1..1), arousal(0..1), confidence(0..1)}
- appraisal: {emotions: [{label, family, weight(0..1), polarity(-1|0|1)}], dominant, ambiguity(0..1), valence_aggregate, arousal_aggregate}
- model: {provider_id, model_name, latency_ms}
- rationale: short explanation
- input_hash: (provided in input)
- cached: false
- calibrated: false

## Rules
1. signals[] must have at least 1 entry
2. appraisal.emotions must be sorted by weight DESC
3. appraisal.ambiguity must reflect closeness of top weights
4. Use ONLY the 14 canonical emotion labels
5. Be conservative with confidence (max 0.95)
6. rationale must be concise (1-2 sentences)`;

// ═══════════════════════════════════════════════════════════════════════════════
// HASH CALCULATION - INV-ORC-01
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate deterministic hash of prompt input
 */
export function calculateInputHash(input: PromptInput): string {
  // Create deterministic payload (sorted keys)
  const payload = {
    context: input.context ?? null,
    include_dynamics: input.include_dynamics,
    include_legacy: input.include_legacy,
    include_narrative: input.include_narrative,
    language: input.language ?? null,
    max_emotions: input.max_emotions,
    text: input.text,
    trace_id: input.trace_id,
    version: EMOTION_V2_VERSION,
  };
  
  const payloadStr = JSON.stringify(payload);
  return createHash('sha256').update(payloadStr, 'utf8').digest('hex').toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDER - INV-ORC-01
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build ORACLE prompt (deterministic)
 * @throws Error if input exceeds limits
 */
export function buildPrompt(input: PromptInput): BuiltPrompt {
  // Validate input
  if (!input.trace_id || input.trace_id.trim().length === 0) {
    throw new Error('PromptBuilder: trace_id required');
  }
  
  if (!input.text || input.text.trim().length === 0) {
    throw new Error('PromptBuilder: text required');
  }
  
  if (input.text.length > MAX_TEXT_LENGTH) {
    throw new Error(`PromptBuilder: text exceeds ${MAX_TEXT_LENGTH} chars`);
  }
  
  if (input.max_emotions < 1 || input.max_emotions > 14) {
    throw new Error('PromptBuilder: max_emotions must be 1-14');
  }
  
  // Calculate hash
  const payload_hash = calculateInputHash(input);
  
  // Build system prompt with optional layers
  let system_prompt = SYSTEM_PROMPT_TEMPLATE;
  
  if (input.include_dynamics) {
    system_prompt += `

## Dynamics Layer (required)
Include dynamics: {inertia(0..1), volatility(0..1), trend("rising"|"stable"|"falling"|"oscillating"), rupture(boolean)}`;
  }
  
  if (input.include_narrative) {
    system_prompt += `

## Narrative Role Layer (required)
Include narrative_role: {function, scope, intentionality, weight(0..1)}
Functions: setup, tension, release, mask, revelation, contrast, echo, foreshadow
Scopes: local, scene, chapter, arc, global
Intentionality: conscious, repressed, externalized, shared`;
  }
  
  if (input.include_legacy) {
    system_prompt += `

## Legacy Plutchik (required for compatibility)
Include legacy_plutchik: {primary, intensity(0..1), secondary?}
Map extended emotions to base 8: joy, trust, fear, surprise, sadness, disgust, anger, anticipation`;
  }
  
  // Build user prompt
  let user_prompt = `Analyze this text for emotional content.

trace_id: ${input.trace_id}
created_at_ms: ${input.now_ms}
input_hash: ${payload_hash}
max_emotions: ${input.max_emotions}`;

  if (input.language) {
    user_prompt += `\nlanguage: ${input.language}`;
  }
  
  if (input.context) {
    user_prompt += `

Previous context:
"""
${input.context}
"""`;
  }
  
  user_prompt += `

Text to analyze:
"""
${input.text}
"""

Return ONLY the JSON object.`;

  // Estimate tokens
  const total_chars = system_prompt.length + user_prompt.length;
  const estimated_tokens = Math.ceil(total_chars / CHARS_PER_TOKEN);
  
  return Object.freeze({
    system_prompt,
    user_prompt,
    payload_hash,
    estimated_tokens,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build minimal prompt (fast analysis)
 */
export function buildMinimalPrompt(input: Omit<PromptInput, 'include_dynamics' | 'include_narrative' | 'include_legacy'>): BuiltPrompt {
  return buildPrompt({
    ...input,
    include_dynamics: false,
    include_narrative: false,
    include_legacy: false,
  });
}

/**
 * Build full prompt (all layers)
 */
export function buildFullPrompt(input: Omit<PromptInput, 'include_dynamics' | 'include_narrative' | 'include_legacy'>): BuiltPrompt {
  return buildPrompt({
    ...input,
    include_dynamics: true,
    include_narrative: true,
    include_legacy: true,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHUNK SUPPORT (for long texts)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChunkInfo {
  readonly index: number;
  readonly total: number;
  readonly text: string;
  readonly start_offset: number;
  readonly end_offset: number;
}

/**
 * Split text into chunks for analysis
 */
export function splitIntoChunks(text: string, max_chunk_size: number = 10000): ChunkInfo[] {
  if (text.length <= max_chunk_size) {
    return [{
      index: 0,
      total: 1,
      text,
      start_offset: 0,
      end_offset: text.length,
    }];
  }
  
  const chunks: ChunkInfo[] = [];
  let offset = 0;
  
  while (offset < text.length) {
    let end = Math.min(offset + max_chunk_size, text.length);
    
    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > offset + max_chunk_size * 0.5) {
        end = breakPoint + 1;
      }
    }
    
    chunks.push({
      index: chunks.length,
      total: -1, // Will be updated
      text: text.slice(offset, end),
      start_offset: offset,
      end_offset: end,
    });
    
    offset = end;
  }
  
  // Update total count
  return chunks.map(c => ({ ...c, total: chunks.length }));
}
