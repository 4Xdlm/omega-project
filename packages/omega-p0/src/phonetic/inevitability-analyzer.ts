/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — FRENCH INEVITABILITY ANALYZER (P7)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: phonetic/inevitability-analyzer.ts
 * Phase: P7 (depends on P5 function word dictionary concept, but standalone)
 * Invariant: ART-SEM-P7
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Measures retrospective coherence — the sense that what came before
 * feels "inevitable" once you've read the whole passage.
 *
 * Three metrics:
 *
 *   1. LEXICAL COHESION — vocabulary callback ratio
 *      For each sentence, how many content words appeared in prior sentences?
 *      High cohesion = author revisits and builds on earlier vocabulary.
 *      cohesion[i] = |contentWords(S_i) ∩ contentWords(S_0..S_{i-1})| / |contentWords(S_i)|
 *      Mean cohesion across all sentences (0-1).
 *
 *   2. THEMATIC THREADING — sliding window Jaccard overlap
 *      Jaccard(window_i, window_{i+1}) for overlapping windows of content words.
 *      High Jaccard = sustained thematic focus. Low = topic scatter.
 *      Mean Jaccard across all windows (0-1).
 *
 *   3. CONVERGENCE SCORE — does vocabulary concentrate or scatter over time?
 *      Compare first-half vocabulary vs second-half vocabulary overlap.
 *      convergence = |V_first ∩ V_second| / |V_first ∪ V_second|
 *      High = text converges (vocabulary tightens). Low = text diverges.
 *
 * Bonus: ECHO DENSITY — how many words from the final sentence appeared
 * in the first sentence? Measures "closing the loop" / circular structure.
 *
 * Architecture: pure set operations on content words.
 * Zero NLP. Zero LLM. 100% CALC. Deterministic.
 *
 * VALIDITY CLAIM:
 *   metric: "inevitability_fr"
 *   originalDomain: "discourse analysis / text cohesion"
 *   appliedDomain: "French prose retrospective coherence"
 *   assumption: "lexical overlap is a proxy for thematic coherence"
 *   validationStatus: "UNVALIDATED"
 *   confidenceWeight: 0.5
 *   nonGoal: "Not a measure of narrative quality. Diagnostic only."
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface InevitabilityAnalysis {
  /** Number of sentences detected */
  readonly sentenceCount: number;

  /** Per-sentence cohesion scores (0-1) */
  readonly cohesionCurve: readonly number[];
  /** Mean lexical cohesion (0-1): average callback ratio */
  readonly meanCohesion: number;

  /** Per-window Jaccard overlap scores (0-1) */
  readonly threadingCurve: readonly number[];
  /** Mean thematic threading (0-1): average Jaccard */
  readonly meanThreading: number;

  /** First-half / second-half vocabulary overlap (0-1) */
  readonly convergence: number;

  /** Echo density: final-first sentence vocabulary overlap (0-1) */
  readonly echoDensity: number;

  /** Cohesion trend: positive = building, negative = dispersing */
  readonly cohesionTrend: number;

  /** Composite inevitability score (0-100) — DIAGNOSTIC ONLY */
  readonly inevitabilityScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCTION WORDS (subset for content word filtering)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * French function words — same concept as P5.
 * Duplicated here to keep P7 standalone (no import dependency).
 */
const FUNCTION_WORDS: ReadonlySet<string> = new Set([
  'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'au', 'aux',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
  'ce', 'cet', 'cette', 'ces',
  'chaque', 'tout', 'toute', 'tous', 'toutes',
  'aucun', 'aucune', 'nul', 'nulle',
  'plusieurs', 'quelque', 'quelques',
  'même', 'mêmes', 'autre', 'autres',
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'me', 'te', 'se', 'lui', 'eux',
  'moi', 'toi', 'soi',
  'en', 'y',
  'j', 'm', 't', 's', 'n', 'c', 'd', 'qu',
  'qui', 'que', 'quoi', 'dont', 'où',
  'lequel', 'laquelle', 'lesquels', 'lesquelles',
  'celui', 'celle', 'ceux', 'celles',
  'ceci', 'cela', 'ça',
  'rien', 'personne',
  'à', 'dans', 'par', 'pour', 'sur', 'avec', 'sans', 'sous',
  'entre', 'vers', 'chez', 'après', 'avant', 'depuis', 'pendant',
  'durant', 'contre', 'malgré', 'selon', 'parmi',
  'dès', 'hors', 'derrière', 'devant',
  'et', 'ou', 'mais', 'or', 'ni', 'car', 'donc',
  'si', 'comme', 'quand', 'lorsque', 'puisque', 'tandis',
  'alors', 'bien', 'afin', 'parce',
  'être', 'avoir',
  'suis', 'es', 'est', 'sommes', 'êtes', 'sont',
  'étais', 'était', 'étions', 'étiez', 'étaient',
  'serai', 'sera', 'serons', 'serez', 'seront',
  'serais', 'serait', 'serions', 'seriez', 'seraient',
  'sois', 'soit', 'soyons', 'soyez', 'soient',
  'fus', 'fut', 'fût', 'furent', 'été',
  'ai', 'as', 'a', 'avons', 'avez', 'ont',
  'avais', 'avait', 'avions', 'aviez', 'avaient',
  'aurai', 'aura', 'aurons', 'aurez', 'auront',
  'aurais', 'aurait', 'aurions', 'auriez', 'auraient',
  'aie', 'aies', 'ait', 'ayons', 'ayez', 'aient',
  'eus', 'eut', 'eût', 'eurent', 'eu',
  'ne', 'pas', 'plus', 'point', 'jamais', 'guère',
  'très', 'trop', 'peu', 'assez', 'beaucoup', 'tant', 'autant',
  'aussi', 'encore', 'déjà', 'toujours', 'souvent',
  'puis', 'ensuite', 'enfin', 'cependant', 'pourtant',
  'néanmoins', 'toutefois', 'ainsi',
  'non', 'oui', 'voici', 'voilà', 'là', 'ici',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// TOKENIZER & SENTENCE SPLITTER
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

function splitSentences(text: string): readonly string[] {
  // Split on sentence-ending punctuation followed by space or end
  const raw = text.split(/(?<=[.!?…])\s+/);
  return raw.filter(s => s.trim().length > 0);
}

function extractContentWords(sentence: string): ReadonlySet<string> {
  const tokens = tokenize(sentence);
  const content = new Set<string>();
  for (const t of tokens) {
    const stripped = t.replace(/^[a-z]'/, '');
    if (!FUNCTION_WORDS.has(t) && !FUNCTION_WORDS.has(stripped) && t.length > 2) {
      content.add(t);
    }
  }
  return content;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SET OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function intersectionSize(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  let count = 0;
  for (const item of a) {
    if (b.has(item)) count++;
  }
  return count;
}

function unionSize(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  const union = new Set(a);
  for (const item of b) {
    union.add(item);
  }
  return union.size;
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  const uSize = unionSize(a, b);
  if (uSize === 0) return 0;
  return intersectionSize(a, b) / uSize;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TREND CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple linear regression slope on an array of values.
 * Positive slope = increasing trend.
 */
function linearSlope(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE SCORE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Composite inevitability score (0-100). DIAGNOSTIC ONLY.
 *
 * Components:
 *   - Mean cohesion (weight 0.3): higher = more callbacks
 *   - Mean threading (weight 0.25): higher = sustained themes
 *   - Convergence (weight 0.25): higher = vocabulary tightens
 *   - Echo density (weight 0.1): higher = circular structure
 *   - Cohesion trend (weight 0.1): positive = building momentum
 *
 * All weights are SYMBOLS pending calibration.
 */
function computeInevitabilityScore(
  meanCohesion: number,
  meanThreading: number,
  convergence: number,
  echoDensity: number,
  cohesionTrend: number,
): number {
  // Cohesion: 0.1 = low, 0.3 = ok, 0.6 = excellent
  const cohesionScore = Math.min(100, Math.max(0,
    (meanCohesion - 0.03) / (0.35 - 0.03) * 100));

  // Threading: 0.05 = low, 0.15 = ok, 0.35 = excellent
  const threadingScore = Math.min(100, Math.max(0,
    (meanThreading - 0.01) / (0.20 - 0.01) * 100));

  // Convergence: 0.1 = low, 0.3 = ok, 0.5 = excellent
  const convergenceScore = Math.min(100, Math.max(0,
    (convergence - 0.05) / (0.5 - 0.05) * 100));

  // Echo: 0 = no echo, 0.3 = some, 0.6 = strong
  const echoScore = Math.min(100, Math.max(0,
    echoDensity / 0.6 * 100));

  // Trend: -0.05 = dispersing, 0 = flat, +0.05 = building
  const trendScore = Math.min(100, Math.max(0,
    (cohesionTrend + 0.05) / 0.1 * 100));

  return Math.round(
    cohesionScore * 0.3 +
    threadingScore * 0.25 +
    convergenceScore * 0.25 +
    echoScore * 0.1 +
    trendScore * 0.1
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze inevitability (retrospective coherence) of French prose.
 *
 * @param text - French prose to analyze
 * @returns InevitabilityAnalysis
 */
export function analyzeInevitability(text: string): InevitabilityAnalysis {
  const empty: InevitabilityAnalysis = {
    sentenceCount: 0,
    cohesionCurve: [],
    meanCohesion: 0,
    threadingCurve: [],
    meanThreading: 0,
    convergence: 0,
    echoDensity: 0,
    cohesionTrend: 0,
    inevitabilityScore: 0,
  };

  if (!text || text.trim().length === 0) return empty;

  const sentences = splitSentences(text).filter(s => tokenize(s).length > 0);
  if (sentences.length === 0) return empty;

  // ─── Extract content words per sentence ───
  const sentenceWords: ReadonlySet<string>[] = sentences.map(extractContentWords);
  const sentenceCount = sentences.length;

  // ─── 1. LEXICAL COHESION ───
  // For each sentence i>0: overlap with all prior sentences
  const cohesionCurve: number[] = [];
  const priorVocab = new Set<string>();

  for (let i = 0; i < sentenceCount; i++) {
    if (i === 0) {
      // First sentence has no prior context — cohesion = 0
      cohesionCurve.push(0);
    } else {
      const current = sentenceWords[i];
      if (current.size === 0) {
        cohesionCurve.push(0);
      } else {
        const overlap = intersectionSize(current, priorVocab);
        cohesionCurve.push(overlap / current.size);
      }
    }
    // Add current words to prior vocabulary
    for (const w of sentenceWords[i]) {
      priorVocab.add(w);
    }
  }

  const meanCohesion = sentenceCount > 1
    ? Math.round(
        (cohesionCurve.slice(1).reduce((a, b) => a + b, 0) / (sentenceCount - 1)) * 1000
      ) / 1000
    : 0;

  // ─── 2. THEMATIC THREADING (Jaccard between consecutive sentences) ───
  const threadingCurve: number[] = [];
  for (let i = 1; i < sentenceCount; i++) {
    threadingCurve.push(jaccard(sentenceWords[i - 1], sentenceWords[i]));
  }

  const meanThreading = threadingCurve.length > 0
    ? Math.round(
        (threadingCurve.reduce((a, b) => a + b, 0) / threadingCurve.length) * 1000
      ) / 1000
    : 0;

  // ─── 3. CONVERGENCE (first-half vs second-half vocabulary) ───
  const midpoint = Math.floor(sentenceCount / 2);
  const firstHalf = new Set<string>();
  const secondHalf = new Set<string>();

  for (let i = 0; i < sentenceCount; i++) {
    const target = i < midpoint ? firstHalf : secondHalf;
    for (const w of sentenceWords[i]) {
      target.add(w);
    }
  }

  const convergence = sentenceCount >= 2
    ? Math.round(jaccard(firstHalf, secondHalf) * 1000) / 1000
    : 0;

  // ─── 4. ECHO DENSITY (first sentence ↔ last sentence) ───
  let echoDensity = 0;
  if (sentenceCount >= 2) {
    const first = sentenceWords[0];
    const last = sentenceWords[sentenceCount - 1];
    const uSize = unionSize(first, last);
    echoDensity = uSize > 0
      ? Math.round((intersectionSize(first, last) / uSize) * 1000) / 1000
      : 0;
  }

  // ─── 5. COHESION TREND ───
  const cohesionTrend = cohesionCurve.length >= 2
    ? Math.round(linearSlope(cohesionCurve) * 10000) / 10000
    : 0;

  // ─── Composite ───
  const inevitabilityScore = computeInevitabilityScore(
    meanCohesion,
    meanThreading,
    convergence,
    echoDensity,
    cohesionTrend,
  );

  return {
    sentenceCount,
    cohesionCurve,
    meanCohesion,
    threadingCurve,
    meanThreading,
    convergence,
    echoDensity,
    cohesionTrend,
    inevitabilityScore,
  };
}
