/**
 * Search Integration Hook
 * @module @omega/ui/hooks/useSearch
 * @description React hook for search functionality integration
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * Search status
 */
export type SearchStatus = 'idle' | 'searching' | 'suggesting' | 'complete' | 'error';

/**
 * Search document
 */
export interface SearchDocument {
  id: string;
  content: string;
  title?: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

/**
 * Search result
 */
export interface SearchResult {
  id: string;
  content: string;
  title: string;
  score: number;
  highlights: string[];
  matchedTerms: string[];
}

/**
 * Search suggestion
 */
export interface SearchSuggestion {
  text: string;
  type: 'completion' | 'correction' | 'phrase' | 'popular';
  score: number;
  highlighted?: string;
}

/**
 * Search response
 */
export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalHits: number;
  took: number;
}

/**
 * Search filter
 */
export interface SearchFilter {
  field: string;
  value: unknown;
  operator: 'eq' | 'ne' | 'contains' | 'gt' | 'lt';
}

/**
 * Search options
 */
export interface SearchOptions {
  limit?: number;
  offset?: number;
  fuzzy?: boolean;
  filters?: SearchFilter[];
  sort?: { field: string; order: 'asc' | 'desc' };
}

/**
 * Search state
 */
export interface SearchState {
  status: SearchStatus;
  query: string;
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  totalHits: number;
  isSearching: boolean;
  isSuggesting: boolean;
  hasResults: boolean;
  error: string | null;
}

/**
 * Search actions
 */
export interface SearchActions {
  search: (query: string, options?: SearchOptions) => Promise<SearchResponse>;
  suggest: (prefix: string) => Promise<SearchSuggestion[]>;
  indexDocument: (doc: SearchDocument) => void;
  removeDocument: (id: string) => void;
  clearResults: () => void;
  reset: () => void;
}

/**
 * Search hook options
 */
export interface UseSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  maxSuggestions?: number;
  autoSuggest?: boolean;
  onSearch?: (response: SearchResponse) => void;
  onSuggest?: (suggestions: SearchSuggestion[]) => void;
  onError?: (error: string) => void;
}

/**
 * Simple in-memory search index
 */
class SimpleSearchIndex {
  private documents: Map<string, SearchDocument & { tokens: string[] }> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private termFrequencies: Map<string, number> = new Map();

  index(doc: SearchDocument): void {
    const tokens = this.tokenize(doc.content + ' ' + (doc.title || ''));
    this.documents.set(doc.id, { ...doc, tokens });

    // Update inverted index
    for (const token of tokens) {
      const docIds = this.invertedIndex.get(token) || new Set();
      docIds.add(doc.id);
      this.invertedIndex.set(token, docIds);

      // Update term frequency
      const freq = this.termFrequencies.get(token) || 0;
      this.termFrequencies.set(token, freq + 1);
    }
  }

  remove(id: string): boolean {
    const doc = this.documents.get(id);
    if (!doc) return false;

    for (const token of doc.tokens) {
      const docIds = this.invertedIndex.get(token);
      if (docIds) {
        docIds.delete(id);
        if (docIds.size === 0) {
          this.invertedIndex.delete(token);
        }
      }
    }

    this.documents.delete(id);
    return true;
  }

  search(query: string, options: SearchOptions = {}): SearchResponse {
    const startTime = Date.now();
    const queryTokens = this.tokenize(query);

    if (queryTokens.length === 0) {
      return {
        query,
        results: [],
        totalHits: 0,
        took: 0,
      };
    }

    // Find matching documents
    const scores = new Map<string, { score: number; terms: string[] }>();

    for (const token of queryTokens) {
      const docIds = options.fuzzy
        ? this.fuzzyMatch(token)
        : this.invertedIndex.get(token) || new Set();

      for (const docId of docIds) {
        const current = scores.get(docId) || { score: 0, terms: [] };
        current.score += this.calculateScore(token);
        current.terms.push(token);
        scores.set(docId, current);
      }
    }

    // Convert to results
    let results: SearchResult[] = Array.from(scores.entries())
      .map(([id, { score, terms }]) => {
        const doc = this.documents.get(id)!;
        return {
          id,
          content: doc.content,
          title: doc.title || '',
          score,
          highlights: this.generateHighlights(doc.content, terms),
          matchedTerms: terms,
        };
      })
      .sort((a, b) => b.score - a.score);

    // Apply filters
    if (options.filters) {
      results = results.filter((r) => this.applyFilters(r, options.filters!));
    }

    // Apply sorting
    if (options.sort) {
      results.sort((a, b) => {
        const aVal = this.getFieldValue(a, options.sort!.field);
        const bVal = this.getFieldValue(b, options.sort!.field);
        const cmp = String(aVal).localeCompare(String(bVal));
        return options.sort!.order === 'desc' ? -cmp : cmp;
      });
    }

    const totalHits = results.length;

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 10;
    results = results.slice(offset, offset + limit);

    return {
      query,
      results,
      totalHits,
      took: Date.now() - startTime,
    };
  }

  suggest(prefix: string, maxSuggestions: number = 10): SearchSuggestion[] {
    const lowerPrefix = prefix.toLowerCase();
    const suggestions: SearchSuggestion[] = [];

    for (const [token, freq] of this.termFrequencies) {
      if (token.startsWith(lowerPrefix)) {
        suggestions.push({
          text: token,
          type: 'completion',
          score: freq,
          highlighted: `<em>${lowerPrefix}</em>${token.slice(lowerPrefix.length)}`,
        });
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions);
  }

  clear(): void {
    this.documents.clear();
    this.invertedIndex.clear();
    this.termFrequencies.clear();
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length >= 2);
  }

