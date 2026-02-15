/**
 * Mock SymbolMap valide pour les tests
 * Passe tous les 9 checks de validation
 */

import type { SymbolMap } from '../../src/types.js';

export const MOCK_SYMBOL_MAP: SymbolMap = {
  map_id: 'SMAP_TEST_001',
  map_hash: 'smap_hash_001',
  scene_id: 'SCENE_TEST_001',
  generation_seed: 'GEN_SEED_001',
  generation_temperature: 0.25,
  validation_status: 'VALID',
  generation_pass: 1,

  quartiles: [
    {
      quartile: 'Q1',
      lexical_fields: ['peur', 'ténèbres', 'angoisse'],
      imagery_modes: ['obscurité', 'mécanique'],
      sensory_quota: {
        vue: 0.4,
        son: 0.2,
        toucher: 0.2,
        odeur: 0.1,
        temperature: 0.1,
      },
      syntax_profile: {
        short_ratio: 0.2,
        avg_len_target: 18,
        punctuation_style: 'standard',
      },
      interiority_ratio: 0.5,
      signature_hooks: ['ombre', 'fer'],
      taboos: ['espoir facile'],
    },
    {
      quartile: 'Q2',
      lexical_fields: ['violence', 'rupture', 'chaos'],
      imagery_modes: ['obscurité', 'mécanique'], // Match MOCK_PACKET Q2: valence=-0.6, arousal=0.8
      sensory_quota: {
        vue: 0.3,
        son: 0.3,
        toucher: 0.2,
        odeur: 0.1,
        temperature: 0.1,
      },
      syntax_profile: {
        short_ratio: 0.5,
        avg_len_target: 10,
        punctuation_style: 'fragmenté',
      },
      interiority_ratio: 0.4,
      signature_hooks: ['cendre', 'flamme'],
      taboos: ['réconciliation rapide'],
    },
    {
      quartile: 'Q3',
      lexical_fields: ['deuil', 'mémoire', 'silence'],
      imagery_modes: ['souterrain', 'minéral'],
      sensory_quota: {
        vue: 0.35,
        son: 0.15,
        toucher: 0.25,
        odeur: 0.15,
        temperature: 0.1,
      },
      syntax_profile: {
        short_ratio: 0.3,
        avg_len_target: 16,
        punctuation_style: 'standard',
      },
      interiority_ratio: 0.7,
      signature_hooks: ['pierre'],
      taboos: ['consolation facile'],
    },
    {
      quartile: 'Q4',
      lexical_fields: ['acceptation', 'vestige', 'trace'],
      imagery_modes: ['souterrain', 'minéral'], // Match MOCK_PACKET Q4: valence=-0.3, arousal=0.3
      sensory_quota: {
        vue: 0.35,
        son: 0.2,
        toucher: 0.2,
        odeur: 0.15,
        temperature: 0.1,
      },
      syntax_profile: {
        short_ratio: 0.15,
        avg_len_target: 20,
        punctuation_style: 'dense',
      },
      interiority_ratio: 0.8,
      signature_hooks: ['ombre'],
      taboos: ['happy ending'],
    },
  ],

  global: {
    one_line_commandment: 'Écrire la peur comme une architecture qui s\'effondre, sans métaphore florale.',
    forbidden_moves: [
      'Utiliser des adverbes en -ment pour l\'émotion',
      'Expliquer ce que le personnage ressent',
      'Faire parler les objets inanimés',
    ],
    anti_cliche_replacements: [
      { cliche: 'cœur battait', replacement: 'pouls' },
      { cliche: 'frisson parcourut', replacement: 'chair contractée' },
      { cliche: 'silence pesant', replacement: 'silence' },
    ],
  },
};
