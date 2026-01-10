/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — INPUT TRANSLATOR
 * Version: 0.3.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Input normalization and preprocessing.
 * INV-TRANS-01: All translations are deterministic.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const MAX_LINE_LENGTH = 10000;
export const DEFAULT_ENCODING = "utf-8";

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT TRANSLATION OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface InputTranslationOptions {
  readonly normalizeWhitespace?: boolean;
  readonly normalizeLineEndings?: boolean;
  readonly trimLines?: boolean;
  readonly removeEmptyLines?: boolean;
  readonly maxLineLength?: number;
  readonly toLowerCase?: boolean;
}

export const DEFAULT_INPUT_OPTIONS: InputTranslationOptions = {
  normalizeWhitespace: true,
  normalizeLineEndings: true,
  trimLines: true,
  removeEmptyLines: false,
  maxLineLength: MAX_LINE_LENGTH,
  toLowerCase: false
};

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT TRANSLATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface InputTranslationResult {
  readonly content: string;
  readonly originalLength: number;
  readonly translatedLength: number;
  readonly lineCount: number;
  readonly wordCount: number;
  readonly charCount: number;
  readonly metadata: InputMetadata;
}

export interface InputMetadata {
  readonly hasUnicode: boolean;
  readonly detectedLanguage: string;
  readonly averageLineLength: number;
  readonly averageWordLength: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT TRANSLATOR
// ═══════════════════════════════════════════════════════════════════════════════

export class InputTranslator {
  private readonly options: InputTranslationOptions;

  constructor(options: InputTranslationOptions = {}) {
    this.options = { ...DEFAULT_INPUT_OPTIONS, ...options };
  }

  /**
   * Translate input content
   * INV-TRANS-01: Deterministic - same input produces same output
   */
  translate(content: string): InputTranslationResult {
    const originalLength = content.length;
    let result = content;

    // Normalize line endings (CRLF, CR → LF)
    if (this.options.normalizeLineEndings) {
      result = this.normalizeLineEndings(result);
    }

    // Normalize whitespace
    if (this.options.normalizeWhitespace) {
      result = this.normalizeWhitespace(result);
    }

    // Trim lines
    if (this.options.trimLines) {
      result = this.trimLines(result);
    }

    // Remove empty lines
    if (this.options.removeEmptyLines) {
      result = this.removeEmptyLines(result);
    }

    // Truncate long lines
    if (this.options.maxLineLength) {
      result = this.truncateLines(result, this.options.maxLineLength);
    }

    // Convert to lowercase
    if (this.options.toLowerCase) {
      result = result.toLowerCase();
    }

    // Compute metadata
    const lines = result.split("\n");
    const words = result.split(/\s+/).filter(w => w.length > 0);

    return {
      content: result,
      originalLength,
      translatedLength: result.length,
      lineCount: lines.length,
      wordCount: words.length,
      charCount: result.length,
      metadata: this.extractMetadata(result, lines, words)
    };
  }

  /**
   * Quick normalize (whitespace, line endings, and trim lines)
   */
  quickNormalize(content: string): string {
    return content
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .split("\n")
      .map(line => line.trim())
      .join("\n")
      .trim();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  private normalizeWhitespace(content: string): string {
    return content.replace(/[ \t]+/g, " ");
  }

  private trimLines(content: string): string {
    return content
      .split("\n")
      .map(line => line.trim())
      .join("\n");
  }

  private removeEmptyLines(content: string): string {
    return content
      .split("\n")
      .filter(line => line.length > 0)
      .join("\n");
  }

  private truncateLines(content: string, maxLength: number): string {
    return content
      .split("\n")
      .map(line => line.length > maxLength ? line.substring(0, maxLength) : line)
      .join("\n");
  }

  private extractMetadata(
    content: string,
    lines: string[],
    words: string[]
  ): InputMetadata {
    // Check for Unicode (non-ASCII)
    const hasUnicode = /[^\x00-\x7F]/.test(content);

    // Simple language detection (placeholder)
    const detectedLanguage = this.detectLanguage(content);

    // Average line length
    const totalLineLength = lines.reduce((sum, l) => sum + l.length, 0);
    const averageLineLength = lines.length > 0 ? totalLineLength / lines.length : 0;

    // Average word length
    const totalWordLength = words.reduce((sum, w) => sum + w.length, 0);
    const averageWordLength = words.length > 0 ? totalWordLength / words.length : 0;

    return {
      hasUnicode,
      detectedLanguage,
      averageLineLength: Math.round(averageLineLength * 100) / 100,
      averageWordLength: Math.round(averageWordLength * 100) / 100
    };
  }

  private detectLanguage(content: string): string {
    // Simple heuristic for French vs English
    const frenchIndicators = /\b(le|la|les|de|du|des|un|une|et|est|que|qui|pour|dans|avec|sur|par|en|au|aux)\b/gi;
    const englishIndicators = /\b(the|a|an|is|are|was|were|been|being|have|has|had|do|does|did|will|would|could|should)\b/gi;

    const frenchMatches = (content.match(frenchIndicators) || []).length;
    const englishMatches = (content.match(englishIndicators) || []).length;

    if (frenchMatches > englishMatches * 1.5) {
      return "fr";
    } else if (englishMatches > frenchMatches * 1.5) {
      return "en";
    }
    return "unknown";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an input translator with options
 */
export function createInputTranslator(
  options?: InputTranslationOptions
): InputTranslator {
  return new InputTranslator(options);
}

/**
 * Quick translate with default options
 */
export function translateInput(content: string): InputTranslationResult {
  return new InputTranslator().translate(content);
}
