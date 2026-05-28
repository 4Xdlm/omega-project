/**
 * OMEGA V2.2-B B1 — Boundary candidate probe
 *
 * Validates if Option E (boundary-zone embedding) DETECTS sub-optimal V2.1
 * boundaries by comparing the actual V2.1 cut point's continuity score to:
 *   - boundary shifted -100 words (cut 100w earlier in chunk[i])
 *   - boundary shifted +100 words (cut 100w later in chunk[i+1])
 *   - random intra-chunk control (cut point inside chunk[i], not at boundary)
 *
 * If `cosine(actual) < min(cosine(shifted_minus100), cosine(shifted_plus100))`,
 * V2.1 chose the OPTIMAL boundary (max rupture detected at V2.1's pick).
 *
 * If `cosine(actual) > max(...)`, V2.1 chose SUB-OPTIMAL (an alternative cut
 * would have produced stronger semantic rupture = better narrative break).
 *
 * If `cosine(random_intra) ≈ cosine(actual)`, V2.1 boundary cosine is no better
 * than a random intra-chunk pair, suggesting boundary signal is weak.
 *
 * Sprint V2.2-B B1 — post Option E sealing RC1 (commit 91fa07e8).
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { cosineSimilarity } from './similarity.js';

export type BoundaryVerdict = 'OPTIMAL' | 'SUB_OPTIMAL' | 'AMBIGUOUS';

/**
 * A set of 4 candidate boundary zone-pairs for one V2.1 boundary index.
 */
export interface CandidateZoneSet {
  readonly boundary_index: number;
  readonly actual: { readonly end_left: string; readonly start_right: string };
  readonly shifted_minus100: { readonly end_left: string; readonly start_right: string };
  readonly shifted_plus100: { readonly end_left: string; readonly start_right: string };
  readonly random_intra: { readonly end_left: string; readonly start_right: string };
}

/**
 * Boundary scores (cosines) for the 4 candidate variants.
 */
export interface BoundaryCandidateScores {
  readonly boundary_index: number;
  readonly cosine_actual: number;
  readonly cosine_minus100: number;
  readonly cosine_plus100: number;
  readonly cosine_random_intra: number;
  readonly delta_vs_shifted_min: number; // actual - min(minus100, plus100)
  readonly delta_vs_random: number; // actual - random_intra
  readonly verdict: BoundaryVerdict;
}

export interface BookB1Metrics {
  readonly boundary_count: number;
  readonly verdicts: readonly BoundaryVerdict[];
  readonly count_optimal: number;
  readonly count_sub_optimal: number;
  readonly count_ambiguous: number;
  readonly mean_delta_shifted: number;
  readonly mean_delta_random: number;
  readonly mean_cosine_actual: number;
  readonly mean_cosine_shifted_min: number;
  readonly mean_cosine_random: number;
}

/**
 * Extract 4 candidate zone-pair sets for one V2.1 boundary.
 *
 * @param chunks Adaptive chunks (with .text)
 * @param boundary_index 0..(N-2)
 * @param zone_words Words per zone (default 250)
 * @param shift Word shift for ±100 variants (default 100)
 * @param rng Deterministic seed function returns [0,1)
 */
export function extractCandidateZones<T extends { readonly text: string }>(
  chunks: readonly T[],
  boundary_index: number,
  zone_words: number = 250,
  shift: number = 100,
  rng: () => number = Math.random
): CandidateZoneSet {
  if (boundary_index < 0 || boundary_index >= chunks.length - 1) {
    throw new Error(
      `boundary_index ${boundary_index} out of range [0, ${chunks.length - 2}]`
    );
  }
  if (zone_words <= 0 || shift < 0) {
    throw new Error(`zone_words must be > 0 and shift >= 0`);
  }

  const left = chunks[boundary_index]!.text;
  const right = chunks[boundary_index + 1]!.text;
  const leftWords = left.split(/\s+/).filter((w) => w.length > 0);
  const rightWords = right.split(/\s+/).filter((w) => w.length > 0);

  // Actual V2.1 boundary
  const actual_end_left = leftWords.slice(-zone_words).join(' ');
  const actual_start_right = rightWords.slice(0, zone_words).join(' ');

  // Shifted -shift words (cut earlier in left chunk)
  // End_left = last zone_words ending at position (-shift) of left
  // i.e., leftWords[-(zone_words + shift) .. -shift]
  // Start_right = last shift words of left + first (zone_words - shift) of right
  const minus_end_left =
    leftWords.length >= zone_words + shift
      ? leftWords.slice(-(zone_words + shift), -shift).join(' ')
      : leftWords.slice(0, Math.max(0, leftWords.length - shift)).join(' ');
  const minus_start_right_parts = [
    ...leftWords.slice(-shift),
    ...rightWords.slice(0, Math.max(0, zone_words - shift)),
  ];
  const minus_start_right = minus_start_right_parts.slice(0, zone_words).join(' ');

  // Shifted +shift words (cut later in right chunk)
  // End_left = last (zone_words - shift) of left + first shift of right
  // Start_right = rightWords[shift .. shift + zone_words]
  const plus_end_left_parts = [
    ...leftWords.slice(-Math.max(0, zone_words - shift)),
    ...rightWords.slice(0, shift),
  ];
  const plus_end_left = plus_end_left_parts.slice(-zone_words).join(' ');
  const plus_start_right = rightWords.slice(shift, shift + zone_words).join(' ');

  // Random intra-chunk control:
  // Pick a random point inside left chunk (not at boundary),
  // then extract a pair of adjacent zones around that point.
  const minOffset = Math.max(zone_words, 1);
  const maxOffset = Math.max(minOffset + 1, leftWords.length - zone_words - 1);
  const offsetRange = maxOffset - minOffset;
  const randomOffset =
    offsetRange > 0 ? minOffset + Math.floor(rng() * offsetRange) : minOffset;
  const random_end_left = leftWords.slice(Math.max(0, randomOffset - zone_words), randomOffset).join(' ');
  const random_start_right = leftWords
    .slice(randomOffset, randomOffset + zone_words)
    .join(' ');

  return {
    boundary_index,
    actual: { end_left: actual_end_left, start_right: actual_start_right },
    shifted_minus100: { end_left: minus_end_left, start_right: minus_start_right },
    shifted_plus100: { end_left: plus_end_left, start_right: plus_start_right },
    random_intra: { end_left: random_end_left, start_right: random_start_right },
  };
}

