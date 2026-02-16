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
 * Mesurer les paramètres voix d'une prose existante (CALC déterministe)
 */
export function measureVoice(prose: string): VoiceGenome {
  if (!prose || prose.trim().length === 0) {
    return DEFAULT_VOICE_GENOME;
  }

  const sentences = splitSentences(prose);
  const paragraphs = prose.split(/\n\n+/).filter(p => p.trim().length > 0);
  const words = prose.split(/\s+/).filter(w => w.length > 0);

  if (sentences.length === 0) {
    return DEFAULT_VOICE_GENOME;
  }

  // 1. phrase_length_mean: moyenne mots/phrase, normalisé [5..40] → [0..1]
  const avgWordsPerSentence = words.length / sentences.length;
  const phrase_length_mean = normalize(avgWordsPerSentence, 5, 40);

  // 2. dialogue_ratio: ratio lignes contenant guillemets/tirets dialogue
  const dialoguePattern = /[«»""„"'']|^[\s]*[-—]/m;
  const linesWithDialogue = prose.split('\n').filter(line => dialoguePattern.test(line)).length;
  const totalLines = prose.split('\n').length;
  const dialogue_ratio = totalLines > 0 ? linesWithDialogue / totalLines : 0;

  // 3. metaphor_density: heuristique simple (mots comparaison: comme, tel, semblable, pareil, etc.)
  const metaphorKeywords = /\b(comme|tel|telle|semblable|pareil|pareille|ressembl|évoque|rappelle)\b/gi;
  const metaphorMatches = (prose.match(metaphorKeywords) || []).length;
  const metaphor_density = normalize(metaphorMatches / sentences.length, 0, 1);

  // 4. language_register: ratio mots > 3 syllabes / total (heuristique)
  const longWords = words.filter(w => estimateSyllables(w) > 3).length;
  const language_register = normalize(longWords / words.length, 0.1, 0.4);

  // 5. irony_level: points d'exclamation après phrases négatives (heuristique simple)
  const negativeExclamations = (prose.match(/\b(ne|n'|pas|jamais|rien|aucun)[^.!?]*!/gi) || []).length;
  const irony_level = normalize(negativeExclamations / sentences.length, 0, 0.3);

  // 6. ellipsis_rate: ratio phrases sans verbe conjugué / total (heuristique via longueur < 4 mots)
  const shortSentences = sentences.filter(s => s.split(/\s+/).length < 4).length;
  const ellipsis_rate = shortSentences / sentences.length;

  // 7. abstraction_ratio: ratio noms abstraits / noms totaux (suffixes: -tion, -ment, -ité, -ence)
  const abstractPattern = /(tion|ment|ité|ence|ance|esse|eur|age)\b/gi;
  const abstractWords = (prose.match(abstractPattern) || []).length;
  const abstraction_ratio = normalize(abstractWords / words.length, 0.05, 0.25);

  // 8. punctuation_style: ratio (! ? ; — …) / total ponctuation
  const expressivePunct = (prose.match(/[!?;—…]/g) || []).length;
  const totalPunct = (prose.match(/[.!?,;:—…]/g) || []).length;
  const punctuation_style = totalPunct > 0 ? expressivePunct / totalPunct : 0;

  // 9. paragraph_rhythm: coefficient de variation des longueurs de paragraphes
  if (paragraphs.length < 2) {
    return {
      phrase_length_mean,
      dialogue_ratio,
      metaphor_density,
      language_register,
      irony_level,
      ellipsis_rate,
      abstraction_ratio,
      punctuation_style,
      paragraph_rhythm: 0.5,
      opening_variety: 0.5,
    };
  }
  const paraLengths = paragraphs.map(p => p.split(/\s+/).length);
  const meanParaLength = paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length;
  const variance = paraLengths.reduce((sum, len) => sum + Math.pow(len - meanParaLength, 2), 0) / paraLengths.length;
  const stdDev = Math.sqrt(variance);
  const coeffVar = meanParaLength > 0 ? stdDev / meanParaLength : 0;
  const paragraph_rhythm = normalize(coeffVar, 0, 1);

  // 10. opening_variety: ratio premiers mots uniques / nombre de phrases
  const firstWords = sentences.map(s => {
    const words = s.trim().split(/\s+/);
    return words[0] ? words[0].toLowerCase().replace(/[^a-zàâäçéèêëïîôùûü]/gi, '') : '';
  }).filter(w => w.length > 0);
  const uniqueFirstWords = new Set(firstWords).size;
  const opening_variety = firstWords.length > 0 ? uniqueFirstWords / firstWords.length : 0;

  return {
    phrase_length_mean,
    dialogue_ratio,
    metaphor_density,
    language_register,
    irony_level,
    ellipsis_rate,
    abstraction_ratio,
    punctuation_style,
    paragraph_rhythm,
    opening_variety,
  };
}

/**
 * Calculer le drift entre 2 genomes
 */
export function computeVoiceDrift(target: VoiceGenome, actual: VoiceGenome): {
  drift: number;           // 0-1, distance euclidienne normalisée
  per_param: Record<keyof VoiceGenome, number>;  // drift par paramètre
  conforming: boolean;     // drift < 0.10
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

  for (const param of params) {
    const diff = Math.abs(target[param] - actual[param]);
    per_param[param] = diff;
    sumSquares += diff * diff;
  }

  // Distance euclidienne normalisée (√10 = max si tous à 1)
  const drift = Math.sqrt(sumSquares / params.length);
  const conforming = drift < 0.10;

  return {
    drift,
    per_param,
    conforming,
  };
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
