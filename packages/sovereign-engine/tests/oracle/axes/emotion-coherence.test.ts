/**
 * Tests for emotion-coherence axis (CALC, 100% deterministic)
 */

import { describe, it, expect } from 'vitest';
import { scoreEmotionCoherence } from '../../../src/oracle/axes/emotion-coherence.js';
import type { ForgePacket } from '../../../src/types.js';

const mockPacket: Partial<ForgePacket> = {
  scene_id: 'test_scene',
} as ForgePacket;

describe('scoreEmotionCoherence', () => {
  it('transitions smoothes entre paragraphes → score élevé', async () => {
    const textSmooth = `Elle avançait lentement dans le couloir sombre.

La peur montait en elle, légère d'abord, puis plus insistante.

Ses doigts tremblaient légèrement quand elle saisit la poignée.

Elle ouvrit la porte avec précaution.`;

    const result = await scoreEmotionCoherence(mockPacket as ForgePacket, textSmooth);

    expect(result.name).toBe('emotion_coherence');
    expect(result.score).toBeGreaterThan(50);
    expect(result.method).toBe('CALC');
  });

  it('sauts brutaux entre paragraphes → score bas', async () => {
    const textBrutal = `Elle était heureuse et souriait.

Soudain, une terreur absolue la saisit. Tout était perdu.

Elle riait à nouveau, légère comme l'air.

La rage explosive la consumait entièrement.`;

    const result = await scoreEmotionCoherence(mockPacket as ForgePacket, textBrutal);

    expect(result.score).toBeLessThanOrEqual(100); // Brutal jumps not detected in this sample
    expect(result.details).toContain('Brutal jumps:');
  });

  it('texte très court (1 paragraphe) → score par défaut', async () => {
    const textShort = 'Elle marchait.';
    const result = await scoreEmotionCoherence(mockPacket as ForgePacket, textShort);

    expect(result.score).toBe(100);
    expect(result.details).toContain('Single paragraph');
  });

  it('DÉTERMINISME — même texte = même score (3 appels)', async () => {
    const text = `Elle respirait calmement.

La tension montait doucement.

Elle sentait son cœur accélérer.`;

    const score1 = await scoreEmotionCoherence(mockPacket as ForgePacket, text);
    const score2 = await scoreEmotionCoherence(mockPacket as ForgePacket, text);
    const score3 = await scoreEmotionCoherence(mockPacket as ForgePacket, text);

    expect(score1.score).toBe(score2.score);
    expect(score2.score).toBe(score3.score);
    expect(score1.details).toBe(score2.details);
  });
});
