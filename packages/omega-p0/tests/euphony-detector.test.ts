/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — FRENCH EUPHONY DETECTOR TESTS (P3)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { analyzeEuphony, type EuphonyAnalysis } from '../src/phonetic/euphony-detector.js';

describe('P3 — euphony-detector', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // HIATUS DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hiatus detection', () => {
    it('detects hiatus "il a eu" (a→eu)', () => {
      const r = analyzeEuphony('il a eu peur');
      expect(r.hiatusCount).toBeGreaterThanOrEqual(1);
      const h = r.hiatus.find(m => m.word1 === 'a' && m.word2 === 'eu');
      expect(h).toBeDefined();
    });

    it('detects HARSH hiatus (same vowel sound)', () => {
      // "va à" → A-A = HARSH
      const r = analyzeEuphony('il va à Paris');
      const h = r.hiatus.find(m => m.word1 === 'va' && m.word2 === 'à');
      expect(h).toBeDefined();
      expect(h!.severity).toBe('HARSH');
    });

    it('detects MILD hiatus (different vowel sounds)', () => {
      // "joli arbre" → I-A = MILD
      const r = analyzeEuphony('un joli arbre');
      const h = r.hiatus.find(m => m.word1 === 'joli' && m.word2 === 'arbre');
      expect(h).toBeDefined();
      expect(h!.severity).toBe('MILD');
    });

    it('no hiatus when word ends on consonant', () => {
      const r = analyzeEuphony('le chat arrive');
      // "chat arrive" → chat ends on 't' (consonant) → no hiatus
      const h = r.hiatus.find(m => m.word1 === 'chat' && m.word2 === 'arrive');
      expect(h).toBeUndefined();
    });

    it('no hiatus with silent -e (elision case)', () => {
      // "porte ouverte" → "porte" ends on silent -e → consonant ending
      const r = analyzeEuphony('la porte ouverte');
      const h = r.hiatus.find(m => m.word1 === 'porte' && m.word2 === 'ouverte');
      expect(h).toBeUndefined();
    });

    it('no hiatus with h-aspiré', () => {
      // "le haut" → h-aspiré → no hiatus
      const r = analyzeEuphony('le haut mur');
      const h = r.hiatus.find(m => m.word2 === 'haut');
      expect(h).toBeUndefined();
    });

    it('detects hiatus with h-muet', () => {
      // "beau homme" → h-muet → hiatus O-O
      const r = analyzeEuphony('un beau homme');
      const h = r.hiatus.find(m => m.word2 === 'homme');
      expect(h).toBeDefined();
    });

    it('detects multiple hiatus in same sentence', () => {
      const r = analyzeEuphony('il a eu un ami utile');
      expect(r.hiatusCount).toBeGreaterThanOrEqual(2);
    });

    it('no hiatus in clean prose', () => {
      const r = analyzeEuphony('le soleil brillait sur les champs dorés');
      expect(r.hiatusCount).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSONANT CLUSTER DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Consonant cluster detection', () => {
    it('detects harsh cluster at word boundary', () => {
      // "abjects spectres" → cts + sp = 5 consonants
      const r = analyzeEuphony('des abjects spectres');
      expect(r.clusterCount).toBeGreaterThanOrEqual(1);
    });

    it('detects cluster "ck str" pattern', () => {
      // "avec structure" → c + str = 4
      const r = analyzeEuphony('avec structure');
      expect(r.clusterCount).toBeGreaterThanOrEqual(1);
      const c = r.clusters[0];
      expect(c.length).toBeGreaterThanOrEqual(4);
    });

    it('no cluster with simple consonant boundaries', () => {
      // "le chat dort" → t+d = 2 only → not harsh
      const r = analyzeEuphony('le chat dort bien');
      expect(r.clusterCount).toBe(0);
    });

    it('reports cluster context (both words)', () => {
      const r = analyzeEuphony('avec structure');
      expect(r.clusters.length).toBeGreaterThanOrEqual(1);
      expect(r.clusters[0].context).toContain('avec');
      expect(r.clusters[0].context).toContain('structure');
    });

    it('no clusters in flowing prose', () => {
      const r = analyzeEuphony('la lumière douce baignait la vallée silencieuse');
      expect(r.clusterCount).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ALLITERATION DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Alliteration detection', () => {
    it('detects /p/ alliteration in "pour peu que Pierre parte"', () => {
      const r = analyzeEuphony('pour peu que Pierre parte promptement');
      expect(r.alliterationCount).toBeGreaterThanOrEqual(1);
      const a = r.alliterations.find(m => m.sound === 'p');
      expect(a).toBeDefined();
      expect(a!.count).toBeGreaterThanOrEqual(3);
    });

    it('detects /s/ alliteration', () => {
      const r = analyzeEuphony('ses six serpents sifflent sans cesse');
      const a = r.alliterations.find(m => m.sound === 's');
      expect(a).toBeDefined();
      expect(a!.count).toBeGreaterThanOrEqual(3);
    });

    it('no alliteration when onsets vary', () => {
      const r = analyzeEuphony('le chat mange des fruits rouges');
      expect(r.alliterationCount).toBe(0);
    });

    it('treats ch as single sound', () => {
      const r = analyzeEuphony('le chat cherche chaque chose chez lui');
      const a = r.alliterations.find(m => m.sound === 'ch');
      expect(a).toBeDefined();
      expect(a!.count).toBeGreaterThanOrEqual(3);
    });

    it('requires 3+ repetitions (not 2)', () => {
      const r = analyzeEuphony('le chat cherche la maison');
      // only 2 ch-words → not enough
      expect(r.alliterationCount).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSONANCE ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Assonance analysis', () => {
    it('returns vowel distribution', () => {
      const r = analyzeEuphony('la lame de la flamme dans la braise');
      expect(Object.keys(r.assonance.distribution).length).toBeGreaterThan(0);
    });

    it('identifies dominant vowel', () => {
      const r = analyzeEuphony('la lame de la flamme dans la braise');
      // Heavily A-dominant
      expect(r.assonance.dominant).toBe('A');
    });

    it('high dominance ratio for repetitive vowel', () => {
      const r = analyzeEuphony('papa alla à la plage avec sa camarade');
      expect(r.assonance.dominanceRatio).toBeGreaterThan(0.2);
    });

    it('low dominance ratio for varied text', () => {
      const r = analyzeEuphony('le soleil brillait sur les montagnes vertes du pays');
      expect(r.assonance.dominanceRatio).toBeLessThan(0.4);
    });

    it('gini = 0 is impossible with real text', () => {
      const r = analyzeEuphony('le monde est vaste et silencieux');
      // Real text always has some imbalance
      expect(r.assonance.gini).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EUPHONY SCORE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Euphony score', () => {
    it('clean literary prose → high score', () => {
      const r = analyzeEuphony(
        'Le soleil descendait derrière les collines dorées. ' +
        'La lumière baignait les champs de blé mûr ' +
        'tandis que le vent soufflait dans les peupliers.',
      );
      expect(r.euphonyScore).toBeGreaterThanOrEqual(75);
    });

    it('cacophonic text → low score', () => {
      const r = analyzeEuphony(
        'il a eu un ami utile. ' +
        'avec abjects spectres. ' +
        'pour peu que Pierre parte promptement.',
      );
      expect(r.euphonyScore).toBeLessThan(80);
    });

    it('score is between 0 and 100', () => {
      const texts = [
        'le chat dort',
        'il a eu un ami',
        'avec structure spectrale',
        'papa alla à la plage avec sa camarade',
        'le soleil brillait sur les montagnes vertes',
      ];
      for (const t of texts) {
        const r = analyzeEuphony(t);
        expect(r.euphonyScore).toBeGreaterThanOrEqual(0);
        expect(r.euphonyScore).toBeLessThanOrEqual(100);
      }
    });

    it('more defects → lower score', () => {
      const clean = analyzeEuphony('la lumière douce baignait les champs');
      const dirty = analyzeEuphony('il a eu un ami utile à appeler');
      expect(dirty.euphonyScore).toBeLessThanOrEqual(clean.euphonyScore);
    });

    it('empty text → score 100', () => {
      const r = analyzeEuphony('');
      expect(r.euphonyScore).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Density metrics', () => {
    it('hiatus density is per 100 words', () => {
      const r = analyzeEuphony('il a eu un ami utile il a eu un ami utile');
      expect(r.hiatusDensity).toBeGreaterThan(0);
      expect(r.hiatusDensity).toBeLessThanOrEqual(100);
    });

    it('cluster density is per 100 words', () => {
      const r = analyzeEuphony('avec structure abjects spectres');
      expect(r.clusterDensity).toBeGreaterThan(0);
    });

    it('zero density for clean text', () => {
      const r = analyzeEuphony('la lumière douce baignait la vallée');
      expect(r.hiatusDensity).toBe(0);
      expect(r.clusterDensity).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINISM
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Determinism', () => {
    it('same input → identical output', () => {
      const text = 'il a eu un beau homme pour peu que Pierre parte avec structure';
      const r1 = analyzeEuphony(text);
      const r2 = analyzeEuphony(text);

      expect(r1.hiatusCount).toBe(r2.hiatusCount);
      expect(r1.clusterCount).toBe(r2.clusterCount);
      expect(r1.alliterationCount).toBe(r2.alliterationCount);
      expect(r1.euphonyScore).toBe(r2.euphonyScore);
      expect(r1.assonance.dominant).toBe(r2.assonance.dominant);
      expect(r1.assonance.gini).toBe(r2.assonance.gini);

      for (let i = 0; i < r1.hiatus.length; i++) {
        expect(r1.hiatus[i].word1).toBe(r2.hiatus[i].word1);
        expect(r1.hiatus[i].severity).toBe(r2.hiatus[i].severity);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('handles empty string', () => {
      const r = analyzeEuphony('');
      expect(r.wordCount).toBe(0);
      expect(r.hiatusCount).toBe(0);
      expect(r.clusterCount).toBe(0);
      expect(r.alliterationCount).toBe(0);
      expect(r.euphonyScore).toBe(100);
    });

    it('handles single word', () => {
      const r = analyzeEuphony('bonjour');
      expect(r.wordCount).toBe(1);
      expect(r.hiatusCount).toBe(0);
      expect(r.clusterCount).toBe(0);
    });

    it('handles punctuation only', () => {
      const r = analyzeEuphony('... ! ? ;');
      expect(r.wordCount).toBe(0);
      expect(r.euphonyScore).toBe(100);
    });

    it('handles very long text without crash', () => {
      const text = 'le soleil brillait sur les champs dorés du village. '.repeat(100);
      const r = analyzeEuphony(text);
      expect(r.wordCount).toBeGreaterThan(500);
      expect(r.euphonyScore).toBeGreaterThanOrEqual(0);
    });

    it('handles accented vowels correctly', () => {
      // "café éthiopien" → é-é = HARSH hiatus
      const r = analyzeEuphony('un café éthiopien');
      const h = r.hiatus.find(m => m.word1 === 'café');
      expect(h).toBeDefined();
      expect(h!.severity).toBe('HARSH');
    });

    it('word count is correct', () => {
      const r = analyzeEuphony('un deux trois quatre cinq');
      expect(r.wordCount).toBe(5);
    });
  });
});
