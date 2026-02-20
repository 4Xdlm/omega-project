// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — Types alignes sur OMEGA EMOTION 14D
// ═══════════════════════════════════════════════════════════════════════════════
// ALIGNEMENT: Utilise les types REELS du repo (mycelium-bio), pas V4.4 16D spec
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────────
// RE-EXPORT des types REELS du repo (source of truth)
// ─────────────────────────────────────────────────────────────────────────────────

// Note: Ces imports seront resolus via tsconfig paths ou chemins relatifs
// Pour l'instant, on re-declare les types pour eviter les problemes de build

/**
 * EMOTIONS OFFICIELLES OMEGA (14D)
 * Source: packages/mycelium-bio/src/types.ts
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
 * ETAT EMOTIONNEL OFFICIEL OMEGA
 * 5 parametres physiques: mass, intensity, inertia, decay_rate, baseline
 */
export interface EmotionState {
  type: EmotionType;
  mass: number;           // 0.1-10.0 (legere -> massive)
  intensity: number;      // 0.0-1.0 (calme -> intense)
  inertia: number;        // 0.0-1.0 (reactif -> lent a changer)
  decay_rate: number;     // 0.01-0.5 (vitesse retour au baseline)
  baseline: number;       // 0.0-1.0 (niveau "normal")
}

/**
 * RECORD EMOTIONNEL 14D
 */
export type EmotionRecord14 = Readonly<Record<EmotionType, EmotionState>>;

/**
 * INTENSITES SIMPLIFIEES 14D
 */
export type IntensityRecord14 = Readonly<Record<EmotionType, number>>;

/**
 * CHAMP EMOTIONNEL (derive)
 */
export interface EmotionField {
  states: EmotionRecord14;
  normalizedIntensities: IntensityRecord14;
  dominant: EmotionType;
  peak: number;
  totalEnergy: number;
  entropy: number;
  contrast: number;
  inertia: number;
  conservationDelta: number;
}

/**
 * RESULTAT OXYGENE
 */
export interface OxygenResult {
  base: number;
  decayed: number;
  final: number;
  components: {
    emotionScore: number;
    eventBoost: number;
    contrastScore: number;
    decayFactor: number;
    relief: number;
  };
}

/**
 * CONSTANTES PHYSIQUES
 */
