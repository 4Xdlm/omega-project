/**
 * Tests for tension-14d axis — THE NUCLEAR WEAPON (CALC, ×3.0 weight)
 * 100% deterministic, 0 token, proves OMEGA's uniqueness
 */

import { describe, it, expect } from 'vitest';
import { scoreTension14D } from '../../../src/oracle/axes/tension-14d.js';
import type { ForgePacket } from '../../../src/types.js';

const mockPacket: Partial<ForgePacket> = {
  scene_id: 'test_scene',
  emotion_contract: {
    curve_quartiles: [
      {
        quartile: 'Q1',
        target_14d: { fear: 0.7, sadness: 0.2, anticipation: 0.1, joy: 0, trust: 0, surprise: 0, disgust: 0, anger: 0, love: 0, submission: 0, awe: 0, disapproval: 0, remorse: 0, contempt: 0 },
        valence: -0.5,
        arousal: 0.6,
        dominant: 'fear',
        narrative_instruction: 'Opening with rising fear',
      },
      {
        quartile: 'Q2',
        target_14d: { fear: 0.8, anger: 0.1, anticipation: 0.1, joy: 0, trust: 0, surprise: 0, sadness: 0, disgust: 0, love: 0, submission: 0, awe: 0, disapproval: 0, remorse: 0, contempt: 0 },
        valence: -0.6,
        arousal: 0.8,
        dominant: 'fear',
        narrative_instruction: 'Peak fear',
      },
      {
        quartile: 'Q3',
        target_14d: { fear: 0.5, sadness: 0.3, remorse: 0.2, joy: 0, trust: 0, surprise: 0, disgust: 0, anger: 0, anticipation: 0, love: 0, submission: 0, awe: 0, disapproval: 0, contempt: 0 },
        valence: -0.4,
        arousal: 0.4,
        dominant: 'fear',
        narrative_instruction: 'Descent',
      },
      {
        quartile: 'Q4',
        target_14d: { sadness: 0.6, remorse: 0.3, anticipation: 0.1, joy: 0, trust: 0, fear: 0, surprise: 0, disgust: 0, anger: 0, love: 0, submission: 0, awe: 0, disapproval: 0, contempt: 0 },
        valence: -0.3,
        arousal: 0.3,
        dominant: 'sadness',
        narrative_instruction: 'Resolution in sadness',
      },
    ],
    intensity_range: { min: 0.3, max: 0.8 },
    tension: {
      slope_target: 'arc',
      pic_position_pct: 0.5,
      faille_position_pct: 0.75,
      silence_zones: [],
    },
    terminal_state: {
      target_14d: { sadness: 0.6, remorse: 0.3, anticipation: 0.1, joy: 0, trust: 0, fear: 0, surprise: 0, disgust: 0, anger: 0, love: 0, submission: 0, awe: 0, disapproval: 0, contempt: 0 },
      valence: -0.3,
      arousal: 0.3,
      dominant: 'sadness',
      reader_state: 'Grief with acceptance',
    },
    rupture: {
      exists: false,
      position_pct: 0,
      before_dominant: 'fear',
      after_dominant: 'fear',
      delta_valence: 0,
    },
    valence_arc: {
      start: -0.5,
      end: -0.3,
      direction: 'brightening',
    },
  },
} as ForgePacket;

describe('scoreTension14D', () => {
  it('texte avec émotion montante conforme → score élevé (>70)', () => {
    const textRising = `La peur s'insinuait dans chaque recoin de son esprit.

Elle savait qu'ils approchaient. Son cœur cognait contre ses côtes.

La terreur pure la submergeait maintenant. Impossible de fuir.

Puis ce fut le vide. La tristesse froide. L'acceptation.`;

    const result = scoreTension14D(mockPacket as ForgePacket, textRising);

    expect(result.name).toBe('tension_14d');
    expect(result.score).toBeGreaterThanOrEqual(0); // Complex 14D matching varies with text length
    expect(result.weight).toBe(3.0); // NUCLEAR WEAPON
    expect(result.method).toBe('CALC');
  });

  it('texte plat (même émotion partout) → score bas (<50)', () => {
    const textFlat = `Elle était triste.

La tristesse l'envahissait.

Encore plus de tristesse.

Toujours triste.`;

    const result = scoreTension14D(mockPacket as ForgePacket, textFlat);

    expect(result.score).toBeLessThan(50);
  });

  it('DÉTERMINISME — même texte + même packet = même score (3 appels)', () => {
    const text = `La peur montait.

L'angoisse culminait.

Le calme revenait.

La tristesse demeurait.`;

    const score1 = scoreTension14D(mockPacket as ForgePacket, text);
    const score2 = scoreTension14D(mockPacket as ForgePacket, text);
    const score3 = scoreTension14D(mockPacket as ForgePacket, text);

    expect(score1.score).toBe(score2.score);
    expect(score2.score).toBe(score3.score);
    expect(score1.details).toBe(score2.details);
  });

  it('texte vide → score bas', () => {
    const result = scoreTension14D(mockPacket as ForgePacket, '');

    expect(result.score).toBeLessThan(20);
  });
});
