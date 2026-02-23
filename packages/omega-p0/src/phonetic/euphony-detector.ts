/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — FRENCH EUPHONY DETECTOR (P3)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: phonetic/euphony-detector.ts
 * Phase: P3 (independent — no dependency on P0-P2)
 * Invariant: ART-PHON-P3
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Detects euphonic qualities and defects in French prose:
 *
 *   1. HIATUS — vowel-vowel collision between words
 *      (e.g. "il a eu" → /a.y/ = harsh hiatus)
 *      French naturally avoids hiatus via liaison and elision.
 *      Remaining hiatus = potential defect.
 *
 *   2. CONSONANT CLUSTERS — harsh consonant collisions
 *      (e.g. "avec ça" → /ksa/, "abjects spectres" → /ktssp/)
 *      Excessive clusters = cacophony.
 *
 *   3. ALLITERATION — repetition of onset consonant sounds
 *      (e.g. "pour peu que Pierre parte" → /p/ alliteration)
 *      Deliberate = stylistic. Excessive = defect.
 *
 *   4. ASSONANCE — repetition of vowel sounds
 *      (e.g. "la lame de l'âme" → /a/ assonance)
 *      Measured as vowel sound frequency deviation.
 *
 * Scoring: each defect has a weight. Combined into euphony score (0-100).
 * High score = euphonic. Low score = cacophonic.
 *
 * 100% CALC — deterministic — zero LLM.
 *
 * VALIDITY CLAIM:
 *   metric: "euphony_score_fr"
 *   originalDomain: "French phonotactics"
 *   appliedDomain: "written prose (grapheme proxy)"
 *   assumption: "grapheme sequences approximate phonetic realization"
 *   validationStatus: "UNVALIDATED"
 *   confidenceWeight: 0.6
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EuphonyAnalysis {
  /** Hiatus detections */
  readonly hiatus: readonly HiatusMatch[];
  /** Harsh consonant cluster detections */
  readonly clusters: readonly ClusterMatch[];
  /** Alliteration detections */
  readonly alliterations: readonly AlliterationMatch[];
  /** Vowel sound distribution (assonance) */
  readonly assonance: AssonanceResult;

  /** Counts */
  readonly hiatusCount: number;
  readonly clusterCount: number;
  readonly alliterationCount: number;

  /** Per-100-words densities */
  readonly hiatusDensity: number;
  readonly clusterDensity: number;

  /** Composite euphony score (0-100): 100=perfectly euphonic */
  readonly euphonyScore: number;
  /** Word count */
  readonly wordCount: number;
}

export interface HiatusMatch {
  /** Word ending with vowel */
  readonly word1: string;
  /** Word starting with vowel */
  readonly word2: string;
  /** The vowel collision (e.g. "a-e") */
  readonly collision: string;
  /** Severity: HARSH (same vowel or open+open), MILD (different vowels) */
  readonly severity: 'HARSH' | 'MILD';
  /** Position (word index of word1) */
  readonly position: number;
}

export interface ClusterMatch {
  /** The consonant cluster found */
  readonly cluster: string;
  /** Number of consecutive consonants */
  readonly length: number;
  /** The two words involved */
  readonly context: string;
  /** Position (word index) */
  readonly position: number;
}

export interface AlliterationMatch {
  /** The repeated onset sound */
  readonly sound: string;
  /** Words involved */
  readonly words: readonly string[];
  /** Repetition count */
  readonly count: number;
  /** Position (word index of first word) */
  readonly position: number;
}

