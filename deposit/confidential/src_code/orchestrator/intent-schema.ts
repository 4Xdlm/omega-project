/**
 * OMEGA Orchestrator Intent Schema v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * JSON Schema definitions for Intent validation
 *
 * INVARIANTS:
 * - G-INV-01: No fact injection via Intent (schema enforces allowFacts: false)
 * - G-INV-07: IntentId = SHA256(normalized_intent_content)
 *
 * SPEC: ORCHESTRATOR_SPEC v1.0 §G1
 */

import { createHash } from 'crypto';
import type {
  IntentId,
  ActorId,
  Intent,
  IntentGoal,
  IntentConstraints,
  ToneProfile,
  ForbiddenSet,
  Sha256,
} from './types';
import { INTENT_GOALS, TONE_IDS, TONE_INTENSITIES } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * JSON Schema for Intent validation.
 * This schema enforces G-INV-01: allowFacts must be false.
 */
export const INTENT_SCHEMA = Object.freeze({
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'omega://schema/intent/v1',
  title: 'OMEGA Intent Schema',
  description: 'Schema for validating Intent objects in the OMEGA Orchestrator',
  type: 'object',
  required: ['intentId', 'actorId', 'goal', 'constraints', 'payload'],
  additionalProperties: false,
  properties: {
    intentId: {
      type: 'string',
      pattern: '^INT-[a-f0-9]{32}$',
      description: 'Unique intent identifier (SHA256-based)',
    },
    actorId: {
      type: 'string',
      pattern: '^ACT-[a-zA-Z0-9_-]+$',
      description: 'Actor who submitted the intent',
    },
    goal: {
      type: 'string',
      enum: INTENT_GOALS,
      description: 'Intent goal type',
    },
    constraints: {
      type: 'object',
      required: ['maxLength', 'format', 'allowFacts'],
      additionalProperties: false,
      properties: {
        maxLength: {
          type: 'integer',
          minimum: 1,
          maximum: 100000,
          description: 'Maximum output length in characters',
        },
        format: {
          type: 'string',
          const: 'TEXT_ONLY',
          description: 'Output format (always TEXT_ONLY)',
        },
        allowFacts: {
          type: 'boolean',
          const: false, // G-INV-01: MUST be false
          description: 'Whether facts are allowed (always false)',
        },
      },
    },
    tone: {
      type: 'object',
      required: ['tone', 'intensity'],
      additionalProperties: false,
      properties: {
        tone: {
          type: 'string',
          enum: TONE_IDS,
        },
        intensity: {
          type: 'string',
          enum: TONE_INTENSITIES,
        },
      },
    },
    forbidden: {
      type: 'object',
      required: ['patterns', 'vocabularies', 'structures'],
      additionalProperties: false,
      properties: {
        patterns: {
          type: 'array',
          items: { type: 'string', pattern: '^PAT-[a-zA-Z0-9_-]+$' },
        },
        vocabularies: {
          type: 'array',
          items: { type: 'string', pattern: '^VOC-[a-zA-Z0-9_-]+$' },
        },
        structures: {
          type: 'array',
          items: { type: 'string', pattern: '^STR-[a-zA-Z0-9_-]+$' },
        },
      },
    },
    payload: {
      type: 'object',
      description: 'Intent-specific payload data',
    },
  },
});

/**
 * Schema version for tracking
 */
export const INTENT_SCHEMA_VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════════════════════════
// RAW INTENT TYPE (before ID generation)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw intent input before IntentId is generated.
 * This is what the user provides; we compute the IntentId from it.
 */
export interface RawIntentInput {
  readonly actorId: ActorId;
  readonly goal: IntentGoal;
  readonly constraints: IntentConstraints;
  readonly tone?: ToneProfile;
  readonly forbidden?: ForbiddenSet;
  readonly payload: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes the normalized content for IntentId generation.
 * G-INV-07: IntentId = SHA256(normalized_intent_content)
 *
 * The normalized content includes:
 * - actorId
 * - goal
 * - constraints (sorted keys)
 * - tone (if present)
 * - forbidden (if present, sorted)
 * - payload (sorted keys, JSON stringified)
 */
export function normalizeIntentForHash(input: RawIntentInput): string {
  const normalized: Record<string, unknown> = {
    actorId: input.actorId,
    goal: input.goal,
    constraints: {
      maxLength: input.constraints.maxLength,
      format: input.constraints.format,
      allowFacts: input.constraints.allowFacts,
    },
  };

  if (input.tone) {
    normalized.tone = {
      tone: input.tone.tone,
      intensity: input.tone.intensity,
    };
  }

  if (input.forbidden) {
    normalized.forbidden = {
      patterns: [...input.forbidden.patterns].sort(),
      vocabularies: [...input.forbidden.vocabularies].sort(),
      structures: [...input.forbidden.structures].sort(),
    };
  }

  // Sort payload keys for determinism
  const sortedPayload = sortObjectKeys(input.payload);
  normalized.payload = sortedPayload;

  // Canonical JSON serialization with sorted keys
  const sortedNormalized = sortObjectKeys(normalized);
  return JSON.stringify(sortedNormalized);
}

/**
 * Recursively sorts object keys for deterministic serialization.
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  for (const key of keys) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Computes SHA256 hash of the normalized intent content.
 * Returns the first 32 characters (128 bits) for IntentId.
 */
export function computeIntentHash(input: RawIntentInput): Sha256 {
  const normalized = normalizeIntentForHash(input);
  return createHash('sha256').update(normalized).digest('hex') as Sha256;
}

/**
 * Generates IntentId from raw input.
 * G-INV-07: IntentId = SHA256(normalized_intent_content)
 *
 * @param input - Raw intent input
 * @returns Deterministic IntentId
 */
export function generateIntentId(input: RawIntentInput): IntentId {
  const hash = computeIntentHash(input);
  // Use first 32 chars of SHA256 for IntentId
  return `INT-${hash.substring(0, 32)}` as IntentId;
}

/**
 * Creates a complete Intent from raw input.
 * Automatically generates the IntentId.
 *
 * @param input - Raw intent input
 * @returns Complete Intent with generated IntentId
 */
export function createIntent(input: RawIntentInput): Intent {
  const intentId = generateIntentId(input);

  return Object.freeze({
    intentId,
    actorId: input.actorId,
    goal: input.goal,
    constraints: Object.freeze({ ...input.constraints }),
    tone: input.tone ? Object.freeze({ ...input.tone }) : undefined,
    forbidden: input.forbidden
      ? Object.freeze({
          patterns: Object.freeze([...input.forbidden.patterns]),
          vocabularies: Object.freeze([...input.forbidden.vocabularies]),
          structures: Object.freeze([...input.forbidden.structures]),
        })
      : undefined,
    payload: Object.freeze({ ...input.payload }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets the schema as a frozen object.
 */
export function getIntentSchema(): typeof INTENT_SCHEMA {
  return INTENT_SCHEMA;
}

/**
 * Gets schema version.
 */
export function getSchemaVersion(): string {
  return INTENT_SCHEMA_VERSION;
}

/**
 * Computes hash of the schema for versioning.
 */
export function computeSchemaHash(): Sha256 {
  const schemaJson = JSON.stringify(INTENT_SCHEMA);
  return createHash('sha256').update(schemaJson).digest('hex') as Sha256;
}
