// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — EMOTION FIELD v1.0.0
// ═══════════════════════════════════════════════════════════════════════════════
// Extraction et calcul du champ émotionnel 14D
// Aligné avec emotion_engine.ts OMEGA (formules officielles)
// ═══════════════════════════════════════════════════════════════════════════════

import {
  EmotionType,
  EmotionState,
  EmotionRecord14,
  IntensityRecord14,
  EmotionField,
  EMOTION_TYPES,
  EMOTION_COUNT,
  NEUTRAL_EMOTION_STATE,
  PHYSICS
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);

const sum = (arr: number[]): number =>
  arr.reduce((a, b) => a + b, 0);

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAT NEUTRE 14D
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crée un EmotionRecord14 neutre (toutes émotions à baseline)
 */
export function createNeutralRecord(): EmotionRecord14 {
  const record: Record<EmotionType, EmotionState> = {} as Record<EmotionType, EmotionState>;

  for (const type of EMOTION_TYPES) {
    record[type] = {
      type,
      mass: 1.0,
      intensity: 0.125,  // 1/8 pour équilibre
      inertia: 0.28,
      decay_rate: 0.1,
      baseline: 0.125
    };
  }

  return record as EmotionRecord14;
}

/**
 * Crée un IntensityRecord14 neutre (toutes intensités égales)
 */
