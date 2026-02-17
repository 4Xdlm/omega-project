/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — TEMPORAL SCORING (Dilatation/Compression)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: temporal/temporal-scoring.ts
 * Sprint: 16.2
 * Invariant: ART-TEMP-02
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Measures how well prose respects temporal contract:
 * - Key moments receive proportional word allocation
 * - Compression zones are actually compressed
 * - Overall pacing follows the contract
 *
 * 100% CALC — deterministic.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  TemporalContract,
  KeyMoment,
  CompressionZone,
} from './temporal-contract.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TemporalScoreResult {
  readonly dilatation_score: number;      // 0-100: key moments get enough words
  readonly compression_score: number;     // 0-100: transitions are actually compressed
  readonly pacing_balance: number;        // 0-100: overall temporal distribution
  readonly composite: number;             // weighted average
  readonly details: readonly MomentScore[];
  readonly zone_details: readonly ZoneScore[];
}

export interface MomentScore {
  readonly moment_id: string;
  readonly target_pct: number;
  readonly actual_pct: number;
  readonly ratio: number;           // actual/target (1.0 = perfect)
  readonly pass: boolean;           // ratio ∈ [0.6, 1.5]
}

export interface ZoneScore {
  readonly zone_id: string;
  readonly max_pct: number;
  readonly actual_pct: number;
  readonly pass: boolean;           // actual ≤ max
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROSE SEGMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Split prose into paragraphs and compute cumulative word positions.
 * Each paragraph maps to a position range [start_pct, end_pct] in the text.
 */
interface ParagraphSegment {
  readonly text: string;
  readonly word_count: number;
  readonly start_pct: number; // 0-100
  readonly end_pct: number;   // 0-100
}

function segmentProse(prose: string): readonly ParagraphSegment[] {
  const paragraphs = prose.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const totalWords = countWords(prose);
  if (totalWords === 0) return [];

  const segments: ParagraphSegment[] = [];
  let cumulative = 0;

  for (const para of paragraphs) {
    const wc = countWords(para);
    const start_pct = (cumulative / totalWords) * 100;
    cumulative += wc;
    const end_pct = (cumulative / totalWords) * 100;

    segments.push({
      text: para,
      word_count: wc,
      start_pct,
      end_pct,
    });
  }

  return segments;
}

/**
 * Count words in prose segments that overlap with a position range.
 */
function wordsInRange(
  segments: readonly ParagraphSegment[],
  startPct: number,
  endPct: number,
): number {
  let words = 0;

  for (const seg of segments) {
    // Calculate overlap
    const overlapStart = Math.max(seg.start_pct, startPct);
    const overlapEnd = Math.min(seg.end_pct, endPct);

    if (overlapEnd > overlapStart) {
      const segRange = seg.end_pct - seg.start_pct;
      if (segRange > 0) {
        const overlapRatio = (overlapEnd - overlapStart) / segRange;
        words += seg.word_count * overlapRatio;
      }
    }
  }

  return words;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Score temporal pacing against contract.
 *
 * Dilatation score (40%): Key moments get their word budget.
 *   For each key moment: actual_pct / target_pct → ratio.
 *   Perfect = 1.0, acceptable ∈ [0.6, 1.5].
 *   Score = average of individual moment scores × 100.
 *
 * Compression score (30%): Transitions respect max word budget.
 *   For each zone: actual ≤ max → 100, else penalty.
 *   Score = average.
 *
 * Pacing balance (30%): Gini-like measure of temporal distribution.
 *   Low variance between target and actual allocation → high score.
 */
export function scoreTemporalPacing(
  prose: string,
  contract: TemporalContract,
): TemporalScoreResult {
  const segments = segmentProse(prose);
  const totalWords = countWords(prose);

  if (totalWords === 0 || contract.key_moments.length === 0) {
    return {
      dilatation_score: 50,
      compression_score: 50,
      pacing_balance: 50,
      composite: 50,
      details: [],
      zone_details: [],
    };
  }

  // ═══ DILATATION SCORING ═══
  const momentScores: MomentScore[] = [];

  for (const km of contract.key_moments) {
    // Key moment occupies a region around its position: ±10%
    const regionStart = Math.max(0, km.position_pct - 10);
    const regionEnd = Math.min(100, km.position_pct + 10);

    const wordsInMoment = wordsInRange(segments, regionStart, regionEnd);
    const actual_pct = (wordsInMoment / totalWords) * 100;
    const ratio = km.word_budget_pct > 0 ? actual_pct / km.word_budget_pct : 1;
    const pass = ratio >= 0.6 && ratio <= 1.5;

    momentScores.push({
      moment_id: km.moment_id,
      target_pct: km.word_budget_pct,
      actual_pct: Math.round(actual_pct * 10) / 10,
      ratio: Math.round(ratio * 100) / 100,
      pass,
    });
  }

  // Dilatation score: closer to 1.0 ratio = better
  const dilatationScores = momentScores.map(ms => {
    const deviation = Math.abs(ms.ratio - 1.0);
    return Math.max(0, 100 - deviation * 100);
  });
  const dilatation_score = dilatationScores.reduce((a, b) => a + b, 0) / dilatationScores.length;

  // ═══ COMPRESSION SCORING ═══
  const zoneScores: ZoneScore[] = [];

  for (const cz of contract.compression_zones) {
    const wordsInZone = wordsInRange(segments, cz.start_pct, cz.end_pct);
    const actual_pct = (wordsInZone / totalWords) * 100;
    const pass = actual_pct <= cz.max_word_pct;

    zoneScores.push({
      zone_id: cz.zone_id,
      max_pct: cz.max_word_pct,
      actual_pct: Math.round(actual_pct * 10) / 10,
      pass,
    });
  }

  const compression_score = zoneScores.length > 0
    ? (zoneScores.filter(z => z.pass).length / zoneScores.length) * 100
    : 100;

  // ═══ PACING BALANCE ═══
  // Measure how well the overall word distribution matches the contract
  // Compare actual allocation across key moments vs target
  const targetAllocations = contract.key_moments.map(km => km.word_budget_pct);
  const actualAllocations = momentScores.map(ms => ms.actual_pct);

  let totalDeviation = 0;
  for (let i = 0; i < targetAllocations.length; i++) {
    const target = targetAllocations[i];
    const actual = actualAllocations[i];
    totalDeviation += Math.abs(target - actual);
  }
  const avgDeviation = totalDeviation / targetAllocations.length;
  const pacing_balance = Math.max(0, 100 - avgDeviation * 3);

  // ═══ COMPOSITE ═══
  const composite =
    dilatation_score * 0.40 +
    compression_score * 0.30 +
    pacing_balance * 0.30;

  return {
    dilatation_score: Math.round(dilatation_score * 10) / 10,
    compression_score: Math.round(compression_score * 10) / 10,
    pacing_balance: Math.round(pacing_balance * 10) / 10,
    composite: Math.round(composite * 10) / 10,
    details: momentScores,
    zone_details: zoneScores,
  };
}
