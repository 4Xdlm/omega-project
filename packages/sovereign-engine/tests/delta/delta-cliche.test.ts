/**
 * Tests for delta-cliche
 */

import { describe, it, expect } from 'vitest';
import { computeClicheDelta } from '../../src/delta/delta-cliche.js';
import { PROSE_GOOD, PROSE_BAD } from '../fixtures/mock-prose.js';
import type { ForgePacket } from '../../src/types.js';

const mockPacket: Partial<ForgePacket> = {
  kill_lists: {
    banned_cliches: ['cœur battait', 'frisson parcourut', 'silence pesant'],
    banned_ai_patterns: ['dans l\'air flottait'],
    banned_filter_words: ['il sentit', 'elle remarqua'],
    banned_words: [],
  },
} as ForgePacket;

describe('computeClicheDelta', () => {
  it('texte propre → 0 matchs', () => {
    const result = computeClicheDelta(mockPacket as ForgePacket, PROSE_GOOD);

    expect(result.total_matches).toBe(0);
    expect(result.matches).toHaveLength(0);
  });

  it('texte avec clichés → matchs détectés avec localisation', () => {
    const result = computeClicheDelta(mockPacket as ForgePacket, PROSE_BAD);

    expect(result.total_matches).toBeGreaterThan(0);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0]).toHaveProperty('pattern');
    expect(result.matches[0]).toHaveProperty('location');
    expect(result.matches[0]).toHaveProperty('category');
  });

  it('texte avec AI patterns → matchs séparés', () => {
    const textWithAI = 'Dans l\'air flottait une tension.';
    const result = computeClicheDelta(mockPacket as ForgePacket, textWithAI);

    expect(result.ai_pattern_matches).toBeGreaterThan(0);
  });
});
