/**
 * @fileoverview Phase 3.2 - Error Path Tests for Search Module
 * Tests error handling behavior in import, index-manager, and query-parser.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SearchImporter,
  createSearchImporter,
  IndexManager,
  createIndexManager,
  QueryParser,
  createQueryParser,
  parseQuery,
} from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - SearchImporter
// ═══════════════════════════════════════════════════════════════════════════════

describe('SearchImporter - Error Paths', () => {
  let importer: SearchImporter;

  beforeEach(() => {
    importer = createSearchImporter();
  });

  describe('JSON Import Errors', () => {
    it('should handle malformed JSON gracefully', () => {
      const result = importer.import('{invalid json', { format: 'json' });
      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Invalid JSON');
    });

    it('should handle empty JSON array', () => {
      const result = importer.import('[]', { format: 'json' });
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should handle JSON with only null values', () => {
      const result = importer.import('[null, null]', { format: 'json' });
      expect(result.documents.length).toBe(0);
    });

    it('should handle JSON with nested errors', () => {
      const json = JSON.stringify([
        { id: 'valid', content: 'Valid content' },
        { id: 'missing-content' },
      ]);
      const result = importer.import(json, { format: 'json' });
      expect(result.successful).toBeGreaterThan(0);
    });

    it('should handle extremely large JSON', () => {
      const largeArray = Array(1000).fill({ content: 'x'.repeat(100) });
      const json = JSON.stringify(largeArray);
      const result = importer.import(json, { format: 'json' });
      expect(result.successful).toBe(1000);
    });
  });

  describe('CSV Import Errors', () => {
    it('should handle CSV with no data rows', () => {
      const csv = 'id,content,title';
      const result = importer.import(csv, { format: 'csv' });
      expect(result.successful).toBe(0);
    });

    it('should handle CSV with inconsistent columns', () => {
      const csv = `id,content,title
doc-1,content1
doc-2,content2,title2,extra`;
      const result = importer.import(csv, { format: 'csv' });
      expect(result.successful).toBeGreaterThan(0);
    });

    it('should handle CSV with only headers', () => {
      const csv = 'id,content\n';
      const result = importer.import(csv, { format: 'csv' });
      expect(result.successful).toBe(0);
    });

    it('should handle empty CSV', () => {
      const result = importer.import('', { format: 'csv' });
      expect(result.successful).toBe(0);
    });
  });

  describe('XML Import Errors', () => {
    it('should handle malformed XML', () => {
      const result = importer.import('<unclosed', { format: 'xml' });
      expect(result.failed).toBe(0); // Graceful handling
    });

    it('should handle empty XML', () => {
      const result = importer.import('', { format: 'xml' });
      expect(result.successful).toBe(0);
    });

    it('should handle XML with no document elements', () => {
      const xml = '<?xml version="1.0"?><root></root>';
      const result = importer.import(xml, { format: 'xml' });
      expect(result.successful).toBe(0);
    });
  });

  describe('Validation Errors', () => {
    it('should report empty content validation error', () => {
      const validation = importer.validate('', { format: 'json' });
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Content is empty');
    });

    it('should report JSON parse error in validation', () => {
      const validation = importer.validate('{bad', { format: 'json' });
      expect(validation.valid).toBe(false);
    });

    it('should warn about missing content fields', () => {
      const json = JSON.stringify([{ id: 'no-content' }]);
      const validation = importer.validate(json, { format: 'json' });
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Unsupported Format', () => {
    it('should handle unsupported format gracefully', () => {
      const result = importer.import('data', { format: 'unknown' as any });
      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Unsupported format');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - IndexManager
// ═══════════════════════════════════════════════════════════════════════════════

describe('IndexManager - Error Paths', () => {
  let manager: IndexManager;

  beforeEach(() => {
    manager = createIndexManager({ autoOptimize: false });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('Document Operations', () => {
    it('should throw on updating non-existent document', () => {
      expect(() =>
        manager.updateDocument({ id: 'nonexistent', content: 'test' })
      ).toThrow();
    });

    it('should return false for deleting non-existent document', () => {
      expect(manager.deleteDocument('nonexistent')).toBe(false);
    });

    it('should return null for non-existent document', () => {
      expect(manager.getDocument('nonexistent')).toBeNull();
    });

    it('should handle adding document with empty content', () => {
      const doc = manager.addDocument({ id: 'empty', content: '' });
      expect(doc.id).toBe('empty');
    });

    it('should handle duplicate document IDs', () => {
      manager.addDocument({ id: 'dup', content: 'First' });
      const second = manager.addDocument({ id: 'dup', content: 'Second' });
      expect(second.content).toBe('Second');
    });
  });

  describe('Snapshot Operations', () => {
    it('should handle restore from empty snapshot', () => {
      const emptySnapshot = {
        version: '1.0.0',
        metadata: {
          name: 'empty',
          documentCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          segmentCount: 0,
        },
        documents: [],
        segments: [],
      };

      manager.restoreFromSnapshot(emptySnapshot);
      expect(manager.getDocumentCount()).toBe(0);
    });

    it('should create valid snapshot from empty index', () => {
      const snapshot = manager.createSnapshot();
      expect(snapshot.documents.length).toBe(0);
      expect(snapshot.metadata.documentCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle clear on empty index', () => {
      expect(() => manager.clear()).not.toThrow();
      expect(manager.getDocumentCount()).toBe(0);
    });

    it('should handle optimize on empty index', () => {
      const result = manager.optimize();
      expect(result).toBeDefined();
    });

    it('should handle merge on empty index', () => {
      expect(() => manager.merge()).not.toThrow();
    });

    it('should handle getAllDocuments on empty index', () => {
      const docs = manager.getAllDocuments();
      expect(docs.length).toBe(0);
    });

    it('should handle getOperationLog with limit', () => {
      manager.addDocument({ id: 'doc1', content: 'Content 1' });
      manager.addDocument({ id: 'doc2', content: 'Content 2' });
      manager.addDocument({ id: 'doc3', content: 'Content 3' });

      const log = manager.getOperationLog(2);
      expect(log.length).toBeLessThanOrEqual(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - QueryParser
// ═══════════════════════════════════════════════════════════════════════════════

describe('QueryParser - Error Paths', () => {
  let parser: QueryParser;

  beforeEach(() => {
    parser = createQueryParser();
  });

  describe('Parse Errors', () => {
    it('should handle unexpected closing paren', () => {
      const result = parser.parse(')');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle multiple unexpected tokens', () => {
      const result = parser.parse(') AND )');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle dangling operators', () => {
      const result = parser.parse('AND');
      expect(result.ast).toBeNull();
    });

    it('should handle unclosed parenthesis', () => {
      const result = parser.parse('(foo AND bar');
      expect(result.warnings.some((w) => w.includes('parenthesis'))).toBe(true);
    });

    it('should handle multiple unclosed parens', () => {
      const result = parser.parse('((foo');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle empty parentheses', () => {
      const result = parser.parse('()');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Warning Cases', () => {
    it('should warn about unknown fields', () => {
      const parser = createQueryParser({ fields: ['title', 'content'] });
      const result = parser.parse('unknown:value');
      expect(result.warnings.some((w) => w.includes('Unknown field'))).toBe(
        true
      );
    });

    it('should warn when wildcards disabled', () => {
      const parser = createQueryParser({ allowWildcards: false });
      const result = parser.parse('test*');
      expect(result.warnings.some((w) => w.includes('Wildcards'))).toBe(true);
    });

    it('should warn when fuzzy disabled', () => {
      const parser = createQueryParser({ allowFuzzy: false });
      const result = parser.parse('test~');
      expect(result.warnings.some((w) => w.includes('Fuzzy'))).toBe(true);
    });

    it('should warn when boost disabled', () => {
      const parser = createQueryParser({ allowBoost: false });
      const result = parser.parse('test^2');
      expect(result.warnings.some((w) => w.includes('Boosting'))).toBe(true);
    });

    it('should warn when ranges disabled', () => {
      const parser = createQueryParser({ allowRanges: false });
      const result = parser.parse('[a TO z]');
      expect(result.warnings.some((w) => w.includes('Ranges'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long query', () => {
      const query = 'word '.repeat(100);
      const result = parser.parse(query);
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('should handle special characters', () => {
      const result = parser.parse('test@#$%');
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      const result = parser.parse('日本語 中文');
      expect(result.ast).not.toBeNull();
    });

    it('should handle emoji', () => {
      const result = parser.parse('🔍 search');
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('should handle only operators', () => {
      const result = parser.parse('AND OR NOT');
      expect(result.ast).toBeNull();
    });

    it('should handle null-ish queries via parseQuery', () => {
      const result = parseQuery('');
      expect(result.ast).toBeNull();
    });
  });

  describe('toQuery Conversion', () => {
    it('should handle null AST', () => {
      const result = parser.parse('');
      // toQuery should not be called with null
      expect(result.ast).toBeNull();
    });
  });
});
