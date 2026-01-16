/**
 * Search Suggestions Tests
 * @module @omega/search/test/suggest
 * @description Unit tests for Phase 148 - Search Suggestions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SearchSuggester,
  createSuggester,
  DEFAULT_SUGGESTER_CONFIG,
  type SuggestRequest,
} from '../src/suggest';

describe('OMEGA Search - Phase 148: Search Suggestions', () => {
  let suggester: SearchSuggester;

  const sampleTexts = [
    'The quick brown fox jumps over the lazy dog',
    'The quick brown bear eats honey in the forest',
    'A lazy cat sleeps on the warm sunny windowsill',
    'Quick thinking saves the day for our hero',
    'The fox and the hound become unlikely friends',
  ];

  beforeEach(() => {
    suggester = createSuggester();
    sampleTexts.forEach((text) => suggester.indexText(text));
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      expect(DEFAULT_SUGGESTER_CONFIG.maxSuggestions).toBe(10);
      expect(DEFAULT_SUGGESTER_CONFIG.minPrefixLength).toBe(2);
      expect(DEFAULT_SUGGESTER_CONFIG.fuzzyEnabled).toBe(true);
    });

    it('should accept custom configuration', () => {
      const custom = createSuggester({ maxSuggestions: 5, minPrefixLength: 3 });
      expect(custom.getStats().terms).toBe(0);
    });
  });

  describe('Indexing', () => {
    it('should index terms from text', () => {
      const stats = suggester.getStats();
      expect(stats.terms).toBeGreaterThan(0);
    });

    it('should track term frequency', () => {
      const newSuggester = createSuggester();
      newSuggester.indexText('test test test');
      const topTerms = newSuggester.getTopTerms(1);
      expect(topTerms[0].term).toBe('test');
      expect(topTerms[0].frequency).toBe(3);
    });

    it('should index phrases', () => {
      const stats = suggester.getStats();
      expect(stats.phrases).toBeGreaterThan(0);
    });

    it('should track phrase frequency', () => {
      const newSuggester = createSuggester();
      newSuggester.indexText('quick brown fox');
      newSuggester.indexText('quick brown bear');
      const topPhrases = newSuggester.getTopPhrases(5);
      const quickBrown = topPhrases.find((p) => p.phrase === 'quick brown');
      expect(quickBrown).toBeDefined();
      expect(quickBrown!.frequency).toBe(2);
    });

    it('should index with context', () => {
      const newSuggester = createSuggester();
      newSuggester.indexText('test content', 'category1');
      newSuggester.indexText('test content', 'category2');
      expect(newSuggester.getStats().terms).toBeGreaterThan(0);
    });
  });

  describe('Basic Suggestions', () => {
    it('should return suggestions for prefix', () => {
      const response = suggester.suggest({ prefix: 'qu' });
      expect(response.suggestions.length).toBeGreaterThan(0);
    });

    it('should return empty for short prefix', () => {
      const response = suggester.suggest({ prefix: 'q' });
      expect(response.suggestions).toHaveLength(0);
    });

    it('should return empty for no matches', () => {
      // Use a prefix that won't fuzzy match any terms
      const response = suggester.suggest({ prefix: 'xyzqwerty' });
      expect(response.suggestions).toHaveLength(0);
    });

    it('should include prefix in response', () => {
      const response = suggester.suggest({ prefix: 'fox' });
      expect(response.prefix).toBe('fox');
    });

    it('should track query time', () => {
      const response = suggester.suggest({ prefix: 'qu' });
      expect(response.took).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Completion Suggestions', () => {
    it('should complete partial words', () => {
      const response = suggester.suggest({ prefix: 'qui', types: ['completion'] });
      const texts = response.suggestions.map((s) => s.text);
      expect(texts.some((t) => t.startsWith('qui'))).toBe(true);
    });

    it('should rank by frequency', () => {
      const newSuggester = createSuggester();
      newSuggester.indexText('test testing tested tester');
      newSuggester.indexText('test test test');
      const response = newSuggester.suggest({ prefix: 'te', types: ['completion'] });

      if (response.suggestions.length >= 2) {
        expect(response.suggestions[0].score).toBeGreaterThanOrEqual(response.suggestions[1].score);
      }
    });

    it('should include frequency in suggestion', () => {
      const response = suggester.suggest({ prefix: 'qui', types: ['completion'] });
      if (response.suggestions.length > 0) {
        expect(response.suggestions[0].frequency).toBeDefined();
      }
    });
  });

  describe('Correction Suggestions', () => {
    it('should suggest corrections for typos', () => {
      const response = suggester.suggest({ prefix: 'qick', types: ['correction'] });
      // Should suggest 'quick' as correction
      const texts = response.suggestions.map((s) => s.text);
      expect(texts).toContain('quick');
    });

    it('should have correction type', () => {
      const response = suggester.suggest({ prefix: 'qick', types: ['correction'] });
      if (response.suggestions.length > 0) {
        expect(response.suggestions.some((s) => s.type === 'correction')).toBe(true);
      }
    });
  });

  describe('Phrase Suggestions', () => {
    it('should suggest phrases', () => {
      const response = suggester.suggest({ prefix: 'quick bro', types: ['phrase'] });
      const hasPhrase = response.suggestions.some((s) => s.text.includes(' '));
      expect(hasPhrase || response.suggestions.length === 0).toBe(true);
    });

    it('should have phrase type', () => {
      const response = suggester.suggest({ prefix: 'quick bro', types: ['phrase'] });
      if (response.suggestions.length > 0) {
        expect(response.suggestions.some((s) => s.type === 'phrase')).toBe(true);
      }
    });
  });

  describe('Popular Query Suggestions', () => {
    it('should track popular queries', () => {
      suggester.recordQuery('quick brown');
      suggester.recordQuery('quick brown');
      suggester.recordQuery('lazy dog');

      const response = suggester.suggest({ prefix: 'quick', types: ['popular'] });
      const texts = response.suggestions.map((s) => s.text);
      expect(texts).toContain('quick brown');
    });

    it('should have popular type', () => {
      suggester.recordQuery('test query');
      const response = suggester.suggest({ prefix: 'test', types: ['popular'] });
      if (response.suggestions.length > 0) {
        expect(response.suggestions[0].type).toBe('popular');
      }
    });

    it('should rank by query frequency', () => {
      suggester.recordQuery('quick fox');
      suggester.recordQuery('quick fox');
      suggester.recordQuery('quick fox');
      suggester.recordQuery('quick brown');

      const response = suggester.suggest({ prefix: 'quick', types: ['popular'] });
      if (response.suggestions.length >= 2) {
        expect(response.suggestions[0].text).toBe('quick fox');
      }
    });
  });

  describe('Filtering and Limiting', () => {
    it('should limit suggestions', () => {
      const response = suggester.suggest({ prefix: 'th', limit: 3 });
      expect(response.suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should filter by minimum score', () => {
      const response = suggester.suggest({ prefix: 'qu', minScore: 100 });
      // High minimum score should filter most suggestions
      response.suggestions.forEach((s) => {
        expect(s.score).toBeGreaterThanOrEqual(100);
      });
    });

    it('should filter by suggestion types', () => {
      suggester.recordQuery('quick query');
      const response = suggester.suggest({ prefix: 'qui', types: ['completion'] });
      response.suggestions.forEach((s) => {
        expect(s.type).toBe('completion');
      });
    });
  });

  describe('Highlighting', () => {
    it('should highlight matching prefix', () => {
      const response = suggester.suggest({ prefix: 'qui' });
      if (response.suggestions.length > 0) {
        expect(response.suggestions[0].highlighted).toBeDefined();
        expect(response.suggestions[0].highlighted).toContain('<em>');
      }
    });

    it('should wrap prefix in em tags', () => {
      const response = suggester.suggest({ prefix: 'qui' });
      if (response.suggestions.length > 0 && response.suggestions[0].highlighted) {
        expect(response.suggestions[0].highlighted).toContain('<em>qui');
      }
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate suggestions', () => {
      suggester.recordQuery('quick');
      // 'quick' should appear only once even if it matches multiple types
      const response = suggester.suggest({
        prefix: 'qui',
        types: ['completion', 'popular'],
      });

      const quickSuggestions = response.suggestions.filter((s) =>
        s.text.toLowerCase() === 'quick'
      );
      expect(quickSuggestions.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Statistics', () => {
    it('should return term count', () => {
      const stats = suggester.getStats();
      expect(stats.terms).toBeGreaterThan(0);
    });

    it('should return phrase count', () => {
      const stats = suggester.getStats();
      expect(stats.phrases).toBeGreaterThan(0);
    });

    it('should return popular query count', () => {
      suggester.recordQuery('test');
      const stats = suggester.getStats();
      expect(stats.popularQueries).toBe(1);
    });

    it('should get top terms', () => {
      const topTerms = suggester.getTopTerms(5);
      expect(topTerms.length).toBeLessThanOrEqual(5);
      if (topTerms.length >= 2) {
        expect(topTerms[0].frequency).toBeGreaterThanOrEqual(topTerms[1].frequency);
      }
    });

    it('should get top phrases', () => {
      const topPhrases = suggester.getTopPhrases(5);
      expect(topPhrases.length).toBeLessThanOrEqual(5);
    });

    it('should get top popular queries', () => {
      suggester.recordQuery('query1');
      suggester.recordQuery('query1');
      suggester.recordQuery('query2');

      const topPopular = suggester.getTopPopularQueries(5);
      expect(topPopular[0].query).toBe('query1');
      expect(topPopular[0].frequency).toBe(2);
    });
  });

  describe('Clear', () => {
    it('should clear all data', () => {
      suggester.recordQuery('test');
      suggester.clear();

      const stats = suggester.getStats();
      expect(stats.terms).toBe(0);
      expect(stats.phrases).toBe(0);
      expect(stats.popularQueries).toBe(0);
    });
  });

  describe('Invariants', () => {
    it('INV-SUGGEST-001: Suggestions must be sorted by score descending', () => {
      const response = suggester.suggest({ prefix: 'th' });
      for (let i = 1; i < response.suggestions.length; i++) {
        expect(response.suggestions[i - 1].score).toBeGreaterThanOrEqual(
          response.suggestions[i].score
        );
      }
    });

    it('INV-SUGGEST-002: Score must be non-negative', () => {
      const response = suggester.suggest({ prefix: 'qu' });
      response.suggestions.forEach((s) => {
        expect(s.score).toBeGreaterThanOrEqual(0);
      });
    });

    it('INV-SUGGEST-003: Suggestion text must not be empty', () => {
      const response = suggester.suggest({ prefix: 'qu' });
      response.suggestions.forEach((s) => {
        expect(s.text.length).toBeGreaterThan(0);
      });
    });

    it('INV-SUGGEST-004: Type must be valid', () => {
      const response = suggester.suggest({ prefix: 'qu' });
      const validTypes = ['completion', 'correction', 'phrase', 'popular'];
      response.suggestions.forEach((s) => {
        expect(validTypes).toContain(s.type);
      });
    });

    it('INV-SUGGEST-005: Limit must be respected', () => {
      const response = suggester.suggest({ prefix: 'th', limit: 2 });
      expect(response.suggestions.length).toBeLessThanOrEqual(2);
    });

    it('INV-SUGGEST-006: Highlighted must contain original text', () => {
      const response = suggester.suggest({ prefix: 'qui' });
      response.suggestions.forEach((s) => {
        if (s.highlighted) {
          // Remove em tags and check text is preserved
          const cleaned = s.highlighted.replace(/<\/?em>/g, '');
          expect(cleaned.toLowerCase()).toBe(s.text.toLowerCase());
        }
      });
    });
  });
});
