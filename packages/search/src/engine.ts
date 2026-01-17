/**
 * Search Engine Core
 * @module @omega/search/engine
 * @description Core search engine implementation
 */

import {
  type SearchDocument,
  type IndexedDocument,
  type SearchQuery,
  type SearchResult,
  type SearchResponse,
  type SearchConfig,
  type IndexStats,
  type SearchHighlight,
  DEFAULT_SEARCH_CONFIG,
  SearchError,
} from './types';
import { emitEvent } from '@omega/omega-observability';

/**
 * Inverted index entry
 */
interface IndexEntry {
  docId: string;
  positions: number[];
  frequency: number;
}

/**
 * Search Engine
 * Full-text search with BM25 scoring and fuzzy matching
 */
export class SearchEngine {
  private config: SearchConfig;
  private documents: Map<string, IndexedDocument>;
  private invertedIndex: Map<string, IndexEntry[]>;
  private documentLengths: Map<string, number>;
  private avgDocumentLength: number;

  constructor(config: Partial<SearchConfig> = {}) {
    this.config = { ...DEFAULT_SEARCH_CONFIG, ...config };
    this.documents = new Map();
    this.invertedIndex = new Map();
    this.documentLengths = new Map();
    this.avgDocumentLength = 0;
  }

  /**
   * Index a document
   */
  index(doc: SearchDocument): string {
    const tokens = this.tokenize(doc.content);
    const limitedTokens = tokens.slice(0, this.config.maxTokensPerDocument);

    const indexed: IndexedDocument = {
      id: doc.id,
      content: doc.content,
      title: doc.title || '',
      tokens: limitedTokens,
      tokenCount: limitedTokens.length,
      metadata: doc.metadata || {},
      timestamp: doc.timestamp || Date.now(),
      indexedAt: Date.now(),
    };

    // Remove old version if exists
    if (this.documents.has(doc.id)) {
      this.removeFromIndex(doc.id);
    }

    // Store document
    this.documents.set(doc.id, indexed);
    this.documentLengths.set(doc.id, limitedTokens.length);

    // Build inverted index
    const tokenPositions = new Map<string, number[]>();
    limitedTokens.forEach((token, pos) => {
      const positions = tokenPositions.get(token) || [];
      positions.push(pos);
      tokenPositions.set(token, positions);
    });

    for (const [token, positions] of tokenPositions) {
      const entries = this.invertedIndex.get(token) || [];
      entries.push({
        docId: doc.id,
        positions,
        frequency: positions.length,
      });
      this.invertedIndex.set(token, entries);
    }

    // Update average document length
    this.updateAvgDocLength();

    return doc.id;
  }

  /**
   * Index multiple documents
   */
  indexBatch(docs: SearchDocument[]): string[] {
    return docs.map((doc) => this.index(doc));
  }

  /**
   * Remove document from index
   */
  remove(docId: string): boolean {
    if (!this.documents.has(docId)) {
      return false;
    }

    this.removeFromIndex(docId);
    this.documents.delete(docId);
    this.documentLengths.delete(docId);
    this.updateAvgDocLength();

    return true;
  }

  /**
   * Remove document entries from inverted index
   */
  private removeFromIndex(docId: string): void {
    for (const [token, entries] of this.invertedIndex) {
      const filtered = entries.filter((e) => e.docId !== docId);
      if (filtered.length === 0) {
        this.invertedIndex.delete(token);
      } else {
        this.invertedIndex.set(token, filtered);
      }
    }
  }

