/**
 * Tests: VoiceGenome injection in golden-loader (RCI-VOICE)
 * Validates that loadGoldenRun produces a ForgePacket with voice genome defined.
 */

import { describe, it, expect } from 'vitest';
import { loadGoldenRun } from '../../src/runtime/golden-loader.js';
import { scoreVoiceConformity } from '../../src/oracle/axes/voice-conformity.js';
import type { VoiceGenome } from '../../src/voice/voice-genome.js';
import * as path from 'node:path';

const GOLDEN_RUN_PATH = path.resolve(
  process.cwd(),
  '../../golden/e2e/run_001/runs/13535cccff86620f',
);

describe('VoiceGenome Injection [RCI-VOICE]', () => {
  it('VOICE-INJECT-01: loadGoldenRun returns packet with style_profile.voice defined', () => {
    const result = loadGoldenRun(GOLDEN_RUN_PATH, 0, 'TEST-VOICE-01');

    expect(result.style_profile.voice).toBeDefined();
    expect(result.style_profile.voice).not.toBeNull();
  });

  it('VOICE-INJECT-02: voice genome has 10 fields, all in [0, 1]', () => {
    const result = loadGoldenRun(GOLDEN_RUN_PATH, 0, 'TEST-VOICE-02');
    const voice = result.style_profile.voice as VoiceGenome;

    const fields: (keyof VoiceGenome)[] = [
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

    expect(Object.keys(voice).length).toBe(10);

    for (const field of fields) {
      expect(voice[field]).toBeGreaterThanOrEqual(0);
      expect(voice[field]).toBeLessThanOrEqual(1);
    }
  });

  it('VOICE-INJECT-03: scoreVoiceConformity returns score != 70 when voice defined', async () => {
    const result = loadGoldenRun(GOLDEN_RUN_PATH, 0, 'TEST-VOICE-03');

    // Build a mock ForgePacket with the loaded style_profile
    const packet = {
      style_genome: result.style_profile,
    } as any;

    // French prose that should produce a measurable voice genome
    const prose = `
La lumière déclinait sur les toits de la ville. Marie observait le ciel rougeoyant
depuis la fenêtre de sa chambre. Les ombres s'allongeaient dans la cour intérieure,
dessinant des formes étranges sur les murs de pierre.

Elle se souvenait des jours anciens, quand la rue résonnait encore des cris des
marchands ambulants. Le parfum du pain frais montait de la boulangerie du coin.

Un silence pesant envahissait maintenant chaque recoin de l'immeuble. Les voisins
avaient disparu, un par un, comme des feuilles emportées par le vent d'automne.
    `.trim();

    const score = await scoreVoiceConformity(packet, prose);

    // With a voice genome defined, scoreVoiceConformity should compute a real score
    // (not the neutral 70 returned when no voice genome exists)
    expect(score.score).not.toBe(70);
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.details).not.toContain('neutral');
  });
});
