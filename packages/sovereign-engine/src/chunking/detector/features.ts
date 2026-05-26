/**
 * OMEGA V2.1 — Feature Extractors for EmotionalArcDetector
 *
 * Pure functions extracting lexical/structural features from text.
 * Used by EmotionalArcDetector to characterize emotional state per window.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Sprint V2.1 implementation 2026-05-26
 */

import type { FeatureVector } from '../types.js';

// ============================================================
// French Lexical Dictionaries (compact, extensible Sprint V2.x+)
// ============================================================

const VAKOG_LEXICONS = {
  visual: new Set([
    'voir', 'regarder', 'observer', 'apercevoir', 'contempler', 'distinguer',
    'lumière', 'ombre', 'couleur', 'sombre', 'clair', 'brillant', 'éclat',
    'rouge', 'bleu', 'vert', 'noir', 'blanc', 'jaune', 'vue', 'regard',
    'image', 'paysage', 'horizon', 'silhouette', 'reflet', 'éclair',
  ]),
  auditory: new Set([
    'entendre', 'écouter', 'bruit', 'son', 'voix', 'cri', 'murmure', 'chuchotement',
    'silence', 'écho', 'résonner', 'musique', 'mélodie', 'rythme', 'note',
    'sonore', 'mot', 'parole', 'dire', 'parler', 'crier', 'chuchoter',
    'sourd', 'aigu', 'grave', 'fort',
    // Audit 2026-05-26 P1 fix : removed 'whisper' (anglais) + 'doux' (polysémique, déjà dans kinesthetic+olfactory)
  ]),
  kinesthetic: new Set([
    'toucher', 'sentir', 'caresser', 'effleurer', 'serrer', 'tenir', 'pousser',
    'tirer', 'froid', 'chaud', 'tiède', 'doux', 'rugueux', 'lisse', 'humide',
    'sec', 'mouillé', 'corps', 'peau', 'main', 'doigt', 'bras', 'jambe',
    'mouvement', 'geste', 'pas', 'marche', 'course', 'tomber', 'monter',
  ]),
  olfactory: new Set([
    'sentir', 'odeur', 'parfum', 'arôme', 'fragrance', 'puanteur', 'fumée',
    'âcre', 'doux', 'fleuri', 'épicé', 'frais', 'rance', 'nez', 'narine',
  ]),
  gustatory: new Set([
    'goût', 'saveur', 'goûter', 'savourer', 'amer', 'sucré', 'salé', 'acide',
    'épicé', 'fade', 'délicieux', 'écœurant', 'bouche', 'langue', 'palais',
    'manger', 'boire', 'mâcher', 'avaler',
  ]),
};

const BODY_BINDING_LEXICON = new Set([
  'corps', 'peau', 'chair', 'os', 'muscle', 'membre', 'cœur', 'poitrine',
  'ventre', 'estomac', 'gorge', 'poumon', 'sang', 'veine', 'pouls',
  'main', 'doigt', 'poing', 'paume', 'bras', 'épaule', 'coude', 'poignet',
  'pied', 'jambe', 'genou', 'cheville', 'talon', 'cuisse',
  'tête', 'crâne', 'front', 'visage', 'joue', 'menton', 'tempe',
  // Audit 2026-05-26 P1 fix : removed typo 'œilil' (duplicate of 'œil')
  'œil', 'paupière', 'sourcil', 'regard',
  'bouche', 'lèvre', 'dent', 'langue',
  'nez', 'narine', 'oreille',
  'tremblement', 'frisson', 'sueur', 'douleur', 'brûlure', 'spasme',
  'souffle', 'respiration', 'haleine', 'soupir',
]);

const POSITIVE_SENTIMENT_LEXICON = new Set([
  'joie', 'bonheur', 'amour', 'tendresse', 'douceur', 'paix', 'sérénité',
  'espoir', 'enthousiasme', 'exaltation', 'ravissement', 'extase',
  'sourire', 'rire', 'chant', 'danse', 'caresse', 'étreinte',
  'beau', 'magnifique', 'splendide', 'merveilleux', 'éblouissant',
]);

