/**
 * OMEGA Orchestrator Intent Schema Tests v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Tests for G1 intent schema
 */

import { describe, it, expect } from 'vitest';
import {
  INTENT_SCHEMA,
  INTENT_SCHEMA_VERSION,
  normalizeIntentForHash,
  computeIntentHash,
  generateIntentId,
  createIntent,
  getIntentSchema,
  getSchemaVersion,
  computeSchemaHash,
  type RawIntentInput,
} from '../../src/orchestrator/intent-schema';
import type { ActorId, IntentId } from '../../src/orchestrator/types';
import { isIntentId, isIntent, createEmptyForbiddenSet } from '../../src/orchestrator/types';

describe('Intent Schema — Phase G', () => {
  const validRawInput: RawIntentInput = {
    actorId: 'ACT-user1' as ActorId,
    goal: 'DRAFT',
    constraints: {
      maxLength: 1000,
      format: 'TEXT_ONLY',
      allowFacts: false,
    },
    payload: { prompt: 'Write a story about a cat' },
  };

  describe('INTENT_SCHEMA', () => {
    it('schema is frozen', () => {
      expect(Object.isFrozen(INTENT_SCHEMA)).toBe(true);
    });

    it('has correct $id', () => {
      expect(INTENT_SCHEMA.$id).toBe('omega://schema/intent/v1');
    });

    it('requires allowFacts to be false (G-INV-01)', () => {
      const constraintsSchema = INTENT_SCHEMA.properties.constraints;
      expect(constraintsSchema.properties.allowFacts.const).toBe(false);
    });

    it('has correct required fields', () => {
      expect(INTENT_SCHEMA.required).toContain('intentId');
      expect(INTENT_SCHEMA.required).toContain('actorId');
      expect(INTENT_SCHEMA.required).toContain('goal');
      expect(INTENT_SCHEMA.required).toContain('constraints');
      expect(INTENT_SCHEMA.required).toContain('payload');
    });

    it('format is always TEXT_ONLY', () => {
      const formatSchema = INTENT_SCHEMA.properties.constraints.properties.format;
      expect(formatSchema.const).toBe('TEXT_ONLY');
    });
  });

  describe('INTENT_SCHEMA_VERSION', () => {
    it('follows semver format', () => {
      expect(INTENT_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('normalizeIntentForHash', () => {
    it('produces deterministic normalized string', () => {
      const result1 = normalizeIntentForHash(validRawInput);
      const result2 = normalizeIntentForHash(validRawInput);
      expect(result1).toBe(result2);
    });

    it('includes all required fields', () => {
      const result = normalizeIntentForHash(validRawInput);
      const parsed = JSON.parse(result);

      expect(parsed.actorId).toBe(validRawInput.actorId);
      expect(parsed.goal).toBe(validRawInput.goal);
      expect(parsed.constraints).toBeDefined();
      expect(parsed.payload).toBeDefined();
    });

    it('includes optional fields when present', () => {
      const inputWithOptional: RawIntentInput = {
        ...validRawInput,
        tone: { tone: 'NARRATIVE', intensity: 'MEDIUM' },
        forbidden: createEmptyForbiddenSet(),
      };

      const result = normalizeIntentForHash(inputWithOptional);
      const parsed = JSON.parse(result);

      expect(parsed.tone).toBeDefined();
      expect(parsed.forbidden).toBeDefined();
    });

    it('sorts payload keys for determinism', () => {
      const input1: RawIntentInput = {
        ...validRawInput,
        payload: { a: 1, b: 2, c: 3 },
      };

      const input2: RawIntentInput = {
        ...validRawInput,
        payload: { c: 3, a: 1, b: 2 },
      };

      expect(normalizeIntentForHash(input1)).toBe(normalizeIntentForHash(input2));
    });

    it('handles nested payload objects', () => {
      const input: RawIntentInput = {
        ...validRawInput,
        payload: {
          nested: { z: 1, a: 2 },
          array: [3, 2, 1],
        },
      };

      const result = normalizeIntentForHash(input);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('computeIntentHash', () => {
    it('returns 64-character hex string (SHA256)', () => {
      const hash = computeIntentHash(validRawInput);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is deterministic', () => {
      const hash1 = computeIntentHash(validRawInput);
      const hash2 = computeIntentHash(validRawInput);
      expect(hash1).toBe(hash2);
    });

    it('different inputs produce different hashes', () => {
      const input1 = validRawInput;
      const input2: RawIntentInput = {
        ...validRawInput,
        payload: { prompt: 'Different prompt' },
      };

      const hash1 = computeIntentHash(input1);
      const hash2 = computeIntentHash(input2);

      expect(hash1).not.toBe(hash2);
    });

    it('is deterministic across 100 runs', () => {
      const first = computeIntentHash(validRawInput);
      for (let i = 0; i < 100; i++) {
        expect(computeIntentHash(validRawInput)).toBe(first);
      }
    });
  });

  describe('generateIntentId', () => {
    it('returns valid IntentId format', () => {
      const intentId = generateIntentId(validRawInput);
      expect(isIntentId(intentId)).toBe(true);
      expect(intentId).toMatch(/^INT-[a-f0-9]{32}$/);
    });

    it('is deterministic (G-INV-07)', () => {
      const id1 = generateIntentId(validRawInput);
      const id2 = generateIntentId(validRawInput);
      expect(id1).toBe(id2);
    });

    it('different inputs produce different IDs', () => {
      const input1 = validRawInput;
      const input2: RawIntentInput = {
        ...validRawInput,
        goal: 'REWRITE',
      };

      const id1 = generateIntentId(input1);
      const id2 = generateIntentId(input2);

      expect(id1).not.toBe(id2);
    });

    it('is consistent with computeIntentHash', () => {
      const intentId = generateIntentId(validRawInput);
      const hash = computeIntentHash(validRawInput);

      expect(intentId).toBe(`INT-${hash.substring(0, 32)}`);
    });
  });

  describe('createIntent', () => {
    it('creates valid Intent with generated IntentId', () => {
      const intent = createIntent(validRawInput);

      expect(isIntent(intent)).toBe(true);
      expect(isIntentId(intent.intentId)).toBe(true);
      expect(intent.actorId).toBe(validRawInput.actorId);
      expect(intent.goal).toBe(validRawInput.goal);
    });

    it('creates frozen Intent', () => {
      const intent = createIntent(validRawInput);

      expect(Object.isFrozen(intent)).toBe(true);
      expect(Object.isFrozen(intent.constraints)).toBe(true);
      expect(Object.isFrozen(intent.payload)).toBe(true);
    });

    it('handles optional fields', () => {
      const inputWithOptional: RawIntentInput = {
        ...validRawInput,
        tone: { tone: 'POETIC', intensity: 'HIGH' },
        forbidden: {
          patterns: ['PAT-test' as any],
          vocabularies: ['VOC-test' as any],
          structures: ['STR-test' as any],
        },
      };

      const intent = createIntent(inputWithOptional);

      expect(intent.tone).toBeDefined();
      expect(intent.tone!.tone).toBe('POETIC');
      expect(intent.forbidden).toBeDefined();
      expect(intent.forbidden!.patterns).toHaveLength(1);
    });

    it('is deterministic', () => {
      const intent1 = createIntent(validRawInput);
      const intent2 = createIntent(validRawInput);

      expect(intent1.intentId).toBe(intent2.intentId);
    });
  });

  describe('getIntentSchema', () => {
    it('returns the schema', () => {
      const schema = getIntentSchema();
      expect(schema).toBe(INTENT_SCHEMA);
    });
  });

  describe('getSchemaVersion', () => {
    it('returns version string', () => {
      const version = getSchemaVersion();
      expect(version).toBe(INTENT_SCHEMA_VERSION);
    });
  });

  describe('computeSchemaHash', () => {
    it('returns valid SHA256 hash', () => {
      const hash = computeSchemaHash();
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is deterministic', () => {
      const hash1 = computeSchemaHash();
      const hash2 = computeSchemaHash();
      expect(hash1).toBe(hash2);
    });
  });

  describe('G-INV-07: IntentId = SHA256(normalized_intent_content)', () => {
    it('IntentId is derived from normalized content hash', () => {
      const normalized = normalizeIntentForHash(validRawInput);
      const hash = computeIntentHash(validRawInput);
      const intentId = generateIntentId(validRawInput);

      // IntentId should be INT- prefix + first 32 chars of hash
      expect(intentId).toBe(`INT-${hash.substring(0, 32)}`);
    });

    it('same normalized content produces same IntentId', () => {
      // Two inputs that normalize to the same content
      const input1: RawIntentInput = {
        ...validRawInput,
        payload: { a: 1, b: 2 },
      };

      const input2: RawIntentInput = {
        ...validRawInput,
        payload: { b: 2, a: 1 }, // Different order, same values
      };

      const id1 = generateIntentId(input1);
      const id2 = generateIntentId(input2);

      expect(id1).toBe(id2);
    });
  });
});
