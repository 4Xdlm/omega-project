// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — J3 Sterility Tests
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import evaluateSterility from '../../judges/j3_sterility';
import { DEFAULT_GENESIS_CONFIG } from '../../config/defaults';
import type { Draft } from '../../core/types';

function createDraft(text: string): Draft {
  return {
    id: 'test-draft',
    text,
    seed: 42,
    iteration: 1,
    createdAt: new Date().toISOString(),
  };
}

describe('J3 STERILITY', () => {
  describe('Lexical Cliches', () => {
    it('rejects text with "it was a dark and stormy night"', () => {
      const draft = createDraft('It was a dark and stormy night when the adventure began.');
      const result = evaluateSterility(draft, DEFAULT_GENESIS_CONFIG);
      expect(result.verdict).toBe('FAIL');
      expect(result.metrics['lexical_cliches_high']).toBeGreaterThan(0);
    });

    it('rejects text with "suddenly"', () => {
      const draft = createDraft('Suddenly, everything changed. Suddenly, she understood.');
      const result = evaluateSterility(draft, DEFAULT_GENESIS_CONFIG);
      expect(result.verdict).toBe('FAIL');
      expect(result.metrics['lexical_cliches_medium']).toBeGreaterThan(0);
    });

    it('rejects text with "happily ever after"', () => {
      const draft = createDraft('They lived happily ever after in the mountains.');
      const result = evaluateSterility(draft, DEFAULT_GENESIS_CONFIG);
      expect(result.verdict).toBe('FAIL');
    });

    it('passes text without cliches', () => {
      const draft = createDraft('The crimson light filtered through ancient branches. She paused, considering the implications.');
      const result = evaluateSterility(draft, DEFAULT_GENESIS_CONFIG);
      expect(result.verdict).toBe('PASS');
    });
  });

  describe('Concept Cliches', () => {
    it('rejects text with "heart of gold"', () => {
      const draft = createDraft('He had a heart of gold, always helping others.');
      const result = evaluateSterility(draft, DEFAULT_GENESIS_CONFIG);
      expect(result.verdict).toBe('FAIL');
      expect(result.metrics['concept_cliches_high']).toBeGreaterThan(0);
    });

    it('rejects text with "white as snow"', () => {
      const draft = createDraft('Her skin was white as snow against the dark fabric.');
      const result = evaluateSterility(draft, DEFAULT_GENESIS_CONFIG);
      expect(result.verdict).toBe('FAIL');
    });

    it('rejects text with "light at the end of the tunnel"', () => {
      const draft = createDraft('Finally, she could see the light at the end of the tunnel.');
      const result = evaluateSterility(draft, DEFAULT_GENESIS_CONFIG);
      expect(result.verdict).toBe('FAIL');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty text', () => {
      const draft = createDraft('');
      const result = evaluateSterility(draft, DEFAULT_GENESIS_CONFIG);
      expect(result.verdict).toBe('PASS');
    });

    it('handles single word', () => {
      const draft = createDraft('Remarkable.');
      const result = evaluateSterility(draft, DEFAULT_GENESIS_CONFIG);
      expect(result.verdict).toBe('PASS');
    });

    it('is case insensitive', () => {
      const draft = createDraft('IT WAS A DARK AND STORMY NIGHT.');
      const result = evaluateSterility(draft, DEFAULT_GENESIS_CONFIG);
      expect(result.verdict).toBe('FAIL');
    });
  });
});
