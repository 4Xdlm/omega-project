// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — J7 ANTI-GAMING (Authenticity)
// ═══════════════════════════════════════════════════════════════════════════════
// Detection de gaming: tokens rares artificiels, neologismes, lisibilité
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Draft,
  GenesisConfig,
  JudgeScore,
} from '../core/types';

/**
 * Liste de mots courants pour calculer la rarete
 */
const COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  // Extended common words
  'was', 'were', 'been', 'being', 'has', 'had', 'having', 'does', 'did', 'doing',
  'said', 'says', 'saying', 'went', 'goes', 'going', 'got', 'getting', 'made', 'making',
  'came', 'comes', 'coming', 'took', 'takes', 'taking', 'saw', 'sees', 'seeing',
  'knew', 'knows', 'knowing', 'thought', 'thinks', 'thinking', 'found', 'finds', 'finding',
  'through', 'down', 'should', 'very', 'still', 'here', 'before', 'between', 'long',
  'little', 'never', 'while', 'where', 'much', 'right', 'same', 'another', 'always',
]);

/**
 * Suffixes de neologismes suspects
 */
const SUSPICIOUS_PATTERNS = [
  /\w{3,}ify\b/gi,        // verbification excessive
  /\w{3,}ization\b/gi,    // nominalization excessive
  /\w{3,}esque\b/gi,      // adjectivization
  /\w{3,}oid\b/gi,        // sci-fi words
  /\w{3,}tron\b/gi,       // tech words
  /\w{3,}plex\b/gi,       // complex words
];

/**
 * Evalue l'authenticite d'un draft (anti-gaming)
 */
export function evaluateAntiGaming(
  draft: Draft,
  config: GenesisConfig
): JudgeScore {
  const text = draft.text;
  const metrics: Record<string, number> = {};
  const thresholds = config.judges.antiGaming;

  // 1. Calculer le ratio de tokens rares
  const rareTokenRatio = computeRareTokenRatio(text);
  metrics['rare_token_ratio'] = rareTokenRatio;

  // 2. Calculer le ratio de neologismes
  const neologismsRatio = computeNeologismsRatio(text);
  metrics['neologisms_ratio'] = neologismsRatio;

  // 3. Calculer le score de lisibilite (Flesch-Kincaid approxime)
  const readabilityScore = computeReadability(text);
  metrics['readability_score'] = readabilityScore;

  // 4. Calculer la profondeur syntaxique moyenne
  const syntaxDepth = computeSyntaxDepth(text);
  metrics['syntax_depth_avg'] = syntaxDepth;

  // 5. Metriques additionnelles
  metrics['avg_word_length'] = computeAvgWordLength(text);
  metrics['long_word_ratio'] = computeLongWordRatio(text);

  // 6. Evaluer le verdict
  const rareInBand = rareTokenRatio >= thresholds.RARE_TOKEN_BAND[0] &&
                     rareTokenRatio <= thresholds.RARE_TOKEN_BAND[1];
  const pass =
    rareInBand &&
    neologismsRatio <= thresholds.MAX_NEOLOGISMS_RATIO &&
    readabilityScore >= thresholds.MIN_READABILITY_SCORE &&
    syntaxDepth >= thresholds.MIN_SYNTAX_DEPTH_AVG;

  return {
    verdict: pass ? 'PASS' : 'FAIL',
    metrics,
    threshold: {
      RARE_TOKEN_BAND_MIN: thresholds.RARE_TOKEN_BAND[0],
      RARE_TOKEN_BAND_MAX: thresholds.RARE_TOKEN_BAND[1],
      MAX_NEOLOGISMS_RATIO: thresholds.MAX_NEOLOGISMS_RATIO,
      MIN_READABILITY_SCORE: thresholds.MIN_READABILITY_SCORE,
      MIN_SYNTAX_DEPTH_AVG: thresholds.MIN_SYNTAX_DEPTH_AVG,
    },
    details: pass
      ? undefined
      : `Failed: rare_ratio=${rareTokenRatio.toFixed(3)} (band [${thresholds.RARE_TOKEN_BAND[0]}, ${thresholds.RARE_TOKEN_BAND[1]}]), ` +
        `neologisms=${neologismsRatio.toFixed(3)} (max ${thresholds.MAX_NEOLOGISMS_RATIO}), ` +
        `readability=${readabilityScore.toFixed(1)} (min ${thresholds.MIN_READABILITY_SCORE}), ` +
        `syntax_depth=${syntaxDepth.toFixed(2)} (min ${thresholds.MIN_SYNTAX_DEPTH_AVG})`,
  };
}

