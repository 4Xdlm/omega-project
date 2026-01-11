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
import type { NexusAdapter, AdapterHealthResult } from "../contracts/types.js";
import type { ValidateInputRequest, ValidateInputResult, SegmentMode } from "../contracts/io.js";
export interface DNAInput {
    readonly content: string;
    readonly seed?: number;
    readonly mode?: SegmentMode;
    readonly meta?: {
        readonly sourceId?: string;
        readonly timestamp?: string;
    };
}
export interface GenomeInput {
    readonly content: string;
    readonly seed: number;
    readonly mode: SegmentMode;
    readonly meta?: {
        readonly sourceId?: string;
        readonly processedAt: string;
        readonly myceliumVersion: string;
    };
}
export interface ValidationResult {
    readonly accepted: boolean;
    readonly output?: GenomeInput;
    readonly rejection?: {
        readonly code: string;
        readonly category: string;
        readonly message: string;
        readonly timestamp: string;
    };
}
export declare const REJECTION_CODES: {
    readonly EMPTY_CONTENT: "MYC-001";
    readonly CONTENT_TOO_LARGE: "MYC-002";
    readonly INVALID_UTF8: "MYC-003";
    readonly INVALID_SEED: "MYC-004";
    readonly INVALID_MODE: "MYC-005";
};
export declare class MyceliumAdapter implements NexusAdapter {
    readonly name = "mycelium";
    readonly version = "1.0.0";
    readonly isReadOnly: true;
    private readonly sanctuaryPath;
    private readonly maxContentSize;
    constructor(sanctuaryPath?: string);
    /**
     * Check adapter health
     */
    checkHealth(): Promise<AdapterHealthResult>;
    /**
     * Validate input according to DNA_INPUT_CONTRACT
     */
    validateInput(request: ValidateInputRequest): Promise<ValidateInputResult>;
    /**
     * Normalize content (whitespace, line endings)
     */
    normalizeContent(content: string): string;
    /**
     * Create validated GenomeInput from DNAInput
     */
    createGenomeInput(input: DNAInput): Promise<ValidationResult>;
    private isValidUtf8;
}
//# sourceMappingURL=mycelium.adapter.d.ts.map