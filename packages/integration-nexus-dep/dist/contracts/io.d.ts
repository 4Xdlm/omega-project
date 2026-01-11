/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — IO SCHEMAS
 * Version: 0.1.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Input/Output schemas for NEXUS DEP operations.
 * All schemas are immutable (readonly) by design.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { ExecutionTrace, Emotion14 } from "./types.js";
export declare const DEFAULT_SEED = 42;
export declare const MAX_CONTENT_SIZE: number;
export declare const MIN_CONTENT_SIZE = 1;
export interface AnalyzeTextInput {
    readonly content: string;
    readonly seed?: number;
    readonly options?: AnalyzeOptions;
}
export interface AnalyzeOptions {
    readonly mode?: "full" | "quick";
    readonly skipValidation?: boolean;
    readonly includeTrace?: boolean;
}
export interface AnalyzeTextOutput {
    readonly genomeFingerprint: string;
    readonly dnaRootHash: string;
    readonly emotionDistribution: Readonly<Record<Emotion14, number>>;
    readonly executionTrace?: ExecutionTrace;
}
export interface ValidateInputRequest {
    readonly content: string;
    readonly seed?: number;
    readonly mode?: SegmentMode;
    readonly meta?: InputMetadata;
}
export type SegmentMode = "auto" | "paragraph" | "sentence" | "fixed";
export interface InputMetadata {
    readonly sourceId?: string;
    readonly timestamp?: string;
}
export interface ValidateInputResult {
    readonly valid: boolean;
    readonly normalizedContent?: string;
    readonly rejectionCode?: string;
    readonly rejectionMessage?: string;
}
export interface BuildDNAInput {
    readonly validatedContent: string;
    readonly seed: number;
    readonly mode: SegmentMode;
}
export interface BuildDNAOutput {
    readonly rootHash: string;
    readonly nodeCount: number;
    readonly fingerprint: DNAFingerprint;
    readonly processingTimeMs: number;
}
export interface DNAFingerprint {
    readonly emotionDistribution: Readonly<Record<Emotion14, number>>;
    readonly oxygenHistogram: readonly number[];
    readonly hueHistogram: readonly number[];
    readonly stats: DNAStats;
}
export interface DNAStats {
    readonly avgOxygen: number;
    readonly maxOxygen: number;
    readonly minOxygen: number;
    readonly hypoxiaEvents: number;
    readonly hyperoxiaEvents: number;
    readonly climaxEvents: number;
}
export interface CompareInput {
    readonly fingerprintA: string;
    readonly fingerprintB: string;
    readonly weights?: CompareWeights;
}
export interface CompareWeights {
    readonly emotion: number;
    readonly style: number;
    readonly structure: number;
    readonly tempo: number;
}
export interface CompareOutput {
    readonly overallScore: number;
    readonly confidence: number;
    readonly byAxis: {
        readonly emotion: number;
        readonly style: number;
        readonly structure: number;
        readonly tempo: number;
    };
    readonly verdict: string;
}
export interface QueryGenomeInput {
    readonly fingerprint: string;
    readonly queryType: GenomeQueryType;
    readonly limit?: number;
}
export type GenomeQueryType = "similar" | "different" | "same_author_style" | "same_genre";
export interface QueryGenomeOutput {
    readonly matches: readonly GenomeMatch[];
    readonly totalSearched: number;
    readonly searchTimeMs: number;
}
export interface GenomeMatch {
    readonly fingerprint: string;
    readonly similarity: number;
    readonly metadata?: GenomeMetadata;
}
export interface GenomeMetadata {
    readonly title?: string;
    readonly author?: string;
    readonly genre?: string;
}
export declare function validateContentSize(content: string): boolean;
export declare function normalizeWeights(weights?: CompareWeights): CompareWeights;
//# sourceMappingURL=io.d.ts.map