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

export {
  type FilterOperator,
  type AdvancedFilter,
  type FilterGroup,
  type FacetDefinition,
  type TermsFacetResult,
  type RangeFacetResult,
  type FacetResult,
  type AggregationDefinition,
  type AggregationResult,
  FilterProcessor,
  FacetProcessor,
  AggregationProcessor,
  createFilterProcessor,
  createFacetProcessor,
  createAggregationProcessor,
} from './filters';