export interface AssonanceResult {
  /** Distribution of main vowel sounds (normalized 0-1) */
  readonly distribution: Readonly<Record<string, number>>;
  /** Dominant vowel sound */
  readonly dominant: string;
  /** Dominance ratio (0-1): how much the dominant vowel exceeds uniform */
  readonly dominanceRatio: number;
  /** Gini of vowel distribution (0=uniform, 1=one vowel only) */
  readonly gini: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHONETIC HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const VOWELS = new Set('aeiouyàâäéèêëïîôùûüÿœæ'.split(''));

/** French vowel sound classes (grapheme → sound class) */
const VOWEL_SOUND_MAP: ReadonlyMap<string, string> = new Map([
  // Open A
  ['a', 'A'], ['à', 'A'], ['â', 'A'],
  // E sounds
  ['e', 'E'], ['é', 'E'], ['è', 'E'], ['ê', 'E'], ['ë', 'E'],
  // I sounds
  ['i', 'I'], ['î', 'I'], ['ï', 'I'], ['y', 'I'],
  // O sounds
  ['o', 'O'], ['ô', 'O'],
  // U sounds
  ['u', 'U'], ['ù', 'U'], ['û', 'U'], ['ü', 'U'],
  // Ligatures
  ['œ', 'EU'], ['æ', 'A'],
]);

const CONSONANTS = new Set('bcdfghjklmnpqrstvwxzçñ'.split(''));

/**
 * Get the final phonetic vowel of a word (for hiatus detection).
 * Handles silent-e: "porte" → final sound is NOT 'e'.
 * Returns null if word ends on consonant sound.
 */
function getFinalVowelSound(word: string): string | null {
  const lower = word.toLowerCase();
  if (lower.length === 0) return null;

  // Words ending in silent patterns — check from end
  const last = lower[lower.length - 1];
  const lastTwo = lower.slice(-2);
  const lastThree = lower.slice(-3);

  // Silent -ent (3rd person plural)
  if (lastThree === 'ent' && lower.length > 3) return null;
  // Silent -es
  if (lastTwo === 'es' && lower.length > 2) return null;
  // Silent -e (but not -é, -è, etc.)
  if (last === 'e' && lower.length > 1) return null;
  // Silent -s after vowel
  if (last === 's' && lower.length > 1 && VOWELS.has(lower[lower.length - 2])) {
    return VOWEL_SOUND_MAP.get(lower[lower.length - 2]) ?? null;
  }

  // Check for trailing vowel
  if (VOWELS.has(last)) {
    return VOWEL_SOUND_MAP.get(last) ?? null;
  }

  return null; // Ends on consonant
}

/**
 * Get the initial phonetic vowel of a word (for hiatus detection).
 * Returns null if word starts with consonant or h-aspiré.
 */
// Common h-aspiré words (not exhaustive — extended set)
const H_ASPIRE = new Set([
  'hache', 'haine', 'halte', 'hamac', 'hameau', 'hanche', 'handicap',
  'hangar', 'hanter', 'harangue', 'harasser', 'harceler', 'hardi',
  'harem', 'hareng', 'haricot', 'harnais', 'harpe', 'hasard', 'hâte',
  'hausse', 'haut', 'haute', 'hauteur', 'hélas', 'hennir', 'hérisser',
  'héron', 'héros', 'hêtre', 'heurter', 'hibou', 'hideux', 'hiérarchie',
  'hisser', 'hobby', 'hocher', 'hockey', 'hollande', 'homard', 'hongre',
  'honte', 'hoquet', 'horde', 'hors', 'hotte', 'houblon', 'houille',
  'houle', 'housse', 'huard', 'hublot', 'huche', 'huer', 'huit',
  'huitième', 'hurler', 'hussard', 'hutte',
]);

function getInitialVowelSound(word: string): string | null {
  const lower = word.toLowerCase();
  if (lower.length === 0) return null;

  const first = lower[0];

  // H: check if h-aspiré (blocks liaison/elision → no hiatus)
  if (first === 'h') {
    // h-aspiré = word starts with consonant-like h → no hiatus
    if (H_ASPIRE.has(lower) || H_ASPIRE.has(lower.replace(/s$/, ''))) {
      return null;
    }
    // h-muet → treat as vowel-initial
    if (lower.length > 1 && VOWELS.has(lower[1])) {
      return VOWEL_SOUND_MAP.get(lower[1]) ?? null;
    }
    return null;
  }

  if (VOWELS.has(first)) {
    return VOWEL_SOUND_MAP.get(first) ?? null;
  }

  return null; // Starts with consonant
}

/**
 * Get final consonant(s) of a word (for cluster detection).
 */
function getFinalConsonants(word: string): string {
  const lower = word.toLowerCase();
  let result = '';
  for (let i = lower.length - 1; i >= 0; i--) {
    if (CONSONANTS.has(lower[i])) {
      result = lower[i] + result;
    } else {
      break;
    }
  }
  return result;
}

/**
 * Get initial consonant(s) of a word (for cluster + alliteration detection).
 */
function getInitialConsonants(word: string): string {
  const lower = word.toLowerCase();
  let result = '';
  for (let i = 0; i < lower.length; i++) {
    if (CONSONANTS.has(lower[i])) {
      result += lower[i];
    } else {
      break;
    }
  }
  return result;
}

/**
 * Get onset sound class for alliteration (first consonant or consonant cluster).
 */
function getOnsetSound(word: string): string | null {
  const onset = getInitialConsonants(word.toLowerCase());
  if (onset.length === 0) return null;
  // Normalize: 'ph' → 'f', 'ch' → 'ch', etc.
  if (onset.startsWith('ph')) return 'f';
  if (onset.startsWith('ch')) return 'ch';
  if (onset.startsWith('qu')) return 'k';
  if (onset.startsWith('gu')) return 'g';
  // Return first consonant as sound class
  return onset[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKENIZER
// ═══════════════════════════════════════════════════════════════════════════════

interface WordToken {
  readonly word: string;
  readonly lower: string;
  readonly index: number;
}

function tokenize(text: string): readonly WordToken[] {
  const tokens: WordToken[] = [];
  const regex = /[a-zA-ZàâäéèêëïîôùûüÿœæçñÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇÑ][a-zA-ZàâäéèêëïîôùûüÿœæçñÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇÑ'''\-]*/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    tokens.push({ word: match[0], lower: match[0].toLowerCase(), index: idx++ });
  }

  return tokens;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect hiatus between consecutive words.
 */
function detectHiatus(words: readonly WordToken[]): readonly HiatusMatch[] {
  const matches: HiatusMatch[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    const finalV = getFinalVowelSound(words[i].lower);
    const initialV = getInitialVowelSound(words[i + 1].lower);

    if (finalV !== null && initialV !== null) {
      // Hiatus detected
      const severity = finalV === initialV ? 'HARSH' : 'MILD';
      matches.push({
        word1: words[i].word,
        word2: words[i + 1].word,
        collision: `${finalV}-${initialV}`,
        severity,
        position: i,
      });
    }
  }

  return matches;
}

/**
 * Detect harsh consonant clusters at word boundaries.
 * A cluster is "harsh" if the combined consonant count ≥ 4.
 */
function detectClusters(words: readonly WordToken[]): readonly ClusterMatch[] {
  const matches: ClusterMatch[] = [];
  const HARSH_THRESHOLD = 4;

  for (let i = 0; i < words.length - 1; i++) {
    const finalC = getFinalConsonants(words[i].lower);
    const initialC = getInitialConsonants(words[i + 1].lower);

    if (finalC.length + initialC.length >= HARSH_THRESHOLD) {
      const cluster = finalC + initialC;
      matches.push({
        cluster,
        length: cluster.length,
        context: `${words[i].word} ${words[i + 1].word}`,
        position: i,
      });
    }
  }

  return matches;
}

/**
 * Detect alliteration: same onset sound in 3+ words within a sliding window.
 */
function detectAlliteration(
  words: readonly WordToken[],
  windowSize: number = 5,
  minRepeat: number = 3,
): readonly AlliterationMatch[] {
  const matches: AlliterationMatch[] = [];
  const reportedPositions = new Set<string>();

  for (let i = 0; i <= words.length - windowSize; i++) {
    const window = words.slice(i, i + windowSize);
    const onsets = window.map(w => ({ word: w.word, sound: getOnsetSound(w.lower) }));

    // Count by onset sound
    const counts = new Map<string, { words: string[]; firstIdx: number }>();
    for (let j = 0; j < onsets.length; j++) {
      const s = onsets[j].sound;
      if (s === null) continue;
      if (!counts.has(s)) {
        counts.set(s, { words: [], firstIdx: i + j });
      }
      counts.get(s)!.words.push(onsets[j].word);
    }

    for (const [sound, data] of counts) {
      if (data.words.length >= minRepeat) {
        const key = `${sound}-${data.firstIdx}`;
        if (!reportedPositions.has(key)) {
          reportedPositions.add(key);
          matches.push({
            sound,
            words: data.words,
            count: data.words.length,
            position: data.firstIdx,
          });
        }
      }
    }
  }

  return matches;
}

/**
 * Analyze vowel sound distribution (assonance).
 */
function analyzeAssonance(words: readonly WordToken[]): AssonanceResult {
  const soundCounts = new Map<string, number>();
  let totalVowels = 0;

  for (const w of words) {
    for (const char of w.lower) {
      const sound = VOWEL_SOUND_MAP.get(char);
      if (sound) {
        soundCounts.set(sound, (soundCounts.get(sound) ?? 0) + 1);
        totalVowels++;
      }
    }
  }

  if (totalVowels === 0) {
    return {
      distribution: {},
      dominant: '',
      dominanceRatio: 0,
      gini: 0,
    };
  }

  // Normalize to distribution
  const distribution: Record<string, number> = {};
  let maxCount = 0;
  let dominant = '';

  for (const [sound, count] of soundCounts) {
    distribution[sound] = count / totalVowels;
    if (count > maxCount) {
      maxCount = count;
      dominant = sound;
    }
  }

  // Dominance ratio: how much the dominant exceeds uniform
  const numSounds = soundCounts.size;
  const uniform = numSounds > 0 ? 1 / numSounds : 0;
  const dominanceRatio = numSounds > 0
    ? Math.max(0, (maxCount / totalVowels - uniform) / (1 - uniform))
    : 0;

  // Gini coefficient of vowel distribution
  const values = [...soundCounts.values()];
  const n = values.length;
  let gini = 0;
  if (n >= 2) {
    const mean = values.reduce((a, b) => a + b, 0) / n;
    if (mean > 0) {
      let sumAbsDiff = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          sumAbsDiff += Math.abs(values[i] - values[j]);
        }
      }
      gini = sumAbsDiff / (2 * n * n * mean);
    }
  }

  return { distribution, dominant, dominanceRatio, gini };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute euphony score (0-100).
 *
 * Deductions from 100:
 *   - HARSH hiatus: -3 per occurrence
 *   - MILD hiatus: -1 per occurrence
 *   - Consonant cluster: -2 per occurrence
 *   - Alliteration (unintentional): -1 per occurrence
 *   - Assonance dominance > 0.4: -5
 *
 * All deductions are density-normalized (per 100 words).
 * Score is PRELIMINARY — weights are SYMBOLS for calibration.
 */
function computeEuphonyScore(
  hiatusMatches: readonly HiatusMatch[],
  clusterMatches: readonly ClusterMatch[],
  alliterationMatches: readonly AlliterationMatch[],
  assonance: AssonanceResult,
  wordCount: number,
): number {
  if (wordCount === 0) return 100;

  const scale = 100 / Math.max(wordCount, 1);

  // Hiatus penalty
  const harshHiatus = hiatusMatches.filter(h => h.severity === 'HARSH').length;
  const mildHiatus = hiatusMatches.filter(h => h.severity === 'MILD').length;
  const hiatusPenalty = (harshHiatus * 3 + mildHiatus * 1) * scale;

  // Cluster penalty
  const clusterPenalty = clusterMatches.length * 2 * scale;

  // Alliteration penalty
  const allitPenalty = alliterationMatches.length * 1 * scale;

  // Assonance penalty (only if highly dominant)
  const assonancePenalty = assonance.dominanceRatio > 0.4 ? 5 : 0;

  const totalPenalty = hiatusPenalty + clusterPenalty + allitPenalty + assonancePenalty;

  return Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze euphony of French prose.
 *
 * @param text - French prose to analyze
 * @returns EuphonyAnalysis
 */
export function analyzeEuphony(text: string): EuphonyAnalysis {
  if (!text || text.trim().length === 0) {
    return {
      hiatus: [],
      clusters: [],
      alliterations: [],
      assonance: { distribution: {}, dominant: '', dominanceRatio: 0, gini: 0 },
      hiatusCount: 0,
      clusterCount: 0,
      alliterationCount: 0,
      hiatusDensity: 0,
      clusterDensity: 0,
      euphonyScore: 100,
      wordCount: 0,
    };
  }

  const words = tokenize(text);
  const wordCount = words.length;

  const hiatus = detectHiatus(words);
  const clusters = detectClusters(words);
  const alliterations = detectAlliteration(words);
  const assonance = analyzeAssonance(words);

  const euphonyScore = computeEuphonyScore(
    hiatus, clusters, alliterations, assonance, wordCount,
  );

  return {
    hiatus,
    clusters,
    alliterations,
    assonance,
    hiatusCount: hiatus.length,
    clusterCount: clusters.length,
    alliterationCount: alliterations.length,
    hiatusDensity: wordCount > 0 ? (hiatus.length / wordCount) * 100 : 0,
    clusterDensity: wordCount > 0 ? (clusters.length / wordCount) * 100 : 0,
    euphonyScore,
    wordCount,
  };
}
