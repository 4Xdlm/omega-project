// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — J1 EMOTION-BINDING (14D Alignment)
// ═══════════════════════════════════════════════════════════════════════════════
// CRITIQUE: Ce juge compare la distribution 14D mesuree avec la cible
// Utilise distance cosinus sur vecteur 14D (pas X/Y/Z)
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Draft,
  EmotionTrajectoryContract,
  GenesisConfig,
  JudgeScore,
  IntensityRecord14,
  EmotionType,
  TrajectoryWindow,
} from '../core/types';
import { measureEmotionDistribution, cosineDistance } from '../core/prism';

/**
 * Evalue l'alignement emotionnel d'un draft avec le contrat
 */
export function evaluateEmotionBinding(
  draft: Draft,
  contract: EmotionTrajectoryContract,
  config: GenesisConfig
): JudgeScore {
  const metrics: Record<string, number> = {};
  const thresholds = config.judges.emotionBinding;

  // 1. Mesurer la distribution emotionnelle du texte
  const measuredDistribution = draft.measured?.emotionField.normalizedIntensities
    || measureEmotionDistribution(draft.text);

  // 2. Pour chaque fenetre, evaluer l'alignement
  let totalDistance = 0;
  let dominantMatches = 0;
  let totalEntropyDeviation = 0;

  for (let i = 0; i < contract.windows.length; i++) {
    const window = contract.windows[i];

    // Extraire la portion de texte correspondant a la fenetre
    // Pour simplifier, on utilise la distribution globale
    // TODO: Segmenter le texte par fenetre temporelle
    const windowDistribution = measuredDistribution;

    // Distance cosinus
    const distance = cosineDistance(windowDistribution, window.targetIntensities);
    totalDistance += distance;
    metrics[`window_${i}_cosine_distance`] = distance;

    // Dominant match
    const measuredDominant = findDominantEmotion(windowDistribution);
    const dominantMatch = measuredDominant === window.targetDominant ? 1 : 0;
    dominantMatches += dominantMatch;
    metrics[`window_${i}_dominant_match`] = dominantMatch;

    // Entropy deviation
    const measuredEntropy = calculateEntropy(windowDistribution);
    const targetEntropy = calculateEntropy(window.targetIntensities);
    const entropyDev = Math.abs(measuredEntropy - targetEntropy);
    totalEntropyDeviation += entropyDev;
    metrics[`window_${i}_entropy_deviation`] = entropyDev;
  }

  const numWindows = contract.windows.length || 1;

  // Metriques agregees
  const avgCosineDistance = totalDistance / numWindows;
  const dominantMatchRatio = dominantMatches / numWindows;
  const avgEntropyDeviation = totalEntropyDeviation / numWindows;

  metrics['avg_cosine_distance'] = avgCosineDistance;
  metrics['dominant_match_ratio'] = dominantMatchRatio;
  metrics['avg_entropy_deviation'] = avgEntropyDeviation;

  // 3. Evaluer le verdict
  const pass =
    avgCosineDistance <= thresholds.MAX_COSINE_DISTANCE &&
    dominantMatchRatio >= thresholds.MIN_DOMINANT_MATCH &&
    avgEntropyDeviation <= thresholds.MAX_ENTROPY_DEVIATION;

  return {
    verdict: pass ? 'PASS' : 'FAIL',
    metrics,
    threshold: {
      MAX_COSINE_DISTANCE: thresholds.MAX_COSINE_DISTANCE,
      MIN_DOMINANT_MATCH: thresholds.MIN_DOMINANT_MATCH,
      MAX_ENTROPY_DEVIATION: thresholds.MAX_ENTROPY_DEVIATION,
    },
    details: pass
      ? undefined
      : `Failed: cosine=${avgCosineDistance.toFixed(3)} (max ${thresholds.MAX_COSINE_DISTANCE}), ` +
        `dominant=${dominantMatchRatio.toFixed(2)} (min ${thresholds.MIN_DOMINANT_MATCH}), ` +
        `entropy=${avgEntropyDeviation.toFixed(3)} (max ${thresholds.MAX_ENTROPY_DEVIATION})`,
  };
}

/**
 * Trouve l'emotion dominante (argmax)
 */
function findDominantEmotion(distribution: IntensityRecord14): EmotionType {
  const emotions: EmotionType[] = [
    'joy', 'fear', 'anger', 'sadness',
    'surprise', 'disgust', 'trust', 'anticipation',
    'love', 'guilt', 'shame', 'pride',
    'hope', 'despair'
  ];

  let maxIntensity = -1;
  let dominant: EmotionType = 'joy';

  for (const e of emotions) {
    if (distribution[e] > maxIntensity) {
      maxIntensity = distribution[e];
      dominant = e;
    }
  }

  return dominant;
}

/**
 * Calcule l'entropie Shannon normalisee d'une distribution
 */
function calculateEntropy(distribution: IntensityRecord14): number {
  const emotions: EmotionType[] = [
    'joy', 'fear', 'anger', 'sadness',
    'surprise', 'disgust', 'trust', 'anticipation',
    'love', 'guilt', 'shame', 'pride',
    'hope', 'despair'
  ];

  let entropy = 0;
  for (const e of emotions) {
    const p = distribution[e];
    if (p > 0) {
      entropy -= p * Math.log(p);
    }
  }

  // Normaliser par log(14) pour obtenir [0, 1]
  const maxEntropy = Math.log(14);
  return entropy / maxEntropy;
}

export default evaluateEmotionBinding;
