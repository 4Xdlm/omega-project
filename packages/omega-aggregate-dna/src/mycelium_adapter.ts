// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — AGGREGATE DNA v1.0.0 — MYCELIUM ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════
// Adapter concret pour le type MyceliumDNA officiel OMEGA
// Basé sur: packages/mycelium-bio/src/types.ts et dna_builder.ts
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  AggregateAdapter,
  AggregatedDNAArgs,
  EmotionField,
  TextStats,
  EmotionType,
} from "./types.js";
import { EMOTION_TYPES } from "./types.js";
import { hashObject } from "./merkle.js";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES MYCELIUM (simplifié pour l'adapter)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Structure simplifiée du MyceliumDNA
 * Compatible avec packages/mycelium-bio/src/types.ts
 */
export interface MyceliumDNA {
  version: string;
  profile: string;
  seed: number;
  sourceHash: string;
  fingerprint: MyceliumFingerprint;
  nodes: readonly MyceliumNode[];
  rootHash: string;
  meta: {
    computedAt: string;
    nodeCount: number;
    processingTimeMs: number;
  };
  /** Ajouté par l'agrégation */
  aggregation?: AggregationData;
}

export interface MyceliumFingerprint {
  emotionDistribution: Record<EmotionType, number>;
  oxygenHistogram: readonly number[];
  hueHistogram: readonly number[];
  stats: {
    avgOxygen: number;
    maxOxygen: number;
    minOxygen: number;
    hypoxiaEvents: number;
    hyperoxiaEvents: number;
    climaxEvents: number;
    fruitCount: number;
    scarCount: number;
  };
  breathing: {
    avgInhaleExhaleRatio: number;
    rhythmVariance: number;
    avgConservationDelta: number;
  };
}

export interface MyceliumNode {
  id: string;
  kind: string;
  level: number;
  emotionField?: {
    states: Record<EmotionType, EmotionState>;
    normalizedIntensities: Record<EmotionType, number>;
    dominant: EmotionType;
    peak: number;
    totalEnergy: number;
    entropy: number;
    contrast: number;
    inertia: number;
    conservationDelta: number;
  };
  nodeHash: string;
}

export interface EmotionState {
  type: EmotionType;
  mass: number;
  intensity: number;
  inertia: number;
  decay_rate: number;
  baseline: number;
}

export interface AggregationData {
  segment_count: number;
  segment_root_hashes: readonly string[];
  merkle_root: string;
  segmentation_hash: string | null;
  weighting: "word_count";
  aggregator_version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adapter pour MyceliumDNA
 * Implémente AggregateAdapter<MyceliumDNA>
 */
export const MyceliumDNAAdapter: AggregateAdapter<MyceliumDNA> = {
  /**
   * Extrait le champ émotionnel des nodes
   */
  extractEmotionField(dna: MyceliumDNA): EmotionField {
    const result: Record<string, Record<string, number>> = {};

    // Initialiser avec les distributions du fingerprint
    for (const emotion of EMOTION_TYPES) {
      const intensity = dna.fingerprint?.emotionDistribution?.[emotion] ?? 0;
      result[emotion] = { intensity };
    }

    // Si on a des nodes avec emotionField, agréger leurs états
    if (dna.nodes && dna.nodes.length > 0) {
      const nodeFields = dna.nodes
        .filter(n => n.emotionField?.states)
        .map(n => n.emotionField!.states);

      if (nodeFields.length > 0) {
        // Moyenne des états des nodes
        for (const emotion of EMOTION_TYPES) {
          let sumMass = 0, sumIntensity = 0, sumInertia = 0;
          let sumDecayRate = 0, sumBaseline = 0;
          let count = 0;

          for (const nf of nodeFields) {
            const state = nf[emotion];
            if (state) {
              sumMass += state.mass ?? 1;
              sumIntensity += state.intensity ?? 0;
              sumInertia += state.inertia ?? 0.5;
              sumDecayRate += state.decay_rate ?? 0.1;
              sumBaseline += state.baseline ?? 0.2;
              count++;
            }
          }

          if (count > 0) {
            result[emotion] = {
              mass: sumMass / count,
              intensity: sumIntensity / count,
              inertia: sumInertia / count,
              decay_rate: sumDecayRate / count,
              baseline: sumBaseline / count,
            };
          }
        }
      }
    }

    return result as EmotionField;
  },

  /**
   * Extrait les statistiques textuelles
   */
  extractTextStats(dna: MyceliumDNA): TextStats {
    // Les stats ne sont pas directement dans MyceliumDNA
    // On les estime à partir des nodes
    const nodes = dna.nodes ?? [];

    // Compter les nodes de type sentence
    const sentenceNodes = nodes.filter(n => n.kind === "sentence");

    return {
      word_count: sentenceNodes.length * 15, // Estimation ~15 mots/phrase
      char_count: sentenceNodes.length * 80, // Estimation ~80 chars/phrase
      line_count: sentenceNodes.length,
    };
  },

  /**
   * Extrait le root hash
   */
  extractRootHash(dna: MyceliumDNA): string {
    return dna.rootHash ?? "";
  },

  /**
   * Extrait le seed
   */
  extractSeed(dna: MyceliumDNA): number {
    return dna.seed ?? 42;
  },

  /**
   * Construit un MyceliumDNA agrégé
   */
  makeAggregatedDNA(args: AggregatedDNAArgs<MyceliumDNA>): MyceliumDNA {
    const { template, mergedEmotionField, mergedTextStats, seed, aggregation } = args;

    // Construire la distribution émotionnelle normalisée
    const emotionDistribution: Record<EmotionType, number> = {} as Record<EmotionType, number>;
    let totalIntensity = 0;

    for (const emotion of EMOTION_TYPES) {
      const state = mergedEmotionField[emotion];
      const intensity = state?.intensity ?? 0;
      emotionDistribution[emotion] = intensity;
      totalIntensity += intensity;
    }

    // Normaliser pour que Σ = 1
    if (totalIntensity > 0) {
      for (const emotion of EMOTION_TYPES) {
        emotionDistribution[emotion] /= totalIntensity;
      }
    } else {
      // Distribution uniforme si tout est à 0
      const uniform = 1 / EMOTION_TYPES.length;
      for (const emotion of EMOTION_TYPES) {
        emotionDistribution[emotion] = uniform;
      }
    }

    // Fingerprint agrégé
    const fingerprint: MyceliumFingerprint = {
      emotionDistribution,
      oxygenHistogram: template?.fingerprint?.oxygenHistogram ?? new Array(20).fill(0),
      hueHistogram: template?.fingerprint?.hueHistogram ?? new Array(24).fill(0),
      stats: {
        avgOxygen: 0.5,
        maxOxygen: 1.0,
        minOxygen: 0.0,
        hypoxiaEvents: 0,
        hyperoxiaEvents: 0,
        climaxEvents: 0,
        fruitCount: 0,
        scarCount: 0,
      },
      breathing: {
        avgInhaleExhaleRatio: 1.0,
        rhythmVariance: 0.1,
        avgConservationDelta: 0.05,
      },
    };

    // Calculer le rootHash de l'agrégat
    const rootHashPayload = {
      version: template?.version ?? "1.0.0",
      profile: template?.profile ?? "L4",
      seed,
      emotionDistribution,
      textStats: mergedTextStats,
      aggregation: {
        segment_count: aggregation.segment_count,
        merkle_root: aggregation.merkle_root,
        segmentation_hash: aggregation.segmentation_hash,
        weighting: aggregation.weighting,
      },
    };

    const rootHash = hashObject(rootHashPayload);

    // Construire le DNA final
    const result: MyceliumDNA = {
      version: template?.version ?? "1.0.0",
      profile: template?.profile ?? "L4",
      seed,
      sourceHash: template?.sourceHash ?? hashObject({ aggregated: true, segments: aggregation.segment_count }),
      fingerprint,
      nodes: [], // Les nodes individuels ne sont pas conservés dans l'agrégat
      rootHash,
      meta: {
        computedAt: new Date().toISOString(),
        nodeCount: aggregation.segment_count,
        processingTimeMs: 0,
      },
      aggregation: {
        segment_count: aggregation.segment_count,
        segment_root_hashes: aggregation.segment_root_hashes,
        merkle_root: aggregation.merkle_root,
        segmentation_hash: aggregation.segmentation_hash,
        weighting: aggregation.weighting,
        aggregator_version: aggregation.aggregator_version,
      },
    };

    return result;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Créer un MyceliumDNA minimal pour tests
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un MyceliumDNA minimal pour les tests
 */
export function createMockMyceliumDNA(
  seed: number,
  rootHash: string,
  emotionIntensities: Partial<Record<EmotionType, number>> = {}
): MyceliumDNA {
  const emotionDistribution: Record<EmotionType, number> = {} as Record<EmotionType, number>;

  for (const emotion of EMOTION_TYPES) {
    emotionDistribution[emotion] = emotionIntensities[emotion] ?? 0.1;
  }

  // Normaliser
  const total = Object.values(emotionDistribution).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const emotion of EMOTION_TYPES) {
      emotionDistribution[emotion] /= total;
    }
  }

  return {
    version: "1.0.0",
    profile: "L4",
    seed,
    sourceHash: hashObject({ mock: true, seed }),
    fingerprint: {
      emotionDistribution,
      oxygenHistogram: new Array(20).fill(0.05),
      hueHistogram: new Array(24).fill(0.042),
      stats: {
        avgOxygen: 0.5,
        maxOxygen: 0.8,
        minOxygen: 0.2,
        hypoxiaEvents: 0,
        hyperoxiaEvents: 0,
        climaxEvents: 0,
        fruitCount: 0,
        scarCount: 0,
      },
      breathing: {
        avgInhaleExhaleRatio: 1.0,
        rhythmVariance: 0.1,
        avgConservationDelta: 0.05,
      },
    },
    nodes: [],
    rootHash,
    meta: {
      computedAt: new Date().toISOString(),
      nodeCount: 0,
      processingTimeMs: 0,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  MyceliumDNAAdapter,
  createMockMyceliumDNA,
};
