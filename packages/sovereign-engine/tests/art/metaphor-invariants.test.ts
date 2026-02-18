/**
 * ART-12 — Metaphor Invariant Tests
 * BL-05 to BL-07 + META-04 to META-06
 *
 * Complements BL-01..04 in tests/metaphor/dead-metaphor-blacklist.test.ts
 * and META-SCORE-01..03 in tests/metaphor/novelty-scorer.test.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  DEAD_METAPHORS_FR,
  isDeadMetaphor,
  detectDeadMetaphors,
} from '../../src/metaphor/dead-metaphor-blacklist.js';
import { scoreMetaphorNovelty } from '../../src/metaphor/novelty-scorer.js';
import type { MetaphorHit } from '../../src/metaphor/metaphor-detector.js';

describe('ART-12: Dead Metaphor Blacklist Invariants', () => {

  it('BL-05: empty text → 0 matches', () => {
    const result = detectDeadMetaphors('');
    expect(result.dead_count).toBe(0);
    expect(result.matches).toHaveLength(0);
  });

  it('BL-06: case/accent normalization on full prose', () => {
    const result = detectDeadMetaphors('LE CŒUR SERRÉ, il avança dans la nuit.');
    expect(result.dead_count).toBeGreaterThanOrEqual(1);
    expect(result.matches.some(m => m.metaphor.includes('cœur serré') || m.metaphor.includes('coeur serré'))).toBe(true);
  });

  it('BL-07: detectDeadMetaphors scans full prose with positions', () => {
    const prose = 'Le cœur serré, les larmes aux yeux, il avança. Un froid glacial régnait.';
    const result = detectDeadMetaphors(prose);

    expect(result.dead_count).toBeGreaterThanOrEqual(2);
    expect(result.matches.length).toBeGreaterThanOrEqual(2);

    // Each match has a position
    for (const match of result.matches) {
      expect(match.position).toBeGreaterThanOrEqual(0);
      expect(typeof match.metaphor).toBe('string');
    }
  });
});

describe('ART-12: Metaphor Novelty Invariants', () => {

  it('META-04: scoreMetaphorNovelty bounded [0, 100]', async () => {
    // All dead metaphors → score 0
    const deadMetaphors: MetaphorHit[] = Array.from({ length: 5 }, (_, i) => ({
      text: `dead metaphor ${i}`,
      position: i * 50,
      type: 'metaphor' as const,
      is_dead: true,
      novelty_score: 0,
    }));

    const r1 = await scoreMetaphorNovelty(deadMetaphors, DEAD_METAPHORS_FR);
    expect(r1.final_score).toBeGreaterThanOrEqual(0);
    expect(r1.final_score).toBeLessThanOrEqual(100);

    // All original → high score
    const originalMetaphors: MetaphorHit[] = Array.from({ length: 3 }, (_, i) => ({
      text: `original metaphor ${i}`,
      position: i * 50,
      type: 'metaphor' as const,
      is_dead: false,
      novelty_score: 95,
    }));

    const r2 = await scoreMetaphorNovelty(originalMetaphors, DEAD_METAPHORS_FR);
    expect(r2.final_score).toBeGreaterThanOrEqual(0);
    expect(r2.final_score).toBeLessThanOrEqual(100);
  });

  it('META-05: scoreMetaphorNovelty deterministic', async () => {
    const metaphors: MetaphorHit[] = [
      { text: 'test metaphor', position: 0, type: 'metaphor', is_dead: false, novelty_score: 80 },
      { text: 'dead one', position: 50, type: 'metaphor', is_dead: true, novelty_score: 0 },
    ];

    const r1 = await scoreMetaphorNovelty(metaphors, DEAD_METAPHORS_FR);
    const r2 = await scoreMetaphorNovelty(metaphors, DEAD_METAPHORS_FR);

    expect(r1.final_score).toBe(r2.final_score);
    expect(r1.dead_count).toBe(r2.dead_count);
    expect(r1.avg_novelty).toBe(r2.avg_novelty);
  });

  it('META-06: mixed metaphors (dead + original) → intermediate score', async () => {
    const metaphors: MetaphorHit[] = [
      { text: 'le cœur serré', position: 0, type: 'metaphor', is_dead: true, novelty_score: 0 },
      { text: 'ses pensées en origami', position: 50, type: 'metaphor', is_dead: false, novelty_score: 90 },
    ];

    const result = await scoreMetaphorNovelty(metaphors, DEAD_METAPHORS_FR);

    // 1 dead + 1 original: dead_ratio = 0.5, avg_novelty = (0+90)/2 = 45
    // final = 45 * (1 - 0.5) = 22.5
    expect(result.dead_count).toBe(1);
    expect(result.dead_ratio).toBe(0.5);
    expect(result.final_score).toBeGreaterThan(0);
    expect(result.final_score).toBeLessThan(70); // Lower than neutral
  });
});
