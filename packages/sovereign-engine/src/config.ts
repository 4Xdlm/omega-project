/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: config.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * All configuration values are frozen constants.
 * SOVEREIGN_THRESHOLD = 92 is NON-NEGOTIABLE.
 * Emotion weight = 63.3% (interiority 2.0 + tension_14d 3.0 + emotion_coherence 2.5 + impact 2.0).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SOVEREIGN THRESHOLDS — ABSOLUTE
// ═══════════════════════════════════════════════════════════════════════════════

export const SOVEREIGN_CONFIG = {
  /**
   * Seuil absolu de sceau souverain.
   * Si composite < 92 → REJECT.
   * Si 91.9 → REJECT.
   * Non négociable.
   */
  SOVEREIGN_THRESHOLD: 92,

  /**
   * Seuil de rejet absolu.
   * En dessous de 60 composite → REJECT même après toutes les passes.
   */
  REJECT_BELOW: 60,

  /**
   * Plancher individuel pour chaque axe.
   * Si un axe < 50, même si composite ≥ 92 → REJECT.
   * Tous les axes doivent être ≥ 50.
   */
  AXIS_FLOOR: 50,

  // ═══════════════════════════════════════════════════════════════════════════════
  // S-ORACLE WEIGHTS — 63.3% EMOTION
  // ═══════════════════════════════════════════════════════════════════════════════

  WEIGHTS: {
    interiority: 2.0,        // LLM — Profondeur intérieure
    tension_14d: 3.0,        // CALC — ARME NUCLÉAIRE — Conformité 14D
    sensory_density: 1.5,    // HYBRID — Densité sensorielle
    necessity: 1.0,          // LLM — Nécessité phrase
    anti_cliche: 1.0,        // CALC — Anti-cliché
    rhythm: 1.0,             // CALC — Rythme musical
    signature: 1.0,          // CALC — Signature style
    impact: 2.0,             // LLM — Impact ouverture/clôture
    emotion_coherence: 2.5,  // CALC — Cohérence émotionnelle transitions
  },

  /**
   * Vérification : somme des poids = 15.0
   * Poids émotionnels : interiority (2.0) + tension_14d (3.0) + emotion_coherence (2.5) + impact (2.0) = 9.5
   * 9.5 / 15.0 = 63.3% émotion
   */
  TOTAL_WEIGHT: 15.0,
  EMOTION_WEIGHT: 9.5,
  EMOTION_WEIGHT_PCT: 63.3,

  // ═══════════════════════════════════════════════════════════════════════════════
  // CORRECTION LOOP
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Nombre maximum de passes de correction.
   * Boucle : delta → pitch → patch → rescore.
   * Max 2 passes.
   */
  MAX_CORRECTION_PASSES: 2,

  /**
   * Nombre maximum d'items par pitch.
   * Chaque pitch contient max 8 corrections chirurgicales.
   */
  MAX_PITCH_ITEMS: 8,

  // ═══════════════════════════════════════════════════════════════════════════════
  // RHYTHM — MUSICAL ENGINE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Gini coefficient optimal.
   * Mesure la variété des longueurs de phrases.
   * 0 = toutes identiques, 1 = extrême variété.
   * Optimum : 0.45 (variété modérée).
   */
  GINI_OPTIMAL: 0.45,

  /**
   * Plage acceptable pour Gini.
   * [0.35, 0.55] → score maximal.
   * En dehors → pénalité progressive.
   */
  GINI_RANGE: [0.35, 0.55] as const,

  /**
   * Maximum de phrases consécutives de longueur similaire.
   * Similaire = ±20% de la moyenne.
   * ≥3 consécutives → monotonie détectée.
   */
  MAX_CONSECUTIVE_SIMILAR: 3,

  /**
   * Tolérance de longueur similaire (fraction).
   * 0.20 = ±20%.
   */
  SIMILAR_LENGTH_TOLERANCE: 0.20,

  /**
   * Taux maximum de répétition d'ouverture.
   * Si >10% des phrases commencent par le même mot → pénalité.
   */
  OPENING_REPETITION_MAX: 0.10,

  /**
   * Minimum de syncopes par scène.
   * Syncope = phrase ≤5 mots après phrase ≥25 mots.
   */
  MIN_SYNCOPES_PER_SCENE: 2,

  /**
   * Minimum de compressions par scène.
   * Compression = phrase ≤3 mots.
   */
  MIN_COMPRESSIONS_PER_SCENE: 1,

  /**
   * Définition syncope : seuils.
   */
  SYNCOPE_SHORT_MAX: 5,   // FR literary prose
  SYNCOPE_LONG_MIN: 25,    // FR literary prose

  /**
   * Définition compression : seuil.
   */
  COMPRESSION_MAX: 3,     // FR literary prose

  /**
   * Définition respiration : seuil.
   */
  RESPIRATION_MIN: 30,

  // ═══════════════════════════════════════════════════════════════════════════════
  // ANTI-CLICHÉ — ZERO TOLERANCE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Zéro tolérance pour les clichés.
   * 0 matchs → 100 points.
   * 1-2 matchs → 80 points.
   * 3-5 matchs → 50 points.
   * 6+ matchs → 0 points.
   */
  CLICHE_ZERO_TOLERANCE: true,
  CLICHE_SCORING: {
    0: 100,
    2: 80,
    5: 50,
    6: 0,
  } as const,

  // ═══════════════════════════════════════════════════════════════════════════════
  // TENSION — DETECTION PARAMETERS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Tolérance de timing pour pic et faille (fraction).
   * 0.15 = ±15% de la position cible.
   */
  TIMING_TOLERANCE: 0.15,

  /**
   * Seuil de monotonie (arousal).
   * Si écart-type arousal < 0.1 → monotone.
   */
  MONOTONY_THRESHOLD: 0.1,

  // ═══════════════════════════════════════════════════════════════════════════════
  // DUEL ENGINE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Nombre de drafts générés en mode DUEL.
   * 3 modes : A, B, C.
   */
  MAX_DRAFTS: 3,

  /**
   * Modes de génération pour DUEL.
   * A = tranchant_minimaliste (compression maximale, phrases courtes).
   * B = sensoriel_dense (saturation sensorielle, métaphores).
   * C = experimental_signature (ruptures, signature style extrême).
   */
  DRAFT_MODES: [
    'tranchant_minimaliste',
    'sensoriel_dense',
    'experimental_signature',
  ] as const,

  // ═══════════════════════════════════════════════════════════════════════════════
  // SENSORY DENSITY
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Densité sensorielle minimale (marqueurs par 100 mots).
   * Minimum acceptable : 5.0.
   * Optimal : 8.0-12.0.
   */
  SENSORY_DENSITY_MIN: 5.0,
  SENSORY_DENSITY_OPTIMAL: 10.0,

  // ═══════════════════════════════════════════════════════════════════════════════
  // SIGNATURE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Taux de hit minimum pour les mots signature (fraction).
   * Si <30% des mots signature présents → pénalité.
   */
  SIGNATURE_HIT_RATE_MIN: 0.30,

  /**
   * Ratio maximum d'abstraction.
   * Fraction de mots abstraits vs concrets.
   * Max acceptable : 0.40 (40% abstrait, 60% concret).
   */
  ABSTRACTION_MAX_RATIO: 0.40,

  // ═══════════════════════════════════════════════════════════════════════════════
  // EMOTION COHERENCE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Distance maximale acceptable entre paragraphes adjacents (14D).
   * Si distance > 2.0 → saut brutal détecté.
   */
  MAX_PARAGRAPH_DISTANCE: 2.0,

  /**
   * Nombre maximum de sauts brutaux tolérés.
   * ≥3 sauts → cohérence compromise.
   */
  MAX_BRUTAL_JUMPS: 2,

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUARTILE DIVISION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Bornes des quartiles (fraction du texte).
   */
  QUARTILE_BOUNDS: {
    Q1: [0.00, 0.25],
    Q2: [0.25, 0.50],
    Q3: [0.50, 0.75],
    Q4: [0.75, 1.00],
  } as const,

  // ═══════════════════════════════════════════════════════════════════════════════
  // DATA FILES
  // ═══════════════════════════════════════════════════════════════════════════════

  DATA_FILES: {
    CLICHE_BLACKLIST: 'cliche-blacklist.json',
    SENSORY_LEXICON: 'sensory-lexicon.json',
    AI_PATTERNS: 'ai-patterns.json',
    FILTER_WORDS: 'filter-words.json',
  } as const,

  // ═══════════════════════════════════════════════════════════════════════════════
  // MACRO-AXES v3 — CONSOLIDATION 9→4
  // ═══════════════════════════════════════════════════════════════════════════════

  MACRO_WEIGHTS: {
    ecc: 0.60, // Emotional Control Core
    rci: 0.15, // Rhythmic Control Index
    sii: 0.15, // Signature Integrity Index
    ifi: 0.10, // Immersion Force Index
  } as const,

  MACRO_AXIS_FLOOR: 85,
  ECC_FLOOR: 88,
  MACRO_REJECT_BELOW: 85,

  ZONES: {
    GREEN: { min_composite: 92, min_axis: 85, min_ecc: 88 },
    YELLOW: { min_composite: 85, min_axis: 75 },
    RED: { max_composite: 84 },
  } as const,

  // ═══════════════════════════════════════════════════════════════════════════════
  // CHAOS CONTRÔLÉ
  // ═══════════════════════════════════════════════════════════════════════════════

  DRAFT_TEMPERATURE: 0.40,
  DRAFT_TOP_P: 0.92,
  SYMBOL_TEMPERATURE: 0.25,
  SYMBOL_TOP_P: 0.90,
  SYMBOL_MAX_REGEN: 2,

  // ═══════════════════════════════════════════════════════════════════════════════
  // ECC BONUS/MALUS — ANTI-GAMING
  // ═══════════════════════════════════════════════════════════════════════════════

  ECC_ENTROPY_BONUS: 3,
  ECC_ENTROPY_MALUS: -5,
  ECC_PROJECTION_BONUS: 2,
  ECC_OPENLOOP_BONUS: 3,
  ECC_MAX_TOTAL_BONUS: 3, // Cap dur anti-gaming (ChatGPT)
  ECC_ENTROPY_STDDEV_THRESHOLD: 0.15, // Seuil pour déclencher bonus entropy

  // ═══════════════════════════════════════════════════════════════════════════════
  // IFI — CORPOREAL ANCHORING
  // ═══════════════════════════════════════════════════════════════════════════════

  CORPOREAL_MARKERS: [
    // Français uniquement — FR PREMIUM
    'souffle', 'gorge', 'mains', 'poitrine', 'ventre', 'sueur',
    'tremblement', 'mâchoire', 'épaules', 'nuque', 'doigts',
    'respiration', 'cœur', 'estomac', 'tempes', 'peau',
    'frisson', 'vertige', 'nausée', 'chaleur',
    'paumes', 'colonne', 'côtes', 'poumons', 'pouls', 'os',
    'muscle', 'poignet', 'phalanges', 'crâne', 'bassin',
  ] as const,
  CORPOREAL_MIN_PER_SCENE: 3,
  CORPOREAL_TARGET: 6,

  // ═══════════════════════════════════════════════════════════════════════════════
  // RCI — ANTI-MÉTRONOMIQUE
  // ═══════════════════════════════════════════════════════════════════════════════

  RCI_PERFECT_PENALTY: -5, // Malus si Gini+syncope+compression "trop parfaits"

} as const;

/**
 * Vérification à la compilation :
 * - SOVEREIGN_THRESHOLD = 92
 * - EMOTION_WEIGHT_PCT = 63.3
 * - MAX_CORRECTION_PASSES = 2
 */
