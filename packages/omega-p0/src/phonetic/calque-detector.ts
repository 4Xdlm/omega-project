/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — FRENCH CALQUE DETECTOR (P4)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: phonetic/calque-detector.ts
 * Phase: P4 (independent — no dependency on P0-P2)
 * Invariant: ART-PHON-P4
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Detects anglicisms, calques, and non-French constructions in prose.
 * Applies a sigmoidal penalty curve:
 *
 *   penalty(n) = 1 / (1 + e^(-k*(n - n0)))
 *
 *   Where:
 *     n  = density of calques per 100 words
 *     n0 = inflection point (threshold) — default 3.0
 *     k  = steepness — default 1.5
 *
 * Three detection layers:
 *   L1 — Lexical: known anglicisms (email, feedback, deadline, etc.)
 *   L2 — Syntactic: word order calques (il fait sens, prendre place, etc.)
 *   L3 — Morphological: false friends used with English meaning
 *
 * Each detection has a severity weight:
 *   HARD  (1.0) — Clear anglicism, no French equivalent ambiguity
 *   SOFT  (0.5) — Borderline, could be acceptable in informal register
 *   WATCH (0.2) — Flagged for awareness, may be intentional
 *
 * 100% CALC — deterministic — zero LLM.
 *
 * VALIDITY CLAIM:
 *   metric: "calque_penalty_fr"
 *   originalDomain: "French normative linguistics"
 *   appliedDomain: "literary prose quality"
 *   assumption: "anglicism density correlates with non-native voice quality"
 *   validationStatus: "UNVALIDATED"
 *   confidenceWeight: 0.6
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type CalqueSeverity = 'HARD' | 'SOFT' | 'WATCH';
export type CalqueLayer = 'lexical' | 'syntactic' | 'morphological';

export interface CalquePattern {
  /** Pattern identifier */
  readonly id: string;
  /** What to detect (lowercase) */
  readonly pattern: string | RegExp;
  /** Detection layer */
  readonly layer: CalqueLayer;
  /** Severity */
  readonly severity: CalqueSeverity;
  /** Weight: HARD=1.0, SOFT=0.5, WATCH=0.2 */
  readonly weight: number;
  /** French alternative suggestion */
  readonly suggestion: string;
  /** Brief explanation */
  readonly reason: string;
}

export interface CalqueMatch {
  /** Pattern that matched */
  readonly pattern: CalquePattern;
  /** Matched text */
  readonly matchedText: string;
  /** Position in text (character offset) */
  readonly position: number;
  /** Word index in text */
  readonly wordIndex: number;
}

export interface CalqueAnalysis {
  /** All detected calques */
  readonly matches: readonly CalqueMatch[];
  /** Total word count */
  readonly wordCount: number;
  /** Raw calque count (unweighted) */
  readonly rawCount: number;
  /** Weighted calque count (by severity) */
  readonly weightedCount: number;
  /** Density per 100 words (weighted) */
  readonly density: number;
  /** Sigmoidal penalty (0-1): 0=clean, 1=heavily polluted */
  readonly penalty: number;
  /** Quality multiplier (1 - penalty): multiply with other scores */
  readonly qualityMultiplier: number;
  /** Breakdown by layer */
  readonly byLayer: {
    readonly lexical: number;
    readonly syntactic: number;
    readonly morphological: number;
  };
  /** Breakdown by severity */
  readonly bySeverity: {
    readonly HARD: number;
    readonly SOFT: number;
    readonly WATCH: number;
  };
}

