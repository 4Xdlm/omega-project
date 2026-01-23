// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — Translator
// ═══════════════════════════════════════════════════════════════════════════════
// Convertit TruthBundle -> EmotionTrajectoryContract + PrismConstraints
// ZERO generation de texte - pure transformation de contraintes
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  TruthBundle,
  EmotionTrajectoryContract,
  TrajectoryWindow,
  BreathingMarker,
  EvolutionConstraint,
  PrismConstraints,
  GenesisConfig,
  EmotionType,
  EmotionField,
  OxygenResult,
  IntensityRecord14,
  TimelineFrame,
} from './types';
import { hashObject } from '../proofs/hash_utils';
import { PHYSICS } from './types';

/**
 * Genere un contrat de trajectoire emotionnelle depuis un TruthBundle
 */
export function generateTrajectoryContract(
  bundle: TruthBundle,
  config: GenesisConfig
): EmotionTrajectoryContract {
  // Creer les fenetres temporelles
  const windows = createTrajectoryWindows(bundle, config);

  // Deriver les marqueurs de respiration depuis O2
  const breathingMarkers = deriveBreathingMarkers(bundle);

  // Deriver les contraintes d'evolution depuis les parametres EmotionState
  const evolutionConstraints = deriveEvolutionConstraints(bundle.targetEmotionField);

  return {
    windows,
    breathingMarkers,
    evolutionConstraints,
    truthHash: bundle.bundleHash,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Cree les fenetres temporelles avec targets 14D
 */
function createTrajectoryWindows(
  bundle: TruthBundle,
  config: GenesisConfig
): TrajectoryWindow[] {
  const windows: TrajectoryWindow[] = [];

  if (bundle.timeline && bundle.timeline.length > 0) {
    // Utiliser la timeline fournie
    for (let i = 0; i < bundle.timeline.length; i++) {
      const frame = bundle.timeline[i];
      const nextFrame = bundle.timeline[i + 1];

      const tStart = frame.t;
      const tEnd = nextFrame ? nextFrame.t : 1.0;

      windows.push(createWindowFromFrame(frame, tStart, tEnd, config));
    }
  } else {
    // Creer une seule fenetre couvrant tout [0, 1]
    windows.push({
      tStart: 0,
      tEnd: 1,
      label: 'full',
      targetDominant: bundle.targetEmotionField.dominant,
      targetIntensities: bundle.targetEmotionField.normalizedIntensities,
      tolerances: {
        dominantTolerance: 0.15,
        distributionTolerance: config.judges.emotionBinding.MAX_COSINE_DISTANCE,
        entropyTolerance: config.judges.emotionBinding.MAX_ENTROPY_DEVIATION,
      },
      targetOxygen: {
        min: Math.max(0, bundle.targetOxygenResult.final - 0.15),
        max: Math.min(1, bundle.targetOxygenResult.final + 0.15),
      },
    });
  }

  return windows;
}

/**
 * Cree une fenetre depuis un TimelineFrame
 */
function createWindowFromFrame(
  frame: TimelineFrame,
  tStart: number,
  tEnd: number,
  config: GenesisConfig
): TrajectoryWindow {
  return {
    tStart,
    tEnd,
    label: frame.label,
    targetDominant: frame.emotionField.dominant,
    targetIntensities: frame.emotionField.normalizedIntensities,
    tolerances: {
      dominantTolerance: 0.15,
      distributionTolerance: config.judges.emotionBinding.MAX_COSINE_DISTANCE,
      entropyTolerance: config.judges.emotionBinding.MAX_ENTROPY_DEVIATION,
    },
    targetOxygen: {
      min: Math.max(0, frame.oxygenResult.final - 0.15),
      max: Math.min(1, frame.oxygenResult.final + 0.15),
    },
  };
}

/**
 * Derive les marqueurs de respiration depuis le profil O2
 */
function deriveBreathingMarkers(bundle: TruthBundle): BreathingMarker[] {
  const markers: BreathingMarker[] = [];

  if (bundle.timeline && bundle.timeline.length > 1) {
    let prevO2 = bundle.timeline[0].oxygenResult.final;

    for (let i = 1; i < bundle.timeline.length; i++) {
      const frame = bundle.timeline[i];
      const currentO2 = frame.oxygenResult.final;
      const delta = currentO2 - prevO2;

      // Detection des marqueurs basee sur delta et seuils
      if (currentO2 < PHYSICS.HYPOXIA_THRESHOLD) {
        markers.push({
          t: frame.t,
          type: 'HYPOXIA',
          intensity: 1 - currentO2 / PHYSICS.HYPOXIA_THRESHOLD,
          sourceOxygen: currentO2,
        });
      } else if (currentO2 > PHYSICS.HYPEROXIA_THRESHOLD) {
        markers.push({
          t: frame.t,
          type: 'HYPEROXIA',
          intensity: (currentO2 - PHYSICS.HYPEROXIA_THRESHOLD) / (1 - PHYSICS.HYPEROXIA_THRESHOLD),
          sourceOxygen: currentO2,
        });
      } else if (currentO2 > PHYSICS.CLIMAX_THRESHOLD) {
        markers.push({
          t: frame.t,
          type: 'CLIMAX',
          intensity: (currentO2 - PHYSICS.CLIMAX_THRESHOLD) / (1 - PHYSICS.CLIMAX_THRESHOLD),
          sourceOxygen: currentO2,
        });
      }

      // Detection ruptures et pauses basees sur delta
      if (delta > 0.2) {
        markers.push({
          t: frame.t,
          type: 'RUPTURE',
          intensity: Math.min(1, delta / 0.4),
          sourceOxygen: currentO2,
        });
      } else if (delta < -0.2) {
        markers.push({
          t: frame.t,
          type: 'RELEASE',
          intensity: Math.min(1, Math.abs(delta) / 0.4),
          sourceOxygen: currentO2,
        });
      } else if (Math.abs(delta) < 0.05 && currentO2 < 0.4) {
        markers.push({
          t: frame.t,
          type: 'PAUSE',
          intensity: 0.4 - currentO2,
          sourceOxygen: currentO2,
        });
      }

      prevO2 = currentO2;
    }
  } else {
    // Pas de timeline - deriver depuis le target unique
    const o2 = bundle.targetOxygenResult.final;

    if (o2 > PHYSICS.CLIMAX_THRESHOLD) {
      markers.push({
        t: 0.5,
        type: 'CLIMAX',
        intensity: (o2 - PHYSICS.CLIMAX_THRESHOLD) / (1 - PHYSICS.CLIMAX_THRESHOLD),
        sourceOxygen: o2,
      });
    } else if (o2 < PHYSICS.HYPOXIA_THRESHOLD) {
      markers.push({
        t: 0.5,
        type: 'HYPOXIA',
        intensity: 1 - o2 / PHYSICS.HYPOXIA_THRESHOLD,
        sourceOxygen: o2,
      });
    }
  }

  return markers;
}

/**
 * Derive les contraintes d'evolution depuis les parametres EmotionState
 */
function deriveEvolutionConstraints(field: EmotionField): EvolutionConstraint[] {
  const constraints: EvolutionConstraint[] = [];

  for (const [emotionId, state] of Object.entries(field.states)) {
    constraints.push({
      emotionId: emotionId as EmotionType,
      maxVelocity: 1 - state.inertia, // Haute inertie = faible velocite
      decayRate: state.decay_rate,
      massInfluence: state.mass / 10, // Normalise [0, 1]
    });
  }

  return constraints;
}

/**
 * Genere les contraintes PRISM depuis le contrat
 */
export function generatePrismConstraints(
  contract: EmotionTrajectoryContract,
  bundle: TruthBundle
): PrismConstraints {
  // Calculer la distribution protegee (moyenne des windows)
  const protectedDistribution = calculateAverageDistribution(contract.windows);

  // Calculer la plage O2 protegee
  const oxygenRange = calculateOxygenRange(contract.windows);

  return {
    protectedDistribution,
    distributionTolerance: contract.windows[0]?.tolerances.distributionTolerance || 0.15,
    protectedOxygenRange: oxygenRange,
    contractHash: hashObject(contract),
  };
}

/**
 * Calcule la distribution moyenne des intensites sur toutes les fenetres
 */
function calculateAverageDistribution(windows: TrajectoryWindow[]): IntensityRecord14 {
  if (windows.length === 0) {
    // Retourner distribution uniforme
    const uniform = 1 / 14;
    return {
      joy: uniform, fear: uniform, anger: uniform, sadness: uniform,
      surprise: uniform, disgust: uniform, trust: uniform, anticipation: uniform,
      love: uniform, guilt: uniform, shame: uniform, pride: uniform,
      hope: uniform, despair: uniform,
    };
  }

  // Somme ponderee par duree de fenetre
  const sum: Record<string, number> = {};
  let totalWeight = 0;

  for (const window of windows) {
    const weight = window.tEnd - window.tStart;
    totalWeight += weight;

    for (const [emotion, intensity] of Object.entries(window.targetIntensities)) {
      sum[emotion] = (sum[emotion] || 0) + intensity * weight;
    }
  }

  // Normaliser
  const result: Record<string, number> = {};
  for (const emotion of Object.keys(sum)) {
    result[emotion] = sum[emotion] / totalWeight;
  }

  return result as IntensityRecord14;
}

/**
 * Calcule la plage O2 protegee
 */
function calculateOxygenRange(windows: TrajectoryWindow[]): { min: number; max: number } {
  if (windows.length === 0) {
    return { min: 0.3, max: 0.7 };
  }

  let minO2 = 1;
  let maxO2 = 0;

  for (const window of windows) {
    minO2 = Math.min(minO2, window.targetOxygen.min);
    maxO2 = Math.max(maxO2, window.targetOxygen.max);
  }

  return { min: minO2, max: maxO2 };
}

export default {
  generateTrajectoryContract,
  generatePrismConstraints,
};
