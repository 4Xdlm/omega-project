/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA GENIUS ENGINE — AS GATEKEEPER (Layer 0)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: genius/as-gatekeeper.ts
 * Sprint: GENIUS-02
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Binary kill switch: if AS < 85 → REJECT, skip Layer 1+2.
 * Scans text against anti-pattern blacklist (literal + regex).
 *
 * Invariants: GENIUS-01, GENIUS-24
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import antiPatternData from './anti-pattern-blacklist.json';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ASGateResult {
  readonly AS_score: number;
  readonly AS_GATE_PASS: boolean;
  readonly reject_reason: string | null;
  readonly matched_patterns: readonly string[];
  readonly pattern_count: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const AS_THRESHOLD = 85;
const PENALTY_PER_MATCH = 5;
const BASE_SCORE = 100;

// Pre-compile regex patterns at module load (deterministic)
const COMPILED_REGEX: RegExp[] = antiPatternData.regex_patterns.map(
  (p: string) => new RegExp(p, 'gi')
);

// ═══════════════════════════════════════════════════════════════════════════════
// CORE COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute AS (Authenticity Score) for text.
 *
 * Algorithm:
 * 1. Scan text against literal patterns (case-insensitive)
 * 2. Scan text against regex patterns
 * 3. AS = 100 - (total_matches × penalty_per_match)
 * 4. AS clamped to [0, 100]
 * 5. If AS < 85 → REJECT
 *
 * DETERMINISM: Same input → same output.
 */
export function computeAS(text: string): ASGateResult {
  if (!text || text.trim().length === 0) {
    return {
      AS_score: 0,
      AS_GATE_PASS: false,
      reject_reason: 'EMPTY_TEXT',
      matched_patterns: [],
      pattern_count: 0,
    };
  }

  const textLower = text.toLowerCase();
  const matchedPatterns: string[] = [];

  // 1. Literal patterns (case-insensitive exact substring match)
  for (const pattern of antiPatternData.patterns) {
    if (textLower.includes(pattern.toLowerCase())) {
      matchedPatterns.push(`LITERAL: ${pattern}`);
    }
  }

  // 2. Regex patterns
  for (let i = 0; i < COMPILED_REGEX.length; i++) {
    const regex = COMPILED_REGEX[i];
    // Reset lastIndex for global regex
    regex.lastIndex = 0;
    if (regex.test(text)) {
      matchedPatterns.push(`REGEX: ${antiPatternData.regex_patterns[i]}`);
    }
  }

  // 3. Compute score
  const totalMatches = matchedPatterns.length;
  const rawScore = BASE_SCORE - (totalMatches * PENALTY_PER_MATCH);
  const AS_score = Math.max(0, Math.min(100, rawScore));

  // 4. Gate check
  const AS_GATE_PASS = AS_score >= AS_THRESHOLD;
  const reject_reason = AS_GATE_PASS ? null : 'AS_GATE';

  return {
    AS_score,
    AS_GATE_PASS,
    reject_reason,
    matched_patterns: matchedPatterns,
    pattern_count: totalMatches,
  };
}

/**
 * Quick gate check — returns boolean only.
 */
export function isAuthentic(text: string): boolean {
  return computeAS(text).AS_GATE_PASS;
}

/**
 * Get AS threshold value.
 */
export function getASThreshold(): number {
  return AS_THRESHOLD;
}
