/**
 * Search Suggestions System
 * @module @omega/search/suggest
 * @description Autocomplete and query suggestions
 */

// ═══════════════════════════════════════════════════════════════════════════
// SCORING WEIGHTS (internal, not exported)
// ═══════════════════════════════════════════════════════════════════════════

/** Weight for prefix ratio in completion scoring */
const COMPLETION_PREFIX_WEIGHT = 0.5;
/** Weight for frequency in completion scoring */
const COMPLETION_FREQUENCY_WEIGHT = 0.5;

/** Weight for distance penalty in correction scoring */
const CORRECTION_DISTANCE_WEIGHT = 0.6;
/** Weight for frequency in correction scoring */
const CORRECTION_FREQUENCY_WEIGHT = 0.4;

/** Weight for prefix ratio in phrase scoring */
const PHRASE_PREFIX_WEIGHT = 0.4;
/** Weight for frequency in phrase scoring */
const PHRASE_FREQUENCY_WEIGHT = 0.6;

/**
 * Suggestion type
 */
export type SuggestionType = 'completion' | 'correction' | 'phrase' | 'popular';

/**
 * Single suggestion
 */
export interface Suggestion {
  text: string;
  type: SuggestionType;
  score: number;
  frequency?: number;
  highlighted?: string;
}

/**
 * Suggestion request
 */
export interface SuggestRequest {
  prefix: string;
  limit?: number;
  types?: SuggestionType[];
  minScore?: number;
  contextField?: string;
}

/**
 * Suggestion response
 */
export interface SuggestResponse {
  prefix: string;
  suggestions: Suggestion[];
  took: number;
}

/**
 * Suggester configuration
 */
export interface SuggesterConfig {
  /** Maximum suggestions */
  maxSuggestions: number;
  /** Minimum prefix length */
  minPrefixLength: number;
  /** Enable fuzzy matching */
  fuzzyEnabled: boolean;
  /** Fuzzy edit distance */
  fuzzyMaxEdits: number;
  /** Popular terms weight */
  popularWeight: number;
  /** Enable phrase suggestions */
  phrasesEnabled: boolean;
  /** Maximum phrase length */
  maxPhraseLength: number;
}

/**
 * Default suggester configuration
 */
export const DEFAULT_SUGGESTER_CONFIG: SuggesterConfig = {
  maxSuggestions: 10,
  minPrefixLength: 2,
  fuzzyEnabled: true,
  fuzzyMaxEdits: 2,
  popularWeight: 1.5,
  phrasesEnabled: true,
  maxPhraseLength: 5,
};

/**
 * N-gram entry for autocomplete
 */
interface NgramEntry {
  term: string;
  frequency: number;
  contexts: Set<string>;
}

/**
 * Phrase entry
 */
interface PhraseEntry {
  phrase: string;
  frequency: number;
  words: string[];
}

/**
 * Search Suggester
 * Provides autocomplete and query suggestions
 */
export class SearchSuggester {
  private config: SuggesterConfig;
  private terms: Map<string, NgramEntry>;
  private prefixIndex: Map<string, Set<string>>;
  private phrases: Map<string, PhraseEntry>;
  private popularQueries: Map<string, number>;

  constructor(config: Partial<SuggesterConfig> = {}) {
    this.config = { ...DEFAULT_SUGGESTER_CONFIG, ...config };
    this.terms = new Map();
    this.prefixIndex = new Map();
    this.phrases = new Map();
    this.popularQueries = new Map();
  }

  /**
   * Index terms from text
   */
  indexText(text: string, context?: string): void {
    const tokens = this.tokenize(text);

    // Index individual terms
    for (const token of tokens) {
      this.indexTerm(token, context);
    }

    // Index phrases
    if (this.config.phrasesEnabled) {
      this.indexPhrases(tokens);
    }
  }

