/**
 * Tests pour macro-axes (ECC/RCI/SII/IFI)
 */

import { describe, it, expect } from 'vitest';
import { computeRCI } from '../../src/oracle/macro-axes.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';
import { PROSE_GOOD, PROSE_FLAT } from '../fixtures/mock-prose.js';

describe('computeRCI', () => {
  it('RCI calculé avec rhythm + signature fusionnés', async () => {
    const result = await computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(result.name).toBe('rci');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.weight).toBe(0.17); // Sprint 11 adjusted
    expect(result.method).toBe('CALC');
  });

  it('RCI a 5 sous-composants: rhythm, signature, hook_presence, euphony_basic, voice_conformity', async () => {
    const result = await computeRCI(MOCK_PACKET, PROSE_GOOD);

    // Sprint 15: +euphony_basic, RCI-FIX: +voice_conformity (always included)
    expect(result.sub_scores).toHaveLength(5);
    expect(result.sub_scores[0].name).toBe('rhythm');
    expect(result.sub_scores[1].name).toBe('signature');
    expect(result.sub_scores[2].name).toBe('hook_presence');
    expect(result.sub_scores[3].name).toBe('euphony_basic');
    expect(result.sub_scores[4].name).toBe('voice_conformity');
  });

  it('RCI avec texte plat → score bas', async () => {
    const result = await computeRCI(MOCK_PACKET, PROSE_FLAT);

    expect(result.score).toBeLessThan(65);
  });

  it('RCI a des ScoreReasons (top contributors + penalties)', async () => {
    const result = await computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(result.reasons).toBeDefined();
    expect(result.reasons.top_contributors).toBeInstanceOf(Array);
    expect(result.reasons.top_penalties).toBeInstanceOf(Array);
  });

  it('RCI bonuses array présent (peut être vide)', async () => {
    const result = await computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(result.bonuses).toBeDefined();
    expect(result.bonuses).toBeInstanceOf(Array);
  });

  it('DÉTERMINISME — RCI même texte = même score (3 appels)', async () => {
    const score1 = await computeRCI(MOCK_PACKET, PROSE_GOOD);
    const score2 = await computeRCI(MOCK_PACKET, PROSE_GOOD);
    const score3 = await computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(score1.score).toBe(score2.score);
    expect(score2.score).toBe(score3.score);
    expect(score1.bonuses).toEqual(score2.bonuses);
  });

  it('RCI poids répartis sur 5 sub-scores (Sprint 15 + RCI-FIX)', async () => {
    const result = await computeRCI(MOCK_PACKET, PROSE_GOOD);

    // Sprint 15: +euphony_basic, RCI-FIX: +voice_conformity (always included)
    expect(result.sub_scores.length).toBe(5);

    // All sub-scores contribute to RCI via weight-based fusion
    const totalWeight = result.sub_scores.reduce((sum, s) => sum + s.weight, 0);
    expect(totalWeight).toBeGreaterThan(0);

    // Score should be in valid range
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('RCI score capé à [0, 100]', async () => {
    const result = await computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('MacroAxisScore structure', () => {
  it('MacroAxisScore a tous les champs requis', async () => {
    const result = await computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('weight');
    expect(result).toHaveProperty('method');
    expect(result).toHaveProperty('sub_scores');
    expect(result).toHaveProperty('bonuses');
    expect(result).toHaveProperty('reasons');
  });

  it('ScoreReasons a top_contributors et top_penalties', async () => {
    const result = await computeRCI(MOCK_PACKET, PROSE_GOOD);

    expect(result.reasons).toHaveProperty('top_contributors');
    expect(result.reasons).toHaveProperty('top_penalties');
    expect(Array.isArray(result.reasons.top_contributors)).toBe(true);
    expect(Array.isArray(result.reasons.top_penalties)).toBe(true);
  });

  it('BonusMalus a type, value, triggered, detail', async () => {
    const result = await computeRCI(MOCK_PACKET, PROSE_GOOD);

    if (result.bonuses.length > 0) {
      const bonus = result.bonuses[0];
      expect(bonus).toHaveProperty('type');
      expect(bonus).toHaveProperty('value');
      expect(bonus).toHaveProperty('triggered');
      expect(bonus).toHaveProperty('detail');
    }
  });
});