export interface SigmoidConfig {
  /** Inflection point: density at which penalty = 0.5 */
  readonly n0: number;
  /** Steepness of the curve */
  readonly k: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_SIGMOID_CONFIG: SigmoidConfig = {
  n0: 3.0,  // 3 calques per 100 words = 50% penalty
  k: 1.5,   // moderate steepness
};

const SEVERITY_WEIGHTS: Record<CalqueSeverity, number> = {
  HARD: 1.0,
  SOFT: 0.5,
  WATCH: 0.2,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * L1 — LEXICAL ANGLICISMS
 * Direct English borrowings that have French equivalents.
 */
const LEXICAL_PATTERNS: readonly CalquePattern[] = [
  // ─── Business / Corporate ───
  { id: 'L1-001', pattern: 'feedback', layer: 'lexical', severity: 'HARD', weight: 1.0, suggestion: 'retour, commentaire', reason: 'anglicisme direct' },
  { id: 'L1-002', pattern: 'deadline', layer: 'lexical', severity: 'HARD', weight: 1.0, suggestion: 'échéance, date limite', reason: 'anglicisme direct' },
  { id: 'L1-003', pattern: 'meeting', layer: 'lexical', severity: 'HARD', weight: 1.0, suggestion: 'réunion', reason: 'anglicisme direct' },
  { id: 'L1-004', pattern: 'brainstorming', layer: 'lexical', severity: 'SOFT', weight: 0.5, suggestion: 'remue-méninges', reason: 'anglicisme courant mais évitable' },
  { id: 'L1-005', pattern: 'workshop', layer: 'lexical', severity: 'HARD', weight: 1.0, suggestion: 'atelier', reason: 'anglicisme direct' },
  { id: 'L1-006', pattern: 'challenge', layer: 'lexical', severity: 'SOFT', weight: 0.5, suggestion: 'défi', reason: 'anglicisme intégré mais contesté' },
  { id: 'L1-007', pattern: 'process', layer: 'lexical', severity: 'HARD', weight: 1.0, suggestion: 'processus, procédé', reason: 'prononcé à l\'anglaise' },
  { id: 'L1-008', pattern: 'management', layer: 'lexical', severity: 'SOFT', weight: 0.5, suggestion: 'gestion, direction', reason: 'anglicisme courant' },
  { id: 'L1-009', pattern: 'planning', layer: 'lexical', severity: 'SOFT', weight: 0.5, suggestion: 'planification, emploi du temps', reason: 'faux ami partiel' },
  { id: 'L1-010', pattern: 'leadership', layer: 'lexical', severity: 'HARD', weight: 1.0, suggestion: 'direction, autorité', reason: 'anglicisme direct' },

  // ─── Technology ───
  { id: 'L1-011', pattern: 'email', layer: 'lexical', severity: 'SOFT', weight: 0.5, suggestion: 'courriel', reason: 'anglicisme intégré' },
  { id: 'L1-012', pattern: 'e-mail', layer: 'lexical', severity: 'SOFT', weight: 0.5, suggestion: 'courriel', reason: 'anglicisme intégré' },
  { id: 'L1-013', pattern: 'digital', layer: 'lexical', severity: 'HARD', weight: 1.0, suggestion: 'numérique', reason: 'faux ami (digital=doigt en FR)' },
  { id: 'L1-014', pattern: 'startup', layer: 'lexical', severity: 'SOFT', weight: 0.5, suggestion: 'jeune pousse', reason: 'anglicisme courant' },
  { id: 'L1-015', pattern: 'start-up', layer: 'lexical', severity: 'SOFT', weight: 0.5, suggestion: 'jeune pousse', reason: 'anglicisme courant' },

  // ─── Everyday ───
  { id: 'L1-016', pattern: 'cool', layer: 'lexical', severity: 'WATCH', weight: 0.2, suggestion: 'chouette, agréable', reason: 'familier mais intégré' },
  { id: 'L1-017', pattern: 'shopping', layer: 'lexical', severity: 'SOFT', weight: 0.5, suggestion: 'courses, achats', reason: 'anglicisme courant' },
  { id: 'L1-018', pattern: 'parking', layer: 'lexical', severity: 'WATCH', weight: 0.2, suggestion: 'stationnement', reason: 'largement intégré' },
  { id: 'L1-019', pattern: 'weekend', layer: 'lexical', severity: 'WATCH', weight: 0.2, suggestion: 'fin de semaine', reason: 'intégré dans le dictionnaire' },
  { id: 'L1-020', pattern: 'week-end', layer: 'lexical', severity: 'WATCH', weight: 0.2, suggestion: 'fin de semaine', reason: 'intégré dans le dictionnaire' },
  { id: 'L1-021', pattern: 'okay', layer: 'lexical', severity: 'WATCH', weight: 0.2, suggestion: 'd\'accord', reason: 'familier' },
  { id: 'L1-022', pattern: 'sorry', layer: 'lexical', severity: 'HARD', weight: 1.0, suggestion: 'pardon, désolé', reason: 'anglicisme en prose littéraire' },
  { id: 'L1-023', pattern: 'checker', layer: 'lexical', severity: 'HARD', weight: 1.0, suggestion: 'vérifier', reason: 'verbe anglais francisé' },
  { id: 'L1-024', pattern: 'liker', layer: 'lexical', severity: 'HARD', weight: 1.0, suggestion: 'aimer', reason: 'verbe anglais francisé' },
  { id: 'L1-025', pattern: 'booster', layer: 'lexical', severity: 'HARD', weight: 1.0, suggestion: 'stimuler, renforcer', reason: 'verbe anglais francisé' },
  { id: 'L1-026', pattern: 'spoiler', layer: 'lexical', severity: 'HARD', weight: 1.0, suggestion: 'divulgâcher, révéler', reason: 'anglicisme direct' },
  { id: 'L1-027', pattern: 'team', layer: 'lexical', severity: 'HARD', weight: 1.0, suggestion: 'équipe', reason: 'anglicisme direct' },
  { id: 'L1-028', pattern: 'timing', layer: 'lexical', severity: 'SOFT', weight: 0.5, suggestion: 'calendrier, moment', reason: 'anglicisme courant' },
  { id: 'L1-029', pattern: 'coach', layer: 'lexical', severity: 'SOFT', weight: 0.5, suggestion: 'entraîneur, accompagnateur', reason: 'anglicisme intégré' },
  { id: 'L1-030', pattern: 'deal', layer: 'lexical', severity: 'HARD', weight: 1.0, suggestion: 'accord, marché', reason: 'anglicisme direct' },
];

/**
 * L2 — SYNTACTIC CALQUES
 * French phrases calqued from English syntax.
 * These use regex for multi-word pattern matching.
 */
const SYNTACTIC_PATTERNS: readonly CalquePattern[] = [
  { id: 'L2-001', pattern: /\b(fait|fais|faire|faisons|faites|font)\s+sens\b/i, layer: 'syntactic', severity: 'HARD', weight: 1.0, suggestion: 'avoir du sens', reason: 'calque de "make sense"' },
  { id: 'L2-002', pattern: /\b(prend|prends|prendre|prendra|prennent|pris|prit)\s+place\b/i, layer: 'syntactic', severity: 'HARD', weight: 1.0, suggestion: 'avoir lieu, se dérouler', reason: 'calque de "take place"' },
  { id: 'L2-003', pattern: /\b(est|es|sont|étais|était|être)\s+supposée?s?\b/i, layer: 'syntactic', severity: 'HARD', weight: 1.0, suggestion: 'être censé, devoir', reason: 'calque de "be supposed to"' },
  { id: 'L2-004', pattern: /\b(paye|paie|payes|paies|payer|payons|payez|payent)\s+attention\b/i, layer: 'syntactic', severity: 'HARD', weight: 1.0, suggestion: 'faire attention, prêter attention', reason: 'calque de "pay attention"' },
  { id: 'L2-005', pattern: /\ben\s+charge\s+de\b/i, layer: 'syntactic', severity: 'SOFT', weight: 0.5, suggestion: 'responsable de, chargé de', reason: 'calque de "in charge of"' },
  { id: 'L2-006', pattern: /\bà\s+la\s+fin\s+du\s+jour\b/i, layer: 'syntactic', severity: 'HARD', weight: 1.0, suggestion: 'en fin de compte, au bout du compte', reason: 'calque de "at the end of the day"' },
  { id: 'L2-007', pattern: /\b(fait|fais|faire|faisons|faites|font)\s+une\s+différence\b/i, layer: 'syntactic', severity: 'SOFT', weight: 0.5, suggestion: 'changer les choses', reason: 'calque de "make a difference"' },
  { id: 'L2-008', pattern: /\bsur\s+une\s+base\s+(quotidienne|régulière|journalière)\b/i, layer: 'syntactic', severity: 'HARD', weight: 1.0, suggestion: 'quotidiennement, régulièrement', reason: 'calque de "on a daily basis"' },
  { id: 'L2-009', pattern: /\bdu\s+coup\b/i, layer: 'syntactic', severity: 'WATCH', weight: 0.2, suggestion: 'donc, par conséquent', reason: 'tic de langage oral (pas strictement calque)' },
  { id: 'L2-010', pattern: /\bjuste\s+pour\s+dire\b/i, layer: 'syntactic', severity: 'SOFT', weight: 0.5, suggestion: 'simplement, à vrai dire', reason: 'calque de "just to say"' },
  { id: 'L2-011', pattern: /\b(réalise|réalises|réaliser|réalisons|réalisez|réalisent|réalisa|réalisait)\s+que\b/i, layer: 'syntactic', severity: 'HARD', weight: 1.0, suggestion: 'se rendre compte que', reason: 'calque de "realize that" (réaliser=accomplir en FR)' },
  { id: 'L2-012', pattern: /\bapplicable\s+à\b/i, layer: 'syntactic', severity: 'WATCH', weight: 0.2, suggestion: 'valable pour', reason: 'calque administratif' },
  { id: 'L2-013', pattern: /\b(délivre|délivrer|délivrons|délivrent)\s+(un|le|ce)\s+(message|discours|résultat)\b/i, layer: 'syntactic', severity: 'HARD', weight: 1.0, suggestion: 'transmettre, prononcer', reason: 'calque de "deliver" (délivrer=libérer en FR)' },
  { id: 'L2-014', pattern: /\b(supporte|supporter|supportons|supportent)\s+(un|le|ce|cette)\b/i, layer: 'syntactic', severity: 'HARD', weight: 1.0, suggestion: 'soutenir, appuyer', reason: 'calque de "support" (supporter=endurer en FR)' },
  { id: 'L2-015', pattern: /\ben\s+termes\s+de\b/i, layer: 'syntactic', severity: 'SOFT', weight: 0.5, suggestion: 'en matière de, quant à', reason: 'calque de "in terms of"' },
];

/**
 * L3 — MORPHOLOGICAL FALSE FRIENDS
 * French words used with their English meaning.
 * Context-dependent — matched as standalone words with severity WATCH.
 */
const MORPHOLOGICAL_PATTERNS: readonly CalquePattern[] = [
  { id: 'L3-001', pattern: 'opportunité', layer: 'morphological', severity: 'SOFT', weight: 0.5, suggestion: 'occasion, possibilité', reason: 'en FR = caractère opportun, pas "chance"' },
  { id: 'L3-002', pattern: 'éventuellement', layer: 'morphological', severity: 'SOFT', weight: 0.5, suggestion: 'finalement, en fin de compte', reason: 'en FR = possiblement, pas "finally"' },
  { id: 'L3-003', pattern: 'définitivement', layer: 'morphological', severity: 'SOFT', weight: 0.5, suggestion: 'assurément, sans aucun doute', reason: 'en FR = de manière définitive, pas "certainly"' },
  { id: 'L3-004', pattern: 'actuellement', layer: 'morphological', severity: 'WATCH', weight: 0.2, suggestion: '(vérifier le sens)', reason: 'souvent correct mais parfois calque de "actually"' },
  { id: 'L3-005', pattern: 'adresser', layer: 'morphological', severity: 'SOFT', weight: 0.5, suggestion: 'traiter, aborder', reason: 'calque de "to address" (adresser=envoyer en FR)' },
  { id: 'L3-006', pattern: 'agressif', layer: 'morphological', severity: 'WATCH', weight: 0.2, suggestion: 'ambitieux, audacieux', reason: 'calque de "aggressive" sens positif EN' },
  { id: 'L3-007', pattern: 'assumer', layer: 'morphological', severity: 'WATCH', weight: 0.2, suggestion: 'supposer, présumer', reason: 'parfois calque de "assume" (assumer=prendre sur soi)' },
  { id: 'L3-008', pattern: 'consistant', layer: 'morphological', severity: 'SOFT', weight: 0.5, suggestion: 'cohérent, constant', reason: 'calque de "consistent" (consistant=épais en FR)' },
  { id: 'L3-009', pattern: 'versatile', layer: 'morphological', severity: 'HARD', weight: 1.0, suggestion: 'polyvalent', reason: 'faux ami total (versatile=inconstant en FR)' },
  { id: 'L3-010', pattern: 'initier', layer: 'morphological', severity: 'SOFT', weight: 0.5, suggestion: 'lancer, entreprendre', reason: 'calque de "initiate" (initier=enseigner en FR)' },
];

// All patterns combined
const ALL_PATTERNS: readonly CalquePattern[] = [
  ...LEXICAL_PATTERNS,
  ...SYNTACTIC_PATTERNS,
  ...MORPHOLOGICAL_PATTERNS,
];

// ═══════════════════════════════════════════════════════════════════════════════
// TOKENIZER
// ═══════════════════════════════════════════════════════════════════════════════

interface WordToken {
  readonly word: string;
  readonly lower: string;
  readonly pos: number;
  readonly index: number;
}

function tokenizeWords(text: string): readonly WordToken[] {
  const tokens: WordToken[] = [];
  const regex = /[a-zA-ZàâäéèêëïîôùûüÿœæçñÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇÑ][a-zA-ZàâäéèêëïîôùûüÿœæçñÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇÑ'''\-]*/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      word: match[0],
      lower: match[0].toLowerCase(),
      pos: match.index,
      index: idx++,
    });
  }

  return tokens;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect all calques in text.
 */
function detectCalques(text: string): readonly CalqueMatch[] {
  const matches: CalqueMatch[] = [];
  const lowerText = text.toLowerCase();
  const words = tokenizeWords(text);

  // Track matched positions to avoid double-counting
  const matchedPositions = new Set<number>();

  for (const pat of ALL_PATTERNS) {
    if (pat.pattern instanceof RegExp) {
      // Regex patterns (syntactic calques)
      // Strip \b (broken with accented chars in JS) — multi-word patterns
      // are naturally bounded by spaces
      const fixedSource = pat.pattern.source.replace(/\\b/g, '');
      const regex = new RegExp(fixedSource, 'gi');
      let m: RegExpExecArray | null;

      while ((m = regex.exec(text)) !== null) {
        if (matchedPositions.has(m.index)) continue;
        matchedPositions.add(m.index);

        // Find closest word index
        const wordIdx = words.findIndex(w => w.pos >= m!.index);

        matches.push({
          pattern: pat,
          matchedText: m[0],
          position: m.index,
          wordIndex: wordIdx >= 0 ? wordIdx : words.length - 1,
        });
      }
    } else {
      // String patterns (lexical / morphological)
      const patLower = pat.pattern.toLowerCase();
      // Use French-aware word boundaries + allow plural/feminine suffixes for L3
      let regexStr: string;
      if (pat.layer === 'morphological') {
        // Allow optional e/s/es suffix for flexion
        regexStr = `${FR_NOT_CHAR}${escapeRegex(patLower)}(?:e?s?)${FR_NOT_CHAR_AFTER}`;
      } else {
        regexStr = `${FR_NOT_CHAR}${escapeRegex(patLower)}${FR_NOT_CHAR_AFTER}`;
      }
      const wordRegex = new RegExp(regexStr, 'gi');
      let m: RegExpExecArray | null;

      while ((m = wordRegex.exec(lowerText)) !== null) {
        if (matchedPositions.has(m.index)) continue;
        matchedPositions.add(m.index);

        const wordIdx = words.findIndex(w => w.pos >= m!.index);

        matches.push({
          pattern: pat,
          matchedText: text.slice(m.index, m.index + m[0].length),
          position: m.index,
          wordIndex: wordIdx >= 0 ? wordIdx : words.length - 1,
        });
      }
    }
  }

  // Sort by position
  return matches.sort((a, b) => a.position - b.position);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// French-aware word boundary (since \b doesn't work with accented chars)
const FR_NOT_CHAR = `(?<![a-zA-ZàâäéèêëïîôùûüÿœæçñÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇÑ\\-'])`;
const FR_NOT_CHAR_AFTER = `(?![a-zA-ZàâäéèêëïîôùûüÿœæçñÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇÑ\\-'])`;

function frenchWordBoundaryRegex(word: string): RegExp {
  return new RegExp(`${FR_NOT_CHAR}${escapeRegex(word)}${FR_NOT_CHAR_AFTER}`, 'gi');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGMOID PENALTY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute sigmoidal penalty from density.
 *
 *   penalty(d) = 1 / (1 + e^(-k * (d - n0)))
 *
 * Properties:
 *   - d = 0     → penalty ≈ 0 (clean text)
 *   - d = n0    → penalty = 0.5 (inflection)
 *   - d >> n0   → penalty → 1.0 (heavily polluted)
 */
export function sigmoidPenalty(density: number, config: SigmoidConfig = DEFAULT_SIGMOID_CONFIG): number {
  return 1 / (1 + Math.exp(-config.k * (density - config.n0)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze French text for calques and compute penalty.
 *
 * @param text - French prose to analyze
 * @param sigmoidConfig - Sigmoid parameters
 * @returns CalqueAnalysis
 */
export function analyzeCalques(
  text: string,
  sigmoidConfig: SigmoidConfig = DEFAULT_SIGMOID_CONFIG,
): CalqueAnalysis {
  if (!text || text.trim().length === 0) {
    return {
      matches: [],
      wordCount: 0,
      rawCount: 0,
      weightedCount: 0,
      density: 0,
      penalty: sigmoidPenalty(0, sigmoidConfig),
      qualityMultiplier: 1 - sigmoidPenalty(0, sigmoidConfig),
      byLayer: { lexical: 0, syntactic: 0, morphological: 0 },
      bySeverity: { HARD: 0, SOFT: 0, WATCH: 0 },
    };
  }

  const words = tokenizeWords(text);
  const wordCount = words.length;
  const matches = detectCalques(text);

  // Counts
  const rawCount = matches.length;
  const weightedCount = matches.reduce((sum, m) => sum + m.pattern.weight, 0);

  // Density per 100 words
  const density = wordCount > 0 ? (weightedCount / wordCount) * 100 : 0;

  // Penalty
  const penalty = sigmoidPenalty(density, sigmoidConfig);
  const qualityMultiplier = 1 - penalty;

  // Breakdowns
  const byLayer = {
    lexical: matches.filter(m => m.pattern.layer === 'lexical').length,
    syntactic: matches.filter(m => m.pattern.layer === 'syntactic').length,
    morphological: matches.filter(m => m.pattern.layer === 'morphological').length,
  };

  const bySeverity = {
    HARD: matches.filter(m => m.pattern.severity === 'HARD').length,
    SOFT: matches.filter(m => m.pattern.severity === 'SOFT').length,
    WATCH: matches.filter(m => m.pattern.severity === 'WATCH').length,
  };

  return {
    matches,
    wordCount,
    rawCount,
    weightedCount,
    density,
    penalty,
    qualityMultiplier,
    byLayer,
    bySeverity,
  };
}

/**
 * Get all available calque patterns (for documentation/introspection).
 */
export function getPatternDatabase(): readonly CalquePattern[] {
  return ALL_PATTERNS;
}