  /**
   * Index single term
   */
  private indexTerm(term: string, context?: string): void {
    const existing = this.terms.get(term);

    if (existing) {
      existing.frequency++;
      if (context) {
        existing.contexts.add(context);
      }
    } else {
      this.terms.set(term, {
        term,
        frequency: 1,
        contexts: context ? new Set([context]) : new Set(),
      });
    }

    // Build prefix index
    for (let i = this.config.minPrefixLength; i <= term.length; i++) {
      const prefix = term.slice(0, i);
      const terms = this.prefixIndex.get(prefix) || new Set();
      terms.add(term);
      this.prefixIndex.set(prefix, terms);
    }
  }

  /**
   * Index phrases from tokens
   */
  private indexPhrases(tokens: string[]): void {
    for (let i = 0; i < tokens.length - 1; i++) {
      for (let len = 2; len <= Math.min(this.config.maxPhraseLength, tokens.length - i); len++) {
        const phraseWords = tokens.slice(i, i + len);
        const phrase = phraseWords.join(' ');

        const existing = this.phrases.get(phrase);
        if (existing) {
          existing.frequency++;
        } else {
          this.phrases.set(phrase, {
            phrase,
            frequency: 1,
            words: phraseWords,
          });
        }
      }
    }
  }

  /**
   * Record popular query
   */
  recordQuery(query: string): void {
    const normalized = query.toLowerCase().trim();
    const current = this.popularQueries.get(normalized) || 0;
    this.popularQueries.set(normalized, current + 1);
  }

