/**
 * ART-13 — Voice Genome Invariant Tests
 * GENOME-01 to GENOME-07
 *
 * Complements VOICE-01..04 in tests/voice/voice-genome.test.ts.
 * Tests checkGenomeConformity, symmetry, determinism, dialogue detection.
 */
import { describe, it, expect } from 'vitest';
import {
  measureVoice,
  computeVoiceDrift,
  checkGenomeConformity,
  type VoiceGenome,
} from '../../src/voice/voice-genome.js';

const sampleProse = [
  'La porte grinça. Il entra.',
  "À l'intérieur, l'odeur de poussière et de vieux bois envahissait chaque recoin de la pièce abandonnée depuis des années.",
  '— Tu es là ? lança-t-il.',
  'Pas de réponse.',
  "Il s'assit. La chaise craqua sous son poids, comme elle avait toujours craqué ; c'était un son familier, presque rassurant.",
].join('\n\n');

describe('ART-13: Voice Genome Invariants', () => {

  it('GENOME-01: measureVoice extracts 10 parameters in [0, 1]', () => {
    const genome = measureVoice(sampleProse);

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

    // Exactly 10 parameters
    expect(Object.keys(genome)).toHaveLength(10);

    for (const param of params) {
      expect(genome[param]).toBeGreaterThanOrEqual(0);
      expect(genome[param]).toBeLessThanOrEqual(1);
    }
  });

  it('GENOME-02: deterministic — same text produces same genome', () => {
    const g1 = measureVoice(sampleProse);
    const g2 = measureVoice(sampleProse);

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

    for (const param of params) {
      expect(g1[param]).toBe(g2[param]);
    }
  });

  it('GENOME-03: computeVoiceDrift(same, same) = 0', () => {
    const g = measureVoice(sampleProse);
    const result = computeVoiceDrift(g, g);
    expect(result.drift).toBe(0);
    expect(result.conforming).toBe(true);
  });

  it('GENOME-04: computeVoiceDrift is symmetric', () => {
    const g1 = measureVoice('Phrases courtes. Oui. Non. Stop.');
    const g2 = measureVoice(sampleProse);
    const d1 = computeVoiceDrift(g1, g2).drift;
    const d2 = computeVoiceDrift(g2, g1).drift;
    expect(d1).toBe(d2);
  });

  it('GENOME-05: checkGenomeConformity within tolerance → score 100, 0 violations', () => {
    const target = measureVoice(sampleProse);
    // Same genome → perfect conformity
    const result = checkGenomeConformity(target, target);
    expect(result.conformity_score).toBe(100);
    expect(result.violations).toHaveLength(0);
  });

  it('GENOME-06: very different style → low conformity + violations', () => {
    const target = measureVoice(
      'Oui. Non. Stop. Allez. Maintenant. Vite. Là.'
    );
    const generated = measureVoice(
      'La manifestation extraordinairement tumultueuse qui se déployait ' +
      'majestueusement dans les avenues parisiennes attirait inévitablement ' +
      'les regards des passants médusés par cette démonstration spectaculaire.'
    );
    const result = checkGenomeConformity(generated, target);
    expect(result.conformity_score).toBeLessThan(80);
    expect(result.violations.length).toBeGreaterThan(0);

    // Each violation has required fields
    for (const v of result.violations) {
      expect(typeof v.param).toBe('string');
      expect(typeof v.expected).toBe('number');
      expect(typeof v.actual).toBe('number');
      expect(typeof v.delta_pct).toBe('number');
    }
  });

  it('GENOME-07: dialogue detected in genome', () => {
    const withDialogue = '— Bonjour, dit-il.\n— Salut.\nIl sourit.';
    const genome = measureVoice(withDialogue);
    expect(genome.dialogue_ratio).toBeGreaterThan(0);
  });
});