const NEGATIVE_SENTIMENT_LEXICON = new Set([
  'tristesse', 'douleur', 'souffrance', 'angoisse', 'peur', 'terreur',
  'colère', 'rage', 'fureur', 'haine', 'dégoût', 'horreur', 'effroi',
  'pleurer', 'sangloter', 'gémir', 'crier', 'hurler', 'trembler',
  'sombre', 'noir', 'froid', 'mort', 'cadavre', 'sang', 'larme',
  'amer', 'cruel', 'sinistre', 'lugubre', 'macabre',
]);

// Concrete vs abstract proxy: count specific nouns vs abstract concepts
const CONCRETE_PROXY_LEXICON = new Set([
  'maison', 'porte', 'fenêtre', 'table', 'chaise', 'lit', 'mur', 'plafond',
  'arbre', 'fleur', 'pierre', 'eau', 'feu', 'terre', 'ciel', 'mer',
  'voiture', 'route', 'chemin', 'pont', 'jardin', 'forêt',
  'pain', 'vin', 'fruit', 'lait', 'fromage',
  'livre', 'papier', 'lettre', 'crayon',
]);

// ============================================================
// Feature Extraction Functions
// ============================================================

/**
 * Tokenize text into words (lowercase, alphanumeric).
 * French-aware (preserves é, è, à, ç, etc.).
 */
export function tokenize(text: string): string[] {
  // Audit 2026-05-26 P3 fix : after normalize+replace diacritics, text is ASCII pure.
  // Split regex no longer needs French accented chars (were dead).
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove combining diacritics (explicit Unicode range)
    .split(/[^a-z0-9-]+/)
    .filter((t) => t.length > 0);
}

/**
 * Restore diacritics for VAKOG/body lexicon matching.
 * (Simpler: we match against lexicon AFTER removing diacritics from both.)
 */
function normalizeForLexicon(word: string): string {
  return word.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const VAKOG_NORMALIZED = {
  visual: new Set([...VAKOG_LEXICONS.visual].map(normalizeForLexicon)),
  auditory: new Set([...VAKOG_LEXICONS.auditory].map(normalizeForLexicon)),
  kinesthetic: new Set([...VAKOG_LEXICONS.kinesthetic].map(normalizeForLexicon)),
  olfactory: new Set([...VAKOG_LEXICONS.olfactory].map(normalizeForLexicon)),
  gustatory: new Set([...VAKOG_LEXICONS.gustatory].map(normalizeForLexicon)),
};
const BODY_BINDING_NORMALIZED = new Set([...BODY_BINDING_LEXICON].map(normalizeForLexicon));
const POSITIVE_NORMALIZED = new Set([...POSITIVE_SENTIMENT_LEXICON].map(normalizeForLexicon));
const NEGATIVE_NORMALIZED = new Set([...NEGATIVE_SENTIMENT_LEXICON].map(normalizeForLexicon));
const CONCRETE_NORMALIZED = new Set([...CONCRETE_PROXY_LEXICON].map(normalizeForLexicon));

/**
 * Compute VAKOG feature vector for a text window.
 * Returns ratios in [0, 1] (occurrences / total tokens).
 */
export function extractVAKOG(text: string): FeatureVector['vakog'] {
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return { v: 0, a: 0, k: 0, o: 0, g: 0 };
  }

  let v = 0;
  let a = 0;
  let k = 0;
  let o = 0;
  let g = 0;

  for (const token of tokens) {
    if (VAKOG_NORMALIZED.visual.has(token)) v++;
    if (VAKOG_NORMALIZED.auditory.has(token)) a++;
    if (VAKOG_NORMALIZED.kinesthetic.has(token)) k++;
    if (VAKOG_NORMALIZED.olfactory.has(token)) o++;
    if (VAKOG_NORMALIZED.gustatory.has(token)) g++;
  }

  const n = tokens.length;
  return {
    v: v / n,
    a: a / n,
    k: k / n,
    o: o / n,
    g: g / n,
  };
}

