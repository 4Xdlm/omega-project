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

import type {
  NexusResponse,
  NexusError,
  ExecutionTrace,
  SimilarityResult,
  Emotion14
} from "../contracts/types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT FORMAT VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const OUTPUT_FORMAT_VERSION = "1.0.0";

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT FORMATS
// ═══════════════════════════════════════════════════════════════════════════════

export type OutputFormat = "full" | "summary" | "minimal" | "json";

export interface OutputOptions {
  readonly format?: OutputFormat;
  readonly includeTrace?: boolean;
  readonly includeMetadata?: boolean;
  readonly prettyPrint?: boolean;
}

export const DEFAULT_OUTPUT_OPTIONS: OutputOptions = {
  format: "full",
  includeTrace: false,
  includeMetadata: true,
  prettyPrint: false
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATTED OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT TRANSLATOR
// ═══════════════════════════════════════════════════════════════════════════════

export class OutputTranslator {
  private readonly options: OutputOptions;

  constructor(options: OutputOptions = {}) {
    this.options = { ...DEFAULT_OUTPUT_OPTIONS, ...options };
  }

  /**
   * Format a NexusResponse for output
   * INV-TRANS-02: Stable format with version
   */
  format<T>(response: NexusResponse<T>): FormattedOutput {
    const output: FormattedOutput = {
      version: OUTPUT_FORMAT_VERSION,
      format: this.options.format!,
      success: response.success,
      data: response.success ? this.formatData(response.data) : undefined,
      error: response.error ? this.formatError(response.error) : undefined,
      summary: this.createSummary(response),
      metadata: this.options.includeMetadata ? this.createMetadata() : undefined
    };

    return output;
  }

  /**
   * Format as JSON string
   */
  toJSON<T>(response: NexusResponse<T>): string {
    const output = this.format(response);
    return this.options.prettyPrint
      ? JSON.stringify(output, null, 2)
      : JSON.stringify(output);
  }

  /**
   * Format similarity result for display
   */
  formatSimilarity(result: SimilarityResult): string {
    const percentage = Math.round(result.score * 100);
    const stars = "★".repeat(Math.round(result.score * 5)) +
                  "☆".repeat(5 - Math.round(result.score * 5));

    return `Similarity: ${percentage}% ${stars} (${result.verdict})`;
  }

  /**
   * Format emotion distribution for display
   */
  formatEmotions(distribution: Readonly<Record<Emotion14, number>>): string {
    const sorted = Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return sorted
      .map(([emotion, value]) => `${emotion}: ${Math.round(value * 100)}%`)
      .join(", ");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private formatData<T>(data: T): unknown {
    if (this.options.format === "minimal") {
      return this.minimizeData(data);
    }
    if (this.options.format === "summary") {
      return this.summarizeData(data);
    }
    return data;
  }

  private minimizeData<T>(data: T): unknown {
    // Return only essential fields
    if (typeof data !== "object" || data === null) {
      return data;
    }

    const obj = data as Record<string, unknown>;
    const minimal: Record<string, unknown> = {};

    // Keep only fingerprint, hash, score fields
    const keepFields = ["fingerprint", "hash", "rootHash", "score", "verdict"];
    for (const key of keepFields) {
      if (key in obj) {
        minimal[key] = obj[key];
      }
    }

    return Object.keys(minimal).length > 0 ? minimal : data;
  }

  private summarizeData<T>(data: T): unknown {
    if (typeof data !== "object" || data === null) {
      return { value: data };
    }

    const obj = data as Record<string, unknown>;
    return {
      type: typeof data,
      fields: Object.keys(obj).length,
      preview: Object.keys(obj).slice(0, 5)
    };
  }

  private formatError(error: NexusError): FormattedError {
    return {
      code: error.code,
      message: error.message,
      source: error.source
    };
  }

  private createSummary<T>(response: NexusResponse<T>): OutputSummary {
    return {
      requestId: response.requestId,
      executionTimeMs: response.executionTimeMs,
      status: response.success ? "success" : "failure",
      message: response.success
        ? "Operation completed successfully"
        : `Operation failed: ${response.error?.message || "Unknown error"}`
    };
  }

  private createMetadata(): OutputMetadata {
    return {
      generatedAt: new Date().toISOString(),
      formatVersion: OUTPUT_FORMAT_VERSION
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an output translator with options
 */
export function createOutputTranslator(
  options?: OutputOptions
): OutputTranslator {
  return new OutputTranslator(options);
}

/**
 * Quick format a response
 */
export function formatOutput<T>(response: NexusResponse<T>): FormattedOutput {
  return new OutputTranslator().format(response);
}
