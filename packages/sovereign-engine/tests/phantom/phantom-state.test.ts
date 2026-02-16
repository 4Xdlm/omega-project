/**
 * Tests: Phantom State (Sprint 14.1)
 * Invariant: ART-PHANTOM-01
 */

import { describe, it, expect } from 'vitest';
import {
  createPhantomState,
  advancePhantom,
  isNarrativeEvent,
  DEFAULT_PHANTOM_CONFIG,
} from '../../src/phantom/phantom-state.js';

describe('PhantomState (ART-PHANTOM-01)', () => {
  it('PHANTOM-01: état initial → attention 0.9, cognitive_load 0, fatigue 0', () => {
    const state = createPhantomState();

    expect(state.attention).toBe(0.9);
    expect(state.cognitive_load).toBe(0);
    expect(state.fatigue).toBe(0);
    expect(state.sentence_index).toBe(0);
  });

  it('PHANTOM-02: 20 phrases longues monotones → attention < 0.5 et fatigue > 0.15', () => {
    const longMonotoneSentence =
      'La pièce contenait un ensemble de meubles anciens disposés de manière symétrique autour de la table centrale rectangulaire en bois massif.';

    let state = createPhantomState();

    for (let i = 0; i < 20; i++) {
      state = advancePhantom(state, longMonotoneSentence, DEFAULT_PHANTOM_CONFIG);
    }

    // After 20 monotone long sentences, attention should have decayed significantly
    expect(state.attention).toBeLessThan(0.5);

    // Fatigue should have accumulated (20 × 0.01 = 0.20, minus any recovery)
    expect(state.fatigue).toBeGreaterThan(0.15);
  });

  it('PHANTOM-03: phrase d\'action ("Il saisit l\'arme") → attention boost', () => {
    // First decay attention a bit
    let state = createPhantomState();
    const boringPhrase = 'La pièce était calme et silencieuse depuis un long moment interminable.';

    for (let i = 0; i < 5; i++) {
      state = advancePhantom(state, boringPhrase, DEFAULT_PHANTOM_CONFIG);
    }

    const attentionBefore = state.attention;

    // Action sentence should boost attention
    const actionSentence = 'Il saisit l\'arme et bondit vers la porte.';
    state = advancePhantom(state, actionSentence, DEFAULT_PHANTOM_CONFIG);

    // Attention should be higher than it would be with just decay
    // (decay = -0.02, but action boost = +0.15, net = +0.13)
    expect(state.attention).toBeGreaterThan(attentionBefore - 0.02);

    // Verify isNarrativeEvent detects action verbs
    expect(isNarrativeEvent('Il saisit l\'arme')).toBe(true);
    expect(isNarrativeEvent('La pièce était calme')).toBe(false);
  });

  it('PHANTOM-04: phrase courte après fatigue → fatigue diminue (respiration)', () => {
    let state = createPhantomState();
    const longPhrase = 'La longue description détaillée de cette pièce immense et richement décorée continuait sans fin.';

    // Build up fatigue
    for (let i = 0; i < 15; i++) {
      state = advancePhantom(state, longPhrase, DEFAULT_PHANTOM_CONFIG);
    }

    const fatigueBefore = state.fatigue;

    // Short sentence = breath recovery
    const shortPhrase = 'Silence.';
    state = advancePhantom(state, shortPhrase, DEFAULT_PHANTOM_CONFIG);

    // Fatigue should decrease: +0.01 (rate) - 0.08 (recovery) = -0.07
    expect(state.fatigue).toBeLessThan(fatigueBefore);
  });
});