  /**
   * Get suggestions for prefix
   */
  suggest(request: SuggestRequest): SuggestResponse {
    const startTime = Date.now();
    const prefix = request.prefix.toLowerCase().trim();

    if (prefix.length < this.config.minPrefixLength) {
      return {
        prefix: request.prefix,
        suggestions: [],
        took: Date.now() - startTime,
      };
    }

    const limit = request.limit || this.config.maxSuggestions;
    const types = request.types || ['completion', 'correction', 'phrase', 'popular'];
    const minScore = request.minScore || 0;

    const suggestions: Suggestion[] = [];

    // Completion suggestions
    if (types.includes('completion')) {
      suggestions.push(...this.getCompletions(prefix, request.contextField));
    }

    // Correction suggestions (fuzzy)
    if (types.includes('correction') && this.config.fuzzyEnabled) {
      suggestions.push(...this.getCorrections(prefix));
    }

    // Phrase suggestions
    if (types.includes('phrase') && this.config.phrasesEnabled) {
      suggestions.push(...this.getPhraseSuggestions(prefix));
    }

    // Popular query suggestions
    if (types.includes('popular')) {
      suggestions.push(...this.getPopularSuggestions(prefix));
    }

    // Filter by minimum score
    let filtered = suggestions.filter((s) => s.score >= minScore);

    // Deduplicate
    const seen = new Set<string>();
    filtered = filtered.filter((s) => {
      const key = s.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by score
    filtered.sort((a, b) => b.score - a.score);

    // Limit results
    const limited = filtered.slice(0, limit);

    // Add highlighting
    const highlighted = limited.map((s) => ({
      ...s,
      highlighted: this.highlight(s.text, prefix),
    }));

    return {
      prefix: request.prefix,
      suggestions: highlighted,
      took: Date.now() - startTime,
    };
  }

  /**
   * Get completion suggestions
   */
  private getCompletions(prefix: string, contextField?: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const matching = this.prefixIndex.get(prefix) || new Set();

    for (const term of matching) {
      const entry = this.terms.get(term);
      if (!entry) continue;

      // Context filtering
      if (contextField && entry.contexts.size > 0 && !entry.contexts.has(contextField)) {
        continue;
      }

      const score = this.calculateCompletionScore(prefix, term, entry.frequency);
      suggestions.push({
        text: term,
        type: 'completion',
        score,
        frequency: entry.frequency,
      });
    }

    return suggestions;
  }

  /**
   * Get correction suggestions (fuzzy)
   */
  private getCorrections(prefix: string): Suggestion[] {
    const suggestions: Suggestion[] = [];

    for (const [term, entry] of this.terms) {
      // Skip exact prefix matches (already in completions)
      if (term.startsWith(prefix)) continue;

      const distance = this.levenshteinDistance(prefix, term.slice(0, prefix.length));
      if (distance <= this.config.fuzzyMaxEdits) {
        const score = this.calculateCorrectionScore(distance, entry.frequency);
        suggestions.push({
          text: term,
          type: 'correction',
          score,
          frequency: entry.frequency,
        });
      }
    }

    return suggestions;
  }

  /**
   * Get phrase suggestions
   */
  private getPhraseSuggestions(prefix: string): Suggestion[] {
    const suggestions: Suggestion[] = [];

    for (const [phrase, entry] of this.phrases) {
      if (phrase.toLowerCase().startsWith(prefix)) {
        const score = this.calculatePhraseScore(prefix, phrase, entry.frequency);
        suggestions.push({
          text: phrase,
          type: 'phrase',
          score,
          frequency: entry.frequency,
        });
      }
    }

    return suggestions;
  }

  /**
   * Get popular query suggestions
   */
  private getPopularSuggestions(prefix: string): Suggestion[] {
    const suggestions: Suggestion[] = [];

    for (const [query, frequency] of this.popularQueries) {
      if (query.startsWith(prefix)) {
        const score = frequency * this.config.popularWeight;
        suggestions.push({
          text: query,
          type: 'popular',
          score,
          frequency,
        });
      }
    }

    return suggestions;
  }

  /**
   * Calculate completion score
   */
  private calculateCompletionScore(prefix: string, term: string, frequency: number): number {
    const prefixRatio = prefix.length / term.length;
    const frequencyScore = Math.log(frequency + 1);
    return prefixRatio * COMPLETION_PREFIX_WEIGHT + frequencyScore * COMPLETION_FREQUENCY_WEIGHT;
  }

  /**
   * Calculate correction score
   */
  private calculateCorrectionScore(distance: number, frequency: number): number {
    const distancePenalty = 1 / (distance + 1);
    const frequencyScore = Math.log(frequency + 1);
    return distancePenalty * CORRECTION_DISTANCE_WEIGHT + frequencyScore * CORRECTION_FREQUENCY_WEIGHT;
  }

  /**
   * Calculate phrase score
   */
  private calculatePhraseScore(prefix: string, phrase: string, frequency: number): number {
    const prefixRatio = prefix.length / phrase.length;
    const frequencyScore = Math.log(frequency + 1);
    return prefixRatio * PHRASE_PREFIX_WEIGHT + frequencyScore * PHRASE_FREQUENCY_WEIGHT;
  }

  /**
   * Tokenize text
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length >= 2);
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

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

    return matrix[a.length][b.length];
  }

  /**
   * Highlight matching prefix
   */
  private highlight(text: string, prefix: string): string {
    const lower = text.toLowerCase();
    const index = lower.indexOf(prefix);
    if (index === -1) return text;

    return (
      text.slice(0, index) +
      '<em>' +
      text.slice(index, index + prefix.length) +
      '</em>' +
      text.slice(index + prefix.length)
    );
  }

  /**
   * Get statistics
   */
  getStats(): { terms: number; phrases: number; popularQueries: number } {
    return {
      terms: this.terms.size,
      phrases: this.phrases.size,
      popularQueries: this.popularQueries.size,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.terms.clear();
    this.prefixIndex.clear();
    this.phrases.clear();
    this.popularQueries.clear();
  }

  /**
   * Get top terms
   */
  getTopTerms(limit: number = 10): Array<{ term: string; frequency: number }> {
    return Array.from(this.terms.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit)
      .map(({ term, frequency }) => ({ term, frequency }));
  }

  /**
   * Get top phrases
   */
  getTopPhrases(limit: number = 10): Array<{ phrase: string; frequency: number }> {
    return Array.from(this.phrases.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit)
      .map(({ phrase, frequency }) => ({ phrase, frequency }));
  }

  /**
   * Get top popular queries
   */
  getTopPopularQueries(limit: number = 10): Array<{ query: string; frequency: number }> {
    return Array.from(this.popularQueries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query, frequency]) => ({ query, frequency }));
  }
}

/**
 * Create suggester instance
 */
export function createSuggester(config?: Partial<SuggesterConfig>): SearchSuggester {
  return new SearchSuggester(config);
}
