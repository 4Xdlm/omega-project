/**
 * OMEGA GENIUS ENGINE — INEVITABILITY SCORER (I)
 * Sprint: GENIUS-02 | NASA-Grade L4 / DO-178C Level A
 *
 * I = w1*causal_consistency + w2*setup_payoff + w3*non_contradiction
 *
 * Measures whether narrative events feel "inevitable in hindsight":
 * - causal_consistency: causal marker density (more = tighter chain)
 * - setup_payoff: elements introduced early reappear later
 * - non_contradiction: no logical contradictions
 *
 * ANTI-DOUBLON: I is self-contained, no external time-engine dependency (LINT-G04).
 * Uses raw extracted events from input only.
 */

export interface NarrativeEvent {
  readonly text: string;
  readonly position: number;
  readonly type: 'action' | 'state' | 'dialogue' | 'description';
}

export interface InevitabilityResult {
  readonly I: number;
  readonly causal_consistency: number;
  readonly setup_payoff: number;
  readonly non_contradiction: number;
  readonly diagnostics: {
    readonly causal_links_found: number;
    readonly false_causals: number;
    readonly setups_found: number;
    readonly payoffs_found: number;
    readonly contradictions_found: number;
    readonly sentence_count: number;
  };
}

const WEIGHTS = { causal: 0.45, setup_payoff: 0.30, non_contradiction: 0.25 } as const;

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])[\s\n]+/).map(s => s.trim()).filter(s => s.length > 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAUSAL CONSISTENCY
// ═══════════════════════════════════════════════════════════════════════════════

const CAUSAL_MARKERS = [
  // Explicit consequence
  /\bdonc\b/i, /\balors\b/i, /\bainsi\b/i, /\bpar conséquent\b/i,
  /\bc'est pourquoi\b/i, /\bde ce fait\b/i, /\ben conséquence\b/i,
  // Explicit cause
  /\bparce que?\b/i, /\bcar\b/i, /\bpuisque?\b/i,
  /\bà cause de?\b/i, /\bgrâce à\b/i, /\ben raison de\b/i,
  // Conditional
  /\bsi\b.*\balors\b/i,
  // Implicit consequence/temporal causation
  /\baussitôt\b/i, /\bdu coup\b/i, /\bdès lors\b/i,
  /\bconfirmant\b/i, /\bprouvant\b/i, /\brévélant\b/i,
  /\bd'instinct\b/i, /\bsoudain\b/i, /\bimmédiatement\b/i,
  // Result markers
  /\bsi bien que\b/i, /\bde sorte que\b/i, /\btellement\b.*\bque\b/i,
  /\bau point de\b/i, /\bce qui\b/i,
];

const FALSE_CAUSAL_PATTERNS = [
  /^donc[,\s]/i,
  /^alors que rien/i,
];

/**
 * Causal consistency: higher causal marker density = tighter causal chain = higher score.
 * Penalizes false causals (markers without substance in preceding sentence).
 */
function computeCausalConsistency(sentences: string[]): { score: number; links: number; falseCausals: number } {
  if (sentences.length < 2) return { score: 50, links: 0, falseCausals: 0 };

  let causalLinks = 0;
  let falseCausals = 0;

  for (let i = 1; i < sentences.length; i++) {
    const current = sentences[i];
    const previous = sentences[i - 1];

    const hasCausalMarker = CAUSAL_MARKERS.some(m => m.test(current));
    if (hasCausalMarker) {
      const prevWords = previous.split(/\s+/).filter(w => w.length > 2);
      if (prevWords.length >= 3) {
        causalLinks++;
      } else {
        falseCausals++;
      }
    }
  }

  for (const sentence of sentences) {
    if (FALSE_CAUSAL_PATTERNS.some(p => p.test(sentence.trim()))) {
      falseCausals++;
    }
  }

  // Score: more causal links = higher score (monotonic, not inverted).
  // density = links / (N-1). Scale: density * 200, capped at 100.
  const transitions = sentences.length - 1;
  const density = transitions > 0 ? causalLinks / transitions : 0;
  const densityScore = Math.min(100, density * 220);

  // Penalty for false causals
  const falsePenalty = falseCausals * 15;

  return {
    score: Math.max(0, Math.min(100, densityScore - falsePenalty)),
    links: causalLinks,
    falseCausals,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP / PAYOFF
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect setup/payoff: content words from first half reappearing in second half.
 * Uses stem matching (first 5 chars) for French morphological variation.
 */
function computeSetupPayoff(sentences: string[]): { score: number; setups: number; payoffs: number } {
  if (sentences.length < 4) return { score: 50, setups: 0, payoffs: 0 };

  const mid = Math.floor(sentences.length / 2);
  const firstHalf = sentences.slice(0, mid).join(' ').toLowerCase();
  const secondHalf = sentences.slice(mid).join(' ').toLowerCase();

  // Extract content words (3+ chars, not stopwords)
  const STOP = new Set(['les','des','une','dans','avec','pour','sur','par','son','ses','elle','qui','que','pas','mais','car','est','était','sont','ont','cette','ces']);
  function getContentWords(text: string): string[] {
    return text.split(/[\s''.,;:!?…"""()«»\-]+/)
      .filter(w => w.length >= 3 && !STOP.has(w));
  }

  function stem(word: string): string {
    return word.length >= 5 ? word.slice(0, 5) : word;
  }

  const firstWords = getContentWords(firstHalf);
  const secondWords = getContentWords(secondHalf);

  // Unique stems in first half
  const firstStems = new Set(firstWords.map(stem));
  const secondStemSet = new Set(secondWords.map(stem));

  let payoffs = 0;
  for (const s of firstStems) {
    if (secondStemSet.has(s)) payoffs++;
  }

  const setups = firstStems.size;
  if (setups === 0) return { score: 40, setups: 0, payoffs: 0 };

  // Payoff ratio: use sqrt(setups) to avoid penalizing texts with many unique stems.
  // For rich prose, many unique stems exist but only key thematic ones recur.
  const denominator = Math.max(1, Math.sqrt(setups));
  const ratio = payoffs / denominator;
  const score = Math.min(100, ratio * 100);

  return { score, setups, payoffs };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NON-CONTRADICTION
// ═══════════════════════════════════════════════════════════════════════════════

const CONTRADICTION_PAIRS: [RegExp, RegExp][] = [
  [/\bnuit\b/i, /\bsoleil\b.*\bbrillait\b/i],
  [/\bsilence\b.*\babsolu\b/i, /\bbruit\b.*\bassourdissant\b/i],
  [/\bseul[e]?\b.*\bdans\b/i, /\bfoule\b.*\bdense\b/i],
  [/\bfroid\b.*\bglacial\b/i, /\bchaleur\b.*\bétouffant\b/i],
  [/\bimmobile\b/i, /\bcourut\b.*\bvite\b/i],
  [/\bferma\b.*\byeux\b/i, /\bvit\b.*\bclairement\b/i],
  [/\bsourd\b/i, /\bentendit\b/i],
  [/\baveugle\b/i, /\baperçut\b/i],
];

function computeNonContradiction(sentences: string[]): { score: number; contradictions: number } {
  if (sentences.length < 2) return { score: 100, contradictions: 0 };

  let contradictions = 0;
  const WINDOW = 5;

  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < Math.min(i + WINDOW, sentences.length); j++) {
      for (const [patternA, patternB] of CONTRADICTION_PAIRS) {
        if (
          (patternA.test(sentences[i]) && patternB.test(sentences[j])) ||
          (patternB.test(sentences[i]) && patternA.test(sentences[j]))
        ) {
          contradictions++;
        }
      }
    }
  }

  return { score: Math.max(0, 100 - contradictions * 25), contradictions };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCORER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute Inevitability score I ∈ [0, 100].
 * Self-contained causal analysis, no external time-engine scores (LINT-G04).
 */
export function computeInevitability(
  text: string,
  _extractedEvents?: readonly NarrativeEvent[],
): InevitabilityResult {
  if (!text || text.trim().length === 0) {
    return {
      I: 0, causal_consistency: 0, setup_payoff: 0, non_contradiction: 0,
      diagnostics: { causal_links_found: 0, false_causals: 0, setups_found: 0,
        payoffs_found: 0, contradictions_found: 0, sentence_count: 0 },
    };
  }

  const sentences = splitSentences(text);
  const causal = computeCausalConsistency(sentences);
  const setupPayoff = computeSetupPayoff(sentences);
  const nonContradiction = computeNonContradiction(sentences);

  const raw = WEIGHTS.causal * causal.score
            + WEIGHTS.setup_payoff * setupPayoff.score
            + WEIGHTS.non_contradiction * nonContradiction.score;

  const I = Math.max(0, Math.min(100, raw));

  return {
    I, causal_consistency: causal.score, setup_payoff: setupPayoff.score,
    non_contradiction: nonContradiction.score,
    diagnostics: {
      causal_links_found: causal.links, false_causals: causal.falseCausals,
      setups_found: setupPayoff.setups, payoffs_found: setupPayoff.payoffs,
      contradictions_found: nonContradiction.contradictions, sentence_count: sentences.length,
    },
  };
}
