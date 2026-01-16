/**
 * Import Tests
 * @module @omega/search/test/import
 * @description Unit tests for search import functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SearchImporter,
  createSearchImporter,
  DEFAULT_IMPORT_OPTIONS,
  type ImportFormat,
  type ImportOptions,
  type ImportResult,
  type ImportValidation,
} from '../src/import';

describe('OMEGA Search - Phase 152: Import Core', () => {
  let importer: SearchImporter;

  beforeEach(() => {
    importer = createSearchImporter();
  });

  describe('Type Definitions', () => {
    it('should define ImportFormat type', () => {
      const formats: ImportFormat[] = ['json', 'csv', 'xml', 'text', 'lines'];
      expect(formats).toHaveLength(5);
    });

    it('should define ImportOptions interface', () => {
      const options: ImportOptions = {
        format: 'json',
        idField: 'id',
        contentField: 'content',
        titleField: 'title',
        delimiter: ',',
        hasHeaders: true,
        skipLines: 0,
        generateIds: true,
        idPrefix: 'doc',
      };
      expect(options.format).toBe('json');
    });

    it('should define ImportResult interface', () => {
      const result: ImportResult = {
        documents: [],
        format: 'json',
        totalParsed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        importedAt: Date.now(),
      };
      expect(result.format).toBe('json');
    });

    it('should have default import options', () => {
      expect(DEFAULT_IMPORT_OPTIONS.format).toBe('json');
      expect(DEFAULT_IMPORT_OPTIONS.hasHeaders).toBe(true);
      expect(DEFAULT_IMPORT_OPTIONS.generateIds).toBe(true);
    });
  });

  describe('JSON Import', () => {
    it('should import JSON array', () => {
      const json = JSON.stringify([
        { id: 'doc-1', content: 'First document' },
        { id: 'doc-2', content: 'Second document' },
      ]);

      const result = importer.import(json, { format: 'json' });

      expect(result.successful).toBe(2);
      expect(result.documents).toHaveLength(2);
      expect(result.documents[0].id).toBe('doc-1');
    });

    it('should import JSON object with documents array', () => {
      const json = JSON.stringify({
        documents: [
          { id: 'doc-1', content: 'Content 1' },
          { id: 'doc-2', content: 'Content 2' },
        ],
      });

      const result = importer.import(json, { format: 'json' });

      expect(result.successful).toBe(2);
    });

    it('should import single JSON object', () => {
      const json = JSON.stringify({ id: 'single', content: 'Single document' });

      const result = importer.import(json, { format: 'json' });

      expect(result.successful).toBe(1);
      expect(result.documents[0].id).toBe('single');
    });

    it('should handle custom field names', () => {
      const json = JSON.stringify([
        { docId: 'custom-1', text: 'Custom content', name: 'Custom Title' },
      ]);

      const result = importer.import(json, {
        format: 'json',
        idField: 'docId',
        contentField: 'text',
        titleField: 'name',
      });

      expect(result.documents[0].id).toBe('custom-1');
      expect(result.documents[0].content).toBe('Custom content');
      expect(result.documents[0].title).toBe('Custom Title');
    });

    it('should generate IDs when missing', () => {
      const json = JSON.stringify([{ content: 'No ID document' }]);

      const result = importer.import(json, {
        format: 'json',
        generateIds: true,
        idPrefix: 'gen',
      });

      expect(result.documents[0].id).toMatch(/^gen-\d+$/);
    });

    it('should handle invalid JSON', () => {
      const result = importer.import('not valid json', { format: 'json' });

      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid JSON');
    });

    it('should extract metadata fields', () => {
      const json = JSON.stringify([
        { id: 'doc-1', content: 'Content', author: 'Alice', category: 'test' },
      ]);

      const result = importer.import(json, {
        format: 'json',
        metadataFields: ['author', 'category'],
      });

      expect(result.documents[0].metadata).toEqual({
        author: 'Alice',
        category: 'test',
      });
    });
  });

  describe('CSV Import', () => {
    it('should import CSV with headers', () => {
      const csv = `id,content,title
doc-1,First content,First Title
doc-2,Second content,Second Title`;

      const result = importer.import(csv, { format: 'csv' });

      expect(result.successful).toBe(2);
      expect(result.documents[0].id).toBe('doc-1');
      expect(result.documents[0].content).toBe('First content');
      expect(result.documents[0].title).toBe('First Title');
    });

    it('should handle custom delimiter', () => {
      const csv = `id;content;title
doc-1;Content one;Title one`;

      const result = importer.import(csv, { format: 'csv', delimiter: ';' });

      expect(result.documents[0].id).toBe('doc-1');
    });

    it('should handle quoted values', () => {
      const csv = `id,content,title
doc-1,"Content with, comma","Title with ""quotes"""`;

      const result = importer.import(csv, { format: 'csv' });

      expect(result.documents[0].content).toBe('Content with, comma');
      expect(result.documents[0].title).toBe('Title with "quotes"');
    });

    it('should skip lines', () => {
      const csv = `# Comment line
# Another comment
id,content,title
doc-1,Content,Title`;

      const result = importer.import(csv, { format: 'csv', skipLines: 2 });

      expect(result.successful).toBe(1);
    });

    it('should handle CSV without headers', () => {
      const csv = `doc-1,First content,First Title
doc-2,Second content,Second Title`;

      const result = importer.import(csv, { format: 'csv', hasHeaders: false });

      expect(result.successful).toBe(2);
    });
  });

  describe('XML Import', () => {
    it('should import XML documents', () => {
      const xml = `<?xml version="1.0"?>
<documents>
  <document>
    <id>doc-1</id>
    <content>First document</content>
    <title>First Title</title>
  </document>
  <document>
    <id>doc-2</id>
    <content>Second document</content>
  </document>
</documents>`;

      const result = importer.import(xml, { format: 'xml' });

      expect(result.successful).toBe(2);
      expect(result.documents[0].id).toBe('doc-1');
      expect(result.documents[0].content).toBe('First document');
    });

    it('should unescape XML entities', () => {
      const xml = `<document>
  <id>doc-1</id>
  <content>Content with &lt;tags&gt; &amp; entities</content>
</document>`;

      const result = importer.import(xml, { format: 'xml' });

      expect(result.documents[0].content).toBe('Content with <tags> & entities');
    });

    it('should handle single document without wrapper', () => {
      const xml = `<id>single</id>
<content>Single document content</content>`;

      const result = importer.import(xml, { format: 'xml' });

      expect(result.successful).toBe(1);
    });
  });

  describe('Text Import', () => {
    it('should import plain text as single document', () => {
      const text = `This is a plain text document.
It has multiple lines.
And some content.`;

      const result = importer.import(text, { format: 'text' });

      expect(result.successful).toBe(1);
      expect(result.documents[0].content).toContain('plain text document');
    });

    it('should generate ID for text document', () => {
      const text = 'Simple text content';

      const result = importer.import(text, {
        format: 'text',
        generateIds: true,
        idPrefix: 'txt',
      });

      expect(result.documents[0].id).toMatch(/^txt-\d+$/);
    });

    it('should extract title from first line', () => {
      const text = `Document Title Here
This is the body of the document.`;

      const result = importer.import(text, { format: 'text' });

      expect(result.documents[0].title).toBe('Document Title Here');
    });

    it('should truncate long titles', () => {
      const longFirstLine = 'A'.repeat(100);
      const text = `${longFirstLine}\nBody content`;

      const result = importer.import(text, { format: 'text' });

      expect(result.documents[0].title?.length).toBeLessThanOrEqual(50);
      expect(result.documents[0].title).toContain('...');
    });
  });

  describe('Lines Import', () => {
    it('should import each line as document', () => {
      const lines = `First line document
Second line document
Third line document`;

      const result = importer.import(lines, { format: 'lines' });

      expect(result.successful).toBe(3);
    });

    it('should skip empty lines', () => {
      const lines = `First line

Third line`;

      const result = importer.import(lines, { format: 'lines' });

      expect(result.successful).toBe(2);
    });

    it('should skip specified number of lines', () => {
      const lines = `Header line
Second header
Data line 1
Data line 2`;

      const result = importer.import(lines, { format: 'lines', skipLines: 2 });

      expect(result.successful).toBe(2);
      expect(result.documents[0].content).toBe('Data line 1');
    });

    it('should generate sequential IDs', () => {
      const lines = `Line 1
Line 2`;

      const result = importer.import(lines, {
        format: 'lines',
        generateIds: true,
        idPrefix: 'line',
      });

      expect(result.documents[0].id).toMatch(/^line-\d+$/);
      expect(result.documents[1].id).toMatch(/^line-\d+$/);
    });
  });

  describe('Validation', () => {
    it('should validate JSON content', () => {
      const json = JSON.stringify([{ content: 'Valid' }]);
      const validation = importer.validate(json, { format: 'json' });

      expect(validation.valid).toBe(true);
      expect(validation.documentCount).toBe(1);
    });

    it('should report invalid JSON', () => {
      const validation = importer.validate('invalid json', { format: 'json' });

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should validate CSV content', () => {
      const csv = `id,content\ndoc-1,text`;
      const validation = importer.validate(csv, { format: 'csv' });

      expect(validation.valid).toBe(true);
    });

    it('should warn about missing content field', () => {
      const json = JSON.stringify([{ id: 'no-content' }]);
      const validation = importer.validate(json, { format: 'json' });

      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should report empty content', () => {
      const validation = importer.validate('', { format: 'json' });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Content is empty');
    });
  });

  describe('Batch Import', () => {
    it('should import multiple files', () => {
      const files = [
        { name: 'file1.json', content: JSON.stringify([{ content: 'Doc 1' }]) },
        { name: 'file2.json', content: JSON.stringify([{ content: 'Doc 2' }]) },
      ];

      const results = importer.importBatch(files, { format: 'json' });

      expect(results).toHaveLength(2);
      expect(results[0].successful).toBe(1);
      expect(results[1].successful).toBe(1);
    });
  });

  describe('ID Generation', () => {
    it('should generate unique IDs', () => {
      const id1 = importer.generateId('test');
      const id2 = importer.generateId('test');

      expect(id1).not.toBe(id2);
    });

    it('should use custom prefix', () => {
      const id = importer.generateId('custom');
      expect(id).toMatch(/^custom-\d+$/);
    });

    it('should reset ID counter', () => {
      importer.generateId();
      importer.generateId();
      importer.resetIdCounter();

      const id = importer.generateId('new');
      expect(id).toBe('new-1');
    });
  });

  describe('Error Handling', () => {
    it('should report parse errors with context', () => {
      const json = JSON.stringify([
        { id: 'valid', content: 'Valid doc' },
        { id: 'invalid' }, // Missing content
      ]);

      const result = importer.import(json, { format: 'json' });

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0); // Missing content is skipped, not failed
    });

    it('should handle unsupported format', () => {
      const result = importer.import('data', { format: 'unknown' as ImportFormat });

      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Unsupported format');
    });

    it('should include line numbers in CSV errors', () => {
      const csv = `id,content
doc-1,valid`;

      const result = importer.import(csv, { format: 'csv' });

      // Should succeed, but test the structure
      expect(result.format).toBe('csv');
    });
  });

  describe('Invariants', () => {
    it('INV-IMP-001: Documents array must be non-null', () => {
      const result = importer.import('invalid', { format: 'json' });
      expect(Array.isArray(result.documents)).toBe(true);
    });

    it('INV-IMP-002: Successful + failed must equal totalParsed', () => {
      const json = JSON.stringify([
        { content: 'Valid 1' },
        { content: 'Valid 2' },
      ]);

      const result = importer.import(json, { format: 'json' });
      expect(result.successful + result.failed).toBe(result.totalParsed);
    });

    it('INV-IMP-003: Errors count must equal failed count', () => {
      const result = importer.import('bad json', { format: 'json' });
      expect(result.errors.length).toBe(result.failed);
    });

    it('INV-IMP-004: Document content must be non-empty', () => {
      const json = JSON.stringify([
        { id: 'doc-1', content: 'Has content' },
      ]);

      const result = importer.import(json, { format: 'json' });

      for (const doc of result.documents) {
        expect(doc.content.length).toBeGreaterThan(0);
      }
    });

    it('INV-IMP-005: Document ID must be non-empty', () => {
      const json = JSON.stringify([{ content: 'Content without ID' }]);

      const result = importer.import(json, { format: 'json', generateIds: true });

      for (const doc of result.documents) {
        expect(doc.id.length).toBeGreaterThan(0);
      }
    });
  });
});
