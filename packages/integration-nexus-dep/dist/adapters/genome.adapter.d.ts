/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — GENOME ADAPTER
 * Version: 0.1.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * READ-ONLY adapter for @omega/genome (SANCTUARY)
 * INV-NEXUS-01: No mutations allowed
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { NexusAdapter, AdapterHealthResult, Emotion14, SimilarityResult } from "../contracts/types.js";
export interface GenomeAxisData {
    readonly emotion: {
        readonly distribution: Readonly<Record<Emotion14, number>>;
        readonly dominantTransitions: readonly EmotionTransition[];
        readonly tensionCurve: readonly number[];
        readonly averageValence: number;
    };
    readonly style: {
        readonly burstiness: number;
        readonly perplexity: number;
        readonly humanTouch: number;
        readonly lexicalRichness: number;
        readonly averageSentenceLength: number;
        readonly dialogueRatio: number;
    };
    readonly structure: {
        readonly chapterCount: number;
        readonly averageChapterLength: number;
        readonly incitingIncident: number;
        readonly midpoint: number;
        readonly climax: number;
        readonly povCount: number;
        readonly timelineComplexity: number;
    };
    readonly tempo: {
        readonly averagePace: number;
        readonly paceVariance: number;
        readonly actionDensity: number;
        readonly dialogueDensity: number;
        readonly descriptionDensity: number;
        readonly breathingCycles: number;
    };
}
export interface EmotionTransition {
    readonly from: Emotion14;
    readonly to: Emotion14;
    readonly frequency: number;
}
export interface NarrativeGenomeData {
    readonly version: string;
    readonly sourceHash: string;
    readonly axes: GenomeAxisData;
    readonly fingerprint: string;
    readonly metadata: {
        readonly extractedAt: string;
        readonly extractorVersion: string;
        readonly seed: number;
    };
}
export declare class GenomeAdapter implements NexusAdapter {
    readonly name = "genome";
    readonly version = "1.2.0";
    readonly isReadOnly: true;
    private readonly sanctuaryPath;
    constructor(sanctuaryPath?: string);
    /**
     * Check adapter health
     */
    checkHealth(): Promise<AdapterHealthResult>;
    /**
     * Analyze text and produce NarrativeGenome
     * SKELETON: Full implementation in Phase 44+
     */
    analyzeText(content: string, seed?: number): Promise<NarrativeGenomeData>;
    /**
     * Compute fingerprint from genome data
     */
    computeFingerprint(content: string, seed: number): Promise<string>;
    /**
     * Compare two genomes for similarity
     */
    compareSimilarity(a: NarrativeGenomeData, b: NarrativeGenomeData): Promise<SimilarityResult>;
    private computeHash;
    private createEmptyAxes;
}
//# sourceMappingURL=genome.adapter.d.ts.map