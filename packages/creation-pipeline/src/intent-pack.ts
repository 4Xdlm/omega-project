/**
 * OMEGA Creation Pipeline — IntentPack Validation & Normalization
 * Phase C.4 — C4-INV-09: Schema validation
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import { normalize } from './normalizer.js';
import type { IntentPack, ValidationResult, ValidationError } from './types.js';

export function validateIntentPack(input: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'IntentPack must be a non-null object', severity: 'FATAL' }],
      input_hash: '',
    };
  }

  const pack = input as Record<string, unknown>;

  // intent
  if (!pack.intent || typeof pack.intent !== 'object') {
    errors.push({ field: 'intent', message: 'intent is required and must be an object', severity: 'FATAL' });
  } else {
    const intent = pack.intent as Record<string, unknown>;
    if (!intent.title || typeof intent.title !== 'string' || intent.title.length === 0) {
      errors.push({ field: 'intent.title', message: 'title is required and must be non-empty string', severity: 'FATAL' });
    }
    if (!intent.premise || typeof intent.premise !== 'string') {
      errors.push({ field: 'intent.premise', message: 'premise is required', severity: 'FATAL' });
    }
    if (!Array.isArray(intent.themes) || intent.themes.length === 0) {
      errors.push({ field: 'intent.themes', message: 'themes must be non-empty array', severity: 'FATAL' });
    }
    if (!intent.core_emotion || typeof intent.core_emotion !== 'string') {
      errors.push({ field: 'intent.core_emotion', message: 'core_emotion is required', severity: 'FATAL' });
    }
    if (typeof intent.target_word_count !== 'number' || intent.target_word_count <= 0) {
      errors.push({ field: 'intent.target_word_count', message: 'target_word_count must be positive number', severity: 'FATAL' });
    }
  }

  // canon
  if (!pack.canon || typeof pack.canon !== 'object') {
    errors.push({ field: 'canon', message: 'canon is required', severity: 'FATAL' });
  } else {
    const canon = pack.canon as Record<string, unknown>;
    if (!Array.isArray(canon.entries) || canon.entries.length === 0) {
      errors.push({ field: 'canon.entries', message: 'canon.entries must be non-empty array', severity: 'FATAL' });
    }
  }

  // constraints
  if (!pack.constraints || typeof pack.constraints !== 'object') {
    errors.push({ field: 'constraints', message: 'constraints is required', severity: 'FATAL' });
  } else {
    const c = pack.constraints as Record<string, unknown>;
    if (!c.pov || typeof c.pov !== 'string') {
      errors.push({ field: 'constraints.pov', message: 'pov is required', severity: 'FATAL' });
    }
    if (!c.tense || typeof c.tense !== 'string') {
      errors.push({ field: 'constraints.tense', message: 'tense is required', severity: 'FATAL' });
    }
    if (typeof c.max_scenes !== 'number' || typeof c.min_scenes !== 'number') {
      errors.push({ field: 'constraints.scenes', message: 'max_scenes and min_scenes required', severity: 'FATAL' });
    }
    if (typeof c.max_scenes === 'number' && typeof c.min_scenes === 'number' && c.min_scenes > c.max_scenes) {
      errors.push({ field: 'constraints.scenes', message: 'min_scenes > max_scenes (impossible)', severity: 'FATAL' });
    }
  }

  // genome
  if (!pack.genome || typeof pack.genome !== 'object') {
    errors.push({ field: 'genome', message: 'genome is required', severity: 'FATAL' });
  } else {
    const g = pack.genome as Record<string, unknown>;
    if (typeof g.target_burstiness !== 'number' || g.target_burstiness < 0 || g.target_burstiness > 1) {
      errors.push({ field: 'genome.target_burstiness', message: 'target_burstiness must be in [0,1]', severity: 'FATAL' });
    }
    if (typeof g.target_lexical_richness !== 'number' || g.target_lexical_richness < 0 || g.target_lexical_richness > 1) {
      errors.push({ field: 'genome.target_lexical_richness', message: 'target_lexical_richness must be in [0,1]', severity: 'FATAL' });
    }
    if (typeof g.target_avg_sentence_length !== 'number' || g.target_avg_sentence_length <= 0) {
      errors.push({ field: 'genome.target_avg_sentence_length', message: 'target_avg_sentence_length must be positive', severity: 'FATAL' });
    }
  }

  // emotion
  if (!pack.emotion || typeof pack.emotion !== 'object') {
    errors.push({ field: 'emotion', message: 'emotion is required', severity: 'FATAL' });
  } else {
    const e = pack.emotion as Record<string, unknown>;
    if (!e.arc_emotion || typeof e.arc_emotion !== 'string') {
      errors.push({ field: 'emotion.arc_emotion', message: 'arc_emotion is required', severity: 'FATAL' });
    }
    if (!Array.isArray(e.waypoints) || e.waypoints.length < 2) {
      errors.push({ field: 'emotion.waypoints', message: 'waypoints must have at least 2 entries', severity: 'FATAL' });
    }
  }

  // metadata
  if (!pack.metadata || typeof pack.metadata !== 'object') {
    errors.push({ field: 'metadata', message: 'metadata is required', severity: 'FATAL' });
  } else {
    const m = pack.metadata as Record<string, unknown>;
    if (!m.pack_id || typeof m.pack_id !== 'string') {
      errors.push({ field: 'metadata.pack_id', message: 'pack_id is required', severity: 'FATAL' });
    }
    if (!m.pack_version || typeof m.pack_version !== 'string') {
      errors.push({ field: 'metadata.pack_version', message: 'pack_version is required', severity: 'FATAL' });
    }
    if (!m.author || typeof m.author !== 'string') {
      errors.push({ field: 'metadata.author', message: 'author is required', severity: 'FATAL' });
    }
  }

  const inputHash = errors.length === 0 ? sha256(canonicalize(input)) : '';

  return { valid: errors.length === 0, errors, input_hash: inputHash };
}

export function normalizeIntentPack(input: IntentPack): IntentPack {
  return {
    intent: {
      ...input.intent,
      title: normalize(input.intent.title),
      premise: normalize(input.intent.premise),
      message: normalize(input.intent.message),
    },
    canon: {
      entries: input.canon.entries.map((e) => ({
        ...e,
        statement: normalize(e.statement),
      })),
    },
    constraints: input.constraints,
    genome: input.genome,
    emotion: input.emotion,
    metadata: {
      ...input.metadata,
      description: normalize(input.metadata.description),
    },
  };
}

export function hashIntentPack(input: IntentPack): string {
  return sha256(canonicalize(input));
}
