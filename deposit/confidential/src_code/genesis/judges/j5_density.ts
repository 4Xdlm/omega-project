// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — J5 DENSITY (Content Quality)
// ═══════════════════════════════════════════════════════════════════════════════
// Content ratio, filler ratio, redundancy detection
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Draft,
  GenesisConfig,
  JudgeScore,
  FillerList,
  StopwordsList,
} from '../core/types';

/**
 * Liste de fillers integree
 */
const BUILTIN_FILLERS: FillerList = {
  version: '1.0',
  fillers: [
    'very', 'really', 'quite', 'just', 'actually', 'basically',
    'literally', 'simply', 'totally', 'absolutely', 'completely',
    'definitely', 'certainly', 'probably', 'possibly', 'perhaps',
    'maybe', 'somewhat', 'rather', 'fairly', 'pretty',
    'kind of', 'sort of', 'you know', 'i mean', 'like',
    'so', 'well', 'anyway', 'anyhow', 'honestly',
  ],
};

/**
 * Liste de stopwords integree
 */
const BUILTIN_STOPWORDS: StopwordsList = {
  version: '1.0',
  stopwords: [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
    'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 's', 't', 'just', 'don', 'now',
  ],
};

/**
 * Evalue la densite de contenu d'un draft
 */
export function evaluateDensity(
  draft: Draft,
  config: GenesisConfig
): JudgeScore {
  const text = draft.text.toLowerCase();
  const metrics: Record<string, number> = {};
  const thresholds = config.judges.density;

  // 1. Calculer le ratio de contenu (mots non-stopwords)
  const contentRatio = computeContentRatio(text);
  metrics['content_ratio'] = contentRatio;

  // 2. Calculer le ratio de fillers
  const fillerRatio = computeFillerRatio(text);
  metrics['filler_ratio'] = fillerRatio;

  // 3. Calculer le ratio de redondance
  const redundancyRatio = computeRedundancy(text);
  metrics['redundancy_ratio'] = redundancyRatio;

  // 4. Metriques additionnelles
  const words = text.split(/\s+/).filter(w => w.length > 0);
  metrics['word_count'] = words.length;
  metrics['unique_word_ratio'] = new Set(words).size / (words.length || 1);

  // 5. Evaluer le verdict
  const pass =
    contentRatio >= thresholds.MIN_CONTENT_RATIO &&
    fillerRatio <= thresholds.MAX_FILLER_RATIO &&
    redundancyRatio <= thresholds.MAX_REDUNDANCY_RATIO;

  return {
    verdict: pass ? 'PASS' : 'FAIL',
    metrics,
    threshold: {
      MIN_CONTENT_RATIO: thresholds.MIN_CONTENT_RATIO,
      MAX_FILLER_RATIO: thresholds.MAX_FILLER_RATIO,
      MAX_REDUNDANCY_RATIO: thresholds.MAX_REDUNDANCY_RATIO,
    },
    details: pass
      ? undefined
      : `Failed: content=${contentRatio.toFixed(3)} (min ${thresholds.MIN_CONTENT_RATIO}), ` +
        `filler=${fillerRatio.toFixed(3)} (max ${thresholds.MAX_FILLER_RATIO}), ` +
        `redundancy=${redundancyRatio.toFixed(3)} (max ${thresholds.MAX_REDUNDANCY_RATIO})`,
  };
}

/**
 * Calcule le ratio de mots de contenu (non-stopwords)
 */
function computeContentRatio(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;

  const stopwordsSet = new Set(BUILTIN_STOPWORDS.stopwords);
  let contentWords = 0;

  for (const word of words) {
    // Nettoyer la ponctuation
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord.length > 0 && !stopwordsSet.has(cleanWord)) {
      contentWords++;
    }
  }

  return contentWords / words.length;
}

/**
 * Calcule le ratio de fillers
 */
function computeFillerRatio(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;

  const fillersSet = new Set(BUILTIN_FILLERS.fillers);
  let fillerCount = 0;

  // Single-word fillers
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (fillersSet.has(cleanWord)) {
      fillerCount++;
    }
  }

  // Multi-word fillers
  const multiWordFillers = BUILTIN_FILLERS.fillers.filter(f => f.includes(' '));
  for (const filler of multiWordFillers) {
    let idx = 0;
    while ((idx = text.indexOf(filler, idx)) !== -1) {
      fillerCount++;
      idx += filler.length;
    }
  }

  return fillerCount / words.length;
}

/**
 * Calcule le ratio de redondance (repetitions de mots/phrases)
 */
function computeRedundancy(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= 1) return 0;

  // Compter les mots repetes (hors stopwords)
  const stopwordsSet = new Set(BUILTIN_STOPWORDS.stopwords);
  const wordCounts = new Map<string, number>();
  let contentWordCount = 0;

  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord.length > 2 && !stopwordsSet.has(cleanWord)) {
      wordCounts.set(cleanWord, (wordCounts.get(cleanWord) || 0) + 1);
      contentWordCount++;
    }
  }

  if (contentWordCount === 0) return 0;

  // Calculer les repetitions (occurrences - 1 pour chaque mot repete)
  let redundantCount = 0;
  for (const count of wordCounts.values()) {
    if (count > 1) {
      redundantCount += count - 1;
    }
  }

  return redundantCount / contentWordCount;
}

export default evaluateDensity;
