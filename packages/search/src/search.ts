/**
 * Unified Search Module
 * @module @omega/search/search
 * @description Complete search integration facade
 */

import { SearchEngine, createSearchEngine, type SearchConfig } from './engine';
import { FilterProcessor, FacetProcessor, AggregationProcessor } from './filters';
import { SearchSuggester, type SuggesterConfig } from './suggest';
import { IndexManager, type IndexManagerConfig } from './index-manager';
import { SearchExporter, type ExportOptions, type ExportFormat } from './export';
import { SearchImporter, type ImportOptions, type ImportFormat } from './import';
import { QueryParser, type QueryParserOptions, type ParseResult } from './query-parser';
import { SearchAnalytics, type AnalyticsConfig } from './analytics';
import type {
  SearchDocument,
  SearchQuery,
  SearchResult,
  SearchResponse,
  SearchFilter,
  IndexStats,
} from './types';

/**
 * Unified search options
 */
export interface UnifiedSearchOptions {
  engine?: Partial<SearchConfig>;
  suggester?: Partial<SuggesterConfig>;
  indexManager?: Partial<IndexManagerConfig>;
  parser?: Partial<QueryParserOptions>;
  analytics?: Partial<AnalyticsConfig>;
  enableAnalytics?: boolean;
  enableSuggestions?: boolean;
}

/**
 * Search facade
 */
export interface SearchFacade {
  // Core operations
  index: (doc: SearchDocument) => string;
  indexBatch: (docs: SearchDocument[]) => string[];
  search: (query: string | SearchQuery) => SearchResponse;
  remove: (id: string) => boolean;
  clear: () => void;

  // Suggestions
  suggest: (prefix: string, limit?: number) => string[];

  // Query parsing
  parseQuery: (query: string) => ParseResult;

  // Export/Import
  exportResults: (results: SearchResult[], format: ExportFormat) => string;
  importDocuments: (content: string, format: ImportFormat) => SearchDocument[];

  // Analytics
  trackSearch: (query: string, resultCount: number, latency: number) => void;
  trackClick: (query: string, resultId: string, position: number) => void;
  getAnalyticsSummary: () => Record<string, unknown>;

  // Index management
  getStats: () => IndexStats;
  optimize: () => void;

  // Configuration
  getConfig: () => UnifiedSearchOptions;
}

/**
 * Default unified search options
 */
export const DEFAULT_UNIFIED_OPTIONS: UnifiedSearchOptions = {
  enableAnalytics: true,
  enableSuggestions: true,
};

/**
 * Unified search class
 */
export class UnifiedSearch implements SearchFacade {
  private options: UnifiedSearchOptions;
  private engine: SearchEngine;
  private suggester: SearchSuggester;
  private indexManager: IndexManager;
  private exporter: SearchExporter;
  private importer: SearchImporter;
  private parser: QueryParser;
  private analytics: SearchAnalytics;
  private filterProcessor: FilterProcessor;
  private facetProcessor: FacetProcessor;
  private aggregationProcessor: AggregationProcessor;
  private sessionId: string;

  constructor(options: UnifiedSearchOptions = {}) {
    this.options = { ...DEFAULT_UNIFIED_OPTIONS, ...options };
    this.sessionId = `session-${Date.now()}`;

    // Initialize components
    this.engine = createSearchEngine(options.engine);
    this.suggester = new SearchSuggester(options.suggester);
    this.indexManager = new IndexManager(options.indexManager);
    this.exporter = new SearchExporter();
    this.importer = new SearchImporter();
    this.parser = new QueryParser(options.parser);
    this.analytics = new SearchAnalytics(options.analytics);
    this.filterProcessor = new FilterProcessor();
    this.facetProcessor = new FacetProcessor();
    this.aggregationProcessor = new AggregationProcessor();
  }

  /**
   * Index a single document
   */
  index(doc: SearchDocument): string {
    const id = this.engine.index(doc);
    this.indexManager.addDocument(doc);

    if (this.options.enableSuggestions) {
      this.suggester.indexText(doc.content);
      if (doc.title) {
        this.suggester.indexText(doc.title);
      }
    }

    return id;
  }

  /**
   * Index multiple documents
   */
  indexBatch(docs: SearchDocument[]): string[] {
    return docs.map((doc) => this.index(doc));
  }

