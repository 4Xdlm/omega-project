// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MYCELIUM BIO — TYPES v1.0.0 (L4-ready, 14D aligned)
// ═══════════════════════════════════════════════════════════════════════════════
// ALIGNÉ avec emotion_engine.ts OMEGA (14 émotions, pas 8)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ÉMOTIONS OFFICIELLES OMEGA (14, pas 8 Plutchik)
 * Source: emotion_engine.ts lignes 18-32
 */
export type EmotionType =
  | "joy"
  | "fear"
  | "anger"
  | "sadness"
  | "surprise"
  | "disgust"
  | "trust"
  | "anticipation"
  | "love"
  | "guilt"
  | "shame"
  | "pride"
  | "hope"
  | "despair";

export const EMOTION_TYPES: readonly EmotionType[] = [
  "joy", "fear", "anger", "sadness",
  "surprise", "disgust", "trust", "anticipation",
  "love", "guilt", "shame", "pride",
  "hope", "despair"
] as const;

export const EMOTION_COUNT = 14;

/**
 * ÉTAT ÉMOTIONNEL OFFICIEL OMEGA
 * Source: emotion_engine.ts lignes 34-42
 * 5 paramètres physiques: mass, intensity, inertia, decay_rate, baseline
 */
export interface EmotionState {
  type: EmotionType;
  mass: number;           // 0.1-10.0 (légère → massive)
  intensity: number;      // 0.0-1.0 (calme → intense)
  inertia: number;        // 0.0-1.0 (réactif → lent à changer)
  decay_rate: number;     // 0.01-0.5 (vitesse retour au baseline)
  baseline: number;       // 0.0-1.0 (niveau "normal")
}

/**
 * ÉTAT ÉMOTIONNEL NEUTRE (14D)
 * Toutes émotions à baseline 0.2, mass 1.0
 */
export const NEUTRAL_EMOTION_STATE: EmotionState = Object.freeze({
  type: "joy" as EmotionType,
  mass: 1.0,
  intensity: 0.2,
  inertia: 0.28,
  decay_rate: 0.1,
  baseline: 0.2
});

/**
 * RECORD ÉMOTIONNEL 14D
 * Record, pas Map (sérialisation JSON stable)
 */
export type EmotionRecord14 = Readonly<Record<EmotionType, EmotionState>>;

/**
 * INTENSITÉS SIMPLIFIÉES 14D
 * Pour fingerprint et calculs rapides
 */
export type IntensityRecord14 = Readonly<Record<EmotionType, number>>;

// ─────────────────────────────────────────────────────────────────────────────
// EMOTION FIELD (Champ Émotionnel dérivé)
// ─────────────────────────────────────────────────────────────────────────────

export interface EmotionField {
  /** États complets 14D */
  states: EmotionRecord14;

  /** Intensités normalisées (Σ = 1.0) */
  normalizedIntensities: IntensityRecord14;

  /** Émotion dominante (argmax intensity) */
  dominant: EmotionType;

  /** Peak intensity (max) */
  peak: number;

  /** Énergie totale: Σ(intensity × mass) */
  totalEnergy: number;

  /** Entropie Shannon normalisée: -Σ(p×log(p)) / log(14) */
  entropy: number;

  /** Contraste vs segment précédent: L1 distance / 2 */
  contrast: number;

  /** Inertie dominante (basée sur émotion dominante) */
  inertia: number;

  /** Delta conservation: |E(t) - E(t-1)| / E(t-1) */
  conservationDelta: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// BIO ENGINE (Oxygène Narratif)
// ─────────────────────────────────────────────────────────────────────────────

export interface OxygenResult {
  /** O₂ base: α×emotions + β×events + γ×contrast */
  base: number;

  /** O₂ après decay temporel */
  decayed: number;

  /** O₂ final (après boost éventuel) */
  final: number;

