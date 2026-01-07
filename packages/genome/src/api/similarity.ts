/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — SIMILARITY API
 * Version: 1.2.0
 * Standard: NASA-Grade L4
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
} from "./types.js";
import { 
  DEFAULT_WEIGHTS, 
  SIMILARITY_THRESHOLDS,
  SIMILARITY_DISCLAIMER,
} from "../core/version.js";

// ═══════════════════════════════════════════════════════════════════════════════
// COSINE SIMILARITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule la similarité cosine entre deux vecteurs
 * INV-GEN-07: sim(A,A) = 1.0 garanti
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  
  if (a.length === 0) {
    return 1.0;
  }
  
  // Détection rapide si même référence
  if (a === b) {
    return 1.0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  let identical = true;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
    if (a[i] !== b[i]) {
      identical = false;
    }
  }
  
  // Si vecteurs identiques valeur par valeur → 1.0 exact
  if (identical) {
    return 1.0;
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (denominator === 0) {
    return normA === 0 && normB === 0 ? 1.0 : 0.0;
  }
  
  const similarity = dotProduct / denominator;
  return Math.max(0, Math.min(1, similarity));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLATTEN AXES
// ═══════════════════════════════════════════════════════════════════════════════

export function flattenEmotionAxis(axis: EmotionAxis): number[] {
  const vector: number[] = [];
  
  const emotions = Object.keys(axis.distribution).sort();
  for (const emotion of emotions) {
    vector.push(axis.distribution[emotion as keyof typeof axis.distribution]);
  }
  
  vector.push(...axis.tensionCurve);
  vector.push((axis.averageValence + 1) / 2);
  
  for (const t of axis.dominantTransitions) {
    vector.push(t.frequency);
  }
  for (let i = axis.dominantTransitions.length; i < 5; i++) {
    vector.push(0);
  }
  
  return vector;
}

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
// COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

export function getVerdict(score: number): SimilarityVerdict {
  if (score >= SIMILARITY_THRESHOLDS.IDENTICAL) return "IDENTICAL";
  if (score >= SIMILARITY_THRESHOLDS.VERY_SIMILAR) return "VERY_SIMILAR";
  if (score >= SIMILARITY_THRESHOLDS.SIMILAR) return "SIMILAR";
  if (score >= SIMILARITY_THRESHOLDS.DIFFERENT) return "DIFFERENT";
  return "UNIQUE";
}

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

export function compareDetailed(
  a: NarrativeGenome,
  b: NarrativeGenome,
  weights: SimilarityWeights = DEFAULT_WEIGHTS
): DetailedComparison {
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

function calculateConfidence(detailed: DetailedComparison): number {
  const scores = [
    detailed.byAxis.emotion,
    detailed.byAxis.style,
    detailed.byAxis.structure,
    detailed.byAxis.tempo,
  ];
  
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  
  const confidence = 1 - Math.sqrt(variance);
  return Math.max(0, Math.min(1, confidence));
}