export const PHYSICS = {
  OXYGEN_ALPHA: 0.55,
  OXYGEN_BETA: 0.25,
  OXYGEN_GAMMA: 0.20,
  DECAY_LAMBDA: 0.35,
  HYPOXIA_THRESHOLD: 0.20,
  HYPEROXIA_THRESHOLD: 0.90,
  CLIMAX_THRESHOLD: 0.85,
  CONSERVATION_MAX_DELTA: 0.05,
  ENTROPY_LOG_BASE: Math.log(14),
  OXYGEN_HISTOGRAM_BINS: 20,
  HUE_HISTOGRAM_BINS: 24
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE — TYPES SPECIFIQUES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INPUT: TruthBundle (SOURCE OF TRUTH)
 * Aligne sur EmotionField + OxygenResult du repo
 */
export interface TruthBundle {
  // Metadonnees
  id: string;
  timestamp: string; // ISO 8601
  sourceHash: string; // SHA-256 du texte source
  bundleHash: string; // SHA-256 du bundle complet

  // Schema ID (14D, pas 16D)
  vectorSchemaId: 'OMEGA_EMOTION_14D_v1.0.0';

  // Etat emotionnel cible (14D)
  targetEmotionField: EmotionField;

  // Oxygene cible
  targetOxygenResult: OxygenResult;

  // Timeline optionnelle (pour narratifs longs)
  timeline?: TimelineFrame[];

  // Contraintes additionnelles
  constraints?: TruthConstraints;
}

export interface TimelineFrame {
  t: number; // Position temporelle [0, 1]
  emotionField: EmotionField;
  oxygenResult: OxygenResult;
  label?: string; // "intro", "climax", "resolution", etc.
}

export interface TruthConstraints {
  // Emotions obligatoires
  requiredEmotions?: EmotionType[];

  // Emotions interdites
  forbiddenEmotions?: EmotionType[];

  // Bornes O2
  minOxygen?: number;
  maxOxygen?: number;

  // Bornes entropie
  minEntropy?: number;
  maxEntropy?: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRANSLATOR OUTPUT: EmotionTrajectoryContract
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Contrat de trajectoire emotionnelle
 * Genere par le Translator depuis TruthBundle
 */
export interface EmotionTrajectoryContract {
  // Fenetres temporelles avec targets 14D
  windows: TrajectoryWindow[];

  // Marqueurs respiration derives de O2
  breathingMarkers: BreathingMarker[];

  // Contraintes d'evolution (derivees des parametres EmotionState)
  evolutionConstraints: EvolutionConstraint[];

  // Hash du TruthBundle source
  truthHash: string;

  // Metadata
  generatedAt: string;
}

export interface TrajectoryWindow {
  // Position temporelle
  tStart: number; // [0, 1]
  tEnd: number;   // [0, 1]

  // Label optionnel
  label?: string;

  // Emotion dominante cible dans cette fenetre
  targetDominant: EmotionType;

  // Targets 14D (intensites normalisees)
  targetIntensities: IntensityRecord14;

  // Tolerances
  tolerances: {
    dominantTolerance: number;      // Tolerance sur peak du dominant
    distributionTolerance: number;  // Tolerance cosinus sur distribution
    entropyTolerance: number;       // Tolerance sur entropie
  };

  // O2 cible pour cette fenetre
  targetOxygen: {
    min: number;
    max: number;
  };
}

export interface BreathingMarker {
  t: number; // Position temporelle
  type: 'PAUSE' | 'RUPTURE' | 'CLIMAX' | 'RELEASE' | 'HYPOXIA' | 'HYPEROXIA';
  intensity: number; // Derive de O2.delta ou seuils
  sourceOxygen: number; // Valeur O2 a ce point
}

export interface EvolutionConstraint {
  emotionId: EmotionType;

  // Derives des parametres EmotionState
  maxVelocity: number;    // Derive de inertia (1 - inertia)
  decayRate: number;      // decay_rate direct
  massInfluence: number;  // Influence de mass sur transitions
}

// ─────────────────────────────────────────────────────────────────────────────────
// PRISM: Injection creative controlee
// ─────────────────────────────────────────────────────────────────────────────────

export interface PrismConstraints {
  // Distribution protegee (ne peut etre violee)
  protectedDistribution: IntensityRecord14;

  // Tolerance globale
  distributionTolerance: number;

  // Bornes O2 protegees
  protectedOxygenRange: {
    min: number;
    max: number;
  };

  // Angle lateral autorise (domaine lexical)
  lateralAngle?: {
    domain: string; // 'geology', 'astronomy', etc.
    intensity: number; // [0, 1]
    lexiconHash: string; // Hash du lexique utilise
  };

  // Hash du contrat source
  contractHash: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRAFT: Unite de texte en cours de forge
// ─────────────────────────────────────────────────────────────────────────────────

export interface Draft {
  id: string;
  text: string;
  seed: number;

  // Mesures calculees
  measured?: {
    emotionField: EmotionField;
    oxygenResult: OxygenResult;
  };

  // Metadata
  iteration: number;
  createdAt: string;
  parentDraftId?: string; // Si mutation
}

// ─────────────────────────────────────────────────────────────────────────────────
// JUDGE: Resultat d'evaluation
// ─────────────────────────────────────────────────────────────────────────────────

export type JudgeVerdict = 'PASS' | 'FAIL';

export interface JudgeScore {
  verdict: JudgeVerdict;
  metrics: Record<string, number>;
  threshold: Record<string, number>;
  details?: string;
}

export interface SentinelResult {
  verdict: JudgeVerdict;
  scores: {
    j1_emotionBinding: JudgeScore;
    j2_coherence: JudgeScore;
    j3_sterility: JudgeScore;
    j4_uniqueness: JudgeScore;
    j5_density: JudgeScore;
    j6_resonance: JudgeScore;
    j7_antiGaming: JudgeScore;
  };
  paretoScores: {
    p1_impactDensity: number;
    p2_styleSignature: number;
  };
  failedJudges: string[];
}

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIG: Calibration (tout symbolique)
// ─────────────────────────────────────────────────────────────────────────────────

export interface GenesisConfig {
  // Controle boucle
  loop: {
    MAX_ITERATIONS: number;
    MIN_DRAFTS_PER_ITER: number;
    MAX_DRAFTS_PER_ITER: number;
    MUTATION_RATE_BASE: number;
  };

  // Budgets performance (ms)
  budgets: {
    BUDGET_MS_GATE_FAST: number;
    BUDGET_MS_DRAFT_FULL: number;
    BUDGET_MS_TOTAL_ITER: number;
    BUDGET_MS_TOTAL_FORGE: number;
  };

  // Seuils juges (tous symboliques, calibrables)
  judges: {
    // J1 EMOTION-BINDING (14D)
    emotionBinding: {
      MAX_COSINE_DISTANCE: number;    // Distance cosinus max sur distribution
      MIN_DOMINANT_MATCH: number;     // % iterations ou dominant doit matcher
      MAX_ENTROPY_DEVIATION: number;  // Deviation entropie max
    };

    // J2 COHERENCE
    coherence: {
      MAX_CONTRADICTIONS: number;
      MAX_TIMELINE_BREAKS: number;
      MAX_COREF_ERRORS: number;
    };

    // J3 STERILITY
    sterility: {
      MAX_LEXICAL_CLICHES: number;
      MAX_CONCEPT_CLICHES: number;
    };

    // J4 UNIQUENESS
    uniqueness: {
      MAX_NGRAM_OVERLAP_RATIO: number;
      MAX_EXACT_SPAN_LENGTH: number;
    };

    // J5 DENSITY
    density: {
      MIN_CONTENT_RATIO: number;
      MAX_FILLER_RATIO: number;
      MAX_REDUNDANCY_RATIO: number;
    };

    // J6 RESONANCE
    resonance: {
      MIN_O2_ALIGNMENT: number;
      RHYTHM_BAND: [number, number];
    };

    // J7 ANTI-GAMING
    antiGaming: {
      RARE_TOKEN_BAND: [number, number];
      MAX_NEOLOGISMS_RATIO: number;
      MIN_READABILITY_SCORE: number;
      MIN_SYNTAX_DEPTH_AVG: number;
    };

    // Pareto scores (non-bloquants)
    pareto: {
      impactDensity: {
        MIN_IMAGERY_SCORE: number;
        MIN_LEXICAL_RARITY: number;
      };
      styleSignature: {
        TARGET_CADENCE_RANGE: [number, number];
        TARGET_LEXICAL_TEMP: number;
      };
    };
  };

  // Hash artifacts attendus
  artifacts: {
    clicheDbHash: string;
    conceptDbHash: string;
    corpusHash: string;
    sensoryLexiconHash: string;
    fillerListHash: string;
    stopwordsHash: string;
    valenceLexiconHash: string;
    intensityMarkersHash: string;
    persistencePatternsHash: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// FORGE RESULT: Output final
// ─────────────────────────────────────────────────────────────────────────────────

export interface ForgeResult {
  // Texte final
  text: string;

  // Statistiques
  stats: {
    totalIterations: number;
    totalDrafts: number;
    fastGateKills: number;
    sentinelKills: number;
    sentinelPass: number;
  };

  // Scores finaux
  finalScores: SentinelResult;

  // Proof pack
  proofPack: ProofPack;
}

export interface ProofPack {
  // Hashes
  hashes: {
    truthHash: string;
    contractHash: string;
    configHash: string;
    outputTextHash: string;
    combinedHash: string;
  };

  // Seeds reproductibilite
  seeds: {
    drafterSeeds: number[];
    prismSeed?: number;
    mutatorSeeds: number[];
  };

  // Logs
  logs: {
    iterationLog: IterationLogEntry[];
    timingLog: TimingLogEntry[];
    killLog: KillLogEntry[];
  };

  // Pareto frontier (candidats non-domines)
  paretoFrontier: ParetoCandidate[];

  // Si LLM utilise (optionnel)
  llmTrace?: {
    modelId: string;
    promptHashes: string[];
  };
}

export interface IterationLogEntry {
  iteration: number;
  draftsGenerated: number;
  fastGateKills: number;
  sentinelPass: number;
  sentinelFail: number;
  mutationApplied: boolean;
  durationMs: number;
}

export interface TimingLogEntry {
  module: string;
  operation: string;
  durationMs: number;
  timestamp: string;
}

export interface KillLogEntry {
  draftId: string;
  stage: 'FAST_GATE' | 'SENTINEL';
  reason: string;
  failedJudge?: string;
  metrics?: Record<string, number>;
}

export interface ParetoCandidate {
  draftId: string;
  text: string;
  scores: {
    impactDensity: number;
    styleSignature: number;
  };
  sentinelResult: SentinelResult;
}

// ─────────────────────────────────────────────────────────────────────────────────
// VALIDATION RESULT
// ─────────────────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────────
// ARTIFACTS SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ClicheDb {
  version: string;
  cliches: Array<{
    pattern: string;
    type: 'lexical' | 'concept';
    severity: 'high' | 'medium' | 'low';
  }>;
}

export interface ConceptDb {
  version: string;
  concepts: Array<{
    template: string;
    slots: string[];
    type: 'metaphor' | 'comparison' | 'idiom';
    severity: 'high' | 'medium' | 'low';
  }>;
}

export interface CorpusRef {
  version: string;
  ngrams: {
    [n: string]: string[];
  };
}

export interface SensoryLexicon {
  version: string;
  categories: {
    visual: string[];
    auditory: string[];
    tactile: string[];
    olfactory: string[];
    gustatory: string[];
  };
}

export interface FillerList {
  version: string;
  fillers: string[];
}

export interface StopwordsList {
  version: string;
  stopwords: string[];
}

export interface ValenceLexicon {
  version: string;
  positive: string[];
  negative: string[];
  neutral: string[];
}

export interface IntensityMarkers {
  version: string;
  punctuation: string[];
  verbs: string[];
}

export interface PersistencePatterns {
  version: string;
  transient: string[];
  enduring: string[];
}

export interface DomainLexicon {
  domain: string;
  version: string;
  terms: string[];
}

export interface ArtifactsManifest {
  version: string;
  timestamp: string;
  artifacts: Record<string, string>; // filename -> sha256
}

// ─────────────────────────────────────────────────────────────────────────────────
// VOICE PROFILE
// ─────────────────────────────────────────────────────────────────────────────────

export interface VoiceProfile {
  id: string;
  name: string;
  version: string;

  // Fingerprint stylistique
  style: {
    avgSentenceLength: number;
    lexicalRichness: number;
    dialogueRatio: number;
    punctuationDensity: number;
  };

  // Preferences lexicales
  preferences: {
    favoredWords: string[];
    avoidedWords: string[];
    dialectMarkers?: string[];
  };
}
