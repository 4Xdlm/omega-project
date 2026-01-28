/**
 * OMEGA Orchestrator Intent Validator Tests v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Tests for G2 intent validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateIntent,
  validateRawIntentInput,
  detectFactInjection,
  detectForbiddenStructures,
  validateIntentId,
  validateActorId,
  validateGoal,
  validateConstraints,
  validatePayload,
  validateIntentIdMatch,
  FACT_INJECTION_PATTERNS,
  FORBIDDEN_KEYWORDS,
} from '../../src/orchestrator/intent-validator';
import { createIntent, type RawIntentInput } from '../../src/orchestrator/intent-schema';
import type { ActorId, Intent, IntentId } from '../../src/orchestrator/types';
import { createEmptyForbiddenSet } from '../../src/orchestrator/types';

describe('Intent Validator — Phase G', () => {
  const validRawInput: RawIntentInput = {
    actorId: 'ACT-user1' as ActorId,
    goal: 'DRAFT',
    constraints: {
      maxLength: 1000,
      format: 'TEXT_ONLY',
      allowFacts: false,
    },
    payload: { prompt: 'Write a story' },
  };

  describe('Fact Injection Detection (G-INV-01)', () => {
    describe('detectFactInjection', () => {
      it('detects [FACT] pattern', () => {
        expect(detectFactInjection({ text: '[FACT] Alice is tall' })).toBe(true);
      });

      it('detects [CANON] pattern', () => {
        expect(detectFactInjection({ text: '[CANON] data' })).toBe(true);
      });

      it('detects [TRUTH] pattern', () => {
        expect(detectFactInjection({ text: '[TRUTH] assertion' })).toBe(true);
      });

      it('detects fact: { structure', () => {
        expect(detectFactInjection({ data: 'fact: { type: "claim" }' })).toBe(true);
      });

      it('detects predicate field', () => {
        expect(detectFactInjection({ obj: { "predicate": "HAS_NAME" } })).toBe(true);
      });

      it('detects entity ID patterns', () => {
        expect(detectFactInjection({ entity: 'ENT-alice-12345678' })).toBe(true);
        expect(detectFactInjection({ claim: 'CLM-abcd1234' })).toBe(true);
      });

      it('detects forbidden keywords', () => {
        expect(detectFactInjection({ cmd: '__canon__' })).toBe(true);
        expect(detectFactInjection({ cmd: 'inject_fact' })).toBe(true);
        expect(detectFactInjection({ cmd: 'bypass_gate' })).toBe(true);
      });

      it('allows safe payload', () => {
        expect(detectFactInjection({ prompt: 'Write a story about a cat' })).toBe(false);
        expect(detectFactInjection({ title: 'My Novel', genre: 'fiction' })).toBe(false);
      });
    });

    describe('detectForbiddenStructures', () => {
      it('detects __proto__ in stringified form', () => {
        // __proto__ as object key is special in JS, use JSON parse
        const obj = JSON.parse('{"__proto__": {}}');
        expect(detectForbiddenStructures(obj)).toBe(true);
      });

      it('detects __canon__ key', () => {
        const obj = Object.create(null);
        obj['__canon__'] = {};
        expect(detectForbiddenStructures(obj)).toBe(true);
      });

      it('detects __truth__ key', () => {
        const obj = Object.create(null);
        obj['__truth__'] = true;
        expect(detectForbiddenStructures(obj)).toBe(true);
      });

      it('detects nested forbidden keys', () => {
        const nested = { safe: { deep: Object.create(null) } };
        nested.safe.deep['__truth__'] = true;
        expect(detectForbiddenStructures(nested)).toBe(true);
      });

      it('allows safe structures', () => {
        expect(detectForbiddenStructures({ prompt: 'safe', data: { nested: true } })).toBe(false);
      });

      it('handles null and undefined', () => {
        expect(detectForbiddenStructures(null)).toBe(false);
        expect(detectForbiddenStructures(undefined)).toBe(false);
      });
    });
  });

  describe('Field Validators', () => {
    describe('validateIntentId', () => {
      it('accepts valid IntentId', () => {
        expect(validateIntentId('INT-0123456789abcdef0123456789abcdef')).toBeNull();
      });

      it('rejects invalid IntentId', () => {
        const error = validateIntentId('invalid');
        expect(error).not.toBeNull();
        expect(error!.code).toBe('INVALID_INTENT_ID');
      });
    });

    describe('validateActorId', () => {
      it('accepts valid ActorId', () => {
        expect(validateActorId('ACT-user1')).toBeNull();
      });

      it('rejects invalid ActorId', () => {
        const error = validateActorId('user1');
        expect(error).not.toBeNull();
        expect(error!.code).toBe('INVALID_ACTOR_ID');
      });
    });

    describe('validateGoal', () => {
      it('accepts valid goal', () => {
        expect(validateGoal('DRAFT')).toBeNull();
        expect(validateGoal('REWRITE')).toBeNull();
      });

      it('rejects invalid goal', () => {
        const error = validateGoal('INVALID_GOAL');
        expect(error).not.toBeNull();
        expect(error!.code).toBe('INVALID_GOAL');
      });
    });

    describe('validateConstraints', () => {
      it('accepts valid constraints', () => {
        const constraints = {
          maxLength: 1000,
          format: 'TEXT_ONLY',
          allowFacts: false,
        };
        expect(validateConstraints(constraints)).toBeNull();
      });

      it('rejects allowFacts: true (G-INV-01)', () => {
        const constraints = {
          maxLength: 1000,
          format: 'TEXT_ONLY',
          allowFacts: true,
        };
        const error = validateConstraints(constraints);
        expect(error).not.toBeNull();
        expect(error!.code).toBe('INVALID_CONSTRAINTS');
      });

      it('rejects invalid format', () => {
        const constraints = {
          maxLength: 1000,
          format: 'HTML',
          allowFacts: false,
        };
        expect(validateConstraints(constraints)).not.toBeNull();
      });
    });

    describe('validatePayload', () => {
      it('accepts safe payload', () => {
        expect(validatePayload({ prompt: 'Write a story' })).toBeNull();
      });

      it('rejects payload with fact injection', () => {
        const error = validatePayload({ text: '[FACT] data' });
        expect(error).not.toBeNull();
        expect(error!.code).toBe('FACT_INJECTION_DETECTED');
      });

      it('rejects non-object payload', () => {
        const error = validatePayload('not an object');
        expect(error).not.toBeNull();
        expect(error!.code).toBe('INVALID_PAYLOAD');
      });

      it('rejects payload with forbidden structures', () => {
        // Use JSON parse to create object with __proto__ key
        const payload = JSON.parse('{"__proto__": {}}');
        const error = validatePayload(payload);
        expect(error).not.toBeNull();
        expect(error!.code).toBe('FACT_INJECTION_DETECTED');
      });
    });
  });

  describe('validateIntentIdMatch (G-INV-07)', () => {
    it('accepts Intent with correct IntentId', () => {
      const intent = createIntent(validRawInput);
      const error = validateIntentIdMatch(intent);
      expect(error).toBeNull();
    });

    it('rejects Intent with wrong IntentId', () => {
      const intent = createIntent(validRawInput);
      const tamperedIntent: Intent = {
        ...intent,
        intentId: 'INT-ffffffffffffffffffffffffffffffff' as IntentId,
      };

      const error = validateIntentIdMatch(tamperedIntent);
      expect(error).not.toBeNull();
      expect(error!.code).toBe('INVALID_INTENT_ID');
      expect(error!.message).toContain('G-INV-07');
    });
  });

  describe('validateIntent', () => {
    it('accepts valid intent', () => {
      const intent = createIntent(validRawInput);
      const result = validateIntent(intent);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects intent with fact injection in payload', () => {
      const badInput: RawIntentInput = {
        ...validRawInput,
        payload: { inject: '[CANON] fact data' },
      };
      const intent = createIntent(badInput);

      const result = validateIntent(intent);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'FACT_INJECTION_DETECTED')).toBe(true);
    });

    it('rejects null input', () => {
      const result = validateIntent(null);
      expect(result.valid).toBe(false);
    });

    it('rejects intent missing required fields', () => {
      const result = validateIntent({ intentId: 'invalid' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('result is frozen', () => {
      const intent = createIntent(validRawInput);
      const result = validateIntent(intent);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.errors)).toBe(true);
    });
  });

  describe('validateRawIntentInput', () => {
    it('accepts valid raw input', () => {
      const result = validateRawIntentInput(validRawInput);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects raw input with fact injection', () => {
      const badInput = {
        ...validRawInput,
        payload: { data: '__canon__' },
      };

      const result = validateRawIntentInput(badInput);

      expect(result.valid).toBe(false);
    });

    it('rejects raw input with invalid constraints', () => {
      const badInput = {
        ...validRawInput,
        constraints: {
          maxLength: 1000,
          format: 'TEXT_ONLY',
          allowFacts: true, // Invalid!
        },
      };

      const result = validateRawIntentInput(badInput);

      expect(result.valid).toBe(false);
    });
  });

  describe('FACT_INJECTION_PATTERNS', () => {
    it('is an array of RegExp', () => {
      expect(Array.isArray(FACT_INJECTION_PATTERNS)).toBe(true);
      FACT_INJECTION_PATTERNS.forEach(p => {
        expect(p).toBeInstanceOf(RegExp);
      });
    });
  });

  describe('FORBIDDEN_KEYWORDS', () => {
    it('is an array of strings', () => {
      expect(Array.isArray(FORBIDDEN_KEYWORDS)).toBe(true);
      FORBIDDEN_KEYWORDS.forEach(k => {
        expect(typeof k).toBe('string');
      });
    });

    it('includes canon-related keywords', () => {
      expect(FORBIDDEN_KEYWORDS).toContain('__canon__');
      expect(FORBIDDEN_KEYWORDS).toContain('__truth__');
    });
  });

  describe('G-INV-01: No fact injected via Intent', () => {
    const factInjectionAttempts = [
      { payload: { text: '[FACT] Alice is 30 years old' } },
      { payload: { data: 'fact: { subject: "ENT-alice-123" }' } },
      { payload: { inject: '__canon__' } },
      { payload: { bypass: 'bypass_gate' } },
      { payload: { entity: 'ENT-test-12345678' } },
      { payload: { claim: 'CLM-abc123' } },
      { payload: { pred: 'HAS_NAME' } },
    ];

    it('rejects all fact injection attempts', () => {
      factInjectionAttempts.forEach(attempt => {
        const input: RawIntentInput = {
          ...validRawInput,
          ...attempt,
        };

        const result = validateRawIntentInput(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.code === 'FACT_INJECTION_DETECTED')).toBe(true);
      });
    });
  });
});
