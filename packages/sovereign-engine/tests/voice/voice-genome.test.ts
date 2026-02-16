/**
 * Tests: Voice Genome (Sprint 13.1)
 * Invariant: ART-VOICE-01
 */

import { describe, it, expect } from 'vitest';
import {
  measureVoice,
  computeVoiceDrift,
  DEFAULT_VOICE_GENOME,
  type VoiceGenome,
} from '../../src/voice/voice-genome.js';

describe('Voice Genome (ART-VOICE-01)', () => {
  it('VOICE-01: measureVoice() retourne 10 paramètres ∈ [0,1]', () => {
    const prose = `
Il marcha longtemps dans les rues désertes. Le vent soufflait fort.
Ses pensées tourbillonnaient comme des feuilles mortes.
Personne ne l'attendait. Rien ne pressait.

— Où vas-tu ? demanda une voix.
— Nulle part, répondit-il.
    `.trim();

    const genome = measureVoice(prose);

    // Vérifier que tous les paramètres existent
    expect(genome.phrase_length_mean).toBeDefined();
    expect(genome.dialogue_ratio).toBeDefined();
    expect(genome.metaphor_density).toBeDefined();
    expect(genome.language_register).toBeDefined();
    expect(genome.irony_level).toBeDefined();
    expect(genome.ellipsis_rate).toBeDefined();
    expect(genome.abstraction_ratio).toBeDefined();
    expect(genome.punctuation_style).toBeDefined();
    expect(genome.paragraph_rhythm).toBeDefined();
    expect(genome.opening_variety).toBeDefined();

    // Vérifier que tous sont dans [0, 1]
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
      expect(genome[param]).toBeGreaterThanOrEqual(0);
      expect(genome[param]).toBeLessThanOrEqual(1);
    }
  });

  it('VOICE-02: prose courte/familière → phrase_length_mean bas, language_register bas', () => {
    const proseShortSimple = `
Il part. Elle reste. Fini.
Ça va. Pas grave. On verra.
    `.trim();

    const genome = measureVoice(proseShortSimple);

    // Phrases courtes (< 5 mots) → phrase_length_mean devrait être bas
    expect(genome.phrase_length_mean).toBeLessThan(0.4);

    // Vocabulaire simple (peu de mots longs) → language_register devrait être bas
    expect(genome.language_register).toBeLessThan(0.5);
  });

  it('VOICE-03: computeVoiceDrift() même genome → drift = 0', () => {
    const genome1: VoiceGenome = {
      phrase_length_mean: 0.6,
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

    const genome2 = { ...genome1 };

    const result = computeVoiceDrift(genome1, genome2);

    expect(result.drift).toBe(0);
    expect(result.conforming).toBe(true);

    // Tous les drifts par paramètre doivent être 0
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
      expect(result.per_param[param]).toBe(0);
    }
  });

  it('VOICE-04: computeVoiceDrift() genomes très différents → drift > 0.5', () => {
    const genome1: VoiceGenome = {
      phrase_length_mean: 0.1,
      dialogue_ratio: 0.1,
      metaphor_density: 0.1,
      language_register: 0.1,
      irony_level: 0.1,
      ellipsis_rate: 0.1,
      abstraction_ratio: 0.1,
      punctuation_style: 0.1,
      paragraph_rhythm: 0.1,
      opening_variety: 0.1,
    };

    const genome2: VoiceGenome = {
      phrase_length_mean: 0.9,
      dialogue_ratio: 0.9,
      metaphor_density: 0.9,
      language_register: 0.9,
      irony_level: 0.9,
      ellipsis_rate: 0.9,
      abstraction_ratio: 0.9,
      punctuation_style: 0.9,
      paragraph_rhythm: 0.9,
      opening_variety: 0.9,
    };

    const result = computeVoiceDrift(genome1, genome2);

    // Drift devrait être très élevé (proche de 0.8, distance maximale normalisée)
    expect(result.drift).toBeGreaterThan(0.5);
    expect(result.conforming).toBe(false);

    // Tous les drifts par paramètre doivent être élevés
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
      expect(result.per_param[param]).toBeGreaterThan(0.5);
    }
  });
});
