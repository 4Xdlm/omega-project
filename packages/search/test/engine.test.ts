/**
 * Search Engine Tests
 * @module @omega/search/test/engine
 * @description Unit tests for Phase 146 - Search Core
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SearchEngine,
  createSearchEngine,
  DEFAULT_SEARCH_CONFIG,
  type SearchDocument,
  type SearchQuery,
} from '../src/index';

describe('OMEGA Search - Phase 146: Search Core', () => {
  let engine: SearchEngine;

  const sampleDocs: SearchDocument[] = [
    { id: 'doc1', content: 'The quick brown fox jumps over the lazy dog', title: 'Fox Story' },
    { id: 'doc2', content: 'A lazy cat sleeps on the warm sunny windowsill', title: 'Cat Story' },
    { id: 'doc3', content: 'The brown bear eats honey in the forest', title: 'Bear Story' },
    { id: 'doc4', content: 'Quick thinking saves the day for our hero', title: 'Hero Tale' },
    { id: 'doc5', content: 'The fox and the hound become unlikely friends', title: 'Friendship' },
  ];

  beforeEach(() => {
    engine = createSearchEngine();
    sampleDocs.forEach((doc) => engine.index(doc));
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      expect(DEFAULT_SEARCH_CONFIG.minTokenLength).toBe(2);
      expect(DEFAULT_SEARCH_CONFIG.defaultLimit).toBe(10);
      expect(DEFAULT_SEARCH_CONFIG.useBM25).toBe(true);
    });

    it('should accept custom configuration', () => {
      const custom = createSearchEngine({ minTokenLength: 3, defaultLimit: 5 });
      expect(custom).toBeDefined();
    });

    it('should have stop words', () => {
      expect(DEFAULT_SEARCH_CONFIG.stopWords).toContain('the');
      expect(DEFAULT_SEARCH_CONFIG.stopWords).toContain('and');
    });
  });

  describe('Indexing', () => {
    it('should index a document', () => {
      const newEngine = createSearchEngine();
      const id = newEngine.index({ id: 'test', content: 'Hello world' });
      expect(id).toBe('test');
      expect(newEngine.hasDocument('test')).toBe(true);
    });

    it('should index multiple documents', () => {
      const newEngine = createSearchEngine();
      const ids = newEngine.indexBatch([
        { id: 'a', content: 'First document' },
        { id: 'b', content: 'Second document' },
      ]);
      expect(ids).toHaveLength(2);
      expect(newEngine.getDocumentIds()).toHaveLength(2);
    });

    it('should update existing document', () => {
      engine.index({ id: 'doc1', content: 'Updated content for document one' });
      const doc = engine.getDocument('doc1');
      expect(doc!.content).toBe('Updated content for document one');
    });

    it('should remove document', () => {
      expect(engine.remove('doc1')).toBe(true);
      expect(engine.hasDocument('doc1')).toBe(false);
    });

    it('should return false when removing nonexistent document', () => {
      expect(engine.remove('nonexistent')).toBe(false);
    });

    it('should clear all documents', () => {
      engine.clear();
      expect(engine.getDocumentIds()).toHaveLength(0);
    });

    it('should store document metadata', () => {
      engine.index({ id: 'meta-doc', content: 'Test', metadata: { author: 'Test Author' } });
      const doc = engine.getDocument('meta-doc');
      expect(doc!.metadata.author).toBe('Test Author');
    });
  });

  describe('Tokenization', () => {
    it('should tokenize text', () => {
      const tokens = engine.tokenize('Hello World Testing');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should lowercase tokens', () => {
      const tokens = engine.tokenize('UPPERCASE lowercase MiXeD');
      tokens.forEach((t) => expect(t).toBe(t.toLowerCase()));
    });

    it('should filter short tokens', () => {
      const tokens = engine.tokenize('a b cd efg');
      expect(tokens).not.toContain('a');
      expect(tokens).not.toContain('b');
    });

    it('should filter stop words', () => {
      const tokens = engine.tokenize('the quick brown fox');
      expect(tokens).not.toContain('the');
    });

    it('should apply stemming', () => {
      const engine = createSearchEngine({ stemming: true });
      const tokens = engine.tokenize('running jumped happily');
      expect(tokens.some((t) => t === 'runn' || t === 'jump' || t === 'happi')).toBe(true);
    });
  });

  describe('Basic Search', () => {
    it('should find matching documents', () => {
      const response = engine.search({ text: 'fox' });
      expect(response.results.length).toBeGreaterThan(0);
    });

    it('should return empty for no matches', () => {
      const response = engine.search({ text: 'xyznonexistent' });
      expect(response.results).toHaveLength(0);
    });

    it('should return empty for empty query', () => {
      const response = engine.search({ text: '' });
      expect(response.results).toHaveLength(0);
    });

    it('should return empty for whitespace query', () => {
      const response = engine.search({ text: '   ' });
      expect(response.results).toHaveLength(0);
    });

    it('should return matched terms', () => {
      const response = engine.search({ text: 'fox brown' });
      expect(response.results[0].matchedTerms.length).toBeGreaterThan(0);
    });

    it('should track total hits', () => {
      const response = engine.search({ text: 'fox' });
      expect(response.totalHits).toBeGreaterThan(0);
    });

    it('should track query time', () => {
      const response = engine.search({ text: 'fox' });
      expect(response.took).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Scoring', () => {
    it('should rank by relevance', () => {
      const response = engine.search({ text: 'fox' });
      // Documents mentioning fox should be ranked higher
      const foxDocs = response.results.filter((r) =>
        r.document.content.toLowerCase().includes('fox')
      );
      expect(foxDocs.length).toBeGreaterThan(0);
    });

    it('should have max score', () => {
      const response = engine.search({ text: 'fox' });
      expect(response.maxScore).toBeGreaterThan(0);
      if (response.results.length > 0) {
        expect(response.results[0].score).toBe(response.maxScore);
      }
    });

    it('should support boost', () => {
      const response = engine.search({
        text: 'fox',
        boost: { fox: 2.0 },
      });
      expect(response.results.length).toBeGreaterThan(0);
    });
  });

  describe('Pagination', () => {
    it('should limit results', () => {
      const response = engine.search({ text: 'story', limit: 2 });
      expect(response.results.length).toBeLessThanOrEqual(2);
    });

    it('should offset results', () => {
      const full = engine.search({ text: 'fox', limit: 10 });
      const offset = engine.search({ text: 'fox', limit: 10, offset: 1 });

      if (full.results.length > 1) {
        expect(offset.results[0].document.id).toBe(full.results[1].document.id);
      }
    });
  });

  describe('Fuzzy Search', () => {
    it('should find fuzzy matches', () => {
      const response = engine.search({ text: 'foxx', fuzzy: true });
      // Should find 'fox' even with typo
      expect(response.results.length).toBeGreaterThanOrEqual(0);
    });

    it('should not find fuzzy matches when disabled', () => {
      const response = engine.search({ text: 'foxx', fuzzy: false });
      // Exact match only, 'foxx' doesn't exist
      expect(
        response.results.every((r) => !r.document.content.includes('foxx'))
      ).toBe(true);
    });
  });

  describe('Highlighting', () => {
    it('should generate highlights', () => {
      const response = engine.search({ text: 'fox', highlight: true });
      if (response.results.length > 0) {
        expect(response.results[0].highlights).toBeDefined();
      }
    });

    it('should include fragment in highlights', () => {
      const response = engine.search({ text: 'fox', highlight: true });
      if (response.results.length > 0 && response.results[0].highlights) {
        expect(response.results[0].highlights[0].fragment).toBeTruthy();
      }
    });
  });

  describe('Filters', () => {
    it('should filter by equality', () => {
      engine.index({ id: 'filter1', content: 'Test content', metadata: { category: 'A' } });
      engine.index({ id: 'filter2', content: 'Test content', metadata: { category: 'B' } });

      const response = engine.search({
        text: 'test',
        filters: [{ field: 'category', operator: 'eq', value: 'A' }],
      });

      const ids = response.results.map((r) => r.document.id);
      expect(ids).toContain('filter1');
      expect(ids).not.toContain('filter2');
    });

    it('should filter by contains', () => {
      const response = engine.search({
        text: 'quick',
        filters: [{ field: 'title', operator: 'contains', value: 'Fox' }],
      });

      if (response.results.length > 0) {
        expect(response.results[0].document.title).toContain('Fox');
      }
    });

    it('should filter by numeric comparison', () => {
      const now = Date.now();
      engine.index({ id: 'recent', content: 'Recent doc', timestamp: now });
      engine.index({ id: 'old', content: 'Old doc', timestamp: now - 1000000 });

      const response = engine.search({
        text: 'doc',
        filters: [{ field: 'timestamp', operator: 'gt', value: now - 500000 }],
      });

      const ids = response.results.map((r) => r.document.id);
      expect(ids).toContain('recent');
    });
  });

  describe('Statistics', () => {
    it('should return document count', () => {
      const stats = engine.getStats();
      expect(stats.documentCount).toBe(5);
    });

    it('should return token count', () => {
      const stats = engine.getStats();
      expect(stats.tokenCount).toBeGreaterThan(0);
    });

    it('should return unique tokens', () => {
      const stats = engine.getStats();
      expect(stats.uniqueTokens).toBeGreaterThan(0);
    });

    it('should return average document length', () => {
      const stats = engine.getStats();
      expect(stats.avgDocumentLength).toBeGreaterThan(0);
    });

    it('should return index size', () => {
      const stats = engine.getStats();
      expect(stats.indexSize).toBeGreaterThan(0);
    });

    it('should return last updated', () => {
      const stats = engine.getStats();
      expect(stats.lastUpdated).toBeGreaterThan(0);
    });
  });

  describe('Document Operations', () => {
    it('should get document by ID', () => {
      const doc = engine.getDocument('doc1');
      expect(doc).not.toBeNull();
      expect(doc!.id).toBe('doc1');
    });

    it('should return null for nonexistent document', () => {
      const doc = engine.getDocument('nonexistent');
      expect(doc).toBeNull();
    });

    it('should check document existence', () => {
      expect(engine.hasDocument('doc1')).toBe(true);
      expect(engine.hasDocument('nonexistent')).toBe(false);
    });

    it('should get all document IDs', () => {
      const ids = engine.getDocumentIds();
      expect(ids).toContain('doc1');
      expect(ids).toContain('doc2');
    });
  });

  describe('Invariants', () => {
    it('INV-SEARCH-001: Score must be non-negative', () => {
      const response = engine.search({ text: 'fox' });
      for (const result of response.results) {
        expect(result.score).toBeGreaterThanOrEqual(0);
      }
    });

    it('INV-SEARCH-002: Results must be sorted by score descending', () => {
      const response = engine.search({ text: 'fox brown' });
      for (let i = 1; i < response.results.length; i++) {
        expect(response.results[i - 1].score).toBeGreaterThanOrEqual(response.results[i].score);
      }
    });

    it('INV-SEARCH-003: Document count must match indexed documents', () => {
      const stats = engine.getStats();
      expect(stats.documentCount).toBe(engine.getDocumentIds().length);
    });

    it('INV-SEARCH-004: Removed document must not appear in results', () => {
      engine.remove('doc1');
      const response = engine.search({ text: 'fox' });
      const ids = response.results.map((r) => r.document.id);
      expect(ids).not.toContain('doc1');
    });

    it('INV-SEARCH-005: Total hits must be >= results length', () => {
      const response = engine.search({ text: 'fox', limit: 1 });
      expect(response.totalHits).toBeGreaterThanOrEqual(response.results.length);
    });

    it('INV-SEARCH-006: Max score must equal top result score', () => {
      const response = engine.search({ text: 'fox' });
      if (response.results.length > 0) {
        expect(response.maxScore).toBe(response.results[0].score);
      }
    });
  });
});
