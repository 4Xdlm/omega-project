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
export declare const MAX_LINE_LENGTH = 10000;
export declare const DEFAULT_ENCODING = "utf-8";
export interface InputTranslationOptions {
    readonly normalizeWhitespace?: boolean;
    readonly normalizeLineEndings?: boolean;
    readonly trimLines?: boolean;
    readonly removeEmptyLines?: boolean;
    readonly maxLineLength?: number;
    readonly toLowerCase?: boolean;
}
export declare const DEFAULT_INPUT_OPTIONS: InputTranslationOptions;
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
export declare class InputTranslator {
    private readonly options;
    constructor(options?: InputTranslationOptions);
    /**
     * Translate input content
     * INV-TRANS-01: Deterministic - same input produces same output
     */
    translate(content: string): InputTranslationResult;
    /**
     * Quick normalize (whitespace, line endings, and trim lines)
     */
    quickNormalize(content: string): string;
    private normalizeLineEndings;
    private normalizeWhitespace;
    private trimLines;
    private removeEmptyLines;
    private truncateLines;
    private extractMetadata;
    private detectLanguage;
}
/**
 * Create an input translator with options
 */
export declare function createInputTranslator(options?: InputTranslationOptions): InputTranslator;
/**
 * Quick translate with default options
 */
export declare function translateInput(content: string): InputTranslationResult;
//# sourceMappingURL=input.d.ts.map