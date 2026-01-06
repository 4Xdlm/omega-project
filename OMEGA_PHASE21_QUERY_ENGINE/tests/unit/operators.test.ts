/**
 * OMEGA Query Engine — Operators Tests
 * Phase 21 — v3.21.0
 */

import { describe, it, expect } from 'vitest';
import { applyOperator, getFieldValue, operators } from '../../src/operators/index.js';
import { Operator, type CanonFact } from '../../src/types.js';

const sampleFact: CanonFact = {
  id: 'fact_1',
  subject: 'Jean',
  predicate: 'age',
  value: '35',
  confidence: 0.95,
  source: 'user-input',
  createdAt: '2026-01-06T00:00:00Z',
  hash: 'abc123',
};

describe('Operators', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // FIELD ACCESSOR
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getFieldValue()', () => {
    it('gets subject', () => {
      expect(getFieldValue(sampleFact, 'subject')).toBe('Jean');
    });

    it('gets predicate', () => {
      expect(getFieldValue(sampleFact, 'predicate')).toBe('age');
    });

    it('gets value', () => {
      expect(getFieldValue(sampleFact, 'value')).toBe('35');
    });

    it('gets confidence', () => {
      expect(getFieldValue(sampleFact, 'confidence')).toBe(0.95);
    });

    it('gets source', () => {
      expect(getFieldValue(sampleFact, 'source')).toBe('user-input');
    });

    it('gets createdAt', () => {
      expect(getFieldValue(sampleFact, 'createdAt')).toBe('2026-01-06T00:00:00Z');
    });

    it('gets id', () => {
      expect(getFieldValue(sampleFact, 'id')).toBe('fact_1');
    });

    it('gets hash', () => {
      expect(getFieldValue(sampleFact, 'hash')).toBe('abc123');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STRING OPERATORS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('String operators', () => {
    describe('EQUALS', () => {
      it('matches exact (case insensitive)', () => {
        expect(applyOperator(Operator.EQUALS, 'Jean', 'jean')).toBe(true);
        expect(applyOperator(Operator.EQUALS, 'Jean', 'JEAN')).toBe(true);
      });

      it('rejects non-match', () => {
        expect(applyOperator(Operator.EQUALS, 'Jean', 'Marie')).toBe(false);
      });

      it('handles null', () => {
        expect(applyOperator(Operator.EQUALS, null, 'test')).toBe(false);
      });
    });

    describe('NOT_EQUALS', () => {
      it('rejects match', () => {
        expect(applyOperator(Operator.NOT_EQUALS, 'Jean', 'jean')).toBe(false);
      });

      it('accepts non-match', () => {
        expect(applyOperator(Operator.NOT_EQUALS, 'Jean', 'Marie')).toBe(true);
      });
    });

    describe('CONTAINS', () => {
      it('finds substring', () => {
        expect(applyOperator(Operator.CONTAINS, 'Jean Dupont', 'Dupont')).toBe(true);
        expect(applyOperator(Operator.CONTAINS, 'Jean Dupont', 'dupont')).toBe(true);
      });

      it('rejects missing substring', () => {
        expect(applyOperator(Operator.CONTAINS, 'Jean', 'Marie')).toBe(false);
      });
    });

    describe('NOT_CONTAINS', () => {
      it('rejects if contains', () => {
        expect(applyOperator(Operator.NOT_CONTAINS, 'Jean Dupont', 'Dupont')).toBe(false);
      });

      it('accepts if not contains', () => {
        expect(applyOperator(Operator.NOT_CONTAINS, 'Jean', 'Marie')).toBe(true);
      });
    });

    describe('STARTS_WITH', () => {
      it('matches prefix', () => {
        expect(applyOperator(Operator.STARTS_WITH, 'Jean Dupont', 'Jean')).toBe(true);
        expect(applyOperator(Operator.STARTS_WITH, 'Jean Dupont', 'jean')).toBe(true);
      });

      it('rejects non-prefix', () => {
        expect(applyOperator(Operator.STARTS_WITH, 'Jean', 'Marie')).toBe(false);
      });
    });

    describe('ENDS_WITH', () => {
      it('matches suffix', () => {
        expect(applyOperator(Operator.ENDS_WITH, 'Jean Dupont', 'Dupont')).toBe(true);
        expect(applyOperator(Operator.ENDS_WITH, 'Jean Dupont', 'dupont')).toBe(true);
      });

      it('rejects non-suffix', () => {
        expect(applyOperator(Operator.ENDS_WITH, 'Jean', 'Marie')).toBe(false);
      });
    });

    describe('MATCHES', () => {
      it('matches regex pattern', () => {
        expect(applyOperator(Operator.MATCHES, 'Jean123', /\d+/)).toBe(true);
        expect(applyOperator(Operator.MATCHES, 'Jean123', '\\d+')).toBe(true);
      });

      it('rejects non-match', () => {
        expect(applyOperator(Operator.MATCHES, 'Jean', /\d+/)).toBe(false);
      });

      it('handles invalid regex', () => {
        expect(applyOperator(Operator.MATCHES, 'Jean', '[invalid')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NUMERIC OPERATORS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Numeric operators', () => {
    describe('GREATER_THAN', () => {
      it('compares numbers', () => {
        expect(applyOperator(Operator.GREATER_THAN, 10, 5)).toBe(true);
        expect(applyOperator(Operator.GREATER_THAN, 5, 10)).toBe(false);
        expect(applyOperator(Operator.GREATER_THAN, 5, 5)).toBe(false);
      });

      it('parses strings', () => {
        expect(applyOperator(Operator.GREATER_THAN, '10', '5')).toBe(true);
      });
    });

    describe('GREATER_EQUAL', () => {
      it('compares numbers', () => {
        expect(applyOperator(Operator.GREATER_EQUAL, 10, 5)).toBe(true);
        expect(applyOperator(Operator.GREATER_EQUAL, 5, 5)).toBe(true);
        expect(applyOperator(Operator.GREATER_EQUAL, 4, 5)).toBe(false);
      });
    });

    describe('LESS_THAN', () => {
      it('compares numbers', () => {
        expect(applyOperator(Operator.LESS_THAN, 5, 10)).toBe(true);
        expect(applyOperator(Operator.LESS_THAN, 10, 5)).toBe(false);
        expect(applyOperator(Operator.LESS_THAN, 5, 5)).toBe(false);
      });
    });

    describe('LESS_EQUAL', () => {
      it('compares numbers', () => {
        expect(applyOperator(Operator.LESS_EQUAL, 5, 10)).toBe(true);
        expect(applyOperator(Operator.LESS_EQUAL, 5, 5)).toBe(true);
        expect(applyOperator(Operator.LESS_EQUAL, 6, 5)).toBe(false);
      });
    });

    describe('BETWEEN', () => {
      it('checks range inclusive', () => {
        expect(applyOperator(Operator.BETWEEN, 5, 1, 10)).toBe(true);
        expect(applyOperator(Operator.BETWEEN, 1, 1, 10)).toBe(true);
        expect(applyOperator(Operator.BETWEEN, 10, 1, 10)).toBe(true);
        expect(applyOperator(Operator.BETWEEN, 0, 1, 10)).toBe(false);
        expect(applyOperator(Operator.BETWEEN, 11, 1, 10)).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXISTENCE OPERATORS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Existence operators', () => {
    describe('EXISTS', () => {
      it('returns true for non-empty values', () => {
        expect(applyOperator(Operator.EXISTS, 'value', null)).toBe(true);
        expect(applyOperator(Operator.EXISTS, 123, null)).toBe(true);
      });

      it('returns false for empty values', () => {
        expect(applyOperator(Operator.EXISTS, null, null)).toBe(false);
        expect(applyOperator(Operator.EXISTS, undefined, null)).toBe(false);
        expect(applyOperator(Operator.EXISTS, '', null)).toBe(false);
        expect(applyOperator(Operator.EXISTS, '   ', null)).toBe(false);
      });
    });

    describe('NOT_EXISTS', () => {
      it('returns false for non-empty values', () => {
        expect(applyOperator(Operator.NOT_EXISTS, 'value', null)).toBe(false);
      });

      it('returns true for empty values', () => {
        expect(applyOperator(Operator.NOT_EXISTS, null, null)).toBe(true);
        expect(applyOperator(Operator.NOT_EXISTS, '', null)).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST OPERATORS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('List operators', () => {
    describe('IN', () => {
      it('finds value in list', () => {
        expect(applyOperator(Operator.IN, 'apple', ['apple', 'banana', 'cherry'])).toBe(true);
        expect(applyOperator(Operator.IN, 'APPLE', ['apple', 'banana'])).toBe(true);
      });

      it('rejects missing value', () => {
        expect(applyOperator(Operator.IN, 'grape', ['apple', 'banana'])).toBe(false);
      });

      it('handles non-array', () => {
        expect(applyOperator(Operator.IN, 'apple', 'not-array')).toBe(false);
      });
    });

    describe('NOT_IN', () => {
      it('rejects value in list', () => {
        expect(applyOperator(Operator.NOT_IN, 'apple', ['apple', 'banana'])).toBe(false);
      });

      it('accepts missing value', () => {
        expect(applyOperator(Operator.NOT_IN, 'grape', ['apple', 'banana'])).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DIRECT OPERATORS EXPORT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('operators export', () => {
    it('exports all operator functions', () => {
      expect(operators.stringEquals).toBeDefined();
      expect(operators.stringContains).toBeDefined();
      expect(operators.greaterThan).toBeDefined();
      expect(operators.between).toBeDefined();
      expect(operators.exists).toBeDefined();
      expect(operators.inList).toBeDefined();
    });
  });
});