  /**
   * Search documents
   */
  search(query: string | SearchQuery): SearchResponse {
    const startTime = Date.now();

    // Parse query if string
    let searchQuery: SearchQuery;
    if (typeof query === 'string') {
      searchQuery = {
        text: query,
        fuzzy: true,
      };
    } else {
      searchQuery = query;
    }

    const response = this.engine.search(searchQuery);
    const latency = Date.now() - startTime;

    // Track analytics
    if (this.options.enableAnalytics) {
      this.analytics.trackSearch(
        searchQuery.text,
        this.sessionId,
        {
          resultCount: response.totalHits,
          latency,
        }
      );

      // Record query for suggestions
      if (this.options.enableSuggestions) {
        this.suggester.recordQuery(searchQuery.text);
      }

      // Track no results
      if (response.totalHits === 0) {
        this.analytics.trackNoResults(searchQuery.text, this.sessionId);
      }
    }

    return response;
  }

  /**
   * Remove document by ID
   */
  remove(id: string): boolean {
    return this.engine.remove(id);
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.engine.clear();
    this.suggester.clear();
    this.analytics.clear();
  }

  /**
   * Get search suggestions
   */
  suggest(prefix: string, limit: number = 10): string[] {
    if (!this.options.enableSuggestions) return [];

    const response = this.suggester.suggest({
      prefix,
      limit,
      types: ['completion', 'popular'],
    });

    return response.suggestions.map((s) => s.text);
  }

  /**
   * Parse query string
   */
  parseQuery(query: string): ParseResult {
    return this.parser.parse(query);
  }

  /**
   * Export search results
   */
  exportResults(results: SearchResult[], format: ExportFormat): string {
    const exportResult = this.exporter.exportResults(results, { format });
    return exportResult.content;
  }

  /**
   * Import documents from content
   */
  importDocuments(content: string, format: ImportFormat): SearchDocument[] {
    const importResult = this.importer.import(content, { format });
    return importResult.documents;
  }

  /**
   * Track search event
   */
  trackSearch(query: string, resultCount: number, latency: number): void {
    if (this.options.enableAnalytics) {
      this.analytics.trackSearch(query, this.sessionId, {
        resultCount,
        latency,
      });
    }
  }

  /**
   * Track click event
   */
  trackClick(query: string, resultId: string, position: number): void {
    if (this.options.enableAnalytics) {
      this.analytics.trackClick(query, resultId, position, this.sessionId);
    }
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary(): Record<string, unknown> {
    return this.analytics.getSummary() as unknown as Record<string, unknown>;
  }

  /**
   * Get index statistics
   */
  getStats(): IndexStats {
    return this.engine.getStats();
  }

  /**
   * Optimize index
   */
  optimize(): void {
    this.indexManager.optimize();
  }

  /**
   * Get configuration
   */
  getConfig(): UnifiedSearchOptions {
    return { ...this.options };
  }

  /**
   * Apply filters to results
   */
  applyFilters(results: SearchResult[], filters: SearchFilter[]): SearchResult[] {
    return results.filter((result) => {
      for (const filter of filters) {
        const value = this.getResultFieldValue(result, filter.field);
        if (!this.matchFilter(value, filter)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Match a single filter
   */
  private matchFilter(value: unknown, filter: SearchFilter): boolean {
    switch (filter.operator) {
      case 'eq':
        return value === filter.value;
      case 'ne':
        return value !== filter.value;
      case 'contains':
        return typeof value === 'string' && value.includes(String(filter.value));
      case 'gt':
        return typeof value === 'number' && value > (filter.value as number);
      case 'lt':
        return typeof value === 'number' && value < (filter.value as number);
      case 'gte':
        return typeof value === 'number' && value >= (filter.value as number);
      case 'lte':
        return typeof value === 'number' && value <= (filter.value as number);
      default:
        return true;
    }
  }

  /**
   * Get field value from search result
   */
  private getResultFieldValue(result: SearchResult, field: string): unknown {
    if (field === 'id') return result.document.id;
    if (field === 'title') return result.document.title;
    if (field === 'content') return result.document.content;
    if (field === 'score') return result.score;
    return result.document.metadata?.[field];
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Set session ID
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Get underlying components
   */
  getComponents(): {
    engine: SearchEngine;
    suggester: SearchSuggester;
    indexManager: IndexManager;
    exporter: SearchExporter;
    importer: SearchImporter;
    parser: QueryParser;
    analytics: SearchAnalytics;
  } {
    return {
      engine: this.engine,
      suggester: this.suggester,
      indexManager: this.indexManager,
      exporter: this.exporter,
      importer: this.importer,
      parser: this.parser,
      analytics: this.analytics,
    };
  }

}

/**
 * Create unified search instance
 */
export function createUnifiedSearch(options?: UnifiedSearchOptions): UnifiedSearch {
  return new UnifiedSearch(options);
}

/**
 * Default export
 */
export default UnifiedSearch;