/**
 * Compute body binding density (ratio of body-related tokens).
 */
export function extractBodyBinding(text: string): number {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  let count = 0;
  for (const token of tokens) {
    if (BODY_BINDING_NORMALIZED.has(token)) count++;
  }
  return count / tokens.length;
}

/**
 * Compute sentiment proxy in [-1, +1].
 * (#positive - #negative) / total tokens.
 */
export function extractSentiment(text: string): number {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  let positive = 0;
  let negative = 0;
  for (const token of tokens) {
    if (POSITIVE_NORMALIZED.has(token)) positive++;
    if (NEGATIVE_NORMALIZED.has(token)) negative++;
  }
  return (positive - negative) / tokens.length;
}

/**
 * Compute concreteness proxy (ratio of concrete nouns).
 */
export function extractConcreteness(text: string): number {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  let count = 0;
  for (const token of tokens) {
    if (CONCRETE_NORMALIZED.has(token)) count++;
  }
  return count / tokens.length;
}

/**
 * Compute punctuation density per character.
 * Counts: . ! ? ; , : — - "
 */
export function extractPunctuationDensity(text: string): number {
  if (text.length === 0) return 0;
  const matches = text.match(/[.!?;,:—\-"…]/g);
  return matches ? matches.length / text.length : 0;
}

/**
 * Extract all features for a text window.
 */
export function extractFeatures(text: string): FeatureVector {
  return {
    vakog: extractVAKOG(text),
    body_binding: extractBodyBinding(text),
    concreteness: extractConcreteness(text),
    sentiment: extractSentiment(text),
    punctuation_density: extractPunctuationDensity(text),
  };
}

/**
 * Compute Euclidean distance between two feature vectors.
 * Used for change-point detection (large distance → emotion shift).
 */
export function featureDistance(a: FeatureVector, b: FeatureVector): number {
  const dx = [
    a.vakog.v - b.vakog.v,
    a.vakog.a - b.vakog.a,
    a.vakog.k - b.vakog.k,
    a.vakog.o - b.vakog.o,
    a.vakog.g - b.vakog.g,
    a.body_binding - b.body_binding,
    a.concreteness - b.concreteness,
    a.sentiment - b.sentiment,
    a.punctuation_density - b.punctuation_density,
  ];
  let sum = 0;
  for (const d of dx) sum += d * d;
  return Math.sqrt(sum);
}

/**
 * Compute feature intensity (Euclidean norm).
 */
export function featureIntensity(f: FeatureVector): number {
  const components = [
    f.vakog.v,
    f.vakog.a,
    f.vakog.k,
    f.vakog.o,
    f.vakog.g,
    f.body_binding,
    f.concreteness,
    Math.abs(f.sentiment),
    f.punctuation_density,
  ];
  let sum = 0;
  for (const c of components) sum += c * c;
  return Math.sqrt(sum);
}

/**
 * Determine dominant emotion based on sentiment + VAKOG profile.
 */
export function determineDominantEmotion(
  features: FeatureVector
): 'joy' | 'sadness' | 'fear' | 'anger' | 'surprise' | 'disgust' | 'neutral' {
  const s = features.sentiment;
  const intensity = featureIntensity(features);

  if (intensity < 0.05) return 'neutral';
  if (s > 0.05) return 'joy';
  if (s < -0.1) {
    // Differentiate sadness vs fear vs anger by punctuation + body density
    if (features.punctuation_density > 0.05) return 'anger';
    if (features.body_binding > 0.04) return 'fear';
    return 'sadness';
  }
  if (features.punctuation_density > 0.06) return 'surprise';
  return 'neutral';
}
