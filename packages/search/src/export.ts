/**
 * Export Module
 * @module @omega/search/export
 * @description Export search results and documents to various formats
 */

import type { SearchResult, SearchResponse, SearchDocument } from './types';

/**
 * Export format
 */
export type ExportFormat = 'json' | 'csv' | 'xml' | 'markdown' | 'html';

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeScore?: boolean;
  includeHighlights?: boolean;
  fields?: string[];
  delimiter?: string;
  pretty?: boolean;
  title?: string;
}

/**
 * Export result
 */
export interface ExportResult {
  content: string;
  format: ExportFormat;
  mimeType: string;
  filename: string;
  size: number;
  itemCount: number;
  exportedAt: number;
}

/**
 * Export template
 */
export interface ExportTemplate {
  name: string;
  format: ExportFormat;
  header?: string;
  footer?: string;
  itemTemplate: string;
  separator?: string;
}

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'json',
  includeMetadata: true,
  includeScore: true,
  includeHighlights: false,
  pretty: true,
};

/**
 * MIME types for export formats
 */
const MIME_TYPES: Record<ExportFormat, string> = {
  json: 'application/json',
  csv: 'text/csv',
  xml: 'application/xml',
  markdown: 'text/markdown',
  html: 'text/html',
};

/**
 * File extensions for export formats
 */
const FILE_EXTENSIONS: Record<ExportFormat, string> = {
  json: 'json',
  csv: 'csv',
  xml: 'xml',
  markdown: 'md',
  html: 'html',
};

/**
 * Search exporter
 */
export class SearchExporter {
  private templates: Map<string, ExportTemplate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  /**
   * Export search response
   */
  exportResponse(response: SearchResponse, options: Partial<ExportOptions> = {}): ExportResult {
    const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
    const content = this.formatResponse(response, opts);

    return {
      content,
      format: opts.format,
      mimeType: MIME_TYPES[opts.format],
      filename: `search_results_${Date.now()}.${FILE_EXTENSIONS[opts.format]}`,
      size: content.length,
      itemCount: response.results.length,
      exportedAt: Date.now(),
    };
  }

  /**
   * Export search results
   */
  exportResults(results: SearchResult[], options: Partial<ExportOptions> = {}): ExportResult {
    const response: SearchResponse = {
      query: '',
      results,
      totalHits: results.length,
      took: 0,
    };
    return this.exportResponse(response, options);
  }

  /**
   * Export documents
   */
  exportDocuments(documents: SearchDocument[], options: Partial<ExportOptions> = {}): ExportResult {
    const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
    const content = this.formatDocuments(documents, opts);

    return {
      content,
      format: opts.format,
      mimeType: MIME_TYPES[opts.format],
      filename: `documents_${Date.now()}.${FILE_EXTENSIONS[opts.format]}`,
      size: content.length,
      itemCount: documents.length,
      exportedAt: Date.now(),
    };
  }

  /**
   * Export with template
   */
  exportWithTemplate(
    items: Array<Record<string, unknown>>,
    templateName: string
  ): ExportResult {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const parts: string[] = [];
    if (template.header) {
      parts.push(template.header);
    }

    const itemParts = items.map((item) => this.applyTemplate(template.itemTemplate, item));
    parts.push(itemParts.join(template.separator || '\n'));

    if (template.footer) {
      parts.push(template.footer);
    }

    const content = parts.join('\n');

    return {
      content,
      format: template.format,
      mimeType: MIME_TYPES[template.format],
      filename: `${templateName}_${Date.now()}.${FILE_EXTENSIONS[template.format]}`,
      size: content.length,
      itemCount: items.length,
      exportedAt: Date.now(),
    };
  }

