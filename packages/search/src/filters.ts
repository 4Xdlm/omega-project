/**
 * Search Filters System
 * @module @omega/search/filters
 * @description Advanced filtering, facets and aggregations
 */

import type { IndexedDocument } from './types';

/**
 * Filter operators
 */
export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'between'
  | 'regex'
  | 'exists'
  | 'notExists';

/**
 * Advanced filter definition
 */
export interface AdvancedFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
  caseSensitive?: boolean;
}

/**
 * Filter group with logical operators
 */
export interface FilterGroup {
  logic: 'and' | 'or';
  filters: Array<AdvancedFilter | FilterGroup>;
}

/**
 * Facet definition
 */
export interface FacetDefinition {
  field: string;
  type: 'terms' | 'range' | 'date';
  size?: number;
  ranges?: Array<{ from?: number; to?: number; label: string }>;
}

/**
 * Facet result for terms
 */
export interface TermsFacetResult {
  type: 'terms';
  field: string;
  buckets: Array<{ value: string; count: number }>;
  total: number;
}

/**
 * Facet result for ranges
 */
export interface RangeFacetResult {
  type: 'range';
  field: string;
  buckets: Array<{ from?: number; to?: number; label: string; count: number }>;
  total: number;
}

/**
 * Union of facet results
 */
export type FacetResult = TermsFacetResult | RangeFacetResult;

/**
 * Aggregation definition
 */
export interface AggregationDefinition {
  field: string;
  type: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'cardinality';
}

/**
 * Aggregation result
 */
export interface AggregationResult {
  field: string;
  type: string;
  value: number;
}

/**
 * Filter processor for advanced filtering
 */
export class FilterProcessor {
  /**
   * Apply single filter to document
   */
  applyFilter(doc: IndexedDocument, filter: AdvancedFilter): boolean {
    const fieldValue = this.getFieldValue(doc, filter.field);

    switch (filter.operator) {
      case 'eq':
        return this.equals(fieldValue, filter.value, filter.caseSensitive);
      case 'ne':
        return !this.equals(fieldValue, filter.value, filter.caseSensitive);
      case 'gt':
        return this.compare(fieldValue, filter.value) > 0;
      case 'gte':
        return this.compare(fieldValue, filter.value) >= 0;
      case 'lt':
        return this.compare(fieldValue, filter.value) < 0;
      case 'lte':
        return this.compare(fieldValue, filter.value) <= 0;
      case 'contains':
        return this.contains(fieldValue, filter.value, filter.caseSensitive);
      case 'startsWith':
        return this.startsWith(fieldValue, filter.value, filter.caseSensitive);
      case 'endsWith':
        return this.endsWith(fieldValue, filter.value, filter.caseSensitive);
      case 'in':
        return this.isIn(fieldValue, filter.value);
      case 'notIn':
        return !this.isIn(fieldValue, filter.value);
      case 'between':
        return this.between(fieldValue, filter.value);
      case 'regex':
        return this.matchesRegex(fieldValue, filter.value);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'notExists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }

  /**
   * Apply filter group to document
   */
  applyFilterGroup(doc: IndexedDocument, group: FilterGroup): boolean {
    const results = group.filters.map((filter) => {
      if ('logic' in filter) {
        return this.applyFilterGroup(doc, filter);
      }
      return this.applyFilter(doc, filter);
    });

    if (group.logic === 'and') {
      return results.every(Boolean);
    }
    return results.some(Boolean);
  }

  /**
   * Filter documents
   */
  filter(
    docs: IndexedDocument[],
    filter: AdvancedFilter | FilterGroup
  ): IndexedDocument[] {
    return docs.filter((doc) => {
      if ('logic' in filter) {
        return this.applyFilterGroup(doc, filter);
      }
      return this.applyFilter(doc, filter);
    });
  }

  /**
   * Get field value from document
   */
  private getFieldValue(doc: IndexedDocument, field: string): unknown {
    if (field === 'id') return doc.id;
    if (field === 'title') return doc.title;
    if (field === 'content') return doc.content;
    if (field === 'timestamp') return doc.timestamp;
    if (field === 'tokenCount') return doc.tokenCount;

    // Support nested fields with dot notation
    if (field.startsWith('metadata.')) {
      const key = field.slice(9);
      return doc.metadata[key];
    }

    return doc.metadata[field];
  }

  /**
   * Equality comparison
   */
  private equals(a: unknown, b: unknown, caseSensitive?: boolean): boolean {
    if (typeof a === 'string' && typeof b === 'string' && !caseSensitive) {
      return a.toLowerCase() === b.toLowerCase();
    }
    return a === b;
  }

  /**
   * Numeric comparison
   */
  private compare(a: unknown, b: unknown): number {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }
    return 0;
  }

  /**
   * Contains check
   */
  private contains(value: unknown, search: unknown, caseSensitive?: boolean): boolean {
    if (typeof value !== 'string' || typeof search !== 'string') return false;
    if (caseSensitive) {
      return value.includes(search);
    }
    return value.toLowerCase().includes(search.toLowerCase());
  }

  /**
   * Starts with check
   */
  private startsWith(value: unknown, prefix: unknown, caseSensitive?: boolean): boolean {
    if (typeof value !== 'string' || typeof prefix !== 'string') return false;
    if (caseSensitive) {
      return value.startsWith(prefix);
    }
    return value.toLowerCase().startsWith(prefix.toLowerCase());
  }

  /**
   * Ends with check
   */
  private endsWith(value: unknown, suffix: unknown, caseSensitive?: boolean): boolean {
    if (typeof value !== 'string' || typeof suffix !== 'string') return false;
    if (caseSensitive) {
      return value.endsWith(suffix);
    }
    return value.toLowerCase().endsWith(suffix.toLowerCase());
  }

  /**
   * In array check
   */
  private isIn(value: unknown, array: unknown): boolean {
    if (!Array.isArray(array)) return false;
    return array.includes(value);
  }

  /**
   * Between range check
   */
  private between(value: unknown, range: unknown): boolean {
    if (typeof value !== 'number') return false;
    if (!Array.isArray(range) || range.length !== 2) return false;
    const [min, max] = range as [number, number];
    return value >= min && value <= max;
  }

  /**
   * Regex match
   */
  private matchesRegex(value: unknown, pattern: unknown): boolean {
    if (typeof value !== 'string' || typeof pattern !== 'string') return false;
    try {
      const regex = new RegExp(pattern);
      return regex.test(value);
    } catch {
      return false;
    }
  }
}

/**
 * Facet processor for aggregating results
 */
export class FacetProcessor {
  /**
   * Calculate facets for documents
   */
  calculateFacets(
    docs: IndexedDocument[],
    facets: FacetDefinition[]
  ): FacetResult[] {
    return facets.map((facet) => this.calculateFacet(docs, facet));
  }

