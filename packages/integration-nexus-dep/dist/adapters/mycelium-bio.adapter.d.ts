/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — MYCELIUM-BIO ADAPTER
 * Version: 0.1.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * READ-ONLY adapter for @omega/mycelium-bio (SANCTUARY)
 * INV-NEXUS-01: No mutations allowed
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { NexusAdapter, AdapterHealthResult, Emotion14, SimilarityResult } from "../contracts/types.js";
import type { BuildDNAInput, BuildDNAOutput } from "../contracts/io.js";
export type EmotionType = Emotion14 | "despair";
export interface EmotionField {
    readonly dominant: EmotionType;
    readonly peak: number;
    readonly totalEnergy: number;
    readonly entropy: number;
    readonly contrast: number;
    readonly inertia: number;
    readonly conservationDelta: number;
}
export interface MyceliumNode {
    readonly id: string;
    readonly kind: "book" | "chapter" | "paragraph" | "sentence" | "word";
    readonly level: 0 | 1 | 2 | 3;
    readonly parentId?: string;
    readonly gematriaSum: number;
    readonly branchWeight: number;
    readonly thickness: number;
    readonly emotionField: EmotionField;
    readonly emotionDominant: EmotionType;
    readonly emotionIntensity: number;
    readonly oxygen: number;
    readonly nodeHash: string;
}
export interface MyceliumDNA {
    readonly version: "1.0.0";
    readonly profile: "L4";
    readonly seed: number;
    readonly sourceHash: string;
    readonly fingerprint: MyceliumFingerprint;
    readonly nodes: readonly MyceliumNode[];
    readonly rootHash: string;
    readonly meta: {
        readonly computedAt: string;
        readonly nodeCount: number;
        readonly processingTimeMs: number;
    };
}
export interface MyceliumFingerprint {
    readonly emotionDistribution: Readonly<Record<EmotionType, number>>;
    readonly oxygenHistogram: readonly number[];
    readonly hueHistogram: readonly number[];
    readonly stats: {
        readonly avgOxygen: number;
        readonly maxOxygen: number;
        readonly minOxygen: number;
        readonly hypoxiaEvents: number;
        readonly hyperoxiaEvents: number;
        readonly climaxEvents: number;
        readonly fruitCount: number;
        readonly scarCount: number;
    };
}
export declare class MyceliumBioAdapter implements NexusAdapter {
    readonly name = "mycelium-bio";
    readonly version = "1.0.0";
    readonly isReadOnly: true;
    private readonly sanctuaryPath;
    constructor(sanctuaryPath?: string);
    /**
     * Check adapter health
     */
    checkHealth(): Promise<AdapterHealthResult>;
    /**
     * Build DNA from validated input
     * SKELETON: Full implementation in Phase 44+
     */
    buildDNA(input: BuildDNAInput): Promise<BuildDNAOutput>;
    /**
     * Compute full MyceliumDNA
     * SKELETON: Returns minimal structure
     */
    computeDNA(content: string, seed: number): Promise<MyceliumDNA>;
    /**
     * Compare two DNA fingerprints (fragrance comparison)
     */
    compareFragrance(a: MyceliumDNA, b: MyceliumDNA): Promise<SimilarityResult>;
    /**
     * Extract fingerprint from DNA
     */
    extractFingerprint(dna: MyceliumDNA): MyceliumFingerprint;
    private computeHash;
    private computeRootHash;
    private createEmptyFingerprint;
    private createEmptyBioFingerprint;
}
//# sourceMappingURL=mycelium-bio.adapter.d.ts.map