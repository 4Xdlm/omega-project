/**
 * Search Analytics Module
 * @module @omega/search/analytics
 * @description Track and analyze search behavior and performance
 */

/**
 * Search event types
 */
export type SearchEventType =
  | 'search'
  | 'click'
  | 'impression'
  | 'conversion'
  | 'no_results'
  | 'suggestion_click'
  | 'filter_apply'
  | 'sort_change'
  | 'pagination';

/**
 * Search event
 */
export interface SearchEvent {
  type: SearchEventType;
  query: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  resultId?: string;
  position?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Query statistics
 */
export interface QueryStats {
  query: string;
  count: number;
  avgResults: number;
  avgLatency: number;
  clickRate: number;
  conversionRate: number;
  noResultsRate: number;
  lastSearched: number;
}

/**
 * Search session
 */
export interface SearchSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  events: SearchEvent[];
  queries: string[];
  clicks: number;
  conversions: number;
}

/**
 * Analytics summary
 */
export interface AnalyticsSummary {
  totalSearches: number;
  uniqueQueries: number;
  totalClicks: number;
  avgClickRate: number;
  avgResultsPerSearch: number;
  avgLatency: number;
  noResultsRate: number;
  topQueries: QueryStats[];
  topClickedResults: Array<{ id: string; clicks: number }>;
  searchesByHour: number[];
  period: { start: number; end: number };
}

/**
 * Analytics config
 */
export interface AnalyticsConfig {
  maxEvents: number;
  maxQueries: number;
  sessionTimeout: number;
  anonymize: boolean;
}

/**
 * Default analytics config
 */
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  maxEvents: 10000,
  maxQueries: 1000,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  anonymize: false,
};

/**
 * Search analytics
 */