  /** Composantes du calcul */
  components: {
    emotionScore: number;
    eventBoost: number;
    contrastScore: number;
    decayFactor: number;
    relief: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MORPHO ENGINE (Direction, Couleur, Branches)
// ─────────────────────────────────────────────────────────────────────────────

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface HSL {
  /** Hue: 0-360° (émotion dominante) */
  h: number;
  /** Saturation: 0-1 (intensité) */
  s: number;
  /** Lightness: 0-1 (O₂ narratif) */
  l: number;
}

export type MarkerType = "MUSHROOM" | "BLOOM" | "SCAR" | "PAYOFF";
export type MarkerReason = "RECOVERY" | "EVENT_BOOST" | "MANUAL_BOOST" | "BLEED" | "RESOLUTION";

export interface BioMarker {
  type: MarkerType;
  reason: MarkerReason;
  strength: number;         // 0..1
  sentenceIndex: number;
  hashRef: string;          // Leaf hash référence
}

// ─────────────────────────────────────────────────────────────────────────────
// MYCELIUM NODE (Nœud du réseau)
// ─────────────────────────────────────────────────────────────────────────────

export type MyceliumNodeKind = "book" | "chapter" | "paragraph" | "sentence" | "word";

export interface MyceliumNode {
  /** ID déterministe (hash content + position) */
  id: string;

  /** Type de nœud */
  kind: MyceliumNodeKind;

  /** Niveau hiérarchique: 0=book, 1=chapter/paragraph, 2=sentence, 3=word */
  level: 0 | 1 | 2 | 3;

  /** Parent ID (undefined pour book) */
  parentId?: string;

  // ─── MATIÈRE (Texte) ───
  /** Gématrie: Σ(A=1..Z=26) */
  gematriaSum: number;

  /** Poids branche: log1p(gematria) × amplificateur */
  branchWeight: number;

  /** Épaisseur visuelle: 0..1 */
  thickness: number;

  // ─── ÂME (Émotion) ───
  /** Champ émotionnel complet */
  emotionField: EmotionField;

  /** Raccourci: émotion dominante */
  emotionDominant: EmotionType;

  /** Raccourci: intensité du dominant */
  emotionIntensity: number;

  // ─── SANG (Oxygène) ───
  /** O₂ narratif: 0..1 */
  oxygen: number;

  /** Direction 3D normalisée */
  direction: Vector3;

  /** Couleur HSL */
  color: HSL;

  /** Marqueurs biologiques */
  markers: readonly BioMarker[];

  // ─── POSITION ───
  /** Index phrase dans le livre */
  sentenceIndex?: number;

  /** Index mot dans la phrase */
  wordIndex?: number;

  // ─── PREUVE ───
  /** Hash du nœud (pour Merkle) */
  nodeHash: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FINGERPRINT (Empreinte unique)
// ─────────────────────────────────────────────────────────────────────────────

export interface MyceliumFingerprint {
  /** Distribution émotions (14 bins, Σ=1) */
  emotionDistribution: IntensityRecord14;

  /** Histogramme O₂ (20 bins: 0-5%, 5-10%, ..., 95-100%) */
  oxygenHistogram: readonly number[];

  /** Histogramme Hue (24 bins: 0-15°, 15-30°, ..., 345-360°) */
  hueHistogram: readonly number[];

  /** Statistiques clés */
  stats: {
    avgOxygen: number;
    maxOxygen: number;
    minOxygen: number;
    hypoxiaEvents: number;    // O₂ < 0.2
    hyperoxiaEvents: number;  // O₂ > 0.9
    climaxEvents: number;     // O₂ > 0.85
    fruitCount: number;       // Champignons (MUSHROOM)
    scarCount: number;        // Cicatrices (SCAR)
  };

  /** Respiration narrative */
  breathing: {
    avgInhaleExhaleRatio: number;
    rhythmVariance: number;
    avgConservationDelta: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MYCELIUM DNA (Carte d'identité unique)
// ─────────────────────────────────────────────────────────────────────────────

export interface MyceliumDNA {
  /** Version du format */
  version: "1.0.0";

  /** Profil certification */
  profile: "L4";

  /** Seed déterministe (défaut: 42) */
  seed: number;

  /** Hash SHA256 du texte source */
  sourceHash: string;

  /** Fingerprint émotionnel */
  fingerprint: MyceliumFingerprint;

  /** Nœuds complets (ordonnés par sentenceIndex) */
  nodes: readonly MyceliumNode[];

  /** Merkle root (preuve déterministe) */
  rootHash: string;

  /** Métadonnées (HORS hash) */
  meta: {
    computedAt: string;       // ISO timestamp
    nodeCount: number;
    processingTimeMs: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMILARITÉ (Fragrances de l'Âme)
// ─────────────────────────────────────────────────────────────────────────────

export interface SimilarityResult {
  /** Score global: 0..1 */
  score: number;

  /** Détail par composante */
  components: {
    emotionSimilarity: number;
    oxygenSimilarity: number;
    hueSimilarity: number;
  };

  /** Classification fragrance */
  fragrance: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTION 14D → 8D (Vue cockpit optionnelle)
// ─────────────────────────────────────────────────────────────────────────────

export type PlutchikType =
  | "joy" | "trust" | "fear" | "surprise"
  | "sadness" | "disgust" | "anger" | "anticipation";

export const PLUTCHIK_TYPES: readonly PlutchikType[] = [
  "joy", "trust", "fear", "surprise",
  "sadness", "disgust", "anger", "anticipation"
] as const;

/**
 * MAPPING 14D → 8D (Projection UI)
 * Les émotions secondaires sont mappées vers leur parent Plutchik
 */
export const EMOTION_14_TO_8: Record<EmotionType, PlutchikType> = {
  joy: "joy",
  fear: "fear",
  anger: "anger",
  sadness: "sadness",
  surprise: "surprise",
  disgust: "disgust",
  trust: "trust",
  anticipation: "anticipation",
  // Secondaires → Parent
  love: "joy",         // love ≈ joy + trust
  guilt: "sadness",    // guilt ≈ sadness + fear
  shame: "sadness",    // shame ≈ sadness + disgust
  pride: "joy",        // pride ≈ joy + anger
  hope: "anticipation",// hope ≈ anticipation + joy
  despair: "sadness"   // despair ≈ sadness + fear
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES PHYSIQUES
// ─────────────────────────────────────────────────────────────────────────────

export const PHYSICS = {
  /** Coefficients O₂: α×emotions + β×events + γ×contrast */
  OXYGEN_ALPHA: 0.55,
  OXYGEN_BETA: 0.25,
  OXYGEN_GAMMA: 0.20,

  /** Decay logarithmique: λ dans 1/(1 + λ×log1p(streak)) */
  DECAY_LAMBDA: 0.35,

  /** Seuils O₂ */
  HYPOXIA_THRESHOLD: 0.20,
  HYPEROXIA_THRESHOLD: 0.90,
  CLIMAX_THRESHOLD: 0.85,

  /** Conservation: delta max autorisé (5%) */
  CONSERVATION_MAX_DELTA: 0.05,

  /** Entropie: log(14) pour normalisation */
  ENTROPY_LOG_BASE: Math.log(14),

  /** Bins histogrammes */
  OXYGEN_HISTOGRAM_BINS: 20,
  HUE_HISTOGRAM_BINS: 24
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────════════════════════════════════════

export default {
  EMOTION_TYPES,
  EMOTION_COUNT,
  PLUTCHIK_TYPES,
  EMOTION_14_TO_8,
  PHYSICS,
  NEUTRAL_EMOTION_STATE
};
