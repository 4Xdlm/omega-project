/**
 * OMEGA Query Engine — Integration Tests
 * Phase 21 — v3.21.0
 * 
 * End-to-end tests proving invariants.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createQueryEngine,
  query,
  Operator,
  LogicalOperator,
  type CanonFact,
  type FactProvider,
  type QueryEngine,
} from '../../src/index.js';

// Comprehensive test dataset
const createComprehensiveData = (): CanonFact[] => {
  const facts: CanonFact[] = [];
  const subjects = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Lucas'];
  const predicates = ['name', 'age', 'city', 'job', 'email'];
  const sources = ['user-input', 'inference', 'external', 'system'];

  let id = 1;
  for (const subject of subjects) {
    for (const predicate of predicates) {
      facts.push({
        id: `fact_${id}`,
        subject,
        predicate,
        value: `${subject}_${predicate}_value`,
        confidence: 0.5 + Math.random() * 0.5,
        source: sources[id % sources.length]!,
        createdAt: new Date(2026, 0, id).toISOString(),
        hash: `hash_${id}`,
      });
      id++;
    }
  }
  return facts;
};

class TestProvider implements FactProvider {
  constructor(private facts: CanonFact[]) {}
  getAllFacts(): readonly CanonFact[] {
    return this.facts;
  }
}

describe('Integration', () => {
  let facts: CanonFact[];
  let provider: TestProvider;
  let engine: QueryEngine;

  beforeEach(() => {
    facts = createComprehensiveData();
    provider = new TestProvider(facts);
    engine = createQueryEngine(provider);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-QUERY-01: Pure functions (no mutations)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-QUERY-01: Pure functions', () => {
    it('execute does not mutate original facts', () => {
      const originalLength = facts.length;
      const originalFirstId = facts[0]?.id;

      const { query: q } = query()
        .where('subject', Operator.EQUALS, 'Jean')
        .limit(1)
        .build();

      engine.execute(q);

      expect(facts.length).toBe(originalLength);
      expect(facts[0]?.id).toBe(originalFirstId);
    });

    it('aggregate does not mutate original facts', () => {
      const originalLength = facts.length;

      engine.aggregate();

      expect(facts.length).toBe(originalLength);
    });

    it('multiple queries return independent results', () => {
      const result1 = engine.findBySubject('Jean');
      const result2 = engine.findBySubject('Jean');

      expect(result1).not.toBe(result2); // Different array references
      expect(result1).toEqual(result2);   // Same content
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-QUERY-03: Query execution is deterministic
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-QUERY-03: Deterministic execution', () => {
    it('same query produces same results', () => {
      const { query: q, options } = query()
        .where('subject', Operator.EQUALS, 'Jean')
        .orderBy('predicate')
        .build();

      const result1 = engine.execute(q, options);
      const result2 = engine.execute(q, options);

      expect(result1.facts).toEqual(result2.facts);
      expect(result1.total).toBe(result2.total);
    });

    it('100 executions produce identical results', () => {
      const { query: q } = query()
        .where('confidence', Operator.GREATER_THAN, 0.7)
        .build();

      const firstResult = engine.execute(q);

      for (let i = 0; i < 100; i++) {
        const result = engine.execute(q);
        expect(result.total).toBe(firstResult.total);
        expect(result.facts.map(f => f.id)).toEqual(firstResult.facts.map(f => f.id));
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-QUERY-04: Empty results are valid
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-QUERY-04: Empty results are valid', () => {
    it('returns empty array for no matches', () => {
      const { query: q } = query()
        .where('subject', Operator.EQUALS, 'NonExistent')
        .build();

      const result = engine.execute(q);

      expect(result.facts).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.returned).toBe(0);
    });

    it('aggregate handles empty results', () => {
      const { query: q } = query()
        .where('subject', Operator.EQUALS, 'NonExistent')
        .build();

      const agg = engine.aggregate(q);

      expect(agg.count).toBe(0);
      expect(agg.avgConfidence).toBe(0);
      expect(agg.newest).toBeUndefined();
    });

    it('search returns empty for no matches', () => {
      const results = engine.search('xyznonexistent123');
      expect(results).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLEX QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Complex queries', () => {
    it('combines multiple conditions with AND', () => {
      const { query: q } = query()
        .where('subject', Operator.EQUALS, 'Jean')
        .and()
        .where('predicate', Operator.EQUALS, 'age')
        .and()
        .where('confidence', Operator.GREATER_THAN, 0.5)
        .build();

      const result = engine.execute(q);

      expect(result.facts.every(f => 
        f.subject === 'Jean' && 
        f.predicate === 'age' && 
        f.confidence > 0.5
      )).toBe(true);
    });

    it('pagination works correctly', () => {
      const totalResult = engine.execute({ conditions: [], logic: LogicalOperator.AND });
      const total = totalResult.total;

      // Get all pages
      const pageSize = 5;
      const allFacts: CanonFact[] = [];

      for (let offset = 0; offset < total; offset += pageSize) {
        const { query: q, options } = query()
          .orderBy('id')
          .limit(pageSize)
          .offset(offset)
          .build();

        const result = engine.execute(q, options);
        allFacts.push(...result.facts);
      }

      expect(allFacts.length).toBe(total);
      // All IDs should be unique
      const ids = new Set(allFacts.map(f => f.id));
      expect(ids.size).toBe(total);
    });

    it('ordering is stable', () => {
      const { query: q, options } = query()
        .orderBy('confidence', 'DESC')
        .build();

      const result = engine.execute(q, options);

      for (let i = 1; i < result.facts.length; i++) {
        expect(result.facts[i - 1]!.confidence).toBeGreaterThanOrEqual(
          result.facts[i]!.confidence
        );
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Performance', () => {
    it('handles 1000 facts efficiently', () => {
      // Create large dataset
      const largeFacts: CanonFact[] = [];
      for (let i = 0; i < 1000; i++) {
        largeFacts.push({
          id: `fact_${i}`,
          subject: `Subject${i % 100}`,
          predicate: `Predicate${i % 10}`,
          value: `Value${i}`,
          confidence: Math.random(),
          source: 'bulk',
          createdAt: new Date().toISOString(),
          hash: `hash_${i}`,
        });
      }

      const largeProvider = new TestProvider(largeFacts);
      const largeEngine = createQueryEngine(largeProvider);

      const { query: q, options } = query()
        .where('subject', Operator.STARTS_WITH, 'Subject1')
        .orderBy('confidence', 'DESC')
        .limit(10)
        .build();

      const result = largeEngine.execute(q, options);

      expect(result.executionTime).toBeLessThan(100); // Should be fast
      expect(result.returned).toBe(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL WORLD SCENARIOS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Real world scenarios', () => {
    it('user profile lookup', () => {
      const facts = engine.findBySubject('Jean');
      const profile: Record<string, string> = {};

      for (const fact of facts) {
        profile[fact.predicate] = fact.value;
      }

      expect(profile['name']).toBeDefined();
      expect(profile['age']).toBeDefined();
    });

    it('high confidence facts for decision making', () => {
      const { query: q, options } = query()
        .where('confidence', Operator.GREATER_EQUAL, 0.9)
        .orderBy('confidence', 'DESC')
        .build();

      const result = engine.execute(q, options);

      expect(result.facts.every(f => f.confidence >= 0.9)).toBe(true);
    });

    it('source audit', () => {
      const agg = engine.aggregate();
      
      expect(agg.sources.length).toBeGreaterThan(0);

      for (const source of agg.sources) {
        const sourceFacts = engine.findBySource(source);
        expect(sourceFacts.length).toBeGreaterThan(0);
      }
    });

    it('knowledge summary for UI', () => {
      const summary = engine.summary();

      expect(summary.totalFacts).toBe(25); // 5 subjects × 5 predicates
      expect(summary.subjects).toBe(5);
      expect(summary.predicates).toBe(5);
    });
  });
});
