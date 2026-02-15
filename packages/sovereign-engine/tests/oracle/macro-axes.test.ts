/**
 * Tests pour macro-axes (ECC/RCI/SII/IFI)
 */

import { describe, it, expect } from 'vitest';
import { computeRCI } from '../../src/oracle/macro-axes.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';
import { PROSE_GOOD, PROSE_FLAT } from '../fixtures/mock-prose.js';

describe('computeRCI', () => {
  it('RCI calculé avec rhythm + signature fusionnés', () => {
    const result = computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(result.name).toBe('rci');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.weight).toBe(0.15);
    expect(result.method).toBe('CALC');
  });

  it('RCI a 3 sous-composants: rhythm, signature, hook_presence', () => {
    const result = computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(result.sub_scores).toHaveLength(3);
    expect(result.sub_scores[0].name).toBe('rhythm');
    expect(result.sub_scores[1].name).toBe('signature');
    expect(result.sub_scores[2].name).toBe('hook_presence'); // V2: Added hook verification
  });

  it('RCI avec texte plat → score bas', () => {
    const result = computeRCI(MOCK_PACKET, PROSE_FLAT);

    expect(result.score).toBeLessThan(50);
  });

  it('RCI a des ScoreReasons (top contributors + penalties)', () => {
    const result = computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(result.reasons).toBeDefined();
    expect(result.reasons.top_contributors).toBeInstanceOf(Array);
    expect(result.reasons.top_penalties).toBeInstanceOf(Array);
  });

  it('RCI bonuses array présent (peut être vide)', () => {
    const result = computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(result.bonuses).toBeDefined();
    expect(result.bonuses).toBeInstanceOf(Array);
  });

  it('DÉTERMINISME — RCI même texte = même score (3 appels)', () => {
    const score1 = computeRCI(MOCK_PACKET, PROSE_GOOD);
    const score2 = computeRCI(MOCK_PACKET, PROSE_GOOD);
    const score3 = computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(score1.score).toBe(score2.score);
    expect(score2.score).toBe(score3.score);
    expect(score1.bonuses).toEqual(score2.bonuses);
  });

  it('RCI poids correctement répartis (0.45 rhythm, 0.35 signature, 0.20 hooks)', () => {
    const result = computeRCI(MOCK_PACKET, PROSE_GOOD);

    // V2: New weight blend includes hook_presence
    expect(result.sub_scores.length).toBe(3);
    const rhythm_score = result.sub_scores.find((s) => s.name === 'rhythm')!.score;
    const signature_score = result.sub_scores.find((s) => s.name === 'signature')!.score;
    const hook_score = result.sub_scores.find((s) => s.name === 'hook_presence')!.score;
    const expected = rhythm_score * 0.45 + signature_score * 0.35 + hook_score * 0.20;

    // Le score final peut avoir un malus anti-métronomique, donc on vérifie la proximité
    expect(Math.abs(result.score - expected)).toBeLessThan(10);
  });

  it('RCI score capé à [0, 100]', () => {
    const result = computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('MacroAxisScore structure', () => {
  it('MacroAxisScore a tous les champs requis', () => {
    const result = computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('weight');
    expect(result).toHaveProperty('method');
    expect(result).toHaveProperty('sub_scores');
    expect(result).toHaveProperty('bonuses');
    expect(result).toHaveProperty('reasons');
  });

  it('ScoreReasons a top_contributors et top_penalties', () => {
    const result = computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(result.reasons).toHaveProperty('top_contributors');
    expect(result.reasons).toHaveProperty('top_penalties');
    expect(Array.isArray(result.reasons.top_contributors)).toBe(true);
    expect(Array.isArray(result.reasons.top_penalties)).toBe(true);
  });

  it('BonusMalus a type, value, triggered, detail', () => {
    const result = computeRCI(MOCK_PACKET, PROSE_GOOD);

    if (result.bonuses.length > 0) {
      const bonus = result.bonuses[0];
      expect(bonus).toHaveProperty('type');
      expect(bonus).toHaveProperty('value');
      expect(bonus).toHaveProperty('triggered');
      expect(bonus).toHaveProperty('detail');
    }
  });
});
