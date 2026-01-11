/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — MODULE TRANSLATOR
 * Version: 0.3.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Inter-module data transformation.
 * INV-TRANS-03: Translation preserves semantic content.
 * INV-TRANS-04: Emotion type mapping is bijective.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { Emotion14 } from "../contracts/types.js";
import type { EmotionType } from "../adapters/mycelium-bio.adapter.js";
/**
 * Genome uses Emotion14 with "envy"
 * Bio uses EmotionType with "despair"
 *
 * Mapping strategy:
 * - Common emotions map directly
 * - "envy" (Genome) ↔ "despair" (Bio) are contextually distinct
 * - When translating, we preserve the original emotion if it exists in target
 * - For missing emotions, we map to closest semantic equivalent
 */
export declare const GENOME_TO_BIO_EMOTION: Readonly<Record<Emotion14, EmotionType>>;
export declare const BIO_TO_GENOME_EMOTION: Readonly<Record<EmotionType, Emotion14>>;
export interface NormalizedFingerprint {
    readonly type: "genome" | "bio" | "unified";
    readonly hash: string;
    readonly version: string;
    readonly emotions: Readonly<Record<string, number>>;
}
export declare class ModuleTranslator {
    /**
     * Translate Genome emotion distribution to Bio format
     * INV-TRANS-04: Bijective mapping (with approximation for envy/despair)
     */
    translateEmotionsGenomeToBio(distribution: Readonly<Record<Emotion14, number>>): Readonly<Record<EmotionType, number>>;
    /**
     * Translate Bio emotion distribution to Genome format
     */
    translateEmotionsBioToGenome(distribution: Readonly<Record<EmotionType, number>>): Readonly<Record<Emotion14, number>>;
    /**
     * Normalize fingerprint to unified format
     * INV-TRANS-03: Preserves semantic content
     */
    normalizeFingerprint(fingerprint: string, source: "genome" | "bio", version: string, emotions?: Readonly<Record<string, number>>): NormalizedFingerprint;
    /**
     * Compare fingerprints from different sources
     * Returns similarity score 0-1
     */
    compareCrossModule(genomeFp: string, bioFp: string): number;
    /**
     * Merge emotion distributions from multiple sources
     */
    mergeEmotionDistributions(distributions: Array<Readonly<Record<string, number>>>, weights?: number[]): Readonly<Record<Emotion14, number>>;
    private normalizeHash;
    private normalizeEmotionKeys;
    private normalizeWeights;
    private toEmotion14;
}
/**
 * Get the default module translator
 */
export declare function getModuleTranslator(): ModuleTranslator;
/**
 * Create a new module translator
 */
export declare function createModuleTranslator(): ModuleTranslator;
//# sourceMappingURL=module.d.ts.map