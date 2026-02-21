/**
 * Voice Genome — 10 paramètres mesurables du style narratif
 * Invariant: ART-VOICE-01
 */

export interface VoiceGenome {
  // 10 paramètres mesurables, chacun ∈ [0, 1]
  phrase_length_mean: number;      // 0 = très court (5 mots), 1 = très long (40+ mots)
  dialogue_ratio: number;          // 0 = 0% dialogue, 1 = 100% dialogue
  metaphor_density: number;        // 0 = aucune métaphore, 1 = métaphore par phrase
  language_register: number;       // 0 = familier/argot, 1 = soutenu/littéraire
  irony_level: number;             // 0 = aucune ironie, 1 = ironie constante
  ellipsis_rate: number;           // 0 = phrases complètes, 1 = ellipses fréquentes
  abstraction_ratio: number;       // 0 = concret uniquement, 1 = très abstrait
  punctuation_style: number;       // 0 = minimal (. ,), 1 = expressif (! ? ; — …)
  paragraph_rhythm: number;        // 0 = paragraphes uniformes, 1 = très variés
  opening_variety: number;         // 0 = débuts répétitifs, 1 = chaque phrase commence différemment
}

export const DEFAULT_VOICE_GENOME: VoiceGenome = {
  phrase_length_mean: 0.5,
  dialogue_ratio: 0.3,
  metaphor_density: 0.4,
  language_register: 0.7,
  irony_level: 0.2,
  ellipsis_rate: 0.3,
  abstraction_ratio: 0.4,
  punctuation_style: 0.5,
  paragraph_rhythm: 0.6,
  opening_variety: 0.7,
};

/**
 * Voice Measure Calibration Profile — empirically sourced ranges.
 * INV-VOICE-CALIBRATION-01: All ranges sourced from corpus percentiles.
 */
export interface VoiceCalibrationProfile {
  readonly version: string;
  readonly language_register_range: readonly [number, number];   // syllableRatio normalize bounds
  readonly abstraction_ratio_range: readonly [number, number];   // abstractRatio normalize bounds
  readonly paragraph_rhythm_range: readonly [number, number];    // CV normalize bounds
  readonly phrase_length_range: readonly [number, number];       // avgWords normalize bounds
  readonly phrase_min_words_filter: number;                      // min words to count as sentence
}

/**
 * FR Narrative V2 — sourced from 9-text corpus (7 narrative + 2 expressive).
 * Calibration run: 2026-02-21, voice-calibration-raw.test.ts
 *
 * syllableRatio: P5=0.017 P95=0.133 → range [0.01, 0.15]
 * abstractRatio: P5=0.013 P95=0.083 → range [0.01, 0.10]
 * paragraphCV:   P5=0.000 P95=0.384 → range [0.00, 0.50]
 * avgWords:      P5=5.70  P95=10.00 → range [3, 25] (wider for LLM prose)
 */
export const FR_NARRATIVE_V2: VoiceCalibrationProfile = {
  version: 'fr_narrative_v2',
  language_register_range: [0.01, 0.15],
  abstraction_ratio_range: [0.01, 0.10],
  paragraph_rhythm_range: [0.00, 0.50],
  phrase_length_range: [3, 25],
  phrase_min_words_filter: 3,
} as const;

/**
 * V1 Legacy profile — original ranges (for backward compat / audit).
 */
export const V1_LEGACY_PROFILE: VoiceCalibrationProfile = {
  version: 'v1_legacy',
  language_register_range: [0.10, 0.40],
  abstraction_ratio_range: [0.05, 0.25],
  paragraph_rhythm_range: [0.00, 1.00],
  phrase_length_range: [5, 40],
  phrase_min_words_filter: 0,  // no filter in V1
} as const;

/** Current active profile */
export const ACTIVE_PROFILE: VoiceCalibrationProfile = FR_NARRATIVE_V2;

/**
 * LEGACY — V1 measureVoice (frozen, bit-identical to pre-V2 behavior).
 * Used for backward compatibility and audit comparison.
 * INV-VOICE-LEGACY-01: Output must be bit-identical to original measureVoice.
 */
