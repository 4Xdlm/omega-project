/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — FRENCH PROSODIC SEGMENTER (P1)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: phonetic/prosodic-segmenter.ts
 * Phase: P1 (depends on P0 syllable-counter-fr)
 * Invariant: ART-PHON-P1
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Splits French prose into prosodic segments for nPVI calculation.
 * Three levels of segmentation:
 *
 *   Level 1 — Punctuation: . ! ? ; , : — – ( ) « » " " …
 *   Level 2 — Subordination: que, qui, dont, où, lorsque, quand,
 *             tandis que, alors que, puisque, parce que, bien que,
 *             afin que, pour que, si, comme, car
 *   Level 2.5 — Coordination (conditional): mais, or, et, ni, donc
 *             ONLY when preceding segment > 5 syllables
 *
 * Each segment gets syllable count + weighted mass from P0.
 * 100% CALC — deterministic — depends only on P0.
 *
 * VALIDITY CLAIM:
 *   metric: "prosodic_segmentation_fr"
 *   originalDomain: "French prosodic phonology"
 *   appliedDomain: "written text syntactic proxy"
 *   assumption: "punctuation + subordination conjunctions approximate prosodic boundaries"
 *   validationStatus: "UNVALIDATED"
 *   confidenceWeight: 0.7
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  countTextSyllables,
  type SyllableWeightConfig,
  type WordSyllables,
  DEFAULT_WEIGHT_CONFIG,
} from './syllable-counter-fr.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProsodicSegment {
  /** Raw text of the segment */
  readonly text: string;
  /** Syllable count (from P0) */
  readonly syllables: number;
  /** Weighted syllabic mass (from P0) */
  readonly weightedMass: number;
  /** What caused this boundary */
  readonly boundary: BoundaryType;
  /** Per-word breakdown */
  readonly words: readonly WordSyllables[];
  /** Segment index in text (0-based) */
  readonly index: number;
}

export type BoundaryType =
  | 'punctuation'       // Level 1: , ; : . ! ? — etc.
  | 'subordination'     // Level 2: que, lorsque, etc.
  | 'coordination'      // Level 2.5: mais, or (only if prev > 5 syl)
  | 'start';            // First segment

