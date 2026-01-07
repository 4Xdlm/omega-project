/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — PUBLIC TYPES
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION14 — SANCTUARISÉ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Les 14 émotions canoniques OMEGA
 * 
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  SANCTUARISÉ — FROZEN                                              ║
 * ║  Référence: Emotion v2 (Post-Plutchik) — OMEGA canonical model     ║
 * ║                                                                    ║
 * ║  Toute modification de cette liste implique:                       ║
 * ║  - Nouvelle version MAJEURE (v2.0.0)                               ║
 * ║  - Migration obligatoire des fingerprints existants                ║
 * ║  - Validation Francky (Architecte Suprême)                         ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */
export type Emotion14 =
  | "joy"
  | "sadness"
  | "anger"
  | "fear"
  | "surprise"
  | "disgust"
  | "trust"
  | "anticipation"
  | "love"
  | "guilt"
  | "shame"
  | "pride"
  | "envy"
  | "hope";

// ═══════════════════════════════════════════════════════════════════════════════
// AXES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmotionAxis {
  readonly distribution: Readonly<Record<Emotion14, number>>;
  readonly dominantTransitions: readonly EmotionTransition[];
  readonly tensionCurve: readonly number[];
  readonly averageValence: number;
}

export interface EmotionTransition {
  readonly from: Emotion14;
  readonly to: Emotion14;
  readonly frequency: number;
}

export interface StyleAxis {
  readonly burstiness: number;
  readonly perplexity: number;
  readonly humanTouch: number;
  readonly lexicalRichness: number;
  readonly averageSentenceLength: number;
  readonly dialogueRatio: number;
}

export interface StructureAxis {
  readonly chapterCount: number;
  readonly averageChapterLength: number;
  readonly incitingIncident: number;
  readonly midpoint: number;
  readonly climax: number;
  readonly povCount: number;
  readonly timelineComplexity: number;
}

export interface TempoAxis {
  readonly averagePace: number;
  readonly paceVariance: number;
  readonly actionDensity: number;
  readonly dialogueDensity: number;
  readonly descriptionDensity: number;
  readonly breathingCycles: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENOME
// ═══════════════════════════════════════════════════════════════════════════════

export type GenomeFingerprint = string;

export interface ExtractionMetadata {
  readonly extractedAt: string;
  readonly extractorVersion: string;
  readonly seed: number;
}

export interface NarrativeGenome {
  readonly version: "1.2.0";
  readonly sourceHash: string;
  readonly axes: {
    readonly emotion: EmotionAxis;
    readonly style: StyleAxis;
    readonly structure: StructureAxis;
    readonly tempo: TempoAxis;
  };
  readonly fingerprint: GenomeFingerprint;
  readonly metadata: ExtractionMetadata;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMILARITY
// ═══════════════════════════════════════════════════════════════════════════════

export type SimilarityVerdict =
  | "IDENTICAL"
  | "VERY_SIMILAR"
  | "SIMILAR"
  | "DIFFERENT"
  | "UNIQUE";

/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  DISCLAIMER JURIDIQUE                                              ║
 * ║  La similarité est un INDICATEUR PROBABILISTE.                     ║
 * ║  Elle n'est PAS une preuve légale de plagiat.                      ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */
export interface SimilarityResult {
  readonly score: number;
  readonly confidence: number;
  readonly verdict: SimilarityVerdict;
  readonly disclaimer: "INDICATEUR_PROBABILISTE_NON_PREUVE_LEGALE";
}

export interface DetailedComparison {
  readonly overall: number;
  readonly byAxis: {
    readonly emotion: number;
    readonly style: number;
    readonly structure: number;
    readonly tempo: number;
  };
  readonly weights: SimilarityWeights;
}

export interface SimilarityWeights {
  readonly emotion: number;
  readonly style: number;
  readonly structure: number;
  readonly tempo: number;
}

export interface SimilarMatch {
  readonly fingerprint: GenomeFingerprint;
  readonly similarity: number;
  readonly metadata?: {
    readonly title?: string;
    readonly author?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface OmegaDNA {
  readonly rootHash: string;
  readonly emotionData: unknown;
  readonly styleData: unknown;
  readonly structureData: unknown;
  readonly tempoData: unknown;
}

export interface AnalyzeOptions {
  readonly seed?: number;
}
