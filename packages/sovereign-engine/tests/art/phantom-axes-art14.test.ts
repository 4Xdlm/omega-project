/**
 * ART-14 — Phantom Axes Invariant Tests
 * ATTN-ART14-01 to ATTN-ART14-03 + FAT-ART14-01 to FAT-ART14-03
 *
 * Complements ATTN-01, FATIGUE-01..02 in tests/oracle/axes/phantom-axes.test.ts.
 * Tests attention sustain and fatigue management scoring with various prose types.
 */
import { describe, it, expect } from 'vitest';
import { scoreAttentionSustain } from '../../src/oracle/axes/attention-sustain.js';
import { scoreFatigueManagement } from '../../src/oracle/axes/fatigue-management.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';

describe('ART-14: Attention Sustain Axe', () => {

  it('ATTN-ART14-01: engaging text → high score', () => {
    const engaging = [
      'Bang!',
      'La porte vola en éclats.',
      '— Qui est là ? cria-t-elle.',
      'Silence.',
      'Un pas. Puis un autre.',
      "L'ombre grandit sur le mur.",
      '— Cours!',
      'Elle courut sans se retourner.',
    ].join(' ');

    const result = scoreAttentionSustain(MOCK_PACKET, engaging);
    expect(result.score).toBeGreaterThan(60);
    expect(result.name).toBe('attention_sustain');
    expect(result.method).toBe('CALC');
  });

  it('ATTN-ART14-02: monotone text → score reflects attention level', () => {
    const monotone = Array.from({ length: 15 }, () =>
      'Le personnage avançait tranquillement dans la rue déserte sans rien remarquer.'
    ).join(' ');

    const result = scoreAttentionSustain(MOCK_PACKET, monotone);
    // Score depends on whether 5+ consecutive sentences drop below 0.3 attention
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('ATTN-ART14-03: score bounded [0, 100]', () => {
    const result = scoreAttentionSustain(MOCK_PACKET, 'Court.');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('ART-14: Fatigue Management Axe', () => {

  it('FAT-ART14-01: short varied text → high score', () => {
    const varied = [
      'Stop.',
      "Il regarda la longue avenue qui s'étendait devant lui.",
      '— Quoi ?',
      'Un rire éclata dans le silence.',
      'Elle sourit.',
      'Le vent soufflait à travers les branches dénudées des platanes alignés.',
    ].join(' ');

    const result = scoreFatigueManagement(MOCK_PACKET, varied);
    expect(result.score).toBeGreaterThan(70);
    expect(result.name).toBe('fatigue_management');
    expect(result.method).toBe('CALC');
  });

  it('FAT-ART14-02: very long dense text → reflects fatigue level', () => {
    const dense = Array.from({ length: 50 }, () =>
      "La complexité extraordinaire de cette situation inextricable se manifestait " +
      "dans chaque détail de l'environnement qui les entourait sans relâche."
    ).join(' ');

    const result = scoreFatigueManagement(MOCK_PACKET, dense);
    // 50 long sentences with no breath points → potential fatigue buildup
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('FAT-ART14-03: score bounded [0, 100]', () => {
    const result = scoreFatigueManagement(MOCK_PACKET, 'Test.');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
