/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — FRENCH LEXICAL SURPRISE ANALYZER (P6)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: phonetic/surprise-analyzer.ts
 * Phase: P6 (independent — no dependency on P0-P5)
 * Invariant: ART-SEM-P6
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Measures lexical surprise/unpredictability of French prose via 4 metrics:
 *
 *   1. SHANNON ENTROPY (H) — information density of vocabulary
 *      H = -Σ p(w) × log2(p(w))
 *      Higher H = more diverse/unpredictable word choices
 *      Normalized to H/log2(V) where V = vocabulary size (0-1)
 *
 *   2. BIGRAM SURPRISE — mean surprise of word transitions
 *      For each bigram (w_i-1, w_i):
 *        surprise(w_i | w_i-1) = -log2(P(w_i | w_i-1))
 *      P(w_i | w_i-1) = count(w_i-1, w_i) / count(w_i-1)
 *      With Laplace smoothing (+1) to handle unseen bigrams.
 *      Higher = more unpredictable transitions.
 *
 *   3. HAPAX RATIO — proportion of words used exactly once
 *      hapaxRatio = |{w : count(w) = 1}| / |V|
 *      High hapax = author avoids repetition, introduces fresh vocabulary.
 *
 *   4. NOVELTY CURVE — sliding window surprise detection
 *      At each position, compute: how many new types appear in
 *      window[i..i+W] that were NOT in window[i-W..i]?
 *      Detects zones of lexical renewal vs stagnation.
 *
 * Architecture: pure frequency statistics. No external corpus.
 * Zero NLP dependency. Zero LLM. 100% CALC. Deterministic.
 *
 * VALIDITY CLAIM:
 *   metric: "lexical_surprise_fr"
 *   originalDomain: "information theory + corpus linguistics"
 *   appliedDomain: "French prose unpredictability assessment"
 *   assumption: "local text statistics approximate perceived surprise"
 *   validationStatus: "UNVALIDATED"
 *   confidenceWeight: 0.6
 *   nonGoal: "Not a measure of literary quality. Diagnostic only."
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SurpriseAnalysis {
  /** Shannon entropy of word distribution (bits) */
  readonly shannonEntropy: number;
  /** Normalized entropy H/log2(V) — 0 = uniform repetition, 1 = max diversity */
  readonly normalizedEntropy: number;
  /** Vocabulary size (unique types) */
  readonly vocabularySize: number;
  /** Total tokens */
  readonly totalTokens: number;

  /** Mean bigram surprise (bits per transition) */
  readonly meanBigramSurprise: number;
  /** Median bigram surprise */
  readonly medianBigramSurprise: number;
  /** Max bigram surprise (most unexpected transition) */
  readonly maxBigramSurprise: number;
  /** Std deviation of bigram surprise */
  readonly bigramSurpriseStd: number;
  /** Per-bigram surprise values (for analysis) */
  readonly bigramSurprises: readonly number[];

  /** Hapax legomena count (words appearing exactly once) */
  readonly hapaxCount: number;
  /** Hapax ratio: hapax / vocabulary size */
  readonly hapaxRatio: number;
  /** Dis legomena count (words appearing exactly twice) */
  readonly disCount: number;

  /** Novelty curve: per-window novelty scores */
  readonly noveltyCurve: readonly number[];
  /** Mean novelty (0-1): average renewal rate */
  readonly meanNovelty: number;
  /** Novelty zones: indices where novelty spikes (above mean + 1σ) */
  readonly noveltySpikes: readonly number[];

  /** Composite surprise score (0-100) — DIAGNOSTIC ONLY */
  readonly surpriseScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKENIZER
// ═══════════════════════════════════════════════════════════════════════════════

function tokenize(text: string): readonly string[] {
  const regex = /[a-zA-ZàâäéèêëïîôùûüÿœæçñÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇÑ][a-zA-ZàâäéèêëïîôùûüÿœæçñÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇÑ'''\-]*/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[0].toLowerCase());
  }
  return matches;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHANNON ENTROPY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute Shannon entropy H = -Σ p(w) × log2(p(w))
 */
function computeShannonEntropy(freq: ReadonlyMap<string, number>, total: number): number {
  if (total === 0) return 0;
  let H = 0;
  for (const [, count] of freq) {
    const p = count / total;
    if (p > 0) {
      H -= p * Math.log2(p);
    }
  }
  return H;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BIGRAM SURPRISE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute per-bigram surprise with Laplace smoothing.
 *
 * surprise(w_i | w_{i-1}) = -log2( (count(w_{i-1}, w_i) + 1) / (count(w_{i-1}) + V) )
 *
 * Where V = vocabulary size (Laplace smoothing denominator).
 */
function computeBigramSurprises(
  tokens: readonly string[],
  vocabSize: number,
): readonly number[] {
  if (tokens.length < 2) return [];

  // Count unigrams
  const unigramCounts = new Map<string, number>();
  for (const t of tokens) {
    unigramCounts.set(t, (unigramCounts.get(t) ?? 0) + 1);
  }

  // Count bigrams
  const bigramCounts = new Map<string, number>();
  for (let i = 1; i < tokens.length; i++) {
    const key = tokens[i - 1] + '\x00' + tokens[i];
    bigramCounts.set(key, (bigramCounts.get(key) ?? 0) + 1);
  }

  // Compute surprise per position
  const surprises: number[] = [];
  for (let i = 1; i < tokens.length; i++) {
    const prev = tokens[i - 1];
    const curr = tokens[i];
    const key = prev + '\x00' + curr;

    const bigramCount = bigramCounts.get(key) ?? 0;
    const prevCount = unigramCounts.get(prev) ?? 0;

    // Laplace smoothed probability
    const p = (bigramCount + 1) / (prevCount + vocabSize);
    const surprise = -Math.log2(p);
    surprises.push(surprise);
  }

  return surprises;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOVELTY CURVE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute novelty curve: at each position, how many new word types
 * appear in the forward window that were NOT in the backward window?
 *
 * novelty[i] = |types(tokens[i..i+W]) \ types(tokens[max(0,i-W)..i])| / W
 *
 * @param tokens - lowercased token array
 * @param windowSize - window size (default 10)
 * @returns novelty scores (0-1) per position
 */
function computeNoveltyCurve(
  tokens: readonly string[],
  windowSize: number = 10,
): readonly number[] {
  if (tokens.length < windowSize * 2) {
    // Text too short for meaningful novelty curve
    return [];
  }

  const novelty: number[] = [];

  for (let i = windowSize; i <= tokens.length - windowSize; i++) {
    // Backward window: types in [i-W, i)
    const backward = new Set<string>();
    for (let j = i - windowSize; j < i; j++) {
      backward.add(tokens[j]);
    }

    // Forward window: types in [i, i+W)
    let newTypes = 0;
    for (let j = i; j < i + windowSize; j++) {
      if (!backward.has(tokens[j])) {
        newTypes++;
      }
    }

    novelty.push(newTypes / windowSize);
  }

  return novelty;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function mean(arr: readonly number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: readonly number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(arr: readonly number[], avg: number): number {
  if (arr.length <= 1) return 0;
  const variance = arr.reduce((sum, x) => sum + (x - avg) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE SCORE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Composite surprise score (0-100). DIAGNOSTIC ONLY — not calibrated.
 *
 * Components:
 *   - Normalized entropy (weight 0.3): higher = more diverse
 *   - Mean bigram surprise (weight 0.3): higher = less predictable
 *   - Hapax ratio (weight 0.2): higher = more fresh vocabulary
 *   - Mean novelty (weight 0.2): higher = more lexical renewal
 *
 * All weights are SYMBOLS pending calibration.
 */
function computeSurpriseScore(
  normalizedEntropy: number,
  meanBigramSurprise: number,
  hapaxRatio: number,
  meanNovelty: number,
  vocabSize: number,
): number {
  // Normalized entropy: 0-1 → 0-100
  const entropyScore = normalizedEntropy * 100;

  // Bigram surprise: typical range 3-10 bits, map to 0-100
  // 3 bits = predictable (0), 7+ bits = surprising (100)
  const bigramScore = Math.min(100, Math.max(0, (meanBigramSurprise - 3) / (7 - 3) * 100));

  // Hapax ratio: 0.4 = low, 0.6 = ok, 0.8 = high
  const hapaxScore = Math.min(100, Math.max(0, (hapaxRatio - 0.3) / (0.8 - 0.3) * 100));

  // Mean novelty: 0.3 = low, 0.5 = ok, 0.8 = high
  const noveltyScore = meanNovelty > 0
    ? Math.min(100, Math.max(0, (meanNovelty - 0.3) / (0.8 - 0.3) * 100))
    : 50; // default if text too short for novelty curve

  return Math.round(
    entropyScore * 0.3 +
    bigramScore * 0.3 +
    hapaxScore * 0.2 +
    noveltyScore * 0.2
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze lexical surprise of French prose.
 *
 * @param text - French prose to analyze
 * @returns SurpriseAnalysis
 */
export function analyzeSurprise(text: string): SurpriseAnalysis {
  if (!text || text.trim().length === 0) {
    return {
      shannonEntropy: 0,
      normalizedEntropy: 0,
      vocabularySize: 0,
      totalTokens: 0,
      meanBigramSurprise: 0,
      medianBigramSurprise: 0,
      maxBigramSurprise: 0,
      bigramSurpriseStd: 0,
      bigramSurprises: [],
      hapaxCount: 0,
      hapaxRatio: 0,
      disCount: 0,
      noveltyCurve: [],
      meanNovelty: 0,
      noveltySpikes: [],
      surpriseScore: 0,
    };
  }

  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return {
      shannonEntropy: 0,
      normalizedEntropy: 0,
      vocabularySize: 0,
      totalTokens: 0,
      meanBigramSurprise: 0,
      medianBigramSurprise: 0,
      maxBigramSurprise: 0,
      bigramSurpriseStd: 0,
      bigramSurprises: [],
      hapaxCount: 0,
      hapaxRatio: 0,
      disCount: 0,
      noveltyCurve: [],
      meanNovelty: 0,
      noveltySpikes: [],
      surpriseScore: 0,
    };
  }

  // ─── Word frequencies ───
  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }

  const vocabSize = freq.size;
  const totalTokens = tokens.length;

  // ─── Shannon Entropy ───
  const shannonEntropy = computeShannonEntropy(freq, totalTokens);
  const maxEntropy = vocabSize > 1 ? Math.log2(vocabSize) : 1;
  const normalizedEntropy = maxEntropy > 0
    ? Math.round((shannonEntropy / maxEntropy) * 1000) / 1000
    : 0;

  // ─── Bigram Surprise ───
  const bigramSurprises = computeBigramSurprises(tokens, vocabSize);
  const meanBigram = mean(bigramSurprises);
  const medianBigram = median(bigramSurprises);
  const maxBigram = bigramSurprises.length > 0 ? Math.max(...bigramSurprises) : 0;
  const stdBigram = stdDev(bigramSurprises, meanBigram);

  // ─── Hapax / Dis legomena ───
  let hapaxCount = 0;
  let disCount = 0;
  for (const [, count] of freq) {
    if (count === 1) hapaxCount++;
    if (count === 2) disCount++;
  }
  const hapaxRatio = vocabSize > 0
    ? Math.round((hapaxCount / vocabSize) * 1000) / 1000
    : 0;

  // ─── Novelty Curve ───
  const noveltyCurve = computeNoveltyCurve(tokens);
  const meanNov = mean(noveltyCurve);

  // Novelty spikes: positions where novelty > mean + 1σ
  const noveltyStd = stdDev(noveltyCurve, meanNov);
  const spikeThreshold = meanNov + noveltyStd;
  const noveltySpikes: number[] = [];
  for (let i = 0; i < noveltyCurve.length; i++) {
    if (noveltyCurve[i] > spikeThreshold) {
      noveltySpikes.push(i);
    }
  }

  // ─── Composite ───
  const surpriseScore = computeSurpriseScore(
    normalizedEntropy,
    meanBigram,
    hapaxRatio,
    meanNov,
    vocabSize,
  );

  return {
    shannonEntropy: Math.round(shannonEntropy * 1000) / 1000,
    normalizedEntropy,
    vocabularySize: vocabSize,
    totalTokens,
    meanBigramSurprise: Math.round(meanBigram * 1000) / 1000,
    medianBigramSurprise: Math.round(medianBigram * 1000) / 1000,
    maxBigramSurprise: Math.round(maxBigram * 1000) / 1000,
    bigramSurpriseStd: Math.round(stdBigram * 1000) / 1000,
    bigramSurprises,
    hapaxCount,
    hapaxRatio,
    disCount,
    noveltyCurve,
    meanNovelty: Math.round(meanNov * 1000) / 1000,
    noveltySpikes,
    surpriseScore,
  };
}
