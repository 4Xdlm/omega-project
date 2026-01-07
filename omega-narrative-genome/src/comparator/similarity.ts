/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NARRATIVE GENOME — COMPARATOR
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * 
 * Responsabilité: Calcul de similarité entre genomes
 * 
 * INVARIANTS:
 * - INV-GEN-05: sim(A,B) = sim(B,A) (symétrie)
 * - INV-GEN-06: 0 ≤ similarity ≤ 1
 * - INV-GEN-07: sim(A,A) = 1.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { 
  NarrativeGenome, 
  SimilarityResult, 
  DetailedComparison,
  SimilarityWeights,
  SimilarityVerdict,
  EmotionAxis,
  StyleAxis,
  StructureAxis,
  TempoAxis,
} from "../types";
import { 
  DEFAULT_WEIGHTS, 
  SIMILARITY_THRESHOLDS,
  SIMILARITY_DISCLAIMER,
} from "../constants";

// ═══════════════════════════════════════════════════════════════════════════════
// COSINE SIMILARITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule la similarité cosine entre deux vecteurs
 * 
 * INV-GEN-05: Symétrique par construction
 * INV-GEN-06: Résultat toujours dans [0,1] pour vecteurs positifs
 * INV-GEN-07: cosine(v, v) = 1.0
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  
  if (a.length === 0) {
    return 1.0; // Cas dégénéré: vecteurs vides = identiques
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (denominator === 0) {
    // Vecteurs nuls = identiques (ou incomparables)
    return normA === 0 && normB === 0 ? 1.0 : 0.0;
  }
  
  const similarity = dotProduct / denominator;
  
  // Clamp pour éviter les erreurs de précision flottante
  return Math.max(0, Math.min(1, similarity));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLATTEN AXES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convertit EmotionAxis en vecteur plat pour comparaison
 */
export function flattenEmotionAxis(axis: EmotionAxis): number[] {
  const vector: number[] = [];
  
  // Distribution (14 valeurs, ordre alphabétique)
  const emotions = Object.keys(axis.distribution).sort();
  for (const emotion of emotions) {
    vector.push(axis.distribution[emotion as keyof typeof axis.distribution]);
  }
  
  // Courbe de tension (10 valeurs)
  vector.push(...axis.tensionCurve);
  
  // Valence moyenne (normalisée de [-1,1] à [0,1])
  vector.push((axis.averageValence + 1) / 2);
  
  // Transitions (fréquences des top 5)
  for (const t of axis.dominantTransitions) {
    vector.push(t.frequency);
  }
  // Padding si moins de 5 transitions
  for (let i = axis.dominantTransitions.length; i < 5; i++) {
    vector.push(0);
  }
  
  return vector;
}

/**
 * Convertit StyleAxis en vecteur plat
 */
export function flattenStyleAxis(axis: StyleAxis): number[] {
  return [
    axis.burstiness,
    axis.perplexity,
    axis.humanTouch,
    axis.lexicalRichness,
    axis.averageSentenceLength,
    axis.dialogueRatio,
  ];
}

/**
 * Convertit StructureAxis en vecteur plat
 */
export function flattenStructureAxis(axis: StructureAxis): number[] {
  return [
    axis.chapterCount,
    axis.averageChapterLength,
    axis.incitingIncident,
    axis.midpoint,
    axis.climax,
    axis.povCount,
    axis.timelineComplexity,
  ];
}

/**
 * Convertit TempoAxis en vecteur plat
 */
export function flattenTempoAxis(axis: TempoAxis): number[] {
  return [
    axis.averagePace,
    axis.paceVariance,
    axis.actionDensity,
    axis.dialogueDensity,
    axis.descriptionDensity,
    axis.breathingCycles,
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARAISON
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Détermine le verdict basé sur le score
 */
export function getVerdict(score: number): SimilarityVerdict {
  if (score >= SIMILARITY_THRESHOLDS.IDENTICAL) return "IDENTICAL";
  if (score >= SIMILARITY_THRESHOLDS.VERY_SIMILAR) return "VERY_SIMILAR";
  if (score >= SIMILARITY_THRESHOLDS.SIMILAR) return "SIMILAR";
  if (score >= SIMILARITY_THRESHOLDS.DIFFERENT) return "DIFFERENT";
  return "UNIQUE";
}

/**
 * Compare deux genomes et retourne un score de similarité
 * 
 * INV-GEN-05: Symétrique
 * INV-GEN-06: Score dans [0,1]
 * INV-GEN-07: compare(A, A) = 1.0
 */
export function compare(
  a: NarrativeGenome,
  b: NarrativeGenome,
  weights: SimilarityWeights = DEFAULT_WEIGHTS
): SimilarityResult {
  const detailed = compareDetailed(a, b, weights);
  
  return {
    score: detailed.overall,
    confidence: calculateConfidence(detailed),
    verdict: getVerdict(detailed.overall),
    disclaimer: SIMILARITY_DISCLAIMER,
  };
}

/**
 * Compare deux genomes avec détail par axe
 */
export function compareDetailed(
  a: NarrativeGenome,
  b: NarrativeGenome,
  weights: SimilarityWeights = DEFAULT_WEIGHTS
): DetailedComparison {
  // Calcul similarité par axe
  const emotionSim = cosineSimilarity(
    flattenEmotionAxis(a.axes.emotion),
    flattenEmotionAxis(b.axes.emotion)
  );
  
  const styleSim = cosineSimilarity(
    flattenStyleAxis(a.axes.style),
    flattenStyleAxis(b.axes.style)
  );
  
  const structureSim = cosineSimilarity(
    flattenStructureAxis(a.axes.structure),
    flattenStructureAxis(b.axes.structure)
  );
  
  const tempoSim = cosineSimilarity(
    flattenTempoAxis(a.axes.tempo),
    flattenTempoAxis(b.axes.tempo)
  );
  
  // Score global pondéré
  const overall = 
    weights.emotion * emotionSim +
    weights.style * styleSim +
    weights.structure * structureSim +
    weights.tempo * tempoSim;
  
  return {
    overall: Math.max(0, Math.min(1, overall)),
    byAxis: {
      emotion: emotionSim,
      style: styleSim,
      structure: structureSim,
      tempo: tempoSim,
    },
    weights,
  };
}

/**
 * Calcule un score de confiance basé sur la cohérence des axes
 */
function calculateConfidence(detailed: DetailedComparison): number {
  const scores = [
    detailed.byAxis.emotion,
    detailed.byAxis.style,
    detailed.byAxis.structure,
    detailed.byAxis.tempo,
  ];
  
  // Variance des scores par axe
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  
  // Confiance inversement proportionnelle à la variance
  // Variance faible = axes cohérents = haute confiance
  const confidence = 1 - Math.sqrt(variance);
  
  return Math.max(0, Math.min(1, confidence));
}
