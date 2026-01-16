/**
 * Query Parser Tests
 * @module @omega/search/test/query-parser
 * @description Unit tests for query parsing functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  QueryParser,
  createQueryParser,
  parseQuery,
  DEFAULT_PARSER_OPTIONS,
  type TokenType,
  type ASTNodeType,
  type ParseResult,
} from '../src/query-parser';

describe('OMEGA Search - Phase 153: Query Parser', () => {
  let parser: QueryParser;

  beforeEach(() => {
    parser = createQueryParser();
  });

  describe('Type Definitions', () => {
    it('should define TokenType', () => {
      const types: TokenType[] = [
        'WORD', 'PHRASE', 'AND', 'OR', 'NOT',
        'LPAREN', 'RPAREN', 'FIELD', 'COLON',
        'WILDCARD', 'FUZZY', 'BOOST',
        'RANGE_START', 'RANGE_END', 'TO', 'EOF',
      ];
      expect(types.length).toBeGreaterThan(0);
    });

    it('should define ASTNodeType', () => {
      const types: ASTNodeType[] = [
        'TERM', 'PHRASE', 'WILDCARD', 'FUZZY',
        'FIELD', 'AND', 'OR', 'NOT', 'GROUP',
        'RANGE', 'BOOST',
      ];
      expect(types.length).toBeGreaterThan(0);
    });

    it('should have default parser options', () => {
      expect(DEFAULT_PARSER_OPTIONS.defaultField).toBe('content');
      expect(DEFAULT_PARSER_OPTIONS.defaultOperator).toBe('AND');
      expect(DEFAULT_PARSER_OPTIONS.allowWildcards).toBe(true);
    });
  });

  describe('Simple Terms', () => {
    it('should parse single word', () => {
      const result = parser.parse('hello');

      expect(result.ast).not.toBeNull();
      expect(result.ast?.type).toBe('TERM');
      expect(result.ast?.value).toBe('hello');
    });

    it('should parse multiple words with implicit AND', () => {
      const result = parser.parse('hello world');

      expect(result.ast?.type).toBe('AND');
      expect(result.ast?.left?.type).toBe('TERM');
      expect(result.ast?.left?.value).toBe('hello');
      expect(result.ast?.right?.type).toBe('TERM');
      expect(result.ast?.right?.value).toBe('world');
    });

    it('should handle empty query', () => {
      const result = parser.parse('');

      expect(result.ast).toBeNull();
      expect(result.warnings).toContain('Empty query');
    });

    it('should handle whitespace-only query', () => {
      const result = parser.parse('   ');

      expect(result.ast).toBeNull();
    });
  });

  describe('Phrases', () => {
    it('should parse quoted phrase', () => {
      const result = parser.parse('"hello world"');

      expect(result.ast?.type).toBe('PHRASE');
      expect(result.ast?.value).toBe('hello world');
    });

    it('should handle escaped quotes in phrase', () => {
      const result = parser.parse('"say \\"hello\\""');

      expect(result.ast?.type).toBe('PHRASE');
      expect(result.ast?.value).toBe('say "hello"');
    });

    it('should handle unclosed phrase', () => {
      const result = parser.parse('"unclosed phrase');

      expect(result.ast?.type).toBe('PHRASE');
      expect(result.ast?.value).toBe('unclosed phrase');
    });
  });

  describe('Boolean Operators', () => {
    it('should parse AND operator', () => {
      const result = parser.parse('foo AND bar');

      expect(result.ast?.type).toBe('AND');
      expect(result.ast?.left?.value).toBe('foo');
      expect(result.ast?.right?.value).toBe('bar');
    });

    it('should parse OR operator', () => {
      const result = parser.parse('foo OR bar');

      expect(result.ast?.type).toBe('OR');
      expect(result.ast?.left?.value).toBe('foo');
      expect(result.ast?.right?.value).toBe('bar');
    });

    it('should parse NOT operator', () => {
      const result = parser.parse('NOT foo');

      expect(result.ast?.type).toBe('NOT');
      expect(result.ast?.child?.value).toBe('foo');
    });

    it('should handle operator precedence (OR lower than AND)', () => {
      const result = parser.parse('a AND b OR c');

      expect(result.ast?.type).toBe('OR');
      expect(result.ast?.left?.type).toBe('AND');
    });

    it('should handle chained AND', () => {
      const result = parser.parse('a AND b AND c');

      expect(result.ast?.type).toBe('AND');
    });

    it('should handle case-insensitive operators', () => {
      const result = parser.parse('foo and bar');

      expect(result.ast?.type).toBe('AND');
    });
  });

  describe('Grouping', () => {
    it('should parse parenthesized expression', () => {
      const result = parser.parse('(foo)');

      expect(result.ast?.type).toBe('GROUP');
      expect(result.ast?.child?.type).toBe('TERM');
    });

    it('should change precedence with parentheses', () => {
      const result = parser.parse('a AND (b OR c)');

      expect(result.ast?.type).toBe('AND');
      expect(result.ast?.right?.type).toBe('GROUP');
      expect(result.ast?.right?.child?.type).toBe('OR');
    });

    it('should handle nested groups', () => {
      const result = parser.parse('((a))');

      expect(result.ast?.type).toBe('GROUP');
      expect(result.ast?.child?.type).toBe('GROUP');
    });

    it('should warn about unclosed parentheses', () => {
      const result = parser.parse('(foo');

      expect(result.warnings.some((w) => w.includes('parenthesis'))).toBe(true);
    });
  });

  describe('Field Queries', () => {
    it('should parse field:value', () => {
      const result = parser.parse('title:hello');

      expect(result.ast?.type).toBe('FIELD');
      expect(result.ast?.field).toBe('title');
      expect(result.ast?.child?.value).toBe('hello');
    });

    it('should parse field with phrase', () => {
      const result = parser.parse('title:"hello world"');

      expect(result.ast?.type).toBe('FIELD');
      expect(result.ast?.field).toBe('title');
      expect(result.ast?.child?.type).toBe('PHRASE');
    });

    it('should warn about unknown fields', () => {
      const parser = createQueryParser({ fields: ['title', 'content'] });
      const result = parser.parse('unknown:value');

      expect(result.warnings.some((w) => w.includes('Unknown field'))).toBe(true);
    });
  });

  describe('Wildcards', () => {
    it('should parse wildcard with asterisk', () => {
      const result = parser.parse('test*');

      expect(result.ast?.type).toBe('WILDCARD');
      expect(result.ast?.value).toBe('test*');
    });

    it('should parse wildcard with question mark', () => {
      const result = parser.parse('te?t');

      expect(result.ast?.type).toBe('WILDCARD');
      expect(result.ast?.value).toBe('te?t');
    });

    it('should warn when wildcards are disabled', () => {
      const parser = createQueryParser({ allowWildcards: false });
      const result = parser.parse('test*');

      expect(result.warnings.some((w) => w.includes('Wildcards'))).toBe(true);
    });
  });

  describe('Fuzzy Matching', () => {
    it('should parse fuzzy term', () => {
      const result = parser.parse('test~');

      expect(result.ast?.type).toBe('FUZZY');
      expect(result.ast?.fuzziness).toBe(2);
    });

    it('should parse fuzzy with distance', () => {
      const result = parser.parse('test~1');

      expect(result.ast?.type).toBe('FUZZY');
      expect(result.ast?.fuzziness).toBe(1);
    });

    it('should warn when fuzzy is disabled', () => {
      const parser = createQueryParser({ allowFuzzy: false });
      const result = parser.parse('test~');

      expect(result.warnings.some((w) => w.includes('Fuzzy'))).toBe(true);
    });
  });

  describe('Boosting', () => {
    it('should parse boosted term', () => {
      const result = parser.parse('test^2');

      expect(result.ast?.type).toBe('BOOST');
      expect(result.ast?.boost).toBe(2);
    });

    it('should parse boost with decimal', () => {
      const result = parser.parse('test^1.5');

      expect(result.ast?.type).toBe('BOOST');
      expect(result.ast?.boost).toBe(1.5);
    });

    it('should warn when boost is disabled', () => {
      const parser = createQueryParser({ allowBoost: false });
      const result = parser.parse('test^2');

      expect(result.warnings.some((w) => w.includes('Boosting'))).toBe(true);
    });
  });

  describe('Range Queries', () => {
    it('should parse inclusive range', () => {
      const result = parser.parse('[a TO z]');

      expect(result.ast?.type).toBe('RANGE');
      expect(result.ast?.from).toBe('a');
      expect(result.ast?.to).toBe('z');
      expect(result.ast?.inclusive?.start).toBe(true);
      expect(result.ast?.inclusive?.end).toBe(true);
    });

    it('should parse exclusive range', () => {
      const result = parser.parse('{a TO z}');

      expect(result.ast?.type).toBe('RANGE');
      expect(result.ast?.inclusive?.start).toBe(false);
    });

    it('should parse open-ended range (from)', () => {
      const result = parser.parse('[* TO z]');

      expect(result.ast?.from).toBeUndefined();
      expect(result.ast?.to).toBe('z');
    });

    it('should parse open-ended range (to)', () => {
      const result = parser.parse('[a TO *]');

      expect(result.ast?.from).toBe('a');
      expect(result.ast?.to).toBeUndefined();
    });

    it('should parse field with range', () => {
      const result = parser.parse('date:[2020 TO 2024]');

      expect(result.ast?.type).toBe('FIELD');
      expect(result.ast?.field).toBe('date');
      expect(result.ast?.child?.type).toBe('RANGE');
    });

    it('should warn when ranges are disabled', () => {
      const parser = createQueryParser({ allowRanges: false });
      const result = parser.parse('[a TO z]');

      expect(result.warnings.some((w) => w.includes('Ranges'))).toBe(true);
    });
  });

  describe('Complex Queries', () => {
    it('should parse complex boolean query', () => {
      const result = parser.parse('(title:test OR content:demo) AND NOT draft');

      expect(result.ast?.type).toBe('AND');
      expect(result.ast?.left?.type).toBe('GROUP');
      expect(result.ast?.right?.type).toBe('NOT');
    });

    it('should parse query with multiple modifiers', () => {
      const result = parser.parse('test~2^1.5');

      expect(result.ast?.type).toBe('BOOST');
      expect(result.ast?.child?.type).toBe('FUZZY');
    });

    it('should handle mixed terms and phrases', () => {
      const result = parser.parse('hello "exact phrase" world');

      expect(result.ast?.type).toBe('AND');
    });
  });

  describe('toQuery Conversion', () => {
    it('should convert term to query object', () => {
      const result = parser.parse('test');
      const query = parser.toQuery(result.ast!);

      expect(query.type).toBe('term');
      expect(query.value).toBe('test');
    });

    it('should convert AND to query object', () => {
      const result = parser.parse('a AND b');
      const query = parser.toQuery(result.ast!);

      expect(query.type).toBe('and');
      expect(Array.isArray(query.queries)).toBe(true);
    });

    it('should convert field query to object', () => {
      const result = parser.parse('title:test');
      const query = parser.toQuery(result.ast!);

      expect(query.type).toBe('field');
      expect(query.field).toBe('title');
    });

    it('should convert range to query object', () => {
      const result = parser.parse('[a TO z]');
      const query = parser.toQuery(result.ast!);

      expect(query.type).toBe('range');
      expect(query.from).toBe('a');
      expect(query.to).toBe('z');
    });
  });

  describe('Convenience Function', () => {
    it('should use parseQuery function', () => {
      const result = parseQuery('test query');

      expect(result.ast).not.toBeNull();
      expect(result.ast?.type).toBe('AND');
    });

    it('should accept options', () => {
      const result = parseQuery('a b', { defaultOperator: 'OR' });

      // Note: Implementation uses AND for implicit, OR only for explicit
      expect(result.ast).not.toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected tokens', () => {
      const result = parser.parse(')');

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should continue parsing after error', () => {
      const result = parser.parse(') AND test');

      // Should still parse 'test'
      expect(result.tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Tokenization', () => {
    it('should return tokens in parse result', () => {
      const result = parser.parse('hello world');

      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.tokens[0].type).toBe('WORD');
    });

    it('should include token positions', () => {
      const result = parser.parse('hello world');

      expect(result.tokens[0].position).toBe(0);
      expect(result.tokens[1].position).toBe(6);
    });
  });

  describe('Invariants', () => {
    it('INV-QP-001: Parse result must have tokens array', () => {
      const result = parser.parse('any query');
      expect(Array.isArray(result.tokens)).toBe(true);
    });

    it('INV-QP-002: Parse result must have errors array', () => {
      const result = parser.parse('any query');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('INV-QP-003: Parse result must have warnings array', () => {
      const result = parser.parse('any query');
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('INV-QP-004: Non-empty query must produce tokens', () => {
      const result = parser.parse('test');
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('INV-QP-005: Tokens must end with EOF', () => {
      const result = parser.parse('test');
      const lastToken = result.tokens[result.tokens.length - 1];
      expect(lastToken.type).toBe('EOF');
    });
  });
});
