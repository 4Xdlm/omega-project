/**
 * OMEGA Endurance Scoring Tests — Phase P2
 * Date: 2026-03-22
 * Role: Verify multi-scale scorer with window extraction and GB V1.
 */

import { describe, it, expect } from 'vitest';
import {
  extractWindows,
  scoreWindow,
  computeMultiScaleScore,
  buildMultiScaleScore,
  MIN_WORDS_FOR_VERIFICATION,
} from '../../src/scoring/multi-scale-scorer.js';

// Generate a text of N words (repeated content for testing)
function makeText(nWords: number): string {
  const base = 'Le soleil brillait sur la campagne verte et les oiseaux chantaient dans les arbres. La rivière coulait doucement entre les collines. Elle marchait le long du chemin de terre, perdue dans ses pensées. Le vent soufflait légèrement et les feuilles tremblaient. Il faisait chaud mais une brise venue du nord apportait un peu de fraîcheur.';
  const words = base.split(/\s+/);
  const result: string[] = [];
  while (result.length < nWords) {
    result.push(...words);
  }
  return result.slice(0, nWords).join(' ');
}

describe('Multi-Scale Scorer (P2)', () => {
  describe('extractWindows', () => {
    it('returns null for text shorter than window size', () => {
      expect(extractWindows('short text here', 500)).toBeNull();
    });

    it('returns 5 windows for sufficiently long text', () => {
      const text = makeText(1000);
      const windows = extractWindows(text, 500, 5);
      expect(windows).not.toBeNull();
      expect(windows).toHaveLength(5);
      for (const w of windows!) {
        const wc = w.split(/\s+/).length;
        expect(wc).toBe(500);
      }
    });

    it('returns correct window count', () => {
      const text = makeText(3000);
      const w3 = extractWindows(text, 500, 3);
      expect(w3).toHaveLength(3);
    });
  });

  describe('scoreWindow', () => {
    it('returns a numeric score in valid range', () => {
      const text = makeText(500);
      const score = scoreWindow(text);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(7);
    });

    it('deterministic: same text -> same score', () => {
      const text = makeText(500);
      const s1 = scoreWindow(text);
      const s2 = scoreWindow(text);
      expect(s1).toBe(s2);
    });
  });

  describe('computeMultiScaleScore', () => {
    it('text < 500w -> NON_VERIFIABLE with local fallback', () => {
      const text = makeText(300);
      const result = computeMultiScaleScore(text);
      expect(result.flag).toBe('NON_VERIFIABLE');
      expect(result.word_count).toBeLessThan(500);
    });

    it('text 500-2000w -> NON_VERIFIABLE, has local score', () => {
      const text = makeText(1500);
      const result = computeMultiScaleScore(text);
      expect(result.flag).toBe('NON_VERIFIABLE');
      expect(result.score_local).toBeGreaterThan(0);
    });

    it('text > 2000w -> VERIFIED with meso + slope', () => {
      const text = makeText(2500);
      const result = computeMultiScaleScore(text);
      expect(result.flag).toBe('VERIFIED');
      expect(result.score_meso).toBeGreaterThan(0);
      expect(result.slope).toBeTypeOf('number');
      expect(result.endurance_delta).toBeTypeOf('number');
    });

    it('deterministic: same text -> same final score', () => {
      const text = makeText(2500);
      const r1 = computeMultiScaleScore(text);
      const r2 = computeMultiScaleScore(text);
      expect(r1.final_score).toBe(r2.final_score);
      expect(r1.flag).toBe(r2.flag);
    });
  });

  describe('buildMultiScaleScore', () => {
    it('verified text produces meta-regression score', () => {
      const result = buildMultiScaleScore(3.5, 3.8, 0.1, 0.2, 5000);
      expect(result.flag).toBe('VERIFIED');
      expect(result.final_score).not.toBe(result.score_local);
    });

    it('non-verifiable text falls back to local score', () => {
      const result = buildMultiScaleScore(3.5, null, null, null, 500);
      expect(result.flag).toBe('NON_VERIFIABLE');
      expect(result.final_score).toBe(3.5);
    });
  });
});
