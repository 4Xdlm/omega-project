/**
 * DNA Fingerprint Module for OMEGA UI
 * @module core/dna
 * @description Generates emotional DNA fingerprints
 */

import type {
  DNAFingerprint,
  EmotionVector,
  TextAnalysisResult,
} from './types';
import { EMOTION14_LIST } from './analyzer';

/**
 * DNA component count (8 base features * 14 emotions + 16 style = 128)
 */
const DNA_COMPONENT_COUNT = 128;

/**
 * Simple hash function for DNA fingerprint
 * @param components - DNA component array
 * @returns Hash string
 */
function hashComponents(components: number[]): string {
  let hash = 0;
  const str = components.map(c => c.toFixed(6)).join(',');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Normalize a vector to sum to 1
 * @param values - Array of numbers
 * @returns Normalized array
 */
function normalize(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum === 0) return values.map(() => 0);
  return values.map(v => v / sum);
}

/**
 * Extract emotion features from analysis
 * @param analysis - Text analysis result
 * @returns Array of 14 emotion intensities
 */
function extractEmotionFeatures(analysis: TextAnalysisResult): number[] {
  return EMOTION14_LIST.map(emotion => {
    return analysis.aggregateEmotions[emotion] ?? 0;
  });
}

/**
 * Extract variance features across segments
 * @param analysis - Text analysis result
 * @returns Array of 14 variance values
 */
function extractVarianceFeatures(analysis: TextAnalysisResult): number[] {
  const emotionValues: Record<string, number[]> = {};

  for (const segment of analysis.segments) {
    for (const emotion of EMOTION14_LIST) {
      if (!emotionValues[emotion]) emotionValues[emotion] = [];
      emotionValues[emotion].push(segment.emotions[emotion] ?? 0);
    }
  }

  return EMOTION14_LIST.map(emotion => {
    const values = emotionValues[emotion] ?? [0];
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  });
}

/**
 * Extract peak features (max intensity per emotion)
 * @param analysis - Text analysis result
 * @returns Array of 14 peak values
 */
function extractPeakFeatures(analysis: TextAnalysisResult): number[] {
  const peaks: Record<string, number> = {};

  for (const segment of analysis.segments) {
    for (const emotion of EMOTION14_LIST) {
      const current = peaks[emotion] ?? 0;
      const segmentValue = segment.emotions[emotion] ?? 0;
      peaks[emotion] = Math.max(current, segmentValue);
    }
  }

  return EMOTION14_LIST.map(emotion => peaks[emotion] ?? 0);
}

/**
 * Extract transition features (emotion changes between segments)
 * @param analysis - Text analysis result
 * @returns Array of 14 transition scores
 */
function extractTransitionFeatures(analysis: TextAnalysisResult): number[] {
  if (analysis.segments.length < 2) {
    return EMOTION14_LIST.map(() => 0);
  }

  const transitions: Record<string, number> = {};

  for (let i = 1; i < analysis.segments.length; i++) {
    const prev = analysis.segments[i - 1];
    const curr = analysis.segments[i];

    for (const emotion of EMOTION14_LIST) {
      const prevVal = prev.emotions[emotion] ?? 0;
      const currVal = curr.emotions[emotion] ?? 0;
      const delta = Math.abs(currVal - prevVal);
      transitions[emotion] = (transitions[emotion] ?? 0) + delta;
    }
  }

  const count = analysis.segments.length - 1;
  return EMOTION14_LIST.map(emotion => (transitions[emotion] ?? 0) / count);
}

/**
 * Extract temporal features (emotion progression)
 * @param analysis - Text analysis result
 * @returns Array of 14 temporal slope values
 */
function extractTemporalFeatures(analysis: TextAnalysisResult): number[] {
  if (analysis.segments.length < 2) {
    return EMOTION14_LIST.map(() => 0);
  }

  return EMOTION14_LIST.map(emotion => {
    const values = analysis.segments.map(s => s.emotions[emotion] ?? 0);
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  });
}

/**
 * Extract style features from text
 * @param analysis - Text analysis result
 * @returns Array of 16 style values
 */
function extractStyleFeatures(analysis: TextAnalysisResult): number[] {
  const text = analysis.originalText;
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = analysis.segments.length;

  return [
    words.length / 100,
    sentences / 10,
    words.length / Math.max(sentences, 1),
    (text.match(/[!]/g) ?? []).length / Math.max(sentences, 1),
    (text.match(/[?]/g) ?? []).length / Math.max(sentences, 1),
    (text.match(/[,;:]/g) ?? []).length / words.length,
    words.filter(w => w.length > 6).length / words.length,
    words.filter(w => w[0] === w[0].toUpperCase()).length / words.length,
    new Set(words.map(w => w.toLowerCase())).size / words.length,
    (text.match(/[A-Z]/g) ?? []).length / text.length,
    analysis.overallValence,
    analysis.averageConfidence,
    Math.abs(analysis.overallValence),
    Object.keys(analysis.aggregateEmotions).length / 14,
    analysis.dominantEmotion ? 1 : 0,
    analysis.segmentCount / 10,
  ];
}

/**
 * Generate DNA fingerprint from analysis
 * @param analysis - Text analysis result
 * @returns DNA fingerprint with 128 components
 */
export function generateDNA(analysis: TextAnalysisResult): DNAFingerprint {
  const components: number[] = [];

  components.push(...normalize(extractEmotionFeatures(analysis)));
  components.push(...normalize(extractVarianceFeatures(analysis)));
  components.push(...normalize(extractPeakFeatures(analysis)));
  components.push(...normalize(extractTransitionFeatures(analysis)));
  components.push(...normalize(extractTemporalFeatures(analysis)));
  components.push(...normalize(extractStyleFeatures(analysis)));

  while (components.length < DNA_COMPONENT_COUNT) {
    components.push(0);
  }

  const finalComponents = components.slice(0, DNA_COMPONENT_COUNT);
  const hash = hashComponents(finalComponents);

  return {
    components: finalComponents,
    hash,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Calculate similarity between two DNA fingerprints
 * @param dna1 - First fingerprint
 * @param dna2 - Second fingerprint
 * @returns Similarity score (0-1)
 */
export function calculateSimilarity(dna1: DNAFingerprint, dna2: DNAFingerprint): number {
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < DNA_COMPONENT_COUNT; i++) {
    const a = dna1.components[i] ?? 0;
    const b = dna2.components[i] ?? 0;
    dotProduct += a * b;
    mag1 += a * a;
    mag2 += b * b;
  }

  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}
