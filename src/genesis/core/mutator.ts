// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — MUTATOR (Gradient-guided Constraint Adjustment)
// ═══════════════════════════════════════════════════════════════════════════════
// Ajuste les contraintes de generation basee sur les juges echoues
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  GenesisConfig,
  EmotionTrajectoryContract,
  PrismConstraints,
  SentinelResult,
} from './types';

/**
 * Contraintes d'ecriture ajustables
 */
export interface WritingConstraints {
  // Contraintes emotionnelles
  emotionStrictness: number;    // [0, 1] - plus strict = moins de deviation permise
  dominantEmphasis: number;     // [0, 1] - emphase sur l'emotion dominante

  // Contraintes stylistiques
  sentenceLengthTarget: number; // Longueur cible des phrases
  vocabularyLevel: number;      // [0, 1] - 0=simple, 1=sophistique

  // Contraintes de contenu
  concreteRatio: number;        // [0, 1] - ratio mots concrets vs abstraits
  sensoryDensity: number;       // [0, 1] - densite de mots sensoriels

  // Contraintes de rythme
  paceVariation: number;        // [0, 1] - variation de cadence
  pauseFrequency: number;       // [0, 1] - frequence des pauses (phrases courtes)

  // Seed pour reproductibilite
  seed: number;
}

/**
 * Creer des contraintes par defaut
 */
export function createDefaultConstraints(seed: number): WritingConstraints {
  return {
    emotionStrictness: 0.5,
    dominantEmphasis: 0.5,
    sentenceLengthTarget: 15,
    vocabularyLevel: 0.5,
    concreteRatio: 0.5,
    sensoryDensity: 0.3,
    paceVariation: 0.5,
    pauseFrequency: 0.3,
    seed,
  };
}

/**
 * Mute les contraintes basee sur les juges echoues
 */
export function mutateDraftConstraints(
  failedJudges: string[],
  currentConstraints: WritingConstraints,
  sentinelResult: SentinelResult,
  config: GenesisConfig
): WritingConstraints {
  let newConstraints = { ...currentConstraints };
  const mutationRate = config.loop.MUTATION_RATE_BASE;

  for (const judge of failedJudges) {
    switch (judge) {
      case 'j1_emotionBinding':
        newConstraints = adjustForEmotionBinding(newConstraints, sentinelResult, mutationRate);
        break;

      case 'j2_coherence':
        newConstraints = adjustForCoherence(newConstraints, mutationRate);
        break;

      case 'j3_sterility':
        newConstraints = adjustForSterility(newConstraints, mutationRate);
        break;

      case 'j4_uniqueness':
        newConstraints = adjustForUniqueness(newConstraints, mutationRate);
        break;

      case 'j5_density':
        newConstraints = adjustForDensity(newConstraints, sentinelResult, mutationRate);
        break;

      case 'j6_resonance':
        newConstraints = adjustForResonance(newConstraints, sentinelResult, mutationRate);
        break;

      case 'j7_antiGaming':
        newConstraints = adjustForAntiGaming(newConstraints, sentinelResult, mutationRate);
        break;
    }
  }

  // Increment seed for next iteration
  newConstraints.seed = currentConstraints.seed + 1;

  return newConstraints;
}

/**
 * Ajuster pour J1 EMOTION-BINDING
 */
function adjustForEmotionBinding(
  constraints: WritingConstraints,
  result: SentinelResult,
  rate: number
): WritingConstraints {
  const metrics = result.scores.j1_emotionBinding.metrics;

  // Si distance cosinus trop grande, augmenter strictness
  const cosineDistance = metrics['avg_cosine_distance'] || 0;
  if (cosineDistance > 0.1) {
    constraints.emotionStrictness = Math.min(1, constraints.emotionStrictness + rate);
  }

  // Si dominant ne match pas, augmenter emphase
  const dominantMatch = metrics['dominant_match_ratio'] || 0;
  if (dominantMatch < 0.7) {
    constraints.dominantEmphasis = Math.min(1, constraints.dominantEmphasis + rate);
  }

  return constraints;
}

/**
 * Ajuster pour J2 COHERENCE
 */
function adjustForCoherence(
  constraints: WritingConstraints,
  rate: number
): WritingConstraints {
  // Reduire la complexite pour ameliorer la coherence
  constraints.sentenceLengthTarget = Math.max(8, constraints.sentenceLengthTarget - 2);
  constraints.vocabularyLevel = Math.max(0.2, constraints.vocabularyLevel - rate);

  return constraints;
}

/**
 * Ajuster pour J3 STERILITY
 */
function adjustForSterility(
  constraints: WritingConstraints,
  rate: number
): WritingConstraints {
  // Augmenter le niveau de vocabulaire pour eviter les cliches
  constraints.vocabularyLevel = Math.min(0.8, constraints.vocabularyLevel + rate);
  // Augmenter la densite sensorielle (mots specifiques vs generiques)
  constraints.sensoryDensity = Math.min(0.7, constraints.sensoryDensity + rate);

  return constraints;
}

