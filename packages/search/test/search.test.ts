/**
 * Unified Search Tests
 * @module @omega/search/test/search
 * @description Unit tests for unified search integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  UnifiedSearch,
  createUnifiedSearch,
  DEFAULT_UNIFIED_OPTIONS,
  type UnifiedSearchOptions,
  type SearchFacade,
} from '../src/search';
import type { SearchDocument, SearchResult } from '../src/types';

describe('OMEGA Search - Phase 155: Unified Search Integration', () => {
  let search: UnifiedSearch;

  const sampleDocs: SearchDocument[] = [
    { id: 'doc-1', content: 'The quick brown fox jumps over the lazy dog', title: 'Fox Story' },
    { id: 'doc-2', content: 'A fast red fox runs through the forest', title: 'Forest Tale' },
    { id: 'doc-3', content: 'The lazy cat sleeps all day long', title: 'Cat Nap' },
  ];

  beforeEach(() => {
    search = createUnifiedSearch();
  });

  describe('Type Definitions', () => {
    it('should define UnifiedSearchOptions interface', () => {
      const options: UnifiedSearchOptions = {
        enableAnalytics: true,
        enableSuggestions: true,
        engine: { k1: 1.2 },
        parser: { defaultOperator: 'AND' },
      };
      expect(options.enableAnalytics).toBe(true);
    });

    it('should define SearchFacade interface', () => {
      const facade: SearchFacade = search;
      expect(typeof facade.index).toBe('function');
      expect(typeof facade.search).toBe('function');
      expect(typeof facade.suggest).toBe('function');
    });

    it('should have default unified options', () => {
      expect(DEFAULT_UNIFIED_OPTIONS.enableAnalytics).toBe(true);
      expect(DEFAULT_UNIFIED_OPTIONS.enableSuggestions).toBe(true);
    });
  });

  describe('Indexing', () => {
    it('should index single document', () => {
      const id = search.index(sampleDocs[0]);

      expect(id).toBe('doc-1');
      const stats = search.getStats();
      expect(stats.documentCount).toBe(1);
    });

    it('should index multiple documents', () => {
      const ids = search.indexBatch(sampleDocs);

      expect(ids).toHaveLength(3);
      const stats = search.getStats();
      expect(stats.documentCount).toBe(3);
    });

    it('should accept document with ID', () => {
      const doc: SearchDocument = { id: 'custom-id', content: 'Test content' };
      const id = search.index(doc);

      expect(id).toBe('custom-id');
    });
  });

  describe('Searching', () => {
    beforeEach(() => {
      search.indexBatch(sampleDocs);
    });

    it('should search with string query', () => {
      const response = search.search('fox');

      expect(response.totalHits).toBeGreaterThan(0);
      expect(response.results.some((r) => r.document.content.includes('fox'))).toBe(true);
    });

    it('should search with query object', () => {
      const response = search.search({
        text: 'fox',
        fuzzy: true,
        limit: 10,
      });

      expect(response.totalHits).toBeGreaterThan(0);
    });

    it('should return empty results for no matches', () => {
      const response = search.search('elephant');

      expect(response.totalHits).toBe(0);
      expect(response.results).toHaveLength(0);
    });

    it('should track search analytics', () => {
      search.search('fox');
      search.search('cat');

      const summary = search.getAnalyticsSummary();
      expect((summary as { totalSearches: number }).totalSearches).toBe(2);
    });
  });

  describe('Document Management', () => {
    it('should remove document', () => {
      search.index(sampleDocs[0]);
      const removed = search.remove('doc-1');

      expect(removed).toBe(true);
      const stats = search.getStats();
      expect(stats.documentCount).toBe(0);
    });

    it('should clear all documents', () => {
      search.indexBatch(sampleDocs);
      search.clear();

      const stats = search.getStats();
      expect(stats.documentCount).toBe(0);
    });
  });

  describe('Suggestions', () => {
    beforeEach(() => {
      search.indexBatch(sampleDocs);
    });

    it('should get suggestions', () => {
      const suggestions = search.suggest('fo');

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should limit suggestions', () => {
      const suggestions = search.suggest('t', 3);

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should return empty when disabled', () => {
      const noSuggestSearch = createUnifiedSearch({ enableSuggestions: false });
      noSuggestSearch.indexBatch(sampleDocs);

      const suggestions = noSuggestSearch.suggest('fo');

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Query Parsing', () => {
    it('should parse simple query', () => {
      const result = search.parseQuery('hello world');

      expect(result.ast).not.toBeNull();
      expect(result.errors).toHaveLength(0);
    });

    it('should parse complex query', () => {
      const result = search.parseQuery('title:fox AND content:quick');

      expect(result.ast?.type).toBe('AND');
    });

    it('should handle invalid query', () => {
      const result = search.parseQuery(')invalid');

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Export/Import', () => {
    it('should export results to JSON', () => {
      search.indexBatch(sampleDocs);
      const response = search.search('fox');
      const json = search.exportResults(response.results, 'json');

      expect(json).toBeTruthy();
      const parsed = JSON.parse(json);
      expect(parsed.results).toBeDefined();
    });

    it('should export results to CSV', () => {
      search.indexBatch(sampleDocs);
      const response = search.search('fox');
      const csv = search.exportResults(response.results, 'csv');

      expect(csv).toContain('id');
    });

    it('should import documents from JSON', () => {
      const json = JSON.stringify([
        { id: 'imported-1', content: 'Imported document' },
      ]);

      const docs = search.importDocuments(json, 'json');

      expect(docs).toHaveLength(1);
      expect(docs[0].id).toBe('imported-1');
    });

    it('should import and index documents', () => {
      const json = JSON.stringify([
        { id: 'new-1', content: 'New document content' },
      ]);

      const docs = search.importDocuments(json, 'json');
      search.indexBatch(docs);

      const response = search.search('new document');
      expect(response.totalHits).toBeGreaterThan(0);
    });
  });

  describe('Analytics', () => {
    beforeEach(() => {
      search.indexBatch(sampleDocs);
    });

    it('should track searches', () => {
      search.search('fox');
      search.search('cat');

      const summary = search.getAnalyticsSummary();
      expect((summary as { totalSearches: number }).totalSearches).toBe(2);
    });

    it('should track clicks', () => {
      search.search('fox');
      search.trackClick('fox', 'doc-1', 1);

      const summary = search.getAnalyticsSummary();
      expect((summary as { totalClicks: number }).totalClicks).toBe(1);
    });

    it('should track no results', () => {
      search.search('nonexistent');

      const summary = search.getAnalyticsSummary();
      expect((summary as { noResultsRate: number }).noResultsRate).toBeGreaterThan(0);
    });

    it('should not track when analytics disabled', () => {
      const noAnalyticsSearch = createUnifiedSearch({ enableAnalytics: false });
      noAnalyticsSearch.indexBatch(sampleDocs);
      noAnalyticsSearch.search('fox');

      const summary = noAnalyticsSearch.getAnalyticsSummary();
      expect((summary as { totalSearches: number }).totalSearches).toBe(0);
    });
  });

  describe('Index Management', () => {
    it('should get index stats', () => {
      search.indexBatch(sampleDocs);

      const stats = search.getStats();

      expect(stats.documentCount).toBe(3);
      expect(stats.tokenCount).toBeGreaterThan(0);
    });

    it('should optimize index', () => {
      search.indexBatch(sampleDocs);

      // Should not throw
      expect(() => search.optimize()).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should return configuration', () => {
      const config = search.getConfig();

      expect(config.enableAnalytics).toBe(true);
      expect(config.enableSuggestions).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customSearch = createUnifiedSearch({
        enableAnalytics: false,
        engine: { k1: 2.0 },
      });

      const config = customSearch.getConfig();
      expect(config.enableAnalytics).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should have session ID', () => {
      const sessionId = search.getSessionId();

      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^session-\d+$/);
    });

    it('should allow setting session ID', () => {
      search.setSessionId('custom-session');

      expect(search.getSessionId()).toBe('custom-session');
    });
  });

  describe('Component Access', () => {
    it('should expose underlying components', () => {
      const components = search.getComponents();

      expect(components.engine).toBeDefined();
      expect(components.suggester).toBeDefined();
      expect(components.indexManager).toBeDefined();
      expect(components.exporter).toBeDefined();
      expect(components.importer).toBeDefined();
      expect(components.parser).toBeDefined();
      expect(components.analytics).toBeDefined();
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      search.indexBatch(sampleDocs);
    });

    it('should apply filters to results', () => {
      const response = search.search('fox');
      // Filter by score (always has results with score > 0)
      const filtered = search.applyFilters(response.results, [
        { field: 'score', value: 0, operator: 'gt' },
      ]);

      expect(filtered.length).toBeLessThanOrEqual(response.results.length);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full search workflow', () => {
      // 1. Index documents
      search.indexBatch(sampleDocs);

      // 2. Search
      const response = search.search('fox jumps');
      expect(response.totalHits).toBeGreaterThan(0);

      // 3. Get suggestions
      const suggestions = search.suggest('fo');
      expect(suggestions.length).toBeGreaterThanOrEqual(0);

      // 4. Track click
      if (response.results.length > 0) {
        search.trackClick('fox jumps', response.results[0].document.id, 1);
      }

      // 5. Get analytics
      const summary = search.getAnalyticsSummary();
      expect((summary as { totalSearches: number }).totalSearches).toBeGreaterThan(0);

      // 6. Export results
      const exported = search.exportResults(response.results, 'json');
      expect(exported).toBeTruthy();

      // 7. Get stats
      const stats = search.getStats();
      expect(stats.documentCount).toBe(3);
    });
  });

  describe('Invariants', () => {
    it('INV-UNI-001: Index stats must be valid', () => {
      const stats = search.getStats();

      expect(stats.documentCount).toBeGreaterThanOrEqual(0);
      expect(stats.tokenCount).toBeGreaterThanOrEqual(0);
    });

    it('INV-UNI-002: Search response must be valid', () => {
      search.indexBatch(sampleDocs);
      const response = search.search('test');

      expect(response.query).toBeDefined();
      expect(Array.isArray(response.results)).toBe(true);
      expect(response.totalHits).toBeGreaterThanOrEqual(0);
      expect(response.took).toBeGreaterThanOrEqual(0);
    });

    it('INV-UNI-003: Configuration must be immutable', () => {
      const config1 = search.getConfig();
      config1.enableAnalytics = false;
      const config2 = search.getConfig();

      expect(config2.enableAnalytics).toBe(true);
    });

    it('INV-UNI-004: Session ID must be non-empty', () => {
      expect(search.getSessionId().length).toBeGreaterThan(0);
    });

    it('INV-UNI-005: All components must be initialized', () => {
      const components = search.getComponents();

      for (const [name, component] of Object.entries(components)) {
        expect(component).toBeDefined();
        expect(component).not.toBeNull();
      }
    });
  });
});
