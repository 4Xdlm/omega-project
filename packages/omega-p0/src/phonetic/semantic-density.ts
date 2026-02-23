/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — FRENCH SEMANTIC DENSITY ANALYZER (P5)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: phonetic/semantic-density.ts
 * Phase: P5 (independent — no dependency on P0-P4)
 * Invariant: ART-SEM-P5
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Measures semantic density of French prose via 3 metrics:
 *
 *   1. LEXICAL DENSITY (LD) — ratio of content words to total words
 *      LD = N_lexical / N_total × 100
 *      Content words = everything NOT in FUNCTION_WORDS_FR
 *      Target: literary prose ≥ 50%, AI prose typically 40-45%
 *
 *   2. LEXICAL DIVERSITY (HD-D / vocd-D) — vocabulary richness
 *      Uses hypergeometric distribution sampling (McCarthy & Jarvis 2007)
 *      Independent of text length (unlike raw TTR)
 *      Deterministic via fixed PRNG seed
 *
 *   3. VERB-ADJECTIVE RATIO (VAR) — force of prose
 *      VAR = N_verbs / N_adjectives
 *      Powerful prose: VAR > 1.0 (verb-driven)
 *      Weak prose: VAR < 1.0 (adjective-heavy)
 *      Detection via French morphological suffixes (heuristic)
 *
 * Architecture: pure dictionary + suffix heuristic.
 * Zero NLP dependency. Zero LLM. 100% CALC. Deterministic.
 *
 * VALIDITY CLAIM:
 *   metric: "semantic_density_fr"
 *   originalDomain: "computational linguistics (lexical statistics)"
 *   appliedDomain: "French prose quality assessment"
 *   assumption: "function word dictionary covers 99%+ of FR function words"
 *   validationStatus: "UNVALIDATED"
 *   confidenceWeight: 0.7
 *   nonGoal: "This is NOT a measure of literary quality, only lexical statistics"
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DensityAnalysis {
  /** Lexical density (0-100): % of content words */
  readonly lexicalDensity: number;
  /** Content word count */
  readonly contentWords: number;
  /** Function word count */
  readonly functionWords: number;
  /** Total word count */
  readonly totalWords: number;

  /** Raw Type-Token Ratio (0-1): unique/total (biased by length) */
  readonly ttrRaw: number;
  /** HD-D score (0-1): length-independent diversity */
  readonly hdd: number;
  /** Unique word count (types) */
  readonly uniqueWords: number;

  /** Verb count (heuristic) */
  readonly verbCount: number;
  /** Adjective count (heuristic) */
  readonly adjectiveCount: number;
  /** Verb-Adjective Ratio: verbs/adjectives (Infinity if 0 adjectives) */
  readonly var: number;

  /** Composite density score (0-100) — DIAGNOSTIC ONLY, not calibrated */
  readonly densityScore: number;

  /** Per-word classification (for debugging/transparency) */
  readonly classification: readonly WordClass[];
}