  /**
   * Register custom template
   */
  registerTemplate(template: ExportTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Get available templates
   */
  getTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Format response based on format
   */
  private formatResponse(response: SearchResponse, options: ExportOptions): string {
    switch (options.format) {
      case 'json':
        return this.toJSON(response, options);
      case 'csv':
        return this.toCSV(response.results, options);
      case 'xml':
        return this.toXML(response, options);
      case 'markdown':
        return this.toMarkdown(response, options);
      case 'html':
        return this.toHTML(response, options);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  /**
   * Format documents based on format
   */
  private formatDocuments(documents: SearchDocument[], options: ExportOptions): string {
    switch (options.format) {
      case 'json':
        return options.pretty
          ? JSON.stringify({ documents }, null, 2)
          : JSON.stringify({ documents });
      case 'csv':
        return this.documentsToCSV(documents, options);
      case 'xml':
        return this.documentsToXML(documents, options);
      case 'markdown':
        return this.documentsToMarkdown(documents, options);
      case 'html':
        return this.documentsToHTML(documents, options);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  /**
   * Convert to JSON
   */
  private toJSON(response: SearchResponse, options: ExportOptions): string {
    const data = this.filterFields(response, options);
    return options.pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }

  /**
   * Convert results to CSV
   */
  private toCSV(results: SearchResult[], options: ExportOptions): string {
    const delimiter = options.delimiter || ',';
    const fields = options.fields || ['id', 'title', 'content', 'score'];

    const headers = fields.join(delimiter);
    const rows = results.map((result) =>
      fields
        .map((field) => {
          const value = this.getFieldValue(result, field);
          return this.escapeCSV(String(value ?? ''), delimiter);
        })
        .join(delimiter)
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * Convert documents to CSV
   */
  private documentsToCSV(documents: SearchDocument[], options: ExportOptions): string {
    const delimiter = options.delimiter || ',';
    const fields = options.fields || ['id', 'title', 'content'];

    const headers = fields.join(delimiter);
    const rows = documents.map((doc) =>
      fields
        .map((field) => {
          const value = this.getFieldValue(doc, field);
          return this.escapeCSV(String(value ?? ''), delimiter);
        })
        .join(delimiter)
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * Convert to XML
   */
  private toXML(response: SearchResponse, options: ExportOptions): string {
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
    lines.push('<searchResponse>');
    lines.push(`  <query>${this.escapeXML(response.query)}</query>`);
    lines.push(`  <totalHits>${response.totalHits}</totalHits>`);
    lines.push(`  <took>${response.took}</took>`);
    lines.push('  <results>');

    for (const result of response.results) {
      lines.push('    <result>');
      lines.push(`      <id>${this.escapeXML(result.id)}</id>`);
      lines.push(`      <title>${this.escapeXML(result.title)}</title>`);
      lines.push(`      <content>${this.escapeXML(result.content)}</content>`);
      if (options.includeScore) {
        lines.push(`      <score>${result.score}</score>`);
      }
      if (options.includeHighlights && result.highlights.length > 0) {
        lines.push('      <highlights>');
        for (const highlight of result.highlights) {
          lines.push(`        <highlight>${this.escapeXML(highlight)}</highlight>`);
        }
        lines.push('      </highlights>');
      }
      lines.push('    </result>');
    }

    lines.push('  </results>');
    lines.push('</searchResponse>');

    return lines.join('\n');
  }

  /**
   * Convert documents to XML
   */
  private documentsToXML(documents: SearchDocument[], options: ExportOptions): string {
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
    lines.push('<documents>');

    for (const doc of documents) {
      lines.push('  <document>');
      lines.push(`    <id>${this.escapeXML(doc.id)}</id>`);
      lines.push(`    <content>${this.escapeXML(doc.content)}</content>`);
      if (doc.title) {
        lines.push(`    <title>${this.escapeXML(doc.title)}</title>`);
      }
      if (options.includeMetadata && doc.metadata) {
        lines.push('    <metadata>');
        for (const [key, value] of Object.entries(doc.metadata)) {
          lines.push(`      <${key}>${this.escapeXML(String(value))}</${key}>`);
        }
        lines.push('    </metadata>');
      }
      lines.push('  </document>');
    }

    lines.push('</documents>');
    return lines.join('\n');
  }

  /**
   * Convert to Markdown
   */
  private toMarkdown(response: SearchResponse, options: ExportOptions): string {
    const lines: string[] = [];
    const title = options.title || 'Search Results';

    lines.push(`# ${title}`);
    lines.push('');
    lines.push(`**Query:** ${response.query || '(all)'}`);
    lines.push(`**Total Hits:** ${response.totalHits}`);
    lines.push(`**Time:** ${response.took}ms`);
    lines.push('');
    lines.push('## Results');
    lines.push('');

    for (let i = 0; i < response.results.length; i++) {
      const result = response.results[i];
      lines.push(`### ${i + 1}. ${result.title || result.id}`);
      lines.push('');
      if (options.includeScore) {
        lines.push(`**Score:** ${result.score.toFixed(4)}`);
      }
      lines.push('');
      lines.push(result.content);
      lines.push('');
      if (options.includeHighlights && result.highlights.length > 0) {
        lines.push('**Highlights:**');
        for (const highlight of result.highlights) {
          lines.push(`- ...${highlight}...`);
        }
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Convert documents to Markdown
   */
  private documentsToMarkdown(documents: SearchDocument[], options: ExportOptions): string {
    const lines: string[] = [];
    const title = options.title || 'Documents';

    lines.push(`# ${title}`);
    lines.push('');
    lines.push(`**Total:** ${documents.length} documents`);
    lines.push('');

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      lines.push(`## ${i + 1}. ${doc.title || doc.id}`);
      lines.push('');
      lines.push(doc.content);
      lines.push('');
      if (options.includeMetadata && doc.metadata) {
        lines.push('**Metadata:**');
        for (const [key, value] of Object.entries(doc.metadata)) {
          lines.push(`- ${key}: ${value}`);
        }
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Convert to HTML
   */
  private toHTML(response: SearchResponse, options: ExportOptions): string {
    const title = options.title || 'Search Results';
    const lines: string[] = [];

    lines.push('<!DOCTYPE html>');
    lines.push('<html lang="en">');
    lines.push('<head>');
    lines.push('  <meta charset="UTF-8">');
    lines.push(`  <title>${this.escapeXML(title)}</title>`);
    lines.push('  <style>');
    lines.push('    body { font-family: -apple-system, system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }');
    lines.push('    .result { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 4px; }');
    lines.push('    .result-title { font-size: 1.2em; color: #1a0dab; }');
    lines.push('    .result-score { color: #666; font-size: 0.9em; }');
    lines.push('    .result-content { margin: 10px 0; }');
    lines.push('    .highlight { background: #ffff00; }');
    lines.push('    .meta { color: #666; font-size: 0.9em; }');
    lines.push('  </style>');
    lines.push('</head>');
    lines.push('<body>');
    lines.push(`  <h1>${this.escapeXML(title)}</h1>`);
    lines.push('  <div class="meta">');
    lines.push(`    <p>Query: <strong>${this.escapeXML(response.query || '(all)')}</strong></p>`);
    lines.push(`    <p>Total: ${response.totalHits} results in ${response.took}ms</p>`);
    lines.push('  </div>');
    lines.push('  <div class="results">');

    for (const result of response.results) {
      lines.push('    <div class="result">');
      lines.push(`      <div class="result-title">${this.escapeXML(result.title || result.id)}</div>`);
      if (options.includeScore) {
        lines.push(`      <div class="result-score">Score: ${result.score.toFixed(4)}</div>`);
      }
      lines.push(`      <div class="result-content">${this.escapeXML(result.content)}</div>`);
      if (options.includeHighlights && result.highlights.length > 0) {
        lines.push('      <div class="highlights">');
        for (const highlight of result.highlights) {
          lines.push(`        <p>...${highlight}...</p>`);
        }
        lines.push('      </div>');
      }
      lines.push('    </div>');
    }

    lines.push('  </div>');
    lines.push('</body>');
    lines.push('</html>');

    return lines.join('\n');
  }

  /**
   * Convert documents to HTML
   */
  private documentsToHTML(documents: SearchDocument[], options: ExportOptions): string {
    const title = options.title || 'Documents';
    const lines: string[] = [];

    lines.push('<!DOCTYPE html>');
    lines.push('<html lang="en">');
    lines.push('<head>');
    lines.push('  <meta charset="UTF-8">');
    lines.push(`  <title>${this.escapeXML(title)}</title>`);
    lines.push('  <style>');
    lines.push('    body { font-family: -apple-system, system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }');
    lines.push('    .document { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 4px; }');
    lines.push('    .doc-title { font-size: 1.2em; color: #333; }');
    lines.push('    .doc-content { margin: 10px 0; }');
    lines.push('    .doc-meta { color: #666; font-size: 0.9em; }');
    lines.push('  </style>');
    lines.push('</head>');
    lines.push('<body>');
    lines.push(`  <h1>${this.escapeXML(title)}</h1>`);
    lines.push(`  <p>Total: ${documents.length} documents</p>`);
    lines.push('  <div class="documents">');

    for (const doc of documents) {
      lines.push('    <div class="document">');
      lines.push(`      <div class="doc-title">${this.escapeXML(doc.title || doc.id)}</div>`);
      lines.push(`      <div class="doc-content">${this.escapeXML(doc.content)}</div>`);
      if (options.includeMetadata && doc.metadata) {
        lines.push('      <div class="doc-meta">');
        for (const [key, value] of Object.entries(doc.metadata)) {
          lines.push(`        <span>${this.escapeXML(key)}: ${this.escapeXML(String(value))}</span><br>`);
        }
        lines.push('      </div>');
      }
      lines.push('    </div>');
    }

    lines.push('  </div>');
    lines.push('</body>');
    lines.push('</html>');

    return lines.join('\n');
  }

  /**
   * Filter fields based on options
   */
  private filterFields(response: SearchResponse, options: ExportOptions): unknown {
    if (!options.fields) return response;

    return {
      query: response.query,
      totalHits: response.totalHits,
      took: response.took,
      results: response.results.map((result) => {
        const filtered: Record<string, unknown> = {};
        for (const field of options.fields!) {
          filtered[field] = this.getFieldValue(result, field);
        }
        return filtered;
      }),
    };
  }

  /**
   * Get field value from object
   */
  private getFieldValue(obj: Record<string, unknown>, field: string): unknown {
    return obj[field];
  }

  /**
   * Escape CSV value
   */
  private escapeCSV(value: string, delimiter: string): string {
    if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Apply template to item
   */
  private applyTemplate(template: string, item: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(item[key] ?? ''));
  }

  /**
   * Register default templates
   */
  private registerDefaultTemplates(): void {
    this.templates.set('simple-list', {
      name: 'simple-list',
      format: 'markdown',
      header: '# Search Results\n',
      itemTemplate: '- {{title}}: {{content}}',
      separator: '\n',
    });

    this.templates.set('table', {
      name: 'table',
      format: 'markdown',
      header: '| ID | Title | Score |\n|---|---|---|',
      itemTemplate: '| {{id}} | {{title}} | {{score}} |',
      separator: '\n',
    });
  }
}

/**
 * Create search exporter
 */
export function createSearchExporter(): SearchExporter {
  return new SearchExporter();
}

/**
 * Default export
 */
export default SearchExporter;
