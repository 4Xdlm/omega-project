/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NARRATIVE GENOME — EMOTION EXTRACTOR
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { EmotionAxis, Emotion14, EmotionTransition } from "../types";
import { EMOTION14_ORDERED } from "../types";
import { TENSION_CURVE_POINTS, MAX_DOMINANT_TRANSITIONS } from "../constants";

/**
 * Crée une distribution émotionnelle vide
 */
function createEmptyDistribution(): Record<Emotion14, number> {
  const dist: Partial<Record<Emotion14, number>> = {};
  for (const emotion of EMOTION14_ORDERED) {
    dist[emotion] = 0;
  }
  return dist as Record<Emotion14, number>;
}

/**
 * Normalise une distribution pour que la somme = 1.0
 * INV-GEN-04: Distribution somme à 1.0
 */
function normalizeDistribution(dist: Record<Emotion14, number>): Record<Emotion14, number> {
  const sum = Object.values(dist).reduce((a, b) => a + b, 0);
  
  if (sum === 0) {
    // Distribution uniforme si tout est à zéro
    const uniform = 1 / EMOTION14_ORDERED.length;
    const result = createEmptyDistribution();
    for (const emotion of EMOTION14_ORDERED) {
      result[emotion] = uniform;
    }
    return result;
  }
  
  const result = createEmptyDistribution();
  for (const emotion of EMOTION14_ORDERED) {
    result[emotion] = dist[emotion] / sum;
  }
  return result;
}

/**
 * Extrait l'axe émotionnel depuis les données OMEGA
 * 
 * NOTE: Cette implémentation est un PLACEHOLDER.
 * L'intégration réelle avec omega-text-analyzer/oracle viendra plus tard.
 */
export function extractEmotionAxis(
  emotionData: unknown,
  _seed: number
): EmotionAxis {
  // TODO: Intégration avec OMEGA existant
  // Pour l'instant, extraction basique ou mock
  
  const data = emotionData as Record<string, unknown> | undefined;
  
  // Distribution
  let distribution = createEmptyDistribution();
  if (data?.distribution && typeof data.distribution === "object") {
    const rawDist = data.distribution as Record<string, number>;
    for (const emotion of EMOTION14_ORDERED) {
      if (typeof rawDist[emotion] === "number") {
        distribution[emotion] = Math.max(0, Math.min(1, rawDist[emotion]));
      }
    }
  }
  distribution = normalizeDistribution(distribution);
  
  // Transitions
  let dominantTransitions: EmotionTransition[] = [];
  if (data?.transitions && Array.isArray(data.transitions)) {
    dominantTransitions = (data.transitions as EmotionTransition[])
      .slice(0, MAX_DOMINANT_TRANSITIONS)
      .map(t => ({
        from: t.from,
        to: t.to,
        frequency: Math.max(0, Math.min(1, t.frequency)),
      }));
  }
  
  // Courbe de tension
  let tensionCurve: number[] = [];
  if (data?.tensionCurve && Array.isArray(data.tensionCurve)) {
    tensionCurve = (data.tensionCurve as number[])
      .slice(0, TENSION_CURVE_POINTS)
      .map(v => Math.max(0, Math.min(1, v)));
  }
  // Padding si nécessaire
  while (tensionCurve.length < TENSION_CURVE_POINTS) {
    tensionCurve.push(0.5);
  }
  
  // Valence
  let averageValence = 0;
  if (typeof data?.valence === "number") {
    averageValence = Math.max(-1, Math.min(1, data.valence));
  }
  
  return {
    distribution,
    dominantTransitions,
    tensionCurve,
    averageValence,
  };
}
