/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — OUTPUT TRANSLATOR
 * Version: 0.3.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Output formatting and response shaping.
 * INV-TRANS-02: Output format is stable and versioned.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { NexusResponse, SimilarityResult, Emotion14 } from "../contracts/types.js";
export declare const OUTPUT_FORMAT_VERSION = "1.0.0";
export type OutputFormat = "full" | "summary" | "minimal" | "json";
export interface OutputOptions {
    readonly format?: OutputFormat;
    readonly includeTrace?: boolean;
    readonly includeMetadata?: boolean;
    readonly prettyPrint?: boolean;
}
export declare const DEFAULT_OUTPUT_OPTIONS: OutputOptions;
export interface FormattedOutput {
    readonly version: string;
    readonly format: OutputFormat;
    readonly success: boolean;
    readonly data?: unknown;
    readonly error?: FormattedError;
    readonly summary?: OutputSummary;
    readonly metadata?: OutputMetadata;
}
export interface FormattedError {
    readonly code: string;
    readonly message: string;
    readonly source?: string;
}
export interface OutputSummary {
    readonly requestId: string;
    readonly executionTimeMs: number;
    readonly status: "success" | "failure";
    readonly message: string;
}
export interface OutputMetadata {
    readonly generatedAt: string;
    readonly formatVersion: string;
}
export declare class OutputTranslator {
    private readonly options;
    constructor(options?: OutputOptions);
    /**
     * Format a NexusResponse for output
     * INV-TRANS-02: Stable format with version
     */
    format<T>(response: NexusResponse<T>): FormattedOutput;
    /**
     * Format as JSON string
     */
    toJSON<T>(response: NexusResponse<T>): string;
    /**
     * Format similarity result for display
     */
    formatSimilarity(result: SimilarityResult): string;
    /**
     * Format emotion distribution for display
     */
    formatEmotions(distribution: Readonly<Record<Emotion14, number>>): string;
    private formatData;
    private minimizeData;
    private summarizeData;
    private formatError;
    private createSummary;
    private createMetadata;
}
/**
 * Create an output translator with options
 */
export declare function createOutputTranslator(options?: OutputOptions): OutputTranslator;
/**
 * Quick format a response
 */
export declare function formatOutput<T>(response: NexusResponse<T>): FormattedOutput;
//# sourceMappingURL=output.d.ts.map