export function measureVoiceLegacy(prose: string): VoiceGenome {
  if (!prose || prose.trim().length === 0) {
    return DEFAULT_VOICE_GENOME;
  }

  const sentences = splitSentences(prose);
  const paragraphs = prose.split(/\n\n+/).filter(p => p.trim().length > 0);
  const words = prose.split(/\s+/).filter(w => w.length > 0);

  if (sentences.length === 0) {
    return DEFAULT_VOICE_GENOME;
  }

  const avgWordsPerSentence = words.length / sentences.length;
  const phrase_length_mean = normalize(avgWordsPerSentence, 5, 40);

  const dialoguePattern = /[«»""„"'']|^[\s]*[-—]/m;
  const linesWithDialogue = prose.split('\n').filter(line => dialoguePattern.test(line)).length;
  const totalLines = prose.split('\n').length;
  const dialogue_ratio = totalLines > 0 ? linesWithDialogue / totalLines : 0;

  const metaphorKeywords = /\b(comme|tel|telle|semblable|pareil|pareille|ressembl|évoque|rappelle)\b/gi;
  const metaphorMatches = (prose.match(metaphorKeywords) || []).length;
  const metaphor_density = normalize(metaphorMatches / sentences.length, 0, 1);

  const longWords = words.filter(w => estimateSyllables(w) > 3).length;
  const language_register = normalize(longWords / words.length, 0.1, 0.4);

  const negativeExclamations = (prose.match(/\b(ne|n'|pas|jamais|rien|aucun)[^.!?]*!/gi) || []).length;
  const irony_level = normalize(negativeExclamations / sentences.length, 0, 0.3);

  const shortSentences = sentences.filter(s => s.split(/\s+/).length < 4).length;
  const ellipsis_rate = shortSentences / sentences.length;

  const abstractPattern = /(tion|ment|ité|ence|ance|esse|eur|age)\b/gi;
  const abstractWords = (prose.match(abstractPattern) || []).length;
  const abstraction_ratio = normalize(abstractWords / words.length, 0.05, 0.25);

  const expressivePunct = (prose.match(/[!?;—…]/g) || []).length;
  const totalPunct = (prose.match(/[.!?,;:—…]/g) || []).length;
  const punctuation_style = totalPunct > 0 ? expressivePunct / totalPunct : 0;

  if (paragraphs.length < 2) {
    return {
      phrase_length_mean, dialogue_ratio, metaphor_density, language_register,
      irony_level, ellipsis_rate, abstraction_ratio, punctuation_style,
      paragraph_rhythm: 0.5, opening_variety: 0.5,
    };
  }
  const paraLengths = paragraphs.map(p => p.split(/\s+/).length);
  const meanParaLength = paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length;
  const variance = paraLengths.reduce((sum, len) => sum + Math.pow(len - meanParaLength, 2), 0) / paraLengths.length;
  const stdDev = Math.sqrt(variance);
  const coeffVar = meanParaLength > 0 ? stdDev / meanParaLength : 0;
  const paragraph_rhythm = normalize(coeffVar, 0, 1);

  const firstWords = sentences.map(s => {
    const words = s.trim().split(/\s+/);
    return words[0] ? words[0].toLowerCase().replace(/[^a-zàâäçéèêëïîôùûü]/gi, '') : '';
  }).filter(w => w.length > 0);
  const uniqueFirstWords = new Set(firstWords).size;
  const opening_variety = firstWords.length > 0 ? uniqueFirstWords / firstWords.length : 0;

  return {
    phrase_length_mean, dialogue_ratio, metaphor_density, language_register,
    irony_level, ellipsis_rate, abstraction_ratio, punctuation_style,
    paragraph_rhythm, opening_variety,
  };
}

/**
 * V2 measureVoice — calibrated with empirically sourced ranges.
 * INV-VOICE-V2-01: All normalize ranges sourced from corpus percentiles (voice-calibration-raw.test.ts).
 *
 * Changes from V1:
 * - language_register: range [0.01, 0.15] (was [0.10, 0.40]) — FR prose syllableRatio P5-P95
 * - abstraction_ratio: range [0.01, 0.10] (was [0.05, 0.25]) — FR prose abstractRatio P5-P95
 * - paragraph_rhythm: range [0.00, 0.50] (was [0.00, 1.00]) — CV never exceeds 0.40 in practice
 * - phrase_length_mean: filter sentences <3 words, range [3, 25] (was [5, 40]) — avoids micro-phrase contamination
 * - All other params: unchanged
 */
export function measureVoice(prose: string, profile: VoiceCalibrationProfile = ACTIVE_PROFILE): VoiceGenome {
  if (!prose || prose.trim().length === 0) {
    return DEFAULT_VOICE_GENOME;
  }

  const sentences = splitSentences(prose);
  const paragraphs = prose.split(/\n\n+/).filter(p => p.trim().length > 0);
  const words = prose.split(/\s+/).filter(w => w.length > 0);

  if (sentences.length === 0) {
    return DEFAULT_VOICE_GENOME;
  }

  // 1. phrase_length_mean: V2 filters micro-sentences (<3 words), uses calibrated range
  const filteredSentences = profile.phrase_min_words_filter > 0
    ? sentences.filter(s => s.split(/\s+/).length >= profile.phrase_min_words_filter)
    : sentences;
  const effectiveSentences = filteredSentences.length > 0 ? filteredSentences : sentences;
  const avgWords = effectiveSentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / effectiveSentences.length;
  const phrase_length_mean = normalize(avgWords, profile.phrase_length_range[0], profile.phrase_length_range[1]);

  // 2. dialogue_ratio: unchanged
  const dialoguePattern = /[«»""„"'']|^[\s]*[-—]/m;
  const linesWithDialogue = prose.split('\n').filter(line => dialoguePattern.test(line)).length;
  const totalLines = prose.split('\n').length;
  const dialogue_ratio = totalLines > 0 ? linesWithDialogue / totalLines : 0;

  // 3. metaphor_density: unchanged
  const metaphorKeywords = /\b(comme|tel|telle|semblable|pareil|pareille|ressembl|évoque|rappelle)\b/gi;
  const metaphorMatches = (prose.match(metaphorKeywords) || []).length;
  const metaphor_density = normalize(metaphorMatches / sentences.length, 0, 1);

  // 4. language_register: V2 calibrated range [0.01, 0.15]
  const longWords = words.filter(w => estimateSyllables(w) > 3).length;
  const language_register = normalize(longWords / words.length, profile.language_register_range[0], profile.language_register_range[1]);

  // 5. irony_level: unchanged
  const negativeExclamations = (prose.match(/\b(ne|n'|pas|jamais|rien|aucun)[^.!?]*!/gi) || []).length;
  const irony_level = normalize(negativeExclamations / sentences.length, 0, 0.3);

  // 6. ellipsis_rate: unchanged
  const shortSentences = sentences.filter(s => s.split(/\s+/).length < 4).length;
  const ellipsis_rate = shortSentences / sentences.length;

  // 7. abstraction_ratio: V2 calibrated range [0.01, 0.10]
  const abstractPattern = /(tion|ment|ité|ence|ance|esse|eur|age)\b/gi;
  const abstractWords = (prose.match(abstractPattern) || []).length;
  const abstraction_ratio = normalize(abstractWords / words.length, profile.abstraction_ratio_range[0], profile.abstraction_ratio_range[1]);

  // 8. punctuation_style: unchanged (measurement correct; drift handled by target/exclusion)
  const expressivePunct = (prose.match(/[!?;—…]/g) || []).length;
  const totalPunct = (prose.match(/[.!?,;:—…]/g) || []).length;
  const punctuation_style = totalPunct > 0 ? expressivePunct / totalPunct : 0;

  // 9. paragraph_rhythm: V2 calibrated range [0.00, 0.50]
  if (paragraphs.length < 2) {
    return {
      phrase_length_mean, dialogue_ratio, metaphor_density, language_register,
      irony_level, ellipsis_rate, abstraction_ratio, punctuation_style,
      paragraph_rhythm: 0.5, opening_variety: 0.5,
    };
  }
  const paraLengths = paragraphs.map(p => p.split(/\s+/).length);
  const meanParaLength = paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length;
  const variance = paraLengths.reduce((sum, len) => sum + Math.pow(len - meanParaLength, 2), 0) / paraLengths.length;
  const stdDev = Math.sqrt(variance);
  const coeffVar = meanParaLength > 0 ? stdDev / meanParaLength : 0;
  const paragraph_rhythm = normalize(coeffVar, profile.paragraph_rhythm_range[0], profile.paragraph_rhythm_range[1]);

  // 10. opening_variety: unchanged
  const firstWords = sentences.map(s => {
    const w = s.trim().split(/\s+/);
    return w[0] ? w[0].toLowerCase().replace(/[^a-zàâäçéèêëïîôùûü]/gi, '') : '';
  }).filter(w => w.length > 0);
  const uniqueFirstWords = new Set(firstWords).size;
  const opening_variety = firstWords.length > 0 ? uniqueFirstWords / firstWords.length : 0;

  return {
    phrase_length_mean, dialogue_ratio, metaphor_density, language_register,
    irony_level, ellipsis_rate, abstraction_ratio, punctuation_style,
    paragraph_rhythm, opening_variety,
  };
}

/**
 * Params excluded from drift calculation — structurally unreliable heuristics.
 * INV-VOICE-DRIFT-01: Non-applicable params do not contribute to drift RMS.
 *
 * - irony_level: heuristic "negation + !" returns ~0 always → permanent drift
 * - metaphor_density: keyword matching catches only comparative metaphors → misses 75%+
 * - dialogue_ratio: scene-dependent, narrative scenes penalized for being narrative
 * - punctuation_style: narrative prose = 0% expressive punct, target 0.50 = permanent 0.50 diff
 *
 * These params are still MEASURED and LOGGED, but excluded from the scoring drift.
 */
export const NON_APPLICABLE_VOICE_PARAMS: ReadonlySet<keyof VoiceGenome> = new Set([
  'irony_level',
  'metaphor_density',
  'dialogue_ratio',
  'punctuation_style',
]);

/**
 * Calculer le drift entre 2 genomes
 * @param excludeParams - params to exclude from drift RMS (still reported in per_param)
 */
export function computeVoiceDrift(
  target: VoiceGenome,
  actual: VoiceGenome,
  excludeParams: ReadonlySet<keyof VoiceGenome> = new Set(),
): {
  drift: number;           // 0-1, distance euclidienne normalisée
  per_param: Record<keyof VoiceGenome, number>;  // drift par paramètre (ALL params)
  conforming: boolean;     // drift < 0.10
  n_applicable: number;    // number of params used in drift calc
  excluded: readonly (keyof VoiceGenome)[];  // params excluded from drift
} {
  const params: (keyof VoiceGenome)[] = [
    'phrase_length_mean',
    'dialogue_ratio',
    'metaphor_density',
    'language_register',
    'irony_level',
    'ellipsis_rate',
    'abstraction_ratio',
    'punctuation_style',
    'paragraph_rhythm',
    'opening_variety',
  ];

  const per_param: Record<keyof VoiceGenome, number> = {} as any;
  let sumSquares = 0;
  let nApplicable = 0;
  const excluded: (keyof VoiceGenome)[] = [];

  for (const param of params) {
    const diff = Math.abs(target[param] - actual[param]);
    per_param[param] = diff;

    if (excludeParams.has(param)) {
      excluded.push(param);
    } else {
      sumSquares += diff * diff;
      nApplicable++;
    }
  }

  // Distance euclidienne normalisée sur params applicables uniquement
  const drift = nApplicable > 0 ? Math.sqrt(sumSquares / nApplicable) : 0;
  const conforming = drift < 0.10;

  return {
    drift,
    per_param,
    conforming,
    n_applicable: nApplicable,
    excluded,
  };
}

/**
 * Vérifie si un genome généré respecte le genome cible.
 * Tolérance = ±tolerance par paramètre (default 0.10).
 */
export function checkGenomeConformity(
  generated: VoiceGenome,
  target: VoiceGenome,
  tolerance: number = 0.10
): {
  readonly conformity_score: number;  // [0, 100]
  readonly violations: readonly { param: string; expected: number; actual: number; delta_pct: number }[];
} {
  const driftResult = computeVoiceDrift(target, generated);
  const conformity_score = Math.max(0, Math.min(100, (1 - driftResult.drift) * 100));

  const violations: { param: string; expected: number; actual: number; delta_pct: number }[] = [];
  const params = Object.keys(driftResult.per_param) as (keyof VoiceGenome)[];

  for (const param of params) {
    if (driftResult.per_param[param] > tolerance) {
      violations.push({
        param,
        expected: target[param],
        actual: generated[param],
        delta_pct: driftResult.per_param[param] * 100,
      });
    }
  }

  return { conformity_score, violations };
}

/**
 * Score de cohérence vocale [0, 100].
 *
 * Mode ORIGINAL : découper la prose en 3 tiers, mesurer le genome de chaque,
 * calculer les distances entre paires, score = 100 × (1 - avg_drift).
 *
 * Mode CONTINUATION : mesurer le genome de la prose et le comparer au target.
 * Si mode continuation et pas de target_genome → throw Error.
 */
export function scoreVoiceConsistency(
  prose: string,
  mode: 'original' | 'continuation',
  target_genome?: VoiceGenome
): number {
  if (mode === 'continuation') {
    if (!target_genome) {
      throw new Error('scoreVoiceConsistency: mode continuation requires target_genome');
    }
    const actual = measureVoice(prose);
    const result = checkGenomeConformity(actual, target_genome);
    return result.conformity_score;
  }

  // Mode original: internal consistency across 3 tiers
  const paragraphs = prose.split(/\n\n+/).filter(p => p.trim().length > 0);
  let tiers: string[];

  if (paragraphs.length >= 3) {
    const third = Math.ceil(paragraphs.length / 3);
    tiers = [
      paragraphs.slice(0, third).join('\n\n'),
      paragraphs.slice(third, third * 2).join('\n\n'),
      paragraphs.slice(third * 2).join('\n\n'),
    ];
  } else {
    // Less than 3 paragraphs: split by characters
    const len = prose.length;
    const third = Math.ceil(len / 3);
    tiers = [
      prose.slice(0, third),
      prose.slice(third, third * 2),
      prose.slice(third * 2),
    ];
  }

  // Filter out empty tiers
  tiers = tiers.filter(t => t.trim().length > 0);
  if (tiers.length < 2) {
    // Not enough content to compare — return neutral score
    return 70;
  }

  const genomes = tiers.map(t => measureVoice(t));

  // Compute pairwise drifts
  const drifts: number[] = [];
  for (let i = 0; i < genomes.length; i++) {
    for (let j = i + 1; j < genomes.length; j++) {
      drifts.push(computeVoiceDrift(genomes[i], genomes[j]).drift);
    }
  }

  const avgDrift = drifts.reduce((a, b) => a + b, 0) / drifts.length;
  return Math.max(0, Math.min(100, (1 - avgDrift) * 100));
}

// --- Helpers ---

function splitSentences(prose: string): string[] {
  return prose
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  const normalized = (value - min) / (max - min);
  return Math.max(0, Math.min(1, normalized));
}

function estimateSyllables(word: string): number {
  // Heuristique simple: compte les groupes de voyelles
  const vowelGroups = word.toLowerCase().match(/[aeiouyàâäéèêëïîôùûü]+/g);
  return vowelGroups ? vowelGroups.length : 1;
}
