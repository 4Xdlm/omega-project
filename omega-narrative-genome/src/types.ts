/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NARRATIVE GENOME — TYPES
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
 * ║  - Nouvelle version MAJEURE de Narrative Genome (v2.0.0)           ║
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

/**
 * Liste ordonnée des émotions (pour sérialisation canonique)
 * ORDRE ALPHABÉTIQUE — NE PAS MODIFIER
 */
export const EMOTION14_ORDERED: readonly Emotion14[] = [
  "anger",
  "anticipation",
  "disgust",
  "envy",
  "fear",
  "guilt",
  "hope",
  "joy",
  "love",
  "pride",
  "sadness",
  "shame",
  "surprise",
  "trust",
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// AXES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AXE 1: EMOTION
 * Signature émotionnelle de l'œuvre
 */
export interface EmotionAxis {
  /** Distribution des 14 émotions [0,1], somme = 1.0 */
  readonly distribution: Readonly<Record<Emotion14, number>>;
  
  /** Top 5 transitions dominantes */
  readonly dominantTransitions: readonly EmotionTransition[];
  
  /** Courbe de tension (10 points normalisés [0,1]) */
  readonly tensionCurve: readonly number[];
  
  /** Valence moyenne [-1, +1] */
  readonly averageValence: number;
}

export interface EmotionTransition {
  readonly from: Emotion14;
  readonly to: Emotion14;
  readonly frequency: number; // [0,1]
}

/**
 * AXE 2: STYLE
 * Empreinte stylistique
 */
export interface StyleAxis {
  /** Variété longueur phrases [0,1] */
  readonly burstiness: number;
  
  /** Imprévisibilité lexicale [0,1] */
  readonly perplexity: number;
  
  /** Micro-imperfections [0,1] */
  readonly humanTouch: number;
  
  /** Diversité vocabulaire [0,1] */
  readonly lexicalRichness: number;
  
  /** Longueur moyenne phrase normalisée [0,1] */
  readonly averageSentenceLength: number;
  
  /** Ratio dialogues [0,1] */
  readonly dialogueRatio: number;
}

/**
 * AXE 3: STRUCTURE
 * Architecture narrative
 */
export interface StructureAxis {
  /** Nombre de chapitres (normalisé) */
  readonly chapterCount: number;
  
  /** Longueur moyenne chapitre [0,1] */
  readonly averageChapterLength: number;
  
  /** Position incident déclencheur [0,1] */
  readonly incitingIncident: number;
  
  /** Position midpoint [0,1] */
  readonly midpoint: number;
  
  /** Position climax [0,1] */
  readonly climax: number;
  
  /** Nombre de POV (normalisé) */
  readonly povCount: number;
  
  /** Complexité timeline [0,1] */
  readonly timelineComplexity: number;
}

/**
 * AXE 4: TEMPO
 * Rythme et pacing
 */
export interface TempoAxis {
  /** Pacing global [0,1] (lent → rapide) */
  readonly averagePace: number;
  
  /** Variance du pacing [0,1] */
  readonly paceVariance: number;
  
  /** Densité action [0,1] */
  readonly actionDensity: number;
  
  /** Densité dialogues [0,1] */
  readonly dialogueDensity: number;
  
  /** Densité descriptions [0,1] */
  readonly descriptionDensity: number;
  
  /** Cycles respiratoires (normalisé) */
  readonly breathingCycles: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENOME
// ═══════════════════════════════════════════════════════════════════════════════

/** Fingerprint = 64 caractères hex lowercase */
export type GenomeFingerprint = string;

/**
 * Métadonnées d'extraction
 * NON HASHÉES — ne participent pas au fingerprint
 */
export interface ExtractionMetadata {
  /** Timestamp d'extraction (ISO 8601) */
  readonly extractedAt: string;
  
  /** Version de l'extracteur */
  readonly extractorVersion: string;
  
  /** Seed utilisé */
  readonly seed: number;
}

/**
 * Genome complet d'une œuvre narrative
 * 
 * INV-GEN-02: fingerprint = SHA256(canonical(version + sourceHash + axes))
 * INV-GEN-11: metadata HORS fingerprint
 */
export interface NarrativeGenome {
  /** Version du format (entre dans fingerprint) */
  readonly version: "1.2.0";
  
  /** rootHash de l'œuvre source (entre dans fingerprint) */
  readonly sourceHash: string;
  
  /** Les 4 axes (entrent dans fingerprint) */
  readonly axes: {
    readonly emotion: EmotionAxis;
    readonly style: StyleAxis;
    readonly structure: StructureAxis;
    readonly tempo: TempoAxis;
  };
  
  /** SHA-256 de: canonical(version + sourceHash + axes) */
  readonly fingerprint: GenomeFingerprint;
  
  /** Métadonnées — N'ENTRENT PAS dans le fingerprint */
  readonly metadata: ExtractionMetadata;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMILARITÉ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verdicts de similarité
 */
export type SimilarityVerdict =
  | "IDENTICAL"      // score >= 0.99
  | "VERY_SIMILAR"   // score >= 0.85
  | "SIMILAR"        // score >= 0.70
  | "DIFFERENT"      // score >= 0.30
  | "UNIQUE";        // score < 0.30

/**
 * Résultat de similarité
 * 
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  DISCLAIMER JURIDIQUE                                              ║
 * ║                                                                    ║
 * ║  La similarité est un INDICATEUR PROBABILISTE.                     ║
 * ║  Elle n'est PAS une preuve légale de plagiat.                      ║
 * ║                                                                    ║
 * ║  Usage recommandé: aide à la décision, pré-filtrage, analytics     ║
 * ║  Usage INTERDIT sans expertise humaine: accusations, actions       ║
 * ║  juridiques, décisions automatisées à impact légal                 ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */
export interface SimilarityResult {
  /** Score global [0,1] */
  readonly score: number;
  
  /** Confiance [0,1] */
  readonly confidence: number;
  
  /** Verdict humain-lisible */
  readonly verdict: SimilarityVerdict;
  
  /** Rappel explicite */
  readonly disclaimer: "INDICATEUR_PROBABILISTE_NON_PREUVE_LEGALE";
}

/**
 * Comparaison détaillée par axe
 */
export interface DetailedComparison {
  /** Score global [0,1] */
  readonly overall: number;
  
  /** Scores par axe */
  readonly byAxis: {
    readonly emotion: number;
    readonly style: number;
    readonly structure: number;
    readonly tempo: number;
  };
  
  /** Poids utilisés */
  readonly weights: SimilarityWeights;
}

/**
 * Poids de similarité
 */
export interface SimilarityWeights {
  readonly emotion: number;
  readonly style: number;
  readonly structure: number;
  readonly tempo: number;
}

/**
 * Match trouvé dans le registry
 */
export interface SimilarMatch {
  readonly fingerprint: GenomeFingerprint;
  readonly similarity: number;
  readonly metadata?: {
    readonly title?: string;
    readonly author?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE (interface avec OMEGA existant)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interface avec le DNA OMEGA existant
 * (à adapter selon l'implémentation réelle)
 */
export interface OmegaDNA {
  readonly rootHash: string;
  readonly emotionData: unknown;
  readonly styleData: unknown;
  readonly structureData: unknown;
  readonly tempoData: unknown;
}
