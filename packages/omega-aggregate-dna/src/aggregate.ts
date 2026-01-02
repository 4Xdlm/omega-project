// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — AGGREGATE DNA v1.0.0 — AGGREGATOR
// ═══════════════════════════════════════════════════════════════════════════════
// Agrégation de segments DNA → DNA global
// Algorithme: moyenne pondérée par word_count + Merkle root
// Standard: NASA-Grade L4
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  DNACore,
  AggregateAdapter,
  AggregateInput,
  AggregateResult,
  AggregationMetadata,
  EmotionField,
  TextStats,
  EmotionType,
} from "./types.js";
import { EMOTION_TYPES } from "./types.js";
import { computeMerkleRoot, hashObject } from "./merkle.js";

/**
 * Version de l'agrégateur
 */
export const AGGREGATOR_VERSION = "1.0.0";

/**
 * Agrège plusieurs DNA de segments en un DNA global
 * 
 * ALGORITHME:
 * 1. Valide les inputs (seeds alignés, weights valides)
 * 2. Extrait emotion fields et text stats via adapter
 * 3. Calcule moyenne pondérée par word_count
 * 4. Calcule Merkle root des segment hashes
 * 5. Construit le DNA agrégé via adapter
 * 
 * GARANTIES:
 * - Déterminisme: même input → même output
 * - Ordre sensible: [A,B] ≠ [B,A]
 * - Seeds alignés: tous les segments doivent avoir le même seed
 * 
 * @param input Configuration d'agrégation
 * @param adapter Adapter pour le type DNA spécifique
 * @returns DNA agrégé + métadonnées
 */
