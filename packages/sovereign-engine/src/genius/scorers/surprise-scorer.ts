/**
 * OMEGA GENIUS ENGINE — SURPRISE SCORER (S)
 * Sprint: GENIUS-02 | NASA-Grade L4 / DO-178C Level A
 *
 * S = w1*TTR_norm + w2*entropy_norm + w3*semantic_shift_norm + w4*(100-clustering_penalty)
 * All weights sum to 1.0 → S ∈ [0, 100].
 *
 * FORBIDDEN: No external API embedding provider calls.
 * Uses ONLY local-embedding-model.ts for semantic operations.
 * Does NOT use SII.metaphor (LINT-G02).
 */

import { tokenize, computeSemanticShifts } from '../embeddings/local-embedding-model.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SurpriseResult {
  readonly S: number;
  readonly ttr_normalized: number;
  readonly entropy_normalized: number;
  readonly semantic_shift_normalized: number;
  readonly clustering_penalty: number;
  readonly diagnostics: {
    readonly ttr_raw: number;
    readonly entropy_raw: number;
    readonly shift_moyen: number;
    readonly S_shift_balance: number;
    readonly segment_count: number;
    readonly unique_words: number;
    readonly total_words: number;
  };
  readonly warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG — weights sum to 1.0 for proper [0,100] range
// ═══════════════════════════════════════════════════════════════════════════════

const WEIGHTS = {
  ttr: 0.30,
  entropy: 0.30,
  semantic_shift: 0.15,
  clustering: 0.25,     // applied as (100 - penalty)
} as const;

const SHIFT_TARGET = 0.55;
const SHIFT_RANGE = 0.50;

// ═══════════════════════════════════════════════════════════════════════════════
// TTR (Guiraud)
// ═══════════════════════════════════════════════════════════════════════════════

function computeTTR(tokens: string[]): { raw: number; normalized: number } {
  if (tokens.length === 0) return { raw: 0, normalized: 0 };
  const unique = new Set(tokens);
  const guiraud = unique.size / Math.sqrt(tokens.length);
  // French prose: Guiraud 4-7 = normal, >7 = rich. Normalize: 7→100.
  const normalized = Math.min(100, (guiraud / 7) * 100);
  return { raw: guiraud, normalized };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTROPY (Shannon)
// ═══════════════════════════════════════════════════════════════════════════════

function computeEntropy(tokens: string[]): { raw: number; normalized: number } {
  if (tokens.length === 0) return { raw: 0, normalized: 0 };
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);

  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / tokens.length;
    if (p > 0) entropy -= p * Math.log2(p);
  }

  // Max entropy for N unique tokens
  const maxEntropy = Math.log2(Math.max(2, new Set(tokens).size));
  const normalized = maxEntropy > 0 ? Math.min(100, (entropy / maxEntropy) * 100) : 0;
  return { raw: entropy, normalized };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC SHIFT (paragraph-level BoW)
// ═══════════════════════════════════════════════════════════════════════════════

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])[\s\n]+/).map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Group sentences into paragraph-like segments (2-4 sentences each).
 */
function splitSegments(text: string): string[] {
  const sentences = splitSentences(text);
  if (sentences.length <= 2) return [text];

  const segments: string[] = [];
  const groupSize = Math.min(4, Math.max(2, Math.ceil(sentences.length / 4)));

  for (let i = 0; i < sentences.length; i += groupSize) {
    const group = sentences.slice(i, i + groupSize).join(' ');
    segments.push(group);
  }
  return segments;
}

interface ShiftResult {
  normalized: number;
  shiftMoyen: number;
  balance: number;
}