export interface SegmentationResult {
  /** All prosodic segments */
  readonly segments: readonly ProsodicSegment[];
  /** Total syllable count */
  readonly totalSyllables: number;
  /** Total weighted mass */
  readonly totalWeightedMass: number;
  /** Segment count */
  readonly segmentCount: number;
  /** Mean syllables per segment */
  readonly meanSyllablesPerSegment: number;
  /** Syllable counts array (direct input for nPVI) */
  readonly syllableSeries: readonly number[];
  /** Weighted mass array (direct input for nPVI V2) */
  readonly weightedSeries: readonly number[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNDARY PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Level 1: Punctuation boundaries.
 * These always create a segment break.
 */
const PUNCTUATION_REGEX = /[.!?;,:\u2014\u2013()\u00AB\u00BB\u201C\u201D\u201E\u201F…]+/;

/**
 * Level 2: Subordination conjunctions.
 * These create a segment break wherever they appear.
 * Multi-word patterns checked first (longest match).
 */
const SUBORDINATION_MULTI: readonly string[] = [
  'tandis que',
  'alors que',
  'parce que',
  'bien que',
  'afin que',
  'pour que',
  'avant que',
  'après que',
  'depuis que',
  'sans que',
  'jusqu\'à ce que',
  'à moins que',
  'de sorte que',
];

const SUBORDINATION_SINGLE: ReadonlySet<string> = new Set([
  'que', 'qui', 'dont', 'où',
  'lorsque', 'lorsqu\'',
  'quand', 'puisque', 'puisqu\'',
  'comme', 'si',
  'car',
]);

/**
 * Level 2.5: Coordination conjunctions.
 * Only split if preceding segment has > MIN_COORD_SYLLABLES syllables.
 */
const COORDINATION: ReadonlySet<string> = new Set([
  'mais', 'or', 'et', 'ni', 'donc',
]);

const MIN_COORD_SYLLABLES = 5;

/**
 * Level 2: Subordination minimum syllable threshold.
 * If the segment BEFORE a subordination conjunction has fewer syllables
 * than this threshold, the split is cancelled and segments are merged.
 * This prevents micro-segments like "La femme | qui marchait" (2 syll | 4 syll).
 *
 * Value: 4 (empirical — a prosodic group under 4 syllables is too short
 * to constitute an independent breathing unit in French).
 *
 * CALIBRATION NOTE: This is a symbol constant pending corpus validation.
 * Should be extracted to CalibrationProfile when calibration corpus available.
 */
const MIN_SUBORDINATION_SYLLABLES = 4;

// ═══════════════════════════════════════════════════════════════════════════════
// TOKENIZER
// ═══════════════════════════════════════════════════════════════════════════════

interface Token {
  readonly type: 'word' | 'punctuation';
  readonly value: string;
  /** Original position in text */
  readonly pos: number;
}

/**
 * Tokenize text into words and punctuation.
 * Handles punctuation both standalone and attached to words.
 */
function tokenize(text: string): readonly Token[] {
  const tokens: Token[] = [];
  // Match: punctuation cluster OR word (letters/apostrophes/hyphens)
  const regex = /([.!?;,:\u2014\u2013()\u00AB\u00BB\u201C\u201D\u201E\u201F\u2026.]{1,})|([a-zA-ZàâäéèêëïîôùûüÿœæçñÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇÑ][a-zA-ZàâäéèêëïîôùûüÿœæçñÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇÑ'''\-]*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      tokens.push({ type: 'punctuation', value: match[1], pos: match.index });
    } else if (match[2]) {
      tokens.push({ type: 'word', value: match[2], pos: match.index });
    }
  }

  return tokens;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a word token matches a subordination conjunction.
 * Returns the conjunction length in tokens (1 for single, 2+ for multi-word).
 */
function matchSubordination(
  tokens: readonly Token[],
  startIdx: number,
): { matched: boolean; tokenCount: number } {
  // Try multi-word patterns first (longest match)
  for (const pattern of SUBORDINATION_MULTI) {
    const patternWords = pattern.split(/\s+/);
    let allMatch = true;
    let tIdx = startIdx;

    for (const pw of patternWords) {
      // Skip punctuation tokens
      while (tIdx < tokens.length && tokens[tIdx].type === 'punctuation') tIdx++;
      if (tIdx >= tokens.length || tokens[tIdx].type !== 'word') {
        allMatch = false;
        break;
      }
      if (tokens[tIdx].value.toLowerCase().replace(/['']/g, "'") !== pw) {
        allMatch = false;
        break;
      }
      tIdx++;
    }

    if (allMatch) {
      return { matched: true, tokenCount: tIdx - startIdx };
    }
  }

  // Try single-word patterns
  const token = tokens[startIdx];
  if (token.type !== 'word') return { matched: false, tokenCount: 0 };

  const lower = token.value.toLowerCase().replace(/['']/g, "'");
  // Strip trailing punctuation for matching
  const clean = lower.replace(/[,;:.!?]+$/, '');

  if (SUBORDINATION_SINGLE.has(clean)) {
    return { matched: true, tokenCount: 1 };
  }

  // Handle elided forms: qu', lorsqu', puisqu'
  if (clean === "qu'" || clean.startsWith("qu'")) {
    return { matched: true, tokenCount: 1 };
  }

  return { matched: false, tokenCount: 0 };
}

/**
 * Check if a word token is a coordination conjunction.
 */
function isCoordination(token: Token): boolean {
  if (token.type !== 'word') return false;
  const clean = token.value.toLowerCase().replace(/[,;:.!?]+$/, '');
  return COORDINATION.has(clean);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SEGMENTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Segment French prose into prosodic groups.
 *
 * Algorithm:
 * 1. Tokenize text
 * 2. Walk tokens left-to-right
 * 3. At each token, check (in order):
 *    a. Punctuation → always split
 *    b. Subordination conjunction → always split (conjunction starts new segment)
 *    c. Coordination conjunction → split ONLY if current segment > MIN_COORD_SYLLABLES
 * 4. For each segment, compute syllables via P0
 * 5. Apply accent tonique on last word of each segment
 *
 * @param text - French prose to segment
 * @param config - Syllable weight configuration
 * @returns SegmentationResult
 */
export function segmentProse(
  text: string,
  config: SyllableWeightConfig = DEFAULT_WEIGHT_CONFIG,
): SegmentationResult {
  if (!text || text.trim().length === 0) {
    return {
      segments: [],
      totalSyllables: 0,
      totalWeightedMass: 0,
      segmentCount: 0,
      meanSyllablesPerSegment: 0,
      syllableSeries: [],
      weightedSeries: [],
    };
  }

  const tokens = tokenize(text);
  const rawSegments: Array<{ words: string[]; boundary: BoundaryType }> = [];
  let currentWords: string[] = [];
  let currentBoundary: BoundaryType = 'start';

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    // ─── Level 1: Punctuation ───
    if (token.type === 'punctuation') {
      if (currentWords.length > 0) {
        rawSegments.push({ words: [...currentWords], boundary: currentBoundary });
        currentWords = [];
        currentBoundary = 'punctuation';
      }
      i++;
      continue;
    }

    // ─── Level 2: Subordination ───
    const subMatch = matchSubordination(tokens, i);
    if (subMatch.matched) {
      // FUSION GUARD: if current segment is too short, do NOT split.
      // The subordination conjunction merges into the current segment.
      let shouldSplit = true;
      if (currentWords.length > 0) {
        const currentText = currentWords.join(' ');
        const currentSyl = countTextSyllables(currentText, config).count;
        if (currentSyl < MIN_SUBORDINATION_SYLLABLES) {
          shouldSplit = false;
        }
      }

      if (shouldSplit && currentWords.length > 0) {
        rawSegments.push({ words: [...currentWords], boundary: currentBoundary });
        currentWords = [];
        currentBoundary = 'subordination';
      }
      // Add the conjunction word(s) to the current segment (merged or new)
      for (let j = 0; j < subMatch.tokenCount; j++) {
        if (tokens[i + j].type === 'word') {
          currentWords.push(tokens[i + j].value);
        }
      }
      i += subMatch.tokenCount;
      continue;
    }

    // ─── Level 2.5: Coordination (conditional) ───
    if (isCoordination(token)) {
      // Check if current segment has enough syllables to justify split
      if (currentWords.length > 0) {
        const currentText = currentWords.join(' ');
        const currentSyl = countTextSyllables(currentText, config).count;

        if (currentSyl > MIN_COORD_SYLLABLES) {
          rawSegments.push({ words: [...currentWords], boundary: currentBoundary });
          currentWords = [token.value];
          currentBoundary = 'coordination';
          i++;
          continue;
        }
      }
      // Not enough syllables — keep conjunction in current segment
      currentWords.push(token.value);
      i++;
      continue;
    }

    // ─── Regular word ───
    currentWords.push(token.value);
    i++;
  }

  // Flush last segment
  if (currentWords.length > 0) {
    rawSegments.push({ words: [...currentWords], boundary: currentBoundary });
  }

  // ─── Build ProsodicSegments with P0 syllable counts ───
  const segments: ProsodicSegment[] = [];

  for (let idx = 0; idx < rawSegments.length; idx++) {
    const raw = rawSegments[idx];
    const segText = raw.words.join(' ');
    const result = countTextSyllables(segText, config);

    // Apply accent tonique: last word gets W_ACCENT bonus
    let adjustedMass = result.weightedMass;
    if (result.words.length > 0) {
      const lastWord = result.words[result.words.length - 1];
      if (lastWord.count > 0) {
        adjustedMass = adjustedMass - config.W_STD + config.W_ACCENT;
      }
    }

    // Skip empty segments (0 syllables)
    if (result.count === 0) continue;

    segments.push({
      text: segText,
      syllables: result.count,
      weightedMass: adjustedMass,
      boundary: raw.boundary,
      words: result.words,
      index: segments.length,
    });
  }

  // ─── Build result ───
  const totalSyllables = segments.reduce((s, seg) => s + seg.syllables, 0);
  const totalWeightedMass = segments.reduce((s, seg) => s + seg.weightedMass, 0);

  return {
    segments,
    totalSyllables,
    totalWeightedMass,
    segmentCount: segments.length,
    meanSyllablesPerSegment: segments.length > 0 ? totalSyllables / segments.length : 0,
    syllableSeries: segments.map(s => s.syllables),
    weightedSeries: segments.map(s => s.weightedMass),
  };
}
