/**
 * OMEGA Orchestrator Intent Normalizer Tests v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Tests for G3 intent normalization
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  normalizePayload,
  normalizeConstraints,
  normalizeForbiddenSet,
  normalizeToneProfile,
  normalizeRawIntent,
  normalizeIntent,
  isNormalized,
  DEFAULT_MAX_LENGTH,
  MIN_MAX_LENGTH,
  MAX_MAX_LENGTH,
  DEFAULT_TONE_PROFILE,
} from '../../src/orchestrator/intent-normalizer';
import { createIntent, type RawIntentInput } from '../../src/orchestrator/intent-schema';
import type { ActorId, PatternId } from '../../src/orchestrator/types';

describe('Intent Normalizer — Phase G', () => {
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

  describe('normalizeText', () => {
    it('trims whitespace', () => {
      expect(normalizeText('  hello  ')).toBe('hello');
    });

    it('normalizes line endings', () => {
      expect(normalizeText('a\r\nb\rc')).toBe('a\nb\nc');
    });

    it('removes null bytes', () => {
      expect(normalizeText('hel\0lo')).toBe('hello');
    });

    it('collapses multiple spaces', () => {
      expect(normalizeText('hello   world')).toBe('hello world');
    });

    it('handles empty string', () => {
      expect(normalizeText('')).toBe('');
    });

    it('handles string with only whitespace', () => {
      expect(normalizeText('   ')).toBe('');
    });
  });

  describe('normalizePayload', () => {
    it('normalizes string values', () => {
      const result = normalizePayload({ text: '  hello  ' });
      expect(result.text).toBe('hello');
    });

    it('normalizes strings in arrays', () => {
      const result = normalizePayload({ items: ['  a  ', '  b  '] });
      expect(result.items).toEqual(['a', 'b']);
    });

    it('recursively normalizes nested objects', () => {
      const result = normalizePayload({
        nested: { text: '  hello  ' },
      });
      expect((result.nested as any).text).toBe('hello');
    });

    it('preserves non-string values', () => {
      const result = normalizePayload({
        num: 42,
        bool: true,
        arr: [1, 2, 3],
      });
      expect(result.num).toBe(42);
      expect(result.bool).toBe(true);
      expect(result.arr).toEqual([1, 2, 3]);
    });

    it('returns frozen object', () => {
      const result = normalizePayload({ a: 1 });
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('normalizeConstraints', () => {
    it('uses defaults for missing maxLength', () => {
      const result = normalizeConstraints({
        format: 'TEXT_ONLY',
        allowFacts: false,
      } as any);
      expect(result.maxLength).toBe(DEFAULT_MAX_LENGTH);
    });

    it('clamps maxLength to min', () => {
      const result = normalizeConstraints({
        maxLength: 0,
        format: 'TEXT_ONLY',
        allowFacts: false,
      });
      expect(result.maxLength).toBe(MIN_MAX_LENGTH);
    });

    it('clamps maxLength to max', () => {
      const result = normalizeConstraints({
        maxLength: 999999999,
        format: 'TEXT_ONLY',
        allowFacts: false,
      });
      expect(result.maxLength).toBe(MAX_MAX_LENGTH);
    });

    it('floors float maxLength', () => {
      const result = normalizeConstraints({
        maxLength: 1000.9,
        format: 'TEXT_ONLY',
        allowFacts: false,
      });
      expect(result.maxLength).toBe(1000);
    });

    it('always sets format to TEXT_ONLY', () => {
      const result = normalizeConstraints({
        maxLength: 1000,
        format: 'HTML' as any, // Even if wrong
        allowFacts: false,
      });
      expect(result.format).toBe('TEXT_ONLY');
    });

    it('always sets allowFacts to false (G-INV-01)', () => {
      const result = normalizeConstraints({
        maxLength: 1000,
        format: 'TEXT_ONLY',
        allowFacts: true as any, // Even if wrong
      });
      expect(result.allowFacts).toBe(false);
    });

    it('returns frozen object', () => {
      const result = normalizeConstraints({
        maxLength: 1000,
        format: 'TEXT_ONLY',
        allowFacts: false,
      });
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('normalizeForbiddenSet', () => {
    it('returns empty set for undefined', () => {
      const result = normalizeForbiddenSet(undefined);
      expect(result.patterns).toHaveLength(0);
      expect(result.vocabularies).toHaveLength(0);
      expect(result.structures).toHaveLength(0);
    });

    it('sorts patterns', () => {
      const result = normalizeForbiddenSet({
        patterns: ['PAT-c', 'PAT-a', 'PAT-b'] as PatternId[],
        vocabularies: [],
        structures: [],
      });
      expect(result.patterns).toEqual(['PAT-a', 'PAT-b', 'PAT-c']);
    });

    it('deduplicates entries', () => {
      const result = normalizeForbiddenSet({
        patterns: ['PAT-a', 'PAT-a', 'PAT-b'] as PatternId[],
        vocabularies: [],
        structures: [],
      });
      expect(result.patterns).toEqual(['PAT-a', 'PAT-b']);
    });

    it('returns frozen object', () => {
      const result = normalizeForbiddenSet(undefined);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.patterns)).toBe(true);
    });
  });

  describe('normalizeToneProfile', () => {
    it('returns default for undefined', () => {
      const result = normalizeToneProfile(undefined);
      expect(result).toEqual(DEFAULT_TONE_PROFILE);
    });

    it('preserves provided tone', () => {
      const result = normalizeToneProfile({
        tone: 'POETIC',
        intensity: 'HIGH',
      });
      expect(result.tone).toBe('POETIC');
      expect(result.intensity).toBe('HIGH');
    });

    it('returns frozen object', () => {
      const result = normalizeToneProfile({ tone: 'NEUTRAL', intensity: 'LOW' });
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('normalizeRawIntent', () => {
    it('creates valid normalized Intent', () => {
      const result = normalizeRawIntent(validRawInput);

      expect(result.normalized).toBeDefined();
      expect(result.normalized.intentId).toMatch(/^INT-[a-f0-9]{32}$/);
      expect(result.normalized.actorId).toBe(validRawInput.actorId);
    });

    it('records changes made', () => {
      const inputWithoutTone: RawIntentInput = {
        ...validRawInput,
        tone: undefined,
        forbidden: undefined,
      };

      const result = normalizeRawIntent(inputWithoutTone);

      expect(result.changes).toContain('tone defaulted to NEUTRAL/MEDIUM');
      expect(result.changes).toContain('forbidden set defaulted to empty');
    });

    it('normalizes payload text', () => {
      const input: RawIntentInput = {
        ...validRawInput,
        payload: { prompt: '  hello   world  ' },
      };

      const result = normalizeRawIntent(input);

      expect((result.normalized.payload as any).prompt).toBe('hello world');
    });

    it('is deterministic (G-INV-05)', () => {
      const result1 = normalizeRawIntent(validRawInput);
      const result2 = normalizeRawIntent(validRawInput);

      expect(result1.normalized.intentId).toBe(result2.normalized.intentId);
    });

    it('result is frozen', () => {
      const result = normalizeRawIntent(validRawInput);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.changes)).toBe(true);
    });
  });

  describe('normalizeIntent', () => {
    it('normalizes existing Intent', () => {
      const intent = createIntent(validRawInput);
      const result = normalizeIntent(intent);

      expect(result.normalized).toBeDefined();
    });

    it('re-normalizes already normalized Intent', () => {
      const intent = createIntent(validRawInput);
      const result1 = normalizeIntent(intent);
      const result2 = normalizeIntent(result1.normalized);

      expect(result1.normalized.intentId).toBe(result2.normalized.intentId);
    });
  });

  describe('isNormalized', () => {
    it('returns true for normalized Intent', () => {
      const result = normalizeRawIntent(validRawInput);
      expect(isNormalized(result.normalized)).toBe(true);
    });

    it('returns false for non-normalized Intent (with changes)', () => {
      const input: RawIntentInput = {
        ...validRawInput,
        payload: { prompt: '  needs   normalization  ' },
      };
      const intent = createIntent(input);

      // The intent was created with unnormalized payload, but createIntent
      // doesn't normalize - so normalizing again would produce different hash
      // Actually, createIntent just freezes, doesn't normalize text
      // So the original intent has "  needs   normalization  " and normalized would have "needs normalization"
      // But since createIntent uses the raw payload, they'd have different hashes
      expect(isNormalized(intent)).toBe(false);
    });
  });

  describe('Constants', () => {
    it('DEFAULT_MAX_LENGTH is positive', () => {
      expect(DEFAULT_MAX_LENGTH).toBeGreaterThan(0);
    });

    it('MIN_MAX_LENGTH is 1', () => {
      expect(MIN_MAX_LENGTH).toBe(1);
    });

    it('MAX_MAX_LENGTH is large enough', () => {
      expect(MAX_MAX_LENGTH).toBeGreaterThanOrEqual(10000);
    });

    it('DEFAULT_TONE_PROFILE is frozen', () => {
      expect(Object.isFrozen(DEFAULT_TONE_PROFILE)).toBe(true);
    });

    it('DEFAULT_TONE_PROFILE has valid values', () => {
      expect(DEFAULT_TONE_PROFILE.tone).toBe('NEUTRAL');
      expect(DEFAULT_TONE_PROFILE.intensity).toBe('MEDIUM');
    });
  });
});
