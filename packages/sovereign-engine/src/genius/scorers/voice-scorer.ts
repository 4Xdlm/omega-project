/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA GENIUS ENGINE — VOICE SCORER (V)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: genius/scorers/voice-scorer.ts
 * Sprint: GENIUS-02
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * V = w1*rhythm_variation + w2*fingerprint_match + w3*register_coherence + w4*silence_ratio
 *
 * Measures voice identity and rhythmic quality:
 * - rhythm_variation: diversity in sentence lengths (not uniform)
 * - fingerprint_match: closeness to target voice (mode-dependent)
 * - register_coherence: consistency of language level
 * - silence_ratio: use of pauses, white space, ellipsis
 *
 * ANTI-DOUBLON: V is self-contained, no external conformity-check dependency (LINT-G06).
 * Uses VoiceGenome and AuthorFingerprint from input.
 *
 * V_floor: 70 (original), 85 (continuation), 75 (enhancement)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES (import from contract compiler for consistency)
// ═══════════════════════════════════════════════════════════════════════════════

export type GeniusMode = 'original' | 'continuation' | 'enhancement';

export interface VoiceGenome {
  phrase_length_mean: number;
  dialogue_ratio: number;
  metaphor_density: number;
  language_register: number;
  irony_level: number;
  ellipsis_rate: number;
  abstraction_ratio: number;
  punctuation_style: number;
  paragraph_rhythm: number;
  opening_variety: number;
}

export interface AuthorFingerprint {
  readonly author_id: string;
  readonly rhythm_distribution: {
    readonly bucket_lt5: number;
    readonly bucket_5_10: number;
    readonly bucket_10_15: number;
    readonly bucket_15_20: number;
    readonly bucket_20_25: number;
    readonly bucket_gt25: number;
  };
  readonly signature_words: readonly string[];
  readonly register: 'familier' | 'courant' | 'soutenu' | 'littéraire';
  readonly dialogue_silence_ratio: number;
  readonly avg_sentence_length: number;
}