export interface WordClass {
  readonly word: string;
  readonly lower: string;
  readonly type: 'content' | 'function';
  /** Sub-type heuristic */
  readonly subType: 'verb' | 'adjective' | 'noun_adverb' | 'function';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRENCH FUNCTION WORDS DICTIONARY (~350 entries)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Comprehensive French function words: determiners, pronouns, prepositions,
 * conjunctions, auxiliaries, liaison adverbs.
 *
 * Design: closed-class words. Everything NOT in this set = content word.
 * This covers >99% of French function word occurrences.
 */
const FUNCTION_WORDS_FR: ReadonlySet<string> = new Set([
  // ─── Déterminants (articles + possessifs + démonstratifs) ───
  'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'au', 'aux',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
  'ce', 'cet', 'cette', 'ces',
  'quel', 'quelle', 'quels', 'quelles',
  'chaque', 'tout', 'toute', 'tous', 'toutes',
  'aucun', 'aucune', 'nul', 'nulle',
  'tel', 'telle', 'tels', 'telles',
  'certain', 'certaine', 'certains', 'certaines',
  'plusieurs', 'quelque', 'quelques',
  'même', 'mêmes', 'autre', 'autres',

  // ─── Pronoms personnels ───
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'me', 'te', 'se', 'lui', 'eux',
  'moi', 'toi', 'soi',
  'en', 'y',
  'j', 'm', 't', 's', 'n', 'c', 'd', 'qu',

  // ─── Pronoms relatifs / interrogatifs ───
  'qui', 'que', 'quoi', 'dont', 'où',
  'lequel', 'laquelle', 'lesquels', 'lesquelles',
  'duquel', 'desquels', 'desquelles',
  'auquel', 'auxquels', 'auxquelles',

  // ─── Pronoms démonstratifs / indéfinis ───
  'celui', 'celle', 'ceux', 'celles',
  'ceci', 'cela', 'ça',
  'quelqu', "quelqu'un", "quelqu'une", "l'on",
  'rien', 'personne', 'quiconque',
  'chacun', 'chacune',

  // ─── Prépositions ───
  'à', 'dans', 'par', 'pour', 'sur', 'avec', 'sans', 'sous',
  'entre', 'vers', 'chez', 'après', 'avant', 'depuis', 'pendant',
  'durant', 'contre', 'malgré', 'selon', 'envers', 'parmi',
  'dès', 'hors', 'outre', 'derrière', 'devant',
  'jusque', "jusqu'", "jusqu'à", "jusqu'au", "jusqu'aux",

  // ─── Conjonctions de coordination ───
  'et', 'ou', 'mais', 'or', 'ni', 'car', 'donc',

  // ─── Conjonctions de subordination ───
  'si', 'comme', 'quand', 'lorsque', "lorsqu'",
  'puisque', "puisqu'", 'tandis',
  'alors', 'bien', 'afin',
  'parce',

  // ─── Auxiliaires (être + avoir — toutes formes courantes) ───
  'être', 'avoir',
  'suis', 'es', 'est', 'sommes', 'êtes', 'sont',
  'étais', 'était', 'étions', 'étiez', 'étaient',
  'serai', 'seras', 'sera', 'serons', 'serez', 'seront',
  'serais', 'serait', 'serions', 'seriez', 'seraient',
  'sois', 'soit', 'soyons', 'soyez', 'soient',
  'fus', 'fut', 'fût', 'fûmes', 'fûtes', 'furent',
  'été',
  'ai', 'as', 'a', 'avons', 'avez', 'ont',
  'avais', 'avait', 'avions', 'aviez', 'avaient',
  'aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront',
  'aurais', 'aurait', 'aurions', 'auriez', 'auraient',
  'aie', 'aies', 'ait', 'ayons', 'ayez', 'aient',
  'eus', 'eut', 'eût', 'eûmes', 'eûtes', 'eurent',
  'eu',

  // ─── Adverbes de liaison / négation / degré ───
  'ne', 'pas', 'plus', 'point', 'jamais', 'guère',
  'très', 'trop', 'peu', 'assez', 'beaucoup', 'tant', 'autant',
  'aussi', 'si', 'bien', 'mal', 'mieux', 'pire',
  'encore', 'déjà', 'toujours', 'souvent',
  'puis', 'ensuite', 'enfin', 'cependant', 'pourtant',
  'néanmoins', 'toutefois', 'ainsi', 'aussi',
  'peut-être', 'sans doute',
  'non', 'oui',

  // ─── Divers grammaticaux ───
  'voici', 'voilà',
  'là', 'ici',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// MORPHOLOGICAL HEURISTICS (verb/adjective detection)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * French verb infinitive suffixes.
 * Also matches common conjugated endings.
 */
const VERB_PATTERNS: readonly RegExp[] = [
  // Infinitives
  /(?:er|ir|oir|re)$/,
  // Participes passés
  /(?:é|ée|és|ées|i|ie|is|ies|u|ue|us|ues|it|ite|its|ites)$/,
  // Conjugated: -ait, -aient, -ais (imparfait)
  /(?:ais|ait|aient|ions|iez)$/,
  // Present: -e, -ons, -ez (too ambiguous alone, skip)
  // Passé simple
  /(?:âmes|âtes|èrent|îmes|îtes|irent|ûmes|ûtes|urent)$/,
  // Future: -rai, -ras, -ra, -rons, -rez, -ront
  /(?:rai|ras|rons|rez|ront)$/,
  // Subjonctif: -asse, -isses
  /(?:asse|asses|ât|assions|assiez|assent)$/,
  // Gerondif
  /ant$/,
];

/**
 * French adjective suffixes (productive morphological patterns).
 */
const ADJECTIVE_SUFFIXES: readonly string[] = [
  'eux', 'euse', 'euses',
  'ible', 'ibles',
  'able', 'ables',
  'ique', 'iques',
  'iste', 'istes',
  'iel', 'ielle', 'iels', 'ielles',
  'aire', 'aires',
  'eux', 'euses',
  'if', 'ive', 'ifs', 'ives',
  'al', 'ale', 'als', 'ales', 'aux',
  'el', 'elle', 'els', 'elles',
  'eur', 'eure', // can be noun too
  'ien', 'ienne', 'iens', 'iennes',
  'ois', 'oise', 'aises',
  'eux', 'euse',
];

/**
 * Known verb forms that could be confused with adjectives.
 * These should be classified as verbs (participes présents used as verbs).
 */
const VERB_OVERRIDE: ReadonlySet<string> = new Set([
  'ayant', 'étant', 'faisant', 'disant', 'allant', 'venant',
  'prenant', 'mettant', 'voyant', 'sachant', 'pouvant', 'voulant',
  'devant', // preposition too, but handled by function words
]);

/**
 * Known adjectives that end in verb-like patterns.
 * These should be classified as adjectives.
 */
const ADJECTIVE_OVERRIDE: ReadonlySet<string> = new Set([
  'grand', 'grande', 'grands', 'grandes',
  'petit', 'petite', 'petits', 'petites',
  'bon', 'bonne', 'bons', 'bonnes',
  'mauvais', 'mauvaise',
  'beau', 'belle', 'beaux', 'belles',
  'nouveau', 'nouvelle', 'nouveaux', 'nouvelles',
  'vieux', 'vieille', 'vieilles',
  'jeune', 'jeunes',
  'long', 'longue', 'longs', 'longues',
  'court', 'courte', 'courts', 'courtes',
  'haut', 'haute', 'hauts', 'hautes',
  'bas', 'basse',
  'gros', 'grosse',
  'noir', 'noire', 'noirs', 'noires',
  'blanc', 'blanche', 'blancs', 'blanches',
  'rouge', 'rouges',
  'bleu', 'bleue', 'bleus', 'bleues',
  'vert', 'verte', 'verts', 'vertes',
  'jaune', 'jaunes',
  'gris', 'grise',
  'brun', 'brune', 'bruns', 'brunes',
  'clair', 'claire', 'clairs', 'claires',
  'sombre', 'sombres',
  'doux', 'douce',
  'dur', 'dure', 'durs', 'dures',
  'froid', 'froide', 'froids', 'froides',
  'chaud', 'chaude', 'chauds', 'chaudes',
  'plein', 'pleine', 'pleins', 'pleines',
  'vide', 'vides',
  'seul', 'seule', 'seuls', 'seules',
  'propre', 'propres',
  'pauvre', 'pauvres',
  'riche', 'riches',
  'fort', 'forte', 'forts', 'fortes',
  'léger', 'légère', 'légers', 'légères',
  'lourd', 'lourde', 'lourds', 'lourdes',
  'large', 'larges',
  'étroit', 'étroite',
  'profond', 'profonde', 'profonds', 'profondes',
  'immense', 'immenses',
  'vaste', 'vastes',
  'simple', 'simples',
  'double', 'doubles',
  'premier', 'première', 'premiers', 'premières',
  'dernier', 'dernière', 'derniers', 'dernières',
]);

/**
 * Classify a content word as verb, adjective, or noun_adverb.
 * Heuristic — not perfect, but deterministic and fast.
 */
function classifyContentWord(lower: string): 'verb' | 'adjective' | 'noun_adverb' {
  // Override checks first
  if (VERB_OVERRIDE.has(lower)) return 'verb';
  if (ADJECTIVE_OVERRIDE.has(lower)) return 'adjective';

  // Adjective suffix check
  for (const suffix of ADJECTIVE_SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 1) {
      return 'adjective';
    }
  }

  // Verb pattern check
  for (const pattern of VERB_PATTERNS) {
    if (pattern.test(lower) && lower.length > 3) {
      return 'verb';
    }
  }

  // Default: noun or content adverb
  return 'noun_adverb';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKENIZER
// ═══════════════════════════════════════════════════════════════════════════════

function tokenize(text: string): readonly string[] {
  const regex = /[a-zA-ZàâäéèêëïîôùûüÿœæçñÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇÑ][a-zA-ZàâäéèêëïîôùûüÿœæçñÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇÑ'''\-]*/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[0]);
  }
  return matches;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HD-D (HYPERGEOMETRIC DISTRIBUTION D — McCarthy & Jarvis 2007)
// ═══════════════════════════════════════════════════════════════════════════════

/** Seeded PRNG (Mulberry32) for deterministic sampling */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hypergeometric probability that a word type appears at least once
 * in a random sample of size sampleSize from a text of totalTokens tokens
 * where the type appears typeFreq times.
 *
 * P(X≥1) = 1 - P(X=0) = 1 - C(typeFreq,0)*C(N-typeFreq,n)/C(N,n)
 *
 * Simplified: P(X≥1) = 1 - ∏(i=0..n-1) (N-typeFreq-i)/(N-i)
 */
function hypergeomProbAtLeastOne(
  totalTokens: number,
  typeFreq: number,
  sampleSize: number,
): number {
  if (typeFreq >= totalTokens) return 1;
  if (sampleSize > totalTokens) return 1;
  if (typeFreq === 0) return 0;

  let probZero = 1;
  const nonType = totalTokens - typeFreq;

  for (let i = 0; i < sampleSize; i++) {
    probZero *= (nonType - i) / (totalTokens - i);
    if (probZero <= 0) return 1; // underflow → certain
  }

  return 1 - probZero;
}

/**
 * Compute HD-D (vocd-D approximation).
 *
 * For a given sample size, HD-D = average number of types expected
 * in a random sample, normalized to 0-1.
 *
 * HD-D = (1/Types) × Σ P(type_i appears in sample)
 *
 * This is equivalent to: expected_types_in_sample / sample_size
 *
 * @param tokens - all tokens (lowercased)
 * @param sampleSize - sample size (default 42, standard in vocd)
 * @returns HD-D score (0-1)
 */
function computeHDD(tokens: readonly string[], sampleSize: number = 42): number {
  if (tokens.length === 0) return 0;
  if (tokens.length <= 2) return 1; // trivially diverse

  const effectiveSample = Math.min(sampleSize, tokens.length);

  // Count frequencies
  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }

  // Sum probabilities that each type appears in a sample
  let sumProb = 0;
  for (const [, count] of freq) {
    sumProb += hypergeomProbAtLeastOne(tokens.length, count, effectiveSample);
  }

  // Normalize: expected types / sample size
  return sumProb / effectiveSample;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE SCORE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Composite density score (0-100). DIAGNOSTIC ONLY — not calibrated.
 *
 * Components:
 *   - Lexical density contribution (weight 0.4): LD mapped to 0-100
 *   - HD-D contribution (weight 0.4): HDD×100
 *   - VAR contribution (weight 0.2): capped at 2.0, mapped to 0-100
 *
 * All weights are SYMBOLS pending calibration.
 */
function computeDensityScore(ld: number, hdd: number, varRatio: number): number {
  // LD: 30% = bad, 50% = ok, 65% = excellent
  const ldScore = Math.min(100, Math.max(0, (ld - 30) / (65 - 30) * 100));

  // HDD: 0.5 = bad, 0.7 = ok, 0.9 = excellent
  const hddScore = Math.min(100, Math.max(0, (hdd - 0.5) / (0.9 - 0.5) * 100));

  // VAR: 0.5 = bad, 1.0 = ok, 2.0 = excellent
  const varScore = Math.min(100, Math.max(0, (Math.min(varRatio, 2.0) - 0.5) / (2.0 - 0.5) * 100));

  return Math.round(ldScore * 0.4 + hddScore * 0.4 + varScore * 0.2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze semantic density of French prose.
 *
 * @param text - French prose to analyze
 * @returns DensityAnalysis
 */
export function analyzeDensity(text: string): DensityAnalysis {
  if (!text || text.trim().length === 0) {
    return {
      lexicalDensity: 0,
      contentWords: 0,
      functionWords: 0,
      totalWords: 0,
      ttrRaw: 0,
      hdd: 0,
      uniqueWords: 0,
      verbCount: 0,
      adjectiveCount: 0,
      var: 0,
      densityScore: 0,
      classification: [],
    };
  }

  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return {
      lexicalDensity: 0,
      contentWords: 0,
      functionWords: 0,
      totalWords: 0,
      ttrRaw: 0,
      hdd: 0,
      uniqueWords: 0,
      verbCount: 0,
      adjectiveCount: 0,
      var: 0,
      densityScore: 0,
      classification: [],
    };
  }

  // ─── Classify words ───
  const classification: WordClass[] = [];
  let contentCount = 0;
  let functionCount = 0;
  let verbCount = 0;
  let adjectiveCount = 0;

  const lowerTokens: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase().replace(/['']/g, "'");
    lowerTokens.push(lower);

    // Strip apostrophe prefix (l', d', n', s', j', etc.)
    const stripped = lower.replace(/^[a-z]'/, '');

    if (FUNCTION_WORDS_FR.has(lower) || FUNCTION_WORDS_FR.has(stripped) ||
        (lower.length <= 2 && !lower.match(/[aàâ]/))) {
      // Function word (also catch very short words as likely function)
      // Exception: "à" is preposition (already in set)
      classification.push({ word: token, lower, type: 'function', subType: 'function' });
      functionCount++;
    } else {
      // Content word — sub-classify
      const subType = classifyContentWord(stripped.length > 0 ? stripped : lower);
      classification.push({ word: token, lower, type: 'content', subType });
      contentCount++;
      if (subType === 'verb') verbCount++;
      if (subType === 'adjective') adjectiveCount++;
    }
  }

  // ─── Metrics ───
  const totalWords = tokens.length;
  const lexicalDensity = totalWords > 0 ? (contentCount / totalWords) * 100 : 0;

  // TTR
  const uniqueSet = new Set(lowerTokens);
  const uniqueWords = uniqueSet.size;
  const ttrRaw = totalWords > 0 ? uniqueWords / totalWords : 0;

  // HD-D
  const hdd = computeHDD(lowerTokens);

  // VAR
  const varRatio = adjectiveCount > 0 ? verbCount / adjectiveCount : (verbCount > 0 ? Infinity : 0);

  // Composite
  const densityScore = computeDensityScore(
    lexicalDensity,
    hdd,
    varRatio === Infinity ? 2.0 : varRatio,
  );

  return {
    lexicalDensity: Math.round(lexicalDensity * 100) / 100,
    contentWords: contentCount,
    functionWords: functionCount,
    totalWords,
    ttrRaw: Math.round(ttrRaw * 1000) / 1000,
    hdd: Math.round(hdd * 1000) / 1000,
    uniqueWords,
    verbCount,
    adjectiveCount,
    var: varRatio === Infinity ? Infinity : Math.round(varRatio * 100) / 100,
    densityScore,
    classification,
  };
}