  /**
   * Search documents
   */
  search(query: SearchQuery): SearchResponse {
    const startTime = Date.now();
    const queryText = query.text.trim();

    // Emit search start event
    emitEvent("search.start", "INFO", "OBS-SEARCH-001", {
      queryLength: queryText.length,
      fuzzy: query.fuzzy ?? false,
      documentCount: this.documents.size,
    });

    if (!queryText) {
      return {
        query: queryText,
        results: [],
        totalHits: 0,
        took: 0,
        maxScore: 0,
      };
    }

    const queryTokens = this.tokenize(queryText);
    const limit = query.limit || this.config.defaultLimit;
    const offset = query.offset || 0;

    // Find matching documents
    const scores = new Map<string, { score: number; matchedTerms: Set<string> }>();

    for (const token of queryTokens) {
      const matches = query.fuzzy
        ? this.fuzzyMatch(token)
        : this.exactMatch(token);

      for (const entry of matches) {
        const boost = query.boost?.[entry.token] || 1;
        const score = this.calculateScore(entry.entry, token) * boost;

        const current = scores.get(entry.entry.docId) || {
          score: 0,
          matchedTerms: new Set<string>(),
        };
        current.score += score;
        current.matchedTerms.add(token);
        scores.set(entry.entry.docId, current);
      }
    }

    // Apply filters
    let filteredDocs = Array.from(scores.entries());
    if (query.filters) {
      filteredDocs = filteredDocs.filter(([docId]) => {
        const doc = this.documents.get(docId)!;
        return this.applyFilters(doc, query.filters!);
      });
    }

    // Sort by score
    filteredDocs.sort((a, b) => b[1].score - a[1].score);

    // Apply pagination
    const totalHits = filteredDocs.length;
    const paginated = filteredDocs.slice(offset, offset + limit);

    // Build results
    const results: SearchResult[] = paginated.map(([docId, { score, matchedTerms }]) => {
      const doc = this.documents.get(docId)!;
      const result: SearchResult = {
        document: doc,
        score,
        matchedTerms: Array.from(matchedTerms),
      };

      if (query.highlight) {
        result.highlights = this.generateHighlights(doc, Array.from(matchedTerms));
      }

      return result;
    });

    const maxScore = results.length > 0 ? results[0].score : 0;
    const durationMs = Date.now() - startTime;

    // Emit search complete event
    emitEvent("search.complete", "INFO", "OBS-SEARCH-002", {
      totalHits,
      resultCount: results.length,
      durationMs,
      maxScore: Math.round(maxScore * 1000) / 1000,
    });

    return {
      query: queryText,
      results,
      totalHits,
      took: durationMs,
      maxScore,
    };
  }

  /**
   * Get document by ID
   */
  getDocument(docId: string): IndexedDocument | null {
    return this.documents.get(docId) || null;
  }

  /**
   * Check if document exists
   */
  hasDocument(docId: string): boolean {
    return this.documents.has(docId);
  }

  /**
   * Get all document IDs
   */
  getDocumentIds(): string[] {
    return Array.from(this.documents.keys());
  }

  /**
   * Get index statistics
   */
  getStats(): IndexStats {
    let totalTokens = 0;
    for (const doc of this.documents.values()) {
      totalTokens += doc.tokenCount;
    }

    const timestamps = Array.from(this.documents.values()).map((d) => d.indexedAt);
    const lastUpdated = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    return {
      documentCount: this.documents.size,
      tokenCount: totalTokens,
      uniqueTokens: this.invertedIndex.size,
      avgDocumentLength: this.avgDocumentLength,
      indexSize: this.estimateSize(),
      lastUpdated,
    };
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.documents.clear();
    this.invertedIndex.clear();
    this.documentLengths.clear();
    this.avgDocumentLength = 0;
  }

  /**
   * Tokenize text
   */
  tokenize(text: string): string[] {
    // Lowercase and split on non-word characters
    const raw = text.toLowerCase().split(/\W+/).filter(Boolean);

    // Apply filters
    let tokens = raw.filter(
      (t) =>
        t.length >= this.config.minTokenLength &&
        !this.config.stopWords.includes(t)
    );

    // Apply stemming if enabled
    if (this.config.stemming) {
      tokens = tokens.map((t) => this.stem(t));
    }

    return tokens;
  }

  /**
   * Simple stemming (Porter-like)
   */
  private stem(word: string): string {
    // Simple suffix removal
    const suffixes = ['ing', 'ed', 'ly', 'es', 's', 'ment', 'ness', 'tion', 'able', 'ible'];

    for (const suffix of suffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) {
        return word.slice(0, -suffix.length);
      }
    }

