/**
 * OMEGA Multi-Scale Scorer — Phase R-7
 *
 * Architecture:
 *   1. Score LOCAL (500w) — GB model on 42 features (V3 + semantic)
 *   2. Score MESO (2000w) — same GB model, larger window
 *   3. Score SLOPE — endurance factor (trend across scales)
 *   4. Score FINAL — meta-regression: alpha*meso + beta*slope + gamma*delta + delta2*std + intercept
 *
 * Key insight: LLM prose collapses beyond 2000 words.
 * Texts < 2000 words are flagged as NON_VERIFIABLE.
 *
 * Coefficients learned on 571-work corpus (Ridge, seed=42).
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MultiScaleScore {
  /** GB score on 500-word windows (avg of 5) */
  score_local: number;
  /** GB score on 2000-word windows (avg of 5) */
  score_meso: number;
  /** Endurance slope (score trend across log-scales) */
  slope: number;
  /** Endurance delta (meso - local) */
  endurance_delta: number;
  /** Standard deviation of meso scores across windows */
  std_meso: number;
  /** Meta-regression final score */
  final_score: number;
  /** Verification flag */
  flag: 'VERIFIED' | 'NON_VERIFIABLE';
  /** Total word count */
  word_count: number;
}

// ═══════════════════════════════════════════════════════════════════════
// META-REGRESSION COEFFICIENTS (learned on 571-work corpus)
// ═══════════════════════════════════════════════════════════════════════

const META_COEFFICIENTS = {
  score_meso: 1.781702,
  slope: 1.667173,
  endurance_delta: -1.121767,
  std_meso: 0.496736,
  intercept: -3.163463,
};

/** Minimum word count for meso verification */
export const MIN_WORDS_FOR_VERIFICATION = 2000;

// ═══════════════════════════════════════════════════════════════════════
// SCORER
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute the multi-scale final score from pre-computed components.
 *
 * @param scoreMeso - GB score at 2000-word scale
 * @param slope - Endurance slope (log-scale regression)
 * @param enduranceDelta - score_meso - score_local
 * @param stdMeso - Standard deviation of meso window scores
 * @returns Meta-regression final score
 */
export function computeFinalScore(
  scoreMeso: number,
  slope: number,
  enduranceDelta: number,
  stdMeso: number,
): number {
  return (
    META_COEFFICIENTS.score_meso * scoreMeso +
    META_COEFFICIENTS.slope * slope +
    META_COEFFICIENTS.endurance_delta * enduranceDelta +
    META_COEFFICIENTS.std_meso * stdMeso +
    META_COEFFICIENTS.intercept
  );
}

/**
 * Build a complete multi-scale score from local and meso measurements.
 *
 * @param scoreLocal - Mean GB score on 500w windows
 * @param scoreMeso - Mean GB score on 2000w windows (null if text too short)
 * @param slope - Endurance slope (null if text too short for multi-scale)
 * @param stdMeso - Std of 2000w window scores (null if text too short)
 * @param wordCount - Total word count of the text
 * @returns Complete multi-scale score with verification flag
 */
export function buildMultiScaleScore(
  scoreLocal: number,
  scoreMeso: number | null,
  slope: number | null,
  stdMeso: number | null,
  wordCount: number,
): MultiScaleScore {
  const verified = wordCount >= MIN_WORDS_FOR_VERIFICATION && scoreMeso !== null;

  if (verified) {
    const meso = scoreMeso!;
    const sl = slope ?? 0;
    const delta = meso - scoreLocal;
    const std = stdMeso ?? 0;
    const finalScore = computeFinalScore(meso, sl, delta, std);

    return {
      score_local: scoreLocal,
      score_meso: meso,
      slope: sl,
      endurance_delta: delta,
      std_meso: std,
      final_score: finalScore,
      flag: 'VERIFIED',
      word_count: wordCount,
    };
  }

  // Non-verifiable: use local score only, no endurance proof
  return {
    score_local: scoreLocal,
    score_meso: scoreLocal, // fallback to local
    slope: 0,
    endurance_delta: 0,
    std_meso: 0,
    final_score: scoreLocal, // raw local, no meta-regression
    flag: 'NON_VERIFIABLE',
    word_count: wordCount,
  };
}

export { META_COEFFICIENTS };
