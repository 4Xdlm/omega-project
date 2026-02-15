/**
 * Tests for anti-cliche axis (CALC, 100% deterministic)
 */

import { describe, it, expect } from 'vitest';
import { scoreAntiCliche } from '../../../src/oracle/axes/anti-cliche.js';
import { PROSE_GOOD, PROSE_BAD } from '../../fixtures/mock-prose.js';
import type { ForgePacket } from '../../../src/types.js';

const mockPacket: Partial<ForgePacket> = {
  scene_id: 'test_scene',
  kill_lists: {
    banned_cliches: [
      'cœur battait la chamade',
      'frisson parcourait',
      'temps sembla s\'arrêter',
      'silence pesant',
      'larmes coulèrent',
      'sang ne fit qu\'un tour',
    ],
    banned_ai_patterns: ['dans l\'air flottait', 'force est de constater'],
    banned_filter_words: ['il sentit', 'elle remarqua', 'il n\'en croyait pas'],
    banned_words: [],
  },
} as ForgePacket;

describe('scoreAntiCliche', () => {
  it('texte sans aucun cliché → score 100', () => {
    const result = scoreAntiCliche(mockPacket as ForgePacket, PROSE_GOOD);

    expect(result.name).toBe('anti_cliche');
    expect(result.score).toBe(100);
    expect(result.method).toBe('CALC');
  });

  it('texte avec 1 cliché → score 85 (graduated: 100 - 1×15)', () => {
    const textWith1Cliche = 'Le cœur battait la chamade. Elle marchait vite. Le vent soufflait fort.';
    const result = scoreAntiCliche(mockPacket as ForgePacket, textWith1Cliche);

    expect(result.score).toBe(85);
  });

  it('texte avec 6+ clichés → score 10 (graduated: 100 - 6×15 = 10)', () => {
    const result = scoreAntiCliche(mockPacket as ForgePacket, PROSE_BAD);

    expect(result.score).toBe(10);
    expect(result.details).toContain('Total matches:');
  });

  it('texte avec AI patterns → pénalité', () => {
    const textWithAI = 'Dans l\'air flottait une tension. Force est de constater que tout avait changé.';
    const result = scoreAntiCliche(mockPacket as ForgePacket, textWithAI);

    expect(result.score).toBeLessThan(100);
  });

  it('texte avec filter words → pénalité', () => {
    const textWithFilter = 'Il sentit la peur monter. Elle remarqua son regard.';
    const result = scoreAntiCliche(mockPacket as ForgePacket, textWithFilter);

    expect(result.score).toBeLessThan(100);
  });

  it('case insensitive matching', () => {
    const textUpperCase = 'LE CŒUR BATTAIT LA CHAMADE. ELLE AVANÇAIT.';
    const result = scoreAntiCliche(mockPacket as ForgePacket, textUpperCase);

    expect(result.score).toBe(85);
  });

  it('DÉTERMINISME — même texte = même score (3 appels)', () => {
    const score1 = scoreAntiCliche(mockPacket as ForgePacket, PROSE_GOOD);
    const score2 = scoreAntiCliche(mockPacket as ForgePacket, PROSE_GOOD);
    const score3 = scoreAntiCliche(mockPacket as ForgePacket, PROSE_GOOD);

    expect(score1.score).toBe(score2.score);
    expect(score2.score).toBe(score3.score);
    expect(score1.details).toBe(score2.details);
  });
});
