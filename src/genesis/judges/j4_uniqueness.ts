// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — J4 UNIQUENESS (Originality)
// ═══════════════════════════════════════════════════════════════════════════════
// N-gram overlap avec corpus de reference, detection plagiat
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Draft,
  GenesisConfig,
  JudgeScore,
  CorpusRef,
} from '../core/types';

/**
 * Corpus de reference integre (version minimale)
 * TODO: Charger depuis artifacts/corpus_ref_v1.json.gz
 */
const BUILTIN_CORPUS: CorpusRef = {
  version: '1.0',
  ngrams: {
    '2': [
      'the quick', 'quick brown', 'brown fox', 'fox jumps',
      'jumps over', 'over the', 'the lazy', 'lazy dog',
    ],
    '3': [
      'the quick brown', 'quick brown fox', 'brown fox jumps',
      'fox jumps over', 'jumps over the', 'over the lazy', 'the lazy dog',
    ],
    '4': [
      'the quick brown fox', 'quick brown fox jumps',
      'brown fox jumps over', 'fox jumps over the',
      'jumps over the lazy', 'over the lazy dog',
    ],
  },
};

/**
 * Evalue l'unicite d'un draft (originalite vs corpus)
 */
export function evaluateUniqueness(
  draft: Draft,
  config: GenesisConfig
): JudgeScore {
  const text = draft.text.toLowerCase();
  const metrics: Record<string, number> = {};
  const thresholds = config.judges.uniqueness;

  // 1. Calculer les n-grams du texte
  const textNgrams2 = extractNgrams(text, 2);
  const textNgrams3 = extractNgrams(text, 3);
  const textNgrams4 = extractNgrams(text, 4);

  // 2. Calculer l'overlap avec le corpus
  const overlap2 = calculateOverlap(textNgrams2, new Set(BUILTIN_CORPUS.ngrams['2']));
  const overlap3 = calculateOverlap(textNgrams3, new Set(BUILTIN_CORPUS.ngrams['3']));
  const overlap4 = calculateOverlap(textNgrams4, new Set(BUILTIN_CORPUS.ngrams['4']));

  // Moyenne ponderee (plus de poids aux n-grams longs)
  const weightedOverlap = (overlap2 * 0.2 + overlap3 * 0.3 + overlap4 * 0.5);

  metrics['ngram_2_overlap'] = overlap2;
  metrics['ngram_3_overlap'] = overlap3;
  metrics['ngram_4_overlap'] = overlap4;
  metrics['weighted_overlap'] = weightedOverlap;

  // 3. Trouver le plus long span exact
  const maxExactSpan = findMaxExactSpan(text, BUILTIN_CORPUS);
  metrics['max_exact_span'] = maxExactSpan;

  // 4. Evaluer le verdict
  const pass =
    weightedOverlap <= thresholds.MAX_NGRAM_OVERLAP_RATIO &&
    maxExactSpan <= thresholds.MAX_EXACT_SPAN_LENGTH;

  return {
    verdict: pass ? 'PASS' : 'FAIL',
    metrics,
    threshold: {
      MAX_NGRAM_OVERLAP_RATIO: thresholds.MAX_NGRAM_OVERLAP_RATIO,
      MAX_EXACT_SPAN_LENGTH: thresholds.MAX_EXACT_SPAN_LENGTH,
    },
    details: pass
      ? undefined
      : `Failed: overlap=${weightedOverlap.toFixed(3)} (max ${thresholds.MAX_NGRAM_OVERLAP_RATIO}), ` +
        `max_span=${maxExactSpan} (max ${thresholds.MAX_EXACT_SPAN_LENGTH})`,
  };
}

/**
 * Extrait les n-grams d'un texte
 */
function extractNgrams(text: string, n: number): Set<string> {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const ngrams = new Set<string>();

  for (let i = 0; i <= words.length - n; i++) {
    const ngram = words.slice(i, i + n).join(' ');
    ngrams.add(ngram);
  }

  return ngrams;
}

/**
 * Calcule le ratio d'overlap entre deux sets de n-grams
 */
function calculateOverlap(textNgrams: Set<string>, corpusNgrams: Set<string>): number {
  if (textNgrams.size === 0) return 0;

  let overlap = 0;
  for (const ngram of textNgrams) {
    if (corpusNgrams.has(ngram)) {
      overlap++;
    }
  }

  return overlap / textNgrams.size;
}

/**
 * Trouve la longueur du plus long span exact commun avec le corpus
 */
function findMaxExactSpan(text: string, corpus: CorpusRef): number {
  let maxLength = 0;

  // Combiner tous les n-grams du corpus en un texte searchable
  const corpusTexts: string[] = [];
  for (const ngramList of Object.values(corpus.ngrams)) {
    corpusTexts.push(...ngramList);
  }

  // Pour chaque position dans le texte, trouver le plus long match
  const words = text.split(/\s+/).filter(w => w.length > 0);

  for (let i = 0; i < words.length; i++) {
    for (let len = 1; len <= words.length - i; len++) {
      const span = words.slice(i, i + len).join(' ');

      // Verifier si ce span existe dans le corpus
      const found = corpusTexts.some(ct => ct.includes(span));

      if (found) {
        const charLength = span.length;
        if (charLength > maxLength) {
          maxLength = charLength;
        }
      }
    }
  }

  return maxLength;
}

export default evaluateUniqueness;
