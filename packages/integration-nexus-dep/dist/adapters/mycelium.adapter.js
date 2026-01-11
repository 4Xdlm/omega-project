/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — MYCELIUM ADAPTER
 * Version: 0.1.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * READ-ONLY adapter for @omega/mycelium (SANCTUARY)
 * INV-NEXUS-01: No mutations allowed
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { DEFAULT_SEED } from "../contracts/io.js";
// ═══════════════════════════════════════════════════════════════════════════════
// REJECTION CODES (from MYCELIUM_REJECTION_CATALOG)
// ═══════════════════════════════════════════════════════════════════════════════
export const REJECTION_CODES = {
    EMPTY_CONTENT: "MYC-001",
    CONTENT_TOO_LARGE: "MYC-002",
    INVALID_UTF8: "MYC-003",
    INVALID_SEED: "MYC-004",
    INVALID_MODE: "MYC-005"
};
// ═══════════════════════════════════════════════════════════════════════════════
// MYCELIUM ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════
export class MyceliumAdapter {
    name = "mycelium";
    version = "1.0.0";
    isReadOnly = true;
    sanctuaryPath;
    maxContentSize = 10 * 1024 * 1024; // 10MB
    constructor(sanctuaryPath = "packages/mycelium") {
        this.sanctuaryPath = sanctuaryPath;
        Object.freeze(this);
    }
    /**
     * Check adapter health
     */
    async checkHealth() {
        const start = Date.now();
        try {
            return {
                adapter: this.name,
                healthy: true,
                latencyMs: Date.now() - start
            };
        }
        catch (err) {
            return {
                adapter: this.name,
                healthy: false,
                latencyMs: Date.now() - start,
                error: err instanceof Error ? err.message : String(err)
            };
        }
    }
    /**
     * Validate input according to DNA_INPUT_CONTRACT
     */
    async validateInput(request) {
        const { content, seed = DEFAULT_SEED, mode = "auto" } = request;
        // Check empty content
        if (!content || content.trim().length === 0) {
            return {
                valid: false,
                rejectionCode: REJECTION_CODES.EMPTY_CONTENT,
                rejectionMessage: "Content is empty or whitespace only"
            };
        }
        // Check content size
        const contentSize = Buffer.byteLength(content, "utf8");
        if (contentSize > this.maxContentSize) {
            return {
                valid: false,
                rejectionCode: REJECTION_CODES.CONTENT_TOO_LARGE,
                rejectionMessage: `Content size ${contentSize} exceeds maximum ${this.maxContentSize}`
            };
        }
        // Check UTF-8 validity (skeleton: basic check)
        if (!this.isValidUtf8(content)) {
            return {
                valid: false,
                rejectionCode: REJECTION_CODES.INVALID_UTF8,
                rejectionMessage: "Content contains invalid UTF-8 sequences"
            };
        }
        // Check seed validity
        if (seed < 0 || !Number.isInteger(seed)) {
            return {
                valid: false,
                rejectionCode: REJECTION_CODES.INVALID_SEED,
                rejectionMessage: "Seed must be a non-negative integer"
            };
        }
        // Normalize content
        const normalizedContent = this.normalizeContent(content);
        return {
            valid: true,
            normalizedContent
        };
    }
    /**
     * Normalize content (whitespace, line endings)
     */
    normalizeContent(content) {
        return content
            // Normalize line endings to LF
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            // Normalize multiple spaces to single space
            .replace(/[ \t]+/g, " ")
            // Trim lines
            .split("\n")
            .map(line => line.trim())
            .join("\n")
            // Remove multiple blank lines
            .replace(/\n{3,}/g, "\n\n")
            // Final trim
            .trim();
    }
    /**
     * Create validated GenomeInput from DNAInput
     */
    async createGenomeInput(input) {
        const validationResult = await this.validateInput({
            content: input.content,
            seed: input.seed,
            mode: input.mode
        });
        if (!validationResult.valid) {
            return {
                accepted: false,
                rejection: {
                    code: validationResult.rejectionCode || "UNKNOWN",
                    category: "VALIDATION",
                    message: validationResult.rejectionMessage || "Validation failed",
                    timestamp: new Date().toISOString()
                }
            };
        }
        return {
            accepted: true,
            output: {
                content: validationResult.normalizedContent,
                seed: input.seed ?? DEFAULT_SEED,
                mode: input.mode ?? "auto",
                meta: input.meta ? {
                    sourceId: input.meta.sourceId,
                    processedAt: new Date().toISOString(),
                    myceliumVersion: this.version
                } : undefined
            }
        };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════════
    isValidUtf8(content) {
        try {
            // In JavaScript, strings are already UTF-16
            // Check for common invalid patterns
            // eslint-disable-next-line no-control-regex
            const hasNullByte = /\x00/.test(content);
            return !hasNullByte;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=mycelium.adapter.js.map