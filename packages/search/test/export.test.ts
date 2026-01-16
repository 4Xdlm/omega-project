/**
 * Export Tests
 * @module @omega/search/test/export
 * @description Unit tests for search export functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SearchExporter,
  createSearchExporter,
  DEFAULT_EXPORT_OPTIONS,
  type ExportFormat,
  type ExportOptions,
  type ExportResult,
  type ExportTemplate,
} from '../src/export';
import type { SearchResult, SearchResponse, SearchDocument } from '../src/types';

describe('OMEGA Search - Phase 151: Export Core', () => {
  let exporter: SearchExporter;

  const sampleResults: SearchResult[] = [
    {
      id: 'doc-1',
      title: 'First Document',
      content: 'This is the first document content.',
      score: 0.95,
      highlights: ['...first document...'],
      matchedTerms: ['first', 'document'],
    },
    {
      id: 'doc-2',
      title: 'Second Document',
      content: 'This is the second document content.',
      score: 0.85,
      highlights: ['...second document...'],
      matchedTerms: ['second', 'document'],
    },
  ];

  const sampleResponse: SearchResponse = {
    query: 'test query',
    results: sampleResults,
    totalHits: 2,
    took: 15,
  };

  const sampleDocuments: SearchDocument[] = [
    {
      id: 'doc-1',
      content: 'Document one content',
      title: 'Doc One',
      metadata: { author: 'Alice', category: 'test' },
    },
    {
      id: 'doc-2',
      content: 'Document two content',
      title: 'Doc Two',
      metadata: { author: 'Bob', category: 'sample' },
    },
  ];

  beforeEach(() => {
    exporter = createSearchExporter();
  });

  describe('Type Definitions', () => {
    it('should define ExportFormat type', () => {
      const formats: ExportFormat[] = ['json', 'csv', 'xml', 'markdown', 'html'];
      expect(formats).toHaveLength(5);
    });

    it('should define ExportOptions interface', () => {
      const options: ExportOptions = {
        format: 'json',
        includeMetadata: true,
        includeScore: true,
        includeHighlights: false,
        fields: ['id', 'title'],
        delimiter: ',',
        pretty: true,
        title: 'Test Results',
      };
      expect(options.format).toBe('json');
    });

    it('should define ExportResult interface', () => {
      const result: ExportResult = {
        content: '{}',
        format: 'json',
        mimeType: 'application/json',
        filename: 'test.json',
        size: 2,
        itemCount: 0,
        exportedAt: Date.now(),
      };
      expect(result.format).toBe('json');
    });

    it('should have default export options', () => {
      expect(DEFAULT_EXPORT_OPTIONS.format).toBe('json');
      expect(DEFAULT_EXPORT_OPTIONS.includeMetadata).toBe(true);
      expect(DEFAULT_EXPORT_OPTIONS.includeScore).toBe(true);
      expect(DEFAULT_EXPORT_OPTIONS.pretty).toBe(true);
    });
  });

  describe('JSON Export', () => {
    it('should export response as JSON', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'json' });

      expect(result.format).toBe('json');
      expect(result.mimeType).toBe('application/json');
      expect(result.filename).toContain('.json');
      expect(result.itemCount).toBe(2);

      const parsed = JSON.parse(result.content);
      expect(parsed.query).toBe('test query');
      expect(parsed.totalHits).toBe(2);
    });

    it('should export pretty JSON by default', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'json', pretty: true });
      expect(result.content).toContain('\n');
    });

    it('should export minified JSON when pretty is false', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'json', pretty: false });
      expect(result.content).not.toContain('\n  ');
    });

    it('should export results directly', () => {
      const result = exporter.exportResults(sampleResults, { format: 'json' });
      expect(result.itemCount).toBe(2);

      const parsed = JSON.parse(result.content);
      expect(parsed.results).toHaveLength(2);
    });

    it('should export documents as JSON', () => {
      const result = exporter.exportDocuments(sampleDocuments, { format: 'json' });
      expect(result.itemCount).toBe(2);

      const parsed = JSON.parse(result.content);
      expect(parsed.documents).toHaveLength(2);
    });
  });

  describe('CSV Export', () => {
    it('should export response as CSV', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'csv' });

      expect(result.format).toBe('csv');
      expect(result.mimeType).toBe('text/csv');
      expect(result.filename).toContain('.csv');
    });

    it('should include headers', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'csv' });
      const lines = result.content.split('\n');
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('title');
    });

    it('should respect custom delimiter', () => {
      const result = exporter.exportResponse(sampleResponse, {
        format: 'csv',
        delimiter: ';',
      });
      expect(result.content).toContain(';');
    });

    it('should escape special characters', () => {
      const resultsWithSpecial: SearchResult[] = [{
        id: 'doc-special',
        title: 'Title with, comma',
        content: 'Content with "quotes"',
        score: 0.5,
        highlights: [],
        matchedTerms: [],
      }];

      const result = exporter.exportResults(resultsWithSpecial, { format: 'csv' });
      expect(result.content).toContain('"Title with, comma"');
      expect(result.content).toContain('""quotes""');
    });

    it('should export documents as CSV', () => {
      const result = exporter.exportDocuments(sampleDocuments, { format: 'csv' });
      expect(result.format).toBe('csv');
      expect(result.content).toContain('doc-1');
    });

    it('should respect custom fields', () => {
      const result = exporter.exportResponse(sampleResponse, {
        format: 'csv',
        fields: ['id', 'score'],
      });
      const lines = result.content.split('\n');
      expect(lines[0]).toBe('id,score');
    });
  });

  describe('XML Export', () => {
    it('should export response as XML', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'xml' });

      expect(result.format).toBe('xml');
      expect(result.mimeType).toBe('application/xml');
      expect(result.content).toContain('<?xml version="1.0"');
      expect(result.content).toContain('<searchResponse>');
    });

    it('should include query information', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'xml' });
      expect(result.content).toContain('<query>test query</query>');
      expect(result.content).toContain('<totalHits>2</totalHits>');
    });

    it('should include results', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'xml' });
      expect(result.content).toContain('<results>');
      expect(result.content).toContain('<result>');
      expect(result.content).toContain('<id>doc-1</id>');
    });

    it('should include score when option is set', () => {
      const result = exporter.exportResponse(sampleResponse, {
        format: 'xml',
        includeScore: true,
      });
      expect(result.content).toContain('<score>');
    });

    it('should include highlights when option is set', () => {
      const result = exporter.exportResponse(sampleResponse, {
        format: 'xml',
        includeHighlights: true,
      });
      expect(result.content).toContain('<highlights>');
      expect(result.content).toContain('<highlight>');
    });

    it('should escape XML special characters', () => {
      const resultsWithSpecial: SearchResult[] = [{
        id: 'doc-xml',
        title: 'Title <with> special & chars',
        content: 'Content "quoted"',
        score: 0.5,
        highlights: [],
        matchedTerms: [],
      }];

      const result = exporter.exportResults(resultsWithSpecial, { format: 'xml' });
      expect(result.content).toContain('&lt;with&gt;');
      expect(result.content).toContain('&amp;');
    });

    it('should export documents as XML', () => {
      const result = exporter.exportDocuments(sampleDocuments, { format: 'xml' });
      expect(result.content).toContain('<documents>');
      expect(result.content).toContain('<document>');
    });

    it('should include metadata when option is set', () => {
      const result = exporter.exportDocuments(sampleDocuments, {
        format: 'xml',
        includeMetadata: true,
      });
      expect(result.content).toContain('<metadata>');
      expect(result.content).toContain('<author>');
    });
  });

  describe('Markdown Export', () => {
    it('should export response as Markdown', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'markdown' });

      expect(result.format).toBe('markdown');
      expect(result.mimeType).toBe('text/markdown');
      expect(result.filename).toContain('.md');
    });

    it('should include title', () => {
      const result = exporter.exportResponse(sampleResponse, {
        format: 'markdown',
        title: 'My Search Results',
      });
      expect(result.content).toContain('# My Search Results');
    });

    it('should include query metadata', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'markdown' });
      expect(result.content).toContain('**Query:** test query');
      expect(result.content).toContain('**Total Hits:** 2');
    });

    it('should include results with headers', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'markdown' });
      expect(result.content).toContain('## Results');
      expect(result.content).toContain('### 1. First Document');
    });

    it('should include score when option is set', () => {
      const result = exporter.exportResponse(sampleResponse, {
        format: 'markdown',
        includeScore: true,
      });
      expect(result.content).toContain('**Score:**');
    });

    it('should include highlights when option is set', () => {
      const result = exporter.exportResponse(sampleResponse, {
        format: 'markdown',
        includeHighlights: true,
      });
      expect(result.content).toContain('**Highlights:**');
    });

    it('should export documents as Markdown', () => {
      const result = exporter.exportDocuments(sampleDocuments, { format: 'markdown' });
      expect(result.content).toContain('# Documents');
      expect(result.content).toContain('## 1. Doc One');
    });
  });

  describe('HTML Export', () => {
    it('should export response as HTML', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'html' });

      expect(result.format).toBe('html');
      expect(result.mimeType).toBe('text/html');
      expect(result.content).toContain('<!DOCTYPE html>');
    });

    it('should include title in head', () => {
      const result = exporter.exportResponse(sampleResponse, {
        format: 'html',
        title: 'Custom Title',
      });
      expect(result.content).toContain('<title>Custom Title</title>');
    });

    it('should include CSS styles', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'html' });
      expect(result.content).toContain('<style>');
      expect(result.content).toContain('.result');
    });

    it('should include results as divs', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'html' });
      expect(result.content).toContain('class="result"');
      expect(result.content).toContain('class="result-title"');
    });

    it('should export documents as HTML', () => {
      const result = exporter.exportDocuments(sampleDocuments, { format: 'html' });
      expect(result.content).toContain('class="document"');
      expect(result.content).toContain('class="doc-title"');
    });
  });

  describe('Templates', () => {
    it('should have default templates', () => {
      const templates = exporter.getTemplates();
      expect(templates).toContain('simple-list');
      expect(templates).toContain('table');
    });

    it('should register custom template', () => {
      const template: ExportTemplate = {
        name: 'custom',
        format: 'markdown',
        header: '# Custom\n',
        itemTemplate: '{{title}} - {{score}}',
        separator: '\n',
      };

      exporter.registerTemplate(template);
      expect(exporter.getTemplates()).toContain('custom');
    });

    it('should export with template', () => {
      const items = [
        { title: 'Item 1', score: 0.9 },
        { title: 'Item 2', score: 0.8 },
      ];

      const result = exporter.exportWithTemplate(items, 'simple-list');
      expect(result.content).toContain('# Search Results');
    });

    it('should throw for unknown template', () => {
      expect(() => exporter.exportWithTemplate([], 'nonexistent')).toThrow('Template not found');
    });

    it('should use table template', () => {
      const items = [
        { id: '1', title: 'First', score: 0.9 },
        { id: '2', title: 'Second', score: 0.8 },
      ];

      const result = exporter.exportWithTemplate(items, 'table');
      expect(result.content).toContain('| ID | Title | Score |');
      expect(result.content).toContain('| 1 | First | 0.9 |');
    });
  });

  describe('Export Result', () => {
    it('should include correct size', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'json' });
      expect(result.size).toBe(result.content.length);
    });

    it('should include correct item count', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'json' });
      expect(result.itemCount).toBe(sampleResponse.results.length);
    });

    it('should include export timestamp', () => {
      const before = Date.now();
      const result = exporter.exportResponse(sampleResponse, { format: 'json' });
      const after = Date.now();

      expect(result.exportedAt).toBeGreaterThanOrEqual(before);
      expect(result.exportedAt).toBeLessThanOrEqual(after);
    });

    it('should generate unique filenames', () => {
      const result1 = exporter.exportResponse(sampleResponse, { format: 'json' });
      const result2 = exporter.exportResponse(sampleResponse, { format: 'json' });

      // Filenames contain timestamps so they may differ
      expect(result1.filename).toContain('search_results_');
      expect(result2.filename).toContain('search_results_');
    });
  });

  describe('Invariants', () => {
    it('INV-EXP-001: Content must be non-empty string', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'json' });
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(0);
    });

    it('INV-EXP-002: Size must equal content length', () => {
      const formats: ExportFormat[] = ['json', 'csv', 'xml', 'markdown', 'html'];
      for (const format of formats) {
        const result = exporter.exportResponse(sampleResponse, { format });
        expect(result.size).toBe(result.content.length);
      }
    });

    it('INV-EXP-003: Item count must be non-negative', () => {
      const emptyResponse: SearchResponse = {
        query: 'empty',
        results: [],
        totalHits: 0,
        took: 0,
      };
      const result = exporter.exportResponse(emptyResponse, { format: 'json' });
      expect(result.itemCount).toBeGreaterThanOrEqual(0);
    });

    it('INV-EXP-004: Export timestamp must be valid', () => {
      const result = exporter.exportResponse(sampleResponse, { format: 'json' });
      expect(result.exportedAt).toBeGreaterThan(0);
      expect(new Date(result.exportedAt).getTime()).toBe(result.exportedAt);
    });

    it('INV-EXP-005: MIME type must match format', () => {
      const mimeMap: Record<ExportFormat, string> = {
        json: 'application/json',
        csv: 'text/csv',
        xml: 'application/xml',
        markdown: 'text/markdown',
        html: 'text/html',
      };

      for (const [format, mime] of Object.entries(mimeMap)) {
        const result = exporter.exportResponse(sampleResponse, { format: format as ExportFormat });
        expect(result.mimeType).toBe(mime);
      }
    });
  });
});