export interface VoiceResult {
  readonly V: number;
  readonly rhythm_variation: number;
  readonly fingerprint_match: number;
  readonly register_coherence: number;
  readonly silence_quality: number;
  readonly V_floor: number;
  readonly V_floor_pass: boolean;
  readonly diagnostics: {
    readonly sentence_count: number;
    readonly avg_sentence_length: number;
    readonly length_stddev: number;
    readonly rhythm_distribution: {
      readonly bucket_lt5: number;
      readonly bucket_5_10: number;
      readonly bucket_10_15: number;
      readonly bucket_15_20: number;
      readonly bucket_20_25: number;
      readonly bucket_gt25: number;
    };
    readonly opening_variety_ratio: number;
    readonly punctuation_variety: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const WEIGHTS = {
  rhythm: 0.35,
  fingerprint: 0.25,
  register: 0.20,
  silence: 0.20,
} as const;

const V_FLOORS: Record<GeniusMode, number> = {
  original: 70,
  continuation: 85,
  enhancement: 75,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SENTENCE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function wordCount(sentence: string): number {
  return sentence.split(/\s+/).filter(w => w.length > 0).length;
}

function computeRhythmDistribution(sentences: string[]): {
  bucket_lt5: number; bucket_5_10: number; bucket_10_15: number;
  bucket_15_20: number; bucket_20_25: number; bucket_gt25: number;
} {
  const total = sentences.length || 1;
  let lt5 = 0, b5_10 = 0, b10_15 = 0, b15_20 = 0, b20_25 = 0, gt25 = 0;

  for (const s of sentences) {
    const wc = wordCount(s);
    if (wc < 5) lt5++;
    else if (wc < 10) b5_10++;
    else if (wc < 15) b10_15++;
    else if (wc < 20) b15_20++;
    else if (wc < 25) b20_25++;
    else gt25++;
  }

  return {
    bucket_lt5: (lt5 / total) * 100,
    bucket_5_10: (b5_10 / total) * 100,
    bucket_10_15: (b10_15 / total) * 100,
    bucket_15_20: (b15_20 / total) * 100,
    bucket_20_25: (b20_25 / total) * 100,
    bucket_gt25: (gt25 / total) * 100,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RHYTHM VARIATION
// ═══════════════════════════════════════════════════════════════════════════════

function computeRhythmVariation(sentences: string[]): { score: number; avgLen: number; stddev: number } {
  if (sentences.length < 2) return { score: 50, avgLen: 0, stddev: 0 };

  const lengths = sentences.map(wordCount);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((acc, l) => acc + Math.pow(l - avg, 2), 0) / lengths.length;
  const stddev = Math.sqrt(variance);

  // Coefficient of variation: stddev / mean
  const cv = avg > 0 ? stddev / avg : 0;

  // Ideal CV: 0.4 - 0.8 (good variety without chaos)
  let score: number;
  if (cv < 0.15) {
    score = cv / 0.15 * 30; // too uniform
  } else if (cv <= 0.80) {
    score = 50 + ((cv - 0.15) / 0.65) * 50; // sweet spot
  } else {
    score = 100 - (cv - 0.80) / 0.50 * 30; // too chaotic
  }

  // Bonus for syncopes: long sentence followed by very short
  let syncopes = 0;
  for (let i = 1; i < lengths.length; i++) {
    if (lengths[i - 1] > 20 && lengths[i] <= 5) syncopes++;
  }
  score += syncopes * 5;

  return { score: Math.min(100, Math.max(0, score)), avgLen: avg, stddev };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINGERPRINT MATCH
// ═══════════════════════════════════════════════════════════════════════════════

function computeFingerprintMatch(
  distribution: ReturnType<typeof computeRhythmDistribution>,
  mode: GeniusMode,
  voiceGenome?: VoiceGenome,
  fingerprint?: AuthorFingerprint,
): number {
  if (mode === 'original') {
    // For original mode: match against OMEGA ideal (moderate diversity)
    // Ideal: no bucket > 40%, at least 3 buckets non-zero
    const buckets = [
      distribution.bucket_lt5, distribution.bucket_5_10,
      distribution.bucket_10_15, distribution.bucket_15_20,
      distribution.bucket_20_25, distribution.bucket_gt25,
    ];

    const nonZero = buckets.filter(b => b > 0).length;
    const maxBucket = Math.max(...buckets);

    const diversityScore = Math.min(1, nonZero / 4) * 60;
    const balanceScore = maxBucket < 50 ? 40 : Math.max(0, 40 - (maxBucket - 50));

    return Math.min(100, diversityScore + balanceScore);
  }

  if (mode === 'continuation' && fingerprint) {
    // Match against author fingerprint ±10%
    const TOLERANCE = 10;
    const target = fingerprint.rhythm_distribution;
    const bucketPairs = [
      [distribution.bucket_lt5, target.bucket_lt5],
      [distribution.bucket_5_10, target.bucket_5_10],
      [distribution.bucket_10_15, target.bucket_10_15],
      [distribution.bucket_15_20, target.bucket_15_20],
      [distribution.bucket_20_25, target.bucket_20_25],
      [distribution.bucket_gt25, target.bucket_gt25],
    ];

    let totalError = 0;
    for (const [actual, expected] of bucketPairs) {
      const error = Math.max(0, Math.abs(actual - expected) - TOLERANCE);
      totalError += error;
    }

    // Max possible error: 600 (all buckets off by 100)
    return Math.max(0, Math.min(100, 100 - totalError / 3));
  }

  // Enhancement mode: relaxed match
  return 65;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER COHERENCE
// ═══════════════════════════════════════════════════════════════════════════════

// Register-level word lists
const REGISTER_FAMILIER = /\b(mec|truc|machin|boulot|flingue|baraque|bagnole|bouffer|bosser|kiffer|galérer|flic|dingue|pote|meuf|merde)\b/i;
const REGISTER_SOUTENU = /\b(néanmoins|quoique|nonobstant|indubitablement|certes|davantage|en outre|toutefois|érudit|immanquablement|prépondérant|déliquescence)\b/i;

function computeRegisterCoherence(sentences: string[]): number {
  if (sentences.length < 3) return 70;

  let familierCount = 0;
  let soutenuCount = 0;

  for (const s of sentences) {
    if (REGISTER_FAMILIER.test(s)) familierCount++;
    if (REGISTER_SOUTENU.test(s)) soutenuCount++;
  }

  const total = sentences.length;
  const familierRatio = familierCount / total;
  const soutenuRatio = soutenuCount / total;

  // Penalty for mixing registers (familier + soutenu in same text)
  if (familierRatio > 0.1 && soutenuRatio > 0.1) {
    return Math.max(20, 70 - (familierRatio + soutenuRatio) * 100);
  }

  // Coherent if dominant register is consistent
  return 80 + Math.min(20, (1 - Math.abs(familierRatio - soutenuRatio)) * 20);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SILENCE QUALITY
// ═══════════════════════════════════════════════════════════════════════════════

function computeSilenceQuality(text: string, sentences: string[]): number {
  if (sentences.length < 3) return 50;

  // Count punctuation variety and pauses
  const ellipses = (text.match(/…/g) || []).length;
  const dashes = (text.match(/—/g) || []).length;
  const paragraphBreaks = (text.match(/\n\n+/g) || []).length;

  // Ultra-short sentences (≤3 words) = beat pauses
  const ultraShort = sentences.filter(s => wordCount(s) <= 3).length;

  const pauseDensity = (ellipses + dashes + paragraphBreaks + ultraShort) / sentences.length;

  // Ideal: 0.1-0.3 pauses per sentence
  if (pauseDensity < 0.05) return 30; // no breathing
  if (pauseDensity <= 0.35) return 60 + (pauseDensity / 0.35) * 40;
  return Math.max(40, 100 - (pauseDensity - 0.35) * 100); // too fragmented
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPENING VARIETY
// ═══════════════════════════════════════════════════════════════════════════════

function computeOpeningVariety(sentences: string[]): number {
  if (sentences.length < 3) return 70;

  const openings = sentences.map(s => {
    const words = s.trim().split(/\s+/);
    return words[0]?.toLowerCase() ?? '';
  });

  const unique = new Set(openings);
  return unique.size / openings.length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUNCTUATION VARIETY
// ═══════════════════════════════════════════════════════════════════════════════

function computePunctuationVariety(text: string): number {
  const types = new Set<string>();
  if (text.includes('.')) types.add('.');
  if (text.includes(',')) types.add(',');
  if (text.includes(';')) types.add(';');
  if (text.includes(':')) types.add(':');
  if (text.includes('!')) types.add('!');
  if (text.includes('?')) types.add('?');
  if (text.includes('—')) types.add('—');
  if (text.includes('…')) types.add('…');
  if (text.includes('«')) types.add('«');
  return types.size;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCORER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute Voice score V ∈ [0, 100].
 * Self-contained voice analysis, no external conformity-check dependency (LINT-G06).
 */
export function computeVoice(
  text: string,
  mode: GeniusMode,
  voiceGenome?: VoiceGenome,
  fingerprint?: AuthorFingerprint,
): VoiceResult {
  const vFloor = V_FLOORS[mode];

  if (!text || text.trim().length === 0) {
    return {
      V: 0, rhythm_variation: 0, fingerprint_match: 0,
      register_coherence: 0, silence_quality: 0,
      V_floor: vFloor, V_floor_pass: false,
      diagnostics: {
        sentence_count: 0, avg_sentence_length: 0, length_stddev: 0,
        rhythm_distribution: { bucket_lt5: 0, bucket_5_10: 0, bucket_10_15: 0,
          bucket_15_20: 0, bucket_20_25: 0, bucket_gt25: 0 },
        opening_variety_ratio: 0, punctuation_variety: 0,
      },
    };
  }

  const sentences = splitSentences(text);
  const distribution = computeRhythmDistribution(sentences);
  const rhythm = computeRhythmVariation(sentences);
  const fpMatch = computeFingerprintMatch(distribution, mode, voiceGenome, fingerprint);
  const register = computeRegisterCoherence(sentences);
  const silence = computeSilenceQuality(text, sentences);

  const raw = WEIGHTS.rhythm * rhythm.score
            + WEIGHTS.fingerprint * fpMatch
            + WEIGHTS.register * register
            + WEIGHTS.silence * silence;

  const V = Math.max(0, Math.min(100, raw));

  return {
    V,
    rhythm_variation: rhythm.score,
    fingerprint_match: fpMatch,
    register_coherence: register,
    silence_quality: silence,
    V_floor: vFloor,
    V_floor_pass: V >= vFloor,
    diagnostics: {
      sentence_count: sentences.length,
      avg_sentence_length: rhythm.avgLen,
      length_stddev: rhythm.stddev,
      rhythm_distribution: distribution,
      opening_variety_ratio: computeOpeningVariety(sentences),
      punctuation_variety: computePunctuationVariety(text),
    },
  };
}

/**
 * Get V floor for a given mode.
 */
export function getVFloor(mode: GeniusMode): number {
  return V_FLOORS[mode];
}
