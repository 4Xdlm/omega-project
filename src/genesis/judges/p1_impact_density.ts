// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — P1 IMPACT-DENSITY (Pareto Score)
// ═══════════════════════════════════════════════════════════════════════════════
// Score non-bloquant: imagerie et rarete lexicale (pour tri Pareto)
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Draft,
  GenesisConfig,
  SensoryLexicon,
} from '../core/types';

/**
 * Lexique sensoriel integre
 */
const BUILTIN_SENSORY: SensoryLexicon = {
  version: '1.0',
  categories: {
    visual: [
      'crimson', 'shimmer', 'shadow', 'gleam', 'glint', 'glimmer',
      'radiant', 'luminous', 'dark', 'bright', 'pale', 'vivid',
      'translucent', 'opaque', 'iridescent', 'matte', 'glossy',
    ],
    auditory: [
      'whisper', 'echo', 'silence', 'roar', 'hum', 'buzz',
      'thunder', 'murmur', 'rustle', 'crack', 'snap', 'ring',
      'chime', 'drone', 'screech', 'melodious', 'cacophony',
    ],
    tactile: [
      'rough', 'smooth', 'cold', 'warm', 'soft', 'hard',
      'velvet', 'silky', 'gritty', 'sticky', 'slippery', 'prickly',
      'tender', 'coarse', 'supple', 'rigid', 'fluffy',
    ],
    olfactory: [
      'fragrant', 'acrid', 'musty', 'pungent', 'sweet', 'sour',
      'earthy', 'floral', 'smoky', 'fresh', 'stale', 'rancid',
      'aromatic', 'perfumed', 'fetid', 'briny',
    ],
    gustatory: [
      'bitter', 'sweet', 'savory', 'salty', 'tangy', 'spicy',
      'bland', 'rich', 'zesty', 'creamy', 'crisp', 'succulent',
      'tart', 'umami', 'piquant',
    ],
  },
};

/**
 * Mots rares pour calcul de rarete lexicale
 */
const RARE_WORDS = new Set([
  // Literary/poetic words
  'ephemeral', 'ethereal', 'luminescent', 'gossamer', 'diaphanous',
  'mellifluous', 'serendipity', 'resplendent', 'effervescent', 'ineffable',
  'incandescent', 'iridescent', 'phosphorescent', 'evanescent', 'transcendent',
  // Evocative verbs
  'languish', 'cascade', 'permeate', 'undulate', 'oscillate',
  'reverberate', 'coalesce', 'dissipate', 'emanate', 'suffuse',
  // Precise descriptors
  'verdant', 'cerulean', 'vermillion', 'obsidian', 'alabaster',
  'aquamarine', 'aureate', 'burnished', 'crystalline', 'lustrous',
]);

/**
 * Calcule le score IMPACT-DENSITY (non-bloquant, pour Pareto)
 */
export function evaluateImpactDensity(
  draft: Draft,
  config: GenesisConfig
): number {
  const text = draft.text.toLowerCase();
  const words = text.split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) return 0;

  // 1. Score d'imagerie (presence de mots sensoriels)
  const imageryScore = computeImageryScore(text, words);

  // 2. Score de rarete lexicale
  const lexicalRarityScore = computeLexicalRarity(text, words);

  // Combinaison: moyenne geometrique pour favoriser l'equilibre
  const combinedScore = Math.sqrt(imageryScore * lexicalRarityScore);

  return combinedScore;
}

/**
 * Calcule le score d'imagerie (presence de mots sensoriels)
 */
function computeImageryScore(text: string, words: string[]): number {
  // Collecter tous les mots sensoriels
  const allSensoryWords = new Set<string>();
  for (const category of Object.values(BUILTIN_SENSORY.categories)) {
    for (const word of category) {
      allSensoryWords.add(word.toLowerCase());
    }
  }

  // Compter les occurrences
  let sensoryCount = 0;
  const categoryCounts: Record<string, number> = {
    visual: 0,
    auditory: 0,
    tactile: 0,
    olfactory: 0,
    gustatory: 0,
  };

  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (allSensoryWords.has(cleanWord)) {
      sensoryCount++;

      // Compter par categorie
      for (const [cat, catWords] of Object.entries(BUILTIN_SENSORY.categories)) {
        if (catWords.map(w => w.toLowerCase()).includes(cleanWord)) {
          categoryCounts[cat]++;
        }
      }
    }
  }

  // Score de base: ratio de mots sensoriels
  const baseScore = Math.min(1, sensoryCount / (words.length * 0.1)); // 10% = score 1.0

  // Bonus pour diversite sensorielle (utiliser plusieurs categories)
  const categoriesUsed = Object.values(categoryCounts).filter(c => c > 0).length;
  const diversityBonus = categoriesUsed / 5; // 5 categories = bonus 1.0

  // Score final: moyenne ponderee
  const imageryScore = baseScore * 0.7 + diversityBonus * 0.3;

  return Math.min(1, imageryScore);
}

/**
 * Calcule le score de rarete lexicale
 */
function computeLexicalRarity(text: string, words: string[]): number {
  let rareCount = 0;
  const uniqueRare = new Set<string>();

  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (RARE_WORDS.has(cleanWord)) {
      rareCount++;
      uniqueRare.add(cleanWord);
    }
  }

  // Score de base: ratio de mots rares
  const baseScore = Math.min(1, rareCount / (words.length * 0.05)); // 5% = score 1.0

  // Bonus pour variete (mots rares uniques)
  const varietyBonus = Math.min(1, uniqueRare.size / 5); // 5 mots rares uniques = bonus 1.0

  // Score final: moyenne ponderee
  const rarityScore = baseScore * 0.6 + varietyBonus * 0.4;

  return Math.min(1, rarityScore);
}

export default evaluateImpactDensity;
