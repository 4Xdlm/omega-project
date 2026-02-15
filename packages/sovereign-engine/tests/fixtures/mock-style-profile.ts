/**
 * Mock StyleProfile for testing
 */

import type { StyleProfile } from '../../src/types.js';

export const MOCK_STYLE_PROFILE: StyleProfile = {
  version: '1.0.0',
  universe: 'dark-fantasy',
  lexicon: {
    signature_words: ['ombre', 'cendre', 'éclat', 'fissure', 'forge', 'fer', 'acier', 'flamme', 'pierre', 'métal'],
    forbidden_words: ['nice', 'interesting', 'very', 'vraiment', 'beaucoup'],
    abstraction_max_ratio: 0.35,
    concrete_min_ratio: 0.65,
  },
  rhythm: {
    avg_sentence_length_target: 15,
    gini_target: 0.45,
    max_consecutive_similar: 3,
    min_syncopes_per_scene: 2,
    min_compressions_per_scene: 1,
  },
  tone: {
    dominant_register: 'sombre',
    intensity_range: [0.4, 0.9],
  },
  imagery: {
    recurrent_motifs: ['feu', 'ombre', 'métal'],
    density_target_per_100_words: 8.0,
    banned_metaphors: ['océan de larmes', 'tourbillon d\'émotions'],
  },
};
