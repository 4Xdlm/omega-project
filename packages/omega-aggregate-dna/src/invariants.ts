// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — AGGREGATE DNA v1.0.0 — INVARIANTS L4
// ═══════════════════════════════════════════════════════════════════════════════
// 6 Invariants NASA-Grade pour certification aérospatiale
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  DNACore,
  AggregateResult,
  AggregationMetadata,
  TextStats,
} from "./types.js";
import { computeMerkleRoot } from "./merkle.js";

/**
 * Erreur d'invariant (pour traçabilité)
 */
export class AggregateInvariantError extends Error {
  constructor(
    public readonly invariantId: string,
    public readonly details: string
  ) {
    super(`${invariantId}: ${details}`);
    this.name = "AggregateInvariantError";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANTS INDIVIDUELS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-AGG-01: Déterminisme
 * Même segments → même Merkle root
 */
export function assertDeterminism(
  rootHash1: string,
  rootHash2: string
): void {
  if (rootHash1 !== rootHash2) {
    throw new AggregateInvariantError(
      "INV-AGG-01",
      `Determinism violated: ${rootHash1.slice(0, 16)}... ≠ ${rootHash2.slice(0, 16)}...`
    );
  }
}

/**
 * INV-AGG-02: Merkle valide
 * Le merkle_root peut être recalculé à partir des segment_root_hashes
 */
export function assertMerkleValid(aggregation: AggregationMetadata): void {
  const recalculated = computeMerkleRoot(aggregation.segment_root_hashes);

  if (recalculated !== aggregation.merkle_root) {
    throw new AggregateInvariantError(
      "INV-AGG-02",
      `Merkle root mismatch: computed ${recalculated.slice(0, 16)}... vs stored ${aggregation.merkle_root.slice(0, 16)}...`
    );
  }
}

/**
 * INV-AGG-03: Ordre sensible
 * [A,B] doit produire un résultat différent de [B,A]
 */
export function assertOrderSensitive(
  hashAB: string,
  hashBA: string
): void {
  if (hashAB === hashBA) {
    throw new AggregateInvariantError(
      "INV-AGG-03",
      `Order should matter: hash([A,B]) === hash([B,A])`
    );
  }
}

/**
 * INV-AGG-04: Seed aligné
 * Tous les segments doivent avoir le même seed (vérifié avant agrégation)
 */
export function assertSeedAligned(
  seeds: readonly number[],
  expectedSeed: number
): void {
  for (let i = 0; i < seeds.length; i++) {
    if (seeds[i] !== expectedSeed) {
      throw new AggregateInvariantError(
        "INV-AGG-04",
        `Seed mismatch at segment ${i}: expected ${expectedSeed}, got ${seeds[i]}`
      );
    }
  }
}

/**
 * INV-AGG-05: Stats sommées
 * word_count global = Σ segment word_counts
 */
export function assertStatsSummed(
  mergedStats: TextStats,
  segmentStats: readonly TextStats[]
): void {
  const expectedWords = segmentStats.reduce((sum, s) => sum + s.word_count, 0);
  const expectedChars = segmentStats.reduce((sum, s) => sum + s.char_count, 0);
  const expectedLines = segmentStats.reduce((sum, s) => sum + s.line_count, 0);

  if (mergedStats.word_count !== expectedWords) {
    throw new AggregateInvariantError(
      "INV-AGG-05",
      `word_count sum mismatch: ${mergedStats.word_count} vs expected ${expectedWords}`
    );
  }

  if (mergedStats.char_count !== expectedChars) {
    throw new AggregateInvariantError(
      "INV-AGG-05",
      `char_count sum mismatch: ${mergedStats.char_count} vs expected ${expectedChars}`
    );
  }

  if (mergedStats.line_count !== expectedLines) {
    throw new AggregateInvariantError(
      "INV-AGG-05",
      `line_count sum mismatch: ${mergedStats.line_count} vs expected ${expectedLines}`
    );
  }
}

/**
 * INV-AGG-06: Vide valide
 * 0 segments → DNA valide avec segment_count = 0
 */
export function assertEmptyValid<DNA extends DNACore>(
  result: AggregateResult<DNA>
): void {
  if (result.aggregation.segment_count !== 0) {
    throw new AggregateInvariantError(
      "INV-AGG-06",
      `Empty aggregation should have segment_count = 0, got ${result.aggregation.segment_count}`
    );
  }

  if (result.aggregation.segment_root_hashes.length !== 0) {
    throw new AggregateInvariantError(
      "INV-AGG-06",
      `Empty aggregation should have 0 segment hashes, got ${result.aggregation.segment_root_hashes.length}`
    );
  }

  if (result.stats.total_words !== 0) {
    throw new AggregateInvariantError(
      "INV-AGG-06",
      `Empty aggregation should have 0 words, got ${result.stats.total_words}`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSERTION GLOBALE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie les invariants principaux sur un résultat d'agrégation
 * 
 * @param result Résultat de l'agrégation
 * @param segmentStats Stats des segments (pour vérification somme)
 */
export function assertAggregationInvariants<DNA extends DNACore>(
  result: AggregateResult<DNA>,
  segmentStats?: readonly TextStats[]
): void {
  // INV-AGG-02: Merkle valide
  assertMerkleValid(result.aggregation);

  // INV-AGG-05: Stats sommées (si on a les stats des segments)
  if (segmentStats && segmentStats.length > 0) {
    assertStatsSummed(
      {
        word_count: result.stats.total_words,
        char_count: result.stats.total_chars,
        line_count: result.stats.total_lines,
      },
      segmentStats
    );
  }

  // INV-AGG-06: Vide valide (si 0 segments)
  if (result.aggregation.segment_count === 0) {
    assertEmptyValid(result);
  }

  // Vérifications additionnelles
  if (result.aggregation.segment_count !== result.aggregation.segment_root_hashes.length) {
    throw new AggregateInvariantError(
      "INV-AGG-COUNT",
      `segment_count (${result.aggregation.segment_count}) ≠ segment_root_hashes.length (${result.aggregation.segment_root_hashes.length})`
    );
  }

  // Hash format
  if (!/^[a-f0-9]{64}$/.test(result.aggregation.merkle_root)) {
    throw new AggregateInvariantError(
      "INV-AGG-HASH",
      `Invalid merkle_root format: ${result.aggregation.merkle_root.slice(0, 20)}...`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  AggregateInvariantError,
  assertDeterminism,
  assertMerkleValid,
  assertOrderSensitive,
  assertSeedAligned,
  assertStatsSummed,
  assertEmptyValid,
  assertAggregationInvariants,
};
