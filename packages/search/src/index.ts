/**
 * Search Package Exports
 * @module @omega/search
 * @description OMEGA Search - Intelligent Text Search Engine
 */

export {
  type SearchDocument,
  type IndexedDocument,
  type SearchQuery,
  type SearchResult,
  type SearchResponse,
  type SearchFilter,
  type SearchHighlight,
  type IndexStats,
  type SearchConfig,
  type SearchErrorType,
  SearchError,
  DEFAULT_SEARCH_CONFIG,
} from './types';

export { SearchEngine, createSearchEngine } from './engine';