  /**
   * Calculate single facet
   */
  calculateFacet(docs: IndexedDocument[], facet: FacetDefinition): FacetResult {
    if (facet.type === 'range') {
      return this.calculateRangeFacet(docs, facet);
    }
    return this.calculateTermsFacet(docs, facet);
  }

  /**
   * Calculate terms facet
   */
  private calculateTermsFacet(
    docs: IndexedDocument[],
    facet: FacetDefinition
  ): TermsFacetResult {
    const counts = new Map<string, number>();

    for (const doc of docs) {
      const value = this.getFieldValue(doc, facet.field);
      if (value !== undefined && value !== null) {
        const key = String(value);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }

    const buckets = Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, facet.size || 10);

    return {
      type: 'terms',
      field: facet.field,
      buckets,
      total: docs.length,
    };
  }

  /**
   * Calculate range facet
   */
  private calculateRangeFacet(
    docs: IndexedDocument[],
    facet: FacetDefinition
  ): RangeFacetResult {
    const ranges = facet.ranges || [];
    const buckets = ranges.map((range) => {
      const count = docs.filter((doc) => {
        const value = this.getFieldValue(doc, facet.field);
        if (typeof value !== 'number') return false;

        const fromOk = range.from === undefined || value >= range.from;
        const toOk = range.to === undefined || value < range.to;
        return fromOk && toOk;
      }).length;

      return {
        from: range.from,
        to: range.to,
        label: range.label,
        count,
      };
    });

    return {
      type: 'range',
      field: facet.field,
      buckets,
      total: docs.length,
    };
  }

  /**
   * Get field value from document
   */
  private getFieldValue(doc: IndexedDocument, field: string): unknown {
    if (field === 'id') return doc.id;
    if (field === 'title') return doc.title;
    if (field === 'content') return doc.content;
    if (field === 'timestamp') return doc.timestamp;
    if (field === 'tokenCount') return doc.tokenCount;

    if (field.startsWith('metadata.')) {
      const key = field.slice(9);
      return doc.metadata[key];
    }

    return doc.metadata[field];
  }
}

/**
 * Aggregation processor
 */
export class AggregationProcessor {
  /**
   * Calculate aggregations
   */
  calculateAggregations(
    docs: IndexedDocument[],
    aggregations: AggregationDefinition[]
  ): AggregationResult[] {
    return aggregations.map((agg) => this.calculateAggregation(docs, agg));
  }

  /**
   * Calculate single aggregation
   */
  calculateAggregation(
    docs: IndexedDocument[],
    agg: AggregationDefinition
  ): AggregationResult {
    const values = this.extractNumericValues(docs, agg.field);

    let value: number;

    switch (agg.type) {
      case 'sum':
        value = values.reduce((sum, v) => sum + v, 0);
        break;
      case 'avg':
        value = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
        break;
      case 'min':
        value = values.length > 0 ? Math.min(...values) : 0;
        break;
      case 'max':
        value = values.length > 0 ? Math.max(...values) : 0;
        break;
      case 'count':
        value = values.length;
        break;
      case 'cardinality':
        value = new Set(values).size;
        break;
      default:
        value = 0;
    }

    return {
      field: agg.field,
      type: agg.type,
      value,
    };
  }

  /**
   * Extract numeric values from documents
   */
  private extractNumericValues(docs: IndexedDocument[], field: string): number[] {
    const values: number[] = [];

    for (const doc of docs) {
      const value = this.getFieldValue(doc, field);
      if (typeof value === 'number') {
        values.push(value);
      }
    }

    return values;
  }

  /**
   * Get field value from document
   */
  private getFieldValue(doc: IndexedDocument, field: string): unknown {
    if (field === 'timestamp') return doc.timestamp;
    if (field === 'tokenCount') return doc.tokenCount;

    if (field.startsWith('metadata.')) {
      const key = field.slice(9);
      return doc.metadata[key];
    }

    return doc.metadata[field];
  }
}

/**
 * Create filter processor
 */
export function createFilterProcessor(): FilterProcessor {
  return new FilterProcessor();
}

/**
 * Create facet processor
 */
export function createFacetProcessor(): FacetProcessor {
  return new FacetProcessor();
}

/**
 * Create aggregation processor
 */
export function createAggregationProcessor(): AggregationProcessor {
  return new AggregationProcessor();
}