/**
 * Ajuster pour J4 UNIQUENESS
 */
function adjustForUniqueness(
  constraints: WritingConstraints,
  rate: number
): WritingConstraints {
  // Augmenter le niveau de vocabulaire pour plus d'originalite
  constraints.vocabularyLevel = Math.min(0.9, constraints.vocabularyLevel + rate * 1.5);
  // Varier le rythme pour eviter les patterns communs
  constraints.paceVariation = Math.min(0.8, constraints.paceVariation + rate);

  return constraints;
}

/**
 * Ajuster pour J5 DENSITY
 */
function adjustForDensity(
  constraints: WritingConstraints,
  result: SentinelResult,
  rate: number
): WritingConstraints {
  const metrics = result.scores.j5_density.metrics;

  // Si ratio de contenu trop bas, augmenter concretRatio
  const contentRatio = metrics['content_ratio'] || 0.5;
  if (contentRatio < 0.6) {
    constraints.concreteRatio = Math.min(0.8, constraints.concreteRatio + rate);
  }

  // Si trop de fillers, reduire
  const fillerRatio = metrics['filler_ratio'] || 0;
  if (fillerRatio > 0.15) {
    constraints.vocabularyLevel = Math.min(0.8, constraints.vocabularyLevel + rate);
  }

  return constraints;
}

/**
 * Ajuster pour J6 RESONANCE
 */
function adjustForResonance(
  constraints: WritingConstraints,
  result: SentinelResult,
  rate: number
): WritingConstraints {
  const metrics = result.scores.j6_resonance.metrics;

  // Si O2 alignment faible, ajuster l'intensite emotionnelle
  const o2Align = metrics['o2_alignment'] || 0.5;
  if (o2Align < 0.65) {
    constraints.emotionStrictness = Math.min(1, constraints.emotionStrictness + rate);
  }

  // Si rythme hors band, ajuster variation et pauses
  const rhythm = metrics['rhythm'] || 0.5;
  if (rhythm < 0.3) {
    // Trop uniforme
    constraints.paceVariation = Math.min(0.8, constraints.paceVariation + rate);
  } else if (rhythm > 0.7) {
    // Trop chaotique
    constraints.paceVariation = Math.max(0.2, constraints.paceVariation - rate);
  }

  return constraints;
}

/**
 * Ajuster pour J7 ANTI-GAMING
 */
function adjustForAntiGaming(
  constraints: WritingConstraints,
  result: SentinelResult,
  rate: number
): WritingConstraints {
  const metrics = result.scores.j7_antiGaming.metrics;

  // Si ratio tokens rares hors band
  const rareRatio = metrics['rare_token_ratio'] || 0.5;
  if (rareRatio < 0.2) {
    // Pas assez de variete
    constraints.vocabularyLevel = Math.min(0.8, constraints.vocabularyLevel + rate);
  } else if (rareRatio > 0.8) {
    // Trop de mots rares (gaming)
    constraints.vocabularyLevel = Math.max(0.3, constraints.vocabularyLevel - rate);
  }

  // Si readability trop basse
  const readability = metrics['readability_score'] || 60;
  if (readability < 60) {
    // Simplifier
    constraints.sentenceLengthTarget = Math.max(10, constraints.sentenceLengthTarget - 3);
    constraints.vocabularyLevel = Math.max(0.3, constraints.vocabularyLevel - rate);
  }

  return constraints;
}

/**
 * Genere une variation de contraintes pour exploration
 */
export function exploreConstraintVariation(
  baseConstraints: WritingConstraints,
  variation: number,
  seed: number
): WritingConstraints {
  // RNG deterministe
  let rng = seed;
  const nextRandom = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return (rng / 0x7fffffff) * 2 - 1; // [-1, 1]
  };

  return {
    emotionStrictness: clamp(baseConstraints.emotionStrictness + nextRandom() * variation, 0, 1),
    dominantEmphasis: clamp(baseConstraints.dominantEmphasis + nextRandom() * variation, 0, 1),
    sentenceLengthTarget: Math.max(5, Math.min(30, baseConstraints.sentenceLengthTarget + nextRandom() * variation * 10)),
    vocabularyLevel: clamp(baseConstraints.vocabularyLevel + nextRandom() * variation, 0, 1),
    concreteRatio: clamp(baseConstraints.concreteRatio + nextRandom() * variation, 0, 1),
    sensoryDensity: clamp(baseConstraints.sensoryDensity + nextRandom() * variation, 0, 1),
    paceVariation: clamp(baseConstraints.paceVariation + nextRandom() * variation, 0, 1),
    pauseFrequency: clamp(baseConstraints.pauseFrequency + nextRandom() * variation, 0, 1),
    seed: seed,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default {
  createDefaultConstraints,
  mutateDraftConstraints,
  exploreConstraintVariation,
};
