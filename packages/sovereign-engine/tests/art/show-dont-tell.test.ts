/**
 * ART-11 — Show-Don't-Tell Invariant Tests
 * SDT-06 to SDT-08
 *
 * Complements SDT-01..05 in tests/silence/show-dont-tell.test.ts.
 * Tests EMOTION_LEXICON_FR, scoreShowDontTell formula, and determinism.
 */
import { describe, it, expect } from 'vitest';
import { detectTelling, scoreShowDontTell } from '../../src/silence/show-dont-tell.js';
import { TELLING_PATTERNS_FR, EMOTION_LEXICON_FR } from '../../src/silence/telling-patterns.js';
import type { TellingResult, TellingViolation } from '../../src/silence/show-dont-tell.js';

describe('ART-11: Show-Dont-Tell Invariants', () => {

  it('SDT-06: emotion lexicon has 40+ words', () => {
    expect(EMOTION_LEXICON_FR.length).toBeGreaterThanOrEqual(40);

    // Verify key emotions are present
    const expected = ['triste', 'heureux', 'furieux', 'effrayé', 'anxieux', 'nerveux',
      'soulagé', 'désespéré', 'jaloux', 'bouleversé', 'déçu'];
    for (const word of expected) {
      expect(EMOTION_LEXICON_FR).toContain(word);
    }

    // No duplicates
    const unique = new Set(EMOTION_LEXICON_FR);
    expect(unique.size).toBe(EMOTION_LEXICON_FR.length);
  });

  it('SDT-07: scoring formula correct', () => {
    // Helper to build a TellingResult with controlled violations
    function buildResult(violations: TellingViolation[]): TellingResult {
      return {
        violations,
        show_ratio: 0,
        telling_count: violations.length,
        total_emotional_expressions: violations.length,
        worst_violations: violations.slice(0, 5),
        score: 0, // Not used by scoreShowDontTell
      };
    }

    function makeViolation(severity: 'critical' | 'high' | 'medium'): TellingViolation {
      return {
        sentence_index: 0,
        sentence: 'test',
        pattern_id: 'TEST',
        severity,
        suggested_show: 'fix',
      };
    }

    // 0 critical → 100
    expect(scoreShowDontTell(buildResult([]))).toBe(100);

    // 1 critical → 75
    expect(scoreShowDontTell(buildResult([
      makeViolation('critical'),
    ]))).toBe(75);

    // 2 critical → 50
    expect(scoreShowDontTell(buildResult([
      makeViolation('critical'),
      makeViolation('critical'),
    ]))).toBe(50);

    // 3 critical → max(0, 100 - 60) = 40
    const threeCritical = scoreShowDontTell(buildResult([
      makeViolation('critical'),
      makeViolation('critical'),
      makeViolation('critical'),
    ]));
    expect(threeCritical).toBeLessThanOrEqual(40);

    // High adjustments: -5 each, max -20
    const oneHighOnly = scoreShowDontTell(buildResult([
      makeViolation('high'),
    ]));
    expect(oneHighOnly).toBe(95); // 100 - 5

    // Medium adjustments: -2 each, max -10
    const oneMediumOnly = scoreShowDontTell(buildResult([
      makeViolation('medium'),
    ]));
    expect(oneMediumOnly).toBe(98); // 100 - 2

    // Score always [0, 100]
    const manyViolations = Array.from({ length: 10 }, () => makeViolation('critical'));
    const lowScore = scoreShowDontTell(buildResult(manyViolations));
    expect(lowScore).toBeGreaterThanOrEqual(0);
    expect(lowScore).toBeLessThanOrEqual(100);
  });

  it('SDT-08: deterministic — same text → same result', () => {
    const text = 'Il ressentait une profonde angoisse. La porte grinça. Elle éprouvait de la tristesse.';
    const r1 = detectTelling(text);
    const r2 = detectTelling(text);

    expect(r1.telling_count).toBe(r2.telling_count);
    expect(r1.show_ratio).toBe(r2.show_ratio);
    expect(r1.score).toBe(r2.score);
    expect(r1.violations.length).toBe(r2.violations.length);

    for (let i = 0; i < r1.violations.length; i++) {
      expect(r1.violations[i].pattern_id).toBe(r2.violations[i].pattern_id);
      expect(r1.violations[i].severity).toBe(r2.violations[i].severity);
    }
  });
});
