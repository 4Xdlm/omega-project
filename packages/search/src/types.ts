/**
 * Search Types
 * @module @omega/search/types
 * @description Type definitions for OMEGA Search
 */

/**
 * Document to be indexed
 */
export interface SearchDocument {
  id: string;
  content: string;
  title?: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

/**
 * Indexed document with tokens
 */
export interface IndexedDocument {
  id: string;
  content: string;
  title: string;
  tokens: string[];
  tokenCount: number;
  metadata: Record<string, unknown>;
  timestamp: number;
  indexedAt: number;
}

/**
 * Search query
 */
export interface SearchQuery {
  text: string;
  fields?: string[];
  filters?: SearchFilter[];
  boost?: Record<string, number>;
  limit?: number;
  offset?: number;
  fuzzy?: boolean;
  highlight?: boolean;
}

/**
 * Search filter
 */
export interface SearchFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: unknown;
}

/**
 * Search result
 */
export interface SearchResult {
  document: IndexedDocument;
  score: number;
  highlights?: SearchHighlight[];
  matchedTerms: string[];
}

/**
 * Search highlight
 */
export interface SearchHighlight {
  field: string;
  fragment: string;
  positions: { start: number; end: number }[];
}

/**
 * Search response
 */
export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalHits: number;
  took: number;
  maxScore: number;
}

/**
 * Index statistics
 */
export interface IndexStats {
  documentCount: number;
  tokenCount: number;
  uniqueTokens: number;
  avgDocumentLength: number;
  indexSize: number;
  lastUpdated: number;
}

/**
 * Search configuration
 */
export interface SearchConfig {
  /** Minimum token length */
  minTokenLength: number;
  /** Maximum tokens per document */
  maxTokensPerDocument: number;
  /** Enable stemming */
  stemming: boolean;
  /** Stop words to filter */
  stopWords: string[];
  /** Default result limit */
  defaultLimit: number;
  /** Fuzzy matching threshold (0-1) */
  fuzzyThreshold: number;
  /** Enable BM25 scoring */
  useBM25: boolean;
  /** BM25 k1 parameter */
  bm25K1: number;
  /** BM25 b parameter */
  bm25B: number;
}

/**
 * Default search configuration
 */
export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  minTokenLength: 2,
  maxTokensPerDocument: 10000,
  stemming: true,
  stopWords: [
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these',
    'those', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they', 'them',
  ],
  defaultLimit: 10,
  fuzzyThreshold: 0.8,
  useBM25: true,
  bm25K1: 1.2,
  bm25B: 0.75,
};

/**
 * Search error types
 */
export type SearchErrorType =
  | 'INDEX_ERROR'
  | 'QUERY_ERROR'
  | 'DOCUMENT_ERROR'
  | 'CONFIG_ERROR';

/**
 * Search error
 */
export class SearchError extends Error {
  constructor(
    public readonly type: SearchErrorType,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SearchError';
  }
}
