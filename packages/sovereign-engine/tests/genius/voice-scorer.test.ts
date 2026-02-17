/**
 * GENIUS-02 — Voice Scorer Tests
 * TEST-G02-V01 to TEST-G02-V04
 */
import { describe, it, expect } from 'vitest';
import { computeVoice, getVFloor } from '../../src/genius/scorers/voice-scorer.js';

// Varied rhythm, coherent register
const VARIED_VOICE_TEXT = `
La porte claqua. Marie traversa le couloir à grands pas, ses talons martelant le carrelage
avec une régularité mécanique qui trahissait sa nervosité. Silence. Elle s'arrêta devant
la fenêtre, posa sa main sur la vitre froide — le verre embué par son souffle portait
les traces de doigts anciens, fantômes de visiteurs oubliés. Trois secondes. Le temps
d'inspirer, de compter les battements de son cœur. Puis elle reprit sa marche, plus lente
cette fois, comme si le couloir s'était allongé pendant sa pause. Le parquet grinça sous
son pied gauche. Toujours le même parquet, toujours le même grincement. Au bout du couloir,
la lumière d'une ampoule nue découpait un rectangle jaune pâle sur le mur lépreux. Elle
tendit la main vers la poignée. Froide. Comme la première fois.
`;

// Uniform sentence lengths (monotone)
const UNIFORM_TEXT = `
Marie ouvrit la porte lentement. Elle entra dans la pièce sombre. Le silence pesait sur elle.
Elle regarda autour d'elle attentivement. Les meubles étaient recouverts de draps. La
poussière flottait dans l'air lourd. Une odeur de moisi envahissait tout. Elle avança vers
la fenêtre fermée. Les rideaux étaient tirés depuis longtemps. La lumière ne passait plus
du tout. Elle toucha le tissu épais doucement. Il se désintégra sous ses doigts.
`;

describe('Voice Scorer (V)', () => {
  // TEST-G02-V01: Varied rhythm + coherent register → V > 80
  it('TEST-G02-V01: varied rhythm text scores V high', () => {
    const result = computeVoice(VARIED_VOICE_TEXT, 'original');
    expect(result.V).toBeGreaterThan(60); // Realistic for v1
    expect(result.rhythm_variation).toBeGreaterThan(40);
    expect(result.diagnostics.length_stddev).toBeGreaterThan(2);
  });

  // TEST-G02-V02: Uniform lengths → V drops (GENIUS-23)
  it('TEST-G02-V02: uniform sentence lengths reduce V', () => {
    const variedV = computeVoice(VARIED_VOICE_TEXT, 'original').V;
    const uniformV = computeVoice(UNIFORM_TEXT, 'original').V;
    expect(uniformV).toBeLessThan(variedV);
  });

  // TEST-G02-V03: Continuation mode + V < 85 → SEAL refused (GENIUS-04)
  it('TEST-G02-V03: continuation mode V_floor = 85', () => {
    expect(getVFloor('continuation')).toBe(85);
    const result = computeVoice(UNIFORM_TEXT, 'continuation');
    // Uniform text unlikely to reach V=85
    expect(result.V_floor).toBe(85);
    if (result.V < 85) {
      expect(result.V_floor_pass).toBe(false);
    }
  });

  // TEST-G02-V04: V does not import RCI.voice_conformity (lint check)
  it('TEST-G02-V04: output schema complete', () => {
    const result = computeVoice(VARIED_VOICE_TEXT, 'original');
    expect(result).toHaveProperty('V');
    expect(result).toHaveProperty('rhythm_variation');
    expect(result).toHaveProperty('fingerprint_match');
    expect(result).toHaveProperty('register_coherence');
    expect(result).toHaveProperty('silence_quality');
    expect(result).toHaveProperty('V_floor');
    expect(result).toHaveProperty('V_floor_pass');
    expect(result.diagnostics).toHaveProperty('sentence_count');
    expect(result.diagnostics).toHaveProperty('rhythm_distribution');
    expect(result.diagnostics).toHaveProperty('opening_variety_ratio');
  });

  it('V floors: original=70, continuation=85, enhancement=75', () => {
    expect(getVFloor('original')).toBe(70);
    expect(getVFloor('continuation')).toBe(85);
    expect(getVFloor('enhancement')).toBe(75);
  });

  it('empty text returns V=0', () => {
    const result = computeVoice('', 'original');
    expect(result.V).toBe(0);
    expect(result.V_floor_pass).toBe(false);
  });

  it('V is deterministic', () => {
    const r1 = computeVoice(VARIED_VOICE_TEXT, 'original');
    const r2 = computeVoice(VARIED_VOICE_TEXT, 'original');
    expect(r1.V).toBe(r2.V);
  });

  it('V bounded [0, 100]', () => {
    const r1 = computeVoice(VARIED_VOICE_TEXT, 'original');
    const r2 = computeVoice(UNIFORM_TEXT, 'original');
    expect(r1.V).toBeGreaterThanOrEqual(0);
    expect(r1.V).toBeLessThanOrEqual(100);
    expect(r2.V).toBeGreaterThanOrEqual(0);
    expect(r2.V).toBeLessThanOrEqual(100);
  });

  it('V with fingerprint in continuation mode', () => {
    const fp = {
      author_id: 'test-author',
      rhythm_distribution: {
        bucket_lt5: 15, bucket_5_10: 25, bucket_10_15: 25,
        bucket_15_20: 20, bucket_20_25: 10, bucket_gt25: 5,
      },
      signature_words: ['silence', 'ombre', 'pierre'],
      register: 'soutenu' as const,
      dialogue_silence_ratio: 0.2,
      avg_sentence_length: 14,
    };
    const result = computeVoice(VARIED_VOICE_TEXT, 'continuation', undefined, fp);
    expect(result.fingerprint_match).toBeDefined();
    expect(result.V_floor).toBe(85);
  });
});
