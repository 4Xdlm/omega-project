// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — BIO ENGINE v1.0.0
// ═══════════════════════════════════════════════════════════════════════════════
// Moteur biologique: Oxygène narratif (O₂)
// Formule officielle: O₂ = α×emotions + β×events + γ×contrast
// Source: 01_GLOSSARY_MASTER.md §ENGAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

import {
  EmotionField,
  OxygenResult,
  BioMarker,
  MarkerType,
  MarkerReason,
  PHYSICS
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

/** Énergie max théorique (14 émotions × mass max 10 × intensity 1) */
const MAX_ENERGY = 14 * 10 * 1;

// ─────────────────────────────────────────────────────────────────────────────
// OXYGEN COMPUTATION
// ─────────────────────────════════════════════════════════════════════════════

/**
 * Calcule le score émotionnel normalisé (0-1)
 * 
 * @param field - Champ émotionnel
 * @returns Score 0-1
 */
export function computeEmotionScore(field: EmotionField): number {
  // Énergie totale normalisée
  const energyScore = field.totalEnergy / MAX_ENERGY;

  // Combinaison avec peak et (1-entropie) pour favoriser les pics
  // Plus l'entropie est basse, plus l'émotion est concentrée
  const focusBonus = field.peak * (1 - field.entropy);

  // Score final
  return clamp(0.6 * energyScore + 0.4 * focusBonus, 0, 1);
}

/**
 * Calcule le facteur de decay basé sur la distance (streak)
 * 
 * Formule: decayFactor = 1 / (1 + λ × log1p(streakWords))
 * 
 * @param streakWords - Nombre de mots depuis dernier événement
 * @returns Facteur 0-1
 */
export function computeDecayFactor(streakWords: number): number {
  return 1 / (1 + PHYSICS.DECAY_LAMBDA * Math.log1p(streakWords));
}

/**
 * Calcule le relief (amplification du boost en hypoxie)
 * 
 * Formule: relief = 1 + (1 - currentO2)
 * Plus l'O₂ est bas, plus le boost est efficace
 * 
 * @param currentOxygen - O₂ actuel
 * @returns Facteur relief 1-2
 */
export function computeRelief(currentOxygen: number): number {
  return 1 + (1 - clamp(currentOxygen, 0, 1));
}

/**
 * Calcule l'oxygène narratif complet
 * 
 * Formule officielle: O₂ = α×emotions + β×events + γ×contrast
 * Avec decay temporel et boost éventuel
 * 
 * @param field - Champ émotionnel
 * @param eventBoost - Boost événement (0-1)
 * @param streakWords - Mots depuis dernier événement
 * @param previousOxygen - O₂ précédent (pour EMA)
 * @returns OxygenResult complet
 */
export function computeOxygen(
  field: EmotionField,
  eventBoost: number = 0,
  streakWords: number = 0,
  previousOxygen?: number
): OxygenResult {
  // 1. Score émotionnel
  const emotionScore = computeEmotionScore(field);

  // 2. O₂ base: α×emotions + β×events + γ×contrast
  const base = 
    PHYSICS.OXYGEN_ALPHA * emotionScore +
    PHYSICS.OXYGEN_BETA * eventBoost +
    PHYSICS.OXYGEN_GAMMA * field.contrast;

  // 3. Decay temporel
  const decayFactor = computeDecayFactor(streakWords);
  const decayed = base * decayFactor;

  // 4. Boost avec relief (si applicable)
  const relief = computeRelief(previousOxygen ?? decayed);
  const boosted = eventBoost > 0 
    ? decayed + eventBoost * relief * 0.3
    : decayed;

  // 5. Smoothing EMA (optionnel, si previousOxygen fourni)
  let final = boosted;
  if (previousOxygen !== undefined) {
    // EMA avec k dépendant de l'inertie
    const k = 0.15 + (1 - field.inertia) * 0.50; // k ∈ [0.15, 0.65]
    final = previousOxygen + k * (boosted - previousOxygen);
  }

  return {
    base: clamp(base, 0, 1),
    decayed: clamp(decayed, 0, 1),
    final: clamp(final, 0, 1),
    components: {
      emotionScore,
      eventBoost,
      contrastScore: field.contrast,
      decayFactor,
      relief
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKERS (Champignons, Cicatrices, etc.)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Détecte les markers biologiques basés sur les transitions O₂
 * 
 * Types:
 * - MUSHROOM: Recovery après hypoxie (prevO2 < 0.25 && currentO2 > 0.45)
 * - BLOOM: Boost événement (eventBoost > 0.40)
 * - SCAR: Chute brutale (delta < -0.35)
 * - PAYOFF: Résolution (contrast > 0.60 && delta > 0.15 && isEvent)
 */
export function detectMarkers(
  currentOxygen: number,
  previousOxygen: number | undefined,
  eventBoost: number,
  field: EmotionField,
  sentenceIndex: number,
  nodeHash: string
): BioMarker[] {
  const markers: BioMarker[] = [];
  const prevO2 = previousOxygen ?? 0.5;
  const delta = currentOxygen - prevO2;

  // MUSHROOM: Recovery après hypoxie
  if (prevO2 < 0.25 && currentOxygen > 0.45) {
    markers.push({
      type: "MUSHROOM",
      reason: "RECOVERY",
      strength: clamp((currentOxygen - prevO2) / 0.5, 0, 1),
      sentenceIndex,
      hashRef: nodeHash
    });
  }

  // BLOOM: Boost événement majeur
  if (eventBoost > 0.40) {
    markers.push({
      type: "BLOOM",
      reason: eventBoost > 0.7 ? "EVENT_BOOST" : "MANUAL_BOOST",
      strength: eventBoost,
      sentenceIndex,
      hashRef: nodeHash
    });
  }

  // SCAR: Chute brutale
  if (delta < -0.35) {
    markers.push({
      type: "SCAR",
      reason: "BLEED",
      strength: clamp(Math.abs(delta), 0, 1),
      sentenceIndex,
      hashRef: nodeHash
    });
  }

  // PAYOFF: Résolution après tension
  if (field.contrast > 0.60 && delta > 0.15 && eventBoost > 0.2) {
    markers.push({
      type: "PAYOFF",
      reason: "RESOLUTION",
      strength: clamp(field.contrast * delta, 0, 1),
      sentenceIndex,
      hashRef: nodeHash
    });
  }

  return markers;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATISTIQUES O₂
// ─────────────────────────────────────────────────────────────────────────────

export interface OxygenStats {
  avg: number;
  min: number;
  max: number;
  hypoxiaEvents: number;    // O₂ < 0.2
  hyperoxiaEvents: number;  // O₂ > 0.9
  climaxEvents: number;     // O₂ > 0.85
  variance: number;
}

/**
 * Calcule les statistiques sur une série d'O₂
 */
export function computeOxygenStats(oxygenValues: number[]): OxygenStats {
  if (oxygenValues.length === 0) {
    return {
      avg: 0.5,
      min: 0.5,
      max: 0.5,
      hypoxiaEvents: 0,
      hyperoxiaEvents: 0,
      climaxEvents: 0,
      variance: 0
    };
  }

  const n = oxygenValues.length;
  const sum = oxygenValues.reduce((a, b) => a + b, 0);
  const avg = sum / n;

  let min = 1;
  let max = 0;
  let hypoxiaEvents = 0;
  let hyperoxiaEvents = 0;
  let climaxEvents = 0;
  let sumSquaredDiff = 0;

  for (const o2 of oxygenValues) {
    if (o2 < min) min = o2;
    if (o2 > max) max = o2;
    if (o2 < PHYSICS.HYPOXIA_THRESHOLD) hypoxiaEvents++;
    if (o2 > PHYSICS.HYPEROXIA_THRESHOLD) hyperoxiaEvents++;
    if (o2 > PHYSICS.CLIMAX_THRESHOLD) climaxEvents++;
    sumSquaredDiff += (o2 - avg) ** 2;
  }

  const variance = sumSquaredDiff / n;

  return {
    avg,
    min,
    max,
    hypoxiaEvents,
    hyperoxiaEvents,
    climaxEvents,
    variance
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTOGRAMME O₂
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Génère un histogramme O₂ (20 bins: 0-5%, 5-10%, ..., 95-100%)
 * 
 * @param oxygenValues - Valeurs O₂
 * @returns Array de 20 bins normalisés (Σ = 1)
 */
export function computeOxygenHistogram(oxygenValues: number[]): readonly number[] {
  const bins = PHYSICS.OXYGEN_HISTOGRAM_BINS;
  const histogram = new Array(bins).fill(0);

  if (oxygenValues.length === 0) {
    // Distribution uniforme par défaut
    const uniform = 1 / bins;
    return histogram.map(() => uniform);
  }

  for (const o2 of oxygenValues) {
    const clamped = clamp(o2, 0, 0.9999);
    const binIndex = Math.floor(clamped * bins);
    histogram[binIndex]++;
  }

  // Normalisation
  const total = oxygenValues.length;
  return histogram.map(count => count / total);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPIRATION (Inhale/Exhale)
// ─────────────────────────────────────────────────────────────────────────────

export interface BreathingStats {
  avgInhaleExhaleRatio: number;
  rhythmVariance: number;
  avgConservationDelta: number;
}

/**
 * Calcule les statistiques de respiration narrative
 * 
 * @param oxygenDeltas - Variations O₂ entre segments
 * @param conservationDeltas - Deltas conservation énergétique
 */
export function computeBreathingStats(
  oxygenDeltas: number[],
  conservationDeltas: number[]
): BreathingStats {
  if (oxygenDeltas.length === 0) {
    return {
      avgInhaleExhaleRatio: 1.0,
      rhythmVariance: 0,
      avgConservationDelta: 0
    };
  }

  // Compter inhales (delta > 0) et exhales (delta < 0)
  let inhaleCount = 0;
  let exhaleCount = 0;

  for (const delta of oxygenDeltas) {
    if (delta > 0.01) inhaleCount++;
    else if (delta < -0.01) exhaleCount++;
  }

  const avgInhaleExhaleRatio = exhaleCount > 0 
    ? inhaleCount / exhaleCount 
    : inhaleCount > 0 ? 2.0 : 1.0;

  // Variance du rythme
  const n = oxygenDeltas.length;
  const avgDelta = oxygenDeltas.reduce((a, b) => a + Math.abs(b), 0) / n;
  const sumSquared = oxygenDeltas.reduce((a, b) => a + (Math.abs(b) - avgDelta) ** 2, 0);
  const rhythmVariance = sumSquared / n;

  // Conservation moyenne
  const avgConservationDelta = conservationDeltas.length > 0
    ? conservationDeltas.reduce((a, b) => a + b, 0) / conservationDeltas.length
    : 0;

  return {
    avgInhaleExhaleRatio,
    rhythmVariance,
    avgConservationDelta
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS INLINE
// ─────────────────────────────────────────────────────────────────────────────

export function selfTest(): boolean {
  // Test decay factor
  const df0 = computeDecayFactor(0);
  if (Math.abs(df0 - 1) > 0.01) {
    console.error("FAIL: DecayFactor(0) should be 1:", df0);
    return false;
  }

  const df100 = computeDecayFactor(100);
  if (df100 >= df0) {
    console.error("FAIL: DecayFactor should decrease with streak");
    return false;
  }

  // Test relief
  const reliefLow = computeRelief(0.1);
  const reliefHigh = computeRelief(0.9);
  if (reliefLow <= reliefHigh) {
    console.error("FAIL: Relief should be higher at low O₂");
    return false;
  }

  // Test histogram normalization
  const hist = computeOxygenHistogram([0.1, 0.3, 0.5, 0.7, 0.9]);
  const histSum = hist.reduce((a, b) => a + b, 0);
  if (Math.abs(histSum - 1) > 0.01) {
    console.error("FAIL: Histogram should sum to 1:", histSum);
    return false;
  }

  // Test stats
  const stats = computeOxygenStats([0.1, 0.5, 0.9, 0.95]);
  if (stats.min !== 0.1 || stats.max !== 0.95) {
    console.error("FAIL: Stats min/max incorrect");
    return false;
  }
  if (stats.hypoxiaEvents !== 1) {
    console.error("FAIL: Should have 1 hypoxia event:", stats.hypoxiaEvents);
    return false;
  }

  console.log("✅ bio_engine.ts: All tests passed");
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  computeEmotionScore,
  computeDecayFactor,
  computeRelief,
  computeOxygen,
  detectMarkers,
  computeOxygenStats,
  computeOxygenHistogram,
  computeBreathingStats,
  selfTest
};
