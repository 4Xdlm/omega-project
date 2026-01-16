/**
 * Import Module
 * @module @omega/search/import
 * @description Import documents from various formats
 */

import type { SearchDocument } from './types';

/**
 * Import format
 */
export type ImportFormat = 'json' | 'csv' | 'xml' | 'text' | 'lines';

/**
 * Import options
 */
export interface ImportOptions {
  format: ImportFormat;
  idField?: string;
  contentField?: string;
  titleField?: string;
  delimiter?: string;
  hasHeaders?: boolean;
  skipLines?: number;
  encoding?: string;
  metadataFields?: string[];
  generateIds?: boolean;
  idPrefix?: string;
}

/**
 * Import result
 */
export interface ImportResult {
  documents: SearchDocument[];
  format: ImportFormat;
  totalParsed: number;
  successful: number;
  failed: number;
  errors: ImportError[];
  importedAt: number;
}

/**
 * Import error
 */
export interface ImportError {
  line?: number;
  index?: number;
  message: string;
  rawData?: string;
}

/**
 * Import validation
 */
export interface ImportValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  documentCount: number;
}

/**
 * Default import options
 */
export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
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

/**
 * Search importer
 */
export class SearchImporter {
  private idCounter: number = 0;

  /**
   * Import from string content
   */
  import(content: string, options: Partial<ImportOptions> = {}): ImportResult {
    const opts = { ...DEFAULT_IMPORT_OPTIONS, ...options };
    const errors: ImportError[] = [];
    const documents: SearchDocument[] = [];
    const startTime = Date.now();

    try {
      switch (opts.format) {
        case 'json':
          documents.push(...this.parseJSON(content, opts, errors));
          break;
        case 'csv':
          documents.push(...this.parseCSV(content, opts, errors));
          break;
        case 'xml':
          documents.push(...this.parseXML(content, opts, errors));
          break;
        case 'text':
          documents.push(...this.parseText(content, opts, errors));
          break;
        case 'lines':
          documents.push(...this.parseLines(content, opts, errors));
          break;
        default:
          throw new Error(`Unsupported format: ${opts.format}`);
      }
    } catch (e) {
      errors.push({
        message: e instanceof Error ? e.message : 'Import failed',
      });
    }

    return {
      documents,
      format: opts.format,
      totalParsed: documents.length + errors.length,
      successful: documents.length,
      failed: errors.length,
      errors,
      importedAt: startTime,
    };
  }

  /**
   * Validate import content
   */
  validate(content: string, options: Partial<ImportOptions> = {}): ImportValidation {
    const opts = { ...DEFAULT_IMPORT_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    let documentCount = 0;

    if (!content || content.trim().length === 0) {
      errors.push('Content is empty');
      return { valid: false, errors, warnings, documentCount };
    }

    try {
      switch (opts.format) {
        case 'json':
          documentCount = this.validateJSON(content, opts, errors, warnings);
          break;
        case 'csv':
          documentCount = this.validateCSV(content, opts, errors, warnings);
          break;
        case 'xml':
          documentCount = this.validateXML(content, opts, errors, warnings);
          break;
        case 'text':
          documentCount = 1;
          break;
        case 'lines':
          documentCount = this.validateLines(content, opts, errors, warnings);
          break;
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Validation failed');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      documentCount,
    };
  }

  /**
   * Parse multiple files
   */
  importBatch(
    contents: Array<{ name: string; content: string }>,
    options: Partial<ImportOptions> = {}
  ): ImportResult[] {
    return contents.map(({ content }) => this.import(content, options));
  }

  /**
   * Generate unique ID
   */
  generateId(prefix: string = 'doc'): string {
    return `${prefix}-${++this.idCounter}`;
  }

  /**
   * Reset ID counter
   */
  resetIdCounter(): void {
    this.idCounter = 0;
  }

  /**
   * Parse JSON content
   */
  private parseJSON(
    content: string,
    options: ImportOptions,
    errors: ImportError[]
  ): SearchDocument[] {
    const documents: SearchDocument[] = [];

    try {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : data.documents || [data];

      for (let i = 0; i < items.length; i++) {
        try {
          const doc = this.itemToDocument(items[i], options, i);
          if (doc) {
            documents.push(doc);
          }
        } catch (e) {
          errors.push({
            index: i,
            message: e instanceof Error ? e.message : 'Failed to parse item',
            rawData: JSON.stringify(items[i]).slice(0, 100),
          });
        }
      }
    } catch (e) {
      errors.push({
        message: `Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}`,
      });
    }

    return documents;
  }

  /**
   * Parse CSV content
   */
  private parseCSV(
    content: string,
    options: ImportOptions,
    errors: ImportError[]
  ): SearchDocument[] {
    const documents: SearchDocument[] = [];
    const lines = content.split('\n').filter((l) => l.trim());
    const delimiter = options.delimiter || ',';

    // Skip lines if specified
    let startIndex = options.skipLines || 0;

    // Parse headers
    let headers: string[] = [];
    if (options.hasHeaders && lines.length > startIndex) {
      headers = this.parseCSVLine(lines[startIndex], delimiter);
      startIndex++;
    } else {
      // Default headers based on options
      headers = [
        options.idField || 'id',
        options.contentField || 'content',
        options.titleField || 'title',
      ];
    }

    // Parse data rows
    for (let i = startIndex; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i], delimiter);
        const item: Record<string, string> = {};

        for (let j = 0; j < headers.length && j < values.length; j++) {
          item[headers[j]] = values[j];
        }

        const doc = this.itemToDocument(item, options, i);
        if (doc) {
          documents.push(doc);
        }
      } catch (e) {
        errors.push({
          line: i + 1,
          message: e instanceof Error ? e.message : 'Failed to parse line',
          rawData: lines[i].slice(0, 100),
        });
      }
    }

