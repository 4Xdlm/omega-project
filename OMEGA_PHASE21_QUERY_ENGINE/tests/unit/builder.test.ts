/**
 * OMEGA Query Engine — Builder Tests
 * Phase 21 — v3.21.0
 */

import { describe, it, expect } from 'vitest';
import {
  query,
  bySubject,
  byPredicate,
  bySubjectAndPredicate,
  bySource,
  highConfidence,
  recent,
  textSearch,
} from '../../src/queries/index.js';
import { Operator, LogicalOperator } from '../../src/types.js';

describe('Query Builder', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC BUILDER
  // ═══════════════════════════════════════════════════════════════════════════

  describe('query()', () => {
    it('creates empty builder', () => {
      const { query: q } = query().build();
      expect(q.conditions).toHaveLength(0);
      expect(q.logic).toBe(LogicalOperator.AND);
    });

    it('adds single condition', () => {
      const { query: q } = query()
        .where('subject', Operator.EQUALS, 'Jean')
        .build();

      expect(q.conditions).toHaveLength(1);
      expect(q.conditions[0]).toEqual({
        field: 'subject',
        operator: Operator.EQUALS,
        value: 'Jean',
        value2: undefined,
      });
    });

    it('adds multiple conditions', () => {
      const { query: q } = query()
        .where('subject', Operator.EQUALS, 'Jean')
        .and()
        .where('predicate', Operator.EQUALS, 'age')
        .build();

      expect(q.conditions).toHaveLength(2);
      expect(q.logic).toBe(LogicalOperator.AND);
    });

    it('supports OR logic', () => {
      const { query: q } = query()
        .where('subject', Operator.EQUALS, 'Jean')
        .or()
        .where('subject', Operator.EQUALS, 'Marie')
        .build();

      expect(q.logic).toBe(LogicalOperator.OR);
    });

    it('supports BETWEEN with value2', () => {
      const { query: q } = query()
        .where('confidence', Operator.BETWEEN, 0.5, 1.0)
        .build();

      expect(q.conditions[0]?.value).toBe(0.5);
      expect(q.conditions[0]?.value2).toBe(1.0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Options', () => {
    it('sets orderBy', () => {
      const { options } = query()
        .orderBy('createdAt', 'DESC')
        .build();

      expect(options.orderBy).toBe('createdAt');
      expect(options.orderDirection).toBe('DESC');
    });

    it('default orderDirection is ASC', () => {
      const { options } = query()
        .orderBy('subject')
        .build();

      expect(options.orderDirection).toBe('ASC');
    });

    it('sets limit', () => {
      const { options } = query()
        .limit(10)
        .build();

      expect(options.limit).toBe(10);
    });

    it('sets offset', () => {
      const { options } = query()
        .offset(20)
        .build();

      expect(options.offset).toBe(20);
    });

    it('combines all options', () => {
      const { options } = query()
        .where('subject', Operator.EQUALS, 'Jean')
        .orderBy('createdAt', 'DESC')
        .limit(10)
        .offset(5)
        .build();

      expect(options.orderBy).toBe('createdAt');
      expect(options.orderDirection).toBe('DESC');
      expect(options.limit).toBe(10);
      expect(options.offset).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════

  describe('reset()', () => {
    it('clears conditions and options', () => {
      const builder = query()
        .where('subject', Operator.EQUALS, 'Jean')
        .orderBy('createdAt')
        .limit(10);

      builder.reset();

      const { query: q, options } = builder.build();
      expect(q.conditions).toHaveLength(0);
      expect(options.limit).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SHORTHAND BUILDERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('bySubject()', () => {
    it('creates subject query', () => {
      const { query: q } = bySubject('Jean');

      expect(q.conditions).toHaveLength(1);
      expect(q.conditions[0]?.field).toBe('subject');
      expect(q.conditions[0]?.operator).toBe(Operator.EQUALS);
      expect(q.conditions[0]?.value).toBe('Jean');
    });
  });

  describe('byPredicate()', () => {
    it('creates predicate query', () => {
      const { query: q } = byPredicate('age');

      expect(q.conditions).toHaveLength(1);
      expect(q.conditions[0]?.field).toBe('predicate');
      expect(q.conditions[0]?.value).toBe('age');
    });
  });

  describe('bySubjectAndPredicate()', () => {
    it('creates combined query', () => {
      const { query: q } = bySubjectAndPredicate('Jean', 'age');

      expect(q.conditions).toHaveLength(2);
      expect(q.conditions[0]?.field).toBe('subject');
      expect(q.conditions[1]?.field).toBe('predicate');
    });
  });

  describe('bySource()', () => {
    it('creates source query', () => {
      const { query: q } = bySource('user-input');

      expect(q.conditions).toHaveLength(1);
      expect(q.conditions[0]?.field).toBe('source');
      expect(q.conditions[0]?.value).toBe('user-input');
    });
  });

  describe('highConfidence()', () => {
    it('creates confidence query with default threshold', () => {
      const { query: q, options } = highConfidence();

      expect(q.conditions).toHaveLength(1);
      expect(q.conditions[0]?.field).toBe('confidence');
      expect(q.conditions[0]?.operator).toBe(Operator.GREATER_EQUAL);
      expect(q.conditions[0]?.value).toBe(0.8);
      expect(options.orderBy).toBe('confidence');
      expect(options.orderDirection).toBe('DESC');
    });

    it('accepts custom threshold', () => {
      const { query: q } = highConfidence(0.95);
      expect(q.conditions[0]?.value).toBe(0.95);
    });
  });

  describe('recent()', () => {
    it('creates recent query with default limit', () => {
      const { options } = recent();

      expect(options.orderBy).toBe('createdAt');
      expect(options.orderDirection).toBe('DESC');
      expect(options.limit).toBe(10);
    });

    it('accepts custom limit', () => {
      const { options } = recent(5);
      expect(options.limit).toBe(5);
    });
  });

  describe('textSearch()', () => {
    it('creates OR query across fields', () => {
      const { query: q } = textSearch('Jean');

      expect(q.conditions).toHaveLength(3);
      expect(q.logic).toBe(LogicalOperator.OR);
      expect(q.conditions.map(c => c.field)).toEqual(['subject', 'predicate', 'value']);
      expect(q.conditions.every(c => c.operator === Operator.CONTAINS)).toBe(true);
    });
  });
});
