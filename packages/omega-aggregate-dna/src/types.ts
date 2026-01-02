// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — AGGREGATE DNA v1.0.0 — TYPES
// ═══════════════════════════════════════════════════════════════════════════════
// Agrégation de MyceliumDNA segments → DNA global
// Standard: NASA-Grade L4 / AS9100D / DO-178C Level A
// Pattern: Adapter (indépendant du type DNA concret)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 14 émotions OMEGA officielles
 * Source: MyceliumDNA types.ts
 */
export type EmotionType =
  | "joy" | "fear" | "anger" | "sadness"
  | "surprise" | "disgust" | "trust" | "anticipation"
  | "love" | "guilt" | "shame" | "pride"
  | "hope" | "despair";

export const EMOTION_TYPES: readonly EmotionType[] = Object.freeze([
  "joy", "fear", "anger", "sadness",
  "surprise", "disgust", "trust", "anticipation",
  "love", "guilt", "shame", "pride",
  "hope", "despair"
]);

export const EMOTION_COUNT = 14;

/**
 * Statistiques textuelles basiques
 */
export interface TextStats {
  word_count: number;
  char_count: number;
  line_count: number;
}

/**
 * Champ émotionnel simplifié (14D)
 * Chaque émotion a des propriétés numériques (intensity, mass, etc.)
 */
export type EmotionField = Record<EmotionType, Record<string, number>>;

/**
 * Interface minimaliste que tout DNA doit exposer
 */
export interface DNACore {
  rootHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTER PATTERN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ADAPTER — Interface d'extraction/injection pour tout type DNA
 * 
 * Permet à l'agrégateur de fonctionner indépendamment du format DNA concret.
 * Implémente ceci pour ton type MyceliumDNA spécifique.
 */
export interface AggregateAdapter<DNA extends DNACore> {
  /**
   * Extrait le champ émotionnel d'un DNA
   * @returns Record<EmotionType, Record<string, number>>
   */
  extractEmotionField(dna: DNA): EmotionField;

  /**
   * Extrait les statistiques textuelles
   */
  extractTextStats(dna: DNA): TextStats;

  /**
   * Extrait le root hash
   */
  extractRootHash(dna: DNA): string;

  /**
   * Extrait le seed
   */
  extractSeed(dna: DNA): number;

  /**
   * Construit un DNA agrégé à partir des composants
   */
  makeAggregatedDNA(args: AggregatedDNAArgs<DNA>): DNA;
}

/**
 * Arguments pour construire un DNA agrégé
 */
export interface AggregatedDNAArgs<DNA extends DNACore> {
  /** DNA template (pour copier la structure) */
  template: DNA;

  /** Champ émotionnel fusionné */
  mergedEmotionField: EmotionField;

  /** Stats textuelles sommées */
  mergedTextStats: TextStats;

  /** Seed (doit être identique pour tous les segments) */
  seed: number;

  /** Métadonnées d'agrégation */
  aggregation: AggregationMetadata;
}

/**
 * Métadonnées d'agrégation (ajoutées au DNA final)
 */
export interface AggregationMetadata {
  /** Nombre de segments agrégés */
  segment_count: number;

  /** Root hashes des segments (ordre préservé) */
  segment_root_hashes: readonly string[];

  /** Merkle root des segment hashes */
  merkle_root: string;

  /** Hash de la segmentation (optionnel, du SegmentEngine) */
  segmentation_hash: string | null;

  /** Méthode de pondération */
  weighting: "word_count";

  /** Version de l'agrégateur */
  aggregator_version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT/OUTPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input pour l'agrégation
 */
export interface AggregateInput<DNA extends DNACore> {
  /** Seed (doit être identique pour tous les segments) */
  seed: number;

  /** Version du format DNA */
  version: string;

  /** DNAs des segments à agréger */
  segmentDNAs: readonly DNA[];

  /** Poids par segment (optionnel, sinon utilise textStats.word_count) */
  segmentWeights?: readonly number[];

  /** Hash de segmentation (du SegmentEngine) */
  segmentationHash?: string;
}

/**
 * Résultat de l'agrégation
 */
export interface AggregateResult<DNA extends DNACore> {
  /** DNA agrégé final */
  dna: DNA;

  /** Métadonnées d'agrégation (pour audit) */
  aggregation: AggregationMetadata;

  /** Statistiques de l'agrégation */
  stats: {
    total_segments: number;
    total_words: number;
    total_chars: number;
    total_lines: number;
    processing_time_ms: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  EMOTION_TYPES,
  EMOTION_COUNT,
};