export function createNeutralIntensities(): IntensityRecord14 {
  const record: Record<EmotionType, number> = {} as Record<EmotionType, number>;
  const equalValue = 1 / EMOTION_COUNT; // ~0.0714

  for (const type of EMOTION_TYPES) {
    record[type] = equalValue;
  }

  return record as IntensityRecord14;
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALISATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise les intensités pour que Σ = 1.0
 */
export function normalizeIntensities(record: EmotionRecord14): IntensityRecord14 {
  const intensities: Record<EmotionType, number> = {} as Record<EmotionType, number>;
  let total = 0;

  // Extraction des intensités
  for (const type of EMOTION_TYPES) {
    const intensity = Math.max(0, record[type].intensity);
    intensities[type] = intensity;
    total += intensity;
  }

  // Normalisation (éviter division par 0)
  if (total < 1e-9) {
    return createNeutralIntensities();
  }

  const inv = 1 / total;
  for (const type of EMOTION_TYPES) {
    intensities[type] *= inv;
  }

  return intensities as IntensityRecord14;
}

/**
 * Normalise un IntensityRecord14 directement
 */
export function normalizeIntensityRecord(intensities: IntensityRecord14): IntensityRecord14 {
  const result: Record<EmotionType, number> = {} as Record<EmotionType, number>;
  let total = 0;

  for (const type of EMOTION_TYPES) {
    const value = Math.max(0, intensities[type] ?? 0);
    result[type] = value;
    total += value;
  }

  if (total < 1e-9) {
    return createNeutralIntensities();
  }

  const inv = 1 / total;
  for (const type of EMOTION_TYPES) {
    result[type] *= inv;
  }

  return result as IntensityRecord14;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMINANT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trouve l'émotion dominante (argmax intensity)
 */
export function findDominant(intensities: IntensityRecord14): {
  dominant: EmotionType;
  peak: number;
} {
  let dominant: EmotionType = "joy";
  let peak = -1;

  for (const type of EMOTION_TYPES) {
    const value = intensities[type] ?? 0;
    if (value > peak) {
      peak = value;
      dominant = type;
    }
  }

  return { dominant, peak: clamp(peak, 0, 1) };
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉNERGIE TOTALE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule l'énergie totale: Σ(intensity × mass)
 * Utilisé pour la conservation émotionnelle
 */
export function computeTotalEnergy(record: EmotionRecord14): number {
  let energy = 0;

  for (const type of EMOTION_TYPES) {
    const state = record[type];
    energy += state.intensity * state.mass;
  }

  return energy;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTROPIE SHANNON (normalisée log(14))
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule l'entropie Shannon normalisée
 * 
 * Formule: H = -Σ(p × log(p)) / log(N) où N=14
 * 
 * H = 0: Une seule émotion dominante (concentration)
 * H = 1: Toutes émotions égales (dispersion maximale)
 */
export function computeEntropy(normalized: IntensityRecord14): number {
  const eps = 1e-12;
  let H = 0;

  for (const type of EMOTION_TYPES) {
    const p = normalized[type] ?? 0;
    if (p > eps) {
      H -= p * Math.log(p);
    }
  }

  // Normalisation par log(14)
  return clamp(H / PHYSICS.ENTROPY_LOG_BASE, 0, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRASTE (Distance L1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le contraste entre deux distributions émotionnelles
 * 
 * Formule: contrast = L1_distance / 2
 * 
 * contrast = 0: Distributions identiques
 * contrast = 1: Distributions maximalement différentes
 */
export function computeContrast(
  current: IntensityRecord14,
  previous?: IntensityRecord14
): number {
  if (!previous) {
    return 0.5; // Valeur par défaut (neutre)
  }

  let distance = 0;
  for (const type of EMOTION_TYPES) {
    const c = current[type] ?? 0;
    const p = previous[type] ?? 0;
    distance += Math.abs(c - p);
  }

  // L1 max = 2 (tout passe de 0 à 1 et vice versa)
  return clamp(distance / 2, 0, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// INERTIE DOMINANTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map inertie par émotion (combien l'émotion résiste au changement)
 * 
 * Basé sur la physique émotionnelle OMEGA:
 * - Tristesse/Désespoir: très lente à changer
 * - Joie/Surprise: très rapide à changer
 */
const INERTIA_MAP: Record<EmotionType, number> = {
  // Émotions lourdes (haute inertie)
  sadness: 0.85,
  despair: 0.90,
  shame: 0.80,
  guilt: 0.75,
  
  // Émotions moyennes
  fear: 0.70,
  disgust: 0.65,
  trust: 0.60,
  love: 0.55,
  
  // Émotions légères (basse inertie)
  anger: 0.45,
  anticipation: 0.40,
  hope: 0.35,
  pride: 0.35,
  joy: 0.30,
  surprise: 0.20
};

/**
 * Récupère l'inertie de l'émotion dominante
 */
export function getInertia(dominant: EmotionType): number {
  return INERTIA_MAP[dominant] ?? 0.5;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELTA CONSERVATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le delta de conservation énergétique
 * 
 * Formule: delta = |E(t) - E(t-1)| / max(E(t-1), ε)
 * 
 * Si delta > 5%, la conservation est violée (sauf événement)
 */
export function computeConservationDelta(
  currentEnergy: number,
  previousEnergy?: number
): number {
  if (previousEnergy === undefined || previousEnergy < 1e-9) {
    return 0;
  }

  return Math.abs(currentEnergy - previousEnergy) / previousEnergy;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD EMOTION FIELD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit un EmotionField complet à partir d'un EmotionRecord14
 * 
 * @param current - État émotionnel actuel
 * @param previous - État précédent (pour contraste et conservation)
 * @returns EmotionField complet
 */
export function buildEmotionField(
  current: EmotionRecord14,
  previous?: EmotionRecord14
): EmotionField {
  // 1. Normalisation
  const normalizedIntensities = normalizeIntensities(current);

  // 2. Dominant et peak
  const { dominant, peak } = findDominant(normalizedIntensities);

  // 3. Énergie totale
  const totalEnergy = computeTotalEnergy(current);

  // 4. Entropie (log14)
  const entropy = computeEntropy(normalizedIntensities);

  // 5. Contraste vs précédent
  const previousNorm = previous ? normalizeIntensities(previous) : undefined;
  const contrast = computeContrast(normalizedIntensities, previousNorm);

  // 6. Inertie dominante
  const inertia = getInertia(dominant);

  // 7. Delta conservation
  const previousEnergy = previous ? computeTotalEnergy(previous) : undefined;
  const conservationDelta = computeConservationDelta(totalEnergy, previousEnergy);

  return {
    states: current,
    normalizedIntensities,
    dominant,
    peak,
    totalEnergy,
    entropy,
    contrast,
    inertia,
    conservationDelta
  };
}

/**
 * Construit un EmotionField depuis des intensités simples
 * (crée des EmotionState par défaut)
 */
export function buildEmotionFieldFromIntensities(
  intensities: Partial<IntensityRecord14>,
  previous?: EmotionRecord14
): EmotionField {
  const record: Record<EmotionType, EmotionState> = {} as Record<EmotionType, EmotionState>;

  for (const type of EMOTION_TYPES) {
    record[type] = {
      type,
      mass: 1.0,
      intensity: clamp(intensities[type] ?? 0.1, 0, 1),
      inertia: INERTIA_MAP[type],
      decay_rate: 0.1,
      baseline: 0.2
    };
  }

  return buildEmotionField(record as EmotionRecord14, previous);
}

// ─────────────────────────────────────────────────────────────────────────────
// DECAY OFFICIEL (emotion_engine.ts ligne 151)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applique le decay officiel OMEGA
 * 
 * Formule: intensity_new = baseline + (intensity - baseline) × e^(-decay_rate × time / mass)
 * 
 * @param state - État émotionnel
 * @param elapsed_ms - Temps écoulé en millisecondes
 * @returns Nouvelle intensité après decay
 */
export function applyOfficialDecay(state: EmotionState, elapsed_ms: number): number {
  const elapsed_seconds = elapsed_ms / 1000;

  // Le facteur de masse ralentit le decay
  const effective_decay = state.decay_rate / state.mass;

  // Decay exponentiel vers baseline
  const delta = state.intensity - state.baseline;
  const decay_factor = Math.exp(-effective_decay * elapsed_seconds);
  const new_intensity = state.baseline + delta * decay_factor;

  return clamp(new_intensity, 0, 1);
}

/**
 * Applique le decay à tout le record
 */
export function applyDecayToRecord(
  record: EmotionRecord14,
  elapsed_ms: number
): EmotionRecord14 {
  const result: Record<EmotionType, EmotionState> = {} as Record<EmotionType, EmotionState>;

  for (const type of EMOTION_TYPES) {
    const state = record[type];
    result[type] = {
      ...state,
      intensity: applyOfficialDecay(state, elapsed_ms)
    };
  }

  return result as EmotionRecord14;
}

// ─────────────────────────────────────────────────────────────────────────────
// STIMULATION OFFICIELLE (emotion_engine.ts ligne 195)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applique la stimulation officielle OMEGA
 * 
 * Formule: intensity_new = intensity + stimulus × (1 - inertia)
 * 
 * @param state - État émotionnel
 * @param stimulus - Force du stimulus (0-1)
 * @returns Nouvelle intensité après stimulation
 */
export function applyOfficialStimulation(state: EmotionState, stimulus: number): number {
  const effective_stimulus = stimulus * (1 - state.inertia);
  return clamp(state.intensity + effective_stimulus, 0, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS INLINE
// ─────────────────────────────────────────────────────────────────────────────

export function selfTest(): boolean {
  // Test normalisation Σ = 1
  const record = createNeutralRecord();
  const norm = normalizeIntensities(record);
  const total = sum(EMOTION_TYPES.map(t => norm[t]));
  if (Math.abs(total - 1) > 1e-9) {
    console.error("FAIL: Normalization sum != 1:", total);
    return false;
  }

  // Test entropie maximale (distribution uniforme)
  const uniformNorm = createNeutralIntensities();
  const maxEntropy = computeEntropy(uniformNorm);
  if (maxEntropy < 0.99) {
    console.error("FAIL: Max entropy should be ~1:", maxEntropy);
    return false;
  }

  // Test entropie minimale (une seule émotion)
  const singleEmotion: Record<EmotionType, number> = {} as Record<EmotionType, number>;
  for (const t of EMOTION_TYPES) singleEmotion[t] = 0;
  singleEmotion.joy = 1.0;
  const minEntropy = computeEntropy(singleEmotion as IntensityRecord14);
  if (minEntropy > 0.01) {
    console.error("FAIL: Min entropy should be ~0:", minEntropy);
    return false;
  }

  // Test dominant
  const joyRecord: Record<EmotionType, number> = {} as Record<EmotionType, number>;
  for (const t of EMOTION_TYPES) joyRecord[t] = 0.1;
  joyRecord.joy = 0.9;
  const { dominant } = findDominant(joyRecord as IntensityRecord14);
  if (dominant !== "joy") {
    console.error("FAIL: Dominant should be joy:", dominant);
    return false;
  }

  // Test decay (doit diminuer vers baseline)
  const state: EmotionState = {
    type: "anger",
    mass: 2.0,
    intensity: 0.9,
    inertia: 0.4,
    decay_rate: 0.2,
    baseline: 0.2
  };
  const decayed = applyOfficialDecay(state, 5000); // 5 secondes
  if (decayed >= state.intensity) {
    console.error("FAIL: Decay should reduce intensity");
    return false;
  }
  if (decayed < state.baseline) {
    console.error("FAIL: Decay should not go below baseline");
    return false;
  }

  // Test stimulation (doit augmenter)
  const stimulated = applyOfficialStimulation(state, 0.5);
  if (stimulated <= state.intensity) {
    console.error("FAIL: Stimulation should increase intensity");
    return false;
  }

  console.log("✅ emotion_field.ts: All tests passed");
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  createNeutralRecord,
  createNeutralIntensities,
  normalizeIntensities,
  normalizeIntensityRecord,
  findDominant,
  computeTotalEnergy,
  computeEntropy,
  computeContrast,
  getInertia,
  computeConservationDelta,
  buildEmotionField,
  buildEmotionFieldFromIntensities,
  applyOfficialDecay,
  applyOfficialStimulation,
  applyDecayToRecord,
  INERTIA_MAP,
  selfTest
};
