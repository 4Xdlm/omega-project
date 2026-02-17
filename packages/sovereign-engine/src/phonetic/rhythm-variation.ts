/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — RHYTHM VARIATION V2 (Enhanced Monotony Detection)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: phonetic/rhythm-variation.ts
 * Sprint: 15.2
 * Invariant: ART-PHON-02
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Enhanced monotony detection beyond what rhythm.ts already does.
 * Detects structural monotony patterns invisible to CV analysis:
 * - Syntactic repetition (same structure S-V-O repeated)
 * - Clause count monotony (all sentences have same number of clauses)
 * - Punctuation monotony (same punctuation pattern repeated)
 * - Cadence monotony (alternating long/short too regular)
 *
 * 100% CALC — deterministic.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MonotonyResult {
  readonly patterns: readonly MonotonyPattern[];
  readonly total_count: number;
  readonly monotony_score: number; // 0-100 (0 = highly varied, 100 = extremely monotone)
  readonly variation_score: number; // 100 - monotony_score (for euphony axis)
}

export interface MonotonyPattern {
  readonly type: MonotonyType;
  readonly detail: string;
  readonly severity: 'critical' | 'high' | 'medium';
  readonly start_index: number;
  readonly end_index: number;
}

export type MonotonyType =
  | 'clause_count_monotony'    // 4+ sentences with same clause count
  | 'punctuation_monotony'     // 4+ sentences with same punctuation pattern
  | 'cadence_monotony'         // Perfectly alternating long/short (metronomic)
  | 'length_plateau'           // 5+ sentences within ±15% of mean
  | 'connector_repetition';    // Same connector word 3+ times in 5 sentences

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function splitSentences(prose: string): readonly string[] {
  const raw = prose
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?…])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (raw.length <= 1 && prose.includes('\n')) {
    return prose.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);
  }
  return raw;
}

