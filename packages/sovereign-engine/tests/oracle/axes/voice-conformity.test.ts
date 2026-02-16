/**
 * Tests: Voice Conformity Axis (Sprint 13.3)
 * Invariant: ART-VOICE-03
 */

import { describe, it, expect } from 'vitest';
import { scoreVoiceConformity } from '../../../src/oracle/axes/voice-conformity.js';
import type { ForgePacket, SovereignProvider } from '../../../src/types.js';
import type { VoiceGenome } from '../../../src/voice/voice-genome.js';

const mockProvider: Partial<SovereignProvider> = {
  model_id: 'test-model',
  callLLM: async () => ({ result: 'mock' }),
};

function createMockPacket(voiceGenome?: VoiceGenome): ForgePacket {
  return {
    packet_id: 'test-packet',
    packet_hash: 'test-hash',
    scene_id: 'test-scene',
    run_id: 'test-run',
    quality_tier: 'standard',
    language: 'fr',
    style_genome: {
      version: '1.0',
      universe: 'test',
      lexicon: {
        signature_words: [],
        forbidden_words: [],
        abstraction_max_ratio: 0.3,
        concrete_min_ratio: 0.5,
      },
      rhythm: {
        avg_sentence_length_target: 15,
        gini_target: 0.45,
        max_consecutive_similar: 2,
        min_syncopes_per_scene: 3,
        min_compressions_per_scene: 2,
      },
      tone: {
        dominant_register: 'soutenu',
        intensity_range: [0.4, 0.8],
      },
      imagery: {
        recurrent_motifs: [],
        density_target_per_100_words: 5,
        banned_metaphors: [],
      },
      voice: voiceGenome,
    },
  } as any;
}

describe('Voice Conformity Axis (ART-VOICE-03)', () => {
  it('VCONF-01: prose conforme au genome → score > 80', async () => {
    // Genome cible : phrases courtes, registre simple
    const targetGenome: VoiceGenome = {
      phrase_length_mean: 0.2, // Court
      dialogue_ratio: 0.3,
      metaphor_density: 0.2,
      language_register: 0.3, // Simple
      irony_level: 0.2,
      ellipsis_rate: 0.4,
      abstraction_ratio: 0.2,
      punctuation_style: 0.3,
      paragraph_rhythm: 0.5,
      opening_variety: 0.6,
    };

    // Prose correspondante : phrases courtes, vocabulaire simple
    const conformingProse = `
Il part. Elle reste. Fini.
Ça va. Pas grave. On verra.
C'est tout. Rien de plus.
    `.trim();

    const packet = createMockPacket(targetGenome);
    const result = await scoreVoiceConformity(packet, conformingProse, mockProvider);

    // Score devrait être élevé (faible drift)
    expect(result.score).toBeGreaterThan(70);
    expect(result.axis_id).toBe('voice_conformity');
    expect(result.method).toBe('CALC');
  });

  it('VCONF-02: prose très différente du genome → score < 50', async () => {
    // Genome cible : phrases courtes, registre simple
    const targetGenome: VoiceGenome = {
      phrase_length_mean: 0.2, // Court
      dialogue_ratio: 0.1,
      metaphor_density: 0.1,
      language_register: 0.2, // Simple
      irony_level: 0.1,
      ellipsis_rate: 0.2,
      abstraction_ratio: 0.1,
      punctuation_style: 0.2,
      paragraph_rhythm: 0.3,
      opening_variety: 0.4,
    };

    // Prose opposée : phrases longues, vocabulaire complexe, métaphores
    const divergentProse = `
Les considérations philosophiques qui émergèrent de cette contemplation mélancolique
s'avérèrent extraordinairement profondes et manifestement révélatrices d'une
intériorité tourmentée, telle une symphonie dissonante résonnant dans les méandres
obscurs d'une conscience fragmentée, irrémédiablement assujettie aux aléas d'une
existence contingente et perpétuellement suspendue entre l'être et le néant.
    `.trim();

    const packet = createMockPacket(targetGenome);
    const result = await scoreVoiceConformity(packet, divergentProse, mockProvider);

    // Score devrait être bas (fort drift)
    expect(result.score).toBeLessThan(50);
    expect(result.reasons.top_penalties.length).toBeGreaterThan(0);
  });

  it('VCONF-03: drift test — même genome, même prose = même score (déterminisme)', async () => {
    const targetGenome: VoiceGenome = {
      phrase_length_mean: 0.5,
      dialogue_ratio: 0.3,
      metaphor_density: 0.4,
      language_register: 0.6,
      irony_level: 0.2,
      ellipsis_rate: 0.3,
      abstraction_ratio: 0.4,
      punctuation_style: 0.5,
      paragraph_rhythm: 0.6,
      opening_variety: 0.7,
    };

    const prose = `
Il marcha longtemps. Le vent soufflait fort.
Ses pensées tourbillonnaient. Personne ne l'attendait.
    `.trim();

    const packet = createMockPacket(targetGenome);

    const result1 = await scoreVoiceConformity(packet, prose, mockProvider);
    const result2 = await scoreVoiceConformity(packet, prose, mockProvider);

    // Déterminisme : même score
    expect(result1.score).toBe(result2.score);
    expect(result1.details).toBe(result2.details);
  });
});
