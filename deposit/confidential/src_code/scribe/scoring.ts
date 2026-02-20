// ═══════════════════════════════════════════════════════════════════════════
// OMEGA SCRIBE v1.0 — SCORING ENGINE
// Version: 1.0.0
// Date: 01 janvier 2026
// Certification: NASA-GRADE AS9100D / DO-178C
// ═══════════════════════════════════════════════════════════════════════════

import { 
  SceneSpec, 
  LengthSpec, 
  Warning, 
  Violation,
  Tense 
} from './types';
import { scoreOutOfBounds } from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Voice guidance structure (from VOICE module)
 */
export interface VoiceGuidance {
  expected_metrics?: {
    dialogue_ratio?: number;
    avg_sentence_length?: number;
    vocabulary_richness?: number;
    emotional_intensity?: number;
  };
  style_markers?: string[];
  forbidden_patterns?: string[];
}

/**
 * Compliance analysis result
 */
export interface ComplianceResult {
  score: number;              // [0, 1]
  violations: Violation[];
  warnings: Warning[];
  metrics: ComplianceMetrics;
}

/**
 * Detailed metrics
 */
export interface ComplianceMetrics {
  word_count: number;
  sentence_count: number;
  paragraph_count: number;
  dialogue_ratio: number;
  avg_sentence_length: number;
  tense_consistency: number;
  length_compliance: 'OK' | 'BELOW' | 'ABOVE';
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scoring weights (sum = 1.0)
 */
const WEIGHTS = {
  length: 0.15,
  tense: 0.20,
  dialogue: 0.15,
  sentence_length: 0.15,
  forbidden_patterns: 0.35
};

/**
 * Thresholds per mode
 */
export const MODE_THRESHOLDS = {
  DRAFT: 0.5,
  VALIDATED: 0.7,
  STRICT: 0.85
};

/**
 * French tense indicators
 */
const TENSE_INDICATORS = {
  PAST: [
    'était', 'avait', 'fut', 'alla', 'dit', 'vit', 'prit', 'fit', 'eut',
    'étaient', 'avaient', 'furent', 'allèrent', 'dirent', 'virent',
    'savait', 'pouvait', 'voulait', 'devait', 'fallait',
    'venait', 'sortait', 'entrait', 'restait', 'partait'
  ],
  PRESENT: [
    'est', 'a', 'va', 'dit', 'voit', 'prend', 'fait',
    'sont', 'ont', 'vont', 'disent', 'voient',
    'sait', 'peut', 'veut', 'doit', 'faut',
    'vient', 'sort', 'entre', 'reste', 'part'
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCORING FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyze text compliance with VOICE guidance
 * 
 * @invariant SCRIBE-I10: Score bounded [0, 1]
 * @invariant SCRIBE-I11: Score is deterministic (same text = same score)
 * 
 * @param text Generated text
 * @param sceneSpec Scene specification
 * @param voiceGuidance VOICE guidance (optional)
 * @returns Compliance result with score and details
 */
export function analyzeCompliance(
  text: string,
  sceneSpec: SceneSpec,
  voiceGuidance?: VoiceGuidance
): ComplianceResult {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];
  
  // Compute metrics
  const metrics = computeMetrics(text, sceneSpec.target_length, sceneSpec.tense);
  
  // Initialize score
  let score = 1.0;
  
  // 1. Length compliance (SOFT - warning only in v1)
  const lengthScore = scoreLengthCompliance(
    metrics.word_count,
    sceneSpec.target_length,
    warnings
  );
  score -= (1 - lengthScore) * WEIGHTS.length;
  
  // 2. Tense consistency
  const tenseScore = scoreTenseConsistency(
    text,
    sceneSpec.tense,
    warnings
  );
  score -= (1 - tenseScore) * WEIGHTS.tense;
  
  // 3. Dialogue ratio (if guidance provided)
  if (voiceGuidance?.expected_metrics?.dialogue_ratio !== undefined) {
    const dialogueScore = scoreDialogueRatio(
      metrics.dialogue_ratio,
      voiceGuidance.expected_metrics.dialogue_ratio,
      warnings
    );
    score -= (1 - dialogueScore) * WEIGHTS.dialogue;
  }
  
  // 4. Average sentence length (if guidance provided)
  if (voiceGuidance?.expected_metrics?.avg_sentence_length !== undefined) {
    const sentenceScore = scoreSentenceLength(
      metrics.avg_sentence_length,
      voiceGuidance.expected_metrics.avg_sentence_length,
      warnings
    );
    score -= (1 - sentenceScore) * WEIGHTS.sentence_length;
  }
  
  // 5. Forbidden patterns (critical - adds violations)
  if (voiceGuidance?.forbidden_patterns && voiceGuidance.forbidden_patterns.length > 0) {
    const patternScore = scoreForbiddenPatterns(
      text,
      voiceGuidance.forbidden_patterns,
      violations
    );
    score -= (1 - patternScore) * WEIGHTS.forbidden_patterns;
  }
  
  // Clamp score to [0, 1] — INVARIANT SCRIBE-I10
  score = clampScore(score);
  
  return {
    score,
    violations,
    warnings,
    metrics
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// METRIC COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute text metrics
 */
function computeMetrics(
  text: string,
  targetLength: LengthSpec,
  expectedTense: Tense
): ComplianceMetrics {
  const word_count = countWords(text);
  const sentence_count = countSentences(text);
  const paragraph_count = countParagraphs(text);
  const dialogue_ratio = computeDialogueRatio(text);
  const avg_sentence_length = sentence_count > 0 ? word_count / sentence_count : 0;
  const tense_consistency = computeTenseConsistency(text, expectedTense);
  
  let length_compliance: 'OK' | 'BELOW' | 'ABOVE' = 'OK';
  if (word_count < targetLength.min_words) {
    length_compliance = 'BELOW';
  } else if (word_count > targetLength.max_words) {
    length_compliance = 'ABOVE';
  }
  
  return {
    word_count,
    sentence_count,
    paragraph_count,
    dialogue_ratio,
    avg_sentence_length,
    tense_consistency,
    length_compliance
  };
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  const words = text.trim().split(/\s+/);
  return words.filter(w => w.length > 0).length;
}

/**
 * Count sentences in text
 */
function countSentences(text: string): number {
  // Simple heuristic: count sentence-ending punctuation
  const matches = text.match(/[.!?]+/g);
  return matches ? matches.length : 1;
}

/**
 * Count paragraphs in text
 */
function countParagraphs(text: string): number {
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs.filter(p => p.trim().length > 0).length;
}

/**
 * Compute dialogue ratio (chars in quotes / total chars)
 */
function computeDialogueRatio(text: string): number {
  const totalChars = text.length;
  if (totalChars === 0) return 0;
  
  let dialogueChars = 0;
  let inDialogue = false;
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' || ch === '«' || ch === '»' || ch === '"' || ch === '"') {
      inDialogue = !inDialogue;
    } else if (inDialogue) {
      dialogueChars++;
    }
  }
  
  return dialogueChars / totalChars;
}

/**
 * Compute tense consistency score [0, 1]
 */
function computeTenseConsistency(text: string, expectedTense: Tense): number {
  const textLower = text.toLowerCase();
  
  const expectedIndicators = TENSE_INDICATORS[expectedTense];
  const oppositeIndicators = expectedTense === 'PAST' 
    ? TENSE_INDICATORS.PRESENT 
    : TENSE_INDICATORS.PAST;
  
  let expectedCount = 0;
  let oppositeCount = 0;
  
  for (const indicator of expectedIndicators) {
    const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
    const matches = textLower.match(regex);
    expectedCount += matches ? matches.length : 0;
  }
  
  for (const indicator of oppositeIndicators) {
    const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
    const matches = textLower.match(regex);
    oppositeCount += matches ? matches.length : 0;
  }
  
  const total = expectedCount + oppositeCount;
  if (total === 0) return 1.0; // No indicators found, assume OK
  
  return expectedCount / total;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score length compliance
 * 
 * @invariant SCRIBE-I14: SOFT mode in v1 (warning only, no truncation)
 */
function scoreLengthCompliance(
  wordCount: number,
  target: LengthSpec,
  warnings: Warning[]
): number {
  if (wordCount >= target.min_words && wordCount <= target.max_words) {
    return 1.0;
  }
  
  if (wordCount < target.min_words) {
    const deficit = target.min_words - wordCount;
    const deficitPercent = deficit / target.min_words;
    
    warnings.push({
      code: 'LENGTH_BELOW_MIN',
      message: `Text has ${wordCount} words, minimum is ${target.min_words} (${deficit} short)`,
      details: {
        actual: String(wordCount),
        min: String(target.min_words),
        deficit: String(deficit),
        deficit_percent: (deficitPercent * 100).toFixed(1) + '%'
      }
    });
    
    // Score degrades proportionally
    return Math.max(0, 1 - deficitPercent);
  }
  
  // Above max
  const excess = wordCount - target.max_words;
  const excessPercent = excess / target.max_words;
  
  warnings.push({
    code: 'LENGTH_ABOVE_MAX',
    message: `Text has ${wordCount} words, maximum is ${target.max_words} (${excess} excess)`,
    details: {
      actual: String(wordCount),
      max: String(target.max_words),
      excess: String(excess),
      excess_percent: (excessPercent * 100).toFixed(1) + '%'
    }
  });
  
  // Score degrades proportionally
  return Math.max(0, 1 - excessPercent * 0.5); // Excess is less penalized than deficit
}

/**
 * Score tense consistency
 */
function scoreTenseConsistency(
  text: string,
  expectedTense: Tense,
  warnings: Warning[]
): number {
  const consistency = computeTenseConsistency(text, expectedTense);
  
  if (consistency < 0.7) {
    warnings.push({
      code: 'TENSE_INCONSISTENT',
      message: `Text appears to mix tenses. Expected ${expectedTense}, consistency: ${(consistency * 100).toFixed(1)}%`,
      details: {
        expected: expectedTense,
        consistency: (consistency * 100).toFixed(1) + '%'
      }
    });
  }
  
  return consistency;
}

/**
 * Score dialogue ratio
 */
function scoreDialogueRatio(
  actual: number,
  expected: number,
  warnings: Warning[]
): number {
  const diff = Math.abs(actual - expected);
  
  // Tolerance: 20% difference is OK
  if (diff <= 0.2) {
    return 1.0;
  }
  
  // Beyond tolerance
  warnings.push({
    code: 'DIALOGUE_RATIO_DRIFT',
    message: `Dialogue ratio ${(actual * 100).toFixed(1)}% differs from target ${(expected * 100).toFixed(1)}%`,
    details: {
      actual: (actual * 100).toFixed(1) + '%',
      expected: (expected * 100).toFixed(1) + '%',
      difference: (diff * 100).toFixed(1) + '%'
    }
  });
  
  // Score degrades with difference
  return Math.max(0, 1 - (diff - 0.2) / 0.8);
}

/**
 * Score sentence length
 */
function scoreSentenceLength(
  actual: number,
  expected: number,
  warnings: Warning[]
): number {
  if (expected === 0) return 1.0;
  
  const ratio = actual / expected;
  
  // Acceptable range: 0.5x to 2x
  if (ratio >= 0.5 && ratio <= 2.0) {
    return 1.0;
  }
  
  warnings.push({
    code: 'SENTENCE_LENGTH_DRIFT',
    message: `Average sentence length ${actual.toFixed(1)} words differs from target ${expected.toFixed(1)}`,
    details: {
      actual: actual.toFixed(1),
      expected: expected.toFixed(1),
      ratio: ratio.toFixed(2)
    }
  });
  
  if (ratio < 0.5) {
    return ratio / 0.5;
  }
  return 2.0 / ratio;
}

/**
 * Score forbidden patterns
 */
function scoreForbiddenPatterns(
  text: string,
  forbiddenPatterns: string[],
  violations: Violation[]
): number {
  const textLower = text.toLowerCase();
  let foundCount = 0;
  
  for (const pattern of forbiddenPatterns) {
    const regex = new RegExp(pattern, 'gi');
    const matches = textLower.match(regex);
    
    if (matches && matches.length > 0) {
      foundCount += matches.length;
      
      violations.push({
        code: 'FORBIDDEN_PATTERN',
        message: `Forbidden pattern "${pattern}" found ${matches.length} time(s)`,
        details: {
          pattern,
          occurrences: String(matches.length)
        }
      });
    }
  }
  
  if (foundCount === 0) return 1.0;
  
  // Each forbidden pattern found reduces score significantly
  return Math.max(0, 1 - foundCount * 0.2);
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clamp score to [0, 1]
 * 
 * @invariant SCRIBE-I10: Score always bounded
 */
function clampScore(score: number): number {
  if (score < 0) return 0;
  if (score > 1) return 1;
  return score;
}

/**
 * Validate score is in bounds
 * @throws ScribeError if out of bounds
 */
export function validateScore(score: number): void {
  if (score < 0 || score > 1) {
    throw scoreOutOfBounds(score);
  }
}

/**
 * Check if score meets threshold for mode
 */
export function meetsThreshold(score: number, mode: keyof typeof MODE_THRESHOLDS): boolean {
  return score >= MODE_THRESHOLDS[mode];
}

/**
 * Get threshold for mode
 */
export function getThreshold(mode: keyof typeof MODE_THRESHOLDS): number {
  return MODE_THRESHOLDS[mode];
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const Scoring = {
  analyzeCompliance,
  validateScore,
  meetsThreshold,
  getThreshold,
  MODE_THRESHOLDS,
  // Metrics (for testing)
  countWords,
  countSentences,
  countParagraphs,
  computeDialogueRatio,
  computeTenseConsistency
};

export default Scoring;