/**
 * Calcule le ratio de tokens rares (non dans liste commune)
 */
function computeRareTokenRatio(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;

  let rareCount = 0;
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord.length > 2 && !COMMON_WORDS.has(cleanWord)) {
      rareCount++;
    }
  }

  return rareCount / words.length;
}

/**
 * Calcule le ratio de neologismes (mots suspects)
 */
function computeNeologismsRatio(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;

  let neologismCount = 0;

  // Verifier les patterns suspects
  for (const pattern of SUSPICIOUS_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      neologismCount += matches.length;
    }
  }

  // Verifier les mots anormalement longs (>15 chars)
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord.length > 15) {
      neologismCount++;
    }
  }

  return neologismCount / words.length;
}

/**
 * Calcule le score de lisibilite Flesch-Kincaid approxime
 * Score = 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
 */
function computeReadability(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);

  if (sentences.length === 0 || words.length === 0) return 0;

  // Estimer les syllabes (heuristique simple)
  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllables(word);
  }

  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = totalSyllables / words.length;

  // Flesch Reading Ease
  const score = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord);

  // Clamp to [0, 100]
  return Math.max(0, Math.min(100, score));
}

/**
 * Compte approximativement les syllabes d'un mot
 */
function countSyllables(word: string): number {
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleanWord.length <= 3) return 1;

  // Compter les voyelles comme proxy pour les syllabes
  const vowels = cleanWord.match(/[aeiouy]+/g);
  let count = vowels ? vowels.length : 1;

  // Ajustements
  if (cleanWord.endsWith('e') && count > 1) count--;
  if (cleanWord.endsWith('le') && cleanWord.length > 2 && !/[aeiouy]/.test(cleanWord[cleanWord.length - 3])) count++;

  return Math.max(1, count);
}

/**
 * Calcule la profondeur syntaxique moyenne
 * Heuristique: basee sur la structure des phrases (virgules, propositions)
 */
function computeSyntaxDepth(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;

  let totalDepth = 0;

  for (const sentence of sentences) {
    let depth = 1;

    // Compter les virgules (indicateurs de clauses)
    const commas = (sentence.match(/,/g) || []).length;
    depth += commas * 0.5;

    // Compter les conjonctions subordinantes
    const subordinators = ['because', 'although', 'while', 'when', 'if', 'unless', 'until', 'after', 'before', 'since', 'though'];
    for (const sub of subordinators) {
      if (sentence.toLowerCase().includes(sub)) {
        depth += 0.5;
      }
    }

    // Compter les propositions relatives
    const relatives = ['which', 'who', 'whom', 'whose', 'that', 'where'];
    for (const rel of relatives) {
      const regex = new RegExp(`\\b${rel}\\b`, 'gi');
      const matches = sentence.match(regex);
      if (matches) {
        depth += matches.length * 0.3;
      }
    }

    totalDepth += depth;
  }

  return totalDepth / sentences.length;
}

/**
 * Calcule la longueur moyenne des mots
 */
function computeAvgWordLength(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;

  const totalLength = words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, '').length, 0);
  return totalLength / words.length;
}

/**
 * Calcule le ratio de mots longs (>8 chars)
 */
function computeLongWordRatio(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;

  let longCount = 0;
  for (const word of words) {
    if (word.replace(/[^a-zA-Z]/g, '').length > 8) {
      longCount++;
    }
  }

  return longCount / words.length;
}

export default evaluateAntiGaming;