/**
 * Compute boundary delta verdict from 4 cosines.
 *
 * delta_vs_shifted_min = cosine_actual - min(cosine_minus100, cosine_plus100)
 *
 * Verdict:
 *   OPTIMAL    if delta_vs_shifted_min < -0.02 (actual notably lower = stronger rupture)
 *   SUB_OPTIMAL if delta_vs_shifted_min > +0.02 (actual notably higher = weaker rupture)
 *   AMBIGUOUS  otherwise
 *
 * Threshold 0.02 chosen empirically per Option E bench observations.
 */
export function computeBoundaryVerdict(
  cosine_actual: number,
  cosine_minus100: number,
  cosine_plus100: number,
  cosine_random_intra: number,
  threshold: number = 0.02
): BoundaryCandidateScores {
  const shifted_min = Math.min(cosine_minus100, cosine_plus100);
  const delta_vs_shifted_min = cosine_actual - shifted_min;
  const delta_vs_random = cosine_actual - cosine_random_intra;
  let verdict: BoundaryVerdict;
  if (delta_vs_shifted_min < -threshold) {
    verdict = 'OPTIMAL';
  } else if (delta_vs_shifted_min > threshold) {
    verdict = 'SUB_OPTIMAL';
  } else {
    verdict = 'AMBIGUOUS';
  }
  return {
    boundary_index: -1, // caller sets
    cosine_actual,
    cosine_minus100,
    cosine_plus100,
    cosine_random_intra,
    delta_vs_shifted_min,
    delta_vs_random,
    verdict,
  };
}

/**
 * Compute boundary cosine from 2 vectors (helper).
 */
export function pairCosine(left: Float32Array, right: Float32Array): number {
  return Math.max(0, cosineSimilarity(left, right));
}

/**
 * Aggregate per-book metrics from boundary verdicts.
 */
export function aggregateBookB1(
  scores: readonly BoundaryCandidateScores[]
): BookB1Metrics {
  if (scores.length === 0) {
    return {
      boundary_count: 0,
      verdicts: [],
      count_optimal: 0,
      count_sub_optimal: 0,
      count_ambiguous: 0,
      mean_delta_shifted: 0,
      mean_delta_random: 0,
      mean_cosine_actual: 0,
      mean_cosine_shifted_min: 0,
      mean_cosine_random: 0,
    };
  }
  const verdicts = scores.map((s) => s.verdict);
  const count_optimal = verdicts.filter((v) => v === 'OPTIMAL').length;
  const count_sub_optimal = verdicts.filter((v) => v === 'SUB_OPTIMAL').length;
  const count_ambiguous = verdicts.filter((v) => v === 'AMBIGUOUS').length;
  const n = scores.length;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    boundary_count: n,
    verdicts,
    count_optimal,
    count_sub_optimal,
    count_ambiguous,
    mean_delta_shifted: mean(scores.map((s) => s.delta_vs_shifted_min)),
    mean_delta_random: mean(scores.map((s) => s.delta_vs_random)),
    mean_cosine_actual: mean(scores.map((s) => s.cosine_actual)),
    mean_cosine_shifted_min: mean(
      scores.map((s) => Math.min(s.cosine_minus100, s.cosine_plus100))
    ),
    mean_cosine_random: mean(scores.map((s) => s.cosine_random_intra)),
  };
}
