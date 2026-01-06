/**
 * OMEGA Query Engine — Engine Tests
 * Phase 21 — v3.21.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QueryEngine, createQueryEngine, type FactProvider } from '../../src/query-engine.js';
import { query, bySubject, byPredicate, textSearch } from '../../src/queries/index.js';
import { Operator, LogicalOperator, type CanonFact } from '../../src/types.js';

// Test data
const createTestFacts = (): CanonFact[] => [
  {
    id: 'fact_1',
    subject: 'Jean',
    predicate: 'name',
    value: 'Jean Dupont',
    confidence: 0.95,
    source: 'user-input',
    createdAt: '2026-01-01T00:00:00Z',
    hash: 'hash1',
  },
  {
    id: 'fact_2',
    subject: 'Jean',
    predicate: 'age',
    value: '35',
    confidence: 0.90,
    source: 'user-input',
    createdAt: '2026-01-02T00:00:00Z',
    hash: 'hash2',
  },
  {
    id: 'fact_3',
    subject: 'Jean',
    predicate: 'city',
    value: 'Paris',
    confidence: 0.75,
    source: 'inference',
    createdAt: '2026-01-03T00:00:00Z',
    hash: 'hash3',
  },
  {
    id: 'fact_4',
    subject: 'Marie',
    predicate: 'name',
    value: 'Marie Martin',
    confidence: 0.98,
    source: 'user-input',
    createdAt: '2026-01-04T00:00:00Z',
    hash: 'hash4',
  },
  {
    id: 'fact_5',
    subject: 'Marie',
    predicate: 'age',
    value: '28',
    confidence: 0.85,
    source: 'user-input',
    createdAt: '2026-01-05T00:00:00Z',
    hash: 'hash5',
  },
];

class TestFactProvider implements FactProvider {
  private facts: CanonFact[];

  constructor(facts: CanonFact[] = createTestFacts()) {
    this.facts = facts;
  }

  getAllFacts(): readonly CanonFact[] {
    return this.facts;
  }
}

describe('QueryEngine', () => {
  let engine: QueryEngine;
  let provider: TestFactProvider;

  beforeEach(() => {
    provider = new TestFactProvider();
    engine = createQueryEngine(provider);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('execute()', () => {
    it('returns all facts with empty query', () => {
      const { query: q } = query().build();
      const result = engine.execute(q);

      expect(result.facts).toHaveLength(5);
      expect(result.total).toBe(5);
      expect(result.returned).toBe(5);
    });

    it('filters by subject', () => {
      const { query: q } = bySubject('Jean');
      const result = engine.execute(q);

      expect(result.facts).toHaveLength(3);
      expect(result.facts.every(f => f.subject === 'Jean')).toBe(true);
    });

    it('filters by predicate', () => {
      const { query: q } = byPredicate('age');
      const result = engine.execute(q);

      expect(result.facts).toHaveLength(2);
    });

    it('filters with AND logic', () => {
      const { query: q } = query()
        .where('subject', Operator.EQUALS, 'Jean')
        .and()
        .where('predicate', Operator.EQUALS, 'age')
        .build();

      const result = engine.execute(q);

      expect(result.facts).toHaveLength(1);
      expect(result.facts[0]?.value).toBe('35');
    });

    it('filters with OR logic', () => {
      const { query: q } = query()
        .where('subject', Operator.EQUALS, 'Jean')
        .or()
        .where('subject', Operator.EQUALS, 'Marie')
        .build();

      const result = engine.execute(q);

      expect(result.facts).toHaveLength(5);
    });

    it('applies limit', () => {
      const { query: q, options } = query().limit(2).build();
      const result = engine.execute(q, options);

      expect(result.returned).toBe(2);
      expect(result.total).toBe(5);
    });

    it('applies offset', () => {
      const { query: q, options } = query().offset(3).build();
      const result = engine.execute(q, options);

      expect(result.returned).toBe(2);
      expect(result.total).toBe(5);
    });

    it('applies ordering ASC', () => {
      const { query: q, options } = query().orderBy('subject', 'ASC').build();
      const result = engine.execute(q, options);

      expect(result.facts[0]?.subject).toBe('Jean');
    });

    it('applies ordering DESC', () => {
      const { query: q, options } = query().orderBy('subject', 'DESC').build();
      const result = engine.execute(q, options);

      expect(result.facts[0]?.subject).toBe('Marie');
    });

    it('tracks execution time', () => {
      const { query: q } = query().build();
      const result = engine.execute(q);

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AGGREGATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('aggregate()', () => {
    it('returns aggregate stats for all facts', () => {
      const result = engine.aggregate();

      expect(result.count).toBe(5);
      expect(result.subjects).toContain('Jean');
      expect(result.subjects).toContain('Marie');
      expect(result.predicates).toContain('name');
      expect(result.predicates).toContain('age');
      expect(result.sources).toContain('user-input');
      expect(result.sources).toContain('inference');
    });

    it('calculates confidence stats', () => {
      const result = engine.aggregate();

      expect(result.minConfidence).toBe(0.75);
      expect(result.maxConfidence).toBe(0.98);
      expect(result.avgConfidence).toBeCloseTo(0.886, 2);
    });

    it('finds newest and oldest', () => {
      const result = engine.aggregate();

      expect(result.newest?.id).toBe('fact_5');
      expect(result.oldest?.id).toBe('fact_1');
    });

    it('finds highest confidence', () => {
      const result = engine.aggregate();

      expect(result.highestConfidence?.confidence).toBe(0.98);
    });

    it('aggregates filtered results', () => {
      const { query: q } = bySubject('Jean');
      const result = engine.aggregate(q);

      expect(result.count).toBe(3);
      expect(result.subjects).toHaveLength(1);
      expect(result.subjects[0]).toBe('Jean');
    });

    it('handles empty results', () => {
      const { query: q } = query()
        .where('subject', Operator.EQUALS, 'NonExistent')
        .build();

      const result = engine.aggregate(q);

      expect(result.count).toBe(0);
      expect(result.subjects).toHaveLength(0);
      expect(result.avgConfidence).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVENIENCE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findBySubject()', () => {
    it('finds all facts for subject', () => {
      const facts = engine.findBySubject('Jean');
      expect(facts).toHaveLength(3);
    });

    it('is case insensitive', () => {
      const facts = engine.findBySubject('JEAN');
      expect(facts).toHaveLength(3);
    });

    it('returns empty for unknown subject', () => {
      const facts = engine.findBySubject('Unknown');
      expect(facts).toHaveLength(0);
    });
  });

  describe('findByPredicate()', () => {
    it('finds all facts for predicate', () => {
      const facts = engine.findByPredicate('name');
      expect(facts).toHaveLength(2);
    });
  });

  describe('findBySubjectAndPredicate()', () => {
    it('finds specific fact', () => {
      const fact = engine.findBySubjectAndPredicate('Jean', 'age');

      expect(fact).toBeDefined();
      expect(fact?.value).toBe('35');
    });

    it('returns undefined for no match', () => {
      const fact = engine.findBySubjectAndPredicate('Jean', 'salary');
      expect(fact).toBeUndefined();
    });
  });

  describe('findBySource()', () => {
    it('finds facts by source', () => {
      const facts = engine.findBySource('inference');
      expect(facts).toHaveLength(1);
      expect(facts[0]?.predicate).toBe('city');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('search()', () => {
    it('searches across fields', () => {
      const facts = engine.search('Paris');
      expect(facts).toHaveLength(1);
      expect(facts[0]?.value).toBe('Paris');
    });

    it('searches subject', () => {
      const facts = engine.search('Jean');
      expect(facts.length).toBeGreaterThan(0);
    });

    it('is case insensitive', () => {
      const facts = engine.search('PARIS');
      expect(facts).toHaveLength(1);
    });

    it('returns empty for no match', () => {
      const facts = engine.search('xyz123');
      expect(facts).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ASK (Natural Language)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('ask()', () => {
    it('answers "what is X\'s Y"', () => {
      const result = engine.ask("what is Jean's age");

      expect(result.facts).toHaveLength(1);
      expect(result.facts[0]?.value).toBe('35');
    });

    it('answers "what is the Y of X"', () => {
      const result = engine.ask("what is the age of Jean");

      expect(result.facts).toHaveLength(1);
      expect(result.facts[0]?.value).toBe('35');
    });

    it('answers "tell me about X"', () => {
      const result = engine.ask("tell me about Jean");

      expect(result.facts).toHaveLength(3);
    });

    it('answers "who is X"', () => {
      const result = engine.ask("who is Marie");

      expect(result.facts).toHaveLength(2);
    });

    it('falls back to search for unknown patterns', () => {
      const result = engine.ask("something about Paris");

      expect(result.facts).toHaveLength(1);
    });

    it('handles empty question', () => {
      const result = engine.ask("");

      expect(result.facts).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('summary()', () => {
    it('returns knowledge summary', () => {
      const summary = engine.summary();

      expect(summary.totalFacts).toBe(5);
      expect(summary.subjects).toBe(2);
      expect(summary.predicates).toBe(3);
      expect(summary.sources).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createQueryEngine()', () => {
    it('creates engine', () => {
      const engine = createQueryEngine(provider);
      expect(engine).toBeInstanceOf(QueryEngine);
    });

    it('accepts config', () => {
      const engine = createQueryEngine(provider, { caseInsensitive: false });
      expect(engine).toBeInstanceOf(QueryEngine);
    });
  });
});
