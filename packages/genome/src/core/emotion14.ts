/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — EMOTION14 SANCTUARISÉ
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * 
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CE FICHIER EST SANCTUARISÉ — NE PAS MODIFIER SANS NCR FORMEL             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Emotion14 } from "../api/types.js";

/**
 * Liste ordonnée des 14 émotions canoniques
 * ORDRE ALPHABÉTIQUE — NE PAS MODIFIER
 * 
 * Utilisé pour:
 * - Sérialisation canonique
 * - Création de distributions vides
 * - Validation
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

/**
 * Crée une distribution émotionnelle vide (tous à 0)
 */
export function createEmptyDistribution(): Record<Emotion14, number> {
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
export function normalizeDistribution(dist: Record<Emotion14, number>): Record<Emotion14, number> {
  const sum = Object.values(dist).reduce((a, b) => a + b, 0);
  
  if (sum === 0) {
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
