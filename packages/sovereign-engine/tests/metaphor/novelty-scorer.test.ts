/**
 * Tests: Metaphor Novelty Scorer (Sprint 12.2)
 * Invariants: ART-META-02, ART-META-03
 */

import { describe, it, expect } from 'vitest';
import { scoreMetaphorNovelty } from '../../src/metaphor/novelty-scorer.js';
import { DEAD_METAPHORS_FR } from '../../src/metaphor/dead-metaphor-blacklist.js';
import type { MetaphorHit } from '../../src/metaphor/metaphor-detector.js';

describe('Metaphor Novelty Scorer (ART-META-02, ART-META-03)', () => {
  it('META-SCORE-01: prose avec clichés ("le cœur serré", "les larmes aux yeux") → score bas', async () => {
    const metaphors: MetaphorHit[] = [
      {
        text: 'le cœur serré',
        position: 0,
        type: 'metaphor',
        is_dead: true, // Dead metaphor from blacklist
        novelty_score: 0, // Dead → 0
      },
      {
        text: 'les larmes aux yeux',
        position: 50,
        type: 'metaphor',
        is_dead: true,
        novelty_score: 0,
      },
    ];

    const result = await scoreMetaphorNovelty(metaphors, DEAD_METAPHORS_FR);

    // All dead metaphors → dead_ratio = 1.0 → final_score = avg_novelty × (1 - 1.0) = 0
    expect(result.dead_count).toBe(2);
    expect(result.total_metaphors).toBe(2);
    expect(result.dead_ratio).toBe(1.0);
    expect(result.final_score).toBe(0); // Completely killed by dead_ratio
  });

  it('META-SCORE-02: prose avec métaphores originales → score élevé', async () => {
    const metaphors: MetaphorHit[] = [
      {
        text: 'la charpente de son âme s\'effritait comme du calcaire sous l\'acide',
        position: 0,
        type: 'metaphor',
        is_dead: false,
        novelty_score: 92,
      },
      {
        text: 'ses pensées se dépliaient en origami inversé',
        position: 100,
        type: 'metaphor',
        is_dead: false,
        novelty_score: 88,
      },
      {
        text: 'le silence avait la texture d\'un velours déchiré',
        position: 200,
        type: 'analogy',
        is_dead: false,
        novelty_score: 85,
      },
    ];

    const result = await scoreMetaphorNovelty(metaphors, DEAD_METAPHORS_FR);

    // No dead metaphors → dead_ratio = 0 → final_score = avg_novelty × (1 - 0) = avg_novelty
    expect(result.dead_count).toBe(0);
    expect(result.total_metaphors).toBe(3);
    expect(result.dead_ratio).toBe(0);
    expect(result.avg_novelty).toBeCloseTo((92 + 88 + 85) / 3, 1); // ~88.33
    expect(result.final_score).toBeCloseTo((92 + 88 + 85) / 3, 1); // ~88.33
  });

  it('META-SCORE-03: prose sans aucune métaphore → score 70 (neutre)', async () => {
    const metaphors: MetaphorHit[] = [];

    const result = await scoreMetaphorNovelty(metaphors, DEAD_METAPHORS_FR);

    // No metaphors → neutral score 70 (not penalized)
    expect(result.dead_count).toBe(0);
    expect(result.total_metaphors).toBe(0);
    expect(result.dead_ratio).toBe(0);
    expect(result.avg_novelty).toBe(70);
    expect(result.final_score).toBe(70);
  });
});
