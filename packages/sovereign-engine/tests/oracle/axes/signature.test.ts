/**
 * Tests for signature axis (CALC, 100% deterministic)
 */

import { describe, it, expect } from 'vitest';
import { scoreSignature } from '../../../src/oracle/axes/signature.js';
import type { ForgePacket } from '../../../src/types.js';

const mockPacket: Partial<ForgePacket> = {
  scene_id: 'test_scene',
  style_genome: {
    version: '1.0.0',
    universe: 'test',
    lexicon: {
      signature_words: ['ombre', 'cendre', 'fer', 'pierre', 'flamme'],
      forbidden_words: ['nice', 'very', 'really'],
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
      recurrent_motifs: ['feu'],
      density_target_per_100_words: 8,
      banned_metaphors: [],
    },
  },
} as ForgePacket;

describe('scoreSignature', () => {
  it('texte avec mots signature présents → score élevé', () => {
    const textWithSignature = 'L\'ombre s\'étendait sur la pierre. La cendre recouvrait le fer. Les flammes montaient.';
    const result = scoreSignature(mockPacket as ForgePacket, textWithSignature);

    expect(result.name).toBe('signature');
    expect(result.score).toBeGreaterThan(70);
    expect(result.method).toBe('CALC');
  });

  it('texte sans aucun mot signature → score bas', () => {
    const textWithoutSignature = 'Elle marchait vite. Le vent soufflait. La nuit tombait.';
    const result = scoreSignature(mockPacket as ForgePacket, textWithoutSignature);

    expect(result.score).toBeLessThan(70); // Formula gives 60 for zero signature words
  });

  it('texte avec mots interdits → pénalité', () => {
    const textWithForbidden = 'It was very nice and really interesting.';
    const result = scoreSignature(mockPacket as ForgePacket, textWithForbidden);

    expect(result.score).toBeLessThan(70);
    expect(result.details).toContain('forbidden:');
  });

  it('DÉTERMINISME — même texte = même score (3 appels)', () => {
    const text = 'L\'ombre dansait sur la pierre. La cendre tombait.';
    const score1 = scoreSignature(mockPacket as ForgePacket, text);
    const score2 = scoreSignature(mockPacket as ForgePacket, text);
    const score3 = scoreSignature(mockPacket as ForgePacket, text);

    expect(score1.score).toBe(score2.score);
    expect(score2.score).toBe(score3.score);
    expect(score1.details).toBe(score2.details);
  });
});