export class SearchAnalytics {
  private config: AnalyticsConfig;
  private events: SearchEvent[] = [];
  private sessions: Map<string, SearchSession> = new Map();
  private queryStats: Map<string, QueryStats> = new Map();
  private resultClicks: Map<string, number> = new Map();
  private queryLatencies: Map<string, number[]> = new Map();
  private queryResults: Map<string, number[]> = new Map();

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_ANALYTICS_CONFIG, ...config };
  }

  /**
   * Track search event
   */
  trackSearch(
    query: string,
    sessionId: string,
    options: {
      userId?: string;
      resultCount?: number;
      latency?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): void {
    const event: SearchEvent = {
      type: 'search',
      query: this.normalizeQuery(query),
      timestamp: Date.now(),
      sessionId,
      userId: options.userId,
      metadata: {
        ...options.metadata,
        resultCount: options.resultCount,
        latency: options.latency,
      },
    };

    this.addEvent(event);
    this.updateSession(event);
    this.updateQueryStats(query, options.resultCount, options.latency);
  }

  /**
   * Track result click
   */
  trackClick(
    query: string,
    resultId: string,
    position: number,
    sessionId: string,
    userId?: string
  ): void {
    const event: SearchEvent = {
      type: 'click',
      query: this.normalizeQuery(query),
      timestamp: Date.now(),
      sessionId,
      userId,
      resultId,
      position,
    };

    this.addEvent(event);
    this.updateSession(event);
    this.resultClicks.set(resultId, (this.resultClicks.get(resultId) || 0) + 1);
    this.updateClickRate(query);
  }

  /**
   * Track conversion
   */
  trackConversion(
    query: string,
    resultId: string,
    sessionId: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): void {
    const event: SearchEvent = {
      type: 'conversion',
      query: this.normalizeQuery(query),
      timestamp: Date.now(),
      sessionId,
      userId,
      resultId,
      metadata,
    };

    this.addEvent(event);
    this.updateSession(event);
    this.updateConversionRate(query);
  }

  /**
   * Track no results
   */
  trackNoResults(query: string, sessionId: string, userId?: string): void {
    const event: SearchEvent = {
      type: 'no_results',
      query: this.normalizeQuery(query),
      timestamp: Date.now(),
      sessionId,
      userId,
    };

    this.addEvent(event);
    this.updateSession(event);
  }

  /**
   * Track suggestion click
   */
  trackSuggestionClick(
    suggestion: string,
    originalQuery: string,
    sessionId: string,
    userId?: string
  ): void {
    const event: SearchEvent = {
      type: 'suggestion_click',
      query: this.normalizeQuery(originalQuery),
      timestamp: Date.now(),
      sessionId,
      userId,
      metadata: { suggestion },
    };

    this.addEvent(event);
    this.updateSession(event);
  }

  /**
   * Track filter application
   */
  trackFilterApply(
    query: string,
    filterName: string,
    filterValue: unknown,
    sessionId: string,
    userId?: string
  ): void {
    const event: SearchEvent = {
      type: 'filter_apply',
      query: this.normalizeQuery(query),
      timestamp: Date.now(),
      sessionId,
      userId,
      metadata: { filterName, filterValue },
    };

    this.addEvent(event);
    this.updateSession(event);
  }

  /**
   * Get query statistics
   */
  getQueryStats(query: string): QueryStats | null {
    return this.queryStats.get(this.normalizeQuery(query)) || null;
  }

  /**
   * Get top queries
   */
  getTopQueries(limit: number = 10): QueryStats[] {
    return Array.from(this.queryStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get top clicked results
   */
  getTopClickedResults(limit: number = 10): Array<{ id: string; clicks: number }> {
    return Array.from(this.resultClicks.entries())
      .map(([id, clicks]) => ({ id, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);
  }

  /**
   * Get session
   */
  getSession(sessionId: string): SearchSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get analytics summary
   */
  getSummary(since?: number): AnalyticsSummary {
    const start = since || 0;
    const end = Date.now();
    const filteredEvents = this.events.filter((e) => e.timestamp >= start);

    const searches = filteredEvents.filter((e) => e.type === 'search');
    const clicks = filteredEvents.filter((e) => e.type === 'click');
    const noResults = filteredEvents.filter((e) => e.type === 'no_results');

    const uniqueQueries = new Set(searches.map((e) => e.query));
    const totalSearches = searches.length;
    const totalClicks = clicks.length;

    // Calculate hourly distribution
    const searchesByHour = new Array(24).fill(0);
    for (const event of searches) {
      const hour = new Date(event.timestamp).getHours();
      searchesByHour[hour]++;
    }

    // Calculate averages
    let totalLatency = 0;
    let totalResults = 0;
    let latencyCount = 0;
    let resultsCount = 0;

    for (const event of searches) {
      if (event.metadata?.latency !== undefined) {
        totalLatency += event.metadata.latency as number;
        latencyCount++;
      }
      if (event.metadata?.resultCount !== undefined) {
        totalResults += event.metadata.resultCount as number;
        resultsCount++;
      }
    }

    return {
      totalSearches,
      uniqueQueries: uniqueQueries.size,
      totalClicks,
      avgClickRate: totalSearches > 0 ? totalClicks / totalSearches : 0,
      avgResultsPerSearch: resultsCount > 0 ? totalResults / resultsCount : 0,
      avgLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
      noResultsRate: totalSearches > 0 ? noResults.length / totalSearches : 0,
      topQueries: this.getTopQueries(10),
      topClickedResults: this.getTopClickedResults(10),
      searchesByHour,
      period: { start, end },
    };
  }

  /**
   * Get click-through rate for query
   */
  getClickThroughRate(query: string): number {
    const normalized = this.normalizeQuery(query);
    const stats = this.queryStats.get(normalized);
    return stats?.clickRate || 0;
  }

  /**
   * Get average position for clicks
   */
  getAvgClickPosition(query: string): number {
    const normalized = this.normalizeQuery(query);
    const clicks = this.events.filter(
      (e) => e.type === 'click' && e.query === normalized
    );

    if (clicks.length === 0) return 0;

    const totalPosition = clicks.reduce((sum, e) => sum + (e.position || 0), 0);
    return totalPosition / clicks.length;
  }

  /**
   * Get queries without results
   */
  getQueriesWithoutResults(limit: number = 10): string[] {
    const noResultQueries = new Set<string>();

    for (const event of this.events) {
      if (event.type === 'no_results') {
        noResultQueries.add(event.query);
      }
    }

    return Array.from(noResultQueries).slice(0, limit);
  }

  /**
   * Get search trends
   */
  getSearchTrends(days: number = 7): Array<{ date: string; count: number }> {
    const trends: Map<string, number> = new Map();
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    for (const event of this.events) {
      if (event.type === 'search' && event.timestamp >= cutoff) {
        const date = new Date(event.timestamp).toISOString().split('T')[0];
        trends.set(date, (trends.get(date) || 0) + 1);
      }
    }

    return Array.from(trends.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Clear analytics data
   */
  clear(): void {
    this.events = [];
    this.sessions.clear();
    this.queryStats.clear();
    this.resultClicks.clear();
    this.queryLatencies.clear();
    this.queryResults.clear();
  }

  /**
   * Export analytics data
   */
  export(): {
    events: SearchEvent[];
    sessions: SearchSession[];
    queryStats: QueryStats[];
  } {
    return {
      events: [...this.events],
      sessions: Array.from(this.sessions.values()),
      queryStats: Array.from(this.queryStats.values()),
    };
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Add event with pruning
   */
  private addEvent(event: SearchEvent): void {
    this.events.push(event);

    // Prune old events if limit exceeded
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }
  }

  /**
   * Update session
   */
  private updateSession(event: SearchEvent): void {
    let session = this.sessions.get(event.sessionId);

    if (!session) {
      session = {
        sessionId: event.sessionId,
        userId: event.userId,
        startTime: event.timestamp,
        events: [],
        queries: [],
        clicks: 0,
        conversions: 0,
      };
      this.sessions.set(event.sessionId, session);
    }

    session.events.push(event);
    session.endTime = event.timestamp;

    if (event.type === 'search' && !session.queries.includes(event.query)) {
      session.queries.push(event.query);
    }
    if (event.type === 'click') {
      session.clicks++;
    }
    if (event.type === 'conversion') {
      session.conversions++;
    }
  }

  /**
   * Update query statistics
   */
  private updateQueryStats(
    query: string,
    resultCount?: number,
    latency?: number
  ): void {
    const normalized = this.normalizeQuery(query);
    let stats = this.queryStats.get(normalized);

    if (!stats) {
      stats = {
        query: normalized,
        count: 0,
        avgResults: 0,
        avgLatency: 0,
        clickRate: 0,
        conversionRate: 0,
        noResultsRate: 0,
        lastSearched: Date.now(),
      };
      this.queryStats.set(normalized, stats);
    }

    stats.count++;
    stats.lastSearched = Date.now();

    // Update latency tracking
    if (latency !== undefined) {
      const latencies = this.queryLatencies.get(normalized) || [];
      latencies.push(latency);
      this.queryLatencies.set(normalized, latencies);
      stats.avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    }

    // Update results tracking
    if (resultCount !== undefined) {
      const results = this.queryResults.get(normalized) || [];
      results.push(resultCount);
      this.queryResults.set(normalized, results);
      stats.avgResults = results.reduce((a, b) => a + b, 0) / results.length;

      if (resultCount === 0) {
        const noResultsCount = results.filter((r) => r === 0).length;
        stats.noResultsRate = noResultsCount / results.length;
      }
    }

    // Update click rate
    const queryClicks = this.events.filter(
      (e) => e.type === 'click' && e.query === normalized
    ).length;
    stats.clickRate = queryClicks / stats.count;

    // Update conversion rate
    const queryConversions = this.events.filter(
      (e) => e.type === 'conversion' && e.query === normalized
    ).length;
    stats.conversionRate = queryConversions / stats.count;

    // Prune query stats if limit exceeded
    if (this.queryStats.size > this.config.maxQueries) {
      const sortedQueries = Array.from(this.queryStats.entries())
        .sort(([, a], [, b]) => a.lastSearched - b.lastSearched);

      const toRemove = sortedQueries.slice(
        0,
        this.queryStats.size - this.config.maxQueries
      );
      for (const [key] of toRemove) {
        this.queryStats.delete(key);
      }
    }
  }

  /**
   * Update click rate for query
   */
  private updateClickRate(query: string): void {
    const normalized = this.normalizeQuery(query);
    const stats = this.queryStats.get(normalized);
    if (!stats) return;

    const queryClicks = this.events.filter(
      (e) => e.type === 'click' && e.query === normalized
    ).length;
    stats.clickRate = queryClicks / stats.count;
  }

  /**
   * Update conversion rate for query
   */
  private updateConversionRate(query: string): void {
    const normalized = this.normalizeQuery(query);
    const stats = this.queryStats.get(normalized);
    if (!stats) return;

    const queryConversions = this.events.filter(
      (e) => e.type === 'conversion' && e.query === normalized
    ).length;
    stats.conversionRate = queryConversions / stats.count;
  }

  /**
   * Normalize query for comparison
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim();
  }
}

/**
 * Create search analytics
 */
export function createSearchAnalytics(
  config?: Partial<AnalyticsConfig>
): SearchAnalytics {
  return new SearchAnalytics(config);
}

/**
 * Default export
 */
export default SearchAnalytics;
