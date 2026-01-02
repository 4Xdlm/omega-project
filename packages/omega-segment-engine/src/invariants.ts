// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — SEGMENT ENGINE v1.0.0 — INVARIANTS L4
// ═══════════════════════════════════════════════════════════════════════════════
// 8 Invariants NASA-Grade pour certification aérospatiale
// Chaque invariant a une assertion qui throw si violé
// ═══════════════════════════════════════════════════════════════════════════════

import type { Segment, SegmentationResult } from "./types.js";

/**
 * Erreur d'invariant (pour traçabilité)
 */
export class InvariantError extends Error {
  constructor(
    public readonly invariantId: string,
    public readonly details: string
  ) {
    super(`${invariantId}: ${details}`);
    this.name = "InvariantError";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANTS INDIVIDUELS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-SEG-01: Offsets valides
 * ∀s ∈ segments: 0 ≤ s.start < s.end ≤ input.length
 */
export function assertOffsetsValid(
  segments: readonly Segment[],
  inputLength: number
): void {
  for (const seg of segments) {
    if (seg.start < 0) {
      throw new InvariantError(
        "INV-SEG-01",
        `Segment ${seg.id}: start (${seg.start}) < 0`
      );
    }
    if (seg.start >= seg.end) {
      throw new InvariantError(
        "INV-SEG-01",
        `Segment ${seg.id}: start (${seg.start}) >= end (${seg.end})`
      );
    }
    if (seg.end > inputLength) {
      throw new InvariantError(
        "INV-SEG-01",
        `Segment ${seg.id}: end (${seg.end}) > input.length (${inputLength})`
      );
    }
  }
}

/**
 * INV-SEG-02: Slice exacte
 * ∀s ∈ segments: s.text === input.slice(s.start, s.end)
 */
export function assertSliceExact(
  segments: readonly Segment[],
  input: string
): void {
  for (const seg of segments) {
    const expected = input.slice(seg.start, seg.end);
    if (seg.text !== expected) {
      throw new InvariantError(
        "INV-SEG-02",
        `Segment ${seg.id}: text mismatch. Expected "${expected.slice(0, 20)}..." got "${seg.text.slice(0, 20)}..."`
      );
    }
  }
}

/**
 * INV-SEG-03: Non-vide
 * ∀s ∈ segments: s.text.trim().length > 0
 */
export function assertNonEmpty(segments: readonly Segment[]): void {
  for (const seg of segments) {
    if (seg.text.trim().length === 0) {
      throw new InvariantError(
        "INV-SEG-03",
        `Segment ${seg.id}: empty after trim`
      );
    }
  }
}

/**
 * INV-SEG-04: Index monotone
 * ∀i ∈ [0, segments.length): segments[i].index === i
 */
export function assertIndexMonotone(segments: readonly Segment[]): void {
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].index !== i) {
      throw new InvariantError(
        "INV-SEG-04",
        `Segment at position ${i} has index ${segments[i].index}`
      );
    }
  }
}

/**
 * INV-SEG-05: Hash déterministe
 * Vérifie que le hash a le bon format (64 hex)
 */
export function assertHashValid(hash: string): void {
  if (typeof hash !== "string" || hash.length !== 64) {
    throw new InvariantError(
      "INV-SEG-05",
      `Invalid hash format: expected 64 hex chars, got ${hash?.length ?? 0}`
    );
  }
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    throw new InvariantError(
      "INV-SEG-05",
      `Hash contains invalid characters: ${hash.slice(0, 16)}...`
    );
  }
}

/**
 * INV-SEG-06: Char count cohérent
 * ∀s ∈ segments: s.char_count === s.text.length
 */
export function assertCharCountCoherent(segments: readonly Segment[]): void {
  for (const seg of segments) {
    if (seg.char_count !== seg.text.length) {
      throw new InvariantError(
        "INV-SEG-06",
        `Segment ${seg.id}: char_count (${seg.char_count}) !== text.length (${seg.text.length})`
      );
    }
  }
}

/**
 * INV-SEG-07: Word count positif
 * ∀s ∈ segments: s.word_count >= 1 (si text contient des lettres/chiffres)
 */
export function assertWordCountPositive(segments: readonly Segment[]): void {
  for (const seg of segments) {
    // Vérifier si le texte contient au moins une lettre ou chiffre
    const hasAlphaNum = /[\p{L}\p{N}]/u.test(seg.text);
    if (hasAlphaNum && seg.word_count < 1) {
      throw new InvariantError(
        "INV-SEG-07",
        `Segment ${seg.id}: word_count is 0 but text contains letters/numbers`
      );
    }
  }
}

/**
 * INV-SEG-08: Newline stable (normalize_lf)
 * Si policy = normalize_lf, aucun \r dans les segments
 */
export function assertNoCarriageReturn(
  segments: readonly Segment[],
  policy: string
): void {
  if (policy !== "normalize_lf") return; // Pas applicable en mode preserve

  for (const seg of segments) {
    if (seg.text.includes("\r")) {
      throw new InvariantError(
        "INV-SEG-08",
        `Segment ${seg.id}: contains \\r despite normalize_lf policy`
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSERTION GLOBALE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie TOUS les invariants sur un résultat de segmentation
 * 
 * @param input Texte source (normalisé)
 * @param result Résultat de segmentation
 * @throws InvariantError si un invariant est violé
 */
export function assertAllInvariants(
  input: string,
  result: SegmentationResult
): void {
  // INV-SEG-01: Offsets valides
  assertOffsetsValid(result.segments, result.input_char_count);

  // INV-SEG-02: Slice exacte
  assertSliceExact(result.segments, input);

  // INV-SEG-03: Non-vide
  assertNonEmpty(result.segments);

  // INV-SEG-04: Index monotone
  assertIndexMonotone(result.segments);

  // INV-SEG-05: Hash valide
  assertHashValid(result.segmentation_hash);

  // INV-SEG-06: Char count cohérent
  assertCharCountCoherent(result.segments);

  // INV-SEG-07: Word count positif
  assertWordCountPositive(result.segments);

  // INV-SEG-08: Pas de \r si normalize_lf
  assertNoCarriageReturn(result.segments, result.newline_policy);

  // Vérifications additionnelles
  if (result.segment_count !== result.segments.length) {
    throw new InvariantError(
      "INV-SEG-COUNT",
      `segment_count (${result.segment_count}) !== segments.length (${result.segments.length})`
    );
  }

  const sumChars = result.segments.reduce((sum, s) => sum + s.char_count, 0);
  if (sumChars !== result.total_segment_char_count) {
    throw new InvariantError(
      "INV-SEG-SUM",
      `total_segment_char_count (${result.total_segment_char_count}) !== sum(char_count) (${sumChars})`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  InvariantError,
  assertOffsetsValid,
  assertSliceExact,
  assertNonEmpty,
  assertIndexMonotone,
  assertHashValid,
  assertCharCountCoherent,
  assertWordCountPositive,
  assertNoCarriageReturn,
  assertAllInvariants,
};
