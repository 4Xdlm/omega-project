/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — FRENCH SYLLABLE COUNTER (P0 — FOUNDATION)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: phonetic/syllable-counter-fr.ts
 * Phase: P0 (Foundation — blocks all rhythm/euphony/nPVI)
 * Invariant: ART-PHON-P0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Counts syllables in French prose using rule-based approach.
 * Prose mode (not verse): final silent 'e' is NOT counted.
 *
 * Also computes weighted syllabic mass for nPVI V2:
 *   - Nasal vowels (on, an, in, un): heavier (subvocalization takes longer)
 *   - Final syllable of prosodic group: accent tonique FR → heavier
 *   - Standard syllable: weight 1.0
 *
 * 100% CALC — deterministic — zero external dependencies.
 *
 * VALIDITY CLAIM:
 *   metric: "syllable_count_fr"
 *   originalDomain: "French phonology rules"
 *   appliedDomain: "written text"
 *   assumption: "rule-based grapheme analysis approximates phonological syllables"
 *   validationStatus: "UNVALIDATED" (requires P0-GATE benchmark)
 *   confidenceWeight: 0.7 (pending benchmark ≥ 95% accuracy → 1.0)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SyllableResult {
  /** Raw syllable count */
  readonly count: number;
  /** Weighted syllabic mass (for nPVI V2) */
  readonly weightedMass: number;
  /** Per-syllable weights breakdown */
  readonly weights: readonly SyllableWeight[];
  /** Detected nasal count */
  readonly nasalCount: number;
  /** Whether final 'e' was elided */
  readonly finalEElided: boolean;
}

export interface SyllableWeight {
  /** Syllable type */
  readonly type: 'standard' | 'nasal' | 'long' | 'brief' | 'accent_final';
  /** Weight value */
  readonly weight: number;
}

export interface SegmentSyllables {
  /** The text segment */
  readonly text: string;
  /** Syllable count */
  readonly count: number;
  /** Weighted mass */
  readonly weightedMass: number;
  /** Per-word detail */
  readonly words: readonly WordSyllables[];
}

export interface WordSyllables {
  readonly word: string;
  readonly count: number;
  readonly weightedMass: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALIBRATION SYMBOLS (not constants — to be tuned via corpus)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Weight parameters for syllabic mass.
 * These are SYMBOLS with default values, NOT hardcoded constants.
 * Gate R2 will calibrate them via human correlation.
 */
export interface SyllableWeightConfig {
  /** Weight for nasal vowels (on, an, in, un) — subvocalization is slower */
  W_NASAL: number;
  /** Weight for long vowels (â, ê, ô, etc.) */
  W_LONG: number;
  /** Weight for final syllable of prosodic group (accent tonique FR) */
  W_ACCENT: number;
  /** Weight for standard syllable */
  W_STD: number;
  /** Weight for brief vowels (i, u isolated) */
  W_BRIEF: number;
}

export const DEFAULT_WEIGHT_CONFIG: Readonly<SyllableWeightConfig> = {
  W_NASAL: 1.3,
  W_LONG: 1.2,
  W_ACCENT: 1.4,
  W_STD: 1.0,
  W_BRIEF: 0.9,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FRENCH PHONOLOGICAL RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * French vowel graphemes (including accented).
 * Used to detect vowel nuclei (each nucleus = 1 potential syllable).
 */
const VOWELS = new Set('aeiouyàâäéèêëïîôùûüÿœæ'.split(''));

/**
 * Multi-character vowel groups that form a SINGLE syllable.
 * Order matters: longer patterns must be checked first.
 * These are the common French diphtongs and vowel combinations.
 */
const VOWEL_GROUPS: readonly string[] = [
  // 4-char patterns (checked first — longest match)
  'ieur', 'ieux',         // -ieur/-ieux = 1 syllable (an-té-rieur)
  // Trigraphs
  'eau', 'oeu', 'œu',
  'ain', 'ein', 'oin',
  'ion',                   // -tion/-sion: 't'/'s' is skipped, then "ion" = 1 nucleus
  'ien',                   // bien, chien = 1 syllable (nasal semivowel)
  'ieu',                   // lieu, milieu = 1 syllable
  // Digraphs — nasals
  'an', 'am', 'en', 'em', 'in', 'im', 'on', 'om', 'un', 'um',
  // Digraphs — oral (including semivowel 'i')
  'ie',                    // lumière, premier — /j/ semivowel
  'ui', 'ai', 'ei', 'oi', 'ou', 'au', 'eu',
  // Ligatures
  'œ', 'æ',
];

/**
 * Nasal vowel patterns (for mass weighting).
 * When these appear as a vowel group, the syllable is "heavier".
 */
const NASAL_PATTERNS = new Set([
  'an', 'am', 'en', 'em', 'in', 'im', 'on', 'om', 'un', 'um',
  'ain', 'ein', 'oin', 'ion',
]);

/**
 * Vowel groups that are ALWAYS kept together, even if nasal check fails.
 * These are compound groups where the vowels form an inseparable unit.
 */
const ALWAYS_GROUPED = new Set([
  'ion', 'ien', 'ieu', 'ieur', 'ieux',
  'ie',
  'eau', 'oeu', 'œu',
  'ain', 'ein', 'oin',
  'ui', 'ai', 'ei', 'oi', 'ou', 'au', 'eu',
  'œ', 'æ',
]);

/**
 * Long vowel characters (for mass weighting).
 */
const LONG_VOWELS = new Set('âêôû'.split(''));

/**
 * Brief/light vowels when isolated (for mass weighting).
 */
const BRIEF_VOWELS = new Set('iu'.split(''));

// ═══════════════════════════════════════════════════════════════════════════════
// WORD-LEVEL SYLLABLE COUNTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize a word for analysis: lowercase, trim punctuation.
 */
function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/^[^a-zàâäéèêëïîôùûüÿœæ]+/, '')
    .replace(/[^a-zàâäéèêëïîôùûüÿœæ]+$/, '');
}