    return word;
  }

  /**
   * Exact token match
   */
  private exactMatch(token: string): Array<{ entry: IndexEntry; token: string }> {
    const entries = this.invertedIndex.get(token);
    if (!entries) return [];
    return entries.map((entry) => ({ entry, token }));
  }

  /**
   * Fuzzy token match
   */
  private fuzzyMatch(token: string): Array<{ entry: IndexEntry; token: string }> {
    const matches: Array<{ entry: IndexEntry; token: string }> = [];

    for (const [indexToken, entries] of this.invertedIndex) {
      const similarity = this.levenshteinSimilarity(token, indexToken);
      if (similarity >= this.config.fuzzyThreshold) {
        for (const entry of entries) {
          matches.push({ entry, token: indexToken });
        }
      }
    }

    return matches;
  }

  /**
   * Calculate Levenshtein similarity
   */
  private levenshteinSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const matrix: number[][] = [];

    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }

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

    const distance = matrix[a.length][b.length];
    const maxLen = Math.max(a.length, b.length);
    return 1 - distance / maxLen;
  }

  /**
   * Calculate BM25 score
   */
  private calculateScore(entry: IndexEntry, queryToken: string): number {
    if (!this.config.useBM25) {
      // Simple TF-IDF
      const tf = entry.frequency;
      const df = this.invertedIndex.get(queryToken)?.length || 1;
      const idf = Math.log((this.documents.size + 1) / (df + 1));
      return tf * idf;
    }

    // BM25 scoring
    const { bm25K1, bm25B } = this.config;
    const N = this.documents.size;
    const df = this.invertedIndex.get(queryToken)?.length || 1;
    const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

    const docLength = this.documentLengths.get(entry.docId) || 0;
    const tf = entry.frequency;

    const numerator = tf * (bm25K1 + 1);
    const denominator =
      tf + bm25K1 * (1 - bm25B + bm25B * (docLength / this.avgDocumentLength));

    return idf * (numerator / denominator);
  }

  /**
   * Apply filters to document
   */
  private applyFilters(
    doc: IndexedDocument,
    filters: Array<{ field: string; operator: string; value: unknown }>
  ): boolean {
    for (const filter of filters) {
      const fieldValue = this.getFieldValue(doc, filter.field);

      switch (filter.operator) {
        case 'eq':
          if (fieldValue !== filter.value) return false;
          break;
        case 'ne':
          if (fieldValue === filter.value) return false;
          break;
        case 'gt':
          if (typeof fieldValue !== 'number' || fieldValue <= (filter.value as number))
            return false;
          break;
        case 'gte':
          if (typeof fieldValue !== 'number' || fieldValue < (filter.value as number))
            return false;
          break;
        case 'lt':
          if (typeof fieldValue !== 'number' || fieldValue >= (filter.value as number))
            return false;
          break;
        case 'lte':
          if (typeof fieldValue !== 'number' || fieldValue > (filter.value as number))
            return false;
          break;
        case 'contains':
          if (typeof fieldValue !== 'string' || !fieldValue.includes(filter.value as string))
            return false;
          break;
        case 'in':
          if (!Array.isArray(filter.value) || !filter.value.includes(fieldValue))
            return false;
          break;
      }
    }

    return true;
  }

  /**
   * Get field value from document
   */
  private getFieldValue(doc: IndexedDocument, field: string): unknown {
    if (field === 'id') return doc.id;
    if (field === 'title') return doc.title;
    if (field === 'content') return doc.content;
    if (field === 'timestamp') return doc.timestamp;
    return doc.metadata[field];
  }

  /**
   * Generate search highlights
   */
  private generateHighlights(doc: IndexedDocument, terms: string[]): SearchHighlight[] {
    const highlights: SearchHighlight[] = [];
    const content = doc.content.toLowerCase();

    for (const term of terms) {
      const positions: { start: number; end: number }[] = [];
      let index = content.indexOf(term);

      while (index !== -1) {
        positions.push({ start: index, end: index + term.length });
        index = content.indexOf(term, index + 1);
      }

      if (positions.length > 0) {
        // Get fragment around first match
        const firstPos = positions[0];
        const start = Math.max(0, firstPos.start - 50);
        const end = Math.min(doc.content.length, firstPos.end + 50);
        const fragment = doc.content.slice(start, end);

        highlights.push({
          field: 'content',
          fragment: (start > 0 ? '...' : '') + fragment + (end < doc.content.length ? '...' : ''),
          positions,
        });
      }
    }

    return highlights;
  }

  /**
   * Update average document length
   */
  private updateAvgDocLength(): void {
    if (this.documents.size === 0) {
      this.avgDocumentLength = 0;
      return;
    }

    let total = 0;
    for (const length of this.documentLengths.values()) {
      total += length;
    }
    this.avgDocumentLength = total / this.documents.size;
  }

  /**
   * Estimate index size in bytes
   */
  private estimateSize(): number {
    let size = 0;

    // Documents
    for (const doc of this.documents.values()) {
      size += doc.content.length * 2; // UTF-16
      size += doc.tokens.join('').length * 2;
    }

    // Inverted index
    for (const [token, entries] of this.invertedIndex) {
      size += token.length * 2;
      size += entries.length * 24; // Rough estimate per entry
    }

    return size;
  }
}

/**
 * Create search engine instance
 */
export function createSearchEngine(config?: Partial<SearchConfig>): SearchEngine {
  return new SearchEngine(config);
}
