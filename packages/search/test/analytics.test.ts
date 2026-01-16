/**
 * Analytics Tests
 * @module @omega/search/test/analytics
 * @description Unit tests for search analytics functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SearchAnalytics,
  createSearchAnalytics,
  DEFAULT_ANALYTICS_CONFIG,
  type SearchEventType,
  type QueryStats,
  type SearchSession,
  type AnalyticsSummary,
} from '../src/analytics';

describe('OMEGA Search - Phase 154: Search Analytics', () => {
  let analytics: SearchAnalytics;

  beforeEach(() => {
    analytics = createSearchAnalytics();
  });

  describe('Type Definitions', () => {
    it('should define SearchEventType', () => {
      const types: SearchEventType[] = [
        'search', 'click', 'impression', 'conversion',
        'no_results', 'suggestion_click', 'filter_apply',
        'sort_change', 'pagination',
      ];
      expect(types.length).toBeGreaterThan(0);
    });

    it('should define QueryStats interface', () => {
      const stats: QueryStats = {
        query: 'test',
        count: 10,
        avgResults: 5,
        avgLatency: 100,
        clickRate: 0.5,
        conversionRate: 0.1,
        noResultsRate: 0.05,
        lastSearched: Date.now(),
      };
      expect(stats.query).toBe('test');
    });

    it('should have default analytics config', () => {
      expect(DEFAULT_ANALYTICS_CONFIG.maxEvents).toBe(10000);
      expect(DEFAULT_ANALYTICS_CONFIG.maxQueries).toBe(1000);
      expect(DEFAULT_ANALYTICS_CONFIG.sessionTimeout).toBe(30 * 60 * 1000);
    });
  });

  describe('Search Tracking', () => {
    it('should track search events', () => {
      analytics.trackSearch('test query', 'session-1');

      const stats = analytics.getQueryStats('test query');
      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(1);
    });

    it('should track search with metadata', () => {
      analytics.trackSearch('test', 'session-1', {
        resultCount: 10,
        latency: 50,
        userId: 'user-1',
      });

      const stats = analytics.getQueryStats('test');
      expect(stats?.avgResults).toBe(10);
      expect(stats?.avgLatency).toBe(50);
    });

    it('should normalize queries', () => {
      analytics.trackSearch('Test Query', 'session-1');
      analytics.trackSearch('test query', 'session-2');
      analytics.trackSearch('TEST QUERY', 'session-3');

      const stats = analytics.getQueryStats('test query');
      expect(stats?.count).toBe(3);
    });

    it('should calculate average latency', () => {
      analytics.trackSearch('test', 'session-1', { latency: 50 });
      analytics.trackSearch('test', 'session-2', { latency: 100 });
      analytics.trackSearch('test', 'session-3', { latency: 150 });

      const stats = analytics.getQueryStats('test');
      expect(stats?.avgLatency).toBe(100);
    });

    it('should calculate average results', () => {
      analytics.trackSearch('test', 'session-1', { resultCount: 5 });
      analytics.trackSearch('test', 'session-2', { resultCount: 10 });
      analytics.trackSearch('test', 'session-3', { resultCount: 15 });

      const stats = analytics.getQueryStats('test');
      expect(stats?.avgResults).toBe(10);
    });
  });

  describe('Click Tracking', () => {
    it('should track click events', () => {
      analytics.trackSearch('test', 'session-1');
      analytics.trackClick('test', 'doc-1', 1, 'session-1');

      const stats = analytics.getQueryStats('test');
      expect(stats?.clickRate).toBe(1);
    });

    it('should track clicked results', () => {
      analytics.trackClick('test', 'doc-1', 1, 'session-1');
      analytics.trackClick('test', 'doc-1', 1, 'session-2');
      analytics.trackClick('test', 'doc-2', 2, 'session-3');

      const topClicked = analytics.getTopClickedResults(10);
      expect(topClicked[0].id).toBe('doc-1');
      expect(topClicked[0].clicks).toBe(2);
    });

    it('should calculate click-through rate', () => {
      analytics.trackSearch('test', 'session-1');
      analytics.trackSearch('test', 'session-2');
      analytics.trackClick('test', 'doc-1', 1, 'session-1');

      const ctr = analytics.getClickThroughRate('test');
      expect(ctr).toBe(0.5);
    });

    it('should calculate average click position', () => {
      analytics.trackClick('test', 'doc-1', 1, 'session-1');
      analytics.trackClick('test', 'doc-2', 3, 'session-2');
      analytics.trackClick('test', 'doc-3', 5, 'session-3');

      const avgPosition = analytics.getAvgClickPosition('test');
      expect(avgPosition).toBe(3);
    });
  });

  describe('Conversion Tracking', () => {
    it('should track conversions', () => {
      analytics.trackSearch('test', 'session-1');
      analytics.trackConversion('test', 'doc-1', 'session-1');

      const stats = analytics.getQueryStats('test');
      expect(stats?.conversionRate).toBe(1);
    });

    it('should calculate conversion rate', () => {
      analytics.trackSearch('test', 'session-1');
      analytics.trackSearch('test', 'session-2');
      analytics.trackSearch('test', 'session-3');
      analytics.trackConversion('test', 'doc-1', 'session-1');

      const stats = analytics.getQueryStats('test');
      expect(stats?.conversionRate).toBeCloseTo(0.333, 2);
    });
  });

  describe('No Results Tracking', () => {
    it('should track no results events', () => {
      analytics.trackNoResults('nonexistent', 'session-1');

      const noResultQueries = analytics.getQueriesWithoutResults();
      expect(noResultQueries).toContain('nonexistent');
    });

    it('should calculate no results rate', () => {
      analytics.trackSearch('test', 'session-1', { resultCount: 0 });
      analytics.trackSearch('test', 'session-2', { resultCount: 5 });
      analytics.trackSearch('test', 'session-3', { resultCount: 0 });

      const stats = analytics.getQueryStats('test');
      expect(stats?.noResultsRate).toBeCloseTo(0.666, 2);
    });
  });

  describe('Session Tracking', () => {
    it('should create sessions', () => {
      analytics.trackSearch('test1', 'session-1', { userId: 'user-1' });
      analytics.trackSearch('test2', 'session-1', { userId: 'user-1' });

      const session = analytics.getSession('session-1');
      expect(session).not.toBeNull();
      expect(session?.queries).toHaveLength(2);
    });

    it('should track clicks in session', () => {
      analytics.trackSearch('test', 'session-1');
      analytics.trackClick('test', 'doc-1', 1, 'session-1');
      analytics.trackClick('test', 'doc-2', 2, 'session-1');

      const session = analytics.getSession('session-1');
      expect(session?.clicks).toBe(2);
    });

    it('should track conversions in session', () => {
      analytics.trackSearch('test', 'session-1');
      analytics.trackConversion('test', 'doc-1', 'session-1');

      const session = analytics.getSession('session-1');
      expect(session?.conversions).toBe(1);
    });

    it('should track session events', () => {
      analytics.trackSearch('test', 'session-1');
      analytics.trackClick('test', 'doc-1', 1, 'session-1');

      const session = analytics.getSession('session-1');
      expect(session?.events).toHaveLength(2);
    });
  });

  describe('Top Queries', () => {
    it('should return top queries by count', () => {
      analytics.trackSearch('popular', 'session-1');
      analytics.trackSearch('popular', 'session-2');
      analytics.trackSearch('popular', 'session-3');
      analytics.trackSearch('medium', 'session-4');
      analytics.trackSearch('medium', 'session-5');
      analytics.trackSearch('rare', 'session-6');

      const topQueries = analytics.getTopQueries(3);
      expect(topQueries[0].query).toBe('popular');
      expect(topQueries[0].count).toBe(3);
    });

    it('should limit results', () => {
      for (let i = 0; i < 20; i++) {
        analytics.trackSearch(`query-${i}`, `session-${i}`);
      }

      const topQueries = analytics.getTopQueries(5);
      expect(topQueries).toHaveLength(5);
    });
  });

  describe('Analytics Summary', () => {
    it('should generate summary', () => {
      analytics.trackSearch('test', 'session-1', { resultCount: 10, latency: 50 });
      analytics.trackClick('test', 'doc-1', 1, 'session-1');

      const summary = analytics.getSummary();

      expect(summary.totalSearches).toBe(1);
      expect(summary.totalClicks).toBe(1);
      expect(summary.avgClickRate).toBe(1);
    });

    it('should include period', () => {
      const summary = analytics.getSummary();

      expect(summary.period).toBeDefined();
      expect(summary.period.end).toBeGreaterThan(summary.period.start);
    });

    it('should filter by time', () => {
      analytics.trackSearch('old', 'session-1');

      const cutoff = Date.now() + 1000; // Future
      const summary = analytics.getSummary(cutoff);

      expect(summary.totalSearches).toBe(0);
    });

    it('should include hourly distribution', () => {
      analytics.trackSearch('test', 'session-1');

      const summary = analytics.getSummary();

      expect(summary.searchesByHour).toHaveLength(24);
      const totalByHour = summary.searchesByHour.reduce((a, b) => a + b, 0);
      expect(totalByHour).toBe(1);
    });
  });

  describe('Search Trends', () => {
    it('should return search trends', () => {
      analytics.trackSearch('test', 'session-1');

      const trends = analytics.getSearchTrends(7);

      expect(trends.length).toBeGreaterThanOrEqual(1);
      expect(trends[0].count).toBeGreaterThan(0);
    });

    it('should include date', () => {
      analytics.trackSearch('test', 'session-1');

      const trends = analytics.getSearchTrends(7);

      expect(trends[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Filter and Sort Tracking', () => {
    it('should track filter application', () => {
      analytics.trackFilterApply('test', 'category', 'news', 'session-1');

      const session = analytics.getSession('session-1');
      expect(session?.events.some((e) => e.type === 'filter_apply')).toBe(true);
    });

    it('should track suggestion clicks', () => {
      analytics.trackSuggestionClick('testing', 'test', 'session-1');

      const session = analytics.getSession('session-1');
      expect(session?.events.some((e) => e.type === 'suggestion_click')).toBe(true);
    });
  });

  describe('Data Export', () => {
    it('should export analytics data', () => {
      analytics.trackSearch('test', 'session-1');
      analytics.trackClick('test', 'doc-1', 1, 'session-1');

      const exported = analytics.export();

      expect(exported.events.length).toBe(2);
      expect(exported.sessions.length).toBe(1);
      expect(exported.queryStats.length).toBe(1);
    });
  });

  describe('Data Management', () => {
    it('should clear all data', () => {
      analytics.trackSearch('test', 'session-1');
      analytics.clear();

      expect(analytics.getEventCount()).toBe(0);
      expect(analytics.getQueryStats('test')).toBeNull();
    });

    it('should prune old events when limit exceeded', () => {
      const analytics = createSearchAnalytics({ maxEvents: 5 });

      for (let i = 0; i < 10; i++) {
        analytics.trackSearch(`query-${i}`, `session-${i}`);
      }

      expect(analytics.getEventCount()).toBe(5);
    });

    it('should prune old query stats when limit exceeded', () => {
      const analytics = createSearchAnalytics({ maxQueries: 3 });

      for (let i = 0; i < 10; i++) {
        analytics.trackSearch(`query-${i}`, `session-${i}`);
      }

      const topQueries = analytics.getTopQueries(10);
      expect(topQueries.length).toBe(3);
    });
  });

  describe('Invariants', () => {
    it('INV-ANA-001: Event count must be non-negative', () => {
      expect(analytics.getEventCount()).toBeGreaterThanOrEqual(0);
    });

    it('INV-ANA-002: Click rate must be between 0 and infinity', () => {
      analytics.trackSearch('test', 'session-1');
      analytics.trackClick('test', 'doc-1', 1, 'session-1');

      const stats = analytics.getQueryStats('test');
      expect(stats?.clickRate).toBeGreaterThanOrEqual(0);
    });

    it('INV-ANA-003: Query count must be positive when tracked', () => {
      analytics.trackSearch('test', 'session-1');

      const stats = analytics.getQueryStats('test');
      expect(stats?.count).toBeGreaterThan(0);
    });

    it('INV-ANA-004: Session must have at least one event', () => {
      analytics.trackSearch('test', 'session-1');

      const session = analytics.getSession('session-1');
      expect(session?.events.length).toBeGreaterThan(0);
    });

    it('INV-ANA-005: Hourly distribution must have 24 entries', () => {
      const summary = analytics.getSummary();
      expect(summary.searchesByHour).toHaveLength(24);
    });
  });
});