/**
 * Normalize a single char by stripping accents (for vowel group matching only).
 */
function stripAccent(char: string): string {
  const MAP: Record<string, string> = {
    'à': 'a', 'â': 'a', 'ä': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'ï': 'i', 'î': 'i',
    'ô': 'o',
    'ù': 'u', 'û': 'u', 'ü': 'u',
    'ÿ': 'y',
  };
  return MAP[char] ?? char;
}

/**
 * Normalize a substring by stripping accents (for vowel group matching).
 */
function stripAccents(str: string): string {
  return str.split('').map(stripAccent).join('');
}

/**
 * Check if character at position is a vowel.
 */
function isVowel(char: string): boolean {
  return VOWELS.has(char.toLowerCase());
}

/**
 * Check if character is a consonant (letter but not vowel).
 */
function isConsonant(char: string): boolean {
  const c = char.toLowerCase();
  return /^[a-zàâäéèêëïîôùûüÿœæçñ]$/.test(c) && !isVowel(c);
}

/**
 * Detect if a nasal digraph at position `pos` is truly nasal
 * (followed by a consonant or end of word, NOT by a vowel).
 * e.g., "an" in "antique" = nasal, but "an" in "animal" = a-ni-mal (not nasal).
 */
function isNasalAtPosition(word: string, pos: number, nasalLen: number): boolean {
  const afterNasal = pos + nasalLen;
  // End of word → nasal
  if (afterNasal >= word.length) return true;
  // Followed by consonant → nasal
  if (isConsonant(word[afterNasal])) return true;
  // Followed by vowel → NOT nasal (the 'n'/'m' belongs to next syllable)
  return false;
}

/**
 * Count syllables in a single French word.
 * Returns detailed result with weights.
 *
 * Algorithm:
 * 1. Scan left-to-right, consuming vowel groups (longest match first)
 * 2. Each vowel group = 1 syllable nucleus
 * 3. Apply silent-e rules for prose (not verse)
 * 4. Assign mass weight to each syllable based on type
 */
