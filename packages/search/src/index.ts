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

export {
  type SuggestionType,
  type Suggestion,
  type SuggestRequest,
  type SuggestResponse,
  type SuggesterConfig,
  SearchSuggester,
  createSuggester,
  DEFAULT_SUGGESTER_CONFIG,
} from './suggest';

export {
  type IndexSegment,
  type IndexMetadata,
  type IndexSnapshot,
  type IndexManagerConfig,
  type IndexOperation,
  type IndexOperationLog,
  type IndexHealth,
  IndexManager,
  createIndexManager,
  DEFAULT_INDEX_MANAGER_CONFIG,
} from './index-manager';

export {
  type ExportFormat,
  type ExportOptions,
  type ExportResult,
  type ExportTemplate,
  SearchExporter,
  createSearchExporter,
  DEFAULT_EXPORT_OPTIONS,
} from './export';

export {
  type ImportFormat,
  type ImportOptions,
  type ImportResult,
  type ImportError,
  type ImportValidation,
  SearchImporter,
  createSearchImporter,
  DEFAULT_IMPORT_OPTIONS,
} from './import';

export {
  type TokenType,
  type Token,
  type ASTNodeType,
  type ASTNode,
  type ParseResult,
  type ParseError,
  type QueryParserOptions,
  QueryParser,
  createQueryParser,
  parseQuery,
  DEFAULT_PARSER_OPTIONS,
} from './query-parser';