  private fuzzyMatch(token: string): Set<string> {
    const matches = new Set<string>();
    for (const [indexToken, docIds] of this.invertedIndex) {
      if (this.levenshteinSimilarity(token, indexToken) > 0.7) {
        for (const docId of docIds) {
          matches.add(docId);
        }
      }
    }
    return matches;
  }

  private levenshteinSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const matrix: number[][] = [];
    for (let i = 0; i <= a.length; i++) matrix[i] = [i];
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return 1 - matrix[a.length][b.length] / Math.max(a.length, b.length);
  }

  private calculateScore(token: string): number {
    const freq = this.termFrequencies.get(token) || 1;
    return 1 / Math.log(freq + 1);
  }

  private generateHighlights(content: string, terms: string[]): string[] {
    const highlights: string[] = [];
    const lower = content.toLowerCase();

    for (const term of terms) {
      const index = lower.indexOf(term);
      if (index !== -1) {
        const start = Math.max(0, index - 30);
        const end = Math.min(content.length, index + term.length + 30);
        const fragment = content.slice(start, end);
        highlights.push((start > 0 ? '...' : '') + fragment + (end < content.length ? '...' : ''));
      }
    }

    return highlights;
  }

  private applyFilters(result: SearchResult, filters: SearchFilter[]): boolean {
    for (const filter of filters) {
      const value = this.getFieldValue(result, filter.field);
      switch (filter.operator) {
        case 'eq':
          if (value !== filter.value) return false;
          break;
        case 'ne':
          if (value === filter.value) return false;
          break;
        case 'contains':
          if (typeof value !== 'string' || !value.includes(String(filter.value))) return false;
          break;
        case 'gt':
          if (typeof value !== 'number' || value <= (filter.value as number)) return false;
          break;
        case 'lt':
          if (typeof value !== 'number' || value >= (filter.value as number)) return false;
          break;
      }
    }
    return true;
  }

  private getFieldValue(result: SearchResult, field: string): unknown {
    if (field === 'id') return result.id;
    if (field === 'title') return result.title;
    if (field === 'content') return result.content;
    if (field === 'score') return result.score;
    return undefined;
  }
}

/**
 * Search integration hook
 */
export function useSearch(options: UseSearchOptions = {}): SearchState & SearchActions {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    maxSuggestions = 10,
    autoSuggest = true,
    onSearch,
    onSuggest,
    onError,
  } = options;

  const [status, setStatus] = useState<SearchStatus>('idle');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const indexRef = useRef(new SimpleSearchIndex());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  /**
   * Search documents
   */
  const search = useCallback(
    async (queryText: string, searchOptions: SearchOptions = {}): Promise<SearchResponse> => {
      setQuery(queryText);
      setStatus('searching');
      setError(null);

      try {
        if (queryText.length < minQueryLength) {
          const emptyResponse: SearchResponse = {
            query: queryText,
            results: [],
            totalHits: 0,
            took: 0,
          };
          setResults([]);
          setTotalHits(0);
          setStatus('complete');
          return emptyResponse;
        }

        const response = indexRef.current.search(queryText, searchOptions);

        setResults(response.results);
        setTotalHits(response.totalHits);
        setStatus('complete');
        onSearch?.(response);

        return response;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Search failed';
        setError(errorMsg);
        setStatus('error');
        onError?.(errorMsg);
        throw e;
      }
    },
    [minQueryLength, onSearch, onError]
  );

  /**
   * Get suggestions
   */
  const suggest = useCallback(
    async (prefix: string): Promise<SearchSuggestion[]> => {
      if (prefix.length < minQueryLength) {
        setSuggestions([]);
        return [];
      }

      setStatus('suggesting');

      try {
        const results = indexRef.current.suggest(prefix, maxSuggestions);
        setSuggestions(results);
        setStatus('idle');
        onSuggest?.(results);
        return results;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Suggest failed';
        setError(errorMsg);
        setStatus('error');
        onError?.(errorMsg);
        return [];
      }
    },
    [minQueryLength, maxSuggestions, onSuggest, onError]
  );

  /**
   * Index document
   */
  const indexDocument = useCallback((doc: SearchDocument): void => {
    indexRef.current.index(doc);
  }, []);

  /**
   * Remove document
   */
  const removeDocument = useCallback((id: string): void => {
    indexRef.current.remove(id);
  }, []);

  /**
   * Clear results
   */
  const clearResults = useCallback((): void => {
    setResults([]);
    setTotalHits(0);
    setSuggestions([]);
    setQuery('');
    setStatus('idle');
    setError(null);
  }, []);

  /**
   * Reset everything
   */
  const reset = useCallback((): void => {
    clearResults();
    indexRef.current.clear();
  }, [clearResults]);

  // Computed values
  const isSearching = status === 'searching';
  const isSuggesting = status === 'suggesting';
  const hasResults = results.length > 0;

  return {
    // State
    status,
    query,
    results,
    suggestions,
    totalHits,
    isSearching,
    isSuggesting,
    hasResults,
    error,

    // Actions
    search,
    suggest,
    indexDocument,
    removeDocument,
    clearResults,
    reset,
  };
}

/**
 * Default export
 */
export default useSearch;
