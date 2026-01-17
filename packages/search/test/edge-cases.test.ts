/**
 * @fileoverview Phase 3.3 - Edge Cases Tests for Search Module
 * Tests boundary conditions, extreme inputs, and robustness.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createSearchImporter,
  createIndexManager,
  createQueryParser,
} from '../src/index.js';
import type { SearchImporter, IndexManager, QueryParser } from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY 1: BUSINESS INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Search Invariants', () => {
  describe('Import Invariants', () => {
    let importer: SearchImporter;

    beforeEach(() => {
      importer = createSearchImporter();
    });

    it('INV-IMP: successful + failed must equal totalParsed', () => {
      const json = JSON.stringify([
        { content: 'Valid 1' },
        { content: 'Valid 2' },
        { content: 'Valid 3' },
      ]);
      const result = importer.import(json, { format: 'json' });
      expect(result.successful + result.failed).toBe(result.totalParsed);
    });

    it('INV-IMP: documents array is never null', () => {
      const result = importer.import('invalid json', { format: 'json' });
      expect(Array.isArray(result.documents)).toBe(true);
    });

    it('INV-IMP: errors count equals failed count', () => {
      const result = importer.import('not json at all', { format: 'json' });
      expect(result.errors.length).toBe(result.failed);
    });

    it('INV-IMP: all documents have non-empty content', () => {
      const json = JSON.stringify([
        { content: 'Content 1' },
        { content: 'Content 2' },
      ]);
      const result = importer.import(json, { format: 'json' });

      for (const doc of result.documents) {
        expect(doc.content.length).toBeGreaterThan(0);
      }
    });

    it('INV-IMP: generated IDs are unique', () => {
      const json = JSON.stringify([
        { content: 'No ID 1' },
        { content: 'No ID 2' },
        { content: 'No ID 3' },
      ]);
      const result = importer.import(json, { format: 'json', generateIds: true });

      const ids = result.documents.map(d => d.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe('Index Manager Invariants', () => {
    let manager: IndexManager;

    beforeEach(() => {
      manager = createIndexManager({ autoOptimize: false });
    });

    afterEach(() => {
      manager.dispose();
    });

    it('INV-INDEX: document count matches stored documents', () => {
      manager.addDocument({ id: 'd1', content: 'One' });
      manager.addDocument({ id: 'd2', content: 'Two' });
      manager.addDocument({ id: 'd3', content: 'Three' });

      expect(manager.getDocumentCount()).toBe(manager.getAllDocuments().length);
    });

    it('INV-INDEX: all document IDs are unique', () => {
      manager.addDocument({ id: 'd1', content: 'First' });
      manager.addDocument({ id: 'd2', content: 'Second' });

      const ids = manager.getAllDocuments().map(d => d.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('INV-INDEX: deleted document must not exist', () => {
      manager.addDocument({ id: 'del', content: 'To delete' });
      manager.deleteDocument('del');

      expect(manager.hasDocument('del')).toBe(false);
      expect(manager.getDocument('del')).toBeNull();
    });

    it('INV-INDEX: token count is non-negative', () => {
      manager.addDocument({ id: 'd1', content: 'Test content here' });
      const doc = manager.getDocument('d1');
      expect(doc!.tokenCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Query Parser Invariants', () => {
    let parser: QueryParser;

    beforeEach(() => {
      parser = createQueryParser();
    });

    it('INV-QP: parse result always has tokens array', () => {
      const result = parser.parse('any query');
      expect(Array.isArray(result.tokens)).toBe(true);
    });

    it('INV-QP: parse result always has errors array', () => {
      const result = parser.parse('any query');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('INV-QP: parse result always has warnings array', () => {
      const result = parser.parse('any query');
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('INV-QP: non-empty query produces tokens', () => {
      const result = parser.parse('test');
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('INV-QP: tokens end with EOF', () => {
      const result = parser.parse('test query');
      const lastToken = result.tokens[result.tokens.length - 1];
      expect(lastToken.type).toBe('EOF');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY 2: SECURITY EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Search Security Edge Cases', () => {
  describe('Injection Attempts in Queries', () => {
    let parser: QueryParser;

    beforeEach(() => {
      parser = createQueryParser();
    });

    it('should handle SQL-like injection in query', () => {
      const result = parser.parse("'; DROP TABLE users; --");
      expect(result).toBeDefined();
      // Should not crash, just parse as text
    });

    it('should handle script tags in query', () => {
      const result = parser.parse('<script>alert("XSS")</script>');
      expect(result).toBeDefined();
    });

    it('should handle null bytes in query', () => {
      const result = parser.parse('test\x00query');
      expect(result).toBeDefined();
    });

    it('should handle backslash sequences', () => {
      const result = parser.parse('test\\nquery\\t');
      expect(result).toBeDefined();
    });
  });

  describe('Dangerous Content in Documents', () => {
    let importer: SearchImporter;

    beforeEach(() => {
      importer = createSearchImporter();
    });

    it('should import documents with HTML content', () => {
      const json = JSON.stringify([
        { content: '<script>alert("XSS")</script>' },
      ]);
      const result = importer.import(json, { format: 'json' });
      expect(result.successful).toBe(1);
      // Content is preserved as-is (sanitization is separate concern)
    });

    it('should import documents with SQL content', () => {
      const json = JSON.stringify([
        { content: "SELECT * FROM users WHERE name = 'admin'" },
      ]);
      const result = importer.import(json, { format: 'json' });
      expect(result.successful).toBe(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY 3: ROBUSTNESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Search Robustness', () => {
  describe('Extreme Query Inputs', () => {
    let parser: QueryParser;

    beforeEach(() => {
      parser = createQueryParser();
    });

    it('should handle very long query', () => {
      const longQuery = 'word '.repeat(1000);
      const result = parser.parse(longQuery);
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('should handle query with only spaces', () => {
      const result = parser.parse('     ');
      expect(result.ast).toBeNull();
    });

    it('should handle query with only tabs', () => {
      const result = parser.parse('\t\t\t');
      expect(result.ast).toBeNull();
    });

    it('should handle query with mixed whitespace', () => {
      const result = parser.parse('  \t  \n  ');
      expect(result.ast).toBeNull();
    });

    it('should handle query with 100 nested parentheses', () => {
      const open = '('.repeat(100);
      const close = ')'.repeat(100);
      const result = parser.parse(open + 'test' + close);
      // Should not crash
      expect(result).toBeDefined();
    });

    it('should handle unicode queries', () => {
      const result = parser.parse('日本語 中文 한국어');
      expect(result.ast).not.toBeNull();
    });

    it('should handle emoji queries', () => {
      const result = parser.parse('🔍 search 🎯 target');
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('should handle RTL text in queries', () => {
      const result = parser.parse('مرحبا שלום hello');
      expect(result.tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Extreme Import Inputs', () => {
    let importer: SearchImporter;

    beforeEach(() => {
      importer = createSearchImporter();
    });

    it('should handle 1000 documents', () => {
      const docs = Array(1000).fill(null).map((_, i) => ({
        id: `doc-${i}`,
        content: `Content for document ${i}`,
      }));
      const json = JSON.stringify(docs);
      const result = importer.import(json, { format: 'json' });
      expect(result.successful).toBe(1000);
    });

    it('should handle document with 10K content', () => {
      const json = JSON.stringify([
        { id: 'large', content: 'x'.repeat(10000) },
      ]);
      const result = importer.import(json, { format: 'json' });
      expect(result.successful).toBe(1);
      expect(result.documents[0].content.length).toBe(10000);
    });

    it('should handle CSV with 100 columns', () => {
      const headers = Array(100).fill(null).map((_, i) => `col${i}`).join(',');
      const values = Array(100).fill('value').join(',');
      const csv = `${headers}\n${values}`;
      const result = importer.import(csv, { format: 'csv' });
      expect(result.successful).toBe(1);
    });

    it('should handle lines format with 10K lines', () => {
      const lines = Array(10000).fill('Line content').join('\n');
      const result = importer.import(lines, { format: 'lines' });
      expect(result.successful).toBe(10000);
    });
  });

  describe('Index Manager Edge Cases', () => {
    let manager: IndexManager;

    beforeEach(() => {
      manager = createIndexManager({ autoOptimize: false });
    });

    afterEach(() => {
      manager.dispose();
    });

    it('should handle document with very long content', () => {
      const doc = manager.addDocument({
        id: 'large',
        content: 'word '.repeat(10000),
      });
      expect(doc.tokenCount).toBeGreaterThan(0);
    });

    it('should handle document with emoji content', () => {
      const doc = manager.addDocument({
        id: 'emoji',
        content: '👋 Hello 🌍 World 🎯 Target',
      });
      expect(doc.id).toBe('emoji');
    });

    it('should handle rapid add/delete operations', () => {
      for (let i = 0; i < 100; i++) {
        manager.addDocument({ id: `rapid-${i}`, content: `Content ${i}` });
      }
      for (let i = 0; i < 50; i++) {
        manager.deleteDocument(`rapid-${i}`);
      }
      expect(manager.getDocumentCount()).toBe(50);
    });

    it('should handle snapshot with large index', () => {
      for (let i = 0; i < 100; i++) {
        manager.addDocument({ id: `snap-${i}`, content: `Content ${i}` });
      }
      const snapshot = manager.createSnapshot();
      expect(snapshot.documents.length).toBe(100);
    });
  });
});
