/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Fingerprint
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Stable hashing for suggestions, inputs, outputs.
 * SHA-256 based, deterministic, collision-resistant.
 * 
 * INV-MUSE-04: Same input+seed = same output
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import { createHash } from 'crypto';
import type {
  SuggestInput,
  Suggestion,
  AssessInput,
  ProjectInput,
  NarrativeContext,
  Rationale,
} from './types';
import type { EmotionStateV2 } from '../emotion_v2';
import type { StrategyId } from './constants';

/**
 * Compute SHA-256 hash of string
 */
export function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Normalize object to stable JSON string
 * Keys are sorted, no whitespace, deterministic
 */
export function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

/**
 * Hash an EmotionStateV2 (extract relevant fields only)
 */
export function hashEmotionState(emotion: EmotionStateV2): string {
  const relevant = {
    appraisal: emotion.appraisal,
    signals: emotion.signals,
    dynamics: emotion.dynamics,
    narrative_role: emotion.narrative_role,
  };
  return sha256(stableStringify(relevant));
}

/**
 * Hash a NarrativeContext
 */
export function hashContext(context: NarrativeContext): string {
  const relevant = {
    scene_id: context.scene_id,
    scene_goal: context.scene_goal,
    current_beat: context.current_beat,
    characters: context.characters.map(c => ({
      id: c.id,
      agency_level: c.agency_level,
      emotional_state: c.emotional_state,
    })),
    constraints: [...context.constraints].sort(),
    style_profile: context.style_profile,
  };
  return sha256(stableStringify(relevant));
}

/**
 * Hash SuggestInput — full input fingerprint
 */
export function hashSuggestInput(input: SuggestInput): string {
  const data = {
    emotion: hashEmotionState(input.emotion),
    context: hashContext(input.context),
    seed: input.seed,
    previous: input.previous_suggestions?.sort() ?? [],
  };
  return sha256(stableStringify(data));
}

/**
 * Hash AssessInput
 */
export function hashAssessInput(input: AssessInput): string {
  const data = {
    current: hashEmotionState(input.current),
    history: input.history.map(hashEmotionState),
    arc: input.arc,
    style_profile: input.style_profile,
  };
  return sha256(stableStringify(data));
}

/**
 * Hash ProjectInput
 */
export function hashProjectInput(input: ProjectInput): string {
  const data = {
    history: input.history.map(hashEmotionState),
    context: hashContext(input.context),
    horizon: input.horizon,
    seed: input.seed,
  };
  return sha256(stableStringify(data));
}

/**
 * Generate suggestion fingerprint (for ID generation)
 * Combines strategy, content structure, expected shift
 */
export function fingerprintSuggestion(
  strategy: StrategyId,
  content: string,
  targetCharacter: string | undefined,
  expectedShift: { from: string; to: string; intensity_delta: number },
  rationale: Rationale
): string {
  const data = {
    strategy,
    content_hash: sha256(content),
    target: targetCharacter ?? '_none_',
    shift: expectedShift,
    mechanism: rationale.mechanism,
    trigger: rationale.trigger,
  };
  return sha256(stableStringify(data));
}

/**
 * Generate suggestion ID
 * ID = sha256(strategy + input_hash + seed + fingerprint)
 */
export function generateSuggestionId(
  strategy: StrategyId,
  inputHash: string,
  seed: number,
  fingerprint: string
): string {
  const data = `${strategy}:${inputHash}:${seed}:${fingerprint}`;
  return sha256(data);
}

/**
 * Generate output hash from all suggestion/risk/scenario IDs
 */
export function generateOutputHash(ids: string[]): string {
  const sorted = [...ids].sort();
  return sha256(sorted.join(':'));
}

/**
 * Hash a Rationale for comparison
 */
export function hashRationale(rationale: Rationale): string {
  return sha256(stableStringify(rationale));
}

/**
 * Quick hash for caching (shorter, faster)
 */
export function quickHash(data: string): string {
  return sha256(data).substring(0, 16);
}

/**
 * Verify hash matches expected
 */
export function verifyHash(data: string, expected: string): boolean {
  return sha256(data) === expected;
}