export function aggregateDNA<DNA extends DNACore>(
  input: AggregateInput<DNA>,
  adapter: AggregateAdapter<DNA>
): AggregateResult<DNA> {
  const startTime = Date.now();
  const { seed, version, segmentDNAs, segmentWeights, segmentationHash } = input;

  // ─────────────────────────────────────────────────────────────────────────────
  // CAS VIDE
  // ─────────────────────────────────────────────────────────────────────────────

  if (segmentDNAs.length === 0) {
    const emptyAggregation: AggregationMetadata = {
      segment_count: 0,
      segment_root_hashes: [],
      merkle_root: computeMerkleRoot([]),
      segmentation_hash: segmentationHash ?? null,
      weighting: "word_count",
      aggregator_version: AGGREGATOR_VERSION,
    };

    // Créer un DNA vide via l'adapter
    // On utilise un template minimal avec des valeurs neutres
    const emptyEmotionField = buildEmptyEmotionField();
    const emptyTextStats: TextStats = { word_count: 0, char_count: 0, line_count: 0 };

    // Pour le cas vide, on a besoin d'un template — on en crée un minimal
    const emptyDNA = adapter.makeAggregatedDNA({
      template: null as unknown as DNA, // L'adapter doit gérer le cas null
      mergedEmotionField: emptyEmotionField,
      mergedTextStats: emptyTextStats,
      seed,
      aggregation: emptyAggregation,
    });

    return {
      dna: emptyDNA,
      aggregation: emptyAggregation,
      stats: {
        total_segments: 0,
        total_words: 0,
        total_chars: 0,
        total_lines: 0,
        processing_time_ms: Date.now() - startTime,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────

  // Vérifier que tous les segments ont le même seed
  for (let i = 0; i < segmentDNAs.length; i++) {
    const segSeed = adapter.extractSeed(segmentDNAs[i]);
    if (segSeed !== seed) {
      throw new Error(
        `AGG-DNA: seed mismatch at segment ${i} (expected ${seed}, got ${segSeed})`
      );
    }
  }

  // Résoudre les poids
  const weights = resolveWeights(segmentDNAs, adapter, segmentWeights);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // EXTRACTION
  // ─────────────────────────────────────────────────────────────────────────────

  const emotionFields: EmotionField[] = segmentDNAs.map(dna =>
    adapter.extractEmotionField(dna)
  );

  const textStats: TextStats[] = segmentDNAs.map(dna =>
    adapter.extractTextStats(dna)
  );

  const rootHashes: string[] = segmentDNAs.map(dna =>
    adapter.extractRootHash(dna)
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // AGRÉGATION ÉMOTIONS (moyenne pondérée)
  // ─────────────────────────────────────────────────────────────────────────────

  const mergedEmotionField = weightedAverageEmotionField(
    emotionFields,
    weights,
    totalWeight
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // AGRÉGATION STATS (somme)
  // ─────────────────────────────────────────────────────────────────────────────

  const mergedTextStats: TextStats = {
    word_count: textStats.reduce((sum, ts) => sum + ts.word_count, 0),
    char_count: textStats.reduce((sum, ts) => sum + ts.char_count, 0),
    line_count: textStats.reduce((sum, ts) => sum + ts.line_count, 0),
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // MERKLE ROOT
  // ─────────────────────────────────────────────────────────────────────────────

  const merkle_root = computeMerkleRoot(rootHashes);

  // ─────────────────────────────────────────────────────────────────────────────
  // CONSTRUCTION DNA AGRÉGÉ
  // ─────────────────────────────────────────────────────────────────────────────

  const aggregation: AggregationMetadata = {
    segment_count: segmentDNAs.length,
    segment_root_hashes: rootHashes,
    merkle_root,
    segmentation_hash: segmentationHash ?? null,
    weighting: "word_count",
    aggregator_version: AGGREGATOR_VERSION,
  };

  // Utiliser le premier segment comme template
  const aggregatedDNA = adapter.makeAggregatedDNA({
    template: segmentDNAs[0],
    mergedEmotionField,
    mergedTextStats,
    seed,
    aggregation,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RÉSULTAT
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    dna: aggregatedDNA,
    aggregation,
    stats: {
      total_segments: segmentDNAs.length,
      total_words: mergedTextStats.word_count,
      total_chars: mergedTextStats.char_count,
      total_lines: mergedTextStats.line_count,
      processing_time_ms: Date.now() - startTime,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Résout les poids pour chaque segment
 * - Si fournis explicitement → utilise ceux-là
 * - Sinon → extrait word_count de chaque DNA
 */
function resolveWeights<DNA extends DNACore>(
  dnas: readonly DNA[],
  adapter: AggregateAdapter<DNA>,
  provided?: readonly number[]
): number[] {
  if (provided) {
    if (provided.length !== dnas.length) {
      throw new Error(
        `AGG-DNA: segmentWeights length mismatch (${provided.length} vs ${dnas.length})`
      );
    }
    return provided.map((w, i) => {
      if (!Number.isFinite(w) || w < 0) {
        throw new Error(`AGG-DNA: invalid weight at index ${i}: ${w}`);
      }
      return Math.floor(w);
    });
  }

  // Extraire word_count de chaque DNA
  return dnas.map((dna, i) => {
    const stats = adapter.extractTextStats(dna);
    const w = stats.word_count;
    if (!Number.isFinite(w) || w < 0) {
      throw new Error(`AGG-DNA: invalid word_count at segment ${i}: ${w}`);
    }
    return Math.floor(w);
  });
}

/**
 * Calcule la moyenne pondérée des emotion fields
 */
function weightedAverageEmotionField(
  fields: readonly EmotionField[],
  weights: readonly number[],
  totalWeight: number
): EmotionField {
  const result = buildEmptyEmotionField();

  // Si poids total = 0, faire moyenne simple
  const denom = totalWeight > 0 ? totalWeight : fields.length;
  if (denom === 0) return result;

  // Pour chaque émotion
  for (const emotion of EMOTION_TYPES) {
    // Collecter toutes les clés numériques présentes
    const keys = collectNumericKeys(fields, emotion);

    // Calculer la moyenne pondérée pour chaque clé
    const mergedState: Record<string, number> = {};

    for (const key of keys) {
      let acc = 0;

      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const state = field[emotion];
        const value = state?.[key];

        if (typeof value === "number" && Number.isFinite(value)) {
          const weight = totalWeight > 0 ? weights[i] : 1;
          acc += value * weight;
        }
      }

      mergedState[key] = acc / denom;
    }

    result[emotion] = mergedState;
  }

  return result;
}

/**
 * Collecte toutes les clés numériques présentes dans les emotion states
 */
function collectNumericKeys(
  fields: readonly EmotionField[],
  emotion: EmotionType
): string[] {
  const keys = new Set<string>();

  for (const field of fields) {
    const state = field[emotion];
    if (!state) continue;

    for (const key of Object.keys(state)) {
      const value = state[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        keys.add(key);
      }
    }
  }

  // Ordre stable
  return Array.from(keys).sort();
}

/**
 * Construit un EmotionField vide (14 émotions, pas de propriétés)
 */
function buildEmptyEmotionField(): EmotionField {
  const result: Record<string, Record<string, number>> = {};

  for (const emotion of EMOTION_TYPES) {
    result[emotion] = {};
  }

  return result as EmotionField;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VÉRIFICATION DÉTERMINISME
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie que l'agrégation est déterministe
 */
export function verifyAggregationDeterminism<DNA extends DNACore>(
  input: AggregateInput<DNA>,
  adapter: AggregateAdapter<DNA>,
  runs: number = 3
): boolean {
  const hashes = new Set<string>();

  for (let i = 0; i < runs; i++) {
    const result = aggregateDNA(input, adapter);
    hashes.add(adapter.extractRootHash(result.dna));
  }

  return hashes.size === 1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  AGGREGATOR_VERSION,
  aggregateDNA,
  verifyAggregationDeterminism,
};