function countWords(sentence: string): number {
  return sentence.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/** Count clauses (approximation: commas, semicolons, relative pronouns) */
function countClauses(sentence: string): number {
  const separators = sentence.match(/[,;]|(?:\bqui\b|\bque\b|\bdont\b|\boù\b|\blorsque\b|\bquand\b)/gi);
  return (separators?.length ?? 0) + 1;
}

/** Extract punctuation signature: sequence of punctuation types */
function getPunctuationSignature(sentence: string): string {
  const puncts = sentence.match(/[,;:!?…—–\-]/g) ?? [];
  return puncts.join('');
}

/** Common French connectors */
const CONNECTORS_FR = [
  'mais', 'et', 'or', 'donc', 'car', 'puis', 'alors',
  'ensuite', 'pourtant', 'cependant', 'néanmoins', 'toutefois',
  'aussi', 'ainsi', 'enfin', 'soudain', 'soudainement',
];

/** Extract connector from sentence start */
function getConnector(sentence: string): string | null {
  const trimmed = sentence.trim().toLowerCase();
  for (const conn of CONNECTORS_FR) {
    if (trimmed.startsWith(conn + ' ') || trimmed.startsWith(conn + ',')) {
      return conn;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Detect clause count monotony: 4+ consecutive sentences with same clause count */
function detectClauseCountMonotony(sentences: readonly string[]): readonly MonotonyPattern[] {
  const patterns: MonotonyPattern[] = [];
  const clauseCounts = sentences.map(countClauses);

  let streak = 1;
  let streakStart = 0;

  for (let i = 1; i < clauseCounts.length; i++) {
    if (clauseCounts[i] === clauseCounts[i - 1]) {
      streak++;
    } else {
      if (streak >= 4) {
        patterns.push({
          type: 'clause_count_monotony',
          detail: `${streak} sentences with ${clauseCounts[i - 1]} clause(s) each`,
          severity: streak >= 6 ? 'critical' : streak >= 5 ? 'high' : 'medium',
          start_index: streakStart,
          end_index: i - 1,
        });
      }
      streak = 1;
      streakStart = i;
    }
  }
  if (streak >= 4) {
    patterns.push({
      type: 'clause_count_monotony',
      detail: `${streak} sentences with ${clauseCounts[clauseCounts.length - 1]} clause(s) each`,
      severity: streak >= 6 ? 'critical' : streak >= 5 ? 'high' : 'medium',
      start_index: streakStart,
      end_index: clauseCounts.length - 1,
    });
  }

  return patterns;
}

/** Detect punctuation monotony: 4+ consecutive sentences with same punctuation pattern */
function detectPunctuationMonotony(sentences: readonly string[]): readonly MonotonyPattern[] {
  const patterns: MonotonyPattern[] = [];
  const sigs = sentences.map(getPunctuationSignature);

  let streak = 1;
  let streakStart = 0;

  for (let i = 1; i < sigs.length; i++) {
    if (sigs[i] === sigs[i - 1]) {
      streak++;
    } else {
      if (streak >= 4) {
        patterns.push({
          type: 'punctuation_monotony',
          detail: `${streak} sentences with pattern "${sigs[i - 1] || '(none)'}"`,
          severity: streak >= 6 ? 'high' : 'medium',
          start_index: streakStart,
          end_index: i - 1,
        });
      }
      streak = 1;
      streakStart = i;
    }
  }
  if (streak >= 4) {
    patterns.push({
      type: 'punctuation_monotony',
      detail: `${streak} sentences with pattern "${sigs[sigs.length - 1] || '(none)'}"`,
      severity: streak >= 6 ? 'high' : 'medium',
      start_index: streakStart,
      end_index: sigs.length - 1,
    });
  }

  return patterns;
}

/** Detect cadence monotony: perfectly alternating long/short (metronomic) */
function detectCadenceMonotony(sentences: readonly string[]): readonly MonotonyPattern[] {
  const patterns: MonotonyPattern[] = [];
  if (sentences.length < 6) return patterns;

  const wc = sentences.map(countWords);
  const mean = wc.reduce((a, b) => a + b, 0) / wc.length;

  // Check if pattern is alternating above/below mean
  let alternating = 0;
  for (let i = 1; i < wc.length; i++) {
    const prevAbove = wc[i - 1] > mean;
    const currAbove = wc[i] > mean;
    if (prevAbove !== currAbove) {
      alternating++;
    }
  }

  const ratio = alternating / (wc.length - 1);
  // If > 85% alternating, it's metronomic
  if (ratio > 0.85 && wc.length >= 6) {
    patterns.push({
      type: 'cadence_monotony',
      detail: `${(ratio * 100).toFixed(0)}% alternating long/short — metronomic`,
      severity: ratio > 0.95 ? 'critical' : 'high',
      start_index: 0,
      end_index: sentences.length - 1,
    });
  }

  return patterns;
}

/** Detect length plateau: 5+ sentences within ±15% of mean length */
function detectLengthPlateau(sentences: readonly string[]): readonly MonotonyPattern[] {
  const patterns: MonotonyPattern[] = [];
  const wc = sentences.map(countWords);

  if (wc.length < 5) return patterns;

  // Sliding window of 5
  for (let start = 0; start <= wc.length - 5; start++) {
    const window = wc.slice(start, start + 5);
    const windowMean = window.reduce((a, b) => a + b, 0) / window.length;
    if (windowMean === 0) continue;

    const allWithin = window.every(w => Math.abs(w - windowMean) / windowMean <= 0.15);
    if (allWithin) {
      // Extend the plateau
      let end = start + 4;
      while (end + 1 < wc.length) {
        const nextDiff = Math.abs(wc[end + 1] - windowMean) / windowMean;
        if (nextDiff <= 0.15) {
          end++;
        } else {
          break;
        }
      }

      const len = end - start + 1;
      if (len >= 5) {
        patterns.push({
          type: 'length_plateau',
          detail: `${len} sentences at ~${windowMean.toFixed(0)} words each (±15%)`,
          severity: len >= 8 ? 'critical' : len >= 6 ? 'high' : 'medium',
          start_index: start,
          end_index: end,
        });
        // Skip past this plateau
        break; // One plateau per analysis (avoid overlapping)
      }
    }
  }

  return patterns;
}

/** Detect connector repetition: same connector 3+ times in 5 sentences */
function detectConnectorRepetition(sentences: readonly string[]): readonly MonotonyPattern[] {
  const patterns: MonotonyPattern[] = [];

  if (sentences.length < 5) return patterns;

  for (let start = 0; start <= sentences.length - 5; start++) {
    const window = sentences.slice(start, start + 5);
    const connectors = window.map(getConnector).filter(c => c !== null);

    // Count occurrences
    const counts = new Map<string, number>();
    for (const c of connectors) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }

    for (const [conn, count] of counts) {
      if (count >= 3) {
        patterns.push({
          type: 'connector_repetition',
          detail: `"${conn}" used ${count} times in 5 sentences`,
          severity: count >= 4 ? 'high' : 'medium',
          start_index: start,
          end_index: start + 4,
        });
      }
    }
  }

  return patterns;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze rhythm variation and detect monotony patterns.
 * Enhanced v2: goes beyond CV to detect structural monotony.
 * 100% CALC, deterministic.
 *
 * @param prose - Text to analyze
 * @returns MonotonyResult
 */
export function analyzeRhythmVariation(prose: string): MonotonyResult {
  const sentences = splitSentences(prose);
  const allPatterns: MonotonyPattern[] = [];

  allPatterns.push(...detectClauseCountMonotony(sentences));
  allPatterns.push(...detectPunctuationMonotony(sentences));
  allPatterns.push(...detectCadenceMonotony(sentences));
  allPatterns.push(...detectLengthPlateau(sentences));
  allPatterns.push(...detectConnectorRepetition(sentences));

  // Severity weights
  const weights: Record<string, number> = { critical: 3, high: 2, medium: 1 };
  const rawScore = allPatterns.reduce((sum, p) => sum + (weights[p.severity] ?? 1), 0);
  const monotony_score = Math.min(100, rawScore * 8);

  return {
    patterns: allPatterns,
    total_count: allPatterns.length,
    monotony_score,
    variation_score: 100 - monotony_score,
  };
}