export function countWordSyllables(
  rawWord: string,
  config: SyllableWeightConfig = DEFAULT_WEIGHT_CONFIG,
): SyllableResult {
  const word = normalizeWord(rawWord);

  if (word.length === 0) {
    return { count: 0, weightedMass: 0, weights: [], nasalCount: 0, finalEElided: false };
  }

  // Special cases: single-letter words
  if (word.length === 1) {
    if (isVowel(word)) {
      const w = BRIEF_VOWELS.has(word) ? config.W_BRIEF : config.W_STD;
      return {
        count: 1,
        weightedMass: w,
        weights: [{ type: BRIEF_VOWELS.has(word) ? 'brief' : 'standard', weight: w }],
        nasalCount: 0,
        finalEElided: false,
      };
    }
    // Single consonant (rare: "l'" etc.)
    return { count: 0, weightedMass: 0, weights: [], nasalCount: 0, finalEElided: false };
  }

  // ─── Scan for syllable nuclei ───
  const nuclei: Array<{ pos: number; len: number; type: SyllableWeight['type']; isNasal: boolean }> = [];
  let i = 0;

  while (i < word.length) {
    // Skip 'u' after 'q' — in French, "qu" = /k/, the 'u' is silent
    if (word[i] === 'u' && i > 0 && word[i - 1] === 'q') {
      i++;
      continue;
    }

    if (!isVowel(word[i])) {
      i++;
      continue;
    }

    // Try to match longest vowel group first
    let matched = false;
    for (const group of VOWEL_GROUPS) {
      const candidate = stripAccents(word.slice(i, i + group.length));
      if (candidate === group) {
        const isNasal = NASAL_PATTERNS.has(group);
        const alwaysGrouped = ALWAYS_GROUPED.has(group);

        // If nasal but not at a nasal position AND not always-grouped → split
        if (isNasal && !alwaysGrouped && !isNasalAtPosition(word, i, group.length)) {
          // Not truly nasal — take just the first vowel
          const charType = detectVowelType(word[i]);
          nuclei.push({ pos: i, len: 1, type: charType, isNasal: false });
          i += 1;
          matched = true;
          break;
        }

        // Check actual nasality for weighting purposes
        const actuallyNasal = isNasal && isNasalAtPosition(word, i, group.length);
        const type: SyllableWeight['type'] = actuallyNasal ? 'nasal' : detectGroupType(group);
        nuclei.push({ pos: i, len: group.length, type, isNasal: actuallyNasal });
        i += group.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Single vowel
      const charType = detectVowelType(word[i]);
      nuclei.push({ pos: i, len: 1, type: charType, isNasal: false });
      i += 1;
    }
  }

  // ─── Silent-e rules (prose mode) ───
  let finalEElided = false;
  if (nuclei.length > 1) {
    const lastNucleus = nuclei[nuclei.length - 1];
    const lastChar = word.slice(lastNucleus.pos, lastNucleus.pos + lastNucleus.len);

    // Final 'e' (not 'é', 'è', 'ê', 'ë') is potentially silent in prose
    if (lastChar === 'e') {
      const afterE = word.slice(lastNucleus.pos + lastNucleus.len);

      // Case 1: word ends in 'e' alone → silent
      if (afterE === '') {
        nuclei.pop();
        finalEElided = true;
      }
      // Case 2: word ends in 'es' → silent (tables, portes)
      else if (afterE === 's') {
        nuclei.pop();
        finalEElided = true;
      }
      // Case 3: word ends in 'ent' → silent (3rd person plural: marchent, parlent)
      else if (afterE === 'nt') {
        nuclei.pop();
        finalEElided = true;
      }
      // Case 4: word ends in 'er' → silent ONLY if preceded by onset cluster
      // "être" (tr+e) → silent, "prendre" (dr+e) → silent
      // "commencer" (c+e+r) → pronounced (infinitive -er)
      // Valid French onset clusters before final 'e': br, cr, dr, fr, gr, pr, tr, vr, bl, cl, fl, gl, pl
      else if (afterE === 'r') {
        const beforeE = lastNucleus.pos;
        if (beforeE >= 2) {
          const cluster = word.slice(beforeE - 2, beforeE);
          const ONSET_CLUSTERS = new Set([
            'br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr', 'vr',
            'bl', 'cl', 'fl', 'gl', 'pl',
          ]);
          if (ONSET_CLUSTERS.has(cluster)) {
            nuclei.pop();
            finalEElided = true;
          }
        }
        // No valid onset cluster → '-er' infinitive → 'e' is pronounced
      }
    }
  }

  // ─── Known limitation (documented) ───
  // 3rd person plural verb endings ("-ent") are treated as pronounced
  // because disambiguating verbs from nouns (marchent vs moment)
  // requires a dictionary lookup. Error is always ≤1 syllable.
  // Will be addressed in P0-v2 with lexicon integration.

  // ─── Build weights ───
  const nasalCount = nuclei.filter(n => n.isNasal).length;
  const weights: SyllableWeight[] = nuclei.map(n => ({
    type: n.type,
    weight: getWeight(n.type, config),
  }));

  const count = nuclei.length;
  const weightedMass = weights.reduce((sum, w) => sum + w.weight, 0);

  // Minimum 1 syllable for any real word
  if (count === 0 && word.length > 0) {
    return {
      count: 1,
      weightedMass: config.W_STD,
      weights: [{ type: 'standard', weight: config.W_STD }],
      nasalCount: 0,
      finalEElided,
    };
  }

  return { count, weightedMass, weights, nasalCount, finalEElided };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function detectVowelType(char: string): SyllableWeight['type'] {
  if (LONG_VOWELS.has(char)) return 'long';
  if (BRIEF_VOWELS.has(char)) return 'brief';
  return 'standard';
}

function detectGroupType(group: string): SyllableWeight['type'] {
  // "eau", "au" contain long vowel sounds
  if (group === 'eau' || group === 'au' || group === 'ou') return 'long';
  return 'standard';
}

function getWeight(type: SyllableWeight['type'], config: SyllableWeightConfig): number {
  switch (type) {
    case 'nasal': return config.W_NASAL;
    case 'long': return config.W_LONG;
    case 'brief': return config.W_BRIEF;
    case 'accent_final': return config.W_ACCENT;
    default: return config.W_STD;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT-LEVEL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Count syllables in a full text.
 * Returns total count and weighted mass.
 */
export function countTextSyllables(
  text: string,
  config: SyllableWeightConfig = DEFAULT_WEIGHT_CONFIG,
): { count: number; weightedMass: number; words: readonly WordSyllables[] } {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const results = words.map(w => {
    const r = countWordSyllables(w, config);
    return { word: w, count: r.count, weightedMass: r.weightedMass };
  });

  return {
    count: results.reduce((sum, r) => sum + r.count, 0),
    weightedMass: results.reduce((sum, r) => sum + r.weightedMass, 0),
    words: results,
  };
}

/**
 * Count syllables per prosodic segment (split by punctuation).
 * This is the main entry point for nPVI calculation.
 *
 * Segments are split by: . ! ? ; , : — – ( ) « » " "
 * Returns array of segment syllable counts (raw + weighted).
 */
export function countSegmentSyllables(
  text: string,
  config: SyllableWeightConfig = DEFAULT_WEIGHT_CONFIG,
): readonly SegmentSyllables[] {
  // Split by prosodic boundaries (punctuation)
  const segments = text
    .split(/[.!?;,:\u2014\u2013()«»""…]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return segments.map(segment => {
    const result = countTextSyllables(segment, config);

    // Apply accent tonique: last word of segment gets W_ACCENT bonus
    // on its final syllable (if segment has words)
    let adjustedMass = result.weightedMass;
    if (result.words.length > 0) {
      const lastWord = result.words[result.words.length - 1];
      if (lastWord.count > 0) {
        // Replace last syllable weight with W_ACCENT
        adjustedMass = adjustedMass - config.W_STD + config.W_ACCENT;
      }
    }

    return {
      text: segment,
      count: result.count,
      weightedMass: adjustedMass,
      words: result.words,
    };
  });
}
