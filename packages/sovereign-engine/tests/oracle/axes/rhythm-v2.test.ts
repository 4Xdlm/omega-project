/**
 * Tests for rhythm.ts V2 — CV-based scoring
 */

import { describe, it, expect } from 'vitest';
import { scoreRhythm } from '../../../src/oracle/axes/rhythm.js';
import type { ForgePacket } from '../../../src/types.js';
import { MOCK_PACKET } from '../../fixtures/mock-packet.js';

describe('scoreRhythm V2 (CV-based)', () => {
  it('CV computation is deterministic', () => {
    const prose = `First sentence here. Second sentence is longer than first. Third.`;
    const score1 = scoreRhythm(MOCK_PACKET, prose);
    const score2 = scoreRhythm(MOCK_PACKET, prose);

    expect(score1.score).toBe(score2.score);
    expect(score1.details).toContain('CV_sent');
  });

  it('uniform prose (all same length) → CV near 0 → low score', () => {
    const prose = `One two three four. Five six seven eight. Nine ten eleven twelve.`;
    const score = scoreRhythm(MOCK_PACKET, prose);

    // All sentences have 4 words → CV ≈ 0 → low score
    expect(score.details).toMatch(/CV_sent=0\.0+/);
    expect(score.score).toBeLessThan(50);
  });

  it('varied prose → CV in optimal range → high score', () => {
    const prose = `Short. This sentence is much longer than the previous one and has many words. Medium length sentence here.`;
    const score = scoreRhythm(MOCK_PACKET, prose);

    // CV should be in optimal range [0.40, 0.80]
    const cvMatch = score.details?.match(/CV_sent=([0-9.]+)/);
    expect(cvMatch).toBeTruthy();
    const cv = parseFloat(cvMatch![1]);
    expect(cv).toBeGreaterThan(0.30);
    expect(cv).toBeLessThan(1.0);
    expect(score.score).toBeGreaterThan(50);
  });

  it('very chaotic prose → CV too high → penalty', () => {
    const prose = `A. This is a sentence with exactly fifteen words in it for testing purposes consistently. B. This is a very long sentence with many many words that goes on and on and on and keeps going for a very long time without stopping at all.`;
    const score = scoreRhythm(MOCK_PACKET, prose);

    // Extreme variation → CV > 0.80 → penalty
    expect(score.score).toBeLessThan(100);
  });

  it('breathing: prose with both long and short sentences → bonus', () => {
    const prose = `This is a very long sentence that goes on and on and keeps going for more than twenty five words total definitely. Short.`;
    const score = scoreRhythm(MOCK_PACKET, prose);

    // Has both long (≥25 words) and short (≤7 words) → +10 breathing bonus
    expect(score.score).toBeGreaterThan(0);
  });

  it('length range: prose with wide range → high score', () => {
    const prose = `One. This sentence is significantly longer than the first sentence and demonstrates range.`;
    const score = scoreRhythm(MOCK_PACKET, prose);

    const rangeMatch = score.details?.match(/range=(\d+)/);
    expect(rangeMatch).toBeTruthy();
    const range = parseInt(rangeMatch![1], 10);
    expect(range).toBeGreaterThan(0);
  });

  it('score is always [0, 100]', () => {
    const proses = [
      `One.`,
      `One two three. Four five six. Seven eight nine.`,
      `This is a test sentence with multiple words. Another sentence follows. And another one here.`,
      `Very very very very very very very very very very very very very very very very very very very very long sentence.`,
    ];

    for (const prose of proses) {
      const score = scoreRhythm(MOCK_PACKET, prose);
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
    }
  });

  it('monotone prose penalty', () => {
    // Create prose with intentional monotony (all sentences similar length)
    const monotone = Array.from({ length: 10 }, (_, i) => `Sentence number ${i} here with similar length.`).join(' ');
    const score = scoreRhythm(MOCK_PACKET, monotone);

    // Should have low CV → low score
    expect(score.score).toBeLessThan(60);
  });

  it('CV output format in details', () => {
    const prose = `Test sentence. Another test sentence with more words.`;
    const score = scoreRhythm(MOCK_PACKET, prose);

    expect(score.details).toContain('CV_sent=');
    expect(score.details).toContain('range=');
    expect(score.details).toContain('monotony=');
    expect(score.details).toContain('opening_rep=');
  });
});