function computeShiftScore(segments: string[]): ShiftResult {
  if (segments.length < 2) return { normalized: 50, shiftMoyen: 0, balance: 0.5 };

  const shifts = computeSemanticShifts(segments);
  if (shifts.length === 0) return { normalized: 50, shiftMoyen: 0, balance: 0.5 };

  const avg = shifts.reduce((a, b) => a + b, 0) / shifts.length;

  // For literary prose, BoW similarity between varied paragraphs is typically low
  // (shift ≈ 0.7-1.0). This is GOOD — it means diverse content.
  // Score: shift=0→0 (repetitive), shift=0.3→40, shift=0.6→75, shift=0.8→90, shift=1.0→100
  // Using sigmoid-style mapping centered at 0.5
  const diversityRaw = avg <= 0.5
    ? (avg / 0.5) * 65          // 0→0, 0.5→65
    : 65 + (avg - 0.5) / 0.5 * 35;  // 0.5→65, 1.0→100

  // Shift variety: variance in shifts = unpredictable transitions = bonus
  const variance = shifts.length > 1
    ? shifts.reduce((sum, s) => sum + (s - avg) ** 2, 0) / shifts.length
    : 0;
  const varietyBonus = Math.min(10, variance * 40);

  const normalized = Math.min(100, diversityRaw + varietyBonus);
  const balance = normalized / 100; // for diagnostics compatibility

  return { normalized, shiftMoyen: avg, balance };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLUSTERING PENALTY
// ═══════════════════════════════════════════════════════════════════════════════

function computeClusteringPenalty(tokens: string[], text: string): number {
  if (tokens.length < 10) return 0;

  let penalty = 0;

  // 1. Word clusters: same word appearing 3+ times in a 10-word window
  for (let i = 0; i <= tokens.length - 10; i += 5) {
    const window = tokens.slice(i, i + 10);
    const freq = new Map<string, number>();
    for (const t of window) freq.set(t, (freq.get(t) ?? 0) + 1);
    for (const count of freq.values()) {
      if (count >= 3) penalty += 10;
    }
  }

  // 2. Structural monotony: detect a content word present in >40% of sentences
  const sentences = text.split(/(?<=[.!?…])[\s\n]+/).map(s => s.trim()).filter(s => s.length > 0);
  if (sentences.length >= 5) {
    const STOP = new Set(['le','la','les','un','une','des','de','du','et','ou','que','qui','elle','il','dans','sur','par','pour','avec','ce','se','en','ne','pas','à','est','sont','a','ont','son','sa','ses','au']);
    const wordInSentences = new Map<string, number>();
    for (const s of sentences) {
      const words = new Set(s.toLowerCase().split(/[\s''.,;:!?…"""()«»\-]+/).filter(w => w.length > 2 && !STOP.has(w)));
      for (const w of words) {
        wordInSentences.set(w, (wordInSentences.get(w) ?? 0) + 1);
      }
    }
    // If any content word appears in >40% of sentences → structural repetition
    for (const [_word, count] of wordInSentences) {
      const ratio = count / sentences.length;
      if (ratio > 0.4 && count >= 4) {
        penalty += Math.floor((ratio - 0.4) * 200);
      }
    }
  }

  return Math.min(100, penalty);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCORER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute Surprise score S ∈ [0, 100].
 * Does NOT use SII.metaphor (LINT-G02). No external embedding API (LINT-G03).
 */
export function computeSurprise(text: string): SurpriseResult {
  const warnings: string[] = [];

  if (!text || text.trim().length === 0) {
    return {
      S: 0, ttr_normalized: 0, entropy_normalized: 0,
      semantic_shift_normalized: 0, clustering_penalty: 0,
      diagnostics: { ttr_raw: 0, entropy_raw: 0, shift_moyen: 0,
        S_shift_balance: 0, segment_count: 0, unique_words: 0, total_words: 0 },
      warnings: ['EMPTY_INPUT'],
    };
  }

  const tokens = tokenize(text);
  const uniqueWords = new Set(tokens).size;

  const ttr = computeTTR(tokens);
  const entropy = computeEntropy(tokens);

  const ttrNorm = ttr.normalized;
  const entropyNorm = entropy.normalized;

  const segments = splitSegments(text);
  const shift = computeShiftScore(segments);
  const clusterPenalty = computeClusteringPenalty(tokens, text);

  if (shift.balance < 0.3) {
    warnings.push(`S_SHIFT_BALANCE_LOW: ${shift.balance.toFixed(3)}`);
  }

  // All four terms [0,100]; weights sum to 1.0 → S ∈ [0,100].
  const raw = WEIGHTS.ttr * ttrNorm
            + WEIGHTS.entropy * entropyNorm
            + WEIGHTS.semantic_shift * shift.normalized
            + WEIGHTS.clustering * (100 - clusterPenalty);

  const S = Math.max(0, Math.min(100, raw));

  return {
    S, ttr_normalized: ttrNorm, entropy_normalized: entropyNorm,
    semantic_shift_normalized: shift.normalized, clustering_penalty: clusterPenalty,
    diagnostics: {
      ttr_raw: ttr.raw, entropy_raw: entropy.raw, shift_moyen: shift.shiftMoyen,
      S_shift_balance: shift.balance, segment_count: segments.length,
      unique_words: uniqueWords, total_words: tokens.length,
    },
    warnings,
  };
}