    return documents;
  }

  /**
   * Parse single CSV line
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === delimiter) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * Parse XML content
   */
  private parseXML(
    content: string,
    options: ImportOptions,
    errors: ImportError[]
  ): SearchDocument[] {
    const documents: SearchDocument[] = [];

    // Simple XML parsing (not using DOM parser for portability)
    const docRegex = /<document>([\s\S]*?)<\/document>/gi;
    let match;
    let index = 0;

    while ((match = docRegex.exec(content)) !== null) {
      try {
        const docContent = match[1];
        const item: Record<string, string> = {};

        // Extract fields
        const fieldRegex = /<(\w+)>([\s\S]*?)<\/\1>/gi;
        let fieldMatch;

        while ((fieldMatch = fieldRegex.exec(docContent)) !== null) {
          const fieldName = fieldMatch[1];
          const fieldValue = this.unescapeXML(fieldMatch[2]);
          item[fieldName] = fieldValue;
        }

        const doc = this.itemToDocument(item, options, index);
        if (doc) {
          documents.push(doc);
        }

        index++;
      } catch (e) {
        errors.push({
          index,
          message: e instanceof Error ? e.message : 'Failed to parse document',
          rawData: match[1].slice(0, 100),
        });
        index++;
      }
    }

    // If no <document> tags found, try root-level fields
    if (documents.length === 0 && !content.includes('<document>')) {
      try {
        const item: Record<string, string> = {};
        const fieldRegex = /<(\w+)>([\s\S]*?)<\/\1>/gi;
        let fieldMatch;

        while ((fieldMatch = fieldRegex.exec(content)) !== null) {
          item[fieldMatch[1]] = this.unescapeXML(fieldMatch[2]);
        }

        if (Object.keys(item).length > 0) {
          const doc = this.itemToDocument(item, options, 0);
          if (doc) {
            documents.push(doc);
          }
        }
      } catch (e) {
        errors.push({
          message: e instanceof Error ? e.message : 'Failed to parse XML',
        });
      }
    }

    return documents;
  }

  /**
   * Parse plain text content (single document)
   */
  private parseText(
    content: string,
    options: ImportOptions,
    _errors: ImportError[]
  ): SearchDocument[] {
    const id = options.generateIds
      ? this.generateId(options.idPrefix)
      : options.idField || 'doc-1';

    return [
      {
        id,
        content: content.trim(),
        title: this.extractTitle(content),
      },
    ];
  }

  /**
   * Parse line-by-line content (one document per line)
   */
  private parseLines(
    content: string,
    options: ImportOptions,
    errors: ImportError[]
  ): SearchDocument[] {
    const documents: SearchDocument[] = [];
    const lines = content.split('\n');
    const startIndex = options.skipLines || 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const id = options.generateIds
          ? this.generateId(options.idPrefix)
          : `line-${i + 1}`;

        documents.push({
          id,
          content: line,
          title: line.slice(0, 50) + (line.length > 50 ? '...' : ''),
        });
      } catch (e) {
        errors.push({
          line: i + 1,
          message: e instanceof Error ? e.message : 'Failed to parse line',
          rawData: line.slice(0, 100),
        });
      }
    }

    return documents;
  }

  /**
   * Convert item to SearchDocument
   */
  private itemToDocument(
    item: Record<string, unknown>,
    options: ImportOptions,
    index: number
  ): SearchDocument | null {
    const idField = options.idField || 'id';
    const contentField = options.contentField || 'content';
    const titleField = options.titleField || 'title';

    let id = String(item[idField] || '');
    const content = String(item[contentField] || '');
    const title = item[titleField] ? String(item[titleField]) : undefined;

    if (!content) {
      return null;
    }

    if (!id && options.generateIds) {
      id = this.generateId(options.idPrefix);
    }

    if (!id) {
      id = `item-${index}`;
    }

    // Extract metadata
    const metadata: Record<string, unknown> = {};
    if (options.metadataFields) {
      for (const field of options.metadataFields) {
        if (item[field] !== undefined) {
          metadata[field] = item[field];
        }
      }
    }

    return {
      id,
      content,
      title,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  }

  /**
   * Extract title from content
   */
  private extractTitle(content: string): string {
    // Use first line or first 50 characters
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.length <= 50) {
      return firstLine;
    }
    return firstLine.slice(0, 47) + '...';
  }

  /**
   * Unescape XML entities
   */
  private unescapeXML(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  /**
   * Validate JSON content
   */
  private validateJSON(
    content: string,
    options: ImportOptions,
    errors: string[],
    warnings: string[]
  ): number {
    try {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : data.documents || [data];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const contentField = options.contentField || 'content';

        if (!item[contentField]) {
          warnings.push(`Item ${i}: missing content field "${contentField}"`);
        }
      }

      return items.length;
    } catch (e) {
      errors.push(`Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}`);
      return 0;
    }
  }

  /**
   * Validate CSV content
   */
  private validateCSV(
    content: string,
    options: ImportOptions,
    errors: string[],
    warnings: string[]
  ): number {
    const lines = content.split('\n').filter((l) => l.trim());
    const startIndex = (options.skipLines || 0) + (options.hasHeaders ? 1 : 0);

    if (lines.length === 0) {
      errors.push('No data lines found');
      return 0;
    }

    if (options.hasHeaders && lines.length <= (options.skipLines || 0)) {
      errors.push('No data lines after headers');
      return 0;
    }

    const dataLines = lines.slice(startIndex);
    if (dataLines.length === 0) {
      warnings.push('No data rows found');
    }

    return dataLines.length;
  }

  /**
   * Validate XML content
   */
  private validateXML(
    content: string,
    errors: string[],
    _warnings: string[]
  ): number {
    // Check for basic XML structure
    if (!content.includes('<') || !content.includes('>')) {
      errors.push('Invalid XML: no tags found');
      return 0;
    }

    // Count documents
    const docMatches = content.match(/<document>/gi);
    return docMatches ? docMatches.length : 1;
  }

  /**
   * Validate lines content
   */
  private validateLines(
    content: string,
    options: ImportOptions,
    _errors: string[],
    warnings: string[]
  ): number {
    const lines = content.split('\n').filter((l) => l.trim());
    const startIndex = options.skipLines || 0;
    const dataLines = lines.slice(startIndex);

    if (dataLines.length === 0) {
      warnings.push('No non-empty lines found');
    }

    return dataLines.length;
  }
}

/**
 * Create search importer
 */
export function createSearchImporter(): SearchImporter {
  return new SearchImporter();
}

/**
 * Default export
 */
export default SearchImporter;
