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
// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT FORMAT VERSION
// ═══════════════════════════════════════════════════════════════════════════════
export const OUTPUT_FORMAT_VERSION = "1.0.0";
export const DEFAULT_OUTPUT_OPTIONS = {
    format: "full",
    includeTrace: false,
    includeMetadata: true,
    prettyPrint: false
};
// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT TRANSLATOR
// ═══════════════════════════════════════════════════════════════════════════════
export class OutputTranslator {
    options;
    constructor(options = {}) {
        this.options = { ...DEFAULT_OUTPUT_OPTIONS, ...options };
    }
    /**
     * Format a NexusResponse for output
     * INV-TRANS-02: Stable format with version
     */
    format(response) {
        const output = {
            version: OUTPUT_FORMAT_VERSION,
            format: this.options.format,
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
    toJSON(response) {
        const output = this.format(response);
        return this.options.prettyPrint
            ? JSON.stringify(output, null, 2)
            : JSON.stringify(output);
    }
    /**
     * Format similarity result for display
     */
    formatSimilarity(result) {
        const percentage = Math.round(result.score * 100);
        const stars = "★".repeat(Math.round(result.score * 5)) +
            "☆".repeat(5 - Math.round(result.score * 5));
        return `Similarity: ${percentage}% ${stars} (${result.verdict})`;
    }
    /**
     * Format emotion distribution for display
     */
    formatEmotions(distribution) {
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
    formatData(data) {
        if (this.options.format === "minimal") {
            return this.minimizeData(data);
        }
        if (this.options.format === "summary") {
            return this.summarizeData(data);
        }
        return data;
    }
    minimizeData(data) {
        // Return only essential fields
        if (typeof data !== "object" || data === null) {
            return data;
        }
        const obj = data;
        const minimal = {};
        // Keep only fingerprint, hash, score fields
        const keepFields = ["fingerprint", "hash", "rootHash", "score", "verdict"];
        for (const key of keepFields) {
            if (key in obj) {
                minimal[key] = obj[key];
            }
        }
        return Object.keys(minimal).length > 0 ? minimal : data;
    }
    summarizeData(data) {
        if (typeof data !== "object" || data === null) {
            return { value: data };
        }
        const obj = data;
        return {
            type: typeof data,
            fields: Object.keys(obj).length,
            preview: Object.keys(obj).slice(0, 5)
        };
    }
    formatError(error) {
        return {
            code: error.code,
            message: error.message,
            source: error.source
        };
    }
    createSummary(response) {
        return {
            requestId: response.requestId,
            executionTimeMs: response.executionTimeMs,
            status: response.success ? "success" : "failure",
            message: response.success
                ? "Operation completed successfully"
                : `Operation failed: ${response.error?.message || "Unknown error"}`
        };
    }
    createMetadata() {
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
export function createOutputTranslator(options) {
    return new OutputTranslator(options);
}
/**
 * Quick format a response
 */
export function formatOutput(response) {
    return new OutputTranslator().format(response);
}
//# sourceMappingURL=output.js.map