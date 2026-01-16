/**
 * Search Filters Tests
 * @module @omega/search/test/filters
 * @description Unit tests for Phase 147 - Search Filters
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FilterProcessor,
  FacetProcessor,
  AggregationProcessor,
  createFilterProcessor,
  createFacetProcessor,
  createAggregationProcessor,
  type AdvancedFilter,
  type FilterGroup,
  type FacetDefinition,
  type AggregationDefinition,
} from '../src/filters';
import type { IndexedDocument } from '../src/types';

describe('OMEGA Search - Phase 147: Search Filters', () => {
  let filterProcessor: FilterProcessor;
  let facetProcessor: FacetProcessor;
  let aggregationProcessor: AggregationProcessor;

  const sampleDocs: IndexedDocument[] = [
    {
      id: 'doc1',
      content: 'The quick brown fox',
      title: 'Fox Story',
      tokens: ['quick', 'brown', 'fox'],
      tokenCount: 3,
      metadata: { category: 'animals', rating: 5, author: 'John' },
      timestamp: 1000,
      indexedAt: Date.now(),
    },
    {
      id: 'doc2',
      content: 'A lazy cat sleeps',
      title: 'Cat Tale',
      tokens: ['lazy', 'cat', 'sleeps'],
      tokenCount: 3,
      metadata: { category: 'animals', rating: 3, author: 'Jane' },
      timestamp: 2000,
      indexedAt: Date.now(),
    },
    {
      id: 'doc3',
      content: 'The brown bear',
      title: 'Bear Adventure',
      tokens: ['brown', 'bear'],
      tokenCount: 2,
      metadata: { category: 'wildlife', rating: 4, author: 'John' },
      timestamp: 3000,
      indexedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    filterProcessor = createFilterProcessor();
    facetProcessor = createFacetProcessor();
    aggregationProcessor = createAggregationProcessor();
  });

  describe('Filter Processor - Basic Operators', () => {
    it('should filter by equality', () => {
      const filter: AdvancedFilter = { field: 'category', operator: 'eq', value: 'animals' };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(2);
    });

    it('should filter by inequality', () => {
      const filter: AdvancedFilter = { field: 'category', operator: 'ne', value: 'animals' };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(1);
    });

    it('should filter by greater than', () => {
      const filter: AdvancedFilter = { field: 'rating', operator: 'gt', value: 3 };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(2);
    });

    it('should filter by greater than or equal', () => {
      const filter: AdvancedFilter = { field: 'rating', operator: 'gte', value: 4 };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(2);
    });

    it('should filter by less than', () => {
      const filter: AdvancedFilter = { field: 'rating', operator: 'lt', value: 4 };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(1);
    });

    it('should filter by less than or equal', () => {
      const filter: AdvancedFilter = { field: 'rating', operator: 'lte', value: 4 };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(2);
    });
  });

  describe('Filter Processor - String Operators', () => {
    it('should filter by contains', () => {
      const filter: AdvancedFilter = { field: 'title', operator: 'contains', value: 'Story' };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(1);
    });

    it('should filter by contains case-insensitive', () => {
      const filter: AdvancedFilter = { field: 'title', operator: 'contains', value: 'story' };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(1);
    });

    it('should filter by contains case-sensitive', () => {
      const filter: AdvancedFilter = {
        field: 'title',
        operator: 'contains',
        value: 'story',
        caseSensitive: true,
      };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(0);
    });

    it('should filter by startsWith', () => {
      const filter: AdvancedFilter = { field: 'title', operator: 'startsWith', value: 'Fox' };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(1);
    });

    it('should filter by endsWith', () => {
      const filter: AdvancedFilter = { field: 'title', operator: 'endsWith', value: 'Tale' };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(1);
    });
  });

  describe('Filter Processor - Array Operators', () => {
    it('should filter by in', () => {
      const filter: AdvancedFilter = { field: 'author', operator: 'in', value: ['John', 'Bob'] };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(2);
    });

    it('should filter by notIn', () => {
      const filter: AdvancedFilter = { field: 'author', operator: 'notIn', value: ['John'] };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(1);
    });
  });

  describe('Filter Processor - Range Operators', () => {
    it('should filter by between', () => {
      const filter: AdvancedFilter = { field: 'rating', operator: 'between', value: [3, 5] };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(3);
    });

    it('should filter by between inclusive', () => {
      const filter: AdvancedFilter = { field: 'rating', operator: 'between', value: [3, 4] };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(2); // Ratings 3 and 4 are both included
    });
  });

  describe('Filter Processor - Regex', () => {
    it('should filter by regex', () => {
      const filter: AdvancedFilter = { field: 'title', operator: 'regex', value: '^Fox' };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(1);
    });

    it('should handle invalid regex', () => {
      const filter: AdvancedFilter = { field: 'title', operator: 'regex', value: '[invalid' };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(0);
    });
  });

  describe('Filter Processor - Existence', () => {
    it('should filter by exists', () => {
      const filter: AdvancedFilter = { field: 'category', operator: 'exists', value: null };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(3);
    });

    it('should filter by notExists', () => {
      const filter: AdvancedFilter = { field: 'nonexistent', operator: 'notExists', value: null };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(3);
    });
  });

  describe('Filter Processor - Built-in Fields', () => {
    it('should filter by id', () => {
      const filter: AdvancedFilter = { field: 'id', operator: 'eq', value: 'doc1' };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(1);
    });

    it('should filter by timestamp', () => {
      const filter: AdvancedFilter = { field: 'timestamp', operator: 'gt', value: 1500 };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(2);
    });

    it('should filter by tokenCount', () => {
      const filter: AdvancedFilter = { field: 'tokenCount', operator: 'eq', value: 3 };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result).toHaveLength(2);
    });
  });

  describe('Filter Groups', () => {
    it('should apply AND logic', () => {
      const group: FilterGroup = {
        logic: 'and',
        filters: [
          { field: 'category', operator: 'eq', value: 'animals' },
          { field: 'author', operator: 'eq', value: 'John' },
        ],
      };
      const result = filterProcessor.filter(sampleDocs, group);
      expect(result).toHaveLength(1);
    });

    it('should apply OR logic', () => {
      const group: FilterGroup = {
        logic: 'or',
        filters: [
          { field: 'category', operator: 'eq', value: 'wildlife' },
          { field: 'author', operator: 'eq', value: 'Jane' },
        ],
      };
      const result = filterProcessor.filter(sampleDocs, group);
      expect(result).toHaveLength(2);
    });

    it('should handle nested groups', () => {
      const group: FilterGroup = {
        logic: 'and',
        filters: [
          { field: 'author', operator: 'eq', value: 'John' },
          {
            logic: 'or',
            filters: [
              { field: 'category', operator: 'eq', value: 'animals' },
              { field: 'category', operator: 'eq', value: 'wildlife' },
            ],
          },
        ],
      };
      const result = filterProcessor.filter(sampleDocs, group);
      expect(result).toHaveLength(2);
    });
  });

  describe('Facet Processor - Terms', () => {
    it('should calculate terms facet', () => {
      const facet: FacetDefinition = { field: 'category', type: 'terms' };
      const result = facetProcessor.calculateFacet(sampleDocs, facet);

      expect(result.type).toBe('terms');
      expect(result.field).toBe('category');
      if (result.type === 'terms') {
        expect(result.buckets.length).toBeGreaterThan(0);
        expect(result.buckets[0].value).toBe('animals');
        expect(result.buckets[0].count).toBe(2);
      }
    });

    it('should limit facet size', () => {
      const facet: FacetDefinition = { field: 'author', type: 'terms', size: 1 };
      const result = facetProcessor.calculateFacet(sampleDocs, facet);

      if (result.type === 'terms') {
        expect(result.buckets.length).toBe(1);
      }
    });

    it('should sort by count descending', () => {
      const facet: FacetDefinition = { field: 'author', type: 'terms' };
      const result = facetProcessor.calculateFacet(sampleDocs, facet);

      if (result.type === 'terms') {
        expect(result.buckets[0].value).toBe('John');
        expect(result.buckets[0].count).toBe(2);
      }
    });
  });

  describe('Facet Processor - Ranges', () => {
    it('should calculate range facet', () => {
      const facet: FacetDefinition = {
        field: 'rating',
        type: 'range',
        ranges: [
          { to: 3, label: 'Low' },
          { from: 3, to: 5, label: 'Medium' },
          { from: 5, label: 'High' },
        ],
      };
      const result = facetProcessor.calculateFacet(sampleDocs, facet);

      expect(result.type).toBe('range');
      if (result.type === 'range') {
        expect(result.buckets).toHaveLength(3);
        const mediumBucket = result.buckets.find((b) => b.label === 'Medium');
        expect(mediumBucket!.count).toBe(2);
      }
    });

    it('should handle timestamp ranges', () => {
      const facet: FacetDefinition = {
        field: 'timestamp',
        type: 'range',
        ranges: [
          { to: 2000, label: 'Old' },
          { from: 2000, label: 'New' },
        ],
      };
      const result = facetProcessor.calculateFacet(sampleDocs, facet);

      if (result.type === 'range') {
        const oldBucket = result.buckets.find((b) => b.label === 'Old');
        const newBucket = result.buckets.find((b) => b.label === 'New');
        expect(oldBucket!.count).toBe(1);
        expect(newBucket!.count).toBe(2);
      }
    });
  });

  describe('Facet Processor - Multiple', () => {
    it('should calculate multiple facets', () => {
      const facets: FacetDefinition[] = [
        { field: 'category', type: 'terms' },
        { field: 'author', type: 'terms' },
      ];
      const results = facetProcessor.calculateFacets(sampleDocs, facets);

      expect(results).toHaveLength(2);
    });
  });

  describe('Aggregation Processor', () => {
    it('should calculate sum', () => {
      const agg: AggregationDefinition = { field: 'rating', type: 'sum' };
      const result = aggregationProcessor.calculateAggregation(sampleDocs, agg);
      expect(result.value).toBe(12);
    });

    it('should calculate avg', () => {
      const agg: AggregationDefinition = { field: 'rating', type: 'avg' };
      const result = aggregationProcessor.calculateAggregation(sampleDocs, agg);
      expect(result.value).toBe(4);
    });

    it('should calculate min', () => {
      const agg: AggregationDefinition = { field: 'rating', type: 'min' };
      const result = aggregationProcessor.calculateAggregation(sampleDocs, agg);
      expect(result.value).toBe(3);
    });

    it('should calculate max', () => {
      const agg: AggregationDefinition = { field: 'rating', type: 'max' };
      const result = aggregationProcessor.calculateAggregation(sampleDocs, agg);
      expect(result.value).toBe(5);
    });

    it('should calculate count', () => {
      const agg: AggregationDefinition = { field: 'rating', type: 'count' };
      const result = aggregationProcessor.calculateAggregation(sampleDocs, agg);
      expect(result.value).toBe(3);
    });

    it('should calculate cardinality', () => {
      const agg: AggregationDefinition = { field: 'rating', type: 'cardinality' };
      const result = aggregationProcessor.calculateAggregation(sampleDocs, agg);
      expect(result.value).toBe(3);
    });

    it('should handle empty documents', () => {
      const agg: AggregationDefinition = { field: 'rating', type: 'avg' };
      const result = aggregationProcessor.calculateAggregation([], agg);
      expect(result.value).toBe(0);
    });

    it('should calculate multiple aggregations', () => {
      const aggs: AggregationDefinition[] = [
        { field: 'rating', type: 'sum' },
        { field: 'rating', type: 'avg' },
      ];
      const results = aggregationProcessor.calculateAggregations(sampleDocs, aggs);
      expect(results).toHaveLength(2);
    });
  });

  describe('Invariants', () => {
    it('INV-FILTER-001: Filtered results must be subset of input', () => {
      const filter: AdvancedFilter = { field: 'category', operator: 'eq', value: 'animals' };
      const result = filterProcessor.filter(sampleDocs, filter);
      expect(result.length).toBeLessThanOrEqual(sampleDocs.length);
      result.forEach((doc) => {
        expect(sampleDocs.some((d) => d.id === doc.id)).toBe(true);
      });
    });

    it('INV-FILTER-002: Empty filter group with AND should return all', () => {
      const group: FilterGroup = { logic: 'and', filters: [] };
      const result = filterProcessor.filter(sampleDocs, group);
      expect(result).toHaveLength(sampleDocs.length);
    });

    it('INV-FILTER-003: Empty filter group with OR should return none', () => {
      const group: FilterGroup = { logic: 'or', filters: [] };
      const result = filterProcessor.filter(sampleDocs, group);
      expect(result).toHaveLength(0);
    });

    it('INV-FACET-001: Terms facet total must equal document count', () => {
      const facet: FacetDefinition = { field: 'category', type: 'terms' };
      const result = facetProcessor.calculateFacet(sampleDocs, facet);
      expect(result.total).toBe(sampleDocs.length);
    });

    it('INV-FACET-002: Terms bucket counts must sum to <= total', () => {
      const facet: FacetDefinition = { field: 'category', type: 'terms' };
      const result = facetProcessor.calculateFacet(sampleDocs, facet);
      if (result.type === 'terms') {
        const sum = result.buckets.reduce((s, b) => s + b.count, 0);
        expect(sum).toBeLessThanOrEqual(result.total);
      }
    });

    it('INV-AGG-001: Count aggregation must match array length', () => {
      const agg: AggregationDefinition = { field: 'rating', type: 'count' };
      const result = aggregationProcessor.calculateAggregation(sampleDocs, agg);
      expect(result.value).toBe(sampleDocs.length);
    });

    it('INV-AGG-002: Min must be <= Max', () => {
      const minResult = aggregationProcessor.calculateAggregation(sampleDocs, {
        field: 'rating',
        type: 'min',
      });
      const maxResult = aggregationProcessor.calculateAggregation(sampleDocs, {
        field: 'rating',
        type: 'max',
      });
      expect(minResult.value).toBeLessThanOrEqual(maxResult.value);
    });
  });
});
